# 05: `fx-lens-pipeline`, with its fixture and control run

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** Core

**What to build:** a fifth read-only review lens that reads queue and worker
code and reports what a control reviewer misses: starvation, unbounded retries,
double sends, work that cannot resume, and a message nobody can locate. It
fires on whole-branch reviews and inside the audit, never on a per-task review.

**Files:**
- Create: `agents/fx-lens-pipeline.md`
- Create: `tests/lens-pipeline/fixture/worker.js`
- Create: `tests/lens-pipeline/fixture/schema.sql`
- Create: `tests/lens-pipeline/README.md`
- Modify: `skills/fx-review/SKILL.md`

**Interfaces:**
- Produces: an agent named `fx-lens-pipeline`, frontmatter carrying `name`,
  `description`, `tools: Read, Grep, Glob, Bash`, `model: opus`.
- Produces: the announcement string `Lens: pipeline.`
- Produces: the finding format
  `N. [Critical|Important|Minor] <file>:<line>: <what is wrong> -> <what it
  causes in production>.`
- Produces: a **Mode** column in `fx-review` §2's lens trigger table, with the
  four existing lenses marked `task, branch` and this one marked `branch`.
- Consumes: nothing. The agent is dispatched with either a diff or a file set.

**Seam:** a subagent run against `tests/lens-pipeline/fixture/`, once without
the lens as a control and once with it. The lens ships only if it finds what
the control misses.

**Risks:** a lens whose triggers overlap an existing one buys two reports of
one finding. The ceding rules go in the body, and the fixture's `schema.sql`
exists to prove the lens stays silent on a schema-only change.

Naming a framework anywhere in the description or the body makes the lens read
as belonging to someone else's stack, which is the failure ADR 0011 records.
The hunt groups are written as categories.

**Idempotency:** creates four files and edits one table. Re-running rewrites
the same bytes. Nothing is mutated outside the repository.

**Testing:** the control-versus-lens run described in the steps, plus the prose,
citation and manifest gates.

## Acceptance criteria

- [ ] The agent file carries read-only tools and no write tool of any kind.
- [ ] The agent pins `model: opus` explicitly.
- [ ] The description is a trigger list naming queues, workers, retry and
      backoff policy, dead letters, schedulers, batch dispatch, rate limiters,
      connection pools and outbox tables, and **names no framework, language or
      file extension**.
- [ ] The description carries a stakes clause naming machinery, not quality.
- [ ] The body carries all eight hunt groups: fairness and head-of-line
      blocking; backpressure and rate limits; job granularity and batching;
      retries, backoff and dead letters; idempotency and delivery guarantees;
      transactional safety and crash recovery; resource pressure; lifecycle
      traceability.
- [ ] The body states the three ceding rules: a query issued per record belongs
      to the database lens, a swallowed error belongs to the silent-failure
      lens, and work enqueued inside a transaction is reported here while
      saying the database lens sees it too.
- [ ] The body says the lens accepts **either a diff or a file set**, and that
      a file set is treated as the change under review.
- [ ] The body carries a red-flags section about the lens's own output.
- [ ] `fx-review` §2's table gains a Mode column, and this lens is the only row
      marked `branch`.
- [ ] `fx-review` §2's "no performance lens" paragraph is amended to say query
      shape belongs to the database lens, app-layer throughput belongs to this
      one, and bundle and rendering performance remain deliberately uncovered.
- [ ] `scripts/check-manifest` still reports agents as correctly undeclared.
      **The agent must not be added to `plugin.json`.**
- [ ] The control run finds at most 2 of the 8 seeded defects.
- [ ] The lens run finds at least 6 of the 8, naming each by file and line.
- [ ] The lens run reports **nothing** about `schema.sql`, proving it cedes.
- [ ] `scripts/check-all` exits 0.

## Steps

- [ ] **1. Write the failing test**

The fixture is the test. Create `tests/lens-pipeline/fixture/worker.js` with
eight seeded defects, one per hunt group, each on its own line so a finding can
cite it:

```javascript
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
```

Create `tests/lens-pipeline/fixture/schema.sql` as the negative control. It
holds a real data-layer defect that belongs to a different lens:

```sql
-- A missing index on a foreign key. This is the database lens's finding.
-- The pipeline lens must say nothing about this file.
CREATE TABLE sends (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL,
  state VARCHAR(20),
  amount FLOAT
);
```

- [ ] **2. Run it: verify RED, with the control**

Dispatch a general-purpose read-only subagent at
`tests/lens-pipeline/fixture/` with the brief "review this for problems" and
**no lens and no checklist**. Record every defect it names.
Expected: it finds at most 2 of the 8. Paste its findings into the report. If
the control finds 6 or more, **stop and say so**: there is nothing for the lens
to add, and `skill-testing.md` says do not author the guidance.

- [ ] **3. Implement the minimum that passes**

Write `agents/fx-lens-pipeline.md`. No body text here: `fx-tdd` drives it from
the control's misses.

- [ ] **4. Run it: verify GREEN**

Dispatch `fx-lens-pipeline` at the same fixture.
Expected: at least 6 of the 8 seeded defects named with file and line, and
**nothing reported about `schema.sql`**. Paste the findings into the report.

- [ ] **5. Register it in the trigger table**

Edit `skills/fx-review/SKILL.md` §2: add the Mode column, the new row, and the
amended performance paragraph.

- [ ] **6. Verify the agent stays undeclared**

Run: `python3 scripts/check-manifest`
Expected: PASS, and it reports `./agents/` holding 6 files, correctly
undeclared.

- [ ] **7. Write the fixture README**

One paragraph naming what each seeded defect is and which hunt group it
belongs to, so the next person can tell a lens regression from a fixture edit.

- [ ] **8. Run the combined gate**

Run: `scripts/check-all`
Expected: PASS, exit 0.

- [ ] **9. Commit**

```
git add agents/fx-lens-pipeline.md tests/lens-pipeline skills/fx-review/SKILL.md
git commit -m "feat(review): add the pipeline lens for queue and delivery defects"
```

No attribution trailers. Then continue to the next task: never stop and wait.
