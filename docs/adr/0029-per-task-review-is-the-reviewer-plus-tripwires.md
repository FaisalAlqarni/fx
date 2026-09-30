# Per-task review is the reviewer plus tripwires; every lens and devil's advocate run at the branch pass

## Context

In a measured build, the five lenses were 3.3% of agent-minutes (121 dispatches) but they trigger fix rounds, and fix rounds cost 13.3% of agent-minutes. The owner has asked for the same cut about seven times: per-task review should be lighter.

## Decision

During `fx-implement`, each task gets the task reviewer plus a lens only when the task's diff matches that lens's narrow tripwire. Security, database and silent-failure each have one. a11y and pipeline never run per task. Devil's advocate never runs per task. The branch-end review still runs every lens on its broad trigger, plus devil's advocate in code mode.

The rule lives in one place, the lens table in `skills/fx-review/SKILL.md` (column "Per task (tripwire)"). `fx-implement` points at it. `tests/gates/tripwire-table.test.js` pins the table shape.

## Trade-off

P1 on advantage-backend had per-task Criticals that later tasks built on. The tripwires still catch two of the three that compounded: `HostGuard.pin!` (task 06, user-supplied-host code) and the `is_deleted` and `lock_timeout` gaps (task 01, a migration). The third, task 12's claim predicate not using task 10's partial index, was a query change with no migration. Under this rule the branch pass catches it, later. We accept that cost.

## Supersedes

The "Per-task review, the fix loop, trigger-gated lenses, and the branch-end review stay exactly as they are" clause of `docs/plans/2026-09-23-lean-build/design.md`. Per-task review changes as described above; the other items in that clause are unchanged.
