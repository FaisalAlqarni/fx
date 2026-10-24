### Finding verdicts

**Review Important 1 (the PowerShell reading on readOnly, stripComments and the stamp): ADDRESSED**
- `readOnly(text, posix)` turns off the shortcut under `!posix` when the text holds an opening parenthesis or an opening brace (src/lib/shell-rules.ts:507). That also covers the at-sign form.
- Secret paths are compared with backslashes turned into slashes (shell-rules.ts:509). `words()` is a regex that keeps backslashes (shell-rules.ts:491-493), so `.kube\config` becomes `.kube/config` and matches.
- `classifyShell` passes `posix` to both `stripComments` and `readOnly` (shell-rules.ts:531). `guardShell` passes `input.posix` to `normalizeCommand`, `stripComments` and `overrideReason` (src/lib/shell-guard.ts:83 and the hunk at diff 1478).
- Hand trace of `npm publish\ # x` under `posix: false`. The backslash is a literal character (the `c === '\\' && posix` branch is skipped). The space ends the word, and the `#` is not inside a word, so it opens a comment. The comment is stripped.
- Covered by a faked-win32 process case (shell-guard-codex.test.ts, diff 1888-1902) and by unit cases (shell-guard.test.ts, diff 766-771 and 801-805).
- The fix reads only the PowerShell way here. See New breakage 2.

**Lens SEC 1 = SF 2 (a non-string Bash command): ADDRESSED**
- The git guard gets the raw value: `const raw = ti?.command`, then `inspect(raw, cwd)` (src/hooks/fx-codex.ts:287-294).
- After the git guard, a non-string value is denied with a stderr line (fx-codex.ts:300). An empty or missing command still exits 0 (fx-codex.ts:288).
- The implementer's correction is right. `inspect` builds the string `${command}` (src/lib/git-guard.ts:236), so an array becomes `bash,-lc,git push ...`. `splitSegments` splits only on `;`, newline, `|` and `&` (git-guard.ts:126-127), so the first word is `bash,-lc,git` and the guard allows it. The lens premise that "a throw became a deny" was wrong. The array test asserts that the refusal text comes from the type check (diff 1933-1940).
- Not handled: the lens's side remark that tool names other than `Bash` (`shell`, `local_shell`) go unguarded. The lens marked it unverified and its Fix did not ask for it. Logged below as an observation.

**Lens SEC 2 (the PowerShell lexer): ADDRESSED for every named spelling**
- I traced each spelling by hand under `posix: false`. All of them reach `win-wipe` through the second `hardRule` call in `classifyShell` (shell-rules.ts:529).
  - `Remove-Item <# x #> -Recurse -Force C:\`: at shell-rules.ts:158-165, `<` followed by `#` ends the word and records a comment from `<#` to just past `#>`. The words are `Remove-Item -Recurse -Force C:\`. The trailing backslash is literal because the posix-only branch at 176 is skipped.
  - ``Remove-It`em`` and ``-Rec`urse``: at 167-174 the backtick adds the next character to the word and skips past it, giving `Remove-Item` and `-Recurse`.
  - A backtick before a newline: at 168 the newline is skipped (CRLF at 169). The top-of-loop newline check at 127 never sees it, so `C:\` stays in the same command.
  - ``"-Rec`urse"``: inside double quotes, the branch at 201-203 adds the next character.
- This lexer is shared with the cmd reading, which is where it breaks something. See New breakage 1.

**Lens SEC 3 (exact-match wipe rule): ADDRESSED for every named spelling**
- `PS_RECURSE` (shell-rules.ts:320) accepts every prefix of `-recurse` starting at `-r`, ignores case, and allows `:$true`.
- The rule now applies to `rd`, `rmdir` and `erase` (shell-rules.ts:408).
- `PS_WIPE_TARGET` (shell-rules.ts:319) accepts these forms:
  - `~\*`, `$HOME\*` and `$env:USERPROFILE\*`;
  - `${HOME}` (the substitution branch keeps it as one word);
  - `C:/`.
- `DRIVE_ROOT` also accepts `/` (shell-rules.ts:317).
- Unit cases cover each spelling (diff 778-789). Spellings still missing are logged as an observation.

