## Spec Compliance

- ✅ Spec compliant. Every file in the brief has its hunk: `src/lib/edit-rules.ts`, `src/lib/edit-rules.test.ts`, both plugins, both references, `src/scripts/test-scope.ts`, `scripts/check-all`, the new gate, and the generated twins. The four deviations each have cover:
  - in-memory 1.x `.fx.json` baseline: ruling "task 08 concern 1"
  - `write` and `patch` on 2.x: ruling "task 08 concern 3"
  - fx-state case moved to `dirs.state`: `namesFxState` does not match a repository `.fx/`
  - `src/scripts/test-scope.test.ts` edited: it pins the `plugins/` list the task extends
- Guards first and unchanged, 1.x: the bash branch (git guard, shell guard) still returns at `src/plugins/fx-opencode-v1.ts:600`. The fx-state refusal (`:618-623`) and the lane check (`:624-634`) run before `checkEdit` (`:636-644`). The diff adds lines only after them.
- Guards first and unchanged, 2.x: the only change in `execute.before` swaps the task 04 placeholder comment for the `EDIT_TOOLS` branch (`src/plugins/fx-opencode-v2.ts:475`). `EDIT_TOOLS` never holds `shell`, so the shell path at `:476-493` is reached exactly as before. The diff shows `permission.evaluate` (git guard, fx-state) only as context lines, so it is untouched.
- Ruling C7 holds. `editRules` is a plain function (`fx-opencode-v2.ts:439`). `checkBuiltins` runs first and throws synchronously (`:445-446`). The gate checks it with `assert.throws` for all three tools under both `FX_V2_AWAITS_BEFORE` values (`src/tests/gates/opencode-edit-rules.test.ts:238-251`).
- Judged rules on 2.x: when `awaitsBefore()` is true they are awaited and refuse (`fx-opencode-v2.ts:451-455`). Otherwise the promise is detached and every non-allow result is queued with the `[fx] advice only on opencode 2.x: ` prefix (`:458-461`). Both branches are tested (`opencode-edit-rules.test.ts:253-280`).
- Task 07 rulings hold. `judged()`, `refusesRule`, `MEASURED_RULES`, `SECRET_FILE` (`src/lib/edit-rules.ts:212`), the 2,000-character cap and `failed`/`logEditRuleError` (`:189-200`) are unchanged. `builtinStep` (`:222-245`) is the old steps 1 and 2 moved verbatim, with `readRepoConfig` now inside the try.
- The `.fx.json` notice reaches the 1.x reminder path: it is queued beside the Stop reminder text in `markTurn` (`fx-opencode-v1.ts:480-486`) and tested at `opencode-edit-rules.test.ts:226-236`.
- Callers checked for the `changedFiles` and `checkEdit` contract change: `src/hooks/fx-pretooluse.ts:276`, `src/hooks/fx-codex.ts:338` and `:351`. None passes `opencode-v2`, so none is affected.
- ⚠️ Cannot verify from the diff: the 2.1.4 tool names and fields (`path`, `patch`, `patchText`) rest on the implementer's `strings` reading of the binary. I had no shell and could not re-read it. Task 13's bench is where a wrong name would show, and it would show as a silent no-check, not a refusal.

## Strengths

- `checkBuiltins` reuses the one built-in step instead of copying it (`src/lib/edit-rules.ts:222-262`), so Claude Code, Codex and both opencode majors share one rule path.
- `changedFiles` runs synchronously in `checkEdit`'s first tick, so on a non-awaiting 2.x the "lines this write adds" are computed before the write lands.
- The 1.x/2.x name split fails toward no check, and a test pins that: `src/lib/edit-rules.test.ts`, the "1.x names are not the 2.x ones" asserts.
- The gate checks that the judge saw only the added line (`state.added === '# TODO later'`) and that each advisory is delivered once.
- RED judgment (the controller asked): against the old code, these new cases would fail:
  - 1.x `edit` and `apply_patch` built-ins
  - 1.x measured refusal, unmeasured advisory, unsure advisory and Stop notice
  - every 2.x case (old `execute.before` returned `undefined` for non-shell tools)
  - both reference-doc checks
  - the `changedFiles` 2.x unit asserts
  - `checkBuiltins` (undefined export, so a TypeError at runtime)

  These four would pass against the old code: 1.x clean addition, 1.x no `judge.json`, 1.x fx-state, and 1.x slow judge. fx-state is a regression guard by design. The other three are vacuous on the old code; see Minor 1.

## Issues

### Critical (Must Fix)

None.

### Important (Should Fix)

