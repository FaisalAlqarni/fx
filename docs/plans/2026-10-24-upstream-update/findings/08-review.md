### Spec Compliance

- ✅ Spec compliant for the five edited lanes plus the SKILL.md sentence. Humanize COVERAGE untouched per the task 11 ruling (brief Rulings, "task 08 does not edit skills/fx-humanize/COVERAGE.md"); the brief's file list and commit step name it, the ruling overrides.
- ✅ Ruling "restores The code shows you heard it." present: skills/fx-review/SKILL.md section 7 (diff hunk, commit b619726).
- ✅ Debug COVERAGE line 60 no longer names the Lace example as live; it says dropped and deleted (skills/fx-debug/COVERAGE.md:60).
- ⚠️ Cannot verify from diff: `scripts/check-all` ALL GREEN claim (log in implementer scratchpad, not run here, per template).
- Checks run: ac5a592 exists (git cat-file: commit); `references/vocab/receiving-review.md`, `references/vocab/good-tests-examples.md`, `skills/fx-plan/templates.md` all exist; fx-debug SKILL.md has "Spend most of the effort here" (line 75) and "Stop and say so explicitly" (line 128), so the new S row quotes are true.

### Strengths

Every corrected row names where the rule now lives or says dropped. The "refuse to give up" claim was split into its own S row instead of overwriting the K row. fx-plan rows 16 to 18 keep the surviving parts and mark only the superseded part.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
- skills/fx-brainstorm/COVERAGE.md:116-123, skills/fx-plan/COVERAGE.md:103-107, skills/fx-tdd/COVERAGE.md:117-122, skills/fx-debug/COVERAGE.md summary (Superseded 12, Dropped 8) · the Summary tables were not recounted after verdicts changed (report Deviations admits it). Concrete contradiction: brainstorm now has an X row (spec-document-reviewer, map format) but still says `Dropped | 0`; plan and tdd moved rows K to S but Superseded stays 74 and 34, Kept inline stays 131 and 118; debug gained S rows (145, refuse-to-give-up) without raising Superseded 12. A coverage ledger exists to account for every claim, and these totals now disagree with the rows, which is the task's stated goal (files match fx as it is). Fix: recount per file and update the tables.

#### Minor (Nice to Have)
- skills/fx-brainstorm/COVERAGE.md (new row, "(unnumbered)") · the claim column does not follow the line-range convention used by every other row; acceptable since the source has no numbers, but the file header says a claim with no verdict is a build error, so consider a stable id.
- skills/fx-review/COVERAGE.md ("Real Examples" row) · also unnumbered; same note.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** Row edits are accurate and verified against the lane files, but the per-file Summary counts were knowingly left stale and now contradict the rows (for example `Dropped | 0` beside X rows).

## Ledger lines

Task 08: minor (deferred): fx-brainstorm COVERAGE "(unnumbered)" row has no stable claim id.
Task 08: minor (deferred): fx-review COVERAGE "Real Examples" row has no stable claim id.
Task 08: ran test_all (plan-mandated phase gate)
