# Reviewers judge a vision and list what they declined

Status: accepted, 2026-10-25.

## Context

superpowers 6.4.1 changed review so that a spec's silence is not permission. A reviewer that checks only what the spec names passes code that does something a reasonable user would reject, and a reviewer that skips an item says nothing about it.

## Decision

- **The spec is a vision.** The task and branch reviewers treat the brief or spec as a vision document: silence is not permission, and an unnamed input is judged by what a reasonable user expects.
- **Declined to judge.** Each reviewer returns a `### Declined to judge` list with a reason per item (`skills/fx-review/reviewer-prompt.md`).
- **The controller rules.** For each item it writes a `Task <NN>: declined:` ledger line with one of three outcomes (stands, fix, parked), set out in `skills/fx-implement/references/review-inputs.md`. `tests/gates/ledger-lines.test.js` pins the line shapes and `tests/gates/return-contract.test.js` the reviewer's return.
- **Ruled items reach the branch pass.** They go to the final branch review as named input, as ADR 0044 provides.
- **Plan-mode findings carry a tag.** A red-team finding on a plan is [blocks] or [advisory]. An unattended revision applies only [blocks] and ledgers the rest.
- **No new owner stops.** An item that touches an existing stop condition is parked, not asked about; nothing new waits for the owner.

## Consequences

- Nothing is skipped silently: an unjudged item is listed and ruled on.
- Reviews are longer by one list.
- The controller's ruling is a judgement call; the ledger line records it so the branch review can overturn it.
