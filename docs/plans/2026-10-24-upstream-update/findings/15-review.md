### Spec Compliance

- ✅ Spec compliant. File by file: fx-tdd SKILL.md has all four items (Verify GREEN `test_scope` and name every failure; one line per seam; never drive RED from a browser or system test; copy/hand-undo/`diff`/no `git checkout|restore|stash`). fx-debug SKILL.md has Phase 5 `diff` note, Phase 6 prevention question (names `fx-architecture` and `/fx:fx-retro`, "start neither"), and the evidence-before-claims sentence citing `../../references/vocab/verification.md`. Both COVERAGE.md files gained rows (3 debug, 4 tdd) with compare-4 sources.
- ⚠️ Cannot verify from diff: the diff view was caveman-elided (context lines cut), so I judged the hunks shown plus ran focused checks. check-paths, check-prose, skill-size, no-stories gates were reported by the implementer and not re-run by me.

Checks I ran: `wc -c` fx-tdd 19,368 (under 19,800 per ledger ruling), fx-debug 18,983 (under 19,500); `grep -c "never drive RED from a browser or system test"` gives 1; no en or em dashes in added lines; "revert the fix" remains only in skills/fx-tdd/COVERAGE.md:45, a historical record row, not a live rule.

### Strengths
- Regression-proof wording is complete and ordered: copy aside, hand undo, `diff`, run MUST FAIL, copy back, `diff`, run; the three forbidden git commands are named.
- Valid RED for a text task: the grep returned 0 before the edit, and the implementer disclosed a first-edit miss on the capital "Never".
- Size ruling honored; no section move needed; the report states the 18,750 vs 19,800 conflict openly.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
- skills/fx-tdd/SKILL.md (new paragraph after "the ideal number is one"): "add the system test once it works: never drive RED..." joins the rule to the sentence with a colon, so the rule reads as an explanation of the previous clause; two sentences would read cleaner.
- skills/fx-debug/SKILL.md Phase 6 (checklist item): prevention question sits as a checkbox under "Required before declaring done" rather than prose; fine for the gate, but the checklist hides the "start neither" instruction from readers who skim the prose.

### Assessment

**Task quality:** Approved
**Reasoning:** Every listed requirement is present in the right file, sizes are under the task limits, and the only findings are wording polish.

## Ledger lines

Task 15: minor (deferred): fx-tdd "add the system test once it works: never drive RED..." chains the rule after a colon; split into two sentences.
Task 15: minor (deferred): fx-debug Phase 6 prevention question lives only as a checklist item, not in the Phase 6 prose.
