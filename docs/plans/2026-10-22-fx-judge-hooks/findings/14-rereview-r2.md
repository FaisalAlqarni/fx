### Finding verdicts

**1. Each condition of the ruling, against the code** (`src/lib/shell-rules.ts`)

| Condition | Where it is enforced | Verdict |
|---|---|---|
| Every command is on the allowlist | 554 (`p.cmds.every(maskable)`), with 539 for git and 540 for the writers | Enforced for every command the parser puts in `p.cmds`. Not enforced for commands that are not there; see I-A below. |
| Program name compared literally | 537, 539, 540 read `c.words[0]` directly. The old `resolve` and `baseName` path is gone (diff lines 241 to 256). | Enforced. A path, a wrapper or a variable in that word does not equal `git` or a writer, so it is refused. |
| No assignment words | 539 and 540 do this implicitly. The parser keeps an assignment as an ordinary word (89), so an assignment in front makes `words[0]` something other than `git` or a writer. | Enforced. |
| No git option before the subcommand | 539: `words[1]` must literally be `commit`, `add` or `push`. | Enforced. |
| `-e` and `--edit` refused | 529 and 539: GIT_RUNS is checked against every word after the subcommand. | Partly enforced. The `--edit` check needs an exact match, but git also accepts any unambiguous prefix of a long option. See I-B. |
| Pipes refused | 538 (`c.stage > 0`), applied to every command at 554. | Enforced. Any pipe creates a stage 1 command, and that command fails. |
| Redirections limited to documentation writes | 539 refuses any redirection on git. 542 turns any operator that is not a write into an empty target, and 543 then refuses it. 538 refuses here-strings. A heredoc is not a redirection in this parser (90). | Enforced. |
| Backgrounding refused | 554: any `&` left in `p.bare` after removing `&&`. | Enforced. Quoted text and heredoc bodies are not in `bare`, so they cannot trigger it. |
| Substitutions and variables refused | In command position: 539 and 540, because the word is not literal. In words: 538 (`c.subs`, `c.procs`). | Partly enforced. A substitution that the parser does not record in `c.subs` does not stop masking. See I-A. |

**2. Round 1 findings I1 and I2**

- **I1: ADDRESSED.** An environment assignment in front of git (GIT_EDITOR, EDITOR, GIT_CONFIG_PARAMETERS, GIT_CONFIG_COUNT) makes `words[0]` something other than `git` (539, 540). The `direct` helper that was the hole has been deleted.
- **I2: ADDRESSED.** The denylist was replaced by an allowlist:
  - `$SHELL`, `$S`, csh, awk and a script run by path are all refused, because each one is a command off the allowlist (540), sits behind a pipe (538), or both.
  - `git log` is itself off the allowlist (539).
  - GIT_EDITOR=sh with `-e` is refused twice: by the assignment (539) and by `-e` (529).
- **The 14 new kept cases each match a refused condition** (shell-guard.test.ts 466 to 472, 476, 478):
  - Assignment: the GIT_EDITOR heredoc case, EDITOR, GIT_CONFIG_PARAMETERS, `S=sh` (which also has a pipe), GIT_EDITOR with `-e`, and GIT_CONFIG_COUNT.
  - Command off the allowlist and a pipe: `$SHELL`, `csh` and `awk`.
  - Command off the allowlist and a redirection on git: the `run.sh` and `chmod` case.
  - `-e` alone: `git commit -e`.
  - Background: the trailing `&`.
  - Command off the allowlist: `npm test` with `-m`, and `npm test` with `-F -`.
- **Caveat on the pipe cases.** All five pipe cases also contain `git log`, so none of them would fail if the pipe check at 538 were removed. No test isolates the pipe check, `--edit`, or a redirection on git.

**3. The masked cases still mask**, judging by the code. I could not run the tests.

- `git commit -m` alone (test 455): passes 539, and the message is masked at 562.
- `--message=` with `&& git push` (456): masked at 563 and 564.
- `-F -` heredoc (457): the body is masked at 567.
- `cat > notes.md <<'EOF'` (458): the target is `notes.md` and the heredoc is not counted as a redirection, so 543 passes and the body is masked at 567.
- `git add . && git commit -m && git push` (480): all three commands pass, and once `&&` is stripped `bare` has no `&`.

**4. For-loop charge: yes.** The minor 1 ruling (state.md 505) says a loop whose count is unknown must not be charged the full threshold ("parse a C-style count or skip it"). Charging once for a loop over a glob or variable list follows that, and one is the only number of failures actually seen (loop-tracker.ts 23 to 25).

### New breakage in the fix diff

- **I-A (Important): substitution commands outside `c.subs` still allow masking.** Masking is supposed to be refused when the text contains any other command or any substitution. Two places miss this:
  - The parser stores an unquoted heredoc body as raw text (155) and never scans it for a dollar-parenthesis substitution or backticks.
  - A a dollar-parenthesis substitution nested inside a braced expansion takes the closeBrace branch (120 to 123), which never pushes to `c.subs`.

  In both cases `maskable` passes (538). Line 567 then keeps only that body or word unmasked, while the commit message and other bodies in the same text are still masked (554, 562, 567). That command runs, but the allowlist never checked it. Existing tests miss this because the kept case at test 460 holds only the body. The smallest fix is to refuse at 554 when RUNS_CODE matches anywhere in the text. That costs friction only, which the ruling accepts.
- **I-B (Important, low exposure): abbreviations of `--edit` are not refused.** git accepts unambiguous prefixes of long options. GIT_RUNS (529) matches `--edit` exactly, so the "no `--edit`" condition is only partly enforced. The text cannot set the editor (assignments and `git -c` are refused), so the practical risk is small. It is still a ruling condition that is not fully met.
- **Minor: a variable passed as a git argument cannot be proven not to be `-e`.** The `-e` check reads literal words, and the ruling refuses variables only in command position (539).
- **Minor: the `&>` and `&>>` entries in WRITES (527) can never apply.** Line 554 refuses any `&` in `bare`, and these operators put one there, so a write to a documentation file in that form is always refused. This is friction only, and the two lines contradict each other.
- **Minor: the tests do not check the pipe, `--edit` and git-redirection conditions on their own.** No case would fail if any one of those checks were dropped (shell-guard.test.ts 466 to 472).

### Tests evidence

None seen. I had no shell. The only claim that tests pass is the ledger line in state.md 518 ("all gates pass except release-version"), which reports a result without the output. The verdicts above come from reading the code, not from a test run.

## Ledger lines

Task 14: fix round 2/5 (2 addressed, 2 open: I-A command or substitution inside an unquoted heredoc body or nested in ${...} is not in c.subs, so masking proceeds around it (shell-rules.ts:155, 120-123, 538, 554); I-B --edit abbreviations pass GIT_RUNS (shell-rules.ts:529); commits 48ebf53..8584306)
Task 14: minor (deferred): a variable passed as a git argument can expand to -e, and the literal check cannot see it (shell-rules.ts:539).
Task 14: minor (deferred): WRITES accepts &> and &>>, but the background check refuses any & in bare, so that branch is dead (shell-rules.ts:527, 554).
Task 14: minor (deferred): no kept case isolates the pipe, --edit or git-redirection condition; all five pipe cases are also refused because of git log (shell-guard.test.ts:466-472).
