### Spec Compliance (✅ / ❌ with file:line; ⚠️ cannot verify)

**src/plugins/fx-opencode-v1.ts**
- ✅ Missing: none for the guard mapping. The guard runs after the git guard allows (:415-416) with `harness: 'opencode'`, `agentId: null` and the hook's `sessionID`. Allow returns, warn goes to `console.error`, deny throws, and ask throws with the brief's exact suffix (:316-319).
- ✅ The health promise is built once per construction and printed to stderr once. It is pushed after the preamble once per session id, and a call with no id gets nothing (:340-345, :376-381).
- ✅ The new loads are typed `require`s inside `try` (:84-123). A failed shell-guard load pushes `[fx] shell guard off: <message>` once (:371-374).
- ✅ The Windows requirement is met. The shell is not sourced, so `posix` is false on win32 (:298), and `classifyShell` then checks the bash reading and the PowerShell reading, refusing on either (src/lib/shell-rules.ts:541). This is recorded at references/harnesses/opencode.md:15 and stated in the report.
- ⚠️ The cmd reading is not one of the two readings. If opencode on Windows falls back to `cmd.exe` when Git Bash is missing, only the PowerShell aliases at shell-rules.ts:417 stand in for it. This is unsourced.
- ❌ Missing: brief step 2 (brief line 25) said to read the 1.18.25 `chat.message` signature and record the field. Instead, the header at :37-42 records "NOT MEASURED". The report's reason (SAFETY forbids touching /home/faisal) misreads SAFETY, which forbids deleting outside the worktree, not reading.
- ⚠️ It is not verified that 1.18.25 calls `chat.message(input, output)` with `input.sessionID`, or that the hook fires for a parent's `task` dispatch into a child session and for synthetic messages such as compaction or command expansion.
- ⚠️ It is not verified that `experimental.chat.system.transform` gets `sessionID` on the chat call site. If it does not, the health line never reaches the system text.
- ✅ Extra (sanctioned by the controller context): the shell rules load fail-closed and refuse every bash call (:292-305). This goes beyond the brief's "failed shell-guard load leaves bash to the git guard", but the context says "load it fail-closed".

**src/lib/shell-guard.ts**
- ❌ Extra and Misunderstood: task 03's stamp rule was changed so that any no-text prompt counts when `harness === 'opencode'` (:81, :86-87). See Important 1.

**src/lib/opencode-input.ts**
- ✅ `parseOpencodeV1Call` carries a string `sessionID` only. It has tests for both the string and non-string cases.

**src/tests/gates/opencode-v1-shell-guard.test.ts**
- ✅ Every case the brief's Tests field names is present, with the exact strings: hard rule, ask, deny, run with no `user_request`, loop guard, stamp with and without `chat.message`, read-only, git guard, journal line, health, no judge.json, failed load.
- ✅ Extra: the `rules-load` and `rules-throw` cases. The report admits they have no RED.

**src/tests/gates/opencode-plugin.test.ts, src/lib/opencode-malformed.test.ts, src/tests/helpers/hook-env.ts**
- ✅ Both tests run under scratch homes with restore, as the brief requires for "any other test that imports" the plugin.
- ✅ `applyScratchEnv` is an Extra in task 01's file. It adds an export and changes no existing contract.
- ✅ The changed hook-key expectation follows directly from adding `chat.message`, and the report discloses it.

**src/scripts/test-scope.ts, scripts/check-all**
- ✅ The `plugins/` rule and the check-all line are added, with a scope test.

**Acceptance**
- ⚠️ "`scripts/check-all` prints `ALL GREEN`" has no evidence. The report says the dispatch forbade running it. `tests/install/run.sh opencode` was not run either. test_scope ran every gate through the `.md` path and ends with `exit 0`.

