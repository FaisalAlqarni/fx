# 04: v2 plugin: preamble, agents, hidden skills

**Status:** ready-for-agent
**Blocked by:** 02, 03
**Phase:** Harness

**What to build:** `plugins/fx-opencode-v2.js` loads on OpenCode 2.x and gives every session and subagent fx's preamble, registers fx's six read-only agents, and keeps the five user-invoked lanes away from the model. The guard and lane check are task 05.

**Files:**
- Create: `plugins/fx-opencode-v2.js`
- Create: `tests/gates/opencode-v2-plugin.test.js`
- Modify: `scripts/check-all`, `scripts/test-scope`

**Interfaces:**
- Consumes: `render` (`lib/preamble.js`, harness `opencode-v2`), `toOpencodeV2Agent` (task 03), `READ_ONLY_AGENTS` (as `plugins/fx-opencode-v1.js` imports it), `probe-findings.md` questions 1, 2, 6, 7.
- Produces: `export default { id: 'fx', setup }` where `setup(ctx)` registers: `ctx.session.hook('context', ...)` pushing `{ type: 'text', text: <preamble> }`; `ctx.agent.transform(...)` updating each of the six agents; `ctx.permission.hook('evaluate', ...)` setting `effect = 'deny'` with a message for `action === 'skill'` on the five hidden lanes (`fx-audit`, `fx-critique`, `fx-grill`, `fx-handoff`, `fx-setup`). Task 05 adds more to the same `evaluate` hook.

**Seam:** `setup` driven by a stub `ctx` that records each registration, the way `tests/gates/opencode-plugin.test.js` drives the v1 hooks.

**Risks:** ROOT comes from `import.meta.url` exactly as in the v1 file, so a symlinked install resolves fx's own directories. A load failure of any `lib/` module must not throw out of `setup`: the preamble falls back to a one-line "fx failed to load: <reason>" text, as v1 does. An agent the user already defined with their own `system` text is left alone (ADR-0026). Skills themselves reach v2 through the installer's `skills/` links or a `skills` config entry (tasks 06 and 07), not through this file.

**Idempotency:** a new file and a new test written whole; `check-all` and `test-scope` lines added only if absent.

**Testing:** the stub-context gate; a load check on the real 2.0.18 binary.

## Acceptance criteria
- [ ] The default export is `{ id: 'fx', setup }`; the module has no other export 2.x would reject.
- [ ] `setup` registers one `session.context` hook that pushes a text part whose text is `render({ harness: 'opencode-v2', cwd: ctx.location.directory })`.
- [ ] The six agents are registered with `toOpencodeV2Agent`'s output; an agent that already carries a different `system` is not changed.
- [ ] The `evaluate` hook denies `skill` on each hidden lane with a message naming its command, and leaves other skills and other actions untouched.
- [ ] On the real binary, with the plugin linked into a scratch config directory, the log shows `loading plugin` for it and no `failed to load plugin`.

## Steps

- [ ] **1. RED:** create `tests/gates/opencode-v2-plugin.test.js`:

