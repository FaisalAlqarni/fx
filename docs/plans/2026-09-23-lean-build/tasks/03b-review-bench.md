# 03b: Review bench

**Status:** ready-for-agent
**Blocked by:** 03
**Phase:** MVP

**What to build:** a direct measure of whether fx's per-task review catches a
known defect. Three smoke builds showed implementers never got a fixture trap
wrong (ledger Rulings K and L), so the fixture build cannot show a review loss.
The bench skips the build: it hands fx's own task reviewer a diff that already
contains a planted defect, and scores whether the review flags it.

Each **case** is the fixture seed repo plus one task's implementation, committed
as a head on top of a base, where the implementation carries one planted
defect (or none, for the control). The bench fills
`skills/fx-implement/task-reviewer-prompt.md` from the **working tree** (so a
later change to that template, such as task 08's, is what gets measured),
packages the diff with `skills/fx-implement/scripts/review-package`, and runs
one headless reviewer session per case inside the conformance jail. It then
reads the findings file the reviewer wrote.

**Files:**
- Create: `tests/review-bench/cases/<case>/` per case: `task` (the fixture task number, one line), `files/` (the implementation files as they are at head), `match` (one extended regex, case-insensitive, that a finding naming this defect contains)
- Create: `tests/review-bench/score.js`
- Create: `tests/review-bench/score.test.js`
- Create: `tests/review-bench/rows/01-review-bench.sh`
- Create: `tests/review-bench/run.sh`
- Create: `tests/review-bench/README.md`
- Modify: `scripts/check-all` (add `score.test.js`)

**Cases** (the planted defects already written in
`tests/fixture-build/hidden/traps.self-test.js`, one per case, applied to the
good reference implementation there):

| Case | Task | Defect | `match` must find |
|---|---|---|---|
| `path-no-check` | 01 | no containment check at all | escape, traversal, or outside NOTES_DIR |
| `path-dotdot-only` | 01 | rejects only names containing `..` | absolute path |
| `missing-returns-empty` | 01 | `load` of a missing note returns `''` | missing note, ENOTE, or empty string |
| `empty-throws` | 01 | an empty note throws ENOTE | empty note |
| `search-case-sensitive` | 05 | `includes(q)` with no case folding | case |
| `search-query-only` | 05 | lowercases the query only | case |
| `readme-binary` | 03 | README example uses a `notes` binary | binary, `node cli.js`, or not installed |
| `cli-inline-search` | 06 | `cli.js` has its own search | lib/search, duplicate, or reimplement |
| `control` | 01 | none (the good reference) | nothing: any Critical or Important finding is a false positive |

**Interfaces:**
- Produces: `node tests/review-bench/score.js <findings.md> <match-regex|NONE>`
  prints `{"caught": true|false, "falsePositive": true|false, "important": <n>}`
  and exits 0; exits 2 when the findings file is missing or has no
  `Critical` and no `Important` heading (a reviewer that did not follow the
  template is a bench failure, not a miss). `caught` is true when a line under
  a Critical or Important heading matches the regex. With `NONE` (the
  control), `falsePositive` is true when any finding sits under Critical or
  Important.
- Produces: `tests/review-bench/run.sh <reps> <label>` runs every case `<reps>`
  times on claude-code through `tests/conformance/run.sh` with
  `FX_CONFORMANCE_ROWS=tests/review-bench/rows`, writes
  `docs/plans/2026-09-23-lean-build/runs/bench-<label>.json`:
  `{ "label", "fxCommit", "reps", "cases": { "<case>": { "caught": <k>, "of": <reps>, "falsePositive": <k> } } }`,
  and prints one line per case. Refuses a bad count, a bad label, and an
  existing result file (exit 2), like the fixture's run.sh.
- The row, per case and rep: `live_workdir`; copy the fixture seed repo;
  commit (base); copy the case's `files/` over it; commit (head); run
  `review-package` for the diff; fill the template placeholders
  (`[TASK_FILE]` the fixture task file, `[GLOBAL_CONSTRAINTS]` the fixture
  plan's Global Constraints verbatim, `[LEDGER_FILE]` an empty ledger,
  `[REPORT_FILE]` a one-line report saying the task is done, `[BASE_SHA]`,
  `[HEAD_SHA]`, `[DIFF_FILE]`, `[FINDINGS_FILE]` a path in `$WORK`) with the
  text inside the template's fenced prompt only; run `live_run` with that as
  the prompt and `--model sonnet` (the tier fx dispatches reviewers on;
  add an `FX_LIVE_MODEL` override to live.sh's claude-code branch, default
  unset meaning no flag); then `score.js`. A missing findings file or a score
  exit 2 fails the row naming it.

**Seam:** unit for `score.js`; live and owner-run for the row (task 04 and each step's measurement).

**Risks:**
- The reviewer sees only what fx's reviewer sees. Do not add hints about the
  defect to the prompt, the report, or the ledger.
- Regex scoring can miss a finding worded unexpectedly. Keep each `match`
  broad but specific to the defect, and record every miss's findings file in
  the run's kept logs so a miss can be audited by reading it.

**Idempotency:** `run.sh` refuses to overwrite a result file.

**Testing:** `node tests/review-bench/score.test.js`, `bash -n`, the row's `--describe`, the refusals, `scripts/check-all`. The live bench is not run in this task.

## Acceptance criteria
- [ ] Nine case directories exist, each with `task`, `files/`, `match`; `control`'s match is `NONE`.
- [ ] Applying each case's `files/` to the seed repo and running `tests/fixture-build/hidden/traps.test.js` shows the defect: the case's trap reads false, and `control` reads all true.
- [ ] `score.js` passes its tests: caught under Important, not caught when the only match is under Minor, false positive on the control, exit 2 with no Critical or Important heading.
- [ ] The filled prompt is byte-identical to the template's fenced prompt with only the placeholders replaced (the test compares them).
- [ ] With `FX_LIVE_MODEL` unset, `live_run`'s claude-code command line is unchanged.

## Steps

- [ ] **1. Write the failing test** `tests/review-bench/score.test.js`: write four small findings files to a temp dir (a match under `#### Important (Should Fix)`, a match only under `#### Minor (Nice to Have)`, the control with one Important finding, a file with no Critical or Important heading) and assert the four outcomes above with `spawnSync`.
- [ ] **2. Verify RED**: `node tests/review-bench/score.test.js` fails, `score.js` does not exist.
- [ ] **3. Implement `score.js`** (driven by `fx-tdd`).
- [ ] **4. Verify GREEN.**
- [ ] **5. Build the nine cases** and check each against `traps.test.js` as the criteria say (throwaway temp dirs, removed after).
- [ ] **6. Write the row, the template filling (with its byte-identity test added to `score.test.js` or a sibling test), `run.sh`, the README, and the `FX_LIVE_MODEL` override.** `bash -n`, `--describe`, the refusals.
- [ ] **7. Run the suite**: add the unit test to `scripts/check-all`, run it.
- [ ] **8. Commit**

```
git add tests/review-bench tests/conformance/lib/live.sh scripts/check-all
git commit -m "test(review-bench): planted-defect diffs scored against fx's task reviewer"
```
