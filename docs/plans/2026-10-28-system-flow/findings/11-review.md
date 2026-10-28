# Task 11 review (66dad6d..35810ff)

### Spec Compliance
- Issues found: one correctness gap (flow participant ids), rest compliant.
- Cannot verify from diff: the specs validating against the copied schemas (test claims it; I read the test, did not re-run).

### Strengths
- Validator extension is complete for the brief's keyword list; unsupported keyword still reported. `$ref` to other files via `refs` is clean.
- Every repository string in the SVG page goes through escapeHtml (title, aria-label, labels, path d, captions); the rest is numeric.
- 8-message cap, per-page participants, n-prefix ids, ruling 12/14/37/38 followed; ruling 15 followed (no label limits).
- Credential strip on the remote; sources limited to 3 with overflow to the steps card.

### Issues
#### Critical (Must Fix)
None.
#### Important (Should Fix)
- src/lib/sf-diagrams.ts flow(): store participants use the store key (`sql`, `cache`, `memory`, `files`, `client`) as id, actors use node ids. A node `client` or `cache` yields two participants with the same id, which archify rejects (duplicate id) and makes the message a self message. This is not hypothetical: `client` is a likely actor. Prefix store ids (`store-sql`) or dedupe. Concern 2 of the report is a real defect, not a shortcut.
#### Minor (Nice to Have)
- src/lib/sf-schema.ts: an unsupported keyword inside an anyOf, oneOf or not branch is only a failed branch (for `not` and a matching sibling anyOf branch it passes silently). Direct visits report it. Task 01 schema load now returns it as a fragment problem (exit 1) instead of throwing, so a typo'd keyword in the model schema still fails loudly on the first visited node, but is attributed to the user's fragment file, and an unvisited property schema is never checked.
- Borrowed participant on all-self-message pages (report concern 1) is acceptable: it adds an unreferenced lifeline; note it in a card.
- Edits to task 01 and 04 tests are justified by the brief's changed contract; callers of validate: only sf-model.ts:87, which already turns errors into problems.
- Page-1-only evidence card on continuation pages: other-root evidence is dropped from p2 and later.

### Assessment
**Task quality:** Needs fixes
**Reasoning:** One real id collision breaks archify specs for flows with a `client` or `cache` actor; everything else holds.

## Ledger lines
Task 11: minor (deferred): unsupported keyword inside anyOf, oneOf or not branch is swallowed as a failed branch.
Task 11: minor (deferred): all-self-message page borrows a participant with no note in the spec.
Task 11: minor (deferred): the other-root evidence card appears on page 1 only.
