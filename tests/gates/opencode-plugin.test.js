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
//
// Fix round 1 (reviewer finding): the suite above only ever called
// `tool.execute.before` with `tool: 'edit'`. `write` and `apply_patch` are
// the other two write-capable opencode tools `plugins/fx.js` wires through
// the same lane check, and neither had a single assertion — "a lane check
// wired to one of three is not wired" was the task's own line, and it was
// exactly right: a typo in a tool-name match or a broken
// `extractPatchPaths` regex would ship silently. Added below: a refused and
// an allowed case for `write`, a refused and an allowed case for
// `apply_patch`, and a multi-file `apply_patch` case where only the SECOND
// path is refused (pins the specific bug of checking only the first path —
// the same class already hit once on the Codex side).
//
// Every new case below runs in its OWN fresh scratch directory. Reusing one
// directory across cases was tried first and produced a false failure:
// `lib/lane-check.js` fires its "no design.md" refusal only ONCE per
// directory (a marker file under `<dir>/.fx/`), so a second call in the same
// directory tests the marker, not the wiring.
const assert = require('assert');
const os = require('os');
const fs = require('fs');
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
    assert.ok(a.description && a.prompt, `${name} needs a description and a prompt`);
  }

  // Task 17 (amendment A5, fix round 1): a read-only agent's permission block
  // is an allowlist. Evaluated the way opencode 1.18.31 evaluates it:
  // fromConfig turns each key into rules in order (permission/index.ts:
  // 186-198), the LAST rule whose key and pattern both wildcard-match wins
  // (index.ts:28-32, core/src/util/wildcard.ts), and the agent's own block is
  // merged after opencode's defaults (agent/agent.ts:293), whose first rule
  // is `"*": "allow"` (agent.ts:120). So no match here means allow.
  const wildcard = (input, pattern) => new RegExp('^' + pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 's').test(input);
  const effective = (perm, permission, pattern = '*') => {
    let action = 'allow';
    for (const [key, value] of Object.entries(perm)) {
      for (const [p, a] of typeof value === 'string' ? [['*', value]] : Object.entries(value)) {
        if (wildcard(permission, key) && wildcard(pattern, p)) action = a;
      }
    }
    return action;
  };
  const refs = path.join(root, 'references');
  for (const name of READ_ONLY_AGENTS) {
    const perm = config.agent[name].permission;
    assert.strictEqual(Object.keys(perm)[0], '*', `${name}: the deny-all rule goes first, since the last match wins`);
    for (const denied of ['webfetch', 'websearch', 'task', 'todowrite', 'edit', 'bash', 'skill', 'ctx7_query']) {
      assert.strictEqual(effective(perm, denied), 'deny', `${name} must not use ${denied}`);
    }
    for (const allowed of ['read', 'grep', 'glob', 'list']) {
      assert.strictEqual(effective(perm, allowed), 'allow', `${name} must be able to ${allowed}`);
    }
    // external_directory asks with `<parent dir>/*` (tool/external-directory.ts).
    assert.strictEqual(effective(perm, 'external_directory', `${refs}/vocab/*`), 'allow',
      `${name} must be able to read fx's references`);
    assert.strictEqual(effective(perm, 'external_directory', '/etc/*'), 'deny',
      `${name} must not read outside the project and fx's references`);
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
  const scratchDirs = [];
  function freshScratch({ withDesign = false } = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-oc-'));
    scratchDirs.push(dir);
    if (withDesign) {
      fs.mkdirSync(path.join(dir, 'docs', 'plans', 'probe'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'docs', 'plans', 'probe', 'design.md'), '# design\n');
    }
    return dir;
  }
  const scratch = freshScratch();
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

  // --- write: the second of three write-capable tools -----------------------
  {
    const dir = freshScratch();
    const scopedHooks = await fx({ directory: dir });
    await assert.rejects(
      () => scopedHooks['tool.execute.before']({ tool: 'write' }, { args: { filePath: path.join(dir, 'app.js') } }),
      /\[fx\]/,
      'write must be refused the same way edit is'
    );
  }
  {
    const dir = freshScratch({ withDesign: true });
    const scopedHooks = await fx({ directory: dir });
    await scopedHooks['tool.execute.before']({ tool: 'write' }, { args: { filePath: path.join(dir, 'app.js') } });
  }

  // --- apply_patch: the third write-capable tool -----------------------------
  // `patchText` carries the V4A envelope; only the header lines matter to
  // `extractPatchPaths`, so a minimal patch is enough.
  {
    const dir = freshScratch();
    const scopedHooks = await fx({ directory: dir });
    const patchText = '*** Begin Patch\n*** Update File: app.js\n*** End Patch\n';
    await assert.rejects(
      () => scopedHooks['tool.execute.before']({ tool: 'apply_patch' }, { args: { patchText } }),
      /\[fx\]/,
      'apply_patch must be refused the same way edit is'
    );
  }
  {
    const dir = freshScratch({ withDesign: true });
    const scopedHooks = await fx({ directory: dir });
    const patchText = '*** Begin Patch\n*** Update File: app.js\n*** End Patch\n';
    await scopedHooks['tool.execute.before']({ tool: 'apply_patch' }, { args: { patchText } });
  }

  // A multi-file patch where only the SECOND path is refused. `notes.md` is
  // never flagged (`.md` is not code), so if the wiring only ever inspected
  // the first path in the patch, this would pass silently instead of
  // throwing for `app.js`. Asserting the message names `app.js` pins which
  // path tripped it, not just that something did.
  {
    const dir = freshScratch();
    const scopedHooks = await fx({ directory: dir });
    const patchText = '*** Begin Patch\n'
      + '*** Add File: notes.md\n'
      + '*** Update File: app.js\n'
      + '*** End Patch\n';
    await assert.rejects(
      () => scopedHooks['tool.execute.before']({ tool: 'apply_patch' }, { args: { patchText } }),
      /app\.js/,
      'a later path in the same patch must still be checked, not just the first'
    );
  }

  for (const dir of scratchDirs) fs.rmSync(dir, { recursive: true, force: true });
  console.log('opencode-plugin.test.js: OK');
})().catch((e) => { console.error(e); process.exit(1); });
