# Model Selection for Dispatched Subagents

Used by `fx-implement` (implementers, reviewers, fix rounds) and `fx-review`
(axes and lenses).

**Always specify the model explicitly when dispatching.** An omitted model
inherits the session's model: usually the most capable and most expensive, which silently defeats everything below.

Three tiers: cheapest, standard, most capable. Harness-specific model names
live in `references/harnesses/<runtime>.md`, never here.

## Default: standard

**The default for an implementer, reviewer, lens, research agent or audit is
the standard tier.** Go below it only for the cheapest-tier cases named
below. Go above it only with a stated reason.

## Most capable: only with a stated reason

The most capable tier needs a one-line reason, written both in the dispatch
prompt and in the ledger entry for that dispatch. Work that qualifies:

- Security-critical code or review: guards, classifiers, permission models.
- Design or spike analysis.
- The red team.
- Fix rounds 4 and 5.
- The final whole-branch review.

This names what is expected to qualify, not a closed set: other work that
genuinely needs it still needs the reason written down.

## Cheapest: read-only or fully specified, never side-effecting

Never dispatch the cheapest tier for anything with a side effect outside the
worktree: live runs, credential copies, runs with permissions bypassed,
deletes, or `git` history changes. Use it only for:

- Read-only lookups.
- Small edits where the task file already carries the tests.

Reason: agents in this build broke delete and worktree rules even on
stronger tiers. The cheapest tier stays off anything that can do damage.

## Babysitting a long-running command

An agent that waits on a live run, a test queue, or any other long-running
command uses the standard tier. It launches one tracked command that ends
when the whole queue ends, so it wakes once, not on every step. Each wake
re-reads its full context: a step-by-step wake pays that cost every time.

## Turn count beats token price

Wall-clock and context cost scale with **how many turns** a subagent takes, and
the cheapest models routinely take 2 to 3× the turns on multi-step work: costing
more overall. This is why standard, not cheapest, is the default even for
work that looks mechanical.

## Complexity signals

- Touches 1 to 2 files with a complete spec, and the task carries the tests → cheapest
- Anything else an implementer, reviewer, lens, research agent or audit does → standard
- Security-critical code or review, design or spike analysis, the red team,
  fix rounds 4 to 5, or the final branch review → most capable, reason stated
