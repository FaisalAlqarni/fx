# 08: The opencode plugin, corrected

**Status:** ready-for-agent
**Blocked by:** 01, 06
**Phase:** Core

**What to build:** fx on opencode reaches parity with Claude Code, from a
single config entry. The plugin registers fx's skills and lens agents itself,
raises the subagent depth limit, injects a correctly-addressed preamble into
sessions and child sessions, refuses irreversible git commands, and gains the
lane check and plan-state block it has never had.

**Files:**
- Modify: `plugins/fx.js`
- Create: `lib/agent-dialects.js`
- Create: `tests/gates/opencode-plugin.test.js`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: `render({ harness: 'opencode', cwd }) -> string` (task 01)
- Consumes: `inspect(command, cwd)` (existing, unmodified)
- Consumes: `laneCheck(file, cwd) -> string|null` (existing)
- Consumes: `lib/agent-dialects.js` (new here): the single converter from a
  Claude Code agent definition to opencode's dialect. `scripts/fx-opencode-install`
  calls this same module in task 09 rather than keeping its own `convert_agent`.
  One converter per dialect; a gate in task 09 asserts there is no second.
- Produces: the plugin's returned hook object, with `config`,
  `experimental.chat.system.transform` and `tool.execute.before`

**Seam:** `tests/gates/opencode-plugin.test.js`. The plugin is a plain async
function returning an object, so it is callable directly from node with a
fabricated context. No opencode process is needed for the unit level; the live
level is task 12.

**Measured facts this depends on.** opencode 1.18.25, read from the shipped
binary:

- `experimental.chat.system.transform` is the real system-prompt hook name, is
  genuinely invoked from two call sites, and is **not** deprecated. Guard for
  `sessionID === undefined`: the second call site fires without one.
- **Its signature is `(input, output)`, two arguments**, with `system` on the
  output object. The shipped `plugins/fx.js` destructures a single argument as
  `({ system })`. **This task changes the shipped form.** Measure the call sites
  before changing them and record what you found in the commit message: one of
  the two shapes is wrong and nothing in this plan proves which.
- `permission.ask` is declared in the public type, documented, and **never
  triggered**. Nothing may depend on it.
- Refusing a tool call is done by **throwing** from `tool.execute.before`.
- The shell tool's wire name is `bash`. `apply_patch` replaces `edit` and
  `write` on GPT-family models.
- `tools: { apply_patch: false }` is a silent no-op; the permission key is
  `edit`, and `write` and `patch` collapse onto it.
- The `config` hook receives the live configuration object. Pushing onto
  `config.skills.paths` registers skills; `config.agent[name]` registers an
  agent; `config.subagent_depth` raises the nesting limit, which **defaults to
  1** and otherwise stops an implementer dispatching a reviewer.
- Skill frontmatter: only `name` and `description` are read. `metadata` and
  `allowed-tools` are discarded.
- Hiding a skill from the model is `permission.skill` deny, which removes it
  from the model-facing listing entirely. The last matching rule wins, so the
  broad rule goes first.
- Subagents are child sessions and carry `parentID`.

**Risks:** The lane check's live status is measured in task 03. If it does not
fire on Claude Code, wire it here anyway and record the finding: this task
ports it, it does not repair it.

**Idempotency:** The `config` hook may run more than once. Guard every push
against duplicates: appending the same skills path twice registers every skill
twice, and opencode resolves that by keeping the first and logging a duplicate.

**Testing:** Call the plugin directly, assert on the object it returns and on
the mutations it makes to a fabricated config.

## Acceptance criteria
- [ ] The plugin registers exactly `config`, `experimental.chat.system.transform` and `tool.execute.before`
- [ ] It registers no `permission.ask` handler
- [ ] The `config` hook appends fx's skills directory to `config.skills.paths`
- [ ] Calling the `config` hook twice leaves exactly one entry
- [ ] The `config` hook registers every agent in `READ_ONLY_AGENTS` with `mode: 'subagent'`
- [ ] `fx-devils-advocate` is among them: it is read-only on Claude Code and must be here too
- [ ] No assertion hardcodes how many there are
- [ ] Each registered agent sets `permission.edit` to `deny` and `permission.bash` to `allow`
- [ ] The `config` hook sets `subagent_depth` to at least 2, and never lowers an existing higher value
- [ ] The `config` hook denies the five user-invoked skills through `permission.skill`, with the broad rule first
- [ ] The system transform pushes text containing `fx-tdd` and not `fx:fx-tdd`
- [ ] The system transform does not throw when `sessionID` is undefined
- [ ] With a `repo.md` in `directory`, the pushed text mentions it
- [ ] With an unfinished plan on disk, the pushed text names it: the
      plan-state block has never reached opencode and this is the assertion
      that says it now does
- [ ] `tool.execute.before` throws for `git branch -D` on tool `bash`
- [ ] `tool.execute.before` does not throw for `git status`
- [ ] `tool.execute.before` throws when the lane check refuses an `edit` or `write`
- [ ] It does **not** throw when the lane check itself crashes: the check is advice
- [ ] The test runs against a scratch directory, never the checkout, because the lane check writes markers
- [ ] The pushed text names an unfinished plan found on disk
- [ ] `lib/agent-dialects.js` is the only opencode converter in the repository
- [ ] The measured hook arity is recorded in the commit message
- [ ] A guard evaluation failure throws rather than allowing

## Steps

- [ ] **1. Write the failing test**

