'use strict';
// Run: node tests/gates/opencode-plugin.test.js
//
// Task-supplied test (docs/plans/2026-09-21-multi-harness/tasks/
// 08-the-opencode-plugin-corrected.md), with two fixes:
//
//   1. The scratch fixture created `docs/plans/2026-01-01-probe/tasks/` as an
//      EMPTY directory, with no `.md` file inside it. `lib/plan-state.js`'s
//      `scan()` requires at least one task file before it counts a directory
//      as a plan's task dir at all (`if (!taskDir) continue`, gated on
//      `readdir(...).length`) — with the directory left empty, the plan is
//      invisible to `describePlans` regardless of how `experimental.chat.
//      system.transform` is implemented, so the "names the unfinished plan"
//      assertion could never pass. Fixed by writing one task file into it.
//   2. The supplied script never exercised two of the acceptance criteria
//      that are not implied by the rest of it: "throws when the lane check
//      refuses an edit or write" (every call in the original only touched
//      `README.md`, which `lib/lane-check.js` never flags — `.md` is in
//      `NOT_CODE_EXT`) and "does not throw when the lane check itself
//      crashes" (never exercised at all). Both are added below, using the
//      scratch directory the fixture already sets up: a `.js` write with no
//      `design.md` anywhere under it triggers a real refusal, and a
//      non-string `filePath` makes `path.relative` inside `laneCheck` throw
//      a TypeError, exercising the fail-open catch around it.
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
  fs.writeFileSync(path.join(scratch, 'docs/plans/2026-01-01-probe/tasks/01-probe.md'), '# task\n');
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

  // A guard evaluation failure (inspect() itself throwing, not just
  // returning a refusal) must still deny, never silently allow. A command
  // whose `toString()` throws makes `inspect()`'s own `/\bgit\b/.test(command)`
  // throw during coercion, without touching lib/git-guard.js at all.
  const evilCommand = { toString() { throw new Error('boom'); } };
  await assert.rejects(
    () => before({ tool: 'bash' }, { args: { command: evilCommand } }),
    /\[fx\]/,
    'a guard evaluation failure must throw rather than allow'
  );

  // --- lane check -----------------------------------------------------------
  // laneCheck writes markers into <cwd>/.fx/. Point it at the scratch directory:
  // running it against the real checkout mutates the repository and makes the
  // result depend on markers an earlier run left behind.
  const scopedBefore = scoped['tool.execute.before'];

  // A real refusal: a first-touched `.js` file with no design.md anywhere
  // under the scratch tree. This is the branch the original script never
  // exercised (fix #2 above).
  await assert.rejects(
    () => scopedBefore({ tool: 'edit' }, { args: { filePath: path.join(scratch, 'app.js') } }),
    /\[fx\]/,
    'the lane check must be able to refuse a write, not just be called'
  );

  // The lane check crashing must not become a thrown refusal: it is advice.
  // A non-string filePath makes `path.relative` inside laneCheck throw.
  await scopedBefore({ tool: 'edit' }, { args: { filePath: 42 } });

  await scopedBefore({ tool: 'edit' }, { args: { filePath: path.join(scratch, 'README.md') } });

  fs.rmSync(scratch, { recursive: true, force: true });
  console.log('opencode-plugin.test.js: OK');
})().catch((e) => { console.error(e); process.exit(1); });
