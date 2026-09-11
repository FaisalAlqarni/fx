# fx-lens-pipeline fixture

`fixture/worker.js` seeds six defects, one per hunt group in
`agents/fx-lens-pipeline.md`. The lens is narrowed to concerns that need
knowledge of how queues behave (fairness, delivery semantics under
redelivery, poison messages, visibility timeouts, retry storms, unbounded
enqueue), not concerns ordinary careful reading already catches. The code
carries no comment that names or categorises a defect: an ordinary code
comment is fine, a comment that states what is wrong is not, because that
would let any reader pass by transcription rather than by finding it.
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

Regression signal: if a lens run against this fixture stops finding one of
the six in `KEY.md`, or starts reporting on `schema.sql`, that is a lens
regression. If the fixture's line numbers move, `KEY.md`'s citations need
updating to match, which is the fixture-edit case this paragraph exists to
distinguish from the first.
