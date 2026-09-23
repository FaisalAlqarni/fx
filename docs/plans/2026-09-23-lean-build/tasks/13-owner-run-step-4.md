# 13: OWNER RUN: measure step 4, ship or drop

**Status:** ready-for-agent
**Blocked by:** 11, 12
**Phase:** Hardening
**Owner-run:** yes. `fx-implement` does not dispatch this task. It stops,
shows the owner the commands below, and resumes when the owner reports back.

**What to build:** nothing. Measures parallel tasks (10, 11) and scoped tests
(12) against the step 3 result, and decides whether parallel ships.

**Files:**
- Modify: `docs/plans/2026-09-23-lean-build/measurements.md`
- Create: `docs/plans/2026-09-23-lean-build/runs/step4-1.json` … `step4-3.json`
- Modify: `.fx.json` (on ship only: `isolated_test_execution`)

**Seam:** live.

**Idempotency:** `run.sh` refuses to overwrite; a repeat uses label `step4-b`.

## Commands for the owner

```
FX_FIXTURE_PARALLEL=1 tests/fixture-build/run.sh 1 step4-a & FX_FIXTURE_PARALLEL=1 tests/fixture-build/run.sh 1 step4-b & wait
tests/review-bench/run.sh 3 step4
tests/lane-triggering/run-all.sh
FX_CONFORMANCE_ROWS=tests/conformance/rows tests/conformance/run.sh claude-code
```

Row 04 on opencode, 10 reps. For each fixture run, also record from the build's
ledger whether tasks 04 and 05 ran in parallel, and every `back to serial` line
with its reason.

## Ship rule (from the design, exact)

Parallel (tasks 10 and 11) ships only if **all** hold:
- quality: pooled over the 2 fixture runs, no trap is caught at the end fewer
  times than at baseline; pooled over the bench reps, no planted defect is
  caught fewer times and the control draws no more false positives than at
  baseline (byReview is recorded, not gating);
- `mergeDefects` is `0` in all 3 runs;
- the ledger of at least 2 of the 3 runs shows tasks 04 and 05 ran in
  parallel (otherwise nothing was measured), and task 06 went back to serial
  or ran after 05 merged;
- row 04 and `run-all.sh` as in task 07;
- median wall-clock is at least 15 percent lower than the previous shipped step's.

**On ship:** set `"isolated_test_execution": true` in this repo's `.fx.json`,
but only after the concurrency check in task 12 step 6 passed (its report
says so); commit that one-line change with the verdict.

**On drop:** revert tasks 10 and 11 (`git revert` of their commits), leave
`isolated_test_execution` unset in this repo (with task 11 reverted, the old
unguarded "relax only if" rule is back, so the key must stay off), and record
`Step 4: parallel dropped, <reason>`. Task 12's `test_scope` stays either way:
it changes how much runs per task, not what is checked, and task 12 carries its
own gate proof.

## Acceptance criteria
- [ ] A `step4` table row in `measurements.md`, plus the parallel and back-to-serial counts per run.
- [ ] A verdict line: `Step 4: ship` or `Step 4: parallel dropped, <reason>`.
- [ ] A closing summary in `measurements.md`: baseline against final, per column.

## Steps

- [ ] **1. Owner runs the commands.**
- [ ] **2. Record, revert if the rule says so, and commit**

```
git add docs/plans/2026-09-23-lean-build/measurements.md docs/plans/2026-09-23-lean-build/runs
git commit -m "docs(lean-build): step 4 measurements and verdict"
```

On ship, also stage `.fx.json`.
