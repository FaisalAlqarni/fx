# Task 11 re-review 1: fix round 77ac5fa..528450f

Read from the commit and the review package diff only. The lean-a worktree was not modified. Checks run:

- `bash tests/fixture-build/hidden/pick-build-worktree.test.sh` prints `all passed`.
- `node tests/gates/parallel-implement.test.js` prints `parallel-implement: ok`.
- `bash -n tests/fixture-build/rows/01-fixture-build.sh` exits 0.
- Independent repro in a mktemp repo, removed afterwards. I added `.worktrees/notes` (build) first and then `.worktrees/01-store` (task). `git worktree list --porcelain` lists main, then `01-store`, then `notes`. The old second-entry awk picks `01-store`. The new picker, given a ledger line naming `01-store` by absolute path, picks `notes` and exits 0.
- The dispatch-record parser in the row is unchanged. `grep -oE 'Task [0-9]+: parallel with [0-9]+, branch [^ ,]+'` sits at line 122 before the fix and at line 129 after it, with the same text. The SKILL form at SKILL.md:405 still starts `Task NN: parallel with MM, branch <b>, base <sha>`, so the branch capture still ends at the comma.

### Finding verdicts (ADDRESSED | NOT ADDRESSED with file:line)

1. **Important 1, fixture step 4 picks by list position: ADDRESSED.** `01-fixture-build.sh:66-73` concatenates `state.md` from every listed worktree. It then calls `hidden/pick-build-worktree.sh`, which drops the main worktree and every path named in a `parallel with ... worktree <path>` ledger line. If one linked worktree remains, the picker returns it. If none remains, it returns the main worktree, and `ON_MAIN` is set. If two or more remain, it exits 1 and names all of them on stderr, and the row calls `fail "build: ..."`. The repro above confirms the build worktree is chosen when a task worktree sorts first. The test locks in the git ordering premise and all three outcomes.

2. **Important 2, resume gaps: ADDRESSED.** SKILL.md:442-459 covers all three states the review named. A `back to serial` line now supersedes the `parallel with` line (443). A missing recorded worktree sends the task back to serial (446-449). A dispatch with no report and no commit past `base` is treated as a dead implementer and goes back to serial (450-453). The two `merging` states from the original rule are kept. This matches the one-sentence fix the review proposed.

3. **Important 3, file check only once: ADDRESSED.** SKILL.md:416-419 re-runs the step 5 check after every fix round with the same back-to-serial outcome. SKILL.md:424-428 repeats it on the current `<base>..<head>` before the `merging` line is written. That covers the case where the sibling task's fix rounds landed after this task's last check. Step 5 also takes the review's Minor 2 wording ("or itself goes back to serial").

### New breakage in the fix diff

None that scores the wrong worktree. The two points below narrow what the picker and resume can handle. Neither reopens an Important.

- Minor. `pick-build-worktree.sh:34` matches the ledger path exactly against the absolute path from `git worktree list`. SKILL.md:405 says `worktree <path>` and does not require an absolute path. Suppose a controller writes `.worktrees/01-store`, wraps the path in backticks, or adds a trailing slash, and a task worktree is still present at the end of the run. The picker then reports both worktrees as ambiguous and the row fails. I confirmed all three variants in the scratch repo. This fails loudly and never scores the task worktree, so it meets the finding as stated. It still turns a leftover worktree into a failed row. Fix: in the picker, resolve relative ledger paths against `$MAIN` and strip backticks and trailing slashes. Or make SKILL.md:405 say "absolute path, no backticks".
- Minor. SKILL.md:450-453: a dead implementer is recognized only when there is no report and no commit past `base`. An implementer that committed some work and then died without a report falls through to "Otherwise: inspect" (459), which is the vague wording the review flagged. Also, "remove the worktree" on a worktree with uncommitted partial work makes `git worktree remove` refuse without `--force`. Step 8 does not say whether forcing is allowed. Suggest: "no report file (commits past `base` or not)" sends the task back to serial, and the controller removes the worktree with `--force` because the branch keeps any commits.

### Out-of-scope observations

- The report's fix-round section (report line 157 on) corrects the creation-order reasoning. The original "Fixture step 4 answer" text at report line 94 is still there above it. That is fine for an append-only report, but a reader of line 94 alone gets the wrong reason.
- Minor 1, 3 and 4 from 11-review.md were not in scope for this round and remain as written there.

### Verdict

Round passes. Important 1 to 3 are all addressed. The tests and the gate pass, and the row parses. The fixture parser's dispatch-line form is unchanged. The two new Minors (the picker's path matching and a dead implementer that left commits) are optional follow-ups and do not block the task.
