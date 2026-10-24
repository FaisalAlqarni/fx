### Finding verdicts

**Review findings**

- **I1 (comment stripping hid a command): ADDRESSED.** `classifyShell` now runs `hardRule` on the raw command, not the stripped one (`src/lib/shell-rules.ts:483`). The lexer reads `$'...'` with backslash escapes, so `\'` does not close it (`shell-rules.ts:165-176`). `stripComments` and `overrideReason` use the same lexer. Covered by unit case `review-1` and the stripper mirror assert.
- **I2 (quoted separators gave false hard denials): ADDRESSED for the cited spellings.** Separators, `>` and newlines inside quotes now stay part of the word, and all six `review-2` cases are grey. The same class comes back through the second reading the fix added; see N1.

**Security lens findings**

- **C1 (newline in a repo command): ADDRESSED.** `repoCommand` rejects CR or LF in the trimmed, comment-stripped text before any whitespace is collapsed (`src/lib/shell-guard.ts`, `repoCommand` first line). The test-first RED came from `make test\nnpm publish`. That case also passes on the I7 exact-match rule alone, so the discriminating case (`scripts/test-scope lib/a.js\nnpm publish`) was added later and proven by revert only.
- **C2 (`-c` missed past wrappers and flags): ADDRESSED.** `resolve` skips assignments, reserved words and wrappers, then takes the `-c` string from a short option cluster containing `c`. That string is lexed as its own command (`shell-rules.ts:331-342`, recursion at 407-410). A residual gap is in the Minor list: a shell option that takes a value stops the search.
- **I3 (hidden programs): ADDRESSED.** Covered: `RESERVED`, the added wrappers, `eval`, `su -c`, `env -S`, `cmd /c`, `powershell -c`, lowercased base names with `.exe` dropped, `$X` substitution, and the content of every `$(...)` and backtick. A residual gap is in the Minor list: `${...}` content is not scanned.
- **I4 (quoted or arithmetic `<<` opened a heredoc): ADDRESSED.** A heredoc now opens only on an unquoted `<<` redirect token. Arithmetic is consumed as a substitution, and a heredoc body is checked only when a shell or `eval` reads it (`shell-rules.ts`, `rulesOf` second loop).
- **I5 (pipe-to-shell gaps): ADDRESSED.** Changes: `|&` counts as a pipe, the shell sets are unified, and the sinks add `source`, `.`, `powershell` and `pwsh`. Process substitution, here-strings, `eval "$(curl)"`, iex with a download word, and `curl.exe` are all caught. Unit cases `lens-I5`.
- **I6 (padding past the judge's cap): ADDRESSED.** I re-read `redact`: it returns `out.slice(0, cap) + "[...]"` when the text is too long (`src/lib/redact.ts:231`), so the `length > CAP_COMMAND` test at `shell-guard.ts:99` really fires. The command is then asked about without a judge call (`judge-unsure`).
- **I7 (repo-command matching): ADDRESSED within the ruling.** `matchRepoCommand` now requires a word boundary unless the template glues the placeholder to its prefix (`src/lib/evidence.ts:10-25`). A fixed template must match exactly, and placeholder arguments may not start with `-` or hold a `..` segment. Reading `.fx.json` from the session root was ruled not required.
- **I8 (forged prompt in the journal): ADDRESSED, with new breakage N3.** A new `fx-state` hard rule refuses shell commands that name the state directory (`shell-rules.ts:442-444, 483`). Write, Edit, MultiEdit and NotebookEdit into it are refused (`src/hooks/fx-pretooluse.ts:184-185`).
- **I9 (repo config makes git run programs): ADDRESSED.** `gitRunsRepoProgram` sends `git status|log|diff|show|blame` to the judge when there is a local or worktree hit for the program-running keys, or when the `git config` check itself fails (`shell-guard.ts`; called from `decide` at line 76).
- **I10 (hard rules depended on the judge side): ADDRESSED.** `shell-rules` imports only `fx-paths`, and `fx-paths` imports only `os`, `path` and `./env`. `env` has no `throw` (I re-read it). The hook loads `shell-rules` fail-closed (`fx-pretooluse.ts:89-97, 158`). It runs `classifyShell` while the deny-on-crash handler is still installed (line 160). The swapped-in handlers re-emit the hard reason with exit 2 (lines 163-177).

### New breakage in the fix diff

**N1 [Important]: the second (non-POSIX) reading brings back review I2's false hard denials, with no override.**
- `hardRule` runs every rule on both readings (`shell-rules.ts:433`). In the non-POSIX reading a backslash escapes nothing and `$'` is not a quote.
- Example: the standard bash apostrophe idiom `git commit -m 'it'\''s done; reboot later'` is one word in bash. In the second reading, the `;` falls outside the quotes and `reboot` becomes the program, so the call is refused as `power`.
- The same happens with an odd number of `\"` inside double quotes, and with `$'it\'s; reboot'`.
- No negative test has an escaped quote. Claude Code's Bash tool runs bash on every platform, so the PowerShell reading belongs only on strings that `powershell`, `pwsh` or `cmd` receive.
- Fails integrity: no false positives on commit messages.

**N2 [Important]: in the POSIX reading, a line continuation followed by whitespace hides the program.**
- `if (c === '\\' && posix) { begin(i); if (next === '\n') { i++; continue; }` (`shell-rules.ts:157-159`) marks a word started before it skips the continuation. The next space then pushes an empty word.
- Example: in `make build && \<newline>  sudo reboot` the empty word becomes the program, so `reboot` is only an argument. This is the most common way to lay out a continuation.
- Today the non-POSIX reading masks it. Both readings miss when an odd `\"` comes earlier: `echo "\"" ; \<newline>  rm -rf ~` classifies grey. Under the default no-judge setup it is then allowed, and bash runs the `rm`.
- Fixing N1 as suggested exposes this bug directly, so fix N2 first: do not call `begin` for a continuation.
- Fails integrity: the hard rules are final.

**N3 [Important]: the `fx-state` refusal is far broader than the state directory. This is my rating of the implementer's concern.**
- The rule matches any `.local/state` path and the bare word `XDG_STATE_HOME`, anywhere in the raw text: arguments, commit messages, comments and heredoc bodies (`shell-rules.ts:443, 483`).
- Examples refused with no override: `grep -rn XDG_STATE_HOME src` (fx's own `env.ts` and `fx-paths.ts` use that name), `ls ~/.local/state/nvim`, and `git commit -m "honour XDG_STATE_HOME"`.
- The lens asked that such a command be "never read-only", which means judged, not hard-denied. The report lists this under "Not done as written" and calls it deliberate.
- Fix: hard-deny only the fx directory itself (the resolved `stateDir`, `.local/state/fx`, `$XDG_STATE_HOME/fx`, `%LOCALAPPDATA%\fx`). Send other mentions to grey.
- The concern's second half (dodging the rule with a relative path after `cd`) is real, and a glob (`st*`) or a split quote (`.lo''cal`) dodges it too. I rate that Minor: those commands are grey, so a configured judge sees them, and with no judge there is no judge for a forged prompt to loosen. It is in the Minor list.

### Tests evidence

- **Per fix:**
  - Unit RED, run test-first with `test-one.sh src/lib/shell-guard.test.ts`, covers review I1 and I2 and lens C2, I3, I4, I5 and the I8 shell rule. Output: `AssertionError: 49 classifier cases wrong`, with sample lines. GREEN: `shell-guard.test.js: ok`.
  - Evidence RED for I7, test-first: `true !== false`. GREEN: `evidence.test.js: ok`.
  - Gate RED, test-first, for C1 only: `14 !== 15`.
- **Proven by revert, not test-first RED:** the later gate cases for C1 (placeholder newline), I7, I6, I8 (Write), I9 and I10 (judge-side) were each shown to fail with that one fix reverted on a scratch copy. The report says so.
- **Not run against a revert at all:** the I10 `judge-dep` case and the broken-`shell-rules` case.
- **No test exists for:**
  - the Write deny when `shell-rules` fails to load;
  - the NotebookEdit fx-state refusal;
  - the `gitRunsRepoProgram` branch where `git config` fails;
  - any escaped-quote negative (the gap N1 sits in);
  - any continuation case (the gap N2 sits in).
- **Commands and output:** the test_scope command is given with `exit 0` and three named lines, not the raw output. `scripts/check-all` was not re-run after the fix; the only check-all run was in round 0.
- Two earlier REDs (evidence and gate) name the `test_one` form, which was used before the controller's ruling.

## Ledger lines
Task 03: fix round 1/5 (12 addressed, 3 open: second non-POSIX reading false hard-denies the `'\''` idiom (N1); line continuation pushes an empty program word, hard-rule miss (N2); fx-state rule hard-denies any `.local/state` or `XDG_STATE_HOME` mention (N3); commits 92283fd..782c7e2)
Task 03: minor (deferred): shell option taking a value (`--rcfile f`, `-O opt`, `--init-file f`) before `-c` stops the `-c` search in `resolve`.
Task 03: minor (deferred): `${...}` content is never scanned (`closeBrace`), so `${x:-$(rm -rf ~)}` hides a command; the report's "every substitution is checked" claim is inaccurate.
Task 03: minor (deferred): `hardRule` returns null past depth 6, so seven nested substitutions hide a command silently.
Task 03: minor (deferred): `closeParen` is not `case`-aware; a pattern `)` inside `$(...)` ends the substitution early and the rest reads as quoted data.
Task 03: minor (deferred): quadratic bookkeeping in `parse` `endList` and the `rulesOf` pipeline filter; `classifyShell` runs twice per Bash call (hook and `guardShell`).
Task 03: minor (deferred): fx-state rule dodged by a relative path after `cd`, a glob or split quotes; the Write path is not symlink-resolved.
Task 03: minor (deferred): a `shell-rules` load failure also denies every Write and Edit, beyond I10's shell scope (brief: the shell guard fails open).
Task 03: minor (deferred): no test for the NotebookEdit fx-state refusal, the Write deny on broken `shell-rules`, or `gitRunsRepoProgram` when `git config` fails.
Task 03: minor (deferred): `gitRunsRepoProgram` reads only the superproject config; `git status` also runs in submodules, under their own local config.
Task 03: minor (deferred): out of scope: the fork-bomb regex `([A-Za-z_]\w*)\s*\(` backtracks quadratically on long identifier runs (pattern predates the fix, now run on both readings and every nested string).
Fixed ledger number: 10

Not checked: I had no shell, so every result above comes from reading the diff and tracing code, not from running tests. I did not check the generated `lib/*.js` against `src` line by line; the diff's TS and JS bodies agree where I compared them.
