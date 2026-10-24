### Spec Compliance (✅ / ❌ with file:line; ⚠️ cannot verify)

**src/lib/hook-input.ts, src/lib/types.ts**
- ✅ `command` is set only for `tool_name: "Bash"` with a string `tool_input.command` (src/lib/hook-input.ts:1126 in the diff); `prompt`, `session_id`, `agent_id` and `agent_type` are read. Unit cases cover a string command, a numeric command, apply_patch, prompt and a non-string prompt (src/lib/hook-input.test.ts:63-79).

**src/lib/guard-output.ts**
- ✅ `codexGuardOutput` reuses `claudeGuardOutput` and maps ask to warn (src/lib/guard-output.ts:15-17).

**src/hooks/fx-codex.ts**
- ✅ The read-only agent check runs first, then the git guard, then the hard rules (fx-codex.ts:233-281).
- ✅ The deny-on-crash handler is swapped for `uncaughtException` and `unhandledRejection` handlers that fail open, except over a hard rule (fx-codex.ts:284-287). Output goes through `emit`, which exits from the write callback (fx-codex.ts:166-170).
- ✅ `guardShell` is called with `harness: 'codex'` (fx-codex.ts:294).
- ✅ `UserPromptSubmit`: `[fx] ` prompts are ignored. A prompt with any non-empty `agent_id` goes to the subagent journal with `text: null`. Any other prompt is redacted and capped into the root journal (fx-codex.ts:326-342, 367-370).
- ✅ `SubagentStart` appends the null-text prompt event and leaves the printed output unchanged (fx-codex.ts:395-398 in the diff hunk; the test compares against the golden fixture).
- ✅ A named event that no branch routes prints nothing (fx-codex.ts:372), as ruled.
- ❌ (partial) The controller context says the top-level command must be read the PowerShell way on Codex under win32. Only the hard-rule half of `classifyShell` gets that reading. The read-only shortcut, the comment stripping and the stamp still use the bash reading (shell-rules.ts:248-261, 471-478, 494-497). See Important 1.
- ❌ The interface says UserPromptSubmit "never exits 2". It still exits 2 when the parser fails to load and when the payload is not an object (fx-codex.ts:347-359). The implementer disclosed this. See Minor 2.
- ✅ The PowerShell wipe case is present. `Remove-Item C:\ -Recurse -Force` and `Remove-Item -Recurse -Force C:\*` are refused under a faked win32, with a bash control on Linux (src/tests/gates/shell-guard-codex.test.ts:223-240). ⚠️ The mutation check (`posix = true` fails the test) comes from the report only.

**hooks.json**
- ✅ The `UserPromptSubmit` group matches the interface exactly, with no matcher and no timeout. The description names the shell guard and the prompt record.

**src/tests/gates/codex-hook-output.test.ts, codex-manifest.test.ts**
- ✅ `TOP_PRE` is `hookSpecificOutput` plus `systemMessage`, and the comment cites the hooks page with both quoted lines (codex-hook-output.test.ts:15-28 hunk). The warned form is rendered by the real `codexGuardOutput`. UserPromptSubmit prints nothing.
- ✅ The manifest gate enumerates `UserPromptSubmit` and pins its group exactly.
- ⚠️ The proof that the gate fails on `"debug": 1` appears only in the report (report lines 24-30).

**src/tests/gates/shell-guard-codex.test.ts**
- ✅ Every case the Tests field names is present: rm -rf ~, the judged ask text, the judged deny, ls silent, the loop guard (one request), the stamp after a prompt, async failure plus the git guard, PostCompact, force push, read-only subagent, apply_patch, user_request and harness, the subagent prompt with C3, and the SubagentStart golden output.

**references/harnesses/codex.md**
- ✅ It records three facts: `exec_command` arrives as `Bash` with a string command, Codex has no ask, and UserPromptSubmit fires inside subagents. Each is checked against research/codex.md:109, 117 and 137.

**src/scripts/test-scope.ts, scripts/check-all**
- ✅ The new test is in the `hooks/` rule and in check-all.

**Extra files** (each justified): src/hooks/fx-turn.ts and turn-journal.test.ts (ruling: numeric agent_id, both harnesses); shell-rules.ts and shell-guard.ts (the PowerShell carry-over); types.ts; test-scope.test.ts. The apply_patch fx-state refusal is covered by its ruling.

