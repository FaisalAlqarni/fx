### Spec Compliance
- ❌ Issues found: --only stamps every unverified item, not only the rebuilt ones.
- ⚠️ Cannot verify from diff: tests were not re-run.

### Strengths
- Check runs first; unknown handle gives `system-flow: build: no item <h>` exit 1 with nothing written; handles go through parseHandle (first colon), so edge handles work; ruling 26 correction present in the node:api test; all named test cases covered.

### Issues
#### Critical (Must Fix)
None.
#### Important (Should Fix)
- src/lib/sf-build.ts:170-172,331: `planStamps(checked.items, ...)` and `stampVerified` run unchanged under `picked`, so `build --only bullet:b1` writes `verified` at HEAD into every other item that has none. Those items were not re-read, and `stale` then reports them as fresh. Filter `stamps` to the selected items (handles in `picked`, or the items inside the rebuilt docs and figures) when `picked` is set. No test covers it.
#### Minor (Nice to Have)
- Coverage.md is left stale after --only (src/lib/sf-build.ts:208). This fits "every other generated file keeps its bytes", but coverage.json is still rewritten when its bytes change, so the two drift. Not a contradiction of the task or design; note it in fx-docs.
- Test has no case for an edge handle (colons and >) passed to --only.

### Assessment
**Task quality:** Needs fixes
**Reasoning:** Selection, check-first and error form are right, but the stamp step is not limited to the rebuilt items, which can hide stale evidence.

## Ledger lines
Task 17: minor (deferred): coverage.md stays stale after build --only while coverage.json is still rewritten; document in fx-docs.
Task 17: minor (deferred): no test passes an edge handle with colons and > to build --only.