**Lens SEC 4 (iex, Invoke-Expression, EncodedCommand): ADDRESSED**
- `iex` and `invoke-expression` push their arguments, with any `-Command` prefix removed, as an inner command (shell-rules.ts:382).
- Both are now in `WINDOWS_SHELLS`, so the inner command is read with `posix: false` (shell-rules.ts:448).
- Trace of `iex "Remove-Item -Recurse -Force C:\"`. Under `posix: false` the backslash inside the double quotes is literal, so the word closes at the last quote. The inner command matches `win-wipe`.
- `-EncodedCommand` and its prefixes are decoded from base64 as UTF-16LE (shell-rules.ts:379-381). Text that does not decode stays grey, and a grey command goes to the judge.
- `-File` is not read, which is reasonable because the file cannot be checked statically. Variable indirection is still a gap and is logged as an observation.

**Lens SF 1 (a failed prompt record leaves the older prompt for the judge): NOT ADDRESSED (partial)**
- `appendPrompt` retries with a null-text prompt when the first write fails (src/lib/journal.ts:52-54). `lastUserPrompt` returns null for a null-text prompt (journal.ts:78-79), and the stamp rule needs `text !== null` (shell-guard.ts:85). So the marker makes the judge stricter, not looser. That part is correct.
- The finding names "a full disk or bad permissions" as the cause. In both cases the second `appendFileSync` to the same file fails for the same reason, so nothing is written and the judge still reads the older prompt. The implementer says so (report line 295).
- Both tests trigger the failure with a stub `redact` that throws (diff 1977, 2013). That is the one cause the null retry fixes, because the retry skips redaction.
- Cheap next step: when the retry also fails, truncate or remove the session journal. Truncating works on a full disk, and removing works whenever the directory is writable. Add a test that makes the journal file read-only, or the directory read-only.

**Lens SF 3 (no decision-log line on fail-open, and a handler that can throw): ADDRESSED**
- `describe()` catches a message getter or `toString` that throws (fx-codex.ts:181).
- `shellGuardOff` appends a `guard-error` / `allow` line using only `fs` and `path`, with the state directory found once when the hook loads (fx-codex.ts:175-197).
- The same change is mirrored in src/hooks/fx-pretooluse.ts:139.
- Tested with these crash cases, each asserting exactly one log line: async, load, timer and a hostile error on Codex (diff 1951-1970), and hostile, load, async and timer on Claude (diff 1826-1840).
- Two gaps are logged as Minor (New breakage 3).

### New breakage in the fix diff

1. **[Important] The new backtick escape is also applied to the cmd reading, so a `cmd /c` wipe that was refused is now missed.**
   - `parse(..., false)` serves both PowerShell and cmd (shell-rules.ts:62-65), and cmd's inner string is read with `posix: false` (shell-rules.ts:448).
   - Example: ``cmd /c 'echo `& rd /s /q C:\'``. cmd treats the backtick as a literal character and `&` as a command separator, so it runs `rd /s /q C:\`.
   - The new branch at shell-rules.ts:167-174 consumes the backtick and the `&` into the word `&`. The result is one `echo` command, no separator, and no `win-wipe`.
   - Before this diff, the backtick was an ordinary word character, so the `&` split the commands and `rd /s` was refused.
   - This contradicts the report's claim that under cmd the backtick change "refuse[s] more there, never less" (report line 423).
   - Same root, pre-existing: in the cmd reading, `#` and `<#` are treated as comments, so ``cmd /c 'echo #& rd /s /q C:\'`` is also missed.
   - Fix: a separate cmd reading in which backtick, `#` and `<#` are literal.
   - The command still falls to the judge as grey, so this is not a silent allow, but a hard rule has regressed.
   - It reaches both harnesses on Windows.
   - No test covers it.

2. **[Minor] On win32 the read-only shortcut now trusts the PowerShell reading alone.**
   - Example: `echo a\ #$(npm publish)`.
     - Read the PowerShell way, the backslash is literal and `#$(npm publish)` is a comment, so the stripped text is `echo a\ ` and the command is allowed as read-only. It runs silently with no judge.
     - Read the bash way, `\ ` is an escaped space, `#` is part of the word, and `npm publish` runs.
     - Before this diff the shortcut used the bash reading, saw a dollar-parenthesis substitution and refused the shortcut.
   - This only matters if Codex on Windows runs something other than PowerShell. That fact is still unsourced (review minor 7, deferred).
   - Fix: on win32, allow read-only only when both readings agree. That is one extra `readOnly` call at shell-rules.ts:531.

