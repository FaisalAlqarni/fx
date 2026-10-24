# 22: ADRs for this update

**Status:** ready-for-agent
**Blocked by:** 21
**Phase:** 5: Records

**What to build:** each decision this update made is recorded where the next maintainer looks first, in fx's ADR format (title, `Status: accepted, <date>.`, Context, Decision, Consequences, as in `docs/adr/0052-built-in-edit-rules.md`). Five new ADRs, numbered from the next free number (0053 at dd99986; re-check with `ls docs/adr` before writing):
- **0053, the skill size gate:** Claude Code re-attaches a skill cut at 20,000 characters after compaction; `tests/gates/skill-size.test.js` fails any SKILL.md at 20,000 bytes; splits move whole sections behind pointers read at the step that needs them, re-read every time; skill-local references stay one level deep; `scripts/check-paths` resolves every pointer.
- **0054, the glossary is GLOSSARY.md:** the rename from CONTEXT.md and CONTEXT-MAP.md following mattpocock-skills 1.3.0; the reading order with the old name second; never a second glossary; the one session notice; the ask-once migration with `git mv` and the `glossary_rename: "declined"` key; ADR 0016 left as history.
- **0055, `/fx:fx-pr` and `/fx:fx-retro` are user-invoked commands:** why commands and not lanes (one claimant per intent; no context load; a lane cannot invoke one, so it tells the owner to run it); `/fx:fx-what` alongside; amends ADR 0025's count of five user-invoked lanes to eight.
- **0056, the review additions:** the spec as a vision document; the "Declined to judge" list; the controller's ruling line and its three outcomes; ruled items as named input to the branch pass (ADR 0044); [blocks] and [advisory] tags on plan-mode red-team findings; no new owner stops.
- **0057, the nested controller is not adopted:** its only claimed gain is cost; its rulings would move from Opus to Sonnet with no quality measurement; it needs three patches (the final review back in the owner's session, relaying results that land in the wrong session, fixing `build-cost`'s transcript source); the compaction problem it touched is fixed by the splits; revisit when superpowers measures quality.

**Design:** Phase 5: Records; Out of Scope

**Files:**
- Create: `docs/adr/0053-skill-size-gate.md`, `docs/adr/0054-the-glossary-is-glossary-md.md`, `docs/adr/0055-pr-and-retro-are-user-invoked-commands.md`, `docs/adr/0056-reviewers-judge-a-vision-and-list-what-they-declined.md`, `docs/adr/0057-the-nested-controller-is-not-adopted.md`

**Seam:** the text gates.

**Tests:**
- `python3 -I scripts/check-prose docs/adr/0053-skill-size-gate.md docs/adr/0054-the-glossary-is-glossary-md.md docs/adr/0055-pr-and-retro-are-user-invoked-commands.md docs/adr/0056-reviewers-judge-a-vision-and-list-what-they-declined.md docs/adr/0057-the-nested-controller-is-not-adopted.md`: OK line.
- Each file's first line is `# <title>`, its third line is exactly `Status: accepted, <the commit date, YYYY-MM-DD>.` (for example `Status: accepted, 2026-10-26.`), and it has the headings `## Context`, `## Decision` and `## Consequences`.

**Testing:** text gate, offline.

## Acceptance criteria
- [ ] Five ADRs exist, each naming the files and tests that enforce it.
- [ ] 0057 states the condition for revisiting.

## Steps

- [ ] **1. Check the next free ADR number; write the five ADRs**

Run: `ls docs/adr`

- [ ] **2. Run the prose gate**

Run: the check-prose command in Tests. Expected: OK line.

- [ ] **3. Commit by path**

```
git add docs/adr/0053-skill-size-gate.md docs/adr/0054-the-glossary-is-glossary-md.md docs/adr/0055-pr-and-retro-are-user-invoked-commands.md docs/adr/0056-reviewers-judge-a-vision-and-list-what-they-declined.md docs/adr/0057-the-nested-controller-is-not-adopted.md
git commit -m "docs(adr): size gate, glossary rename, user-invoked pr and retro, review additions, nested controller declined"
```
