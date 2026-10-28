# Review 18a (2c8e3bf..67bde3c)

### Spec Compliance
- ✅ Spec compliant. Extra but judged necessary: component label fitting (archify rejects it by the same rule, component-label-overflow) and the card title "Evidence" (the card now also holds the owning root's evidence when there is no remote). archify-adapter.md rules are documentation of the same change.
- ⚠️ Cannot verify from diff: scripts/check-all green (the report did not run it); checked archify's 6.8 participant rule in the installed render-sequence.mjs (lines 78, 574) and 6.6 in diagrams/workflow files, which matches the report's cited rules.

### Strengths
- runArchify is a plain awaited loop; no pool or limit parameter remains, and the overlap test asserts exactly 1 on 9 calls with a monotonic clock (hrtime), so it is not flaky; the report shows a mutation check with Promise.all.
- fit() iterates code points, so no surrogate pair is split; labels are cut before JSON encoding, so no escape can be split. The report cites archify source for each inequality.
- No-remote case: omission validated against the fixture schemas in a test, and the evidence moves to the card; loss recorded in archify-adapter.md.

### Issues
#### Critical (Must Fix)
None.
#### Important (Should Fix)
None.
#### Minor (Nice to Have)
1. The loss of sources links for a root with no remote is documented in archify-adapter.md but not written into diagrams[].reason, so a user reading a build result does not see it.
2. fit() can cut between a base letter and its combining marks or inside a ZWJ sequence (code points, not grapheme clusters); label tests count code points, so they never exercise wide (U+1100 and up) or Arabic text.
3. Fitted labels are tested only with Latin text; the over-count of units for scripts above U+1100 is claimed in a comment but not asserted.

### Assessment
**Task quality:** Approved
**Reasoning:** All five fixes land with RED/GREEN evidence and a check against real archify; the extras are required by the same archify rules. Remaining points are polish.

## Ledger lines
Task 18a: minor (deferred): missing-remote loss of sources links is not recorded in diagrams[].reason.
Task 18a: minor (deferred): fit() can split grapheme clusters (combining marks, ZWJ) since it cuts by code point.
Task 18a: minor (deferred): label-fit tests use only Latin text, so wide-character and Arabic counting is unasserted.
