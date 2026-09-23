# 12: Scoped per-task tests for this repo

**Status:** ready-for-agent
**Blocked by:** 09
**Phase:** Hardening

**What to build:** in this repo, each task runs the tests for what it touched
instead of the whole of `scripts/check-all`. `.fx.json` has
`"test_scope": null`, so every implementer runs `test_all`, the full gate suite,
on every task; `fx-implement` itself calls per-task full suites "the entire
wall clock of the build". `check-all` stays the exit gate.

Also proves whether two suites can run at the same time without interfering,
and records the answer. It does **not** set `isolated_test_execution`: task 13
sets it, and only if parallel ships. If parallel is dropped, reverting task 11
restores the old unguarded "relax only if" rule, and the key must be off then.

**Files:**
- Create: `scripts/test-scope`
- Create: `scripts/test-scope.test.js`
- Modify: `.fx.json`
- Modify: `scripts/check-all` (add the test)

**Interfaces:**
- Produces: `scripts/test-scope [--dry-run] <path>...`. Builds a command list,
  deduplicated, in this order, then runs each and stops at the first failure
  (exit code of that command). `--dry-run` prints the list, one per line, and
  exits 0.
  - A path ending `.test.js`: `node <path>`.
  - A path ending `.js` with a sibling `<name>.test.js`: `node <sibling>`.
  - A path ending `.test.sh`: `bash <path>`.
  - Any path under `skills/`, `agents/`, `commands/`, or ending `.md`:
    `scripts/check-prose`, `scripts/check-paths`, `scripts/check-generated`,
    `scripts/check-manifest`, then every `tests/gates/*.test.js` (they are the
    gates over skill and agent text, and they are fast).
  - Any path under `hooks/` or `plugins/`, or `lib/preamble.js` or
    `lib/plan-state.js`: `node lib/preamble.test.js`,
    `node tests/gates/codex-hook-output.test.js`,
    `node tests/gates/opencode-plugin.test.js` (the preamble test is the one
    that exercises `hooks/fx-context.js`).
  - Any path under `.claude-plugin/` or a manifest: `scripts/check-manifest`.
  - Always last: `node tests/gates/release-version.test.js`.
  - When unsure which class a path is in, run `scripts/check-all`: a slower
    task is fine, a missed gate is not.
  - A path that does not exist is skipped (a deleted file has no test).
- `.fx.json`: `"test_scope": "scripts/test-scope {paths}"`. Nothing else changes.

**Seam:** unit over `--dry-run` output.

**Idempotency:** `test-scope` only runs tests; `.fx.json` edit is a fixed value.

**Testing:** `node scripts/test-scope.test.js`, the concurrency check in step 6, `scripts/check-all`.

## Acceptance criteria
- [ ] `--dry-run` output for each path class matches the rules above, deduplicated, in order.
- [ ] A failing command stops the run with that command's exit code.
- [ ] The concurrency check (step 6) is run and its result is in the task report; `.fx.json` does not gain `isolated_test_execution`.
- [ ] `test_all` is still `scripts/check-all`.

## Steps

- [ ] **1. Write the failing test**

```js
'use strict';
// Run: node scripts/test-scope.test.js
const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const dry = (...paths) => execFileSync(path.join(__dirname, 'test-scope'), ['--dry-run', ...paths], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n');
const LAST = 'node tests/gates/release-version.test.js';

assert.deepStrictEqual(dry('lib/plan-state.test.js'), ['node lib/plan-state.test.js', LAST]);
assert.deepStrictEqual(dry('lib/plan-state.js'), ['node lib/plan-state.test.js', LAST]);
assert.deepStrictEqual(dry('lib/plan-state.js', 'lib/plan-state.test.js'), ['node lib/plan-state.test.js', LAST], 'deduplicated');
const GATES = require('fs').readdirSync(path.join(ROOT, 'tests', 'gates')).filter((f) => f.endsWith('.test.js')).sort()
  .map((f) => `node tests/gates/${f}`).filter((c) => c !== LAST);
assert.deepStrictEqual(dry('skills/fx-plan/SKILL.md'),
  ['scripts/check-prose', 'scripts/check-paths', 'scripts/check-generated', 'scripts/check-manifest', ...GATES, LAST]);
assert.deepStrictEqual(dry('hooks/fx-context.js'),
  ['node lib/preamble.test.js', 'node tests/gates/codex-hook-output.test.js', 'node tests/gates/opencode-plugin.test.js', LAST]);
assert.deepStrictEqual(dry('no/such/file.js'), [LAST], 'a deleted path is skipped');
console.log('test-scope: ok');
```

Before writing it, confirm `hooks/fx-context.js` has no sibling `fx-context.test.js`; if it has, add that `node` line first in the expected list.

- [ ] **2. Run it: verify RED.** Expected: FAIL, `ENOENT` for `scripts/test-scope`.

- [ ] **3. Implement `scripts/test-scope`** (bash or Node, executable; `fx-tdd` drives it).

- [ ] **4. Run it: verify GREEN.**

- [ ] **5. Point `.fx.json` at it**: set `test_scope` only. Run `scripts/test-scope lib/plan-state.js` for real; expect it to pass.

- [ ] **6. Prove concurrent suites do not interfere**

```
scripts/check-all > /tmp/fx-ca-1.log 2>&1 & A=$!
scripts/check-all > /tmp/fx-ca-2.log 2>&1 & B=$!
wait $A; echo "run 1: $?"; wait $B; echo "run 2: $?"
```

Expected: both `0`. Record the result in the task report as `concurrent check-all: pass` or `concurrent check-all: fail, <check>`. Do not set `isolated_test_execution`; task 13 reads this line.

- [ ] **7. Run the suite.** Add the test to `scripts/check-all`, run it.

- [ ] **8. Commit**

```
git add scripts/test-scope scripts/test-scope.test.js .fx.json scripts/check-all
git commit -m "feat(scripts): test-scope runs a task's own tests and gates"
```
