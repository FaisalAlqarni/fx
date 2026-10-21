### Spec Compliance

- ✅ Spec compliant. Checked file by file against the Files list (all 17 hunks present, ADR 0042 included) and every acceptance criterion: rulingsFor, six sections in order, Design `Heading > N`, Stack line and fallback, `(missing: X)`, template contracts, 10,909 B (cap 11,000), good-tests 8,996 B (cap 9,000), BRIEF_FILE in reviewer template and bench, check-all entries. Ran: plan-state.test.js (46 passed, 0 failed), compile-brief.test.js (OK), brief-size.test.js (OK), no-stories-in-loaded-lanes.test.js (OK).
- ⚠️ Cannot verify from diff: tests/review-bench/rows/01-review-bench.sh was not run live (report says so); task 05 checkpoint owns that. The bench's fixture `.fx.json` has no stacks, so the brief's Stack is `None.` there.

### Strengths

- compile-brief reuses `rulingsFor`, resolves stack files from the plugin and plan files from `--worktree`; unknown entries surface as `(missing: X)` instead of silently vanishing (compile-brief:62-80).
- Template kept the fx-tdd line first in the job list (implementer-prompt.md:38), the **TDD evidence** report section (:189-192), the Tripwires line, and the gate pins them (brief-size.test.js:17-23).
- tripwire-table anchor moved with its text; the bench row now builds its brief through the real script, so the bench measures the real input.
- Ruling A honoured: no `Measured` in any loaded lane file; the two in good-tests-examples.md are moved verbatim and that file is outside the 02 gate's loaded set (no-stories-in-loaded-lanes.test.js:10-17).

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)

1. Report TDD evidence has no captured RED. `.fx/2026-10-21-audit-fx/reports/03-one-compiled-brief-per-implementer-report.md` line "RED/GREEN" gives only "plan-state.test.js RED (rulingsFor null) then 46/0; compile-brief.test.js RED (script missing) then OK; brief-size.test.js RED (template size) then OK". There is no command and no actual failing output for any of the three behaviors, and the template this very task ships (implementer-prompt.md:189-192) requires "the command run, the failing output, why that failure was expected, runtime or compile-time". Combined with the cost line `fx-tdd 0/1` (no fx-tdd lane call), a RED that was run cannot be told apart from one that was asserted. Fix: re-run each RED against the pre-implementation state (or `git stash`-free equivalent: check out the test files at the test-only commit state in a scratch worktree) and paste command plus output into the report, or state plainly that it was not captured.

#### Minor (Nice to Have)

1. lib/plan-state.js:104 (`rulingsIn` via `asRuling`) only matches lines starting `Ruling:`. The ledger in this very build writes `Ruling A:` / `Ruling B:` (state.md:36-37), and Ruling A names task 03. Those never reach a brief (rulingsFor on docs/plans/2026-10-21-audit-fx returns 7 rulings, none of A/B). Matches the task's written contract, but the reviewer loses what the old whole-ledger read gave. Fix: accept `Ruling [A-Z]:` or stop writing lettered rulings.
2. skills/fx-implement/SKILL.md "Verify a constraint before you copy it" paragraph (after line ~588) still tells the controller to check constraints it copies; with compile-brief the controller no longer copies them, so the paragraph now speaks to the context file only. Reword.
3. references/vocab/good-tests-examples.md contains 3 em dashes (moved verbatim from good-tests.md, where they pre-existed); the global no-dash constraint applies to lane text. No gate covers references/.
4. compile-brief.test.js has no case for `Heading > N` where N is missing, or for a `.fx.json` naming a stack with no file; only the happy path and unknown heading are covered.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** The implementation meets every acceptance criterion and the tests pass, but the report holds no captured RED (command and failing output) for any of the three behaviors, and the implementer made no fx-tdd call, so the test-first claim is unproven.

## Ledger lines

Task 03: minor (deferred): rulingsFor skips lettered rulings (`Ruling A:`), so Ruling A/B never reach a brief.
Task 03: minor (deferred): SKILL.md "Verify a constraint before you copy it" paragraph is stale now that compile-brief copies the constraints.
Task 03: minor (deferred): good-tests-examples.md carries 3 em dashes moved verbatim; no gate covers references/.
Task 03: minor (deferred): compile-brief.test.js lacks cases for a missing `Heading > N` paragraph and a stack name with no file.
