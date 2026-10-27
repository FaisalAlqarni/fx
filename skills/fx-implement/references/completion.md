## Write the plan-complete line

Once the exit gate has passed, append one line to the ledger before the
completion report: `lib/plan-state.js` looks for `Plan complete:` to stop
naming a finished plan in a later session's preamble. Write it only when no
task is parked:

```
Plan complete: tasks <first> to <last> complete, final review <clean|fixed>
```

With any task still parked, write this instead, so later sessions keep naming
the plan until the parked work is answered and done:

```
Plan paused: tasks <a> to <b> complete, <K> parked, needs you
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
- **ADR candidates**: every `Ruling:` ledger line that passes the three ADR
  tests in `domain-modeling.md`, quoted, offered through menu option 5. With
  none, write `ADR candidates: none`, so the omission is visible.
- **Docs**: the ledger's `Docs:` line, repeated, naming each doc listed stale.
  When the docs step did not run, list every `Docs claim wrong:` ledger line
  too, so a wrong doc still reaches the owner. With `Docs: offer pending`, say
  the docs step waits on menu option 4.
- **Parked**: deferred findings and why.
- **Skipped**: blocked tasks and what unblocks them.
- **Needs you**: every `needs you` line in the ledger (a parked task or a declined item), each with what unblocks it, plus the branch name and
  worktree path so the user can review and merge.

### Then ask, and stop

End the report with one line: "`/fx:fx-retro` reviews this build." Then
present exactly these, and wait for an answer. Do not recommend one, do not
explain them, and do not start any of them.

```markdown
The work is on `<branch>` in `<worktree path>`. What next?

1. Merge it into `<base branch>` locally
2. Push the branch and open a pull request
3. Leave it as it is, I will handle it
4. Run `fx-docs` on the branch first
5. Write ADRs for the candidates with `fx-adr`

Which?
```

Show option 4 only with `Docs: offer pending` in the ledger, and option 5 only
with at least one ADR candidate; renumber so the list has no gap. On 4, run
the docs step as [final-review.md](./final-review.md) says, review its commits
with the branch pass, then show the menu again. On 5, invoke `fx-adr` for the
candidates the owner picks, then show the menu again.

**Why an offer rather than a rule.** A prohibition invites the reading that
found its way around it: a measured run treated "commit it" as the say-so that
made a base-branch commit fine, because the rule said "no exceptions" while the
user's own version had a carve-out. An offer has nothing to interpret. The base
branch moves when the user says which option, and not before.

Options 1 and 2 are theirs to choose and yours to then perform.

Discard only when the owner asks for it: list the branch, its commits and the worktree path, and act only after the owner types the word discard.

**Clean up the ephemeral half only.** When the final review is clean, delete
`.fx/<slug>/`: regenerable from git. **Never delete `docs/plans/<slug>/`**:
committed, durable, the record. Sibling directories belong to other work.
