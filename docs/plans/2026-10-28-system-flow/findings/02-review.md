# Task 02 review

### Spec Compliance
- ✅ Spec compliant. All eleven evidenced kinds are checked in one pass over `collect` (src/lib/sf-rules.ts), which covers every kind including all five store tables. The test table in src/scripts/system-flow-rules.test.ts has a fail case (`evidence: []`, exact message and pointer) and a pass case (`unconfirmed: true`) per kind. Caps, children rule (primary vs context), orphan, edge, message, step, chapter, section refs, handles, dash ban and the Arabic warning each have a test with the brief's message text. The `origin` map includes diagram: and seq: handles (ruling 24).
- ⚠️ Cannot verify from diff: test-scope and check-prose results (not re-run per rules). Only the sql table is exercised for store rows; the other four tables share the same loop.

### Strengths
- One rule loop for evidence; missing `evidence` key is tolerated by `collect` (`?? []`), so no crash on an absent array.
- Task 01 helper change is justified by ruling 3 and the count change is explained.

### Issues
#### Critical (Must Fix)
None.
#### Important (Should Fix)
None.
#### Minor (Nice to Have)
- Dash ban scans string values only, not object keys, and a primitive array merged from two fragments reports the merged index (reported shortcut).
- Arabic warning covers only the `label` field; Arabic in `role`, `title` or `name` passes silently.

### Assessment
**Task quality:** Approved
**Reasoning:** Every requested rule and each of the eleven evidence kinds is implemented and tested against exact messages; only polish gaps remain.

## Ledger lines
Task 02: minor (deferred): dash ban skips object keys and reports merged array index for primitive arrays from two fragments.
Task 02: minor (deferred): Arabic warning covers only the label field, not role, title or name.
