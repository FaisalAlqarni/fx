# 04: Split fx-authoring under the gate

**Status:** ready-for-agent
**Blocked by:** 02
**Phase:** 1: Room and fixes

**What to build:** fx-authoring (20,774 bytes) comes under the gate and states the limit it enforces on every other skill. Following `research/compare-6-authoring-new.md` section (b), move whole sections into files beside SKILL.md, each behind a pointer that names the trigger and the contents. Add one Hard limits line stating the 20,000-byte limit and its reason, and one pointer to the orphaned `anthropic-best-practices.md`. No other rule is added, dropped or reworded: the other compare-6 proposals (W3, W7, W8, I1, I2) are not in the design. Expected SKILL.md size: about 16,500 bytes (20,774, minus about 6,550 moved, plus about 950 of pointers and about 380 of the two additions).

**Design:** Phase 1: Size gate; Phase 1: Skill splits

**Files:**
- Modify: `skills/fx-authoring/SKILL.md`
- Create: `skills/fx-authoring/discovery.md` (The description field; Widening a description, and when to stop; Invocation; Cross-references, all verbatim)
- Create: `skills/fx-authoring/dispatch-prompts.md` (Writing a subagent dispatch prompt, verbatim)
- Create: `skills/fx-authoring/preamble.md` (the PREAMBLE.md section, verbatim)
- Modify: `src/tests/gates/skill-size.test.ts` and built `tests/gates/skill-size.test.js` (delete `'fx-authoring'` from `PENDING`)
- Modify: `scripts/check-paths` (delete the `skills/fx-authoring/anthropic-best-practices.md` entry from `PENDING_ORPHANS`)

**Interfaces:**
- Consumes: `PENDING` and `PENDING_ORPHANS` (task 02).
- Produces, in Hard limits, the line: `**SKILL.md under 20,000 bytes.** Claude Code re-attaches an invoked skill cut at 20,000 characters after compaction (superpowers 7.0.1), so everything past the cut is lost; tests/gates/skill-size.test.js fails at the limit. Move what only some branches need into a file beside SKILL.md.`
- Produces the four pointers, wording from compare-6 section (b), each naming its file as a markdown link `[discovery.md](./discovery.md)`; the fourth is `For Anthropic's own guide (frontmatter fields, progressive disclosure, evaluations), read [anthropic-best-practices.md](./anthropic-best-practices.md).`
- The Checklist line "Body under 500 lines" becomes "Body under 20,000 bytes and 500 lines".

**Seam:** `tests/gates/skill-size.test.js` and `scripts/check-paths`.

**Tests:**
- `node tests/gates/skill-size.test.js` with `'fx-authoring'` deleted from `PENDING`, before the split: exit 1, `skill-size: skills/fx-authoring/SKILL.md is 20774 bytes, at or over the 20000-byte limit. Move what only some steps need into a file beside it.`; after: `skill-size: OK`.
- `python3 -I scripts/check-paths` with the orphan entry deleted: exit 0 (the new pointer makes `anthropic-best-practices.md` reachable; the three new files are named by SKILL.md).
- `tests/gates/description-overlap.test.js`: still OK (the description is unchanged).

**Risks:** each new sibling names no other sibling, so references stay one level deep. The live lane-triggering check from compare-6 section (b) (`tests/lane-triggering/prompts/fx-authoring.txt` and `fx-humanize.txt`, before and after) is on request only; record in the report that it was not run unless the owner asks.

**Testing:** gate suite, offline.

## Acceptance criteria
- [ ] SKILL.md is under 17,000 bytes and states the 20,000-byte limit and its reason in Hard limits.
- [ ] Following each pointer from SKILL.md reaches the moved section with its text unchanged.

## Steps

- [ ] **1. Invoke `fx-tdd`** (RED is the size gate with the pending entry removed)

- [ ] **2. Delete `'fx-authoring'` from `PENDING` and the orphan entry from `PENDING_ORPHANS`**

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/skill-size.test.js`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env python3 -I scripts/check-paths`
Expected: the size gate fails with the 20774-byte message; check-paths fails naming `skills/fx-authoring/anthropic-best-practices.md`.

- [ ] **4. Move the sections, add the pointers and the two lines**

- [ ] **5. Run them: verify GREEN**

Run: the same three commands. Expected: `skill-size: OK` and the check-paths OK line.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-generated`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope skills/fx-authoring/SKILL.md skills/fx-authoring/discovery.md scripts/check-paths`

- [ ] **7. Commit by path**

```
git add skills/fx-authoring/SKILL.md skills/fx-authoring/discovery.md skills/fx-authoring/dispatch-prompts.md skills/fx-authoring/preamble.md src/tests/gates/skill-size.test.ts tests/gates/skill-size.test.js scripts/check-paths
git commit -m "refactor(fx-authoring): split under the size gate and state the limit"
```
