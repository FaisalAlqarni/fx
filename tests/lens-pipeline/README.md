# fx-lens-pipeline fixture

`fixture/worker.js` seeds six queue defects, keyed in `KEY.md`. All six were
the lens's hunt groups when the lens was measured; under Ruling U the lens
hunts only the sixth, unbounded enqueue outrunning consumers, given a diff,
and all six given a file set. The code carries no comment that names or
categorises a defect: an ordinary code comment is fine, a comment that states
what is wrong is not, because that would let any reader pass by transcription
rather than by finding it.
`fixture/schema.sql` is the negative control: a real data-layer defect that
belongs to `fx-lens-database`, included to prove the pipeline lens stays
silent on a schema-only file. Per Ruling B in the plan ledger, this fixture
is intentionally defective code and is not itself under review: do not fix
its defects, do not make it runnable, and do not add the `./queue`, `./db`
or `./provider` modules it references.

The answer key, one row per defect with its hunt group, its line, the
mechanism, and why a queue-naive reader would plausibly miss it, lives in
`KEY.md`, not here: keeping one file that names the defects keeps the
fixture itself silent about them.

Per the round 2 ruling in the plan ledger, this fixture's author does not
run the control or the lens arm against it. Measurement is a separate pass,
run blind, so the answer cannot leak from the person who wrote the key.

## Measurement

Five blind lens runs against five control runs, each control run being the
correctness, standards and adversarial passes branch review dispatches,
scored against `KEY.md` at `d496d1e`. The control found rows 1 to 4 in 5 of
5 runs and row 5 in 3 of 5 or 5 of 5 depending on the reading; the lens found
all six in 5 of 5. Row 6 was the only row the control missed, 0 of 5, so under
the pre-registered rule the lens keeps that group and drops the other five.
Every scored call is in `docs/plans/2026-09-11-fx-audit/measurement-task05.md`.

The control's correctness pass was a general reviewer standing in for
`/code-review`, as the protocol that record follows discloses. Every lens run
read the lens file through a brief, and none dispatched `fx-lens-pipeline` by
name. Group 1's drop is the weakest-backed of the five, because every control
pass that found it cited the comment at `worker.js:22` (the record's
disclosure 2). The key's "Why a queue-naive reader plausibly misses it" column
failed for rows 1 to 5 (the record's disclosure 4).

**The keep is provisional.** The control left out the broad reviewer that
branch review also dispatches, which checks scalability explicitly and was
never run against this fixture. Row 6's result rests on that incomplete
control until a control including it has been run.

## Regression signal

Given a diff, a run of the lens against this fixture regresses when it does
not find row 6, when it reports any of rows 1 to 5, or when it reports
anything about `schema.sql`. Given a file set, a run regresses when it does
not find all of rows 1 to 6, when it reports anything about `schema.sql`, or
when its output has no `Unread:` line. If the fixture's line numbers move,
`KEY.md`'s citations need updating to match, which is the fixture-edit case
this paragraph exists to distinguish from a lens regression.