### Strengths
- Hard rules hold even when the judge side fails. The plugin classifies the command itself, outside `guardShell`, and rethrows the hard deny on every path, including the catch at :311-314. A broken shell-guard module cannot drop a hard refusal, and the failed-load case tests exactly that (`rm -rf ~` still rejects).
- The gate checks real behaviour through the in-process seam with a fake judge. The "run" case calls `chat.message` before the judged call and then asserts there is no `user_request`, so it shows that the no-text prompt really keeps the prompt from the judge.
- The report is candid. It names the shell-guard change as a security tripwire, lists the unmeasured signature, and admits the missing RED.

### Issues

#### Critical
None.

#### Important

1. **The stamp rule is loosened for opencode child sessions, against design 5 and 6. Plan-mandated.**
   - **Where:** src/lib/shell-guard.ts:86-87, together with the journal key at src/plugins/fx-opencode-v1.ts:416 and :386-388.
   - **What is wrong:** `ev.text !== null || harness === 'opencode'` honours a stamp after any `chat.message` in the calling session's own journal. Design 6 says opencode "cannot tell a user prompt from a parent agent's prompt to a child session". Design 5 (C2) says a stamp is honoured only after a user prompt in "the root session's journal". The plugin keys the journal by the child's own `sessionID`, never the root's.
   - **Attack:** a child session's call is refused (ask, or a confident deny such as reading `.env`). The parent agent, possibly prompt-injected, sends the same child session another message, for example a resumed `task`. That fires `chat.message` in the child, and the child re-runs with `# fx-ok:`.
   - **Effect:** `honoured` skips the loop guard (shell-guard.ts:89) and turns the judge's deny or ask into `warn` (:128), so the command runs. A parent agent's message has softened a refusal. That is exactly what C2 closed, and the old `text !== null` test is what kept Codex's subagent dispatch prompts from doing the same.
   - **Root-session case:** this part is design-faithful. The design's table gives opencode 1.x a warned stamp, and a root-session `chat.message` is a user message, apart from the unmeasured synthetic messages noted above.
   - **Plan-mandated:** the brief requires both a `{ kind: 'prompt', text: null }` record (brief line 25) and a stamp honoured after `chat.message` (brief line 38). Under task 03's rule these two cannot both hold, so the brief contradicts design 6 rather than the implementer drifting.
   - **Design-faithful fix:**
     - (a) Measure in 1.18.25 whether the plugin's `client` can read a session's `parentID`. If it can, record the `chat.message` prompt only for root sessions, and have a child session's guard read its root session's journal (design 6: "a subagent's calls use the root session's prompt").
     - (b) If that cannot be measured, revert the shell-guard.ts change so the stamp stays dead on opencode 1.x. That is stricter, matching "without a prompt the judge only grows stricter". Then drop the `# fx-ok` suffix from the opencode 1.x ask text (fx-opencode-v1.ts:318), and get an owner ruling that amends the brief's stamp test and design 5's opencode 1.x warn cell.
   - **Either way:** the controller needs an owner decision. Whichever is chosen, the harness fact should live in the plugin, for example as a marked event, not as a harness check in shared code.

2. **The `chat.message` signature was not measured, as brief step 2 requires.**
   - **Where:** src/plugins/fx-opencode-v1.ts:37-42; the test input at src/tests/gates/opencode-v1-shell-guard.test.ts:52-54 (the `userMessage` helper).
   - **What is wrong:** the "recorded-shape" input is the published type's shape, not a recording, so the journal-line test and the stamp test prove the plugin agrees with itself, not with opencode.
   - **Why it matters:** Important 1 depends on the same unmeasured fact, namely whether a parent's dispatch fires `chat.message` in the child. The design asserts it but this task never checked it. The stated blocker does not hold: SAFETY at brief line 118 forbids deleting outside the worktree, not reading the binary.
   - **Fix:** read the 1.18.25 binary's plugin trigger for `chat.message`, read-only. Record the input fields, whether it fires for `task`-created child messages and synthetic messages, and whether `system.transform` gets `sessionID`. Put this in the header comment and in references/harnesses/opencode.md.

#### Minor

