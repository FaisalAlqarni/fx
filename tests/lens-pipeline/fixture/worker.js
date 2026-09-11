// A campaign sender.
const queue = require('./queue');
const db = require('./db');
const provider = require('./provider');

const QUEUE = 'sends';

const MAX_PER_SECOND = 20;
let sentThisSecond = 0;
setInterval(() => { sentThisSecond = 0; }, 1000);

async function waitForSlot() {
  while (sentThisSecond >= MAX_PER_SECOND) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  sentThisSecond++;
}

async function enqueueCampaign(campaignId) {
  const recipients = await db.query('SELECT * FROM recipients WHERE campaign_id = $1', [campaignId]);
  await db.begin();
  for (const r of recipients) {
    await queue.push(QUEUE, { recipientId: r.id, campaignId });
  }
  await db.commit();
}

async function handle(job) {
  const conn = await db.connect();

  await queue.ack(job);
  await waitForSlot();
  const res = await provider.send(job.recipientId);
  await conn.query('UPDATE sends SET state = $1 WHERE id = $2', ['sent', job.recipientId]);

  if (!res.ok) return handle(job);

  console.log('sent');
  conn.release();
}

module.exports = { enqueueCampaign, handle };
