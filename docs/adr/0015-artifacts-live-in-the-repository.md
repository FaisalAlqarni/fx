# Artifacts live in the repository, not the OS temp directory

Nothing fx tells an agent to write lands in the OS temp directory. A report a
user returns to lives in `docs/plans/<slug>/`. A throwaway worktree lives in
`.worktrees/`. A regenerable working file lives in the ephemeral workspace
under `.fx/`. `scripts/check-artifacts` makes this checkable: it fails when a
skill, agent or command names `/tmp`, `$TMPDIR`, `${TMPDIR`, `%TEMP%`,
`os.tmpdir` or `tmpdir` as a write target.

This reverses a decision `fx-architecture` inherited and had explicitly kept.
Its coverage record marks the choice as deliberately restored:

> "Write to the OS temp directory so nothing lands in the repo"

with the reason recorded alongside it:

> Two prior runs left files in `/development`.

That reason is about the repository root. Two runs of the upstream skill wrote
report files directly into the checkout, uncommitted and easy to mistake for
tracked output, and routing them to temp was the fix available at the time.
Upstream has no durable artifact directory, so temp was not a choice among
several, it was the only place that was not the root.

fx is not in that position. It has had a durable, git tracked home for
anything a user returns to since the plan directory existed, and that
directory is not the repository root. Writing a report into
`docs/plans/<slug>/` does not reproduce the failure the original rule was
guarding against: it lands inside a slug scoped directory the user already
created for this piece of work, next to the design and the task files, not
loose at the top of the checkout. The two problems look similar only if
"the repo" is read as one undifferentiated place. It is not: a plan directory
and the repository root carry different expectations about what belongs
there.

## Consequence a future reader will be surprised by

Reports become committed files. An architecture report, an audit's phase
documents, the visual companion's saved mockups: all of it now lands under
version control inside `docs/plans/<slug>/`, where a diff will show it and a
commit will carry it. This is intentional, not an oversight to clean up. A
report a user is meant to return to has to survive past the session that wrote
it, and a git ignored temp path does not survive a clean run.

## What does not change

The ephemeral workspace under `.fx/` is still git ignored and still deleted on
a clean run. Nothing here asks a regenerable working file to be committed:
only the artifacts a user is meant to come back to move out of temp and into
the repository.
