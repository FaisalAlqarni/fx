### Finding verdicts

- **N1 (non-POSIX reading false hard-denies bash quoting): ADDRESSED, with new breakage N4.** `hardRule` now parses once, POSIX by default (`src/lib/shell-rules.ts:437-439`). Substitutions and heredoc bodies keep their parent's reading (`:396`, `:424`). The non-POSIX reading is used only when the program is `powershell`, `pwsh` or `cmd` (`:285`, `:410-416`). All four cited spellings (`'\''`, an odd `\"`, `$'it\'s; ...'`, `'a'\''b && rm -rf ~'`) are one bash word, so the top level no longer sees `;` or `&&` as a separator. N4 below shows how the code builds the string a Windows shell receives, and that part is wrong.
- **N2 (line continuation pushed an empty program word): ADDRESSED.** The backslash-newline pair is now skipped before `begin(i)` (`shell-rules.ts:157-158`), so no word is opened and the next space pushes nothing. I traced `make build && \<nl>  sudo reboot`: `&&` ends the list at `:233-234`, `\<nl>` is skipped, the spaces call `endWord` with `inWord` false, and `sudo reboot` resolves to `reboot`, giving `power`. Inside double quotes the continuation was already handled (`:184`). A continuation in the middle of a word still joins (`r\<nl>m` gives `rm`).
- **N3 (fx-state refusal far too broad): ADDRESSED.** `namesFxState` now matches the resolved `stateDir` at a path boundary, or `FX_STATE` (`shell-rules.ts:445, 449-451`). Any other `.local/state`, `XDG_STATE_HOME` or `LOCALAPPDATA` mention only stops the command being read-only (`:446`, `:474`), so it goes to grey. All three spellings the design names in decision 3 (`design.md:74`) are still refused:
  - `$XDG_STATE_HOME/fx` and `${XDG_STATE_HOME}/fx`, via `\$\{?XDG_STATE_HOME\}?`
  - `~/.local/state/fx`, via `\.local[\\/]+state`
  - `%LOCALAPPDATA%\fx`, via `%LOCALAPPDATA%`
  
  The Windows default path `AppData\Local\fx` and the resolved `stateDir` are also refused. The file-tool path uses the same function (`src/hooks/fx-pretooluse.ts:185`). One spelling round 1 caught is lost; see minor line 1.

### New breakage in the fix diff

**N4 [Important]: the N1 fix drops win-wipe refusals that round 1 had for bash-escaped strings passed to `cmd`, `powershell` or `pwsh`.**
- The problem is at `shell-rules.ts:411-412`. For a Windows shell, the code throws away `r.inner`, which is the string bash actually passes after its own unquoting. It replaces it with a non-POSIX re-read of the raw bash text (`parse(p.src.slice(c.start), false).cmds[0]`). The Bash tool runs bash, so bash unquotes the outer layer before the Windows shell sees anything. The re-read gets that layer wrong whenever a backslash matters to bash.
- Round 1 refused each of these. All are now grey, which means allowed under the default setup with no judge:
  - `cmd /c rd /s /q C:\\`: bash passes `C:\`. The re-read keeps `C:\\`, which fails `DRIVE_ROOT` (`:294`).
  - `powershell -c Remove-Item -Recurse -Force C:\\`: same cause.
  - `powershell -c "Remove-Item -Recurse -Force \$HOME"`: bash passes `$HOME`. The re-read keeps `\$HOME`, which is not in the list at `:377`.
  - `c\md /c rd /s /q C:\`: bash runs `cmd`. In the re-read, `baseName` splits `c\md` on the backslash, `resolve` finds `md`, and `inner` is empty.
  - Any escaped quote earlier in the same simple command shifts the re-read too. Example: `env X=it\'s cmd /c rd /s /q C:\`. The non-POSIX lexer opens a quote at `'s` that never closes, so `prog` comes out empty.
- The new test `cmd /c "rd /s /q C:\"` (`src/lib/shell-guard.test.ts`, N1 block) is an unterminated quote in bash: bash reports a syntax error and runs nothing. The re-read exists to pass that spelling, and the price is the spellings bash really runs.
- Fix: check both sets, each read non-POSIX: `[...r.inner, ...(first ? resolve(first.words, vars).inner : [])]`.
- Fails integrity: the hard rules are final, and part of the round 1 hard-rule coverage is gone.

### Tests evidence

- **N2:** RED is `echo "\"" ; \<nl>  rm -rf ~ gave grey, want rm-root`. The headline case `make build && \<nl> sudo reboot` was not RED in that run because the second reading still masked it; the report says so. GREEN output is pasted. Three covering cases.
- **N1:** RED is four `gave power/rm-root, want grey` lines. GREEN output is pasted. No case passes a bash-escaped string (`\\`, `\$`, an escaped program name) to `cmd` or `powershell`, which is the gap N4 sits in. The win-wipe case kept for N1 uses a spelling bash cannot run.
- **N3:** RED is four `gave fx-state, want grey` lines. GREEN is `shell-guard.test.js: ok`. Refusal cases: `cat ~/.local/state/fx`, `"${XDG_STATE_HOME}/fx/..."` and `%LOCALAPPDATA%\fx\...`. The lens-I8 cases cover `$XDG_STATE_HOME/fx` and `$HOME/.local/state/fx`. No case for `$LOCALAPPDATA/fx`. No file-tool case for the newly allowed side (a Write into `~/.local/state/nvim/x`).
- **Commands:** single runs used `test-one.sh src/lib/shell-guard.test.ts`. The scope run was `scripts/check-generated && scripts/test-scope src/lib/shell-rules.ts src/lib/shell-guard.test.ts`, with raw final lines and `exit=0` pasted. `scripts/check-all` was not re-run. The `lib/*.js` hunks in the diff match the `src` hunks line for line.

## Ledger lines
Task 03: fix round 2/5 (3 addressed, 1 open: N1 fix re-reads the raw bash text non-POSIX for cmd/powershell/pwsh and drops the bash-unquoted string, so `cmd /c rd /s /q C:\\` and `powershell -c "Remove-Item -Recurse -Force \$HOME"` are no longer win-wipe (N4); commits 782c7e2..6680d7e)
Task 03: minor (deferred): narrowed FX_STATE no longer refuses `$LOCALAPPDATA/fx` or `${LOCALAPPDATA}/fx` (the git-bash spelling round 1 caught) or `${XDG_STATE_HOME:-$HOME/.local/state}/fx`; they are judged; `\$\{?LOCALAPPDATA\}?` restores the first two.
Task 03: minor (deferred): no file-tool test for the narrowed rule (Write into `~/.local/state/nvim/x` now allowed, untested) and no `$LOCALAPPDATA/fx` case.
Task 03: minor (deferred): out of scope: `classifyShell` now reads the top-level string as bash only; when a later task routes Codex `Bash` (PowerShell on Windows) through it, `Remove-Item -Recurse -Force C:\*` reads as `C:*` and is missed, so that caller needs a non-POSIX top-level reading.
Fixed ledger number: 3

I had no shell, so every verdict comes from reading code and tracing the lexer by hand. Nothing was run. I did not re-check the round 1 cases beyond the ones above.
