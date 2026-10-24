### Spec Compliance

- ✅ Spec compliant. Every item in the brief's Files list has a hunk in the diff. The rule table matches `src/lib/dispatch-sizing.ts:834-878`, and all 15 process cases plus the two helper assertions are present.
- ✅ Guard isolation (checked by name). `src/hooks/fx-pretooluse.ts:181-212` (Bash branch) and `:214-228` (Write/Edit branch) return or exit before the Agent branch at `:230`. Each process handles one tool call.
  - The new `removeListener('uncaughtException', crashed)` plus `fallBack` handlers at `:253-255` are installed only inside the Agent branch. The Bash branch installs its own `off` handlers at `:198-200`.
  - `sizeDispatch` is never called on a Bash, Write, Edit or MultiEdit path. The git guard, the shell guard, the hard rules, the fx-state refusal and the lane check are untouched by this diff.
  - The only new top-level code is the guarded `require('../lib/dispatch-sizing')` at `:77-85`. It only reassigns `sizeDispatch`, and its fallback calls `route`, never a guard.
  - ✅ No sizing path can change the git guard or shell guard outcome.
- ✅ A `Capable because:` dispatch is never lowered (`src/lib/dispatch-sizing.ts:845-877`).
  - `justified = hasCapableLine(toolInput.prompt)` uses the same helper `route()` now uses.
  - Every `justified` path returns inside the `if (justified)` block at `:870-874`: `kept`, or `{ input: base, context: NOTE_LINE }`.
  - The only code that sets `model: 'haiku'` (`:877`) is after that block, so it is unreachable for a justified dispatch.
  - Cases 6 and 7 in `src/tests/gates/dispatch-sizing.test.ts:1088-1102` assert this at process level.
- ✅ A non general-purpose type is never lowered, including Plan (C17).
  - `isGeneralType` is false for `fx:`, other plugins' agents, `fork` and `Explore`. A non-string `subagent_type` is also false (`dispatch-route.ts` hunk).
  - `:839` returns `kept` before `featureMode`, `loadJudge` or any request.
  - Plan is excluded explicitly with `toolInput.subagent_type === 'Plan'`. This is covered at process level (test `:1113-1115`, zero requests, output `sonnet`) and in the lib test.
- ✅ The unjustified effective-model check `(base?.model ?? toolInput.model) !== 'sonnet'` (`:847`) keeps haiku and opus-with-reason out of the lower path.
  - An explicit `model: 'sonnet'` makes `route` return null, so `base` is null and `toolInput.model` is used. The lowered input is built from `toolInput`, so the prompt stays byte-identical (test `:1055`).
- ✅ The harness references hold. The three "fx does not size dispatches here: " sentences and the claude-code "Subagent sizing. " paragraph are present and asserted at `:1173-1176`.
- ✅ Decision log: one `dispatch` line per judged dispatch, with source/action pairs matching the brief (`:858-876`).
- ⚠️ Cannot verify from the diff alone:
  1. The reasons in `codex.md` and `opencode-v2.md`. The brief says "the reason from task 01". The implementer took them from state.md rulings (report, Implemented bullet 8). "A Codex PreToolUse hook cannot rewrite a tool input (ADR 0023) and the spawn message reaches hooks encrypted" is not evidenced in the diff. The `opencode-v2.md` sentence says the reason is that "no cheap-tier model is recorded ... a 2.x plugin ... unmeasured", while the line above it records a measured `model` field on 2.1.4. The controller should confirm both against task 01's record and task 13's ADR.
  2. The diff file reached me with context lines elided ("caveman" markers). The elided hunks of `fx-pretooluse.ts` were read from the source file instead (`:140-262`). The `dispatch-route.ts` bodies were visible only in the generated JS, and `GENERAL`/`route()` are unchanged apart from the `hasCapableLine` call.
  3. The controller holds the ALL GREEN evidence. I did not re-run anything.
  4. Deviation from brief rule step 2: `invalid` and `no-session` now write `judge-config` and `no-session` log lines (`:858,860`). The brief said no log when the judge is not ready. The report discloses this and follows lane-hint's pattern per the controller context, so I count it as accepted.

