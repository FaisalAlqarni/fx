### Spec Compliance (✅ / ❌ with file:line; ⚠️ cannot verify)

- ✅ Finding 1, edit path stored relative to the git top level, or absolute when outside it: src/lib/loop-tracker.ts:112-115. The path is no longer redacted, only cut to CAP_COMMAND: src/lib/journal.ts:32. Commands, prompts and messages still go through the redactor: src/lib/journal.ts:30-31. The Stop check resolves a relative path from the root: src/lib/stop-check.ts:25-28, 64. Process gates on both harnesses: src/tests/gates/stop-check.test.ts:180-194, 257-265.
- ✅ Finding 1 callers: `recordToolResult` is the only writer of edit events. All four harnesses reach it the same way: src/hooks/fx-turn.ts:50, src/hooks/fx-codex.ts:392, src/plugins/fx-opencode-v1.ts:467, src/plugins/fx-opencode-v2.ts:434. No other reader of `e.path` expects an absolute path. The only one is src/lib/stop-check.ts:35.
- ✅ Finding 2, all seven listed spellings are hard denials at command position with no judge:
  - find: src/lib/shell-rules.ts:424-431, 441
  - interpreters: src/lib/shell-rules.ts:333-335, 507
  - systemctl, init, telinit: src/lib/shell-rules.ts:443-444
  - lister piped to a remover: src/lib/shell-rules.ts:510-511
  - drive path read the PowerShell way: src/lib/shell-rules.ts:626-628

  The brief's negatives plus six more are tested: src/lib/shell-guard.test.ts:178-185. I traced `find . -delete`, `find ./build -delete`, `systemctl status`, `curl ... -o file`, `python3 -c` and `Remove-Item -Recurse -Force .\dist`. None is refused.
- ❌ Finding 3, "masking ... must never hide an executable payload" (brief, Risks): two spellings hide one. See Important 1 and 2.
- ✅ Finding 3, hard rules read the raw command: src/lib/shell-guard.ts:120 classifies `command`. Masking runs only inside `judgeState`, src/lib/shell-guard.ts:61. Its other caller, src/scripts/guard-calibrate.ts:75, 90, is covered by the ADR 0047 sentence. Brief tests: src/lib/shell-guard.test.ts:455-463.
- ⚠️ Finding 3, `git commit -F -` is masked only when every command in the text is inert. The brief asks for that message to be masked whatever else is in the text (Minor 2).
- ⚠️ Finding 4: the loop is counted at src/lib/loop-tracker.ts:18-35, 43-45. The body is any single command, not "one command matching a check" (Minor 1). The brief's four test cases are present: src/lib/loop-tracker.test.ts.
- ❌ Acceptance "No previously passing gate or golden case changed meaning": the Codex control changed at src/tests/gates/shell-guard-codex.test.ts:255-261 and no ruling covers it. The verdict is under Minor 4.
- ⚠️ RED then GREEN for each finding, and `ALL GREEN` through test_scope with exit 0: claimed in the report and not re-run here (no shell).

### Strengths

- Finding 1 is fixed where the defect is: the redactor never sees a path. The Stop check is unchanged because it already took a relative path from the root.
- The `runsStdin` test keeps `curl | python3 -m json.tool`, `node -e` and `python3 script.py` grey. That exception was the false-refusal risk of the interpreter rule.
- Masking never applies to text holding a dollar-parenthesis substitution or a backtick. The body masking also requires a documentation target, which is stricter than the brief asked and safer.
- Finding 4 works the count out when the journal is read, so the journal still records exactly what ran.
- The implementer reported the gate change and the Finding 4 reading as concerns instead of hiding them.

### Issues

#### Critical

None.

#### Important

