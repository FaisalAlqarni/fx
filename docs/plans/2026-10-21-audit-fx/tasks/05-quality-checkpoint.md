# 05: Quality checkpoint after the brief and the plan template

**Status:** ready-for-agent
**Blocked by:** 04
**Phase:** MVP

**What to build:** Before the build changes the review side, prove the quality floor still holds with tasks 01 to 04 in place: the review bench catches at least 23 of 24 planted defects and lane-triggering scores 17 of 17. The results are committed beside the plan. If either bar fails, the task reports BLOCKED and, by the plan's standing ruling, the build stops for the owner.

**Files:**
- Create: `docs/plans/2026-10-21-audit-fx/checkpoints.md`
- Create: the bench result file `run.sh` writes (`docs/plans/2026-09-23-lean-build/runs/bench-audit-a.json`)

**Interfaces:**
- Consumes: `tests/review-bench/run.sh <reps> <label>`, `tests/lane-triggering/run-all.sh`, both as they exist after task 03.
- Produces: `checkpoints.md` with one section per checkpoint: the date, the commit measured, each command run, its result line, and the verdict `holds` or `fails`.

**Seam:** the two harnesses' own result output.

**Risks:** both commands spend live quota and run long: launch each as a tracked background command and end the turn until it finishes. Never re-run a passing harness to get a better number. A harness that errors (not a low score) is BLOCKED with the error, not a fail of the bar.

**Idempotency:** `run.sh` refuses to overwrite an existing result file; if `bench-audit-a.json` exists from an interrupted run, read it instead of re-running.

**Testing:** the harnesses are the test.

## Acceptance criteria
- [ ] `tests/review-bench/run.sh 3 audit-a` ran on the branch head and its result file is committed.
- [ ] `tests/lane-triggering/run-all.sh` ran and its score is recorded.
- [ ] `checkpoints.md` has a `## Checkpoint A` section with both results and the verdict.
- [ ] Bench at least 23 of 24 and lane-triggering 17 of 17: status DONE. Otherwise status BLOCKED, naming the bar that failed and the numbers.

## Steps

- [ ] **1. Run the review bench**

Run `tests/review-bench/run.sh 3 audit-a` as a tracked background command. Expected: a result file and a caught-count line.

- [ ] **2. Run lane-triggering**

Run `tests/lane-triggering/run-all.sh` as a tracked background command. Expected: a score line out of 17.

- [ ] **3. Record the checkpoint**

Write `## Checkpoint A` to `checkpoints.md` with the commit (`git rev-parse --short HEAD`), each command, its result line, and the verdict.

- [ ] **4. Commit**

```
git add docs/plans/2026-10-21-audit-fx/checkpoints.md docs/plans/2026-09-23-lean-build/runs/bench-audit-a.json
git commit -m "test(fx): quality checkpoint A after the brief and plan template"
```

No attribution trailers. Report DONE or BLOCKED per the acceptance criteria.