**RED**
- ✅ Valid runtime RED is pasted for each test: `rm -rf ~` exits 0 against an expected 2, the parser lacks `command`, the gate saw the preamble, the manifest had no UserPromptSubmit, the numeric agent_id went to the root journal, and test-scope lacked the entry.

### Strengths
- The hard-rule verdict is computed before the crash-handler swap, so a judge-side crash can never turn a hard deny into a warned run (fx-codex.ts:281-284).
- The trust rule holds end to end. `guardShell` reads only the root journal (shell-guard.ts:81, 102), subagent prompts never reach it, and the test checks byte-identity of `s1.jsonl` for both a string and a numeric `agent_id`.
- The apply_patch fx-state refusal fails closed when shell-rules is missing, and it covers Add, Move and relative paths.

### Issues

#### Critical
None.

#### Important

1. **The PowerShell reading covers the hard rules only. The read-only shortcut and comment stripping still read PowerShell text as bash.**
   - **Where:** src/lib/shell-rules.ts:494-497, 471-478, 248-261.
   - **What is wrong:** With `posix: false`, `classifyShell` adds the PowerShell reading only to `hardRule`. It still returns `readOnly(stripComments(command))`, and both of those parse with `posix: true`. `readOnly` rejects `;&|><`, backtick, newline and a dollar-parenthesis substitution, but not an opening parenthesis, an at-sign before one, or an opening brace. In PowerShell argument mode those run code. So on Codex under win32, `echo (Remove-Item -Recurse -Force src)` matches the `echo` allowlist entry (shell-rules.ts:465-466, 478). It runs silently: no judge, no log line.
   - **Second effect:** a bash-escaped `\ ` hides a real PowerShell comment from `stripComments`. Comment text then reaches the judge, which red team I7 forbids. A path written with backslashes, such as `.kube\config`, also slips past the `SECRETS` substring check (shell-rules.ts:463-464, 475).
   - **Why it matters:** the controller context requires the top-level command to be read the PowerShell way on this path. As built, a silent path past the judge stays open on exactly the platform the carry-over targets. The new test only checks hard-rule spellings, so nothing would fail.
   - **Fix:**
     - Thread `posix` into `readOnly` and refuse the shortcut when `!posix` and the text holds an opening parenthesis or brace.
     - Strip comments and read the stamp under both readings (or the non-POSIX one) when `!posix`.
     - Add a faked-win32 process case: `echo (Remove-Item -Recurse -Force src)` with a judge configured must reach the judge (one request).

#### Minor

1. **A Bash call with a non-string command now skips the git guard.**
   - **Where:** fx-codex.ts:264-265.
   - **What is wrong:** `command = input.command` is undefined for a non-string, so the hook exits 0 before `inspect`. Before this change, `inspect` received the raw value and stringified it (src/lib/git-guard.ts:235-236), so an array like `['bash','-lc','git push --force ...']` was still inspected.
   - **Why it matters:** the brief's "no command" rule is about the shell guard. Applying it to the fail-closed git guard narrows that guard with no benefit. ⚠️ research/codex.md:109 documents a string only.
   - **Fix:** pass `ti?.command` to `inspect` as before, and gate only the shell guard on `input.command`.

2. **UserPromptSubmit can exit 2.**
   - **Where:** fx-codex.ts:347-359.
   - **What is wrong:** a parser load failure or a non-object payload denies with exit 2 before the event is known. The brief's interface says UserPromptSubmit "never exits 2".
   - **Why it matters:** on a broken install, every user prompt on Codex is blocked.
   - **Fix:** before denying, check the raw text for `"hook_event_name":"UserPromptSubmit"` and exit 0. Or record a ruling that accepts the deviation.

3. **The Codex test lacks the load-failure and timer-crash cases that the Claude sibling has.**
   - **Where:** shell-guard-codex.test.ts:258-272, compared with shell-guard-claude.test.ts:367-369.
   - **What is wrong:** the Codex test covers only `async`. So `removeListener('uncaughtException', crashed)` (fx-codex.ts:285) and the `off(shellGuardError)` load path (fx-codex.ts:288-290) are untested on Codex. If the swap broke, a timer throw would deny instead of failing open, and no test would notice.
   - **Fix:** port the `load` and `timer` stubs.

