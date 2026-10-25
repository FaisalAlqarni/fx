# /fx:fx-pr and /fx:fx-retro are user-invoked commands

Status: accepted, 2026-10-25.

## Context

The upstream update added three entry points: a pull request description, a look back at a build, and a plain "where are we" summary. ADR 0025 kept five lanes (fx-audit, fx-critique, fx-grill, fx-handoff, fx-setup) out of model selection with `disable-model-invocation`. Each new lane in the skill list competes with the others for the same prompts, and its description is loaded into every session.

## Decision

`/fx:fx-pr`, `/fx:fx-retro` and `/fx:fx-what` are user-invoked commands, generated from `commands/*.md` into skills with `disable-model-invocation: true` (`scripts/gen-command-skills`).

- **One claimant per intent.** A model-invoked lane would rival fx-review, fx-implement and fx-handoff on prompts like "wrap this up".
- **No context load.** A command costs nothing until the owner types it.
- **A lane cannot invoke one.** fx-implement ends its completion report with a line naming `/fx:fx-retro`, and fx-debug points to it; neither runs it.
- **`/fx:fx-pr` never pushes or opens a PR.** It drafts text.

This amends ADR 0025: its count of five user-invoked lanes becomes eight. `src/lib/user-invoked-lanes.ts` holds the list, and `tests/gates/user-invoked.test.js` pins each one's `disable-model-invocation: true` and the `allow_implicit_invocation: false` sidecar.

## Consequences

- The three commands appear in README, INSTALL and SURFACE with the other five.
- A model that wants a PR description or a retro can only suggest it to the owner.
- `description-overlap.test.js` has three fewer rivals to check.
