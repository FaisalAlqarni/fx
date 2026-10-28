# Task 11 fix round 1: controller re-review (5 production lines in src/lib/sf-diagrams.ts)

### Finding verdicts

- Spec ❌ and Important, store participant ids collide with actor ids: ADDRESSED. flow() now names store participants S_<store> and points messages at the same id; model ids match the lowercase id pattern with no underscore or capital, so no actor can produce it. A test with an actor named cache failed first and now passes.

### New breakage in the fix diff

- None found.

## Ledger lines

Task 11: fix round 1/5: controller re-review (5 lines): 1 addressed, 0 open
Task 11: minor (deferred): a digit-leading id gets an n prefix in archify specs, so ids 2fa and n2fa in one diagram would collide.
