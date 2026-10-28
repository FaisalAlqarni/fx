### Spec Compliance

- ✅ Spec compliant. Every Tests-field case has a test in `src/scripts/system-flow-check.test.ts` or `system-flow-stale.test.ts`: version 2 passes, three-line version-1 hint, one stale fragment, version 3 newer message, missing look, bad look, `short` of 27, tag `thing`, path `app`, items +2 and `query` handles, range past EOF on a term, `verify term:link` and `verify thing:link` exit 2, stale after build. Ruling C1 is met: `src/lib/sf-evidence.ts` allows kind `code`, and a test pins that a folder entry on a term still fails.
- Interfaces match the brief: `Look`, `look` on `Node` and `Participant`, `short`/`reply`, `summary`, `Meta.name/intro`, `Section.role/lead/notOwned`, `GlossaryTerm`, `CodeMapEntry`, `Model` fields, `ItemKind`, `PREFIXES`, `SCHEMA_VERSION = 2`, `KIND_WORD`. `notOwned` is collected as `bullet` (sf-model.ts `collect`).
- Risk "15 test files change only in version and look": I read the non-check, non-stale test hunks; the only edits are `schemaVersion` and `look: 'service'`. `system-flow-theme.test.ts` has no `schemaVersion`, so no change is right.
- ⚠️ Cannot verify from diff: `tests/fixtures/system-flow/parser-stages.json` (outside the task's file list) gained `look` on its nodes because the layout test loads it. That change is needed and bounded, but the controller should confirm it is accepted.
- ⚠️ Not read: the diff file was elided in places, so I read `git show fd40010` for the `src/` files and tests. I did not re-run any test.

### Strengths

- The version-1 gate (sf-model.ts `loadFragments`) returns before schema validation, so a v1 set produces exactly one hint per fragment and no `look` noise. Pointer `/schemaVersion` versus empty matches the brief's two forms.
- RED was a real runtime RED (CLI at v1 rejecting a v2 fixture), and the new tests assert exact stderr lines rather than loose matches.
- The stale test covers the whole item lifecycle (stamp by build, query, stale after an edit, verify, bad prefix).
- Schema `path` pattern and `maxLength: 26` match the brief verbatim.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

- `src/lib/sf-evidence.ts` (folder-entry guard) · the message still reads "a folder entry is allowed only on catalogue and inventory entries", which is now false for code map entries. The new check test (`system-flow-check.test.ts`, folder entry on a term) pins the old wording, and `system-flow-evidence.test.ts` cannot change beyond version and look. Widen the wording in whichever task next owns the evidence test.
- `src/lib/sf-model.ts` `loadFragments` · `meta.json` is read and parsed twice (`readVersion`, then the loop). Harmless; fold into the loop if the function is touched again.

## Ledger lines

Task 01: minor (deferred): folder-entry error message in sf-evidence.ts still says only catalogue and inventory entries; widen it with the evidence test in a later task
Task 01: minor (deferred): loadFragments parses meta.json twice (readVersion and the main loop)
