### Spec Compliance (✅ / ❌ with file:line; ⚠️ cannot verify)

**src/lib/shell-guard.ts**
- ✅ `guardShellCodeOnly` (shell-guard.ts:67-80) is synchronous. A hard rule gives deny `hard-rule` and is logged. Read-only (with the `gitRunsRepoProgram` check) gives allow `read-only` and is not logged. A repo command gives allow `repo-command` and is not logged. Anything else gives allow `judge-unsupported` and is logged. It never calls `overrideReason`, never reads the journal and never asks a judge, so no stamp and no loop guard. This matches the Interfaces line and the post-brief ruling that no stamp applies on 2.x.
- ✅ Extra: an optional `posix` field that the interface does not list. The report discloses it, it is harmless, and the plugin's Windows reading needs it.
- ✅ No shared contract changed. The diff only adds an export, and `decide` (shell-guard.ts:82) is untouched. Its only caller is the v2 plugin.

**src/plugins/fx-opencode-v2.ts**
- ✅ Branch B is allowed. The task's Risks line says: "If the source cannot be found, take branch B and record 'unverified, code rules only'... never assume the await". Design 5 names this branch as the not-awaited outcome. ⚠️ A ruling made after the brief and binding here lets the implementer read the installed opencode files under the owner's home, read-only. The report (report:10) still works from the brief's earlier ban. Nothing shows this ruling reached the implementer, and nothing shows whether 2.x is installed there in readable form.
- ✅ Layer order (ADR 0037): `allowed` is set only after `inspect` allows the recorded command and every piece (:274). `shellGuard` runs only when `allowed` is set (:278).
- ✅ Hard rules are final and fail closed. `classifyShell` loads from `shell-rules.js` on its own (:~76-84). A load failure or a throw refuses (:130, :136-137). `reason = hardDeny ?? ...` (:147) means a crash in `guardShellCodeOnly` cannot drop a hard deny, and `shellGuardOff` fires only when `hardDeny === null` (:145).
- ✅ The task 06 mirror for a non-string command is not present. A non-string `ev.input.command` is never recorded (:332), and `evaluate` denies a missing record (:263-265) before any guard runs.
- ✅ `ev.sessionID` on `evaluate` is verified indirectly. `callKey(ev.sessionID, ...)` (:261) has to match the key recorded in `execute.before` (probe Q3, proven), or the git guard denies. So any call that reaches `shellGuard` carries a string `sessionID` (:139). ⚠️ The `prompt` and `context` payloads remain NOT MEASURED (header :24-27).
- ✅ Windows: `posix = process.platform !== 'win32'` (:131). With `posix` false, `classifyShell` tries the bash reading, then the PowerShell reading (shell-rules.ts:541), and refuses on either. The reference records this at opencode-v2.md:57-59.
- ✅ The `prompt` hook is registered outside `attempt()` (:349-358). A registration failure goes to stderr only, with the brief's exact text.
- ✅ Health: one unawaited probe (:364), printed to stderr once and pushed once per session id after it settles (:380-384).
- ❌ The prompt hook payload "read from the source" (Tests field) was not read. It is recorded as NOT MEASURED.
- ⚠️ The header (:18-23) cites `adapter.ts:439, :504` as unread. It cites no line that decided the branch.

**references/harnesses/opencode-v2.md**
- ❌ AC2 asks for "cites the source line that decided it". No source line decided anything. Lines 49-55 record UNVERIFIED, which the Risks line sanctions.
- ✅ The prompt-hook GAP and the health line are recorded (:61-75).

**Tests, scripts**
- ✅ The branch B tests are present: `npm publish` with a judge configured, zero guard requests, log `judge-unsupported` (opencode-v2-shell-guard.test.ts:~126-133). The force push, `rm -rf ~` and `ls -la` cases are present, as are the prompt hook, the registration failure and the health tests.
- ✅ `opencode-v2-plugin.test.ts` now runs under `applyScratchEnv`. `user-invoked.test.ts:25` only reads the plugin text. ⚠️ `opencode-malformed.test.ts` is said to be scratch already; it is not in the diff.
- ✅ The `test-scope.ts` rule and its test, plus the `check-all` line.
- ❌ AC4: `scripts/check-all` did not print ALL GREEN. The `opencode-v2` install run and free conformance run never ran (report:170-191).
- ✅ Extra: `src/lib/types.ts` (one overload) is outside the file list. It is disclosed and needed.

