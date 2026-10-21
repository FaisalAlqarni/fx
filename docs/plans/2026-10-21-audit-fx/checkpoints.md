# Quality checkpoints

## Checkpoint A

- Date: 2026-10-21
- Commit measured: 90ee21f (tasks 01 to 04 in place)
- `tests/review-bench/run.sh 3 audit-a`: caught 20 of 24 planted defects (control excluded), false positives 17. Misses: path-dotdot-only caught 1/3, readme-binary caught 1/3; the other six cases 3/3. Result file: `docs/plans/2026-09-23-lean-build/runs/bench-audit-a.json`.
- `tests/lane-triggering/run-all.sh`: 17 passed, 0 failed, 0 skipped.
- Earlier bench files for comparison, same 24-defect count: bench-baseline (470cf25) 21/24, bench-combined (643da94) 24/24, bench-combined2 (f2c1d24) 23/24 over three runs of one rep. The same two cases account for every earlier miss.
- Verdict: fails. The bench bar is at least 23 of 24; this run caught 20. Lane-triggering holds.
