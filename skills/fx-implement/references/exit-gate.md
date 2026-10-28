```
NO COMPLETION CLAIM WITHOUT FRESH VERIFICATION EVIDENCE
```

If you have not run the command **in this message**, you cannot claim it passes.
**Violating the letter of this rule is violating its spirit.**

Before any claim or any expression of satisfaction:

1. **IDENTIFY**: what command proves this claim?
2. **RUN**: the full command, fresh and complete.
3. **READ**: the whole output; check the exit code; count the failures.
4. **VERIFY**: does the output actually confirm the claim? If not, state the
   real status with the evidence.
5. **ONLY THEN** make the claim, with the evidence attached.

**Skipping any step is lying, not verifying.**

Claim/requires/not-sufficient table, the rationalizations, and the
per-domain patterns: `../../../references/vocab/verification.md`.

**Red flags: stop:** "should" / "probably" / "seems to" · "Great!" /
"Perfect!" / "Done!" before verification · about to commit without verification
· trusting an agent's success report · relying on a partial check · "just this
once" · tired and wanting the work over · **any wording implying success
without having run verification.**

**The rule applies to** exact phrases, paraphrases, synonyms, implications of
success, and any communication suggesting completion or correctness.

### Run what the repository's own gate runs

"The suite is green" is not "this merges". Before the completion report, open
the CI configuration and **run every command it runs**, reading each exit code.
A repository that gates on a linter and a security scanner has told you what
passing means there, and a suite that passes while two of four jobs fail is a
branch that cannot merge.

Why: a suite can pass while the CI linter and scanner fail; only running the CI commands shows it.

### Run the prose gate on the branch

From the worktree, run
`python3 -I <skill base directory>/../../scripts/check-prose --diff <MERGE_BASE>`
and ledger `Exit gate: prose: <n> hits`. A hit blocks the completion claim
like a failing test: send the hits to one fix subagent, then run it again.

### Classify every failing test

When `test_all` fails, run each failing test alone with `test_one` on the
branch. Then make a throwaway detached worktree of the merge base
(`git worktree add --detach <scratch> <MERGE_BASE>`, removed afterwards with
`git worktree remove <scratch>`), run the `.fx.json` `setup` command in it once,
and run the same tests there.

- The test's file does not exist on the merge base: **introduced**.
- Fails on both with the same assertion: **pre-existing**. Report it; it does
  not block this branch. Fails on the merge base some other way (setup,
  missing dependency): treat it as **introduced**.
- Fails alone on the branch, passes on the merge base: **introduced**.
  Introduced blocks the completion claim like any other failure.
- Passes alone on the branch: **order-dependent**. Report it with the order
  that failed.

Append one line each: `Exit gate: <test>: pre-existing|introduced|order-dependent`.

**A `test_all` that stops at its first failure** shows you one failure, not the
list. Classify that one. When it is pre-existing, run the gates past it: a copy
of the runner without that line, placed where the runner expects its own path
(a script that resolves paths from its own location breaks anywhere else).
Repeat until a failure is introduced or the runner reaches its end.
**Order-dependent blocks the completion claim like introduced**, unless the
same test also fails on the merge base.