### Strengths
- The split between fail-closed rules and the fail-open guard is right. Hard rules come from a module with no judge-side code, and a hard deny survives a crash of the code-only guard.
- The non-string command hole open in task 06 is closed here by construction, through the record-or-deny path.
- The `broken()` copies give real-behavior tests for a missing `shell-guard.js`, a missing `shell-rules.js` and a throwing `shell-rules.js`.
- The health test uses a closed port and polls for the settled state. No sleep is guessed.

### Issues

#### Critical
None.

#### Important

1. **The acceptance gate and the only real-runtime checks did not run.** Evidence: report:170-191 and Acceptance criteria line 4.
   - **What is wrong:** `check-all` stopped on `brainstorm-server`, so `tests/install/run.sh opencode-v2` and `tests/conformance/run.sh opencode-v2 --free` were never reached.
   - **Why it matters:** every other test drives a fake `ctx`. Only these two runs show that real opencode 2.x accepts `session.hook('prompt')` during `setup`, and that the synchronous `evaluate` with `spawnSync` git and `readRepoConfig` behaves in the real runtime. That registration is a new, unproven hook name, awaited before the preamble's registration. A green result here is a claim with no evidence.
   - **Fix:** the controller runs `check-all` to ALL GREEN, with the opencode-v2 install and conformance lines visible, before approval.

2. **A failed health check shows as healthy.** Evidence: fx-opencode-v2.ts:364-368 (an empty rejection handler that returns undefined) and :94-98 (empty catch on the `judge-health.js` load).
   - **What is wrong:** a rejected `judgeHealth` gives no line, no stderr output and no log entry. A load failure of `judge-health.js` does the same.
   - **Why it matters:** this is the same defect as task 06 lens SF Important 2, which is open in fix round 1. The `health-check-failed` ruling exists because "a visible line when the health check itself fails" is required. Reachability is narrow: the body of `judgeHealth` catches, so a rejection comes only from the default-parameter `loadJudge()` / `machinePaths()`. The two plugins should still get one fix, not two outcomes.
   - **Fix:** on rejection, set `healthLine = healthFailed({ harness: 'opencode-v2', cwd, sessionId: null }, e)` from `lib/health-failure.js` (health-failure.ts:12), which loads no judge-side module, and print it. On a `judge-health.js` load failure, do the same, with `health-failure.js` loaded in its own `try`.

#### Minor

1. **Branch B may have been taken from a missing permission, not missing source.** Evidence: opencode-v2.md:49-55 and fx-opencode-v2.ts:18-23.
   - **What is wrong:** the only lead (design.md:68-70, `Effect.promise` wrapping) points to the await holding. A ruling binding here now allows read-only access to the installed opencode files.
   - **Why it matters:** on 2.x every grey command, `cat .env` included, now runs unjudged. AC2's "source line that decided it" is unmet.
   - **Fix:** the controller decides whether a read-only look at the installed 2.x package settles the await fact. If it does, branch A becomes a follow-up task. If not, keep B and log the ruling.

2. **The turn boundary and the per-session health line depend on an unmeasured `ev.sessionID` and fail silently.** Evidence: fx-opencode-v2.ts:352-353 and :380-381.
   - **What is wrong:** with no string `sessionID`, `journalKey` returns null and nothing is written. The `appendEvent` result is dropped. The health line is never pushed. No trace is left anywhere.
   - **Why it matters:** the gate's `context()` helper (opencode-v2-shell-guard.test.ts:~67-71) supplies `sessionID` itself, so the test proves only the assumed shape. This mirrors task 06 lens SF Important 1, at lower stakes here because no stamp depends on it on 2.x.
   - **Fix:** one stderr line per plugin instance when the key is null or `appendEvent` reports failure. Measure the payload under the new read-only ruling.

3. **The prompt hook registration is awaited before `session.context` registers.** Evidence: fx-opencode-v2.ts:350 vs :370.
   - **What is wrong:** an unproven hook name whose registration never resolves now blocks the preamble from registering. The report names this risk (report:242-245). Before this change, nothing unproven sat in front of the preamble.
   - **Fix:** register `prompt` after the `context`, `agent` and `command` registrations.

4. **The stamp wording is stale. This is plan-mandated text that the ruling superseded.** Evidence: fx-opencode-v2.ts:357 and opencode-v2.md:68.
   - **What is wrong:** the text says "the Stop reminder and stamp cannot work on this opencode", but under the 2.x ruling the stamp never works on opencode. Separately, opencode-v2.md:46-47 explains "no stamp" as a result of branch B, not of the design 6 ruling.
   - **Why it matters:** a later switch to branch A would silently drop the no-stamp rule.
   - **Fix:** drop "and stamp" from the line, and state the ruling's reason in the reference.

