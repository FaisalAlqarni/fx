# 08: Final quality and cost measurement

**Status:** ready-for-agent
**Blocked by:** 07
**Phase:** MVP

**What to build:** With every change in place, measure the quality floor and the cost against today's baseline, and record the Defeater verdict. Quality: review bench at least 23 of 24, lane-triggering 17 of 17. Cost: six-task fixture builds read by `scripts/build-cost --json`, compared with the shipped baseline medians of 41.5 minutes and 23.3M tokens. One run is made first; the next two run only if the first shows a saving, so a regression costs one run, not three.

**Files:**
- Modify: `docs/plans/2026-10-21-audit-fx/checkpoints.md`
- Create: the result files the harnesses write (`docs/plans/2026-09-23-lean-build/runs/bench-audit-b.json`, `docs/plans/2026-09-23-lean-build/runs/audit-final-<n>.json`)

**Interfaces:**
- Consumes: `tests/review-bench/run.sh`, `tests/lane-triggering/run-all.sh`, `tests/fixture-build/run.sh <runs> <label>`, `scripts/build-cost --json`.
- Produces: `## Checkpoint B` in `checkpoints.md`: commit, each command, each result, the medians against 41.5 minutes and 23.3M tokens, and the Defeater verdict (tokens cut by at least 30% or wall clock by at least 25%: incremental refactor stands; otherwise: the per-task chain shape is the cost).

**Seam:** the harnesses' own result output.

**Risks:** the fixture plan under `tests/fixture-build/repo/` is pre-written in the old task format and never runs fx-plan or fx-brainstorm, so it measures decisions 1, 2, 5 and 6 and not 3 and 4. Say so in the checkpoint; decisions 3 and 4 are proved by the cost lines of the next real plan written with the new fx-plan. Each fixture run spends live quota and can take up to 3 hours: launch it as a tracked background command and end the turn.

**Idempotency:** each harness refuses to overwrite its result file; an existing file from an interrupted run is read, not re-run.

**Testing:** the harnesses are the test.

## Acceptance criteria
- [ ] Bench (`run.sh 3 audit-b`) and lane-triggering ran; results recorded.
- [ ] Fixture run 1 (`tests/fixture-build/run.sh 1 audit-final`) ran. If its total tokens are at least 23.3M and its wall clock at least 41.5 minutes, no further runs: record that and report BLOCKED with the numbers.
- [ ] Otherwise two more runs ran, and the medians of the three are recorded against the baseline.
- [ ] `## Checkpoint B` states the Defeater verdict and the decisions the fixture could not measure.
- [ ] Quality bars met and Defeater not triggered: DONE. Either one fails: BLOCKED with the numbers.

## Steps

- [ ] **1. Run the review bench and lane-triggering**

`tests/review-bench/run.sh 3 audit-b`, then `tests/lane-triggering/run-all.sh`, each as a tracked background command.

- [ ] **2. Run fixture build 1**

`tests/fixture-build/run.sh 1 audit-final` as a tracked background command; read its result with `scripts/build-cost --json` as the harness reports.

- [ ] **3. Decide on runs 2 and 3**

Apply the early-abort rule in the acceptance criteria. If it allows, run `tests/fixture-build/run.sh 2 audit-final-more` the same way.

- [ ] **4. Record Checkpoint B**

Write `## Checkpoint B` to `checkpoints.md` with every result, the medians, and the Defeater verdict.

- [ ] **5. Commit**

```
git add docs/plans/2026-10-21-audit-fx/checkpoints.md docs/plans/2026-09-23-lean-build/runs
git commit -m "test(fx): final quality and cost checkpoint"
```

No attribution trailers. Report DONE or BLOCKED per the acceptance criteria.
