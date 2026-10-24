### Finding verdicts

**Important 1 (xargs, and git with config options, reaching masked text): NOT ADDRESSED.** The three named spellings are fixed, but git config set through environment variables still gets through.
- **Fixed.** `cat <<'EOF' | xargs git` with a heredoc: `direct` at src/lib/shell-rules.ts:541 compares the first word, `xargs`, with the resolved program, `git`, and they differ. So `inertOnly` at :550-553 is false, :573 masks nothing, and the body is kept.
- **Fixed.** `xargs tee` is the same trace and is kept.
- **Fixed.** `cat > notes.md` with a heredoc, then `git -c alias.x='!sh notes.md' x`: git is not in INERT (:525), and `commitOf` (:542) fails because `args[0]` is `-c`. `inertOnly` is false, so the body is kept.
- **Still open.** `direct` skips leading assignments, so an environment variable that configures git passes as a plain `git commit`. Example: `cat > notes.md` with a heredoc, then `GIT_EDITOR='sh notes.md' git commit`. Both commands pass `inertOnly`, :573 masks the body, and git runs the editor, which runs the body. The judge sees `sh notes.md` but not what notes.md holds.
- **Why it counts.** This is the same thing as the `git -c core.editor=x commit` case the fix itself keeps (src/lib/shell-guard.test.ts:462-467), spelled through `GIT_EDITOR`, `EDITOR`, `GIT_CONFIG_COUNT/KEY_n/VALUE_n` or `GIT_CONFIG_PARAMETERS` instead.

**Important 2 (commit message masked while a later command pipes it into a shell): NOT ADDRESSED.** The named spelling is fixed, but the check is a denylist with gaps.
- **Fixed.** `git commit -m 'echo hi' && git log -1 --format=%B | sh`: `sh` is in PIPE_SINKS, so `runsText` (:543-549) is true and :560 returns before masking. The message is kept.
- **Still open, gap 1.** Not every shell is in PIPE_SINKS (:331). `git commit -m '<payload>' && git log -1 --format=%B | $SHELL` leaves `runsText` false (`$shell` is not on the list), the message is masked, and a shell runs it. The same happens with `| csh` or `| tcsh` (not in SHELLS, :330).
- **Still open, gap 2.** `S=sh; ... | $S` also gets through, because the `vars` map in `maskForJudge` (:538) is never filled. `rulesOf` fills its own map at :472-474.
- **Still open, gap 3.** Other ways to run the message, none of which the denylist knows:
  - `| awk '{system($0)}'`
  - `git log -1 --format=%B > run.sh && chmod +x run.sh && ./run.sh`
  - `GIT_EDITOR=sh git commit -e -m '<payload>'`: git runs `sh` on COMMIT_EDITMSG, which holds the masked message. :541 lets the assignment through.

**Minor 2 (the `git commit -F -` body gated like `-m`): ADDRESSED.** For `npm test && git commit -F -` with a heredoc, `npm` is direct and on none of the lists, so `runsText` is false. `commitOf` is true, and `bodies()` at :568 masks the body (src/lib/shell-rules.ts:559-569). Test: src/lib/shell-guard.test.ts:468-469. It inherits the open gaps in Important 2.

**Minor 1 (loop counting): ADDRESSED** (src/lib/loop-tracker.ts:19-47).
- `until npm test; do sleep 1; done`: `untilCond` is `npm test`, which is one command, so the condition is charged the cap (:31) and the nudge names `npm test`. Test: src/lib/loop-tracker.test.ts:112.
- `while make; ...` returns null (:33).
- A one-iteration loop, `for ((i=0; i<1; i++)); do node --test; done`: CSTYLE matches with i, 0, `<` and 1, so it is charged 1. Two more plain runs reach 3 (test :115-117).
- `while true` with a failing check: one failed event (the loop was stopped) is charged 3 and nudges at once, as the ruling says.
- Bad C-style shapes return null and fall back to counting the raw string once. Negative or zero counts clamp to 0.

**Minor 4 (comment only): ADDRESSED.** src/lib/shell-rules.ts:482.

### New breakage in the fix diff

1. **Important. `direct` lets assignments through (src/lib/shell-rules.ts:541).** It looks past `ASSIGN` words, so `GIT_EDITOR=`, `EDITOR=` and `GIT_CONFIG_*=` in front of `git commit` keep both masks on while git runs a program named in the text (traces above). Fix: `commitOf` and the INERT check should need the program as the literal first word, with no assignment before it.
2. **Important. `runsText` is a denylist (src/lib/shell-rules.ts:543-549).** It misses `$SHELL`, a variable set earlier in the text, csh and tcsh, `awk` with `system`, and a script run by path. Every gap is a masked message that runs. The body path is safe only because `inertOnly` is an allowlist.
   - Fix: switch the message gate to an allowlist. To keep the Minor 2 case masked, ignore commands that come before the commit, as long as they are not put in the background with `&`, since nothing can read a message before it is written.
3. **Minor. The `git -c core.editor=x commit` kept case (src/lib/shell-guard.test.ts:467) is not a regression test.** The report's own probe shows the old code already kept it, so it pins nothing new. Meanwhile the environment-variable form of the same attack is the open gap above.
4. **Minor. Glob and variable `for` lists now cost 1 instead of the cap (src/lib/loop-tracker.ts:46, test :120).** The ruling did not ask for this. It is a softer count than before, the report says so, and it is low risk.
5. **Minor. The fix commit also carries controller files.** It includes the controller's state.md ledger lines and findings/14-review.md. Task 12 had the same deferred minor.

Other things I traced:
- **Eval, source and command substitution:** they make `runsText` true (:545, :547), and `inertOnly` rejects them.
- **Process substitution:** a `>(...)` or `<(...)` target makes `runsText` true.
- **A heredoc to an interpreter through `env`, `sudo` or `xargs`:** not direct, so it is kept.
- **A heredoc to an interpreter missing from INTERPRETER (such as `lua`):** it fails `inertOnly`, so it is kept.

All of these are safe. Every remaining leak goes through the `-m` / `-F -` path or the assignment hole.

### Tests evidence

- **RED, captured:** the `xargs git` kept case, the `-F -` assertion, and L8 (`until`).
- **RED by a scratch probe:** the other three kept cases. This was a direct call into the previous commit's built shell-rules.js (9aa0c43), not a run of the test file.
- **No RED shown:** the `core.editor` case (already kept before the fix) and loop cases L9 to L12.
- **GREEN:** reported as `shell-guard.test.js: ok` and `loop-tracker.test.js: ok`. The full scope run (`test_scope`) exits 1 at release-version only. Every gate before it is reported as passing.
- I re-ran nothing (no shell).

## Ledger lines

Task 14: fix round 1/5 (3 addressed, 2 open: I1 git config through an env assignment such as GIT_EDITOR still reaches masked text via direct at shell-rules.ts:541; I2 runsText denylist misses $SHELL, a variable, csh or tcsh, awk system, a script run by path, and GIT_EDITOR=sh with -e; commits 9aa0c43..48ebf53)
Task 14: minor (deferred): the git -c core.editor kept case passed on the old code too, so it pins no fix; the env-variable form of the same attack is untested (shell-guard.test.ts:467).
Task 14: minor (deferred): for loops over a glob or variable list are now charged 1 instead of the cap, a change beyond the minor 1 ruling (loop-tracker.ts:46).
Task 14: minor (deferred): the fix commit swept in the controller's state.md ledger lines and findings/14-review.md, as in task 12.

Not checked: no tests run; Codex and PowerShell `maskForJudge` with posix false not traced; whether `normalizeCommand` keeps C-style loops on one line not traced.