1. **src/lib/shell-rules.ts:524, 536-537, 554-555: a heredoc body that becomes `git` arguments through `xargs` is hidden from the judge.**
   - **What is wrong.** `resolve` strips `xargs` as a wrapper (src/lib/shell-rules.ts:323), and `INERT` holds `git` with any subcommand. So `cat <<'EOF' | xargs git` has every command "inert", and the body is masked. That body can be `-c "alias.x=!sh payload" x`, and git runs a `!` alias through a shell. The same path covers `cat <<'EOF' | xargs tee`: tee gets no file arguments, so the docs-only check passes, and tee then truncates whatever files the hidden body names. A third case: `cat > notes.md <<'EOF' ... EOF` followed by `git -c alias.x='!sh notes.md' x` passes the inert test too, so the script's body is masked while the next line runs it.
   - **Why it matters.** The brief's Risks forbid exactly this. The hard rules never read a body fed to `cat` (src/lib/shell-rules.ts:498 checks only shell sinks), so before this task the judge was the only reader of that text, and now it reads a placeholder.
   - **Fix.**
     - Treat a program reached through `xargs` (or any wrapper) as not inert.
     - Count `git` as inert only for `commit`, and fold in the codebase's own check for config options that run programs (src/lib/shell-guard.ts:46). Better, refuse masking whenever git carries a global `-c`.
     - Add the three spellings above to the "kept" list in src/lib/shell-guard.test.ts:459.

2. **src/lib/shell-rules.ts:542-550: commit-message masking ignores what else the text runs.**
   - **What is wrong.** The `-m` and `--message` mask runs before the `inertOnly` test at line 554 and does not depend on it. So in `git commit -m '<payload>' && git log -1 --format=%B | sh`, the judge sees a placeholder where the text `sh` will execute. The hard rules do not catch it either: `| sh` is a rule only after a downloader.
   - **Why it matters.** It breaks the same Risks line: text consumed by a shell is hidden.
   - **Fix.** Mask a commit message only when no command in the text is a shell, interpreter, `eval`, `source` or `xargs`. Reusing the `inertOnly` test, with git limited as in Important 1, would do it; `git commit ... && git push` still qualifies. Add the `git log | sh` spelling as a kept case.

#### Minor

1. **src/lib/loop-tracker.ts:18, 24-34: Finding 4 counts loops more widely than the brief allows.**
   - **What is wrong.** The implementer calls this a narrower reading, but it is wider. The brief's Interfaces and the state.md ruling both say a loop "whose body runs one check" counts as runs "of that check". In this design, a check is a `.fx.json` check command. The code counts any single-command body. Two wrong results follow:
     - `until npm test; do sleep 1; done` counts its body, so a failed run nudges "`sleep 1` has failed 3 times". The condition is what repeats, not the body.
     - Every `while`, `until` or C-style `for` loop is charged the full threshold (line 30), so one failed loop fires the nudge at once, even a C-style loop that ran once.
   - **Fix.** Ask the controller to rule. The smallest change is to count while and until loops only when the condition is `true` or `:`, and to parse a C-style count or skip it. Filtering on the `.fx.json` check would match the brief's words, but loops in repositories without `.fx.json` would then never count.

2. **src/lib/shell-rules.ts:554: a `git commit -F -` heredoc is masked only when the whole text is inert.**
   - **What is wrong.** The brief lists the `-F -` message beside `-m`, which is masked unconditionally. So `npm test && git commit -F - <<EOF ... EOF` keeps its message, and the judge can still refuse it on the quoted text. That is the false refusal Finding 3 set out to remove.
   - **Fix.** Once Important 1 and 2 are fixed, give the `-F -` body the same gate as `-m`.

3. **src/tests/gates/stop-check.test.ts:39, 183-193: the Finding 1 gate never reaches the git top-level branch, and its token check proves little.**
   - **What is wrong.** The scratch cwd is not a git repository, so `repoRoot` returns the cwd. A session whose cwd is a subdirectory of the repository is never exercised. The token assertion at line 193 only checks that the token is absent, so it passes even if the command line was never written to the journal.
   - **Fix.** Run one case with `git init` and the cwd in a subdirectory. Assert that `[REDACTED]` is present in the command line.