```js
// tests/gates/opencode-plugin.test.js
'use strict';
const assert = require('assert');
const path = require('path');

const root = path.join(__dirname, '..', '..');

(async () => {
  const { fx } = await import(path.join(root, 'plugins', 'fx.js'));
  const hooks = await fx({ directory: root });

  assert.deepStrictEqual(
    Object.keys(hooks).sort(),
    ['config', 'experimental.chat.system.transform', 'tool.execute.before'],
    'exactly three hooks, and permission.ask is dead in 1.18.25'
  );

  // --- config: skills, agents, depth, hiding -------------------------------
  const config = { subagent_depth: 1 };
  await hooks.config(config);
  const paths = config.skills.paths;
  assert.strictEqual(paths.length, 1, 'one skills path');
  await hooks.config(config);
  assert.strictEqual(config.skills.paths.length, 1, 'registering twice must not duplicate');

  // Derive the expected set from the definitions, never a hardcoded count, and
  // never a prefix: fx-devils-advocate is read-only too and does not match
  // `fx-lens-`. A prefix test would leave it writable here.
  const { READ_ONLY_AGENTS } = require(path.join(root, 'lib', 'plant-roles.js'));
  const registered = READ_ONLY_AGENTS.filter((n) => config.agent[n]);
  assert.deepStrictEqual(registered.sort(), [...READ_ONLY_AGENTS].sort(),
    'every read-only agent must be registered, including fx-devils-advocate');
  for (const name of registered) {
    const a = config.agent[name];
    assert.strictEqual(a.mode, 'subagent');
    assert.strictEqual(a.permission.edit, 'deny', `${name} must not be able to edit`);
    assert.strictEqual(a.permission.bash, 'allow', `${name} must still be able to look`);
    assert.ok(a.description && a.prompt, `${name} needs a description and a prompt`);
  }

  assert.ok(config.subagent_depth >= 2, 'an implementer must be able to dispatch a reviewer');
  const high = { subagent_depth: 5 };
  await hooks.config(high);
  assert.strictEqual(high.subagent_depth, 5, 'never lower a users higher setting');

  const skillRules = Object.keys(config.permission.skill);
  assert.strictEqual(skillRules[0], '*', 'the broad rule goes first: last match wins');
  assert.strictEqual(config.permission.skill['fx-audit'], 'deny');

  // --- system transform -----------------------------------------------------
  const out = { system: [] };
  await hooks['experimental.chat.system.transform']({ model: {} }, out);
  assert.strictEqual(out.system.length, 1);
  assert.ok(out.system[0].includes('fx-tdd'));
  assert.ok(!out.system[0].includes('fx:fx-tdd'), 'no plugin prefix on opencode');
  assert.ok(!out.system[0].includes('{{'));
  // The plan-state block has never reached opencode. Assert against a scratch
  // directory holding a plan, so this cannot pass by accident on the checkout.
  const os = require('os');
  const fs = require('fs');
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-oc-'));
  fs.mkdirSync(path.join(scratch, 'docs/plans/2026-01-01-probe/tasks'), { recursive: true });
  fs.writeFileSync(path.join(scratch, 'docs/plans/2026-01-01-probe/plan.md'), '# probe\n');
  fs.writeFileSync(path.join(scratch, 'repo.md'), '# repo\n');
  const scoped = await fx({ directory: scratch });
  const out2 = { system: [] };
  await scoped['experimental.chat.system.transform']({ model: {} }, out2);
  assert.ok(out2.system[0].includes('repo.md'), 'the repo note must reach opencode');
  assert.ok(/2026-01-01-probe/.test(out2.system[0]),
    'the plan-state block must reach opencode: it never has');

  // --- guard ----------------------------------------------------------------
  const before = hooks['tool.execute.before'];
  await assert.rejects(
    () => before({ tool: 'bash' }, { args: { command: 'git branch -D x' } }),
    /\[fx\]/,
    'an absolute must be refused by throwing'
  );
  await before({ tool: 'bash' }, { args: { command: 'git status' } });

  // --- lane check -----------------------------------------------------------
  // laneCheck writes markers into <cwd>/.fx/. Point it at the scratch directory:
  // running it against the real checkout mutates the repository and makes the
  // result depend on markers an earlier run left behind.
  const scopedBefore = scoped['tool.execute.before'];
  await scopedBefore({ tool: 'edit' }, { args: { filePath: path.join(scratch, 'README.md') } });

  fs.rmSync(scratch, { recursive: true, force: true });
  console.log('opencode-plugin.test.js: OK');
})().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **2. Run it: verify RED**

Run: `node tests/gates/opencode-plugin.test.js`
Expected: FAIL on the hook-key assertion: the plugin registers two hooks and no
`config`.

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing test.

Put the conversion in `lib/agent-dialects.js` and call it from the plugin. No
generated file is needed on this runtime because nothing has to exist on disk,
and the installer in task 09 calls the same module instead of keeping its own
`convert_agent`. The design requires one converter per dialect.

- [ ] **4. Run it: verify GREEN**

Run: `node tests/gates/opencode-plugin.test.js`
Expected: PASS.

- [ ] **5. Confirm the shared modules are untouched**

Run: `git diff --stat lib/git-guard.js lib/lane-check.js`
Expected: empty.

- [ ] **6. Register the test and run the gate**

Add to `scripts/check-all`:
```
run opencode-plugin.test.js  node tests/gates/opencode-plugin.test.js
```
Run: `scripts/check-all`
Expected: `ALL GREEN`.

- [ ] **7. Commit**

```
git add plugins/fx.js tests/gates/opencode-plugin.test.js scripts/check-all
git commit -m "feat(opencode): register skills, lenses and depth from the plugin"
```

No attribution trailers. Then continue to the next task: never stop and wait.
