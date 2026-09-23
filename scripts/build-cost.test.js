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

// G2, post-task-08 shape 1: the fix loop now copies ledger lines with
// `sed ... | grep '^Task ' | tee -a state.md`, which has no literal '>>' and
// no ledger text at all in the command string; the real appended text only
// exists in the command's effect, which the harness records as
// toolUseResult.bashEditDiff on the sibling tool_result record. build-cost
// must read that diff to see the completion and fix-round lines it produced.
{
  const ctl7 = path.join(root, 's7.jsonl');
  const teeCmd = "sed -n '/^## Ledger lines/,/^## /p' findings/07-rereview-1.md | grep '^Task ' | tee -a state.md";
  const toolUseId = 'toolu_tee7';
  const bashBlock = { type: 'tool_use', id: toolUseId, name: 'Bash', input: { command: teeCmd } };
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(ctl7, [
    JSON.stringify({ type: 'user', timestamp: '2026-01-01T00:00:00.000Z', message: { content: 'go' } }),
    JSON.stringify(asst(1, 'r1', 1000, [bashBlock])),
    JSON.stringify({
      type: 'user',
      timestamp: '2026-01-01T00:00:02.000Z',
      message: { content: [{ type: 'tool_result', tool_use_id: toolUseId, content: "Task 07: fix round 1/5 (1 addressed, 0 open: none; commits a..b)\nTask 07: complete (commits a..b, review clean)" }] },
      toolUseResult: {
        stdout: "Task 07: fix round 1/5 (1 addressed, 0 open: none; commits a..b)\nTask 07: complete (commits a..b, review clean)",
        bashEditDiff: {
          files: [{
            filePath: '/work/docs/plans/x/state.md',
            hunks: [{ oldStart: 10, oldLines: 1, newStart: 10, newLines: 3, lines: [
              ' Task 07: file check clean',
              '+Task 07: fix round 1/5 (1 addressed, 0 open: none; commits a..b)',
              '+Task 07: complete (commits a..b, review clean)',
            ] }],
          }],
        },
      },
    }) + '\n',
  ].join('\n') + '\n');
  const r7 = JSON.parse(execFileSync(BIN, [ctl7, '--json'], { encoding: 'utf8' }));
  assert.strictEqual(r7.controller.tasksCompleted, 1, 'tee -a copy form: completion line read from the bash edit diff');
  assert.strictEqual(r7.controller.fixRounds, 1, 'tee -a copy form: fix round line read from the bash edit diff');
}

// G2, post-task-08 shape 2: the controller now wraps reviewer, re-review and
// fix-round implementer dispatches in prose that never says the old opening
// lines classify() looked for, so every one of them fell into 'other'.
{
  const ctl8 = path.join(root, 's8.jsonl');
  write(ctl8, [asst(1, 'r1', 100, [{ type: 'text', text: 'hi' }])]);
  const subDir8 = path.join(root, 's8', 'subagents');
  const cases = [
    ['reviewer-a.jsonl', 'reviewer', 'Your operating rules are the task reviewer template at /x/reviewer-rules.md. Read it in full.'],
    ['reviewer-b.jsonl', 'reviewer', 'Your operating rules are the branch reviewer template at /x/reviewer-rules.md. Read it in full.'],
    ['reviewer-c.jsonl', 'reviewer', 'You are the broad whole-branch reviewer. Your standing instructions are in /x.'],
    ['rereview-a.jsonl', 're-review', 'Your operating rules are the re-review template at /x/rereview-rules.md. Read it in full.'],
    ['rereview-b.jsonl', 're-review', 'You are the scoped re-reviewer for task 07, fix round 1. Your standing instructions are the prompt block.'],
    ['implementer-fixround.jsonl', 'implementer', 'You are the implementer for task 07 (Note store), fix round 1 of 5. A previous implementer built it.'],
  ];
  for (const [file, , text] of cases) {
    write(path.join(subDir8, file), [
      { type: 'user', timestamp: '2026-01-01T00:00:00.000Z', message: { content: text } },
      asst(1, `x-${file}`, 10, []),
    ]);
  }
  const r8 = JSON.parse(execFileSync(BIN, [ctl8, '--json'], { encoding: 'utf8' }));
  assert.strictEqual(r8.subagents.reviewer.count, 3, 'reviewer wrapper phrasings all classify as reviewer');
  assert.strictEqual(r8.subagents['re-review'].count, 2, 're-review wrapper phrasings all classify as re-review');
  assert.strictEqual(r8.subagents.implementer.count, 1, 'fix-round implementer phrasing classifies as implementer');
  assert.ok(!r8.subagents.other, 'none of the six wrapper phrasings falls into other');
}

