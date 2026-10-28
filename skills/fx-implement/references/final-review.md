## Docs step: offer before the branch pass

Before packaging the branch, decide the docs step. Never invoke `fx-docs` without a yes.

1. No Markdown under `docs/` outside `docs/plans/` carries an `Evidence:` line.
   With `"docs_first_run": "declined"` in `.fx.json`, ledger
   `Docs: not run: no evidence-bearing docs` and go on. Otherwise offer the
   first full run once: "This repo's docs carry no evidence lines. `fx-docs` can
   run a first full documentation run, in Markdown, and HTML pages under
   `docs/html/` too if you want them. Run it, and with pages?" On yes, invoke
   `fx-docs` for a full run in the worktree, passing whether pages were wanted, and ledger `Docs: first full run: <n> written`. On
   no, write `"docs_first_run": "declined"` to `.fx.json` and ledger
   `Docs: not run: no evidence-bearing docs, first run declined`. Then go on
   to the branch pass.
2. Otherwise offer it in one line: "`fx-docs` can update the docs this branch
   affects before the branch review, and their HTML pages if you want them. Run
   it, and with pages?" Pass the pages answer to `fx-docs`.
3. On yes, invoke `fx-docs` in branch mode in the worktree. Pass it every
   `Docs claim wrong:` ledger line and `git diff --no-renames <merge-base>...HEAD --name-only`.
   It commits on the branch. Ledger `Docs: <n> updated, <n> written, <n> listed stale, <n> HTML pages out of date`.
4. On no, ledger `Docs: not run: declined`.
5. If you cannot put either offer to the owner now (the whole build runs in
   one turn with no point to ask), ledger `Docs: offer pending` and go on. The
   completion report then carries the offer as a menu option
   ([completion.md](./completion.md)). Never ledger `Docs: not run` without the owner's answer or the declined key.

The branch pass below then reviews the whole branch, docs commits included.

## Branch pass

Package the whole branch: `bash scripts/review-package <PLAN> <MERGE_BASE> <HEAD>`
where `MERGE_BASE` is `git merge-base <base-branch> HEAD`. Include the printed
path in the dispatch, **so the final reviewer reads one file instead of
re-deriving the branch diff with git commands.**

Invoke the fx-review lane in branch mode on the **most capable available model** (`Capable because: final branch review`).
Put plan.md's `## Review Focus` body in its brief verbatim, beside the Global
Constraints. Point it at the ledger's **deferred-minor and parked lines** so it can triage
which must be fixed before merge, and name **every ruled `declined:` line** in
its brief as input. The branch reviewer's own declined items get a ledger line
each: `Final review: declined: <behaviour>: <reason>. Ruling: <stands | fix | parked>: <why>`.

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

## Humanize pass

Once per branch, never per task: after the fix wave and before its scoped
re-review, dispatch one subagent on the standard tier (Sonnet). It invokes
the fx-humanize lane in file mode on the prose the branch added, as
`git diff <MERGE_BASE>...HEAD` shows it: Markdown docs, ADRs, and the comments
added in code. It changes prose only, runs
`python3 -I <skill base directory>/../../scripts/check-prose --diff <MERGE_BASE>`
until it exits 0, and commits once as `docs: humanize pass`. The scoped
re-review covers that commit with the fixes; when the branch pass found nothing,
the commit gets one scoped re-review of its own. Ledger
`Final review: humanize pass <sha7>`, or `Final review: humanize pass: no prose changed`.

Only the four stop conditions stop you here.
