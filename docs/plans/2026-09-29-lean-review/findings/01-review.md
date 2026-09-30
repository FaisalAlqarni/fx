### Spec Compliance

- ✅ Spec compliant. Header exact; tripwire text for security, database, silent-failure matches design §1 verbatim; a11y and pipeline `no`; blurb replaced (fx-review/SKILL.md:20-22); Lens dispatch paragraph matches task step 6 verbatim, no `-a11y`; ADR-0029 has supersede clause and P1 evidence; gate test listed after return-contract in scripts/check-all. Anchors `**Lens dispatch.**`, `your Write tool`, `The reviewer gets three paths` intact (fx-implement/SKILL.md:520,532). Ran `node tests/gates/tripwire-table.test.js`: OK.
- ⚠️ Not re-run by me: return-contract, no-runtime-addressing, check-prose (report claims pass; diff shows no banned patterns or dashes).

### Strengths

Table and dispatch paragraph copied exactly from the task. Test pins header, per-lens cells, blurb removal, and dispatch span. Runtime RED shown. ADR states cost of task 12 miss honestly. No cell contains `|`.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
- skills/fx-review/SKILL.md:82 · "Lenses: by the trigger table below" names no mode; a reader in task mode could still use the broad column. Add "per task: the tripwire column; branch: the last column".
- skills/fx-review/SKILL.md:292 · red flag "Firing all four lenses" is stale (five lenses, and per-task rule now narrower). Reword.

### Assessment

**Task quality:** Approved
**Reasoning:** Diff matches task and design §1 text exactly, gate test green. Two stale nearby sentences are polish only.

## Ledger lines

Task 01: minor (deferred): fx-review/SKILL.md:82 "Lenses: by the trigger table below" does not say which column applies per mode.
Task 01: minor (deferred): fx-review/SKILL.md:292 red flag "Firing all four lenses" is stale (five lenses, new per-task rule).
