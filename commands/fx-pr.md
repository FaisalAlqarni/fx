---
description: Draft a pull request description to paste: what and why, changes, evidence, merge danger. Never pushes or opens a PR
disable-model-invocation: true
argument-hint: "[base-branch]"
---

# /fx:fx-pr

**Argument:** the base branch. No argument? Use the branch the worktree was cut
from, else the repo's default branch.

Draft a description the owner pastes. **Never run `git push` or any `gh`
command, and never open or edit a pull request.**

## Read

- `git log --oneline <base>..HEAD` and `git diff --stat <base>...HEAD`.
- When the branch came from a plan: `docs/plans/<slug>/design.md` and
  `state.md` (test evidence per task, `Ruling:` lines).

## Write

Four sections, these exact headings:

## What and why
Three lines at most. The point first, then the reason.

## Changes
One line per area, about seven at most.

## Evidence
What ran, with its result. **End with a `Not run:` line** naming what did not
run, or `Not run: nothing.` Never list a pass for a command you did not see run.

## Merge danger
Two lines: one-way or two-way door, and the blast radius.

No code, diff or diagram unless the owner asks.

## Output

Show the draft in chat. When a plan exists, also save it to
`docs/plans/<slug>/pr.md`. Nothing else is written.
