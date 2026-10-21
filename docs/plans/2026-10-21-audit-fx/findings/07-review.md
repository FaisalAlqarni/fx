### Spec Compliance

- ✅ Spec compliant. File by file: SKILL.md (8-step checklist at lines 66-76 matches the brief's list; approaches ride in the §3 check message; §6 writes sections into the file; §8 "seams included"; task-per-item sentence gone; red-flag row gone), design-template.md (Approved line, "complete" stories), fx-plan SKILL.md §1 (skip rule), gate test (assertions as specified), ADR 0045 (new), ADR 0033 (status line names 0045). Rulings in the brief: none touch this task.
- Out-of-list edits (README.md flow diagram, COVERAGE.md rows 34, 45-55, 76-80): in scope. Each described the old flow, COVERAGE.md is the brainstorm lane's own claims ledger ("a claim with no verdict is a build error"), and the controller asked for them. Leaving either would contradict the lane.
- Approved-line spelling: `**Approved:**` is identical in SKILL.md:75 and :338, design-template.md:10 and :18, fx-plan SKILL.md:35. fx-plan reads what brainstorm writes.
- Harness copies: checked plugins/fx-opencode-v1.js, v2.js, codex/agents/, commands/, references/harnesses, AGENTS.md, INSTALL.md, PREAMBLE.md. None carries brainstorm flow text (grep for brainstorm finds only commands/fx-grill.md and fx-setup.md pointers, which are unaffected). scripts/check-generated only compares codex/agents against agents/*.md, so no generated copy holds lane text. One stale old-flow sentence found elsewhere: SURFACE.md:30 (see Minor).
- ⚠️ Cannot verify from diff: full gate sweep and test_scope were not re-run (report claims rc=0; not re-run per instructions).

### Strengths

- RED was runtime and caused by missing behavior (step 4 assertion), then GREEN. Valid.
- Gate keeps the 95% bar, evidence part, two-line plan, explicit stop and bounded block, and adds negative assertions for each removed phrase.
- Edit in §3 keeps the "Nothing happens until an explicit go" stop and trims only "no approach proposed"; bounded path explicitly has no approaches step.
- ADR 0045 and the ADR 0033 supersede note are accurate and keep history.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

- references/design-template.md:17 and skills/fx-plan/SKILL.md:35 · the template's fenced block contains a literal `**Approved:** YYYY-MM-DD` line, and the only instruction to omit it from a draft is a note outside the block (template lines 9-10). fx-plan skips its restate gate on the mere presence of the line. A draft copied from the block with the placeholder left in makes fx-plan skip the requirements gate on an unapproved design. Fix: put the line in the block as a comment-free absent field (document it in the note only, do not include it in the block), or have fx-plan require a real date (`**Approved:** 20..`) and SKILL.md §7 say "draft has no Approved line".

#### Minor (Nice to Have)

- SURFACE.md:30 · still reads "Classify → clustered rounds + ledger → sectioned design → gate"; the design is no longer presented in sections. Change to "→ approaches with the confidence check → design.md → one file review".
- tests/gates/brainstorm-confidence.test.js:33 · the gate pins `**Approved:**` in the template and fx-plan §1 but not in brainstorm's write step (SKILL.md:75, :338), so the writer side can drift from the reader without a failure. Add one assertion on SKILL.md.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** The spec is met and the gate bites, but the template's unconditional `**Approved:**` placeholder line lets an unapproved draft pass fx-plan's skip rule, which weakens the one gate this task exists to protect. The fix is a few words.

## Ledger lines

Task 07: minor (deferred): SURFACE.md:30 still says "sectioned design" for fx-brainstorm.
Task 07: minor (deferred): brainstorm-confidence gate does not pin the `**Approved:**` write step in fx-brainstorm SKILL.md, only the template and fx-plan.
