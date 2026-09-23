# 09: OWNER RUN: measure step 3

**Status:** ready-for-agent
**Blocked by:** 08
**Phase:** Core
**Owner-run:** yes. `fx-implement` does not dispatch this task. It stops,
shows the owner the commands below, and resumes when the owner reports back.

**What to build:** nothing. Measures task 08 and records ship or revert.
Quality compares against the **baseline** (the fixed reference for every
step); cost compares against the **previous shipped step** (step 2, or the
baseline if step 2 was reverted), so each step is credited only with its own
saving.

**Files:**
- Modify: `docs/plans/2026-09-23-lean-build/measurements.md`
- Create: `docs/plans/2026-09-23-lean-build/runs/step3-1.json` … `step3-3.json`

**Seam:** live.

**Idempotency:** `run.sh` refuses to overwrite; a repeat uses label `step3-b`.

## Commands for the owner

```
tests/fixture-build/run.sh 1 step3-a & tests/fixture-build/run.sh 1 step3-b & wait
tests/review-bench/run.sh 3 step3
tests/lane-triggering/run-all.sh
FX_CONFORMANCE_ROWS=tests/conformance/rows tests/conformance/run.sh claude-code
```

Row 04 on opencode, 10 reps.

## Ship rule

Ship if **all** hold:
- quality: pooled over the 2 fixture runs, no trap is caught at the end fewer
  times than at baseline; pooled over the bench reps, no planted defect is
  caught fewer times and the control draws no more false positives than at
  baseline (byReview is recorded, not gating);
- row 04 and `run-all.sh` as in task 07;
- controller tokens median is lower than the previous shipped step's.

Also record the design target, which does not block shipping:
`ctxGrowthPerTask` median at least 3 times smaller than the baseline median.

Outcomes, exhaustive:
- quality holds, tokens lower, target met: `Step 3: ship`.
- quality holds, tokens lower, target missed: `Step 3: shipped, target missed`;
  the design's recorded fallback (Workflow-script orchestration, or a forced
  mid-build handoff) becomes the next design.
- quality holds, tokens not lower: `Step 3: revert, no saving`; revert task 08.
- quality drops: `Step 3: revert, <trap and counts>`; revert task 08 and stop
  for the owner.

## Acceptance criteria
- [ ] A `step3` table row in `measurements.md`.
- [ ] A verdict line: `Step 3: ship`, `Step 3: shipped, target missed`, or `Step 3: revert, <reason>`.

## Steps

- [ ] **1. Owner runs the commands.**
- [ ] **2. Record and commit**

```
git add docs/plans/2026-09-23-lean-build/measurements.md docs/plans/2026-09-23-lean-build/runs
git commit -m "docs(lean-build): step 3 measurements and verdict"
```