4. **The shell guard wiring is copied from fx-pretooluse.ts.**
   - **Where:** fx-codex.ts:166-176 and 276-299, compared with fx-pretooluse.ts:124-126 and 160-175.
   - **What is wrong:** `emit`, `shellGuardOff`, the hard-deny precompute and the handler swap are near-verbatim copies.
   - **Why it matters:** this diff already shows them drifting. The Codex copy gained `posix` and the Claude copy did not. A future fix to one copy will miss the other.
   - **Fix:** keep the local fallback `shellGuardOff`, as each hook must, but at least add a comment in each copy naming its twin.

5. **agent_id is handled two ways in the same file.**
   - **Where:** fx-codex.ts:293 and 311.
   - **What is wrong:** `id` drops a numeric `agent_id` to null, while `subagentId` stringifies it. `guardShell` never reads `agentId` (shell-guard.ts:65), so the parameter is dead.
   - **Fix:** use `subagentId(agentId)`.

6. **The PowerShell path has no unit test.**
   - **Where:** src/lib/shell-guard.test.ts:40-159.
   - **What is wrong:** every case calls `classifyShell(cmd)`. The `posix: false` reading is tested only through the process.
   - **Fix:** add unit cases for `classifyShell(cmd, false)`, including the Important 1 cases.

7. **A harness fact is unsourced.**
   - **Where:** fx-codex.ts:278.
   - **What is wrong:** the comment "On Windows Codex runs the command in PowerShell" is a harness fact. It is not in references/harnesses/codex.md, and research/codex.md (line 65 covers hook commands, via `COMSPEC /C`) does not state it. ADR 0016 requires measured facts with a source.
   - **Fix:** record it with a source, or mark it as an assumption.

8. **The pre-review fix was verified on a narrower scope.**
   - **Where:** report lines 263-274.
   - **What is wrong:** after the apply_patch change to fx-codex.ts, the scope run was the `hooks/` rule only. It did not run check-all, which holds the Codex install run and conformance. ALL GREEN dates from before the fix.
   - **Fix:** re-run `scripts/check-all`.

### Assessment
**Task quality: Needs fixes**

**Reasoning:** the Codex wiring is sound. Guard order, fail-open after the git guard with hard rules kept, the trust rule for subagent prompts, the output gate and the tests at the process seam all match the brief. One Important remains. The carried requirement to read the top-level command the PowerShell way on win32 is met for hard rules only. The read-only shortcut still reads PowerShell as bash, which leaves a silent path past the judge on that platform, and no test covers it.

## Ledger lines
Task 05: minor (deferred): fx-codex Bash with a non-string command now skips the fail-closed git guard; pass ti?.command to inspect.
Task 05: minor (deferred): UserPromptSubmit still exits 2 on parser load failure or a non-object payload, against "never exits 2".
Task 05: minor (deferred): shell-guard-codex lacks the load and timer fail-open cases the Claude sibling has; the uncaughtException swap is untested on Codex.
Task 05: minor (deferred): shell guard wiring (emit, shellGuardOff, handler swap) copied from fx-pretooluse.ts and already drifting (posix).
Task 05: minor (deferred): fx-codex.ts:293 drops a numeric agent_id while subagentId stringifies it; guardShell never reads agentId.
Task 05: minor (deferred): no unit test for classifyShell(cmd, false) in shell-guard.test.ts.
Task 05: minor (deferred): "Codex runs the command in PowerShell on Windows" is unsourced in references/harnesses/codex.md (ADR 0016).
Task 05: minor (deferred): check-all was not re-run after the pre-review apply_patch fix.

Not checked: I did not exercise PowerShell argument-mode `(...)` against the real `words()` parser, because I have no shell. The Important rests on reading `readOnly` (shell-rules.ts:471-478) and `classifyShell` (shell-rules.ts:494-497).

Files: /development/fx/.worktrees/fx-judge-hooks/src/hooks/fx-codex.ts, /development/fx/.worktrees/fx-judge-hooks/src/lib/shell-rules.ts, /development/fx/.worktrees/fx-judge-hooks/src/tests/gates/shell-guard-codex.test.ts
