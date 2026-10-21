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
