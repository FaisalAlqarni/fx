# The bounded path writes a short design.md

Status: accepted, 2026-10-25.

## Context

ADR 0045 gave the architectural path one design checkpoint: a written design.md the owner reviews once. The bounded path (small work approved in chat) wrote nothing, so its decision had no record, and a compacted session could not tell what was approved.

## Decision

This amends ADR 0045. After chat approval, the bounded path writes a design.md of 5 to 15 lines in `docs/plans/YYYY-MM-DD-<slug>/`: Problem, Approach, Files, Seams and the `**Approved:**` line. It holds no plan. Step 6 of `skills/fx-brainstorm/SKILL.md` states it. ADR 0045's rule stands: only brainstorm writes the Approved line, and only on the owner's approval. The owner is not asked a second time.

## Consequences

- Every approved piece of work leaves a written record that survives compaction.
- Bounded work gains one small file; the design template is not required.
