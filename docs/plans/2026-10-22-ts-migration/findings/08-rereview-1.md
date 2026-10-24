Controller re-review, task 08 fix round 1 (f9e5c22..9741696), about 20 production lines in src/scripts/build-cost.ts and src/skills/fx-implement/scripts/compile-brief.ts.

### Finding verdicts
- Important 1, non-array stacks exits 0: ADDRESSED. compile-brief.ts lines 102 to 104 throw outside the try for a truthy non-array, as the old .map did; a null .fx.json still dies inside the try (line 99). compile-brief.test.js exit 0.
- Important 2, null timestamp NaN: ADDRESSED. build-cost.ts toMs returns NaN only for a missing timestamp and the epoch for null, used at every former new Date call. build-cost.test.js exit 0. Implementer reports RED on both new cases against f9e5c22.

### New breakage
None. Unused catch bindings removed.

## Ledger lines
Task 08: fix round 1/5 (2 addressed, 0 open; commits f9e5c22..9741696)
