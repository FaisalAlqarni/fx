## Write the plan-complete line

Once the exit gate has passed, append one line to the ledger before the
completion report: `lib/plan-state.js` looks for it to stop naming a finished
plan in a later session's preamble.

```
Plan complete: tasks <first> to <last> complete, <K> parked, final review <clean|fixed>
```

**Commit it yourself, now.** This is the last write of the build: no task
commit and no subagent dispatch follows it to carry `state.md` along. An
appended line nobody commits never leaves the worktree, so the plan reads as
unfinished on the base branch after merge.

```
git add docs/plans/<slug>/state.md
git commit -m "docs(plan): record plan completion"
```

## Completion report

You do not integrate the work. You report it, then **offer the choice and
wait**. Report:

- **Landed**: tasks complete, with per-task test evidence.
- **Deviations**: every step of this skill you skipped, compressed or
  reordered, each with the reason. Announcing only the deviations you are
  comfortable defending is the failure mode: a measured run disclosed a
  compressed interview and stayed silent about dropping the design doc, the
  plan and the todo file. **A deviation you did not announce is a decision made
  in secret**, and it is indistinguishable from not having noticed.
- **Rulings I made**: **every** ledger line containing `Ruling:` outside the
  `## Standing rulings` section, in the
  order made, each with what it costs if wrong. **Exhaustive: if the ledger
  holds a ruling, the list holds it.** *It's the only place decisions made on
  the user's behalf reach them: a ruling that dies unreported was a decision
  made in secret.*
- **Parked**: deferred findings and why.
- **Skipped**: blocked tasks and what unblocks them.
- **Needs you**: anything that hit a stop condition, plus the branch name and
  worktree path so the user can review and merge.

### Then ask, and stop

Present exactly these, and wait for an answer. Do not recommend one, do not
explain them, and do not start any of them.

```markdown
The work is on `<branch>` in `<worktree path>`. What next?

1. Merge it into `<base branch>` locally
2. Push the branch and open a pull request
3. Leave it as it is, I will handle it
4. Discard it

Which?
```

**Why an offer rather than a rule.** A prohibition invites the reading that
found its way around it: a measured run treated "commit it" as the say-so that
made a base-branch commit fine, because the rule said "no exceptions" while the
user's own version had a carve-out. An offer has nothing to interpret. The base
branch moves when the user says which option, and not before.

Options 1 and 2 are theirs to choose and yours to then perform. Option 4 deletes
work: confirm the branch name back to them before doing it.

**Clean up the ephemeral half only.** When the final review is clean, delete
`.fx/<slug>/`: regenerable from git. **Never delete `docs/plans/<slug>/`**:
committed, durable, the record. Sibling directories belong to other work.
