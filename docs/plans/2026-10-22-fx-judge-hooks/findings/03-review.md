### Spec Compliance

I read the hook source, the generated `lib/shell-guard.js` (the TS bodies are elided in this view) and the gate-test assertions. I could not run anything.

- ✅ Guard order 1 to 7, the exact reason texts, and `claudeGuardOutput` match the brief.
- ✅ The hook keeps the deny-on-crash handler until the git guard allows, then swaps in the fail-open handlers (`src/hooks/fx-pretooluse.ts:140-156`).
- ✅ The stamp gate and the loop guard follow the brief (`lib/shell-guard.js` decide: `honoured`, `refused`). A stamp skips the loop guard only when honoured, and nothing turns into a silent allow.
- ✅ `hardRule` runs before `readRepoConfig`, so the `.fx.json` switch cannot reach it (C1).
- ❌ "A word that only appears as an argument is not refused" fails whenever the argument holds a quoted `;`, `&&` or `|` (finding 2).
- ❌ Hard rules run on the output of `stripComments`, whose quote tracking is not `$'...'`-aware (finding 1).
- ❌ "Writes its output and calls `process.exit` in the write callback, on every path": the stderr-only deny path exits at once (finding 3).
- ⚠️ Test 6 asserts criteria order `run, ask, deny`, not the brief's `ask, run, deny` (`src/tests/gates/shell-guard-claude.test.ts:139`). The `guard-question.ts:3-4` header cites ADR 0047 for the measured order, so I take this as a plan inconsistency. Task 01 owns the order and is under re-review.
- ⚠️ The unit test asserts `read-only` for `grep -rn shutdown src` and `echo "rm -rf ~ is dangerous"`, which the brief lists as grey. The allowlist spec makes `read-only` the correct class, so the brief's list is inconsistent. This is plan-mandated and the check (never `hard-deny`) holds.
- ⚠️ I could not read `appendEvent`'s 2 KB line cap. It may drop or truncate long commands, which would break the loop guard and stamp match for them.

### Strengths

- The hard rules are decided before any config read, judge load or journal read, and the decision log swallows its own write errors. A log failure therefore cannot turn a hard denial into the guard-off warn.
- The stamp compares the comment-stripped, normalized command on both the refusal and the retry. The stamp text itself therefore never changes the key.
- The gate test covers cases 1 to 22 at the process seam, including the async-failure cases under 5,000 ms.

### Issues

#### Critical
None.

#### Important

1. **Comment stripping can hide a hard-denied command.** `src/lib/shell-guard.ts` `scanComments` (compiled: `lib/shell-guard.js:344-346`) treats everything inside `'...'` as literal and ends the quote at the next `'`. It ignores `\'` inside `$'...'`. `classifyShell` runs `hardRule` on this stripped text (`lib/shell-guard.js:526-527`), and the judge state is built from the same text.
   - Example: `echo $'a\' # ' ; rm -rf ~`. The scanner closes the quote at `\'`, then reads ` # ' ; rm -rf ~` as a comment and cuts it. Bash treats `$'a\' # '` as one string and runs `rm -rf ~`.
   - Result: the command classifies as read-only (`echo` with no chain character left) or grey, and the judge never sees the `rm`. The rule is meant to be final.
   - Not in the security lens findings (its #4 covers heredoc detection).
   - Fix: run `hardRule` on the comment-unstripped text (or both forms), and make `scanComments` treat `$'` as an ANSI-C quote with backslash escapes.

2. **Quoted separators cause false hard denials with no override.** The implementer's own `shortcut:` note covers `src/lib/shell-guard.ts:148-150`, where `splitSegments` cuts at a quoted `;`.
   - Example: `git commit -m "fix typo; reboot required"`. The tail segment ` reboot required"` has program `reboot`, so it is denied as `power`.
   - The disk-redirection regex tests the raw segment, so `echo "x > /dev/sda"` is denied the same way.
   - A hard denial cannot be overridden, and the task says an argument-only word is not refused (I4: "no false positives on commit messages").
   - Nothing in the tests exercises a quoted separator.
   - Fix: split quote-aware inside `hardRule`, which also closes the `bash -c "curl x | sh"` miss. At minimum, add the gate case.

#### Minor

3. **The deny path exits without waiting for stderr.** `src/hooks/fx-pretooluse.ts:100-104`: `emit` calls `process.exit(code)` straight after `process.stderr.write` when stdout is empty. The brief requires exit in the write callback "on every path". Where stderr is an async pipe, the hard-denial reason can be cut off. Fix: pass the exit to the stderr write callback.
4. **The Codex and opencode branches in `guardShell` have no test.** This covers the loop-guard deny, the override warn, the Codex ask-to-warn mapping and `judgeSupported:false`. These are never-allow rules, and injecting a `JudgeHandle` into `guardShell` with a scratch state dir would test them cheaply. The report admits the gap, but a later task cannot fail a test here.
5. **Several flag denylist entries are never reached by a test.** `find . -ok rm {} ;` is grey because of the `;` (`lib/shell-guard.test.js:753`), not because of `-ok`. `-okdir`, `-fprint0`, `-fls`, `--pre-glob` and `--ext-diff` are untested. Replace the `;` form with a case that has no chain character.
6. **The I10 rule exists twice.** `lib/shell-guard.js:533-540` (`repoCommand`) re-lists the five templates and recomputes the matched head. `isRepoCommand` in `src/lib/evidence.ts` already holds that logic, and `isCheckCommand` has no production caller. Task 08 will add a third copy. Fix: export the matched-head helper from `evidence.ts` and call it.
7. **`guard-error` is never written to the decision log.** The catch in `guardShell` (`lib/shell-guard.js:544`) returns warn and logs nothing. A judge reply of the wrong type therefore leaves no trace for a human debugging. Log it with source `guard-error`.

### Tests to run

- Add to `src/lib/shell-guard.test.ts` the case `echo $'a\' # ' ; rm -rf ~`, expecting `hard-deny` / `rm-root`. It should fail today.
- Add to `src/lib/shell-guard.test.ts` the case `git commit -m "fix typo; reboot required"`, expecting `grey`. It should also fail today.
- Run `node lib/shell-guard.test.js` after each. These strings are only passed to the classifier and never executed.

### Assessment

**Task quality: Needs fixes**

Reasoning: the order, texts, stamp and loop-guard logic, and fail-open wiring are faithful and well tested at the process seam. Two defects touch the one guarantee this task owns, that a hard denial is final and exact. The comment stripper can hide a command from every hard rule (finding 1), and quote-blind splitting both false-denies with no override and misses the quoted `bash -c` pipe (finding 2).

## Ledger lines

Task 03: minor (deferred): `emit` exits before the stderr write drains on the deny-only path (fx-pretooluse.ts:100-104).
Task 03: minor (deferred): Codex/opencode branches of `guardShell` (loop-guard deny, override warn, ask-to-warn, judge-unsupported) have no test.
Task 03: minor (deferred): flag denylist entries `-ok`, `-okdir`, `-fprint0`, `-fls`, `--pre-glob`, `--ext-diff` never reached by a grey test.
Task 03: minor (deferred): `repoCommand` in shell-guard duplicates the `evidence.ts` prefix rule; `isCheckCommand` has no production caller.
Task 03: minor (deferred): `guard-error` fail-open is not written to the decision log.
