# 04: OWNER RUN: baseline

**Status:** ready-for-agent
**Blocked by:** 01, 02, 03, 03b
**Phase:** MVP
**Owner-run:** yes. `fx-implement` does not dispatch this task. It stops,
shows the owner the commands below, and resumes when the owner reports back.

**What to build:** nothing. This task records the numbers every later step is
judged against, on the pipeline as it is at the end of task 03.

**Files:**
- Create: `docs/plans/2026-09-23-lean-build/measurements.md`
- Create: `docs/plans/2026-09-23-lean-build/runs/baseline-1.json` … `baseline-3.json` (written by `run.sh`)

**Interfaces:**
- Consumes: `tests/fixture-build/run.sh <runs> <label>` (task 03);
  `tests/lane-triggering/run-reps.sh` and `run-all.sh` (task 02);
  `tests/conformance/run.sh claude-code` and `opencode`.

**Seam:** live.

**Idempotency:** `run.sh` refuses to overwrite a result file; a repeated
baseline uses label `baseline-b`.

## Commands for the owner (run from the build worktree)

Smoke first, one run, to prove a headless build finishes and every scorer
runs before spending three long runs:

```
tests/fixture-build/run.sh 1 smoke
```

If the smoke row fails (timeout, no build branch, no transcript, a scorer
error), stop: the controller records `Task 03: reopened, <reason>` in the
ledger and dispatches a fixer on task 03 as a normal fix round, then the owner
reruns the smoke as `smoke-b`. Only a clean smoke continues:

```
tests/fixture-build/run.sh 3 baseline
tests/review-bench/run.sh 3 baseline
tests/lane-triggering/run-all.sh
FX_CONFORMANCE_ROWS=tests/conformance/rows tests/conformance/run.sh claude-code
```

Row 04 on opencode, 10 reps (the runtime where the last regression showed):
use the same procedure the multi-harness ledger used for its "row 04 10/10"
entries, and record the count.

## What goes in measurements.md

One table per measurement, this row format, then a verdict line:

| Label | Caught at end, per trap, pooled /3 | Missed by review, per trap, pooled | Controller calls | Controller tokens | ctx median | ctx growth/task | Subagent tokens | Wall | Row 04 CC | Row 04 opencode | Triggering |
|---|---|---|---|---|---|---|---|---|---|---|

## Acceptance criteria
- [ ] Three baseline result files exist and `measurements.md` has their numbers.
- [ ] Triggering: pass count of `run-all.sh`, listing each FAIL by prompt name.
- [ ] Row 04: claude-code result and opencode x/10.
- [ ] **Sensitivity check.** The fixture can show a review loss only if review
      has something to catch. If, pooled over the three runs, fewer than 3
      trap instances are red at the implementer head (`caught` plus `missed`
      under 3), the traps are too easy: reopen task 03 the same way as a
      failed smoke (make at least two trap sentences less direct), then rerun
      the baseline as `baseline-b`. Same if every trap is `missed` in every run.
- [ ] If any lane-triggering prompt fails at baseline, record it as a known
      baseline failure; later steps must not add failures, and a baseline
      failure is not fixed inside this plan.

## Steps

- [ ] **1. Owner runs the commands above.**
- [ ] **2. Record the numbers in `measurements.md`** and commit:

```
git add docs/plans/2026-09-23-lean-build/measurements.md docs/plans/2026-09-23-lean-build/runs
git commit -m "docs(lean-build): baseline measurements"
```
