# 01: Build-cost report

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** MVP

**What to build:** a script that takes one Claude Code controller transcript and
prints what the build cost: deduplicated API calls and tokens for the
controller, tokens and durations per dispatch type for its subagents, the
controller's context size (median, p90) and its growth per completed task, and
wall-clock. This is the instrument every later measurement reads.

Why deduplication matters: Claude Code writes one JSONL record per content block
(thinking, text, each tool call), and every record from one API call carries
the same `usage`. Summing records counts one call several times. Measured on
transcript `61606dd5`: 1,299 records were 709 API calls, and the record sum
(643M tokens) was nearly double the true figure (347M).

**Files:**
- Create: `scripts/build-cost`
- Create: `scripts/build-cost.test.js`
- Modify: `scripts/check-all` (add one `run` line next to the other `*.test.js` lines)

**Interfaces:**
- Consumes: Claude Code transcript layout. Controller: `<dir>/<session>.jsonl`.
  Subagents: `<dir>/<session>/subagents/*.jsonl`. Each line is JSON. Assistant
  records have `type: "assistant"`, `timestamp` (ISO), `requestId` (may be
  absent on old records; fall back to `message.id`, then `uuid`),
  `message.model`, `message.usage` with `input_tokens`,
  `cache_read_input_tokens`, `cache_creation_input_tokens`, `output_tokens`,
  and `message.content[]` blocks where `type: "tool_use"` has `name` and `input`.
- Produces: CLI `scripts/build-cost <controller.jsonl> [--json]`. Exit 0 with a
  report; exit 2 with a one-line reason on stderr when the file is missing, has
  no assistant records, or no record carries `usage`. `--json` prints one
  object:

