# Lean build: measurements

All runs on Claude Code unless noted, 2026-09-23. Raw results in `runs/`; the ledger (`state.md`) has the commits each ran at.

## Baseline (pipeline at the plan's start)

| Measure | Result |
|---|---|
| Fixture builds | baseline-a 33m, 19.3M tokens, controller 41 calls and 4.1M tokens, ctx median 97K, caught at end 6/6; baseline-b 55m, 22.8M tokens, controller 61 calls and 6.1M tokens, ctx median 102K, caught at end 6/6, 3 fix rounds |
| Review bench (3 reps) | 21 of 24 planted defects caught (path-dotdot-only 1/3, readme-binary 2/3, all others 3/3) |
| Lane-triggering | 17 of 17 |
| Conformance | 18 pass, 0 fail, 0 gap |
| Row 04, opencode | 10 of 10 |

Three earlier smoke builds (47m, 56m, 42m) showed implementers never got a fixture trap wrong, which led to the review bench (owner decision, Rulings K, L).

## Combined (steps 2, 3 and 4 together, Ruling Q)

| Measure | Result |
|---|---|
| Fixture builds (parallel tasks on) | combined-a 38m, 22.6M tokens, controller 66 calls and 6.3M tokens, ctx median 92K; combined-b 45m, 24.0M tokens, controller 59 calls and 5.9M tokens, ctx median 101K; caught at end 6/6 both; merge defects 0; tasks 04 and 05 ran in parallel in both |
| Review bench (3 reps) | 23 of 24 (path-dotdot-only 2/3, all others 3/3) |
| Lane-triggering | 17 of 17 |
| Conformance | 18 pass, 0 fail, 0 gap |
| Row 04, opencode | 10 of 10 |

Medians: wall clock 41.5m against 44m; total tokens 23.3M against 21.1M; controller tokens 6.1M against 5.1M. Run-to-run spread (33 to 55 minutes) is larger than any effect.

Not usable: the bench's control false-positive count. Both sides flag the control's real test gaps in 3 of 3 reps; the baseline shows 1 of 3 only because score.js counts dash bullets and two baseline reviews used numbered lists. The first combined bench (bench-combined.json) ran stale cases and is discarded. build-cost's per-type and per-task numbers for the combined runs are unreliable (coverage audit G2); totals, wall clock and controller tokens are sound.

## Verdicts

- **Step 2 (finished plans not listed, subagents skip the plan list): ship.** Correctness fix; no quality change.
- **Step 3 (controller context cap): ship, owner decision.** Quality held or improved (bench 23 against 21). No token saving is measurable on a six-task fixture whose controller peaks near 100K context; the cap targets long builds (the multi-harness build ran at a 503K median). To be verified on the next real long build against transcript 61606dd5, after build-cost is fixed for the new templates.
- **Step 4 (parallel tasks): dropped.** Wall clock about 6 percent faster against a 15 percent bar, and in the live builds the controller skipped guards (post-rebase tests run with `|| true`, no file-list comparison). Tasks 10 and 11 reverted; `isolated_test_execution` stays unset.
- **Task 12 (scoped per-task tests for this repo): kept.** It changes how much runs per task, not what is checked.
