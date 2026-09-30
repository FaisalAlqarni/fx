# 04: v2 plugin: preamble, agents, hidden skills, commands

**Status:** ready-for-agent
**Blocked by:** 02, 03
**Phase:** Harness

**What to build:** `plugins/fx-opencode-v2.js` loads on OpenCode 2.x and gives every session and subagent fx's preamble, registers fx's six read-only agents, hides the five user-invoked lanes from the model in every agent's skill list, and registers fx's commands so the user can still reach those lanes. The guard and lane check are task 05.

**Files:**
- Create: `plugins/fx-opencode-v2.js`
- Create: `tests/gates/opencode-v2-plugin.test.js`
- Modify: `scripts/check-all`, `scripts/test-scope`

**Interfaces:**
- Consumes: `render` (`lib/preamble.js`, harness `opencode-v2`), `toOpencodeV2Agent` (task 03), `READ_ONLY_AGENTS` (as `plugins/fx-opencode-v1.js` imports it), `opencodeCommands(root, destAbs) -> { [name]: { description, template } }` (`lib/opencode-commands.js`, unchanged), `probe-findings.md` questions 1, 2, 6, 7, 8, 11.
- Produces: `export default { id: 'fx', setup }` where `setup(ctx)` registers:
  - `ctx.session.hook('context', ev => ...)` pushing `{ type: 'text', text: <preamble> }`;
  - one `ctx.agent.transform(editor => ...)` that (a) calls `editor.update(name, a => ...)` for each of the six agents with `toOpencodeV2Agent`'s output, leaving an agent that already carries a different `system` unchanged (ADR-0026); then (b) for every agent in `editor.list()`, fx's six included, appends `{ action: 'skill', resource: <lane>, effect: 'deny' }` for each hidden lane (`fx-audit`, `fx-critique`, `fx-grill`, `fx-handoff`, `fx-setup`) unless that agent already has a rule whose `action` is `skill` and whose `resource` is that lane (the user's explicit answer wins). v2 filters the skill list the model sees only by these static rules (`core/src/skill.ts:33-34`), so this is what hides the lanes;
  - `ctx.command.transform(editor => ...)` calling `editor.add({ name, description, execute })` for each entry of `opencodeCommands(ROOT, ROOT)` whose name `ctx.command.list()` does not already hold, where `execute(input)` prompts `input.sessionID` with the template, `$ARGUMENTS` replaced by the invocation's argument text, through the call probe question 8 proved (`ctx.session.prompt` or `ctx.session.command`). If question 8 is `disproven`, register no commands and say so in the report for tasks 06 and 09;
  - `ctx.permission.hook('evaluate', ev => ...)` setting `effect = 'deny'` with a message naming the lane's command for `action === 'skill'` on a hidden lane: a backstop for an agent the transform did not reach, since this hook rejects a call but hides nothing. Task 05 adds more to the same hook.

**Seam:** `setup` driven by a stub `ctx` that records each registration, the way `tests/gates/opencode-plugin.test.js` drives the v1 hooks. The stub's agent editor copies the real one (`core/src/agent.ts:59-85`): `update` on a missing id starts from `Info.default(id)` (`schema/src/agent.ts:39-53`) plus core's `external_directory` allows, and the editor has `get`, `list`, `update`. It is seeded with built-in agents so the hiding is checked on agents fx did not create.

**Risks:** ROOT comes from `import.meta.url` exactly as in the v1 file, so a symlinked install resolves fx's own directories. A load failure of any `lib/` module must not throw out of `setup`: the preamble falls back to a one-line "fx failed to load: <reason>" text, as v1 does. Every hook and transform body is wrapped so it cannot reject: a rejected Promise in a v2 hook is a defect (`plugin/src/promise/adapter.ts:439`, `:504`). If probe question 11 shows user-defined agents from `opencode.json` apply after plugin transforms, they miss the skill-deny rules: record it for ADR-0026 and task 09, and the `evaluate` backstop is then their only barrier. If probe question 6 shows different defaults than the source, follow the probe in the stub and say so. Skills themselves reach v2 through the installer's `skills/` links or a `skills` config entry (tasks 06 and 07), not through this file.

**Idempotency:** a new file and a new test written whole; `check-all` and `test-scope` lines added only if absent.

**Testing:** the stub-context gate; a load check on the real 2.0.18 binary.

## Acceptance criteria
- [ ] The default export is `{ id: 'fx', setup }`; the module has no other export 2.x would reject.
- [ ] `setup` registers one `session.context` hook that pushes a text part whose text is `render({ harness: 'opencode-v2', cwd: ctx.location.directory })`.
- [ ] The six agents are registered with `toOpencodeV2Agent`'s output; an agent that already carries a different `system` is not changed.
- [ ] Every agent in the editor after the transform, the built-in `build`, `plan` and `general` and a user's own agent included, evaluates `skill` on each hidden lane to `deny` under last-match-wins, and `skill` on `fx-tdd` to what it was before.
- [ ] Each command from `opencodeCommands` is added once with a `description` and an `execute`; a name already in `ctx.command.list()` is not added; `execute` prompts the invoking session with the template and the arguments.
- [ ] The `evaluate` hook denies `skill` on each hidden lane with a message naming its command, and leaves other skills and other actions untouched.
- [ ] On the real binary, with the plugin linked into a scratch config directory, the log shows `loading plugin` for it and no `failed to load plugin`; `opencode api --standalone skill.list` does not list the five lanes.

## Steps

- [ ] **1. RED:** create `tests/gates/opencode-v2-plugin.test.js`:

```js
'use strict';
// The OpenCode v2 plugin driven with a stub ctx that records registrations.
// The agent editor copies core/src/agent.ts:59-85 and schema/src/agent.ts:39-53.
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..', '..');
const { render } = require(path.join(root, 'lib', 'preamble'));
const { opencodeCommands } = require(path.join(root, 'lib', 'opencode-commands'));

const HIDDEN = ['fx-audit', 'fx-critique', 'fx-grill', 'fx-handoff', 'fx-setup'];

function defaults(id) {
  return {
    id, name: id, request: { settings: {}, headers: {}, body: {} }, mode: 'primary', hidden: false,
    permissions: [
      { action: '*', resource: '*', effect: 'allow' },
      { action: 'external_directory', resource: '*', effect: 'ask' },
      { action: 'read', resource: '*.env', effect: 'ask' },
      { action: 'read', resource: '*.env.*', effect: 'ask' },
      { action: 'read', resource: '*.env.example', effect: 'allow' },
      { action: 'external_directory', resource: '/data/tool-output/*', effect: 'allow' },
    ],
  };
}

function effect(rules, action, resource) {
  const glob = (p, s) => new RegExp('^' + p.split('*').map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(s);
  let out = 'ask';
  for (const r of rules) if (glob(r.action, action) && glob(r.resource, resource)) out = r.effect;
  return out;
}

function stub(directory, existingAgents = {}, existingCommands = []) {
  const rec = { hooks: {}, agents: new Map(), commands: [], prompts: [] };
  for (const id of ['build', 'plan', 'general']) rec.agents.set(id, defaults(id));
  for (const [id, a] of Object.entries(existingAgents)) rec.agents.set(id, { ...defaults(id), ...JSON.parse(JSON.stringify(a)) });
  const reg = { dispose() {} };
  const hook = (domain) => async (name, cb) => { (rec.hooks[`${domain}.${name}`] ||= []).push(cb); return reg; };
  const editor = {
    get: (id) => rec.agents.get(id),
    list: () => [...rec.agents.values()],
    update(id, fn) { const a = rec.agents.get(id) || defaults(id); rec.agents.set(id, a); fn(a); a.id = id; },
  };
  const deliver = async (req) => { rec.prompts.push(req); };
  const ctx = {
    location: { directory }, options: {},
    session: { hook: hook('session'), prompt: deliver, command: deliver },
    tool: { hook: hook('tool') }, permission: { hook: hook('permission') },
    agent: { transform: async (cb) => { await cb(editor); return reg; } },
    skill: { transform: async () => reg },
    command: {
      list: async () => existingCommands.map((name) => ({ name })),
      transform: async (cb) => { await cb({ add: (d) => rec.commands.push(d) }); return reg; },
    },
  };
  return { rec, ctx };
}

async function evaluate(rec, ev) {
  for (const cb of rec.hooks['permission.evaluate'] || []) await cb(ev);
  return ev;
}

(async () => {
  const mod = await import(pathToFileURL(path.join(root, 'plugins', 'fx-opencode-v2.js')).href);
  assert.strictEqual(mod.default.id, 'fx', 'default export carries the id');
  assert.strictEqual(typeof mod.default.setup, 'function', 'default export carries setup');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-v2-plugin-'));
  const { rec, ctx } = stub(dir, { 'my-agent': { system: 'mine' } });
  await mod.default.setup(ctx);

  const ctxHooks = rec.hooks['session.context'] || [];
  assert.strictEqual(ctxHooks.length, 1, 'one context hook');
  const ev = { system: [] };
  await ctxHooks[0](ev);
  assert.deepStrictEqual(ev.system, [{ type: 'text', text: render({ harness: 'opencode-v2', cwd: dir }) }],
    'the context hook pushes the rendered v2 preamble as a text part');

  for (const name of ['fx-devils-advocate', 'fx-lens-a11y', 'fx-lens-database', 'fx-lens-pipeline', 'fx-lens-security', 'fx-lens-silent-failure']) {
    const a = rec.agents.get(name);
    assert.ok(a, `${name} is registered`);
    assert.strictEqual(a.mode, 'subagent', `${name} is a subagent`);
    assert.strictEqual(effect(a.permissions, 'edit', 'src/x.js'), 'deny', `${name} cannot edit, over the default allow`);
  }

  for (const a of rec.agents.values()) {
    for (const lane of HIDDEN) {
      assert.strictEqual(effect(a.permissions, 'skill', lane), 'deny', `${a.id}: ${lane} is hidden from its skill list`);
    }
  }
  assert.strictEqual(effect(rec.agents.get('build').permissions, 'skill', 'fx-tdd'), 'allow', 'a model-facing lane stays listed');

  const expected = Object.keys(opencodeCommands(root, root)).sort();
  assert.deepStrictEqual(rec.commands.map((c) => c.name).sort(), expected, 'every fx command is registered once');
  for (const c of rec.commands) {
    assert.ok(c.description, `${c.name} has a description`);
    assert.strictEqual(typeof c.execute, 'function', `${c.name} has execute`);
  }
  const audit = rec.commands.find((c) => c.name === 'fx-audit');
  await audit.execute({ sessionID: 'ses_1', prompt: 'src/', delivery: 'queue' });
  assert.strictEqual(rec.prompts.length, 1, 'execute prompts the session once');
  const sent = JSON.stringify(rec.prompts[0]);
  assert.ok(sent.includes('ses_1'), 'the prompt goes to the invoking session');
  assert.ok(sent.includes('src/') && !sent.includes('$ARGUMENTS'), 'the arguments replace $ARGUMENTS');

  for (const lane of HIDDEN) {
    const e = await evaluate(rec, { action: 'skill', resources: [lane], effect: 'allow' });
    assert.strictEqual(e.effect, 'deny', `${lane} is refused by the backstop`);
    assert.ok(e.message && e.message.includes(lane), `${lane}'s refusal names it`);
  }
  const open = await evaluate(rec, { action: 'skill', resources: ['fx-tdd'], effect: 'allow' });
  assert.strictEqual(open.effect, 'allow', 'a model-facing lane stays allowed');
  const other = await evaluate(rec, { action: 'read', resources: ['fx-audit'], effect: 'allow' });
  assert.strictEqual(other.effect, 'allow', 'only the skill action is touched');

  const mine = stub(dir, {
    'fx-lens-security': { system: 'user owned' },
    'keeps-audit': { permissions: [{ action: 'skill', resource: 'fx-audit', effect: 'allow' }] },
  }, ['fx-audit']);
  await mod.default.setup(mine.ctx);
  assert.strictEqual(mine.rec.agents.get('fx-lens-security').system, 'user owned', "a user's own agent definition wins");
  assert.strictEqual(effect(mine.rec.agents.get('keeps-audit').permissions, 'skill', 'fx-audit'), 'allow', "a user's explicit skill rule wins");
  assert.ok(!mine.rec.commands.some((c) => c.name === 'fx-audit'), 'a command already listed is not added again');

  fs.rmSync(dir, { recursive: true, force: true });
  console.log('opencode-v2-plugin.test.js: OK');
})().catch((e) => { console.error(e); process.exit(1); });
```

If probe question 8 is `disproven`, replace the command block with `assert.strictEqual(rec.commands.length, 0, 'no commands without a proven execute path')` and state that in the report. If question 6 or 11 shows other defaults or order, follow the probe in `defaults` and the seeded agents and say so.

Run: `node tests/gates/opencode-v2-plugin.test.js`. Expected: FAIL, `Cannot find module .../plugins/fx-opencode-v2.js`.

- [ ] **2. Implement** `plugins/fx-opencode-v2.js` with `fx-tdd`, mirroring the v1 file's guarded requires and ROOT derivation, with a header comment citing the v2 source and probe findings it relies on.
- [ ] **3. GREEN:** the same command prints `opencode-v2-plugin.test.js: OK`.
- [ ] **4. Load check on 2.0.18:** scratch `HOME` and `XDG_CONFIG_HOME`, link the file as `$XDG_CONFIG_HOME/opencode/plugins/fx.js` and fx's `skills/` entries into `$XDG_CONFIG_HOME/opencode/skills/`, run `opencode debug config` (timeout 200), then grep the newest log under `$HOME/.local/share/opencode/log/` for `loading plugin` and `failed to load plugin`, and run `opencode api --standalone skill.list` and grep it for each hidden lane (expected: none). Record the lines in the report.
- [ ] **5. check-all and test-scope:** add `run opencode-v2-plugin.test.js node tests/gates/opencode-v2-plugin.test.js` after the `opencode-v2-agent.test.js` line; route `plugins/fx-opencode-v2.js` to that gate in `scripts/test-scope` the way `plugins/` routes to the v1 gate.
- [ ] **6. Gates:** `node tests/gates/opencode-v2-plugin.test.js && node tests/gates/opencode-plugin.test.js && node lib/preamble.test.js`
- [ ] **7. Commit**

```
git add plugins/fx-opencode-v2.js tests/gates/opencode-v2-plugin.test.js scripts/check-all scripts/test-scope
git commit -m "feat(opencode-v2): plugin with preamble, agents, hidden lanes and commands"
```
