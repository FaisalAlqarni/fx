# One compiled brief per implementer and per task reviewer

## Context

An implementer was dispatched with a template that restated the TDD cycle (which `fx-tdd` owns), a task file, a pasted Global Constraints block, a pasted context block, and a stack instruction that sent it to read `.fx.json`, `repo.md` and whole stack files. The task reviewer read the whole ledger to find rulings. Each of these was assembled by hand per dispatch, and the template was 16 KB (`docs/plans/2026-10-21-audit-fx/design.md`).

## Decision

- **`skills/fx-implement/scripts/compile-brief` writes one `brief.md` per task.** Sections in order: `## Task`, `## Global constraints`, `## Context`, `## Rulings`, `## Design excerpt`, `## Stack`. The controller runs it before the implementer dispatch and again before the task review, so rulings made since dispatch are carried.
- **`rulingsFor(cwd, planDir)` in `lib/plan-state.js` supplies the rulings:** every live `Ruling:` from `docs/plans/rulings.md`, then from the ledger outside its `## Standing rulings` copy. Wrapped lines are joined, results are deduplicated, nothing is capped or filtered by task, because a ruling about a later task may name only the earlier one.
- **The implementer template reads `[BRIEF_FILE]` and drops its `## TDD` summary,** which duplicated `fx-tdd`. It keeps every contract other parts of the pipeline read, and is capped at 11,000 bytes by `tests/gates/brief-size.test.js`.
- **The task reviewer template reads `[BRIEF_FILE]` instead of `[LEDGER_FILE]`.** The review bench fills the same placeholder.
- **`references/vocab/good-tests.md` keeps its rules** (cap 9,000 bytes) and its worked examples move to `good-tests-examples.md`, which `fx-tdd` points at. References stay leaves.

## Risks

HIGH: implementers skipping `fx-tdd`. Guards: the template keeps "Invoke the fx-tdd lane before writing any code" as the first item of the job list; the report keeps its RED/GREEN **TDD evidence** section; the task reviewer keeps checking for a captured RED; the cost line from ADR 0040 counts `fx-tdd` calls per task.

MEDIUM: gate tests pin template sentences (`tripwire-table`, `return-contract`, `fix-loop-shape`, `review-content`). Each pinned sentence stays or moves with its assertion.

## Decision notes

- The design's brief listed a `Reply contract` section. It stays in the template, because it is the same for every task.
- Stack slices are chosen by the task's explicit `**Stack:**` line, with today's whole-file read as the fallback, instead of by the file list. `**Design:**` works the same way. Both lines are the task-file convention task 04's template writes.

## Supersedes

Nothing.