3. **[Minor] The crash log line skips the rules `logDecision` applies.**
   - `shellGuardOff` writes `decisions.jsonl` directly (fx-codex.ts:186-197, fx-pretooluse.ts:139).
   - It skips three things `logDecision` does (decision-log.ts:1-4, 30-37):
     - redaction (`unavailable` holds raw error text);
     - rotation;
     - tightening permissions on an existing directory on POSIX.

4. **The other risks the brief named are clean:**
   - No new false positive on Linux or macOS. The widened wipe rule adds `rd`, `rmdir` and `erase`, none of which takes `-r` on POSIX. Its `rm -r` targets are already in `ROOT_OR_HOME`. Backtick, `<#` and the two new targets are read only under `posix: false`.
   - The non-string deny cannot hit a real Codex Bash call, because the research documents a string command.
   - The null-text marker only makes the judge stricter. `currentTurn` has no production caller.
   - The Claude hook mirror changes only the crash handler, and it passes its test.

### Tests evidence
- The report has RED, GREEN and the commands for every item. I had no shell, so all output below is as the report pasted it.
- **Unit RED is incomplete.** Only 17 of the 23 unit failures are pasted (report 302-323).
  - The missing six are the three other SEC 2 spellings (the block comment, the line continuation and the quoted backtick), SEC 3 `-r` and `rmdir`, and SEC 4 `iex`.
  - My count of the cases that would fail on the old code is exactly 23, which matches the runner's own count line. That supports the claim, but those six lines are not in evidence.
- **Process-level RED** is pasted for:
  - I1 (`7 !== 8`);
  - SEC 1 (the golden test, then `0 !== 2`);
  - SF 3 (`async2: 0 !== 1`);
  - SF 1 on Codex (the judge state still carried `user_request: "publish it"`) and on Claude (`2 !== 3`).
- **Weak spots in the evidence:**
  - The Claude crash-handler mirror got its RED after the code was written, by stashing the change. The report discloses this. It proves the test fails on the old handler, not that the test drove the change.
  - The SF 1 tests only cover a throwing redaction, not a failed write.
  - The new parameters on `stripComments`, `overrideReason` and `normalizeCommand` have no pasted RED.
- **GREEN is trimmed.** The headers for the Codex, turn-journal and journal tests are missing from the paste (report 375-392).
- **check-all did not pass on the commit as it stands.** The ALL GREEN run had `findings/05-review.md` moved out of the tree. That file as committed in c672687 still has the unclosed-parenthesis wording (diff 193), so `check-all` at c672687 fails `check-prose`. The working-tree copy has been reworded, but I cannot tell whether that rewording is committed.

## Ledger lines
Task 05: fix round 1/5 (6 addressed, 2 open: SF 1 stale prompt survives when both journal writes fail (full disk, bad permissions); new Important: the non-POSIX backtick escape also applies to the cmd reading and misses ``cmd /c 'echo `& rd /s /q C:\'``; commits 11d5028..c672687)
Task 05: minor (deferred): on win32 the read-only shortcut trusts the PowerShell reading alone; `echo a\ #$(npm publish)` is silently read-only if the shell is bash; require both readings.
Task 05: minor (deferred): the shellGuardOff crash log line bypasses logDecision's redaction, rotation and POSIX chmod tightening.
Task 05: minor (deferred): residual PowerShell wipe spellings fall to the judge: Unicode dash parameter prefixes U+2013 to U+2015, bare backslash or slash as the current drive root, and the pwsh 7 escape for a code point inside double quotes.
Task 05: minor (deferred): iex reached through a variable or a pipe (assign then `iex $c`, or a string piped into iex) is not read as an inner command.
Task 05: minor (deferred): Codex PreToolUse handles only tool_name `Bash`; any other shell tool name (`shell`, `local_shell`) is unguarded if Codex can send it (lens SEC 1 side note, unverified).
Task 05: minor (deferred): check-all ALL GREEN was run with findings/05-review.md moved out; at c672687 that file still fails check-prose.
Fixed ledger number: 6

I did not run anything; every verdict comes from reading the code and tracing the lexer by hand. The cmd backtick regression is the one finding that needs a code change before this task can close.
