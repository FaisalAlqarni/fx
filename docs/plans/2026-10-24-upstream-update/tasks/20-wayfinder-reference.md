# 20: Wayfinder reference

**Status:** ready-for-agent
**Blocked by:** 14, 17
**Phase:** 4: New commands

**What to build:** work too large for one session keeps a local map of where it stands. A new reference, loaded from fx-brainstorm section 2 when the effort is too big for one design and its pieces cannot yet be named precisely, describes the map (`compare-2` W1 to W3): `docs/plans/YYYY-MM-DD-<effort>/map.md` with the sections Destination, Notes, Decisions so far, Not yet specified, Out of scope; and `decisions/NN-<slug>.md`, each with `**Question:**`, `**Type:**` (research, prototype, grilling or task), `**Blocked by:**`, `**Status:** open, claimed or resolved`, and `## Answer`. Rules kept from upstream: decisions, not deliverables; the fog-or-ticket test (can you state the question precisely now); one decision per session except research; a question only the owner can answer is never answered by the agent; the session acts by the `**Type:**` line; the map is an index, not a store. Research writes `docs/plans/<effort>/research/<slug>.md` locally: no branch, no push. When the map clears, fx-brainstorm writes one design.md per sub-project from the linked decisions.

**Design:** Phase 4: New commands

**Files:**
- Create: `references/wayfinder.md`
- Modify: `skills/fx-brainstorm/SKILL.md` (section 2, the "Too large for one design?" paragraph gains one pointer: `` `../../references/wayfinder.md` ``, read when the pieces cannot yet be named precisely)

**Interfaces:**
- Upstream source, read only: `<SCRATCH>/upstream/mattpocock-skills/skills/engineering/wayfinder/SKILL.md`; if gone, re-clone mattpocock-skills at `5beb35b` into `<SCRATCH>/upstream`.

**Seam:** the text gates and the size gate.

**Tests:**
- `python3 -I scripts/check-paths`: exit 0 (the anchored citation resolves).
- `bash scripts/check-reference-leaves`: OK (`wayfinder.md` names no other reference file).
- `python3 -I scripts/check-prose references/wayfinder.md`: OK line.
- `node tests/gates/skill-size.test.js`: OK; fx-brainstorm SKILL.md under 19,500 bytes (expected about 19,050).
- `node tests/gates/brainstorm-confidence.test.js`: OK.

**Risks:** if fx-brainstorm SKILL.md measures 19,500 bytes or more after the pointer, move "Design for isolation and clarity" (829 bytes at dd99986) into `skills/fx-brainstorm/design-for-isolation.md`, linked from section 6, unless task 14 already moved it; in that case move "Working in existing codebases" (459 bytes) into `skills/fx-brainstorm/existing-codebases.md` the same way. The reference has over 100 lines only if it grows past the upstream summary; if it does, it gets a table of contents (fx-authoring Hard limits).

**Testing:** text gates, offline.

## Acceptance criteria
- [ ] Following fx-brainstorm section 2's pointer reaches the map and decision formats and the exit to one design.md per sub-project.
- [ ] Nothing in the reference pushes a branch or opens a PR.

## Steps

- [ ] **1. Write `references/wayfinder.md`; add the pointer**

- [ ] **2. Run the gates the Tests field names**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env python3 -I scripts/check-paths`, `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env bash scripts/check-reference-leaves`, `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env python3 -I scripts/check-prose references/wayfinder.md`, `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/skill-size.test.js`, `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/brainstorm-confidence.test.js`
Expected: each OK.

- [ ] **3. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-generated`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope references/wayfinder.md skills/fx-brainstorm/SKILL.md`

- [ ] **4. Commit by path**

```
git add references/wayfinder.md skills/fx-brainstorm/SKILL.md
git commit -m "feat(references): wayfinder map for work that spans sessions"
```