None.

### Minor (Nice to Have)

1. **Two 1.x gate cases assert less than they look.**
   - `src/tests/gates/opencode-edit-rules.test.ts:216-224` (slow judge) never checks that a rule request was sent. It passes on the old code, and it would pass on new code where the judge step had been skipped. Fix: assert `ruleRequests().length` grew.
   - `:166-172` (clean addition) asserts zero rule requests, but the edit-rules gate is off and `docs/a.md` matches no repository rule. Only "resolves" carries weight there.
2. **2.x runs the built-in step twice per edit.** `fx-opencode-v2.ts:445` and `:450` both reach `builtinStep` (`src/lib/edit-rules.ts:222`), and each call runs `readRepoConfig` and `repoRoot`. Each of those spawns `git rev-parse` synchronously (`src/lib/repo-config.ts:15`, 2 s timeout). That is four blocking spawns inside opencode's process for every edit. When the step crashes, `[fx] edit rules off` is printed twice and judge-error is logged twice. Fix: have `checkBuiltins` hand its step to the judged path, or add an internal `checkEdit` entry that takes it. The report accepts the double run as the cost of keeping one entry point; that rationale does not lower the cost.
3. **Edit check can refuse an edit if a tool call arrives during plugin setup.** `editRules` (`fx-opencode-v2.ts:439-462`) uses `warnOnce` and `queue`, which are `const` declarations at `:504` and `:499`. The hook is registered at `:466`, before those declarations run. A call that arrives before `setup()` finishes would throw a ReferenceError from `warnOnce` at `:441`, or from the `catch` at `:448`. That turns an advisory or fail-open path into a refusal. Fix: move the `queue` and `warnOnce` declarations above the hook registration.
4. **Silent load failure, and the tripwire line misses it.** `src/plugins/fx-opencode-v1.ts:191` is `catch { /* no notice */ }`. Every other loader in both plugins keeps its error and reports it once. Here, if `lib/fx-json-watch` fails to load, the 1.x `.fx.json` notice is off with no trace. The report's `Tripwires:` line does not list this silent-failure path.
5. **2.x reference reads as if judged rules never refuse.** At `references/harnesses/opencode-v2.md:76-77`, "`V2_AWAITS_BEFORE` in the plugin turns false" suggests the plugin detects this at runtime; it is a constant someone must edit after a new measurement. The test-pinned sentence "On 2.x the judged edit rules only advise:" then stands as a flat statement, which contradicts the 2.1.4 measurement two sentences earlier. Fix: make the conditional explicit and keep the pinned phrase.
6. **1.x notice reimplements the compare and drops the log line.** `fx-opencode-v1.ts:481-486` repeats `fxJsonNotice`'s compare (`src/lib/fx-json-watch.ts:30-36`) but writes no `health`/`fx-json` decision-log line. A search of the decision log by `source: fx-json` finds Claude Code and Codex notices but not 1.x ones. The queue's `queue-pushed` line is the only trace. The ruling accepts the in-memory store; it does not cover dropping the log line.

## Assessment

**Task quality:** Approved

**Reasoning:** Both majors keep the git guard and fx-state refusal ahead of and separate from the new rule path. Built-ins refuse synchronously on 2.x per C7. Judged refusals are awaited only under `awaitsBefore()`, and task 07's refusal and failure-logging rules are inherited unchanged through the shared step. What remains is test sharpness, a double synchronous step on 2.x, a setup-order hazard, and doc wording.

## Ledger lines

Task 08: minor (deferred): slow-judge gate case never asserts a rule request was sent, and the clean-addition case's zero-request assert is vacuous with the gate off (opencode-edit-rules.test.ts:166-172, 216-224)
Task 08: minor (deferred): 2.x runs builtinStep twice per edit, so four synchronous git spawns and doubled failure logs (fx-opencode-v2.ts:445,450)
Task 08: minor (deferred): 2.x editRules uses queue and warnOnce declared after execute.before registers; a call during setup throws a ReferenceError and refuses (fx-opencode-v2.ts:439-462 vs 499,504)
Task 08: minor (deferred): 1.x fx-json-watch load failure is swallowed silently and the Tripwires line misses it (fx-opencode-v1.ts:191)
Task 08: minor (deferred): opencode-v2.md:76-77 says V2_AWAITS_BEFORE "turns false" and states "only advise" flatly, contradicting the 2.1.4 measurement
Task 08: minor (deferred): 1.x .fx.json notice repeats fxJsonNotice's compare and writes no health/fx-json decision-log line (fx-opencode-v1.ts:481-486)
