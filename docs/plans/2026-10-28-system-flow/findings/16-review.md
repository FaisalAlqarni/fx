# Task 16 review (b1ab861..815ac07)

### Spec Compliance
- ✅ Spec compliant. Handles come from collect(), so matching is by kind:id across merged models, not by position or file. Moves are neutral, a node and a sequence sharing an id stay separate, only corrections whose id is absent at HEAD count (a correction moved between fragments stays old), pointers follow the brief (working tree for changed, HEAD for removed).
- ⚠️ Cannot verify from diff: I did not run the CLI; test output is the implementer's claim.

### Strengths
- Small, one responsibility, reuses readCited, mergeFragments, collect. Text fields per kind match the brief; evidence, verified, unconfirmed and key order are ignored for store rows, so cosmetic key order and stamps never demand a correction.
- Tests cover every case the brief names, through the CLI.

### Issues
#### Critical (Must Fix)
None.
#### Important (Should Fix)
None.
#### Minor (Nice to Have)
- src/lib/sf-corrections.ts:429 an unparseable fragment at HEAD is skipped silently, so its facts are never compared; a changed fact there passes unnoticed. Report it as a warning.
- src/lib/sf-build.ts:388 when no root is flagged host, the corrections check is skipped without a message.
- src/lib/sf-corrections.ts:458 edge handles carry a positional `#2` suffix for parallel edges (sf-model collect), so reordering or deleting the first of two same-pair edges reads as a change plus a removal and demands corrections for a cosmetic edit. Narrow case, inherited from the handle rule.
- src/scripts/system-flow-corrections.test.ts: no test for the first build (no HEAD commit, or no fragments at HEAD); the brief states that the check passes then. The code path (host.git and host.head guard) is right but unpinned.
- src/lib/sf-corrections.ts:458 a duplicate handle at HEAD collapses in the Map (last wins); duplicates are rejected elsewhere, so low risk.

### Assessment
**Task quality:** Approved
**Reasoning:** Comparison is by handle across merged models and the changed-fact fields exclude evidence, verified and unconfirmed, so moves and stamps are neutral; only small silent-skip and test-gap items remain.

## Ledger lines
Task 16: minor (deferred): an unparseable HEAD fragment is skipped silently in headModel, hiding its changed facts.
Task 16: minor (deferred): corrections check is skipped without a message when no root is the host.
Task 16: minor (deferred): parallel-edge handles are positional, so reordering same-pair edges falsely demands corrections.
Task 16: minor (deferred): no test for a first build with no HEAD or no fragments at HEAD.
Task 16: minor (deferred): a duplicate handle at HEAD collapses in the comparison map, last one wins.
