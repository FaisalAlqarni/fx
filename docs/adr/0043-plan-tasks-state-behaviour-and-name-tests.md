# Plan tasks state behaviour and specify their tests in prose

## Context

fx-plan wrote many small tasks and carried full test code in each. A pipeline run paid for a fresh implementer and a fresh reviewer per task, and the test code in a task was code nobody had run: implementers reported that given tests did not run, and the plan assumed the implementer had "questionable taste" and did not know test design (`docs/plans/2026-10-21-audit-fx/design.md`).

## Decision

- **A task is one seam.** Docs, ADR, rename and config work fold into the task that needs them, and tasks that edit the same files merge.
- **The task template has a `**Tests:**` field instead of test code.** One entry per test: name, input, and the exact expected value or error contract (exact message, key or status). The implementer writes each test through `fx-tdd` against real code. A decision-rich snippet (schema, state machine, type shape) may still be inlined, trimmed, with its source noted.
- **Required fields:** Status, Blocked by, Phase, What to build, Design, Files, Seam, Tests, Testing, Acceptance criteria, Steps. **Optional:** Stack (omitted means every stack file), Interfaces (required when a neighbour consumes or produces a symbol), Risks, Idempotency (required when the task mutates state outside git).
- **`**Design:**` and `**Stack:**` are the lines `compile-brief` reads** (ADR 0042).
- **Steps** read: invoke `fx-tdd`, write each test the Tests field names, verify RED, implement, verify GREEN, run the scope, commit by path.
- **The red-team recommendation depends on risk, not task count.**
- **The No-placeholders list and the Quality red flags agree with the template.** The error-contract and spec-type flags stay.
- **`tests/gates/plan-template.test.js` pins this in `scripts/check-all`.**

## Risks

MEDIUM: a prose test spec can be looser than code. The exact-expected-value rule, the "Tests entry without an exact expected value" placeholder and the two kept red flags on error contracts and spec types hold the precision.

## Supersedes

Nothing.
