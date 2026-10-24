Lens: silent-failure, 5 findings

1. [Important] /development/fx/.worktrees/fx-judge-hooks/src/hooks/fx-codex.ts:326-341 (`recordPrompt`): a failed prompt record leaves the judge with the user's previous prompt, not an empty one.
   - **What is swallowed:** the catch writes one stderr line and exits 0. `appendEvent` (src/lib/journal.ts:35-44) also swallows its own write errors to stderr, so a full disk or bad permissions looks identical.
   - **What the judge sees:** `lastUserPrompt` (journal.ts:65-69) returns the last `prompt` event in the journal. A missed write means the judge reads an older prompt as `user_request`. If the user earlier said "publish it", a later grey `npm publish` is judged against that stale text.
   - **Blast radius:** the design says a missing prompt makes the judge only stricter. This failure does the opposite, and nothing shows it. The stderr line on an exit-0 `UserPromptSubmit` is not shown to the user, and it is not in the decision log.
   - **Fix:** record the failure so a later guard call can see it. Either append a marker or a null-text event, or have the guard treat a prompt older than the last recorded failure as absent. Do not exit 2, per the brief.

2. [Important] /development/fx/.worktrees/fx-judge-hooks/src/hooks/fx-codex.ts:263-265: a `Bash` call whose `command` is not a string now exits 0 with no output and no log.
   - **What changed:** `command` now comes from `input.command`, which `hook-input.ts` fills only when `tool_input.command` is a string. Before this diff, a truthy non-string reached `inspect()`, which would throw and be denied by the fail-closed branch at lines 270-275.
   - **What is lost:** a non-string command now skips the git guard and the shell guard entirely. A force push in that shape is allowed silently. The brief prescribes "anything else is no command", but it does not require silence.
   - **Fix:** when the tool is `Bash` and `tool_input.command` is present but not a non-empty string, write a stderr line saying the guard did not run. Prefer fail-closed through the git guard.

3. [Important] /development/fx/.worktrees/fx-judge-hooks/src/hooks/fx-codex.ts:285-287 and 173-176: the fail-open path leaves no decision-log entry, and the handler itself can throw.
   - **Log gap:** when `guardShell` fails to load, throws, or rejects, `shellGuardOff` prints the warning and exits 0. The guard never reached its logging, and the hook does not log either. Every guard crash is a silent allow in the decision log, and a 3am review of the log cannot find it. The `systemMessage` shown to the user is the only trace.
   - **Handler crash:** `String(message(e) ?? e)` runs inside an `uncaughtException` handler. If it throws, for example on an object with a throwing `toString`, Node exits with code 7 and prints nothing. Exit 7 is not 2, so Codex fails open with no warning.
   - **Fix:** write a minimal log line from the handler through an import-free path. Build the message defensively.
   - **Ordering check:** the fail-open handlers are installed only after the git guard allows (lines 275-287). A sync throw before that point reaches the `crashed` deny, because no `unhandledRejection` listener exists yet. I found no fail-open handler reachable before the git guard.

4. [Minor] /development/fx/.worktrees/fx-judge-hooks/src/hooks/fx-codex.ts:334-337 and 315-316: a missing `session_id` drops the prompt silently.
   - **What is lost:** `journalKey` returns null when `session_id` is missing or empty. Both `recordPrompt` and `startSubagentTurn` then skip the append with no stderr line. The prompt, or the subagent's turn start, is simply not recorded, with no trace.
   - **Fix:** write one stderr line on the null-key branch.

5. [Minor] /development/fx/.worktrees/fx-judge-hooks/src/hooks/fx-codex.ts:184-196 and 302-304: the direct `apply_patch` tool is silent when `extractPatchPaths` returns nothing.
   - **What is lost:** the new fx-state refusal (the forged-prompt guard) runs only when paths were extracted. For the direct tool (`fromShell` unset), an unreadable patch exits 0 with no warning. Only the shell route writes the "could not read the paths" line, and that line is on an exit-0 stderr the user likely never sees.
   - **Blast radius:** a patch the parser misses can write into fx's state directory unnoticed. That is the same prompt forgery the new check exists to stop.
   - **Fix:** write the same stderr line for the direct tool, or surface it as `systemMessage`.

**Not findings:**
- The swallows in `recordPrompt` and the `SubagentStart` journal write (409) are deliberate and commented. The fail-open design requires them, and the SubagentStart one correctly keeps the preamble printing.
- The hard-rule path is sound. A guard crash over a hard-deny becomes a deny with exit 2 (line 284), and the `.then(..., off)` rejection path honours it too.
- The `laneCheck` catch (202-204) is preexisting, commented advice.

I did not read the test files or the full 2235-line diff. I read the final `fx-codex.ts` plus `journal.ts` and checked the diff against the brief.
