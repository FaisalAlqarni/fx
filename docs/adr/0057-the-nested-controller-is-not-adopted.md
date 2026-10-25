# The nested controller is not adopted

Status: accepted, 2026-10-25.

## Context

superpowers 6.4.1 added a nested controller: a build runs in a subagent session of its own, so the owner's session stays small. The upstream-update research compared it with fx-implement.

## Decision

fx does not adopt it.

- **Its only claimed gain is cost.** The owner's session carries less text.
- **Its rulings would move from Opus to Sonnet.** The controller's judgement calls would run on a cheaper model, and nobody has measured quality at that tier.
- **It needs three patches:** the final review back in the owner's session, a relay for results that land in the wrong session, and a fix for the transcript source `scripts/build-cost` reads.
- **The compaction problem it touched is fixed by the splits.** The size gate (ADR 0053) keeps the fix-loop cap, final review and exit gate in a compacted controller.

## Consequences

- fx keeps one controller in the owner's session.
- Long builds cost the owner's session more context than the nested design would.
- **Revisit when superpowers publishes a quality measurement** comparing nested and non-nested controllers on the same tasks. A cost figure alone does not reopen this.