1. **The ask text promises a stamp that can never be honoured for a command longer than the judge reads.**
   - **Where:** src/lib/shell-guard.ts:101-102 together with src/plugins/fx-opencode-v1.ts:318.
   - **What is wrong:** on opencode a long command returns `ask` before any `ask` event is journalled, so `refused` stays -1 and no stamp is ever honoured. The plugin still appends "add `# fx-ok: <reason>` ... and run it again".
   - **Why it matters:** the agent is sent into a retry loop.
   - **Fix:** journal the `ask` there, or leave the suffix off when `source` is `judge-unsure` for length.

2. **A non-string `bash` command skips the hard rules on opencode, while the Codex twin refuses it.**
   - **Where:** src/plugins/fx-opencode-v1.ts:415. The Codex twin is src/hooks/fx-codex.ts:300, made Important in task 05 fix round 1.
   - **What is wrong:** two equivalent paths disagree on validation. ⚠️ It is unmeasured whether opencode validates args before `tool.execute.before`.
   - **Fix:** throw the same "is not a string ... Denying" text.

3. **No test pins that the changed rule stays closed on Claude Code and Codex.**
   - **Where:** src/lib/shell-guard.ts:87.
   - **What is wrong:** mutating `harness === 'opencode'` to `true` would fail no test. No test stamps a command after a no-text prompt on `claude-code` or `codex` and expects it ignored.
   - **Fix:** add one such case to src/tests/gates/shell-guard-claude.test.ts or a unit test of `guardShell`.

4. **The `classifyShell`-throw and rules-load fail-closed branches have no RED.**
   - **Where:** src/tests/gates/opencode-v1-shell-guard.test.ts, the `rules-load` and `rules-throw` loop near its end.
   - **What is wrong:** the report admits the tests came after the code. These are security fail-closed paths.
   - **Fix:** show RED by temporarily turning the throw at fx-opencode-v1.ts:304 into a return.

5. **The opencode stamp test covers ask only.**
   - **Where:** src/tests/gates/opencode-v1-shell-guard.test.ts, the stamp case.
   - **What is wrong:** no case covers a judged deny, then `chat.message`, then a stamp. That path is where the loop guard is skipped and a confident deny becomes a warned run on this harness.
   - **Fix:** add the case, so whatever comes out of Important 1 is pinned.

### Assessment
**Task quality:** Needs fixes.

**Reasoning:** the plugin wiring, the fail-closed hard rules, the health line and the tests are sound and faithful to the brief. The task cannot be trusted until two things are settled:
- **The trust rule.** The shared stamp-rule change (Important 1) lets a parent agent's message to a child session soften a judge refusal into a run on opencode 1.x, which is the C2 hole the design closed. The brief's stamp test does require some change, so this is plan-mandated and needs an owner ruling between option (a) and option (b).
- **The measurement.** The fact the whole question rests on, what fires `chat.message` in 1.18.25, was not measured even though reading it was permitted (Important 2).

The controller also still has to run `scripts/check-all` and the opencode install run, since the acceptance criterion has no evidence.

## Ledger lines
Task 06: minor (deferred): opencode ask text tells the agent to stamp a command too long for the judge, which is never journalled and so can never be honoured (shell-guard.ts:101-102, fx-opencode-v1.ts:318).
Task 06: minor (deferred): non-string opencode bash command skips the hard rules while the Codex twin refuses it (fx-opencode-v1.ts:415 vs fx-codex.ts:300).
Task 06: minor (deferred): no test pins that a no-text prompt leaves a stamp ignored on claude-code and codex after the shell-guard.ts:87 change.
Task 06: minor (deferred): the rules-load and rules-throw fail-closed branches have no RED.
Task 06: minor (deferred): no opencode test for a stamp after a judged deny, the path that skips the loop guard and turns deny into a warned run.

Not checked: the generated JS matches its TS sources only as far as the diff shows, and I did not read opencode itself, so whether `chat.message` fires for child-session dispatches rests on design 6's claim. Risk: until Important 1 is ruled on, a merged task 06 lets a parent agent's re-prompt un-refuse a child's judged deny on opencode 1.x.
