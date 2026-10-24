## Parallel implementers

Read this only when `.fx.json` sets `isolated_test_execution: true`: each
worktree then has its own database, cache and broker, so concurrent test runs
do not collide. Without that flag, implementers run serially.

The controller owns the task graph. A task is ready when everything it is
blocked by is merged. The ready tasks are the frontier.

1. **Each ready task gets its own worktree and branch**, and its own implementer,
   run in the background. The implementer confirms its worktree is based on the
   current tip of the build branch and resets onto it if not, builds the task
   with fx-tdd, and merges the build branch tip into its own branch before it
   reports done.
2. **Per-task review is unchanged.** The review range is the implementer
   branch's BASE..HEAD, taken before the merge. A task is not merged until its
   review passes.
3. **One merger, serial merges.** Reviewed branches merge into the build branch
   one at a time through a single merger subagent. A merge conflict is a
   NEEDS_CONTEXT for that task, not a guess.
4. **When a merge changes the frontier**, dispatch implementers for the newly
   ready tasks at once.
5. **Only the controller writes the ledger.** Implementers and the merger report;
   they do not append to it.
6. **Never `git stash`.** A stash is shared across worktrees. Commit, or leave
   the change in the worktree.
7. **Clean up the implementer worktrees** once their branches are merged.
