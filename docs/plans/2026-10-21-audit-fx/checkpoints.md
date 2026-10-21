# Quality checkpoints

## Checkpoint A

- Date: 2026-10-21
- Commit measured: 90ee21f (tasks 01 to 04 in place)
- `tests/review-bench/run.sh 3 audit-a`: caught 20 of 24 planted defects (control excluded), false positives 17. Misses: path-dotdot-only caught 1/3, readme-binary caught 1/3; the other six cases 3/3. Result file: `docs/plans/2026-09-23-lean-build/runs/bench-audit-a.json`.
- `tests/lane-triggering/run-all.sh`: 17 passed, 0 failed, 0 skipped.
- Earlier bench files for comparison, same 24-defect count: bench-baseline (470cf25) 21/24, bench-combined (643da94) 24/24, bench-combined2 (f2c1d24) 23/24 over three runs of one rep. The same two cases account for every earlier miss.
- Verdict: fails. The bench bar is at least 23 of 24; this run caught 20. Lane-triggering holds.

### Checkpoint A, re-measured (owner-approved)

- Why: every bench run before this build predates 1f749e2, which hid the answer keys and the case name from the reviewer, so the 23/24 bar was set on leaked runs. The re-measure compares base and head under the same scorer.
- Scorer change: `path-dotdot-only/match` and `readme-binary/match` widened to accept correct catches phrased differently (a65335f, fb51756), with positive and negative rows in `score.test.js`.
- `tests/review-bench/run.sh 3 audit-base` at 72f180c (branch base), findings kept: 20/24 with the old regexes, 24/24 re-scored with the widened ones. False positives 17. Result file: `bench-audit-base.json`.
- `tests/review-bench/run.sh 3 audit-head` at f3f4227, findings kept: 22/24 as run, 24/24 re-scored with the final regexes. False positives 16. Result file: `bench-audit-head.json`.
- Bar (owner-approved): head catches at least what base catches under the same scorer. Base 24/24, head 24/24.
- Lane-triggering at 90ee21f: 17/17.
- Verdict: holds.

## Checkpoint B

- Date: 2026-10-21
- Commit measured: d98ad7d (all seven build tasks in place)
- `tests/review-bench/run.sh 3 audit-b`, findings kept: 24/24 (bar 23/24), false positives 15 (branch base 17). Scored with the fb51756 regexes. Result file: `bench-audit-b.json`.
- `tests/lane-triggering/run-all.sh`: 17 passed, 0 failed, 0 skipped.
- `tests/fixture-build/run.sh 1 audit-final`, then `run.sh 2 audit-final-more` (run 1 showed a saving, so the early-abort rule allowed both). Each run ran alone.

| Run | Tokens | Wall clock | Tasks at end | Planted defects at end | Fix rounds |
|---|---|---|---|---|---|
| audit-final-1 | 7,817,049 | 16.0 min | 6/6 | 0 of 6 | 0 |
| audit-final-more-1 | 11,722,352 | 23.9 min | 6/6 | 0 of 6 | 1 |
| audit-final-more-2 | 11,278,813 | 18.7 min | 6/6 | 0 of 6 | 0 |
| Median | 11,278,813 | 18.7 min | | | |
| Baseline median (combined) | 23.3M | 41.5 min | | | |

- Against the baseline: median tokens cut by 52%, median wall clock cut by 55%.
- Defeater (tokens cut by at least 30% or wall clock by at least 25%): not triggered on either measure. The incremental refactor stands.
- Not measured here: the fixture plan is pre-written in the old task format and never runs fx-plan or fx-brainstorm, so decisions 3 (fewer, deeper tasks) and 4 (one design checkpoint) are not in these numbers. The cost lines of the next real plan written with the new lanes measure them.
- Note: build-cost reports `tasksCompleted 7` for the two later runs on a six-task fixture; the harness's own end state is 6/6. The count is a ledger-parse quirk and does not enter the token or wall-clock figures.
- Verdict: holds.