```json
{
  "controller": { "calls": 709, "tokens": 347230096, "ctxMedian": 503501, "ctxP90": 871978,
                  "tasksCompleted": 3, "ctxGrowthPerTask": 120000, "fixRounds": 4 },
  "subagents": { "implementer": { "count": 15, "tokens": 0, "medianMs": 0 } },
  "wallClockMs": 0,
  "controllerActiveMs": 0
}
```

  Definitions, exact:
  - A call's tokens = `input + cache_read + cache_creation + output` of its
    first record. A call's context = the same sum without `output`.
  - A **ledger write** is a controller tool_use that writes `state.md`: a
    `Bash` whose `command` contains both `>>` and `state.md`, or an `Edit` or
    `Write` whose `file_path` ends in `state.md`. Reads, greps and dispatch
    prompts that quote the ledger are not ledger writes.
  - `tasksCompleted` = number of distinct `NN` matching
    `Task (\d\d): complete \x28commits` in ledger writes (`\x28` is a literal open parenthesis). The call that first
    writes a given `NN` is that task's completion call.
  - `fixRounds` = for each `NN`, the highest `R` matching
    `Task NN: fix round (\d)/5` in ledger writes, summed over tasks.
  - `ctxGrowthPerTask` = (context of the last task's completion call minus
    context of the first task's completion call) divided by
    (`tasksCompleted` minus 1); `null` when fewer than 2 tasks completed.
  - `wallClockMs` = last timestamp minus first, across controller and subagent
    files. `controllerActiveMs` = sum of gaps under 120,000 ms between
    consecutive controller calls.
  - A subagent file cannot be reliably linked back to the controller's
    `Agent` call that launched it, so classify each subagent file by its
    first user message text, using each dispatch template's opening line (a
    looser match misfiles implementers: `implementer-prompt.md` itself
    mentions "fix round" and "self-review"): `re-review` if it contains
    `You are re-reviewing`, else `reviewer` if `You are reviewing` or
    `You are a senior code reviewer` (the branch reviewer's opening), else
    `implementer` if `You are implementing task`, else `coverage` if
    `/coverage audit/i`, else `lens` if `/security|database|accessibility|a11y|silent.failure|pipeline/i`,
    else `other`. Before coding, confirm the three opening lines against the
    templates in `skills/fx-implement/` and `skills/fx-review/`.
    Per type: count, tokens (deduplicated, same rule), median duration (last
    minus first timestamp in the file).

**Seam:** unit, CLI in and JSON out, over synthetic transcripts written to a temp dir.

**Idempotency:** read-only over its input; running it twice prints the same output.

**Testing:** `node scripts/build-cost.test.js`, and `scripts/check-all`.

## Acceptance criteria
- [ ] Two records sharing a `requestId` count as one call and their usage is counted once.
- [ ] Records without `requestId` fall back to `message.id`, then `uuid`.
- [ ] `tasksCompleted`, `ctxGrowthPerTask` and `fixRounds` follow the definitions above; a `grep` of the ledger that quotes a completion line is not counted.
- [ ] An implementer whose prompt mentions "fix round" is still classified `implementer`.
- [ ] Subagent files are classified and aggregated per type.
- [ ] A missing file, an empty file, and a file with no `usage` each exit 2 with a reason; none prints a report.
- [ ] Run against the real transcript `~/.claude/projects/-development-fx/61606dd5-c47f-4e61-ac00-02cc7f372885.jsonl` (read-only), it reports 709 controller calls. Record the output in the task report.

## Steps

- [ ] **1. Write the failing test**

```js
'use strict';
// Run: node scripts/build-cost.test.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const BIN = path.join(__dirname, 'build-cost');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-build-cost-'));

const usage = (ctx, out) => ({ input_tokens: 0, cache_read_input_tokens: ctx, cache_creation_input_tokens: 0, output_tokens: out });
const asst = (t, req, ctx, content) => ({
  type: 'assistant', timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, t)).toISOString(),
  requestId: req, message: { model: 'claude-sonnet-5', usage: usage(ctx, 10), content },
});
const write = (file, recs) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, recs.map((r) => JSON.stringify(r)).join('\n') + '\n'); };
const bash = (cmd) => ({ type: 'tool_use', name: 'Bash', input: { command: cmd } });

const ctl = path.join(root, 's1.jsonl');
write(ctl, [
  { type: 'user', timestamp: '2026-01-01T00:00:00.000Z', message: { content: 'go' } },
  asst(1, 'r1', 1000, [{ type: 'text', text: 'thinking' }]),
  asst(1, 'r1', 1000, [bash("echo 'Task 01: complete (commits a..b, review clean)' >> state.md")]),
  asst(20, 'q1', 2000, [bash("grep 'Task 03: complete (commits' state.md")]),
  asst(25, 'q2', 2500, [bash("echo 'Task 02: fix round 1/5 (2 addressed)' >> state.md; echo 'Task 02: fix round 2/5 (clean)' >> state.md")]),
  asst(30, 'r2', 3000, [bash("echo 'Task 02: complete (commits b..c, review clean)' >> state.md")]),
  { type: 'assistant', timestamp: '2026-01-01T00:01:00.000Z', message: { id: 'm3', usage: usage(5000, 10), content: [bash("echo 'Task 03: complete (commits c..d, review clean)' >> state.md")] } },
]);
write(path.join(root, 's1', 'subagents', 'a.jsonl'), [
  { type: 'user', timestamp: '2026-01-01T00:00:02.000Z', message: { content: 'You are implementing task 01. If this is a fix round, append to the report.' } },
  asst(2, 'x1', 100, []), asst(12, 'x2', 200, []),
]);
write(path.join(root, 's1', 'subagents', 'b.jsonl'), [
  { type: 'user', timestamp: '2026-01-01T00:00:13.000Z', message: { content: 'You are reviewing one task: 01' } },
  asst(13, 'y1', 50, []),
]);

const r = JSON.parse(execFileSync(BIN, [ctl, '--json'], { encoding: 'utf8' }));
assert.strictEqual(r.controller.calls, 5, 'r1 is one call despite two records');
assert.strictEqual(r.controller.tokens, 1010 + 2010 + 2510 + 3010 + 5010);
assert.strictEqual(r.controller.tasksCompleted, 3, 'the grep that quotes Task 03 is not a ledger write');
assert.strictEqual(r.controller.ctxGrowthPerTask, (5000 - 1000) / 2);
assert.strictEqual(r.controller.fixRounds, 2);
assert.strictEqual(r.subagents.implementer.count, 1);
assert.strictEqual(r.subagents.implementer.tokens, 110 + 210);
assert.strictEqual(r.subagents.implementer.medianMs, 10000);
assert.strictEqual(r.subagents.reviewer.count, 1);
assert.strictEqual(r.wallClockMs, 60000);

for (const [label, file] of [['missing', path.join(root, 'nope.jsonl')], ['empty', path.join(root, 'empty.jsonl')], ['no usage', path.join(root, 'nousage.jsonl')]]) {
  if (label === 'empty') fs.writeFileSync(file, '');
  if (label === 'no usage') write(file, [{ type: 'assistant', timestamp: '2026-01-01T00:00:00.000Z', requestId: 'z', message: { content: [] } }]);
  const p = spawnSync(BIN, [file, '--json'], { encoding: 'utf8' });
  assert.strictEqual(p.status, 2, `${label}: exits 2`);
  assert.strictEqual(p.stdout, '', `${label}: prints no report`);
  assert.ok(p.stderr.trim().length > 0, `${label}: says why`);
}
fs.rmSync(root, { recursive: true, force: true });
console.log('build-cost: ok');
```

- [ ] **2. Run it: verify RED**

Run: `node scripts/build-cost.test.js`
Expected: FAIL, `spawnSync ... ENOENT` or a non-JSON error, because `scripts/build-cost` does not exist.

- [ ] **3. Implement the minimum that passes**

`scripts/build-cost`: a Node script with `#!/usr/bin/env node`, `chmod +x`, no dependencies. `fx-tdd` drives it from the test.

- [ ] **4. Run it: verify GREEN**

Run: `node scripts/build-cost.test.js`. Expected: `build-cost: ok`.

- [ ] **5. Check it against the real transcript**

Run: `scripts/build-cost ~/.claude/projects/-development-fx/61606dd5-c47f-4e61-ac00-02cc7f372885.jsonl`
Expected: 709 controller calls. Paste the output into the task report. If the file is absent on this machine, say so in the report; do not fake the number.

- [ ] **6. Wire it into check-all and run the suite**

Add `run build-cost.test.js   node scripts/build-cost.test.js` beside the other test lines, then run `scripts/check-all`.

- [ ] **7. Commit**

```
git add scripts/build-cost scripts/build-cost.test.js scripts/check-all
git commit -m "feat(scripts): build-cost reports deduplicated build cost from transcripts"
```
