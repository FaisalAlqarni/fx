# 14: Brainstorm builder check, Approaches and the bounded design.md

**Status:** ready-for-agent
**Blocked by:** 10, 11
**Phase:** 3: Lane improvements

**What to build:** gaps in an architectural design surface before the owner's one review, and every brainstorm leaves a written record of its decision.
- **Builder check** (`compare-1` B12): on the architectural path, after the self-review, a fresh subagent reads design.md as the engineer who must build it, cannot talk to the author, and lists only the questions where a wrong guess would matter, most important first. The controller sorts them: answered (put the answer in design.md), its own call (settle it and mark it in design.md as `(my call: <reason>)`), or the owner's. The owner's questions go into the one file review message, so ADR 0045's single checkpoint holds. Without a subagent tool, the controller reads the design as that builder itself.
- **Template**: `references/design-template.md` gains `## Approaches` after Solution (the two or three approaches considered, one line of trade-off each, the one chosen and why) and, under Out of Scope, the line `Anti-goals: what would make this a failure even if every test passes.`
- **Bounded path**: after the owner approves the short design in chat, write a 5 to 15 line `docs/plans/YYYY-MM-DD-<slug>/design.md` (Problem, Approach, Files, Seams, and `**Approved:** YYYY-MM-DD`), with no plan, then implement.
Expected fx-brainstorm SKILL.md size: about 18,800 bytes. If it measures 19,500 or more, move "Design for isolation and clarity" (829 bytes at dd99986) into `skills/fx-brainstorm/design-for-isolation.md`, linked from section 6.

**Design:** Phase 3: Brainstorm

**Files:**
- Create: `skills/fx-brainstorm/builder-check-prompt.md` (adapted from superpowers 7.0.1 `skills/brainstorming/builder-check-prompt.md`: "a software engineer on this repo", the design.md path, questions only, "nothing important left" when there are none)
- Modify: `skills/fx-brainstorm/SKILL.md` (architectural step 6 reads `6. Self-review it, then the builder check (§8)`; section 8 gains the three-pile sort with a link to [builder-check-prompt.md](./builder-check-prompt.md); bounded checklist gains step `6. **Write a short design.md**: 5 to 15 lines in docs/plans/YYYY-MM-DD-<slug>/design.md (Problem, Approach, Files, Seams, and the Approved line), no plan`, and the old step 6 becomes `7. Implement through the normal workflow`)
- Modify: `references/design-template.md`
- Modify: `skills/fx-brainstorm/COVERAGE.md` (row for builder-check-prompt.md adopted, superpowers 7.0.0)
- Modify: `src/tests/gates/brainstorm-confidence.test.ts`, built `tests/gates/brainstorm-confidence.test.js`

**Interfaces:**
- Upstream source: `<SCRATCH>/upstream/superpowers/skills/brainstorming/builder-check-prompt.md`; if the path is gone, `git clone https://github.com/obra/superpowers <SCRATCH>/upstream/superpowers` and check out `2ce8aa1`. Read only.

**Seam:** `brainstorm-confidence.test.js`, which reads the checklists and the template.

**Tests:**
- `brainstorm-confidence.test.js`: the architectural slice matches ``/\n6\. Self-review it, then the builder check \(§8\)/`` and still ``/\n8\. Hand off to `fx-plan`/``; the bounded slice matches ``/\n6\. \*\*Write a short design\.md\*\*/`` and ``/\n7\. Implement through the normal workflow/``; the template contains `## Approaches` and the exact line `Anti-goals: what would make this a failure even if every test passes.`; prints its OK line.
- `python3 -I scripts/check-paths`: exit 0 (the new prompt is reachable from SKILL.md).
- `node tests/gates/skill-size.test.js`: OK, fx-brainstorm under 19,500 bytes.

**Risks:** the design-template is a reference: it names no other reference file in backticks. The builder check adds no owner checkpoint: its owner-pile questions ride in the existing review message.

**Testing:** text gate, offline. The builder check's usefulness is a live behaviour, measured only on request.

## Acceptance criteria
- [ ] On the architectural path, the owner's review message lists any builder questions only the owner can answer, and design.md marks the controller's own calls.
- [ ] A bounded brainstorm ends with a short design.md carrying `**Approved:**` before any code.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write the assertions the Tests field names** in `brainstorm-confidence.test.ts`

- [ ] **3. Run it: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/brainstorm-confidence.test.js`
Expected: fails on the builder-check step text.

- [ ] **4. Add the prompt; edit SKILL.md, the template and COVERAGE**

- [ ] **5. Run it: verify GREEN**

Run: same commands. Expected: OK.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-generated`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope skills/fx-brainstorm/SKILL.md skills/fx-brainstorm/builder-check-prompt.md references/design-template.md`

- [ ] **7. Commit by path**

```
git add skills/fx-brainstorm/builder-check-prompt.md skills/fx-brainstorm/SKILL.md skills/fx-brainstorm/COVERAGE.md references/design-template.md src/tests/gates/brainstorm-confidence.test.ts tests/gates/brainstorm-confidence.test.js
git commit -m "feat(fx-brainstorm): builder check before review; Approaches; a short design.md on bounded work"
```