4. **src/tests/gates/shell-guard-codex.test.ts:255-261: the gate control now expects a refusal.**
   - **What is wrong.** The change is required by the brief's Finding 2 interface ("on every harness"), and the new expectation is stricter, not weaker. But the brief's acceptance line says no gate case may change meaning, and no ruling covers this change. It also reverses the N1 rule recorded at src/lib/shell-rules.ts:480-485 for any command naming a drive path.
   - **Fix.** The controller records a Ruling. The N1 comment block gets a line pointing at DRIVE_PATH.

5. **src/lib/loop-tracker.ts:24: the benchmark's own live spelling is still not counted.**
   - **What is wrong.** The live retries were written as `for ...; do node --test 2>&1 | grep ...; done`. The pipe in the body excludes them from the count, and such a loop usually exits 0 anyway, as the report's concern 3 says. The controller's S2 re-run will probably still show 0 nudges.
   - **Fix.** Note in state.md that Finding 4 is fixed only for the brief's spelling. A pipeline-aware count would need the inner command's output, not just the loop's exit code.

6. **src/lib/shell-rules.ts:424-431, 443, 510-511: some spellings next to the new rules are still not refused.**
   - **What is wrong.**
     - `find -- / -delete`: the `--` ends the scan for starting points.
     - `find / -exec sudo rm {} +`: the program after `-exec` is `sudo`, not `rm`.
     - `systemctl -H host reboot`: the value of `-H` is taken as the first plain argument.
     - `ls / | xargs rm -rf`: `/` is not a home or drive-root target.
     - The win-wipe reason says "recursive" even for `ls ~ | xargs rm`, which is not recursive.
   - **Fix.** Add the spellings to the rules with tests, or record them as known gaps.

### Assessment

**Task quality: Needs fixes.**

**Reasoning.** Findings 1 and 2 are done as specified, with negative tests, and I found no new false refusal of an ordinary project command. Finding 3 breaks the brief's main safety condition in two ways:
- a heredoc piped through `xargs git` (or `xargs tee`) is masked even though it becomes executed arguments;
- a commit message is masked even when a later command in the same text pipes it into `sh`.

In both cases the judge is the only layer that could have seen the payload, and now it cannot. Both are small changes to the inert test in `maskForJudge`, each with a test case. Finding 4 and the Codex gate change need a controller ruling, not code, before the task closes.

## Ledger lines

Task 14: minor (deferred): loop-tracker counts any single-command loop body, not a check; until/while loops credit the body (`sleep 1`) and while, until and C-style loops charge the full threshold on one failure (loop-tracker.ts:18-34).
Task 14: minor (deferred): `git commit -F -` heredoc is masked only when every command is inert, unlike `-m`; `npm test && git commit -F -` is still judged on its message (shell-rules.ts:554).
Task 14: minor (deferred): the Finding 1 gate cwd is not a git repo, so the top-level branch is untested, and the token-redaction check is absence-only (stop-check.test.ts:39, 193).
Task 14: minor (deferred): the Codex gate control flipped to expect a refusal with no recorded ruling; required by the "every harness" interface but contrary to the acceptance line (shell-guard-codex.test.ts:255-261).
Task 14: minor (deferred): the benchmark's live loop spelling (body piped to grep, exit 0) is still not counted, so the S2 re-run will likely show 0 nudges (loop-tracker.ts:24).
Task 14: minor (deferred): rule gaps: `find -- / -delete`, `find / -exec sudo rm`, `systemctl -H host reboot`, `ls / | xargs rm -rf`; the win-wipe reason says "recursive" for a non-recursive pipe (shell-rules.ts:424-431, 443, 510-511).

Not checked: no tests were run (no shell); the RED, GREEN and `ALL GREEN` claims come from the report only. Masking in PowerShell mode was traced only for the parenthesised and dollar-parenthesis forms.
