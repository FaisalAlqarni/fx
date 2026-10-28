### Spec Compliance
- ❌ Issues found: one unrelated behavior change in the task's commit (below).
- ⚠️ Cannot verify from diff: `scripts/check-all` green (not re-run, per rules).

### Strengths
- The estimate is computed from filesToRead, with every constant in the single ESTIMATE table (src/lib/sf-estimate.ts:10). Files only feeds the split warning.
- The test arithmetic is the brief's literal numbers (105000, 8.5, 29.8, 28.5, 26), not recomputed. The RED is valid (estimate exited 2).
- depth takes origin per ruling 24 and counts by fragment stem. The ghost area, no-plan case and level0-only-in-total case are covered. Both stderr forms of ruling 8 are used.
- A malformed plan.json fails the build with a file-and-pointer problem.

### Issues
#### Critical (Must Fix)
None.
#### Important (Should Fix)
- src/lib/sf-build.ts (the archify and svgReason lines): the commit changes how `--archify` interacts with `prefer: cheap` (explicit flag now wins). That is task 12 territory, not in this brief's Files, and no test in this task covers it. Move it to task 12's fix round, or revert it here.
#### Minor (Nice to Have)
- src/lib/sf-estimate.ts:17-25: plan validation does not reject duplicate area ids, so two areas with the same id double-count in estimate and both match the same fragment in depth.
- src/lib/sf-estimate.ts:68: STORE duplicates the unexported STORE_KINDS in sf-model.ts. Export and reuse it.
- src/scripts/system-flow-estimate.test.ts: no non-zero case for storeRows, flows or per-area chapters. The calibrated note branch is untested.

### Implementer's concern (no date on the calibrated note)
Acceptable. The brief says task 20 sets the dated note. The branch is unreachable while calibrated is false, and task 20 must add the date field. Task 20 must also cover this branch with a test.

### Assessment
**Task quality:** Needs fixes
**Reasoning:** The estimate and depth logic match the brief and the numbers are independent of the code. The unrelated archify precedence change in sf-build is the one thing to remove or relocate.

## Ledger lines
Task 14: minor (deferred): plan validation accepts duplicate area ids.
Task 14: minor (deferred): STORE kind list duplicates STORE_KINDS in sf-model.
Task 14: minor (deferred): no test for non-zero storeRows, flows, per-area chapters or the calibrated note.