// Final review, silent-failure 4: a Bash ledger write is recognised by its
// command shape too, not only through bashEditDiff (a harness may omit it).
{
  const ctl9 = path.join(root, 's9.jsonl');
  write(ctl9, [
    asst(1, 'r1', 1000, [bash("printf 'Task 01: complete (commits a..b, review clean)\\n' | tee -a docs/plans/x/state.md")]),
    asst(2, 'r2', 2000, [bash("cat >> docs/plans/x/state.md <<'EOF'\nTask 02: fix round 1/5 (1 addressed)\nTask 02: complete (commits b..c, review clean)\nEOF")]),
    asst(3, 'r3', 3000, [bash("printf '%s\\n' 'Task 03: complete (commits c..d, review clean)' >> state.md")]),
    asst(4, 'r4', 4000, [bash("echo 'Task 04: complete (commits d..e, review clean)' | tee --append state.md >/dev/null")]),
    asst(5, 'r5', 5000, [bash("echo 'Task 05: complete (commits e..f, review clean)' | tee state.md.bak")]),
  ]);
  const r9 = JSON.parse(execFileSync(BIN, [ctl9, '--json'], { encoding: 'utf8' }));
  assert.strictEqual(r9.controller.tasksCompleted, 4, 'tee -a, tee --append, cat >> and printf >> are ledger writes; tee to another file is not');
  assert.strictEqual(r9.controller.fixRounds, 1);
}

// Final review, broad 2: a subagent with an agent-<id>.meta.json is
// classified from its agentType first. The final-review fixer names the
// silent-failure lens in its prose but is not a lens; a lens dispatched with
// "Review the diff at" prose is one.
{
  const ctl10 = path.join(root, 's10.jsonl');
  write(ctl10, [asst(1, 'r1', 100, [{ type: 'text', text: 'hi' }])]);
  const subDir10 = path.join(root, 's10', 'subagents');
  const agents = [
    ['agent-a1', { agentType: 'general-purpose', description: 'Final-review fix wave' },
      'You are the implementer for the final-review fix wave. Findings: silent-failure lens, security lens.'],
    ['agent-a2', { agentType: 'fx:fx-lens-security', description: 'Security lens on task 01' },
      'Review the diff at /x/review/a..b.md and report what you find.'],
    ['agent-a3', { agentType: 'fx:fx-lens-silent-failure', description: 'Silent-failure lens on branch' },
      'Review the branch diff at /x/review/a..b.md.'],
    ['agent-a4', { agentType: 'general-purpose', description: 'Spec pass on branch' },
      'Spec review, read-only. Check the security section too.'],
  ];
  for (const [id, meta, text] of agents) {
    write(path.join(subDir10, `${id}.jsonl`), [
      { type: 'user', timestamp: '2026-01-01T00:00:00.000Z', message: { content: text } },
      asst(1, `x-${id}`, 10, []),
    ]);
    fs.writeFileSync(path.join(subDir10, `${id}.meta.json`), JSON.stringify(meta));
  }
  // No meta file: the text rules still apply, lens regex included.
  write(path.join(subDir10, 'agent-a5.jsonl'), [
    { type: 'user', timestamp: '2026-01-01T00:00:00.000Z', message: { content: 'Database lens: review the migration.' } },
    asst(1, 'x-a5', 10, []),
  ]);
  const r10 = JSON.parse(execFileSync(BIN, [ctl10, '--json'], { encoding: 'utf8' }));
  assert.strictEqual(r10.subagents.implementer.count, 1, 'the fix-wave implementer is an implementer, not a lens');
  assert.strictEqual(r10.subagents.lens.count, 3, 'two lenses by agentType, one by text with no meta file');
  assert.strictEqual(r10.subagents.other.count, 1, 'a non-lens agentType never falls into lens on prose alone');
}

fs.rmSync(root, { recursive: true, force: true });
console.log('build-cost: ok');
