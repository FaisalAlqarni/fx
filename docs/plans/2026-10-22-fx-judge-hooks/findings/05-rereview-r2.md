### Finding verdicts

**(a) New breakage 1: the cmd reading took the backtick escape, and the hash and less-than-hash variants: ADDRESSED**

- `parse` now takes a third argument, `cmd`, and sets `ps = !posix && !cmd` (src/lib/shell-rules.ts:68-69). In the cmd reading:
  - a hash never opens a comment (:154);
  - the less-than-hash block comment is PowerShell only (:161);
  - the backtick escape is PowerShell only, both outside quotes (:177) and inside double quotes (:211);
  - a single quote is a plain character (:194);
  - the caret escapes the next character (:170-176).
- Hand trace of ``cmd /c 'echo `& rd /s /q C:\'`` with posix true:
  - The bash reading gives the words `cmd`, `/c` and the single-quoted string.
  - `resolve` pushes the text after `/c` as the inner command (:394-396).
  - :460 calls `hardRule(s, 1, false, true)`, which is the cmd reading.
  - The backtick matches none of the escape branches, and `special` is false because it needs `posix` for a backtick (:125). It becomes the one-character word made of a backtick (:270).
  - `&` is not a redirect, so :256-266 ends the list. Next come the words `rd /s /q C:\`. The backslash is literal because :186 needs `posix`.
  - :420 matches `/s` and `DRIVE_ROOT`, so the result is `win-wipe`.
- Hash spelling: the guard at :154 is skipped, `#` is a word character, and `&` splits the commands, so the result is `win-wipe`.
- Less-than-hash spelling: :161 is skipped, `<` is a redirect (:247-254), `#` becomes the redirect target, and `&` splits, so the result is `win-wipe`.
- The extra spellings also reach `win-wipe`:
  - In ``cmd /c "echo '& rd /s /q C:\ '"``, the single quote is a plain word, so `&` splits.
  - In ``cmd /c 'r^d /s /q C:\'``, the caret branch builds the word `rd`.
