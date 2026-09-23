# Task 11 review: fx-implement runs declared-parallel tasks

Range 9b29e0a..7c254dc (one commit, 7c254dc). Read from the commit only (`git show 7c254dc:<path>`, `git archive`); the worktree was not touched. Line numbers are in `skills/fx-implement/SKILL.md` at 7c254dc.

Checks run: the gate from a `git archive` copy of 7c254dc prints `parallel-implement: ok`; the same gate with the heading renamed fails on `fx-implement has a Parallel tasks section`. The `git worktree list` ordering was checked in a scratch repo under /tmp with git 2.43.0.

### Spec Compliance

- ✅ "Serial implementers" still states serial as the default with the shared test environment reason; the "Relax only if" sentence is replaced by a pointer (SKILL.md:380-385).
- ✅ `### Parallel tasks` follows it (SKILL.md:387) and carries all eight rules: gate with "At most two" (395-401), exact dispatch form (403-406), isolation (408-409), review on the task branch (411), file check with back to serial and keep the branch (413-419), one at a time merge with union `test_scope` and the three failure paths (421-432), resume (434-438), cleanup with `git worktree remove` (440-442).
- ✅ No instruction deletes a branch or removes a worktree with `rm`; the gate asserts it.
- ✅ `tests/gates/parallel-implement.test.js` is the Step 1 gate verbatim; `scripts/check-all` runs it.
- ✅ The dispatch line and the fixture parser agree: `grep -oE 'Task [0-9]+: parallel with [0-9]+, branch [^ ,]+'` (tests/fixture-build/rows/01-fixture-build.sh:122) matches `Task NN: parallel with MM, branch <b>, base ...`, and the `, base` that follows ends the branch capture at the comma.
- ✅ No em or en dashes in the diff, no attribution trailer, three paths staged. Nothing added to always-on text.
- ✅ The hot-file list the gate points at exists in the other lane (lean-b skills/fx-plan/SKILL.md:103-110).
- ❌ Deferred item "Task 03: minor (deferred, owner task 11)", step 4: not resolved, and the report's answer is wrong. See Important 1.

### Strengths

- Every failure the task names routes back to serial, and the fast-forward retry repeats the whole of step 6, so the test runs again before any retry lands.
- The build branch only moves by fast-forward to a head that `test_scope` just ran green on, so the normal path cannot land an untested commit.
- The report records two real RED causes (a quoted `###` heading matching `indexOf`, a hand-wrapped ledger form) instead of hiding them.

### Issues

#### Critical

None.

#### Important

1. **Fixture step 4 can take a task worktree as the build worktree; the report says it cannot.** `01-fixture-build.sh:63` takes the second `worktree` entry of `git worktree list --porcelain`. The report says the list is in creation order, so a task worktree always sorts after the build worktree. That is false: `git worktree list` sorts linked worktrees by path, keeping only the main worktree first. In a scratch repo with git 2.43.0, worktrees added in the order `.worktrees/notes`, `.worktrees/01-store` list as `.worktrees/01-store` then `.worktrees/notes`. SKILL.md:408-409 does not say where a task worktree goes, so a controller naming it after the task (`01-store`, `task-01`) puts it ahead of a build worktree named for the feature. Any run that ends with a task worktree still present (timeout, turn cap, a crash before step 8, or a cleanup the controller skips) then scores `caughtAtEnd`, `HEAD_SHA` and the `$BUILD/state.md` read at line 121 against the task worktree. This is the ledger's deferred M2 and was to be reported as Important. Fix, smallest first: in step 4, pick the linked worktree whose path is not named in any `parallel with ... worktree <path>` ledger line, or read the build worktree path from the ledger's own worktree line, as the M2 note suggests. Fixing the skill alone is not enough, since placement is the controller's choice.

2. **Resume (SKILL.md:434-438) covers two states and fails toward nothing in the others.** Walking a restart at each point:
   - Dispatch recorded, worktree not yet created (step 2 is written before step 3): the rule says inspect the recorded worktree, not recreate it. The worktree does not exist, and no step says what to do next.
   - Back to serial already recorded, worktree already removed by step 8: the task still has a `parallel with` line and no `complete` line, so the rule sends the controller to inspect a worktree that is gone, on a task that is meant to be serial now.
   - Implementing: the implementer subagent does not survive the restart. "Inspected" does not say whether to resume it, re-dispatch it in the same worktree, or send the task back to serial. The worktree may hold uncommitted partial work.
   - Merging, rebase in progress: covered. Merging, fast-forward done but the `complete` line not yet written: redoing step 6 is a no-op rebase, a green test and a no-op fast-forward, so it is safe.
   The global constraint says every parallel guard fails toward serial. One sentence closes all three: a `back to serial` line supersedes the `parallel with` line; and a recorded worktree that is missing, or that holds no commit past its base, sends the task back to serial (record it, keep the branch, remove the worktree).

3. **The file check runs once, before review, but the no-re-review merge depends on it holding at merge time.** Step 5 (SKILL.md:413-419) checks `<base>..<head>` when the implementer returns. Review fix rounds then add commits on the same branch, and nothing checks their files again. When the first task returns, the other task may still be running, so "none may be in the other task's changed files" cannot be judged against the other task's final changes. If a fix round in each task edits the same file in different hunks, the rebase in step 6 merges them silently, the second task fast-forwards without a fresh review, and `test_scope` on the union of the two `Files:` lists does not cover a file outside both lists. This matches the task text as written, so spec compliance is ✅ there. It is still a guard that a normal fix round can get around. Fix: repeat the step 5 check on `<base>..<head>` as the first action of step 6, with the same back to serial outcome.

#### Minor

1. A red `test_scope` after the rebase (SKILL.md:429-430) says "back to serial with a fresh review of the rebased diff" but not whether the rebased commits reach the build branch before the fix. Say "do not fast-forward" and say where the fix happens, since step 8 removes the worktree that holds the rebased branch.
2. Step 5 re-dispatches "after the other task merges" (SKILL.md:418-419). If the other task also goes back to serial, it never merges. Add "or goes back to serial".
3. The step 6 rebase moves `<b>` in place, so the branch the dispatch line names no longer points at the implementer's head. `mergeDefects` (01-fixture-build.sh:110-123) then scores the rebased head, and a defect the rebase itself introduced is red on both sides and not counted. Recording `head <sha>` on the `merging` line, or rebasing a copy branch, would keep the pre-merge head for the scorer.
4. Ledger M3, backtick half: the capture ends at the comma, so a trailing backtick only occurs if a controller writes the branch in backticks (`` branch `x`, ``). The capture then includes both backticks, `at` finds no such rev, and the run fails at line 116. One line in step 2 would close it: write the ledger line without backticks. The "branch gone" half is covered: nothing in the section deletes a branch, and step 5 says to keep it.
5. The report's "Fixture step 4 answer" section reasons from creation order. It should be corrected so the ledger does not carry the wrong reason into task 13.

### Assessment

Needs fixes. The skill text meets every acceptance criterion and the gate is sound. Important 1 is the deferred fixture item this review was named to check, and it is still open. Important 2 and 3 are parallel paths that do not fail toward serial on resume or after fix rounds.
