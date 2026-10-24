# 05: Move fx-plan templates and fx-review section 7 out

**Status:** ready-for-agent
**Blocked by:** 02
**Phase:** 1: Room and fixes

**What to build:** room in the two lanes Phase 3 adds most to. fx-plan is 19,289 bytes with 711 to spare; its two templates (the "plan.md template" and "tasks/NN-<slug>.md template" sections, about 7,400 bytes) move verbatim to `skills/fx-plan/templates.md`, which section 5 says to copy at writing time. (`compare-2` C1). The duplicated prefactoring sentence in section 4 stays: the design rewords no rule beyond the pointer. fx-review section 7 "Acting on findings" restates most of `references/vocab/receiving-review.md`; it becomes the pointer plus the fx-specific lines: "Fix Critical immediately. Fix Important before proceeding. Record Minor where the final branch review will see it", the four "Never" rules and the forbidden-phrase rule (`compare-5` V4). Expected sizes: fx-plan about 11,900 bytes, fx-review about 15,200 bytes.

**Design:** Phase 1: Skill splits

**Files:**
- Modify: `skills/fx-plan/SKILL.md`
- Create: `skills/fx-plan/templates.md` (both template sections verbatim, from `## plan.md template` through the end of the task template, before `## No placeholders`)
- Modify: `skills/fx-review/SKILL.md` (section 7)
- Modify: `src/tests/gates/plan-template.test.ts` and built `tests/gates/plan-template.test.js` (the `template` slice reads `skills/fx-plan/templates.md`; the No placeholders, Quality red flags and section 7 slices still read SKILL.md)
- Modify: `src/tests/gates/branch-pass.test.ts` and `src/tests/gates/ledger-lines.test.ts`, with built copies, only where an assertion reads fx-plan text that moved

**Interfaces:**
- Produces: `skills/fx-plan/templates.md` with the headings `## plan.md template` and `## tasks/NN-<slug>.md template`. Task 13 adds `## Review Focus` and the `**Not this task:**` line there.
- Produces: in fx-plan section 5, the line `Copy both templates from [templates.md](./templates.md) verbatim when you write plan.md and the task files.`

**Seam:** `tests/gates/plan-template.test.js` and `tests/gates/skill-size.test.js`; `scripts/check-paths` for the new pointer.

**Tests:**
- `plan-template.test.js` reading the template from SKILL.md after the move: fails at `template fields`; pointed at `templates.md`: prints `plan-template: OK`.
- `branch-pass.test.js`, `ledger-lines.test.js`, `return-contract.test.js`, `review-content.test.js`: each prints its OK line.
- `python3 -I scripts/check-prose skills/fx-plan/templates.md`: OK, zero mis-tagged closing fences (the task template's inner fences keep no language on their closers).
- `wc -c`: fx-plan SKILL.md under 12,500; fx-review SKILL.md under 15,600.

**Risks:** the task template is wrapped in a four-backtick fence holding three-backtick fences; move it with its fences intact, or `check-prose` reports a mis-tagged closer.

**Testing:** gate suite, offline.

## Acceptance criteria
- [ ] fx-plan section 5 tells the planner to copy both templates from `templates.md`, and following that link reaches them unchanged.
- [ ] fx-review section 7 points at `receiving-review.md` first and keeps only the fx-specific lines listed above.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Point the `template` slice of `plan-template.test.ts` at `skills/fx-plan/templates.md`**

- [ ] **3. Run it: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/plan-template.test.js`
Expected: fails because `templates.md` does not exist.

- [ ] **4. Move the templates; cut fx-review section 7**

- [ ] **5. Run it: verify GREEN**

Run: same two commands. Expected: `plan-template: OK`.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-generated`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope skills/fx-plan/SKILL.md skills/fx-plan/templates.md skills/fx-review/SKILL.md src/tests/gates/plan-template.test.ts`

- [ ] **7. Commit by path**

```
git add skills/fx-plan/SKILL.md skills/fx-plan/templates.md skills/fx-review/SKILL.md src/tests/gates/plan-template.test.ts tests/gates/plan-template.test.js src/tests/gates/branch-pass.test.ts tests/gates/branch-pass.test.js src/tests/gates/ledger-lines.test.ts tests/gates/ledger-lines.test.js
git commit -m "refactor(fx-plan, fx-review): move templates and the receiving-review restatement out of SKILL.md"
```

Stage the branch-pass and ledger-lines files only if the task changed them.
