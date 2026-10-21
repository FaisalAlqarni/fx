### Finding verdicts

- **I1 compile-brief writes a brief that looks complete when the plan cannot be read**: ADDRESSED. skills/fx-implement/scripts/compile-brief dies on a null plan.md read, on a `.fx.json` parse error, on a named stack with no file, and on a missing design.md only when the task has a Design entry. compile-brief.test.js adds one case per exit, plus `Implementation Decisions > 9` and the design.md-missing-without-Design-entry exit 0 case. The report says `> 9` already passed before the fix, which is coverage only; the other exits show RED in the report.
- **I2 ruling filter drops rulings that apply**: ADDRESSED. lib/plan-state.js TASK_REF and `names` now include `or`; OPEN_RANGE (`from/after task`, `task NN on`, `onward`, `and later`) makes `namesOtherTasksOnly` return false. plan-state.test.js rows cover `tasks 05 or 08` (kept for 05 and 08, dropped for 06), `from task 03 on`, `and later`, `after task 04`, and a plain single task still dropped.
- **I3 ledger ruling absorbs the next free-form line**: ADDRESSED. `rulingsIn(src, wrap)` wraps only for rulings.md (`true`) and not for the ledger (`false`); both callers updated. The reproduced case (ruling then `Coverage audit: dispatched for task 03.`) is a test row that reaches task 05. The existing wrap test moved to rulings.md.
- **I4 one transcript-path slot per directory**: ADDRESSED. scripts/build-cost returns `cost unavailable (transcript is another session's)` when no controller call carries a `Task <NN>: dispatched` ledger write; the test checks exit 0 and the exact line. Existing --task fixtures gained a dispatch write.
- **I5 per-task cost line is a time window**: ADDRESSED. build-cost computes `endMs` from the first own `complete` write or other task's `dispatched` write at or after `since`; controller calls, subagent start time and subagent calls are all cut to it; minutes use `endMs`. Tests cover the next-task-dispatch cut and the complete-write cut. SKILL.md lines 369 to 378 now describe the window and the own-dispatch check.

### New breakage in the fix diff

None Critical or Important.

- Minor: lib/plan-state.js OPEN_RANGE `\btasks?:?\s*\d+\s+on\b` only matches a single number before `on`, so `tasks 03 and 04 on` is not treated as open and could still be dropped for a later task. Edge wording; the other open-range patterns usually catch real phrasing.
- Minor: scripts/build-cost subagent calls are cut at `endMs`, so a subagent still running when the window closes loses its tail. This follows the controller's ruling that the same window applies to subagent files.

Checks run: confirmed `buildLedgerDiffMap`, `isLedgerWrite` and `ledgerText` exist in build-cost (lines 110, 132, 144); `read` in compile-brief returns null on failure (line 25); no em or en dashes in the four touched source and SKILL files. Report names covering tests with RED and GREEN output and check-all rc=0; not re-run.

### Out-of-scope observations

None.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ledger lines

Task 99: fix round 1/5 (5 addressed, 0 open: none; commits d30cdc9..87f7b85)
Task 99: minor (deferred): OPEN_RANGE misses a multi-number list before `on`, such as `tasks 03 and 04 on`.
Task 99: minor (deferred): subagent calls are cut at the window end, so a subagent still running loses its tail.