5. **The hard rules check only the recorded text, not the pieces the git guard re-checks after another plugin's rewrite.** Evidence: fx-opencode-v2.ts:270-278.
   - **What is wrong:** the git guard re-checks `ev.resources` after a possible rewrite by another plugin. The shell guard sees only the recorded command.
   - **Why it matters:** a rewrite that adds a catastrophic segment passes layer 2.
   - **Fix:** run `classifyShell` on each piece as well, and refuse on any hard deny.

6. **`guardShellCodeOnly` duplicates the code-rule start of `decide`.** Evidence: shell-guard.ts:67-80 vs :82 onward.
   - **What is wrong:** normalize, log closure, classify, read-only and repo-command are copied.
   - **Why it matters:** the task 06 fix round edits `decide`, and a change there will not reach the copy.
   - **Fix:** once 06 lands, have `decide` call a shared code-rules step.

7. **Mirrors of deferred task 06 minors.** Evidence: fx-opencode-v2.ts:145, :112-122 and :94-107.
   - **What is wrong:** a hard deny that comes with a guard crash writes no `guard-error` line (SF 3). `shellGuardOff` writes the raw error message unredacted (SEC 5). The `judge-health`, `journal` and `fx-paths` load catches are empty, with no stderr line (SF 4).
   - **Fix:** apply whatever the 06 decisions on these items are to both plugins.

8. **The RED evidence is partial, and one test cannot fail.** Evidence: report:99-112 and opencode-v2-shell-guard.test.ts:~135-141.
   - **What is wrong:** the mutation runs cover four behaviours. The `judge-unsupported` log line, the fail-open on a guard load failure and the fail-closed branches when rules fail to load or throw were never seen failing. The "no stamp" test uses `rm -rf ~`, which a hard rule denies whatever the stamp says, so it would pass even if a stamp were honoured.
   - **Fix:** add mutations for the untested branches, and either drop the stamp test or label it as a hard-rule test.

### Assessment
**Task quality: Needs fixes.**

**Reasoning:** the security core is sound and matches the brief and rulings. Hard rules run after the git guard, fail closed, stay final through a crash, honour no stamp and read both shells on Windows. A non-string command is refused. The task still cannot be signed off for two reasons. The acceptance gate never reached the opencode-v2 install and conformance runs, the only check against the real runtime of the newly awaited `prompt` hook. And a failed health check shows as healthy, the same defect task 06 has open as Important. The branch B choice is legal under the task's Risks line. The controller should still decide whether the new read-only ruling makes the await fact settleable now.

## Ledger lines
Task 07: minor (deferred): branch B taken without reading the installed 2.x files the later read-only ruling permits; AC2's deciding source line is absent (opencode-v2.md:49-55).
Task 07: minor (deferred): prompt journal and per-session health line depend on unmeasured ev.sessionID and fail with no trace; the test supplies the field itself (fx-opencode-v2.ts:352-353, :380-381).
Task 07: minor (deferred): prompt hook registration awaited ahead of session.context, so a hanging registration blocks the preamble (fx-opencode-v2.ts:350 vs :370).
Task 07: minor (deferred): prompt-unavailable text still names the stamp, and the reference ties no-stamp to branch B, not the design 6 ruling (fx-opencode-v2.ts:357, opencode-v2.md:46-47, :68).
Task 07: minor (deferred): hard rules check the recorded command only, not the ev.resources pieces the git guard re-checks after a rewrite (fx-opencode-v2.ts:270-278).
Task 07: minor (deferred): guardShellCodeOnly duplicates decide's code-rule prefix and will drift from the task 06 fix round (shell-guard.ts:67-80).
Task 07: minor (deferred): mirrors of 06 SF 3, SEC 5, SF 4: no guard-error line on a hard deny with a crash, unredacted shellGuardOff message, empty load catches (fx-opencode-v2.ts:145, :112-122, :94-107).
Task 07: minor (deferred): RED never shown for the judge-unsupported log, guard-load fail-open or rules fail-closed branches; the no-stamp test uses a hard-rule command and cannot fail (opencode-v2-shell-guard.test.ts:~135-141).

I did not check the parts of the diff the caveman filter elided. I also did not check whether opencode 2.x is installed under the owner's home, or the final state of `shell-guard.ts` after task 06's fix round lands. The main risk to tell the user: on 2.x every grey command currently runs unjudged.
