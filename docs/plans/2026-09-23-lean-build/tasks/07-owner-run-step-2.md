# 07: OWNER RUN: measure step 2

**Status:** ready-for-agent
**Blocked by:** 05, 06
**Phase:** Core
**Owner-run:** yes. `fx-implement` does not dispatch this task. It stops,
shows the owner the commands below, and resumes when the owner reports back.

**What to build:** nothing. Measures tasks 05 and 06 against the baseline in
`measurements.md` and records ship or revert.

**Files:**
- Modify: `docs/plans/2026-09-23-lean-build/measurements.md`
- Create: `docs/plans/2026-09-23-lean-build/runs/step2-1.json` … `step2-3.json`

**Seam:** live.

**Idempotency:** `run.sh` refuses to overwrite; a repeat uses label `step2-b`.

## Commands for the owner

```
tests/fixture-build/run.sh 1 step2-a & tests/fixture-build/run.sh 1 step2-b & wait
tests/review-bench/run.sh 3 step2
tests/lane-triggering/run-all.sh
FX_CONFORMANCE_ROWS=tests/conformance/rows tests/conformance/run.sh claude-code
```

Row 04 on opencode, 10 reps, as in task 04. Rows 02 and 16 must pass on
claude-code: row 02 proves subagents still get the bootstrap, row 16 proves
sessions still get the plans block.

## Ship rule (from the design, exact)

Ship if **all** hold:
- quality: pooled over the 2 fixture runs, no trap is caught at the end fewer
  times than at baseline; pooled over the bench reps, no planted defect is
  caught fewer times and the control draws no more false positives than at
  baseline (byReview is recorded, not gating);
- row 04 claude-code passes, opencode is at or above its baseline count;
- `run-all.sh` has no FAIL that was not already a baseline failure;
- rows 02 and 16 pass;
- the median of subagent tokens or of wall-clock is lower than baseline.

Otherwise: revert tasks 05 and 06 (`git revert` of their commits), record why,
and stop the plan for the owner to decide.

## Acceptance criteria
- [ ] A `step2` table row in `measurements.md` in the task 04 format.
- [ ] A verdict line: `Step 2: ship` or `Step 2: revert, <reason>`.

## Steps

- [ ] **1. Owner runs the commands.**
- [ ] **2. Record and commit**

```
git add docs/plans/2026-09-23-lean-build/measurements.md docs/plans/2026-09-23-lean-build/runs
git commit -m "docs(lean-build): step 2 measurements and verdict"
```