- How the reading is chosen (:456-461). The string a program receives is read that program's way: `!windows` gives bash for anything that is not a Windows shell, and `r.prog === 'cmd'` gives the cmd reading. The raw outer text is always read the PowerShell way (:457). A substitution or heredoc keeps the reading of the text around it (:438, :470). I traced the nested cases:
  - **pwsh -c inside cmd.** ``cmd /c 'pwsh -c Remove-It`em -Recurse -Force C:\'``: the cmd reading keeps the backtick in the word. `resolve` joins the arguments after `-c` (:386-388), and :460 reads them the PowerShell way, which gives `Remove-Item` and `win-wipe`. That is right, because cmd passes the backtick through to pwsh.
  - **Single quotes inside cmd.** ``cmd /c "pwsh -c 'Remove-Item -Recurse -Force C:\'"`` used to be refused and is now grey. cmd splits on the single quotes. pwsh joins its arguments into the quoted text, a string literal, which it prints and does not run. This is a false refusal removed, not a new miss. This rests on my reading of pwsh `-Command`; I did not run it.
  - **cmd /c inside powershell -Command.** ``powershell -Command 'cmd /c "echo `& rd /s /q C:\"'``: the inner text is read the PowerShell way. Inside double quotes the backtick turns into a plain ampersand (:211). cmd then receives `echo & rd /s /q C:\`, the cmd reading splits it, and the result is `win-wipe`. That matches what PowerShell does with a double-quoted string before cmd sees it.
- Covering tests: src/lib/shell-guard.test.ts, diff lines 507-520, five spellings, each under both posix values.

**(b) Lens SF 1: stale prompt when both journal writes fail: ADDRESSED (with one disclosed residual)**

- `appendPrompt` (src/lib/journal.ts:54-63) works through four steps:
  1. it writes the prompt;
  2. if that fails, it writes the null-text marker;
  3. if that fails, it truncates `<sessions>/<key>.jsonl`;
  4. if truncation fails, it removes the file with `rmSync(force)`, and writes a stderr line only if the removal also fails.
- **Full disk:** truncation frees the file, so `lastUserPrompt` (:84-88) finds no prompt.
- **Read-only file:** truncation fails, removal succeeds in a writable directory, and the judge state has no `user_request` (shell-guard.ts:102-103).
- **Residual:** when both the file and the directory are read-only, the removal fails and the older prompt survives. The report discloses this (report line 443). It is rare, and only a stderr line marks it.
- **Scope of the wipe:** it touches only the session's own journal.
  - `journalKey` reduces the key to the characters A-Z, a-z, 0-9, dot, underscore and hyphen (journal.ts:17), so the key cannot leave the sessions directory.
  - `appendPrompt` is only called with the root key: src/hooks/fx-turn.ts:30 (the subagent branch at :29 uses `appendEvent`) and src/hooks/fx-codex.ts:359-360 (subagents return at :358).
  - Subagent journals are never truncated. `rmSync` is not recursive.

### New breakage in the fix diff

1. **[Minor] The wipe also deletes recent refusals, which switches off the loop guard. The new comment says the opposite.**
   - journal.ts:51-53 says that losing the refusals "only makes the guard stricter, since the stamp needs one". That holds for the stamp (shell-guard.ts:85).
   - The loop guard at shell-guard.ts:87 reads the same `deny` events from the last 10 minutes. On Codex it denies outright, and on Claude it asks.
   - After a wipe, a command refused a minute ago goes back to the judge. This is looser.
   - The trigger is any second write failure, including transient ones: on Windows, a scanner or another hook holding the file gives EBUSY or EPERM.
   - The stricter judge context (no `user_request`) offsets this in part, but the comment states an invariant the code does not keep.
   - Options: fix the comment, or after truncating, write back the deny and ask lines from the last `LOOP_GUARD_MS`.
2. **[Minor, pre-existing, not introduced by this diff] The cmd reading still treats dollar-brace as PowerShell variable syntax, with the same root as (a).**
   - `special` (:125) fires on a dollar sign followed by an opening brace in every reading. `substitution` then consumes up to the closing brace (:115-118, `closeBrace` :51-58) and pushes nothing to `subs`.
   - ``cmd /c 'echo ${ & rd /s /q C:\ }'`` therefore lexes as one `echo` command. cmd splits on `&` and runs `rd /s /q C:\ }`.
   - It falls to the judge as grey, so it is not a silent allow, but it is a hard-rule miss of the same class as the Important that was just closed.
   - The dollar-parenthesis form is caught, because its content goes to `subs` and is read again the cmd way (:121, :438).
   - Fix: gate `special` on `!cmd`.
3. **No false refusal from the two extra spellings.**
   - ``cmd /c 'echo ^& rd /s /q C:\'`` produces the word made of a single ampersand and no separator, which matches cmd's caret escape.
   - Single quotes as plain characters only ever split cmd text the way cmd itself does.
   - Both branches are gated on `cmd`, which is set only when the resolved program is `cmd` (:460). Neither bash nor PowerShell changes, and nothing changes on Linux or macOS.

### Tests evidence

- I had no shell. Everything below is as the report pastes it (report 445-513).
- **RED for (a):** pasted for the backtick, hash and less-than-hash spellings, six lines and "6 cmd cases wrong".
- **RED for the single-quote and caret spellings:** comes from a probe written after the fix against "HEAD's built lib/shell-rules.js". The probe script and the way that file was obtained are not shown. If the working tree had already been rebuilt, the probe would not have printed grey, so this evidence depends on a step nobody can see.
- **RED for (b):** "no older prompt is left", with actual false.
- **GREEN:** both single tests print ok and exit 0. `check-all` is ALL GREEN with no file moved aside, then the `test-scope` tail exits 0.
- **Gaps in the tests:**
  - The cmd test case with posix false adds nothing new. `classifyShell` runs the bash reading first (:541), and that reading already matches, so the PowerShell top-level route to cmd is never isolated.
  - Not tested: the nested readings (pwsh -c inside cmd, cmd /c inside powershell -Command with double quotes), and the caret-ampersand case that must not be refused.
  - The SF 1 process test depends on mode 0400 blocking writes. Run as root, as in a container CI, the append succeeds and the test fails. The test is also skipped on win32, so the Windows `rmSync` path is untested.
  - Also untested: the truncation branch itself (full disk), the stderr line when removal fails, and the Claude Code hook (it shares `appendPrompt`; no new test there).

## Ledger lines
Task 05: fix round 2/5 (2 addressed, 0 open: none; commits d79a269..e89d50b)
Task 05: minor (deferred): appendPrompt's journal wipe also drops deny events from the last 10 minutes, so the loop guard (shell-guard.ts:87) stops firing; the comment at journal.ts:51-53 says the wipe only makes the guard stricter.
Task 05: minor (deferred): when both the session journal and the sessions directory are read-only, the removal fails and the older prompt still reaches the judge; only a stderr line marks it.
Task 05: minor (deferred): the cmd reading still treats dollar-brace as PowerShell syntax; ``cmd /c 'echo ${ & rd /s /q C:\ }'`` misses win-wipe and goes to the judge (pre-existing, same root as the closed Important; gate `special` on `!cmd`).
Task 05: minor (deferred): no tests for the nested readings (pwsh -c inside cmd, cmd /c inside powershell -Command), the caret-ampersand non-refusal, the truncation branch, or the stderr path when removal fails; the SF 1 process test fails when run as root and is skipped on win32.
Task 05: minor (deferred): RED for the single-quote and caret cmd spellings comes from a probe written after the fix whose script and source file are not shown.
Fixed ledger number: 5

I did not run anything. I traced the lexer by hand from src/lib/shell-rules.ts and src/lib/journal.ts at the current worktree. The pwsh `-Command` behavior behind the single-quote point is my reading of how pwsh works, not something I measured.
