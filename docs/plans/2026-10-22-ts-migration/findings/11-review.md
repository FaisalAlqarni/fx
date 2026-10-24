# Task 11 review: lib and script tests in TypeScript

### Spec Compliance

All nine files compared line by line against `git show 43b92d4:<path>.test.js`. Every diff hunk is a type annotation, an import form change, a `?.` or default for `noUncheckedIndexedAccess`, a `ts-gate-ok` marker, or a comment edit. No case, assert or expected value is missing, added or changed.

Assert-line counts, old and new (grep of assert, ok, check, eq call sites): git-guard 2/2 (helper-driven; run totals 85 passed), base-branch 13/13 (27 passed), heredoc 13/13 (36 passed), plan-state 59/59, plant-roles 118/118, preamble 81/81, build-cost 61/61, test-scope 21/21, compile-brief 18/18. Source line counts match the diffs. I ran all nine generated tests with a fresh fixture: every one exits 0, and the three fixture tests print 85, 27 and 36 passed, as the report says. All nine generated files carry the generated header, and the tests import `.js` paths. Fixture tests keep their `<main> <worktree>` arguments.

Not run by me: the per-file mutation checks (the report describes them; the diff shows nothing that would defeat them). Unverified.

### Strengths

- Ports are mechanical; the diff against the oracle is small and fully explainable.
- The `rulingsFor` guard `typeof rulingsFor === 'function' ? ... : null` became a direct call, which is stricter, not weaker.
- The preamble `cmds[0]?.includes` negation looks like it could pass on an empty list, but the line before asserts `cmds.length === 1`, so it cannot.

### Issues

#### Critical

None.

#### Important

None.

#### Minor

- src/lib/plant-roles.test.ts:551 · `hooksTrusted({ home: mkdtemp... })` became `hooksTrusted()` · the old argument was ignored by the function (`src/lib/plant-roles.ts:153` takes none), so the assertion is unchanged, but the test no longer shows the intent of "unknown home" · pass nothing and drop the leftover claim, or add a comment; low value.
- src/skills/fx-implement/scripts/compile-brief.test.ts:9-11 · `GATE_EXEMPT` is a constant that exists only so the `artifact-gate: ok` text survives esbuild; it is never read · works, but is a trick tied to the gate's text match · accept, or teach check-artifacts to read the source `.ts`.
- src/lib/plant-roles.test.ts:3-8,157,224 · comments edited to remove em dashes (required by the dash rule) · fine, noted only because the brief says "assert exactly" · none.
- src/lib/git-guard.test.ts:78, src/lib/base-branch.test.ts:32, src/scripts/build-cost.test.ts:50, src/skills/fx-implement/scripts/compile-brief.test.ts:42 · `as [string, string][]` casts on literal tables · not trust boundaries, so allowed; a typed `const` would avoid the cast · optional.
- src/lib/plan-state.test.ts:21,169 · `String(out.length)` and `extra?: string | null` change the third argument type of `check`; output text for the passing path is unchanged · none.

### Assessment

Faithful port. No dropped or weakened case found; counts and outputs match; all nine exit 0. Approved.

## Ledger lines

Task 11: minor (deferred): compile-brief.test.ts keeps `GATE_EXEMPT` string only to preserve the artifact-gate marker through esbuild.
Task 11: minor (deferred): plant-roles.test.ts calls `hooksTrusted()` with no argument; the old ignored argument was dropped.
Task 11: minor (deferred): four tests use `as [string, string][]` casts on literal tables instead of typed consts.
