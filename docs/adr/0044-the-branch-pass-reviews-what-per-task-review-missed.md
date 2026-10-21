# The branch pass reviews what per-task review missed, and the top tier is a written decision

## Context

ADR 0029 made the branch pass run every lens plus devil's advocate, after each task had already been reviewed and had run its own tripwire lenses. That repeats work on files a lens has already read. Separately, the two agents pinned to opus ran on the top tier on every dispatch, and `route()` skipped every `fx:` agent, so no dispatch of them needed a reason.

## Decision

- With a ledger, the branch pass runs the broad pass over cross-task seams, the unprimed devil's advocate, and at most four lenses. A lens runs when its branch trigger matches the branch diff and it either never fired on any task, or its trigger matches files outside the tasks where it fired. Lenses past four fold into the broad pass's brief as named checks, in the lens table's order.
- A standalone `fx-review` branch run has no ledger and keeps the full pass.
- `route()` no longer skips `fx:` agents. An `fx:` agent given a `model` outside the cheap set with no `Capable because:` line runs on the standard tier. With no `model`, the frontmatter pin applies.
- `fx-lens-security` and `fx-devils-advocate` pin `sonnet`. Four call sites ask for the top tier and say why with a `Capable because:` first line: fx-plan §8 red-team, `/fx:fx-critique`, standalone `fx-review` branch mode, and fx-implement's final review when the branch touches authentication or authorization.
- `tests/gates/branch-pass.test.js` pins the lane text, the pins and the four call sites, and is listed in `scripts/check-all`.

## Risks

A call site that loses its `Capable because:` line silently runs on sonnet. The gate checks that each of the four files contains the phrase, not that the line is the first line of a specific dispatch.

## Supersedes

Part of ADR 0029: the sentence that the branch pass runs every lens.
