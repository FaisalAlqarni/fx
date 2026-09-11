# fx-lens-pipeline fixture

`fixture/worker.js` seeds eight defects, one per hunt group in
`agents/fx-lens-pipeline.md`, numbered in its own comments so a finding can
cite the line. `fixture/schema.sql` is the negative control: a real
data-layer defect that belongs to `fx-lens-database`, included to prove the
pipeline lens stays silent on a schema-only file. Per Ruling B in the plan
ledger, this fixture is intentionally defective code and is not itself under
review: do not fix its defects, do not make it runnable, and do not add the
`./queue` or `./db` modules it references.

1. **Fairness** (`worker.js:7`, the `QUEUE` constant): every campaign shares
   one queue with no per-campaign weighting, so a large campaign's jobs sit in
   front of every small campaign's jobs and starve them.
2. **Backpressure** (`worker.js:11`, `sentThisSecond`): the send-rate counter
   lives in process memory, so N worker processes each enforce the same local
   limit and the combined rate against the provider is N times the intended
   one.
3. **Job granularity** (`worker.js:20`, the `queue.push` inside the loop): one
   job is enqueued per recipient where one job per batch would cut scheduling
   overhead and broker traffic by the batch size.
4. **Transactional safety** (`worker.js:20`, the same line, inside
   `db.begin()`/`db.commit()`): the job reaches the queue before the
   transaction commits, so a consumer can dequeue it before the row it
   depends on has landed, or after the transaction rolls back and the row
   never lands at all.
5. **Resource pressure** (`worker.js:28`, `db.connect()`): a connection is
   acquired per job and never released, on the throw path or the success
   path, so failures and successes alike shrink the pool permanently.
6. **Idempotency** (`worker.js:32`, `queue.ack(job)`): the message is
   acknowledged before the send is recorded, so a crash between the two lines
   causes a redelivery that sends again with nothing to tell the two sends
   apart.
7. **Retries** (`worker.js:38`, `return handle(job)`): a failed send retries
   forever with no cap, no backoff, no jitter and no dead-letter path, so a
   permanently failing job spins in place and an exhausted one has nowhere to
   land.
8. **Lifecycle traceability** (`worker.js:42`, `console.log('sent')`): no
   identifier travels from intake to this line, so a message that fails partway
   through leaves no way to answer "where is this one message".

Regression signal: if a lens run against this fixture stops finding one of
the eight, or starts reporting on `schema.sql`, that is a lens regression.
If the fixture's line numbers move, this file's citations need updating to
match, which is the fixture-edit case this paragraph exists to distinguish
from the first.