```js
'use strict';
// The OpenCode v2 plugin driven with a stub ctx that records registrations.
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..', '..');
const { render } = require(path.join(root, 'lib', 'preamble'));

function stub(directory, existingAgents = {}) {
  const rec = { hooks: {}, agents: JSON.parse(JSON.stringify(existingAgents)) };
  const reg = { dispose() {} };
  const hook = (domain) => async (name, cb) => { (rec.hooks[`${domain}.${name}`] ||= []).push(cb); return reg; };
  const editor = { update(id, fn) { const a = (rec.agents[id] ||= { id, permissions: [] }); fn(a); } };
  const ctx = {
    location: { directory }, options: {},
    session: { hook: hook('session') }, tool: { hook: hook('tool') }, permission: { hook: hook('permission') },
    agent: { transform: async (cb) => { cb(editor); return reg; } },
    skill: { transform: async () => reg }, command: { transform: async () => reg },
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
  const { rec, ctx } = stub(dir);
  await mod.default.setup(ctx);

  const ctxHooks = rec.hooks['session.context'] || [];
  assert.strictEqual(ctxHooks.length, 1, 'one context hook');
  const ev = { system: [] };
  await ctxHooks[0](ev);
  assert.deepStrictEqual(ev.system, [{ type: 'text', text: render({ harness: 'opencode-v2', cwd: dir }) }],
    'the context hook pushes the rendered v2 preamble as a text part');

  for (const name of ['fx-devils-advocate', 'fx-lens-a11y', 'fx-lens-database', 'fx-lens-pipeline', 'fx-lens-security', 'fx-lens-silent-failure']) {
    const a = rec.agents[name];
    assert.ok(a, `${name} is registered`);
    assert.strictEqual(a.mode, 'subagent', `${name} is a subagent`);
    assert.deepStrictEqual(a.permissions[0], { action: '*', resource: '*', effect: 'deny' }, `${name} denies everything first`);
  }

  for (const lane of ['fx-audit', 'fx-critique', 'fx-grill', 'fx-handoff', 'fx-setup']) {
    const e = await evaluate(rec, { action: 'skill', resources: [lane], effect: 'allow' });
    assert.strictEqual(e.effect, 'deny', `${lane} is hidden from the model`);
    assert.ok(e.message && e.message.includes(lane), `${lane}'s refusal names it`);
  }
  const open = await evaluate(rec, { action: 'skill', resources: ['fx-tdd'], effect: 'allow' });
  assert.strictEqual(open.effect, 'allow', 'a model-facing lane stays allowed');
  const other = await evaluate(rec, { action: 'read', resources: ['fx-audit'], effect: 'allow' });
  assert.strictEqual(other.effect, 'allow', 'only the skill action is touched');

  const mine = stub(dir, { 'fx-lens-security': { id: 'fx-lens-security', system: 'user owned', permissions: [] } });
  await mod.default.setup(mine.ctx);
  assert.strictEqual(mine.rec.agents['fx-lens-security'].system, 'user owned', "a user's own agent definition wins");

  fs.rmSync(dir, { recursive: true, force: true });
  console.log('opencode-v2-plugin.test.js: OK');
})().catch((e) => { console.error(e); process.exit(1); });
```

Run: `node tests/gates/opencode-v2-plugin.test.js`. Expected: FAIL, `Cannot find module .../plugins/fx-opencode-v2.js`.

- [ ] **2. Implement** `plugins/fx-opencode-v2.js` with `fx-tdd`, mirroring the v1 file's guarded requires and ROOT derivation, with a header comment citing the v2 source and probe findings it relies on.
- [ ] **3. GREEN:** the same command prints `opencode-v2-plugin.test.js: OK`.
- [ ] **4. Load check on 2.0.18:** scratch `HOME` and `XDG_CONFIG_HOME`, link the file as `$XDG_CONFIG_HOME/opencode/plugins/fx.js`, run `opencode debug config` (timeout 200), then grep the newest log under `$HOME/.local/share/opencode/log/` for `loading plugin` and `failed to load plugin`. Record the two lines in the report.
- [ ] **5. check-all and test-scope:** add `run opencode-v2-plugin.test.js node tests/gates/opencode-v2-plugin.test.js` after the `opencode-v2-agent.test.js` line; route `plugins/fx-opencode-v2.js` to that gate in `scripts/test-scope` the way `plugins/` routes to the v1 gate.
- [ ] **6. Gates:** `node tests/gates/opencode-v2-plugin.test.js && node tests/gates/opencode-plugin.test.js && node lib/preamble.test.js`
- [ ] **7. Commit**

```
git add plugins/fx-opencode-v2.js tests/gates/opencode-v2-plugin.test.js scripts/check-all scripts/test-scope
git commit -m "feat(opencode-v2): plugin with preamble, agents and hidden lanes"
```
