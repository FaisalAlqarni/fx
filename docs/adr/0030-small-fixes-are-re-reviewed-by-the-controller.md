# Small fixes are re-reviewed by the controller, and test_all runs once

## Context

Three costs in `fx-implement` showed up in a measured build on advantage-backend.

- Fix rounds cost 13.3% of agent-minutes, and each ended with a dispatched re-reviewer. Of 543 fix commits since 2026-09-21, the median changed 16 production lines. The same commits changed 52 lines counting tests and docs. 55% changed 20 production lines or fewer.
- The controller's context is the scarce resource. A dispatched re-reviewer for a 10-line fix costs a fresh context, a review package and a findings file to answer a question the controller can answer from the diff.
- The full suite takes 35 to 45 minutes there. The baseline run before task 01 doubled that cost before any work began, and the exit gate ran it again.

## Decision

1. **Controller re-review for small fixes.** The controller reads the fix diff itself, instead of dispatching a re-reviewer, when all four hold: the fix changes 20 production lines or fewer, it touches only files already in the task's diff, every open finding came from the task reviewer (none from a tripwire lens), and no open finding is Critical. The cap counts production lines because tests and docs are the part of a fix that does not need a reader: `git diff --numstat` with glob excludes for test and doc paths at any depth, and a binary file counts as over the cap. The controller writes the same re-review file a dispatched re-reviewer writes, with `### Finding verdicts` and `### New breakage in the fix diff`, because round 2 onward reads them. The 20-line cap is what keeps "read a diff yourself" an exception. The controller still never fixes findings itself. The final review's fix wave may split into serial fixers grouped by file, one re-review each, still with no second wave.

2. **No baseline run.** `test_all` runs once per build, at the exit gate. Per-task gates use `test_scope`.

3. **Classify every failing test at the exit gate.** This replaces what the baseline was for. Each failing test runs alone on the branch, then in a throwaway detached worktree of the merge base after `setup`. A test file absent on the merge base is introduced, because a baseline could not have contained it. Pre-existing means the same assertion fails on both. A failure on the merge base for another reason (setup, missing dependency) is treated as introduced, since it proves nothing about the test. Introduced blocks the completion claim. A test that passes alone on the branch is order-dependent and is reported with the order that failed.

4. **A per-task `test_all` run is ledgered, not re-run.** The implementer's `Tests:` line names the command it ran, so the controller can see it. The controller ledgers `Task <NN>: ran test_all (rule)` and repeats the rule on the next dispatch or resume. Re-running a finished task's tests costs more than it saves.

## Ledger lines

- `Task <NN>: fix round <R>/5: controller re-review (<L> lines): <X> addressed, <Y> open`
- `Exit gate: <test>: pre-existing|introduced|order-dependent`
- `Task <NN>: ran test_all (rule)`

## Consequences

Small fixes skip one agent dispatch each. The controller reads at most 20 production lines per round. The exit gate can spend one extra setup and a few single-test runs when `test_all` fails, and nothing when it passes. `tests/gates/fix-loop-shape.test.js` pins the wording.
