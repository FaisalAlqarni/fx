### Finding verdicts

- **Silent-failure 1: a failed edit-rules load, or a missing export, allowed every edit with only one stderr line and no decision-log line.** ADDRESSED.
  - 1.x: `src/plugins/fx-opencode-v1.ts:650-653` calls `editRulesOff` on every edit that falls back. `editRulesOff` (`:685-690`) writes through `logEditRuleError` when the module loaded. When it did not, it writes a builtins-only `edit-rule`/`judge-error`/`allow` line through `appendDecision`.
  - 2.x: the same at `src/plugins/fx-opencode-v2.ts:466-469` and `:201-205`. The missing-export check now requires `builtinStep` and `checkJudged` (`:793-795`), and `logEditRuleError` is captured before that check, so a missing export still logs through it.
  - Tests: `opencode-edit-rules.test.ts` covers the 1.x load failure, and the 2.x load failure and missing export, each with two edits and two lines.
- **Silent-failure 2: the 2.x detached catch only called warnOnce, gave the wrong message and logged no judge-error line.** ADDRESSED. `unapplied` (`src/plugins/fx-opencode-v2.ts:482-486`) logs `the edit rule result could not be applied: <message>` through `editRulesOff` and says it once on stderr. The detached path ends in `.catch(unapplied)` (`:501`).
  - The awaited path now applies the result inside a try (`:489-496`). An apply crash allows and logs; before, it rejected, which refused the edit.
  - A real refusal is still thrown outside the try (`:495`).
  - Tested with `checkJudged` resolving `null` under `FX_V2_AWAITS_BEFORE` 1 and 0.
  - The finding's process-exit sub-point is inherent to a detached promise. The ruling at state.md:254 did not ask for it.
- **Review minor 2: 2.x ran builtinStep twice per edit.** ADDRESSED. `src/plugins/fx-opencode-v2.ts:473` runs `builtinStep` once and hands the step to `checkJudged(input, step)` (`:487`). `checkEdit` is now `checkJudged(input, builtinStep(input))` (`src/lib/edit-rules.ts:255-268`), so Claude Code, Codex and 1.x behave as before. The throwing-getter case pins one judge-error line.
- **Review minor 3: queue and warnOnce were declared after execute.before registered, so a call during setup threw a ReferenceError and refused.** ADDRESSED. Both are now declared at `src/plugins/fx-opencode-v2.ts:453-460`, before `editRules` (`:464`) and its registration (`:507`). `awaitsBefore` and `EDIT_TOOLS` are module-level (`:251`, `:134`). The test's `during` stub fires the callback when the hook registers; the report's RED shows the original ReferenceError.
- **Review minor 4: a failed 1.x fx-json-watch load was swallowed silently.** ADDRESSED. The error is now kept (`src/plugins/fx-opencode-v1.ts:656-658`) and reported once per plugin at the Stop path (`:501`). The test asserts the exact line appears once across two prompts.
- **Review minor 6: the 1.x notice reimplemented the compare and wrote no health/fx-json line.** ADDRESSED. 1.x calls the shared `fxJsonNotice` with its in-memory map (`src/plugins/fx-opencode-v1.ts:496`). The baseline stays in memory, as the concern-1 ruling requires.
  - Both `src/lib/fx-json-watch.test.ts:63-75` and the gate's 1.x Stop case assert one `health`/`notice`/`opencode` line and no journal event.

Controller checks:

- **Ruling C7 holds.** `editRules` is still a plain function. Its first work is the synchronous `builtinStep(input)` (`src/plugins/fx-opencode-v2.ts:473`), and a built-in refusal is a synchronous `throw` (`:475`), not a rejected promise. `builtinStep` never throws: its whole body is in a try that returns `{ decision: failed(...) }` (`src/lib/edit-rules.ts:225-245`). The gate still uses `assert.throws` for `edit`, `write` and `patch` under `FX_V2_AWAITS_BEFORE` 1 and 0 (`opencode-edit-rules.test.ts:280-292`).
- **Guard order is unchanged.** On 1.x, the fx-state refusal and the lane check still come before the edit check; the fix only moved the `sessionId` line and added the `editRulesOff` call (`fx-opencode-v1.ts:648-655`). On 2.x, `permission.evaluate` (git guard, fx-state) is untouched; only context lines appear. The shell branch of `execute.before` is byte-identical. `shellGuardOff` and `writeGuardLine` now go through `appendDecision` with the same entry fields, so guard-error lines are unchanged. `createQueue` cannot throw (`src/lib/opencode-queue.ts:11-33`), so moving it ahead of registration cannot leave `execute.before` unregistered.
- **`src/lib/fx-json-watch.ts` change is sound.** In journal mode it behaves as before. There is one theoretical difference: a journal `fx-json` event with no `hash` used to count as a prior baseline and now counts as none. Events are typed, so this does not matter in practice. The new `memory` parameter is optional and comes last, so the other callers are unaffected: `stop-check.ts:64` and `judge-health.ts:16`. The 1.x health line passes `sessionId: null` (`fx-opencode-v1.ts:451`), so there is no second baseline and no doubled notice. `logDecision` never throws (`src/lib/decision-log.ts:57-77`).

### New breakage in the fix diff

- [Minor] 1.x now takes on `fxJsonNotice`'s bare `catch { return null; }` (`src/lib/fx-json-watch.ts:45`). A crash in the fingerprint or compare used to reach `markTurn`'s catch and print `[fx] the Stop reminder is off`. Now it silently produces no notice (`src/plugins/fx-opencode-v1.ts:496`).
- [Minor] `checkBuiltins` is no longer called by either plugin. Only `src/lib/edit-rules.test.ts:161-164` uses it. Its comment still says opencode 2.x refuses through it (`src/lib/edit-rules.ts:248-249`), and the wording of ruling C7 (state.md:20, "runs checkBuiltins first") now names a function the plugin does not call. The behaviour C7 requires holds through `builtinStep`.
- [Minor] The report says `check-all` was not re-run this round (report line 104). This round changed the shared `src/lib/fx-json-watch.ts`, outside the task's file list, so the earlier `ALL GREEN` for acceptance criterion 4 is stale. The report does name test-scope (exit 0) and the covering tests (`ok`).

### Out-of-scope observations

None.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ledger lines

Task 08: fix round 1/5 (6 addressed, 0 open; commits aa4e77d..fda5518)
Task 08: minor (deferred): 1.x .fx.json notice now goes through fxJsonNotice's bare catch, so a crash there is silent where it used to reach markTurn's warnOnce (fx-json-watch.ts:45, fx-opencode-v1.ts:496)
Task 08: minor (deferred): checkBuiltins has no production caller after the fix; its comment and ruling C7's wording still name it as the 2.x path (edit-rules.ts:248-253, state.md:20)
Task 08: minor (deferred): check-all not re-run after fix round 1, which changed the shared src/lib/fx-json-watch.ts; acceptance criterion 4 rests on the earlier run
