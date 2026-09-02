# Worktree Setup

One-time procedure at the start of an `fx-implement` run. Ensures work happens
in an isolated workspace.

## 1. Detect first: you may already be in one

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" && pwd -P)
```

**Submodule guard:** `GIT_DIR != GIT_COMMON` is *also* true inside a submodule.
Before concluding "already in a worktree", check:

```bash
git rev-parse --show-superproject-working-tree
```

Returns a path → you are in a **submodule**, not a worktree. Treat it as a
normal repo.

**Already in a linked worktree** (`GIT_DIR != GIT_COMMON`, not a submodule) →
**do not create another.** Report:

- On a branch: `Already in isolated workspace at <path> on branch <name>.`
- **Detached HEAD:** `Already in isolated workspace at <path> (detached HEAD,
  externally managed). Branch creation needed before any commit.`
  **Do not commit on a detached HEAD**: those commits become unreachable the
  moment HEAD moves. Create a branch first.

**Normal checkout** (`GIT_DIR == GIT_COMMON`) → create the worktree. The user's
standing instruction is that work happens in a worktree, so **do not ask**.

## 2. Prefer the harness's native tool

If one exists (`EnterWorktree`, `WorktreeCreate`, a `/worktree` command, a
`--worktree` flag) **use it.** It owns placement, branching and cleanup.

**Using raw `git worktree add` when a native tool exists creates phantom state
the harness cannot see or manage.** This is the most common mistake here.

## 3. Fallback: `git worktree` directly

**Directory priority**: explicit user preference beats observed filesystem
state:

1. A directory the user named
2. An existing `.worktrees/`, else `worktrees/`: **`.worktrees` wins if both
   exist**
3. Default: `.worktrees/` at the project root

**Verify it is git-ignored before creating anything:**

```bash
git check-ignore -q .worktrees || git check-ignore -q worktrees
```

Not ignored → add it to `.gitignore` **first**. **An unignored worktree
directory commits the whole tree into the repo.**

Then:

```bash
git worktree add "$LOCATION/$BRANCH_NAME" -b "$BRANCH_NAME"
cd "$LOCATION/$BRANCH_NAME"
```

**Sandbox fallback:** creation fails with a permission error → say the sandbox
blocked it, that you are working in the current directory instead, then run
setup and baseline in place.

**Never start implementation on main/master** without the user's explicit
consent.

## Rationalizations

| Excuse | Reality |
|---|---|
| "I'm obviously not in a worktree: no need to check" | Run the detection. Harness-created isolation and submodules both fool eyeballing; the commands settle it. |
| "`git worktree add` is quicker than hunting for a native tool" | A native tool owns placement, branching and cleanup. Bypassing it is the #1 mistake: phantom state the harness can't see. |
| "The worktree directory is surely ignored already" | Run `git check-ignore`. An unignored worktree directory commits the whole tree into the repo. |
| "Any directory name works" | Explicit instructions beat an existing project-local directory, which beats the `.worktrees/` default. |
| "The workspace is fresh: baseline tests can wait" | A dirty baseline makes every later failure ambiguous. Run them now; proceeding past failures is the user's call. |
