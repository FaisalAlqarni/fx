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
// Fix round 1, finding 1: an assistant record with no requestId, message.id
// or uuid must exit 2 naming the file and line number, not drop silently.
{
  const badKeyFile = path.join(root, 'badkey.jsonl');
  write(badKeyFile, [
    { type: 'user', timestamp: '2026-01-01T00:00:00.000Z', message: { content: 'go' } },
    { type: 'assistant', timestamp: '2026-01-01T00:00:01.000Z', message: { usage: usage(10, 10), content: [] } },
  ]);
  const p = spawnSync(BIN, [badKeyFile, '--json'], { encoding: 'utf8' });
  assert.strictEqual(p.status, 2, 'no call key: exits 2');
  assert.strictEqual(p.stdout, '', 'no call key: prints no report');
  assert.ok(p.stderr.includes(`${badKeyFile}:2`), 'no call key: names the file and line number');
}

// Fix round 1, finding 2: readdirSync failing on the subagents directory for
// any reason other than "it doesn't exist" must exit 2 naming the directory,
// not read the same as legitimately having no subagents.
{
  const ctl2 = path.join(root, 's2.jsonl');
  write(ctl2, [asst(1, 'r1', 100, [{ type: 'text', text: 'hi' }])]);
  const subDir2 = path.join(root, 's2', 'subagents');
  fs.mkdirSync(subDir2, { recursive: true });
  fs.chmodSync(subDir2, 0o000);
  const p = spawnSync(BIN, [ctl2, '--json'], { encoding: 'utf8' });
  fs.chmodSync(subDir2, 0o755);
  assert.strictEqual(p.status, 2, 'unreadable subagents dir: exits 2');
  assert.strictEqual(p.stdout, '', 'unreadable subagents dir: prints no report');
  assert.ok(p.stderr.includes(subDir2), 'unreadable subagents dir: names the directory');
}

// Fix round 1, finding 3: a call's usage must come from the first record of
// that call that actually carries usage, not always its literal first
// record (a leading content-only record with no usage must not zero it).
{
  const ctl3 = path.join(root, 's3.jsonl');
  write(ctl3, [
    { type: 'assistant', timestamp: '2026-01-01T00:00:01.000Z', requestId: 'r9', message: { content: [{ type: 'text', text: 'thinking' }] } },
    { type: 'assistant', timestamp: '2026-01-01T00:00:01.000Z', requestId: 'r9', message: { usage: usage(500, 10), content: [] } },
  ]);
  const r3 = JSON.parse(execFileSync(BIN, [ctl3, '--json'], { encoding: 'utf8' }));
  assert.strictEqual(r3.controller.calls, 1, 'usage backfill: still one call');
  assert.strictEqual(r3.controller.tokens, 510, 'usage backfill: takes usage from the record that carries it');
}

// Fix round 1, finding 4: a truncated or malformed JSONL line must exit 2
// naming the file and line number, not crash with a raw parse stack trace.
{
  const ctl4 = path.join(root, 's4.jsonl');
  fs.writeFileSync(ctl4, [
    JSON.stringify({ type: 'user', timestamp: '2026-01-01T00:00:00.000Z', message: { content: 'go' } }),
    'not valid json',
  ].join('\n') + '\n');
  const p = spawnSync(BIN, [ctl4, '--json'], { encoding: 'utf8' });
  assert.strictEqual(p.status, 2, 'malformed line: exits 2');
  assert.strictEqual(p.stdout, '', 'malformed line: prints no report');
  assert.ok(p.stderr.includes(`${ctl4}:2`), 'malformed line: names the file and line number');
}

// Fix round 1, finding 5: a subagent file that cannot be read exits 2 naming
// it; a subagent file that is merely empty stays a legitimate skip.
{
  const ctl5 = path.join(root, 's5.jsonl');
  write(ctl5, [asst(1, 'r1', 100, [{ type: 'text', text: 'hi' }])]);
  const subDir5 = path.join(root, 's5', 'subagents');
  fs.mkdirSync(subDir5, { recursive: true });
  fs.writeFileSync(path.join(subDir5, 'empty.jsonl'), '');
  const badFile = path.join(subDir5, 'noperm.jsonl');
  fs.writeFileSync(badFile, JSON.stringify({ type: 'user', timestamp: '2026-01-01T00:00:00.000Z', message: { content: 'x' } }) + '\n');
  fs.chmodSync(badFile, 0o000);
  const p = spawnSync(BIN, [ctl5, '--json'], { encoding: 'utf8' });
  fs.chmodSync(badFile, 0o644);
  assert.strictEqual(p.status, 2, 'unreadable subagent file: exits 2');
  assert.strictEqual(p.stdout, '', 'unreadable subagent file: prints no report');
  assert.ok(p.stderr.includes(badFile), 'unreadable subagent file: names it');
}

// An empty subagent file alone (no unreadable sibling) is a legitimate skip:
// the run still succeeds and reports no subagent type for it.
{
  const ctl6 = path.join(root, 's6.jsonl');
  write(ctl6, [asst(1, 'r1', 100, [{ type: 'text', text: 'hi' }])]);
  const subDir6 = path.join(root, 's6', 'subagents');
  fs.mkdirSync(subDir6, { recursive: true });
  fs.writeFileSync(path.join(subDir6, 'empty.jsonl'), '');
  const r6 = JSON.parse(execFileSync(BIN, [ctl6, '--json'], { encoding: 'utf8' }));
  assert.deepStrictEqual(r6.subagents, {}, 'empty subagent file: legitimate skip, no error');
}

fs.rmSync(root, { recursive: true, force: true });
console.log('build-cost: ok');
