# The app-layer gap gets its own lens, narrowed to unbounded enqueue

`fx-review` has a fifth lens, `fx-lens-pipeline`, against a recommendation this
repository had recorded. It ships with one hunt group, unbounded enqueue
outrunning consumers, and **the keep is provisional**.

## The recommendation it overrides

`0008-no-performance-lens.md` left app-layer performance uncovered and said how
to cover it if the gap were revisited:

> Fold it into `fx-lens-database`'s brief as an app-layer section rather than
> paying a second dispatch for it.

This pays the second dispatch. `fx-lens-database`'s triggers are schema-shaped:
migrations, SQL files, models, query chains. They would not fire on a worker, a
scheduler or a queue configuration, which is the diff this lens exists for, so a
section folded into its brief would sit in a lens never dispatched on the change
it describes. The whole-system audit needed a lens that reads a file set as well,
and the four existing lenses read a diff.

## The measurement, and the narrowing

The approved design gave the lens queue and delivery behaviour as a whole.
Before it shipped, a blind measurement pre-registered in the plan ledger ran five
lens runs against five control runs on one fixture. Each control run was the
correctness, standards and adversarial passes branch review dispatches. The rule,
fixed before any data: the lens keeps a group if the lens arm finds it in at
least 4 of 5 runs and the control arm finds it in at most 2 of 5, and a group the
control finds in 3 or more runs is dropped.

The lens found all six scored groups in 5 of 5 runs. The control found groups 1
to 4 in 5 of 5, group 5 in 3 of 5 on the strict reading and 5 of 5 on the
lenient one, and group 6 in 0 of 5. **Five of six groups were dropped, because
the passes branch review already runs found them.** Every call is in
`docs/plans/2026-09-11-fx-audit/measurement-task05.md`; the fixture, the
summary and the regression signal are in `tests/lens-pipeline/README.md`. One
fixture and five runs per arm: nothing here generalises past that fixture.

**The user chose to ship the lens narrowed to group 6**, rather than first
running the pass the control omitted, or shipping no lens. Groups 1 to 5 left its
hunt list, and it cedes those defects to the correctness and adversarial passes
branch review runs. The narrowed lens hunts none of the items
`0008-no-performance-lens.md` listed by name: a job enqueued per record is an
unbatched loop, which it cedes, and the rest stay where that record left them.

## Why the keep is provisional

The control omitted the broad reviewer branch review also dispatches,
`skills/fx-review/reviewer-prompt.md`, which checks scalability explicitly and was
never run against the fixture. Groups 1 to 5 survive the omission, because the
control found them without it. Group 6 does not: the only group kept rests on an
incomplete control until a control including that reviewer has been run.

## What qualifies the evidence

- **The control's correctness pass was a general reviewer standing in for
  `/code-review`**, which branch review runs and a dispatched agent cannot
  invoke.
- **Every lens run read the lens file through a brief.** None dispatched
  `fx-lens-pipeline` by name, because named dispatch loads the installed copy
  under `0010-behaviour-is-measured-against-the-installed-plugin.md` and the lens
  under test was not in it.
- **Group 1's drop is the weakest-backed of the five.** Every control pass that
  found it cited a comment in the fixture, so the fixture's own context made the
  defect visible.
- **The key's claim failed for rows 1 to 5.** For each row it said a
  queue-naive reader would plausibly miss the defect. That held for row 6 alone.

## What it costs

- **A second dispatch** on a diff that touches both this lens's triggers and
  `fx-lens-database`'s. That is why `fx-review` runs this lens in branch mode
  only, once per branch, never per task.
- **In an audit, queue behaviour beyond unbounded enqueue has no dedicated
  pass.** The lens cedes head-of-line blocking, redelivery, poison messages,
  lease timing and retry jitter to the correctness and adversarial passes of
  branch review. The audit's Phase 3 dispatches this lens and `fx-architecture`,
  and neither of those passes, so an audit judges those defects only as far as
  the phase's own reading reaches. Adding a pass there would change the design
  the user approved and cost a dispatch the user was never shown, so whether to
  add one is left to the user.
