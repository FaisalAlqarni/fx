Package the whole branch: `bash scripts/review-package <PLAN> <MERGE_BASE> <HEAD>`
where `MERGE_BASE` is `git merge-base <base-branch> HEAD`. Include the printed
path in the dispatch, **so the final reviewer reads one file instead of
re-deriving the branch diff with git commands.**

Invoke the fx-review lane in branch mode on the **most capable available model** (`Capable because: final branch review`).
Point it at the ledger's **deferred-minor and parked lines** so it can triage
which must be fixed before merge.

The branch pass is limited, not full: the broad pass, the unprimed devil's advocate, and at most four lenses, with `fx-lens-security` on an auth change counted inside the four. Devil's advocate always runs; an auth change only moves it to the top tier.
The broad pass covers the cross-task seams. A lens runs
only if it never fired on any task, or its branch trigger matches files
outside the tasks where it fired; lenses past four fold into the broad pass's
brief as named checks, in the lens table's order (`fx-review` step 2). When
the branch touches authentication or authorization, dispatch
`fx-devils-advocate` on the most capable available model, with
`Capable because: final branch review, auth change` as the prompt's first line
and `model` set. Otherwise the with-ledger pass dispatches devil's advocate on
the standard tier.

If it returns findings: **ONE fix subagent with the complete findings list: not one fixer per finding.** *Per-finding fixers rebuild context and re-run
suites each time; a real session's final-review fix wave cost more than all
its tasks combined.* Then exactly **one** scoped re-review.
The branch pass covers what per-task review missed, so its wave is
usually small. When the findings span more than one lens, you may split them into
serial fixers grouped by file, each followed by one scoped re-review; still
no second wave. Adjudicate
residuals as at the breaker: park with rulings, or rule and ledger the
load-bearing ones. **No second fix wave**: residuals surface to the user in
the completion report.

Only the four stop conditions stop you here.
