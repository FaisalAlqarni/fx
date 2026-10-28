# Task 01 re-review: system-flow CLI, schema, merge (fix rounds 1 to 3)

Range f55634a..abf752f.

### Finding verdicts
- Important 1 (inherited names bypass `additionalProperties` and `required`; `mergeInto` can write onto `Object.prototype`): ADDRESSED.
  - src/lib/sf-schema.ts:30 `required` uses `Object.hasOwn(v, k)`; :34 property schemas are looked up only for own keys, so `constructor`, `toString` and `__proto__` now hit `property <k> not allowed`; :56 `$ref` resolves only own `$defs` keys (an extra hardening beyond the finding).
  - src/lib/sf-model.ts:109 `mergeInto` skips `__proto__`; :110 reads `into[k]` only when it is an own property.
  - Tests in src/scripts/system-flow-check.test.ts cover the node `constructor` and `toString` cases, a top-level `__proto__` fragment (`x.json:: property __proto__ not allowed`), `required: ['toString']`, the `$ref` `constructor` case, and `Object.prototype` untouched after `mergeFragments`. The report (Fix round 1) shows RED (`a node carrying constructor: exits 1` assertion failure) and GREEN (`system-flow-check.test.js: OK`). The RED excerpt is one line and covers the first case only; the later cases have no separate RED. Acceptable, not a blocker.
  - Round 3 revert check: `git diff f55634a abf752f --stat` lists no `tests/install/run.sh` change, so the round 2 skip is cleanly reverted. The schema is a pure rename (0 line changes) to references/system-flow/system-model.schema.json; `SCHEMA_FILE` in src/lib/sf-model.ts and lib/sf-model.js is updated; `skills/` has no `fx-system-flow` folder. A search for `fx-system-flow` outside docs/, .fx/ and node_modules finds nothing.

### New breakage in the fix diff
- Critical: none.
- Important: none.
- Minor: the `__proto__` skip in `mergeInto` drops the key silently. It is unreachable through the CLI because validation rejects the key first; it only matters for a direct `mergeFragments` caller.
- Minor (out of scope): task briefs such as .fx/2026-10-28-system-flow/briefs/02.md:113 still name `skills/fx-system-flow/` as the schema location. Plan and brief text, not code; the controller owns it.

## Ledger lines
Task 01: fix round 3/5 (1 addressed, 0 open: none; commits f55634a..abf752f)
Task 01: minor (deferred): mergeInto drops a `__proto__` key silently; unreachable via the CLI because the validator rejects it first
Task 01: minor (deferred): brief 02 (.fx/2026-10-28-system-flow/briefs/02.md:113) still names the old skills/fx-system-flow/ schema path, now references/system-flow/
