Lens: security, 7 findings

1. [Important] `src/hooks/fx-codex.ts:264-265` (with `src/lib/hook-input.ts`, the `command: str(ti?.command)` line): a non-string `command` on a `Bash` call now skips every guard. This includes the git guard, which is fail-closed.
   - `parseCodexHookInput` drops any non-string command, so `if (!command) process.exit(0)` runs before `inspect`.
   - The old code passed the raw value to `inspect`, which stringifies it. An array like `["bash","-lc","git push --force origin main"]` was inspected, and a throw became a deny. Now it exits 0 untouched.
   - The same applies to any `tool_name` other than the exact string `Bash`, since the matcher is `*` and the code only handles `Bash`. The brief says `exec_command` arrives as a string `Bash`. I could not verify that Codex never sends the array form (legacy `shell`) or other names such as `local_shell`.
   - An attacker gets an unguarded command by choosing that shape, if it is reachable.
   - Fix: when `tool_name` is `Bash` and `tool_input.command` is present but not a string, deny. Alternatively stringify it for the git guard and hard rules. Add a test case for it.

2. [Important] `src/lib/shell-rules.ts:150` and `:121`/`:157`: the non-POSIX (PowerShell) reading mishandles two PowerShell constructs, so a wipe can be hidden from the win32 path.
   - Block comment: `<#` lexes as the redirect `<` followed by `#`, which starts a line comment. In `Remove-Item <# x #> -Recurse -Force C:\`, everything after `<#` is dropped, so no rule sees `-Recurse` or the path.
   - Backtick escape: the backtick is not an escape when `posix` is false, and PowerShell treats it as one. `Remove-It`em`, `-Rec`urse` and a backtick line continuation all change the word the rules compare against.
   - An attacker gets a refused wipe through on Codex for Windows.
   - Fix: in non-POSIX mode, treat `<# ... #>` as a comment and backtick as an escape and line continuation. Add a test for each spelling.

3. [Important] `src/lib/shell-rules.ts:376-378`: the PowerShell wipe rule is exact-match only.
   - `lower.includes('-recurse')` misses the abbreviations PowerShell accepts (`-r`, `-rec`).
   - `rd` and `rmdir` are only checked for the cmd switch `/s`. In PowerShell they are `Remove-Item` aliases, so `rmdir -Recurse -Force C:\` and `rd -r ~` pass. `erase` is also missing.
   - Targets are limited to `C:\`, `C:\*`, `~`, `$HOME` and `$env:USERPROFILE`. These bare forms slip past: `~\*`, `$HOME\*`, `$env:USERPROFILE\*`, `${HOME}`, and `C:/`, which PowerShell accepts.
   - Fix: match `-r` prefixes of `-recurse` (any `-r`... prefix, case-insensitive), apply the PowerShell rule to `rd`, `rmdir` and `erase`, and accept a trailing `\*` or `/*` and forward-slash drive roots.

4. [Important] `src/lib/shell-rules.ts:350-356` (`resolve`) and `:386`: PowerShell string evaluators are not recursed. `iex "Remove-Item -Recurse -Force C:\"` and `Invoke-Expression` with a string argument are only checked for downloads. `powershell -EncodedCommand <base64>` and `-File` are not read either. `-Command` and `cmd /c` are handled. The brief names only the top-level reading, so this may be accepted as best effort, but it is a direct way around the new win32 reading. Fix: treat `iex` and `invoke-expression` arguments as inner commands read with the non-POSIX lexer, and decide on `-EncodedCommand` (decode, or grey at minimum).

5. [Minor] `src/hooks/fx-codex.ts:288-299`: a hard-rule deny depends on `guardShell` settling.
   - `hardDeny` is already known at line 282, but the deny is only emitted from the promise callbacks. If the promise never settles (for example, a hung sync log write before the first await returns), the event loop empties and Node exits 0, which is an allow.
   - A rejection is handled correctly. Only a never-settling promise is not.
   - Fix: when `hardDeny !== null`, emit the deny immediately. Log the decision separately, or race it with a short timer that denies.

6. [Minor] `src/hooks/fx-codex.ts:233` against `:311`: agent identity is read two ways.
   - PreToolUse uses `agentId &&`, so a falsy `agent_id` (`0`, `false`) is treated as the root and skips the read-only check. UserPromptSubmit uses `subagentId`, which counts any non-empty value as a subagent (the task 02 ruling).
   - A subagent `UserPromptSubmit` that carries `agent_type` but no `agent_id` is recorded as a root user prompt. That would soften the judge and satisfy the stamp rule. The research doc says Codex sends `agent_id`, so this is hardening only.
   - Fix: use `subagentId` in the PreToolUse check, and treat a present `agent_type` with no `agent_id` as a subagent in `recordPrompt` (no text, subagent journal or none).

7. [Minor] `src/lib/shell-rules.ts:452` (`namesFxState`): the state-directory regex built from `machinePaths().stateDir` has no `i` flag, so on Windows a differently cased spelling does not match it. The `FX_STATE` regex is case-insensitive but only covers the default `AppData\Local\fx` layout. A non-default state directory spelled in another case slips past, in both the shell check and the `apply_patch` check at `fx-codex.ts:192`. Fix: make the stateDir match case-insensitive when `process.platform` is `win32`.

I checked these and found no problem:
- **Ask handling:** an ask becomes a warn, never a silent allow. `shell-guard.js:139` and `codexGuardOutput` both do it, and the warn carries both `systemMessage` and `additionalContext`.
- **Loop guard:** on Codex it is a deny.
- **Stamp:** an honoured stamp softens a deny or ask to a warn. It never reaches a hard rule, because `classifyShell` runs first.
- **Fail-closed order:** the read-only check and git guard answer before the shell guard. A broken `shell-rules` load denies. A hard-deny stays a deny if `guardShell` or `codex-guard-output` is broken. `unhandledRejection` is covered.
- **`apply_patch` and `fx-state`:** the refusal resolves paths against `cwd` and includes `Move to:`.
- **Output keys:** only the keys the brief lists are printed.

Files reviewed (absolute paths):
- `/development/fx/.worktrees/fx-judge-hooks/src/hooks/fx-codex.ts`
- `/development/fx/.worktrees/fx-judge-hooks/src/lib/shell-rules.ts`
- `/development/fx/.worktrees/fx-judge-hooks/lib/shell-guard.js`
- `/development/fx/.worktrees/fx-judge-hooks/lib/guard-output.js`
- `/development/fx/.worktrees/fx-judge-hooks/src/lib/hook-input.ts`

I read the diff only in part. About a third of it was elided, so I read the source files directly. I did not read `shell-guard-codex.test.ts` or the Codex output gate.
