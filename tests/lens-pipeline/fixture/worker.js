// Sends campaign and transactional messages through a managed queue.
const queue = require('./queue');
const db = require('./db');
const provider = require('./provider');

const SEND_QUEUE = 'sends';
const VISIBILITY_TIMEOUT_MS = 30000;
const PROVIDER_TIMEOUT_MS = 60000;
const RETRY_DELAY_MS = 2000;
const MAX_SEND_ATTEMPTS = 5;

const client = provider.client({ timeoutMs: PROVIDER_TIMEOUT_MS });

queue.subscribe(SEND_QUEUE, { visibilityTimeout: VISIBILITY_TIMEOUT_MS }, handle);

async function enqueueCampaign(campaignId, recipientIds) {
  for (const recipientId of recipientIds) {
    await queue.push(SEND_QUEUE, { type: 'campaign', campaignId, recipientId });
  }
}

// A single transactional email, sent right after checkout.
async function enqueueReceipt(orderId, recipientId) {
  await queue.push(SEND_QUEUE, { type: 'receipt', orderId, recipientId });
}

// Invoked by the cron trigger.
async function runScheduledCampaigns() {
  const dueCampaigns = await db.query('SELECT id FROM campaigns WHERE status = $1', ['scheduled']);
  for (const campaign of dueCampaigns) {
    const recipients = await db.query('SELECT id FROM recipients WHERE campaign_id = $1', [campaign.id]);
    await enqueueCampaign(campaign.id, recipients.map((r) => r.id));
  }
}

// Retries once if the provider tells us it is rate limiting the account.
async function sendWithRetry(recipientId, attempt = 1) {
  const res = await client.send(recipientId);
  if (res.status === 429 && attempt < MAX_SEND_ATTEMPTS) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return sendWithRetry(recipientId, attempt + 1);
  }
  return res;
}

async function handle(job) {
  try {
    const res = await sendWithRetry(job.recipientId);
    if (!res.ok) {
      await queue.nack(job, { requeue: true });
      return;
    }
    if (job.type === 'campaign') {
      await db.query(
        'UPDATE sends SET state = $1, provider_message_id = $2 WHERE campaign_id = $3 AND recipient_id = $4',
        ['sent', res.id, job.campaignId, job.recipientId]
      );
    }
    await queue.ack(job);
  } catch {
    await queue.nack(job, { requeue: true });
  }
}

module.exports = { enqueueCampaign, enqueueReceipt, runScheduledCampaigns, handle };
