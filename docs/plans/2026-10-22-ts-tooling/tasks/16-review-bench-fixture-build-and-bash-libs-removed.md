# 16: Review-bench and fixture-build on Node, bash libraries removed

**Status:** ready-for-agent
**Blocked by:** 14, 15
**Phase:** Hardening

**What to build:** the review-bench and fixture-build runners run as `node tests/review-bench/run.js <reps> <label>` and `node tests/fixture-build/run.js <runs> <label>`, with the same arguments, refusals, result files and summary lines; their rows become TypeScript rows on task 13's live library with the same hidden paths, the same order of hiding before the session, and the same regular-file reads. The row-safety test moves to TypeScript and checks the TypeScript rows. With no bash user left, the conformance runner's `.sh` branch and the four bash libraries (`live.sh`, `jail.sh`, `opencode-v2.sh`, `scratch-home.sh`) are deleted, and the jail argument-vector test is retired after its last green run.

**Design:** Implementation Decisions > 11; Implementation Decisions > 14; Testing Decisions

**Files:**
- Create: `src/tests/review-bench/run.ts`, `src/tests/review-bench/rows/01-review-bench.ts`, `src/tests/fixture-build/run.ts`, `src/tests/fixture-build/rows/01-fixture-build.ts` (built to `.js` beside them)
- Delete: `tests/review-bench/run.sh`, `tests/review-bench/rows/01-review-bench.sh`, `tests/fixture-build/run.sh`, `tests/fixture-build/rows/01-fixture-build.sh`
- Create: `src/tests/review-bench/row-safety.test.ts` (built to `tests/review-bench/row-safety.test.js`)
- Delete: `tests/review-bench/row-safety.test.sh`
- Delete: `tests/conformance/lib/live.sh`, `tests/conformance/lib/jail.sh`, `tests/conformance/lib/opencode-v2.sh`, `tests/conformance/lib/scratch-home.sh`, `src/tests/conformance/jail-argv.test.ts`, `tests/conformance/jail-argv.test.js`, `src/tests/conformance/stub-rows.test.ts`, `tests/conformance/stub-rows.test.js` (the last two after this task's own stub-CLI comparison of the two rows)
- Create: `src/tests/conformance/run.test.ts` (built to `tests/conformance/run.test.js`)
- Modify: `src/tests/conformance/run.ts` (remove the `.sh` branch of `startRow`; a row file not ending `.js` is a runner error printing `run.js: not a row: <file>`, exit 2)
- Modify: `src/scripts/check-all.ts` (row `review-bench-row-safety` keeps its name and runs the new test; remove row `conformance-jail-argv`; add row `conformance-run`)
- Modify: `tests/review-bench/README.md`, `tests/conformance/README.md` (runner commands with `node`; `with-key.sh` named as the one shell file left and why)

**Interfaces:**
- Produces: `tests/fixture-build/run.js <runs> <label>`: usage `usage: tests/fixture-build/run.js <runs> <label>: runs a positive integer, label matching ^[a-z0-9-]+$` and exit 2; `refusing to overwrite an existing result file: <path>` exit 2; per run the `run <n>: end <k>/6, review caught ...` line; stop messages unchanged.
- Produces: `tests/review-bench/run.js <reps> <label>`: arguments, refusals and output as `run.sh` has them, with `run.sh` in the usage line replaced by `run.js`.
- Consumes: `lib/live` (`liveRun`, `liveRegular`) and `lib/jail` (`jailHide`), as task 13 exported them; `runNode` (task 01), the conformance runner (task 12), the review-bench and fixture-build helper modules (sub-project 1).

**Seam:** row-safety test, runner check and the runners' argument handling in `check-all`.

**Tests:**
- `row-safety.test`, against the TypeScript row sources: the bench row hides each of `tests/fixture-build/hidden`, `tests/review-bench/good`, `tests/review-bench/cases`, `docs/plans`, `tests/review-bench/README.md`, `.git`; the fixture row hides each of `tests/fixture-build`, `docs/plans`, `.fx`, `.worktrees`, `tests/review-bench`, `.git`; in the bench row every `jailHide` call precedes the first `liveRun` call; no commit message carries the case name; the case head commit subject is `task <n>`; the prompt and findings files are read only through `liveRegular`. Each check prints `ok   <label>` with the bash test's label.
- `run.test`: with `FX_CONFORMANCE_ROWS` holding a `.sh` row, `node tests/conformance/run.js claude-code --free` exits 2 and prints `run.js: not a row: <file>`.
- `jail-argv.test` run one last time before deletion: identical; output saved to the ledger.
- fixture-build runner, no model call: `node tests/fixture-build/run.js 0 x` exits 2 with the usage line; `node tests/fixture-build/run.js 1 BAD` exits 2; with an existing `<label>-1.json` in a scratch `OUT`, exits 2 with the refusal (the output directory is overridable for this test through `FX_FIXTURE_OUT_DIR`, a new variable defaulting to today's path).
- review-bench runner: the same three argument checks with its own messages.
- Rows: `node <row>.js --describe` equals `bash <row>.sh --describe` at `old.rev` for both rows, and `stub-rows.test` reports both identical; output to the ledger before it is deleted.
- `git ls-files | grep -E '\.(sh|bash)$'` outside `docs/plans/` prints only `tests/conformance/lib/with-key.sh`.

**Risks:** these rows decide what a reviewer and an implementer can see; a path dropped from the hide list leaks the answer key into a bench run and silently inflates scores. The row-safety test is the guard; port it before the rows and keep every label.

**Idempotency:** writes only scratch directories; result files are refused, never overwritten.

**Testing:** row-safety; runner and argument checks; `--describe`; `check-all`. Real bench and fixture runs (model calls) are the owner's.

## Acceptance criteria
- [ ] `row-safety.test` passes against the TypeScript rows with every bash label.
- [ ] The only tracked shell file outside `docs/plans/` is `tests/conformance/lib/with-key.sh`.
- [ ] `git grep -nE "review-bench/(run|row-safety\.test|rows/01-review-bench)\.sh|fixture-build/(run|rows/01-fixture-build)\.sh|conformance/lib/(live|jail|opencode-v2|scratch-home)\.sh"` outside `docs/plans/` prints nothing.
- [ ] `node scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Record `old.rev`; save both rows' `--describe` and the last `jail-argv.test` output to the ledger**
- [ ] **3. Write `row-safety.test`, `run.test` and the argument checks: verify RED**

Run: `scripts/build && node tests/review-bench/row-safety.test.js; node tests/conformance/run.test.js`

- [ ] **4. Port both rows and both runners**
- [ ] **5. Remove the runner's `.sh` branch; delete the bash libraries and `jail-argv.test`**
- [ ] **6. Verify GREEN**: the tests and the `--describe` comparison
- [ ] **7. Run the scope**

Run: `node scripts/check-all` (tracked background command)

- [ ] **8. Commit by path**

```
git rm tests/review-bench/run.sh tests/review-bench/rows/01-review-bench.sh tests/fixture-build/run.sh tests/fixture-build/rows/01-fixture-build.sh tests/review-bench/row-safety.test.sh tests/conformance/lib/live.sh tests/conformance/lib/jail.sh tests/conformance/lib/opencode-v2.sh tests/conformance/lib/scratch-home.sh src/tests/conformance/jail-argv.test.ts tests/conformance/jail-argv.test.js src/tests/conformance/stub-rows.test.ts tests/conformance/stub-rows.test.js
git add src/tests/review-bench/run.ts src/tests/review-bench/rows/01-review-bench.ts src/tests/review-bench/row-safety.test.ts src/tests/fixture-build/run.ts src/tests/fixture-build/rows/01-fixture-build.ts tests/review-bench/run.js tests/review-bench/rows/01-review-bench.js tests/review-bench/row-safety.test.js tests/fixture-build/run.js tests/fixture-build/rows/01-fixture-build.js src/tests/conformance/run.ts tests/conformance/run.js src/tests/conformance/run.test.ts tests/conformance/run.test.js src/scripts/check-all.ts scripts/check-all tests/review-bench/README.md tests/conformance/README.md
git commit -m "test: review-bench and fixture-build on Node; bash libraries removed"
```
