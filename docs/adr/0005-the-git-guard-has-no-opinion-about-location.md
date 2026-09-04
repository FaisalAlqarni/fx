# The git guard has no opinion about where you are

The guard does not resolve repositories. `locate()`, the read-only list and the
allowed-on-main list are gone, and with them every failure that came from the
guard being wrong about location: a `git commit` inside a heredoc, a `git merge`
inside a quoted grep pattern, and `cd <worktree> && git commit` refused while
`git -C <worktree> commit` was allowed.

That last pair ran both ways. When the session cwd was not a repository,
**anything reached through `cd` was allowed**, including a commit to the base
branch. The guard was partially blind and nobody knew, because the blind spot
was silent by construction.

The branch rule is now a workflow plus a human gate, which is the shape
superpowers uses: `PREAMBLE.md` says work happens in a worktree, and integration
is the user's decision that you stop and ask for.

## What the guard still refuses

Attribution trailers, force push, deleting a remote branch, `--no-verify`,
`reset --hard`, `clean -f`, `branch -D`, `stash drop`, `checkout .`, `tag -d`,
and any push naming a base branch. **Every one is irreversible, outward, or
both.**

## Consequences

- **A push must name its target.** A bare `git push` follows the current branch,
  which may be the base branch, and the guard no longer asks git where it is.
  `git push origin feature` is fine anywhere. This replaces filesystem
  introspection with arithmetic, so the dangerous case is unreachable.
- **A search tool's arguments are data; a shell's `-c` argument is a command.**
  Both directions were wrong once, for the same reason.
- When a guard is strict enough to be worth having, ship the supported path
  around it for legitimate cases, or someone weakens it later. Hence
  `scripts/make-git-fixture`.
