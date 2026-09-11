// A campaign sender. Every numbered comment marks one seeded defect.
const queue = require('./queue');
const db = require('./db');

// 1. FAIRNESS: every campaign shares one queue, so a large campaign
//    starves every small one behind it.
const QUEUE = 'sends';

// 2. BACKPRESSURE: the limiter counts in this process only, so N processes
//    send N times the intended rate to the same provider.
let sentThisSecond = 0;

async function enqueueCampaign(campaignId) {
  const recipients = await db.query('SELECT * FROM recipients WHERE campaign_id = $1', [campaignId]);
  await db.begin();
  for (const r of recipients) {
    // 3. GRANULARITY: one job per recipient, where one job per batch would do.
    // 4. TRANSACTIONAL SAFETY: enqueued inside a transaction that can roll
    //    back, so a consumer can pick the job up before the row lands.
    await queue.push(QUEUE, { recipientId: r.id, campaignId });
  }
  await db.commit();
}

async function handle(job) {
  // 5. RESOURCE PRESSURE: a connection acquired per job, never released on
  //    the throw path.
  const conn = await db.connect();

  // 6. IDEMPOTENCY: acknowledged before the send is recorded, so a crash
  //    between the two lines re-delivers and double-sends.
  await queue.ack(job);
  const res = await provider.send(job.recipientId);
  await conn.query('UPDATE sends SET state = $1 WHERE id = $2', ['sent', job.recipientId]);

  // 7. RETRIES: retried forever, with no cap, no backoff, no jitter, and no
  //    dead-letter path, so an exhausted job simply disappears.
  if (!res.ok) return handle(job);

  // 8. TRACEABILITY: nothing carries an identifier from intake to callback,
  //    so "where is this one message" has no answer.
  console.log('sent');
}

module.exports = { enqueueCampaign, handle };
