# Task 06 review findings

**Spec compliance: PASS** after three fix rounds
**Task quality: PASS**
No blocking findings at round 3. One accepted, documented bypass.

## The three rounds, each the same flaw one level down

- **Round 1, binaries.** `bash -c "echo x > f"`, `sh -c`, `python3 -c`, `node -e`
  all wrote while the hook allowed them. `REDIRECT` was tested once against the
  raw command and never re-applied to unwrapped segments. Fixed by inverting the
  outer gate from a denylist to an allowlist.
- **Round 2, subcommands.** `git config`, `git clone`, `git archive --output=`,
  `git worktree add`, `find -fprint` all wrote. The reviewer ran them for real in
  a scratch repo: `git archive` wrote 10240 bytes, `find -fprint` wrote 44 lines.
  Fixed by inverting the `git` and `find` gates and dropping `tree` rather than
  gating it.
- **Round 3, flags.** `git diff --output=<path>` wrote 83 bytes while allowed.
  Fixed, and then the ceiling was written down instead of chasing a fourth level.

## The fourth level, found and accepted

A bounded probe found `git -c diff.external=<program> diff`, demonstrated
invoking an arbitrary program that wrote a file. `parseGit` consumes
`-c key=value` as an opaque global option and never inspects the value.

Logged, not fixed, per the ceiling ruling. Patching it would close one instance
of a class and leave `-c core.pager=` and everything after it. Task 13 records
the instance in ADR 0019 and beside the git gate.

## What holds

Every round 1 and 2 case still refused, checked with a 24-case matrix:
interpreters, chaining, process substitution, obfuscation, indirection,
absolute paths, `env`, `command`, nesting. Reads a lens needs all allowed.
`fx-devils-advocate` refused by name. A synthetic non-generated name allowed,
proving membership is checked against the generated set and not a prefix. An
unclassifiable `agent_id` refused. The controller path unaffected.

Identity records are 0700 directories and 0600 files. The generator is
deterministic and the drift gate fails on tampering, both verified live.

## The two judgements that mattered more than the code

**The ceiling comment was judged "a rule, not an apology"**, and quoted:
"EVERY GATE IN THIS DETECTOR IS AN ALLOWLIST. If you are about to add a set of
things to REFUSE, that is the bug, not the fix."

**ADR 0019's table row is self-contained**: a reader who stops at the table
learns Codex is "strictly weaker: a heuristic gate in fx's own hook, not a
harness-enforced boundary". Recording a guarantee as uniform when it is not is
the same failure ADR 0018 exists to correct.

## The near-miss

During development, a task-04 test with no `CODEX_HOME` invoked the new planter
and wrote six role files into the real `~/.codex/agents/`. The implementer caught
it, cleaned up, isolated `CODEX_HOME` in the harness, and **disclosed it**. The
controller verified the machine clean. A quiet cleanup would have left a
correct-looking report and an unexplained mutation of a user's home directory.
