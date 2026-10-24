# Task 12 review: gate tests in TypeScript

### Spec Compliance

All 26 ported gates match the JavaScript they replace. No case is missing, extra or misunderstood.

Method: I extracted the base (f336974) and head (68b77c1) trees into scratch directories and ran every old and new gate under a preload that wraps node:assert and logs each call. I diffed the logs for the first two arguments (actual, expected) and then for the message argument.

- Exit codes: all 26 exit 0 in both versions.
- Assert counts, old against new, are equal for every gate. The eight largest are codex-manifest 137, opencode-plugin 203, opencode-v2-plugin 227, codex-hook-output 106, user-invoked 119, return-contract 81, release-version 8 and description-overlap 38. These match the report's table, as do the rest, including opencode-v2-policies 913.
- The sequence of assert method, actual and expected is identical for all 26. The only differences are temp directory names, merge-base hashes and the absolute scratch path, which vary per run.
- Messages are identical except 12 codex-manifest labels where an em dash became a colon. The assertions are unchanged, and the brief's no-dash constraint requires the change.
- stdout is identical for all gates. The only differences are the node module-type warning's pid and path.
- Non-assert control flow (explicit throws, process.exit, console output) is unchanged. The only additions are explicit `undefined` guards that replace what a missing value would have thrown in JavaScript.
- Path arithmetic from `__dirname` is unchanged (`path.join(__dirname, '..', '..')`). All 26 generated files carry the generated header naming their source, and no en or em dash remains in the sources.
- release-version needs git history, so I ran it in a full copy of the worktree with the old file swapped in. Both versions give 8 asserts with equal arguments.

⚠️ I did not rerun the report's mutation checks. The argument-level log equality covers the central risk, but the CAUGHT column is the report's claim only.

### Strengths

- No `as` casts and no `any`. Literal tables use typed consts or local interfaces, and the `need` helper replaces non-null assertions.
- Every `JSON.parse` that yields an untyped value carries `ts-gate-ok` with a reason.
- `?? ''` fallbacks sit only in front of assertions, so a missing value fails an assert instead of hiding.
- opencode-v2-plugin patches the real CommonJS `fs` object through `rawFs`, so the EIO case still reaches the plugin. The assert log confirms the case ran.
- Dropped arguments: none found. The empty-argument stubs got explicit `undefined` returns, which keeps the same behaviour.
- The em dash label edits (codex-manifest) change text only, and the report discloses them.

### Issues

#### Critical

None.

#### Important

None.

#### Minor

None.

### Assessment

The port is faithful. Per-call assert arguments, counts, exit codes and stdout all match the originals across the 26 gates. The only unverified claim is the report's mutation column.

## Ledger lines
