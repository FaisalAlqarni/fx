# fx-lens-pipeline fixture key

This is the answer key for `fixture/worker.js` and `fixture/schema.sql`. The
fixture code carries no comment that names or categorises a defect: this file
does, so that reading the fixture itself tests whether an agent can find a
defect rather than whether it can transcribe a label. Per Ruling B in the
plan ledger, the fixture is intentionally defective code and is not itself
under review: do not fix it, do not make it runnable, and do not add the
`./queue`, `./db` or `./provider` modules it references.

| # | Hunt group | Location | Mechanism |
|---|---|---|---|
| 1 | Fairness and head-of-line blocking | `worker.js:6` | Every campaign is pushed onto the same `QUEUE` constant, with no per-campaign partition, weight or priority. On a first-in-first-out queue, a large campaign's jobs sit in front of every small campaign's jobs and starve them of worker time. |
| 2 | Backpressure and rate limits | `worker.js:8-17`, invoked at `worker.js:32` | `sentThisSecond` and its reset timer are state local to one process, with no shared store behind them. Each worker process enforces `MAX_PER_SECOND` against its own counter, so the combined rate against the provider across N processes is up to N times the intended one. |
| 3 | Job granularity and batching | `worker.js:23` | One job is enqueued per recipient inside the loop. A single job carrying a slice of recipient ids would cut broker traffic and per-job scheduling overhead by the batch size. |
| 4 | Transactional safety and crash recovery | `worker.js:23`, inside the `db.begin()` / `db.commit()` block spanning lines 21-25 | The job reaches the queue on line 23 before the transaction commits on line 25. A consumer can dequeue and start work before the row is durable, and if the transaction rolls back the queue is left holding a job for a recipient row that was never committed. |
| 5 | Resource pressure | acquired `worker.js:29`, released only at `worker.js:39` | `conn.release()` runs only after every earlier line has succeeded, with no `try`/`finally` around any of it. An exception from `queue.ack`, `waitForSlot`, `provider.send` or the `UPDATE`, and the early `return` on line 36 for a failed send, all skip the release and permanently remove one slot from the pool per occurrence. |
| 6 | Idempotency and delivery guarantees | `worker.js:31, 33-34` | The job is acknowledged on line 31, before the send is attempted on line 33 and before its outcome is recorded on line 34. A crash between the ack and the state write leaves no record of whether the provider ever saw the message. Read on its own this is a lost acknowledgment, not a guaranteed duplicate: the queue no longer has the job, and nothing here confirms the send happened. Whether it becomes a duplicate depends on whether anything elsewhere reconciles a row stuck with no recorded state, and nothing in this file does. |
| 7 | Retries, backoff and dead letters | `worker.js:36` | `return handle(job)` retries by calling itself again, with no cap, no backoff, no jitter and no dead-letter path. It does not make the job disappear: a permanently failing send retries unconditionally forever, hammering the provider on every attempt with no delay between attempts, and nothing ever records that this job cannot succeed. |
| 8 | Lifecycle traceability | `worker.js:38`, and the absence of any log elsewhere in the function | `console.log('sent')` carries no job id, recipient id, campaign id or correlation id, and only runs when a send succeeds. A failing or endlessly retried job leaves no trail at all: "where is this one message right now" has no answer from these logs. |

`schema.sql` is the negative control: `sends.campaign_id` has no index and no
`REFERENCES` constraint, which is `fx-lens-database`'s finding. The pipeline
lens should say nothing about this file beyond, at most, a one-line cession.

## Fixed rather than seeded

`provider` (used at `worker.js:33`) is declared at `worker.js:4`, alongside
`queue` and `db`. The first draft of this fixture referenced `provider`
without declaring it, which would throw a `ReferenceError` on the first job
and mask every defect at or after line 33 from anything that tried to run the
file. That is not one of the eight hunt groups and would have measured "can
you spot an undeclared variable" rather than pipeline behavior, so it was
declared rather than kept as a ninth item.
