# Model Selection for Dispatched Subagents

Used by `fx-implement` (implementers, reviewers, fix rounds) and `fx-review`
(axes and lenses).

**Always specify the model explicitly when dispatching.** An omitted model
inherits the session's model: usually the most capable and most expensive, which silently defeats everything below.

| Work | Tier |
|---|---|
| Transcription: the task carries the test code, 1 to 2 files | cheapest |
| Mechanical implementation, complete spec, 1 to 2 files | cheap / fast |
| Single-file mechanical fixes | cheapest |
| Multi-file integration, pattern matching, debugging | standard |
| Design judgment, or broad codebase understanding | most capable |
| Reviews | scaled to the diff's size, complexity and risk: **mid-tier floor** |
| Scoped re-reviews of small fix diffs | cheap-to-mid |
| Fix rounds 4 to 5 | at least one tier **above** the implementer that got stuck |
| Final whole-branch review | most capable: **not** the session default |

**Use the least powerful model that can do the job.** Most implementation
tasks are mechanical when the plan is well specified.

## Turn count beats token price

Wall-clock and context cost scale with **how many turns** a subagent takes, and
the cheapest models routinely take 2 to 3× the turns on multi-step work: costing
more overall.

**Mid-tier is the floor** for reviewers, and for implementers working from
prose rather than from written tests.

## Complexity signals

- Touches 1 to 2 files with a complete spec → cheap model
- Touches multiple files with integration concerns → standard model
- Requires design judgment or broad codebase understanding → most capable
