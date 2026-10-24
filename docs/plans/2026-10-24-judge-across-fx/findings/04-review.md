## Spec Compliance

- ✅ Spec compliant. Branch A matches the brief and I found no Missing, Extra or Misunderstood items. Two deviations are covered by rulings:
  - `V2_AWAITS_BEFORE` is a module const read through `awaitsBefore()`, not a named export. The ruling "task 04 concern 1" allows this.
  - `awaitsBefore()` carries the FX_TEST=1 `FX_V2_AWAITS_BEFORE` override that C6 asks for.
- ⚠️ Cannot verify from the diff alone:
  - The reference's "MEASURED ... execute.before is awaited" paragraph is in unchanged context that the diff elides, and I could not read it.
  - The `V2_AWAITS_BEFORE`-versus-reference test checks it. The controller should confirm that test and `ALL GREEN` in the check-all output, since I have no shell.
- Ruling checks:
  - C6: `awaitsBefore()` and the override are in `src/plugins/fx-opencode-v2.ts`.
  - C7: the before callback is a plain non-async function. The `checkBuiltins` call-site comment sits before the shell path, and a promise is returned only from the shell branch.
  - C8: `src/lib/shell-guard.test.ts` and `lib/shell-guard.test.js` are changed in the diff, with the opencode, opencode-v2 and claude-code deny-text case.
  - The no-shell reviewer ruling is honoured: this review ran read-only.

### Strengths

- The git guard still runs first in `evaluate`. The hard-rule check precedes the stored decision, and `return refuse(reason)` now short-circuits so an ask cannot overwrite a deny.
- A missing key, a non-string command, a rejected `guardShell` and a synchronous throw all land on `shellGuardOff` plus the code-only fallback. The plugin has no new throw path and fails open as specified.
- The `execute.before` hoist of `callKey` and `command` is safe because `parseOpencodeToolEvent` always yields an object `input` (`src/lib/opencode-input.ts:25`, `obj(raw.input)`). Behaviour is the same as before.
- The decisions map is capped at 200 and deleted in both `evaluate` and `execute.after`.
- The `shell-guard.ts` change is a one-token widening of the NO_AGREEMENT condition, and the other harnesses' text is unchanged.
- The RED evidence is valid in both places. The shell-guard test failed on the stamp text where the no-agreement text was expected. The plugin test failed with `'allow' !== 'deny'` because no judged decision existed.
- The existing request-count assertions were changed to deltas, which is justified by the extra before-step requests.
- Tests 1-6, 8 and 9 follow the brief's exact strings and events.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

1. `src/tests/gates/opencode-v2-shell-guard.test.ts`, the "evaluate with no stored decision" block:
   - The brief's case 7 is `evaluate` with no prior `before` for the key. The test instead runs `before` with the flag forced to `0`, so the real fallback is untested: a key that was never filled, or one that was evicted.
   - Add a case that fires `permission.evaluate` alone after recording the command. A missing recorded command is already denied by the git guard, so this case needs a `before` that records the command but fails before `remember`.
2. `src/tests/gates/opencode-v2-shell-guard.test.ts`, the `rm -rf ~` block:
   - Its comment says "a stored allow never overrides" a hard rule. The test only shows that the `before` guard produced a hard deny, so `hardDeny ?? stored` precedence in `evaluate` is not exercised.
   - Neither the `warn`-to-stderr branch nor the 200-entry eviction in `remember` has a test that could fail.
   - `src/plugins/fx-opencode-v2.ts:361-362` and `:230-231` hold the untested branches.
3. `src/plugins/fx-opencode-v2.ts:350-358`:
   - The `decisions` entry is read and deleted only after the git guard allows (`:361-362`). A git-guard-denied call (`:350`, `:354`, `:358`) keeps its stored decision until `execute.after`, which may never fire for a refused call.
   - The 200 cap bounds the memory, but the cleanup is incidental. Reading and deleting the entry at the top of the `try`, before the git checks, would avoid the lingering entries.
4. `src/plugins/fx-opencode-v2.ts:356-359`:
   - The judge decides on the command recorded in `before`. `evaluate` then re-inspects `ev.resources` "after any other plugin's rewrite" for the git guard only.
   - A rewritten command would get the original's judge verdict. This follows the brief's design, but the reference does not name the limit.

## Ledger lines

Task 04: minor (deferred): case 7 tests the flag-off path, not an `evaluate` with no stored decision for the key.
Task 04: minor (deferred): hard-rule-over-stored precedence, the warn-to-stderr branch and the 200-entry eviction have no test that could fail.
Task 04: minor (deferred): git-guard-denied calls leave their stored decision in the map until `execute.after`; delete it before the git checks.
Task 04: minor (deferred): a rewritten command gets the judge verdict of the original recorded command; the reference does not say so.

### Assessment

**Task quality:** Approved
**Reasoning:** The two-step flow is sound. The git guard stays first, hard rules win, and every failure path falls back to code rules or fails open as specified. The gaps are test coverage and cleanup polish. Nothing blocks the merge.