### Strengths

- Fail-open layering is sound. The module-load fallback (`fx-pretooluse.ts:77-85`) only reports when routing has not already reported. `sizeDispatch` wraps `decide` and logs a `judge-error` line. The hook's `fallBack` prints exactly `route()`'s result and exits 0 after stdout drains.
- Logging goes through one `log` closure, so every judged outcome carries latency, model, probabilities and escalate.
- `hasCapableLine` is extracted from `route()` rather than duplicated, so the "justified" rule has one definition.
- The process test is strong. It asserts the exact `state` sent to the judge, the byte-identical prompt, the exact JSON for justified dispatches (`deepStrictEqual` of the whole hook output), zero requests for all excluded types, and the timeout bound.
- The Plan exclusion is tested at both seams.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

1. `src/lib/dispatch-sizing.ts:830` · The catch block calls `route(input.toolInput)` unguarded. If `route` itself throws (the case `routingOff` exists for), `decide` throws at `:836`, the catch rethrows from `:830`, and `sizeDispatch` rejects, contradicting "never rejects". The hook still survives through `fallBack` (`fx-pretooluse.ts:257`), but it writes a second, misleading "dispatch sizing off" stderr line and a `judge-error` log line for what is a routing fault. Fix: wrap the catch's `route` call in its own try returning `{ input: null, context: null }`.
2. `src/lib/dispatch-sizing.ts:818,839` · Two copies of rules owned by `dispatch-route.ts`: a local `isRecord` duplicating the unexported one there, and a `'Plan'` string literal that duplicates knowledge of the `GENERAL` set. Fix: export one helper from `dispatch-route.ts` (for example `isJudgedType`) and use it in `decide`, so the C17 rule lives beside `GENERAL`.
3. Test gaps · Nothing asserts these paths:
   - A justified dispatch with a `small-edit` answer is not lowered (lib test `dispatch-sizing.test.ts` and gate test `:1089-1102` cover only `lookup` and `implementation` on justified).
   - A justified dispatch with no `model` (where `route` rewrites it to sonnet) is not lowered.
   - The `claude` alias is judged.
   - `judge-config` and `no-session` logging has no process-level case (`no-session` has a lib case).
   The "never lowered" invariant is security-class for quality, and only the opus plus lookup case exercises it.
4. `src/hooks/fx-pretooluse.ts:253-257` · `fallBack` stays registered for `uncaughtException` and `unhandledRejection` after `print` has started writing. A late rejection or a throw inside `print` (the `.then(onOk, onErr)` form does not route `onOk` throws to `onErr`) would print a second JSON document before the first write's exit callback, corrupting stdout. This is unlikely, but a one-shot guard (`let done = false`) closes it.

### Assessment

**Task quality:** Approved
**Reasoning:** No sizing path reaches the git or shell guards, and every `Capable because:` or non general-purpose dispatch (Plan included) returns before the only haiku rewrite, with process-level cases asserting it. The remaining findings are robustness and test-coverage polish that do not change routing outcomes.

## Ledger lines

Task 06: minor (deferred): sizeDispatch's catch calls route() unguarded, so a throwing route() makes it reject and double-reports on stderr.
Task 06: minor (deferred): dispatch-sizing.ts duplicates isRecord and hard-codes the 'Plan' literal instead of one exported judged-type helper beside GENERAL.
Task 06: minor (deferred): no test for a justified dispatch with a small-edit answer, a justified dispatch with no model, the claude alias, or judge-config/no-session at process level.
Task 06: minor (deferred): fx-pretooluse Agent branch leaves fallBack registered after print starts, so a late rejection could emit a second stdout document.
