Lens: silent-failure, 5 findings

I read `src/plugins/fx-opencode-v2.ts` and the diff. I did not run the tests.

1. [Important] `src/plugins/fx-opencode-v2.ts:187` and `:350-357` (`sessionOf` and the `prompt` hook): if the payload's session id is not at `ev.sessionID`, the turn boundary fails silently. This repeats 1.x Important 1.
   - **What is swallowed:** `sessionOf` returns `undefined`, so `journalKey` returns `null` and nothing is appended. The hook writes no stderr line and no log line.
   - **What a human loses:** the header and harness reference say the field is "NOT MEASURED". On a wrong shape, no prompt event ever lands, and nothing says why. The Stop reminder then fails the same way, quietly. A failed `appendEvent` does write its own stderr line (`journal.ts:44`), so only the null-key path is silent.
   - **Blast radius:** the failure direction is safe, because no softening happens. The cause is invisible.
   - **Fix:** print one stderr line per plugin instance the first time the hook fires and `sessionOf` gives no id. Do the same when the `journal` module did not load (`journal?.` is a silent no-op).

2. [Important] `src/plugins/fx-opencode-v2.ts:380-384`: the context hook silently drops the health line when it has no session id. This also repeats 1.x Important 1, and it shares the unmeasured field with finding 1.
   - **What is swallowed:** `session === undefined` skips the push with no trace. The test at `opencode-v2-shell-guard.test.ts:186` pins this as intended ("no session id, no health line").
   - **What a human loses:** stderr still carries the line once at `:366`. opencode 2.x may not surface plugin stderr to the user, and the brief requires the line in the session text. A dead judge then looks healthy in the session.
   - **Fix:** when the line is ready but the id is unreadable, push it without once-per-session tracking, or print a stderr line saying the push was skipped.

3. [Minor] `src/plugins/fx-opencode-v2.ts:364-368`: `.then(onFulfilled, () => undefined)` is not the 1.x "rejection shown as healthy" defect, but it has a hole.
   - **Why the 1.x Important 2 mostly does not repeat:** `judgeHealth` catches internally and `healthFailed` prints `[fx] judge health: <why>` to stderr and returns the visible `health-check-failed` line. A rejection can now only come from `healthFailed` itself, such as `machinePaths` throwing. That case is already caught inside it and returns `null` after the stderr line, so it leaves a trace.
   - **The remaining hole:** the empty rejection handler discards any other rejection with no line. The handler also does not cover a throw inside `onFulfilled`. A throw from `console.error` there becomes an unhandled rejection of the derived promise, which the plugin header calls a defect on 2.x.
   - **Fix:** use a `.catch` that writes one stderr line, attached after the `.then`.

4. [Minor] `src/plugins/fx-opencode-v2.ts:144-145` (the `shellGuard` catch): a hard deny that arrives with a guard crash writes no `guard-error` log line. This repeats 1.x Minor 3.
   - **What is lost:** the refusal itself is correct and cannot be lost. `hardDeny` is computed before the guard runs and applied after the `try`, so a crash never turns it into an allow. But `if (hardDeny === null)` skips `shellGuardOff`, and `guardShellCodeOnly` died before it could log the deny. The decision log has no record of the denied command or of the crash.
   - **Fix:** write the `guard-error` line in the crash path whether or not `hardDeny` is set. Do the same in the `classifyShell` catch, which currently refuses with a message but logs nothing.

5. [Minor] `src/plugins/fx-opencode-v2.ts:112-122` (`shellGuardOff`): the swallow of a log-write failure is a deliberate, commented swallow, and stderr already carries the warning before the write. It is not a finding on its own.
   - **One small loss:** the `catch` drops the write error, and the "no state directory" throw is dropped too. The stderr line therefore never says that the decision-log write also failed. A reader of the log sees nothing, and a reader of stderr cannot tell the line is missing from the log.
   - **Fix:** add the write error to a second stderr line, or append "(not logged: <message>)" to the first.

**Not findings:**
- A hard deny is not lost in a crash. It is applied after the `try` on both the success path and the crash path, and a failed `classifyShell` load denies every shell call.
- 1.x Minor 5 (a non-string command skips the guard) does not repeat. On 2.x the command comes from the recorded string in `commands`, and a missing record is denied by the git guard.
- The `prompt` registration failure goes to stderr only, as the brief requires. That is deliberate and documented.
- The empty load catches for `judgeHealth`, `journal` and `machinePaths` repeat 1.x Minor 4 unchanged, so I did not report them again. The `journal` case is covered under finding 1.

I did not check how opencode 2.x shows plugin stderr to the user. Finding 2's severity depends on it.
