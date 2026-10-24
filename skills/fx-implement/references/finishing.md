## After the owner answers the menu

Read this only after the owner has chosen. Until then nothing below runs.

### Detect the environment

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
# Capture now, while still inside the workspace: the merge changes directory
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

| State | Cleanup |
|-------|---------|
| `GIT_DIR == GIT_COMMON` (normal repo) | No worktree to clean up |
| `GIT_DIR != GIT_COMMON`, named branch | Provenance-based (see Clean up the workspace) |
| `GIT_DIR != GIT_COMMON`, detached HEAD | Externally managed: leave in place; merge is not available, so only options 2 and 3 apply |

### Confirm the base branch

The base branch is what this work forked from, usually named in the plan or the
ledger. If it is not known, ask: "This branch split from <best guess>, is that
correct?" Merging into the wrong base is expensive to undo.

### Execute the choice

**1. Merge locally.** The owner chose this merge, so it is yours to perform.

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
git checkout <base-branch>
git merge <feature-branch>
```

Run no `git pull`: the owner did not ask for a fetch. Run the test command on the
merged result. If it fails, stop, leave the worktree and branch in place and
investigate; nothing was pushed. Once it is green, clean up the worktree, then
`git branch -d <feature-branch>`.

**2. Push and open a pull request.** Push only because the owner chose this. Tell the owner to run `/fx:fx-pr` first for the description body: a lane cannot invoke a user-invoked command.

```bash
git push -u origin <feature-branch>
```

Then open the pull request against `<base-branch>` with the forge's tooling,
following the repo's template, and report the URL. Keep the worktree: PR
feedback gets fixed there.

**3. Leave it.** Report "Keeping branch <name>. Worktree preserved at <path>."

**Discard** is not on the menu. When the owner asks for it, list the branch, its
commits and the worktree path, and wait for the typed word `discard`. Then clean
up the worktree and run `git branch -D <feature-branch>`.

### Clean up the workspace

Runs for option 1 and a confirmed discard. Options 2 and 3 keep the worktree.
Run from outside the worktree, using the values captured above.

- Normal repo: nothing to clean up.
- `WORKTREE_PATH` under `.worktrees/` or `worktrees/`: fx created it, so remove
  it: `git worktree remove "$WORKTREE_PATH"`, then `git worktree prune`.
- Anything else: the host owns it. Leave it.

If removal is refused (modified or untracked files), the worktree holds files
that exist nowhere else. Never add `--force`. Show the owner
`git -C "$WORKTREE_PATH" status --porcelain -uall` and ask: commit them to the
branch, move them into the main repo, or delete them (unrecoverable).

### Rationalizations

| Excuse | Reality |
|--------|---------|
| "Tests passed earlier this session" | Run the suite on the tree you are about to integrate. |
| "They obviously want it merged" | Integration is the owner's decision. Present the menu and wait. |
| "They seem done, I'll offer to discard it" | The menu is complete as written. Discard happens only when the owner asks for it. |
| "'Yeah, get rid of it' counts as confirmation" | Only the typed word `discard` authorizes deletion. |
| "The PR is up, so the worktree is clutter now" | PR feedback gets fixed in that worktree. It stays until the work lands. |
| "This other worktree looks stale, I'll clean it too" | Clean up only worktrees under `.worktrees/` or `worktrees/`. |
| "Removal refused, `--force` just finishes the cleanup" | The refusal means files exist only there. `--force` destroys them. Ask. |
| "The merged-result failure is probably flaky" | A failing merged result stops everything. Branch and worktree stay put. |
| "The base branch is obviously main" | Confirm the fork point or ask. |
| "The push was rejected, force-push will fix it" | The remote moved. Investigate; force-push only on the owner's explicit request. |
