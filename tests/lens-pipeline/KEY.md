# fx-lens-pipeline fixture key

This is the answer key for `fixture/worker.js` and `fixture/schema.sql`. The
fixture code carries no comment that names or categorises a defect. Per
Ruling B in the plan ledger, the fixture is intentionally defective code and
is not itself under review: do not fix it, do not make it runnable, and do
not add the `./queue`, `./db` or `./provider` modules it references.

Round 2 narrows the seeded defects to the six hunt groups that survive
narrowing the lens to concerns that need knowledge of how queues behave.
Each row also states why a careful reader with no queue-specific knowledge
would plausibly miss it: that column is the claim the blind measurement
tests, written so it can be shown wrong.

| # | Hunt group | Location | Mechanism | Why a queue-naive reader plausibly misses it |
|---|---|---|---|---|
| 1 | Fairness and head-of-line blocking | `worker.js:6`, realized at `:18` and `:24` | `enqueueCampaign` (bulk, one call per recipient in a campaign that can run to thousands) and `enqueueReceipt` (a single transactional email) both push onto the same `SEND_QUEUE`, with no priority field and no separate lane. On a first-in-first-out queue, a large campaign's backlog sits in front of every receipt queued after it. | Each enqueue function is correct read in isolation; nothing in either one is wrong. The defect only exists as a relationship between two call sites a reader has to hold together, and requires already knowing that a single FIFO queue serving unlike-priority workloads causes head-of-line blocking, a queueing-theory fact rather than a local code smell. |
| 2 | Delivery semantics and idempotency | `worker.js:46-59`; no check exists before the send at `:48` | `handle` acks only after the database write succeeds (line 59, after line 54-57), which is the ordering a reader taught to check "does ack come before or after the work" would look for and find already correct. There is still no idempotency check: nothing queries whether this `campaign_id`/`recipient_id` pair is already marked sent before calling `sendWithRetry`. Under at-least-once delivery the broker can redeliver this job even after a correctly-ordered ack (the ack itself can be lost in transit), and a redelivery re-sends unconditionally. | The one local signal a reader checks (ack ordering) is satisfied, so a reader who confirms "ack comes last" has no reason drawn from this function's control flow to keep looking. The remaining risk is a property of the broker's delivery guarantee, not of anything visible here. |
| 3 | Poison messages | `worker.js:49-51` and `:60-61` | Both the "provider said no" path and the exception path call `queue.nack(job, { requeue: true })` unconditionally. Neither reads any delivery or attempt count off `job` before deciding to requeue. A message that can never succeed (a rejected address, a permanently malformed payload) cycles through `handle` forever, occupying a worker and its position in the queue on every cycle. | Requeuing on failure, rather than silently dropping the job, reads as correct and even careful error handling to a reader checking "does a failure get lost." The gap is what requeuing does not check: a broker-provided delivery/attempt count. A reader with no broker-specific background has no reason to expect that field to exist, so its absence registers as nothing. |
| 4 | Visibility timeout shorter than processing time | `worker.js:7-8` and `:14`, against `:12` and `:38` | The queue subscription at line 14 grants a worker `VISIBILITY_TIMEOUT_MS` (30000) of exclusive claim on a message before the broker makes it visible to another worker again. The client used to actually send, constructed at line 12, is configured for up to `PROVIDER_TIMEOUT_MS` (60000). A send that legitimately takes between 30 and 60 seconds is still in flight when the lease expires, so a second worker can dequeue and process the same message concurrently. | The two numbers are declared two lines apart but used in two call sites more than twenty lines apart, and nothing at either call site is individually wrong. The defect exists only as a comparison a reader has to actively perform, and only registers as a problem to someone who already knows a queue subscription's visibility timeout and a downstream call's own timeout are independent settings that must be kept in a specific order. |
| 5 | Retry storms with no jitter | `worker.js:9`, realized at `:40` | `sendWithRetry` is capped (`MAX_SEND_ATTEMPTS`) and delayed (`RETRY_DELAY_MS`) before retrying a rate-limited send, both properties a reader checking "is this retry loop safe" looks for and finds present. The delay is a fixed constant, not randomized. Across many concurrent worker processes rate-limited by the same outage or the same recovering provider, all of them wait the identical interval and retry in the same instant, resynchronizing the load spike against the dependency on every cycle. | A capped, delayed retry reads as resilient. The missing property, jitter, only matters in aggregate across many concurrently running copies of this function, a fact about the deployment, not about any single execution a reader traces through by hand. |
| 6 | Unbounded enqueue outrunning consumers | `worker.js:28-34` | `runScheduledCampaigns` finds every due campaign and enqueues all of it, every time it runs, with no check of how much work from previous runs is still unconsumed. A slow stretch for consumers does not reduce how much new work the next run adds. | The function reads as an ordinary scheduled job: find due work, enqueue it. Nothing inside it is incorrect. The missing piece is a check against a fact this function has no visibility into, the queue's current backlog, so there is no local anomaly to notice, only an absent cross-system check. |

`schema.sql` is the negative control: `sends` has no index and no
`REFERENCES` constraint on `campaign_id` or `recipient_id`, which is
`fx-lens-database`'s finding. The pipeline lens should say nothing about
this file beyond, at most, a one-line cession.

## Dropped rather than seeded

**Rate limiting enforced per worker process, with no shared store across
processes**, was on the candidate list the user was shown. It is not seeded.
Round 1's stripped, scoped control caught it unaided, in its own words:
"the counter is per-process module state. Running M worker processes yields
an actual ceiling of `20 x M` per second, which is not what `MAX_PER_SECOND`
claims." That is exactly the "ordinary careful reading already finds this"
bucket the user asked to drop from, alongside a leaked connection, a missing
correlation id, an unbatched loop, and a transaction left open, none of
which are seeded here either.

## Fixed rather than seeded

While drafting `enqueueReceipt` and `handle`'s shared consumption of
`SEND_QUEUE` for defect 1, an unkeyed accident appeared: `enqueueReceipt`'s
payload carries no `campaignId`, and an earlier draft of `handle` wrote to
`sends` keyed by `campaign_id` unconditionally, which would silently match
zero rows for every receipt. `handle` now only writes to `sends` when
`job.type === 'campaign'` (`worker.js:53`), which is the realistic behavior
for a table that exists to track campaign sends specifically. This is not
one of the six hunt groups and would have measured "did you notice an
undefined field," not queue semantics, so it was fixed during authoring
rather than kept as a seventh item.
