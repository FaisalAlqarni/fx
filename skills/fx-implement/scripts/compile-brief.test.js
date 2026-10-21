'use strict';
// Run: node skills/fx-implement/scripts/compile-brief.test.js
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const BIN = path.join(__dirname, 'compile-brief');
const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-brief-')); // artifact-gate: ok (scratch fixture)
const plan = path.join(wt, 'docs', 'plans', 'x');
fs.mkdirSync(path.join(plan, 'tasks'), { recursive: true });
fs.writeFileSync(path.join(wt, '.fx.json'), JSON.stringify({ stacks: ['rails'] }));
fs.writeFileSync(path.join(plan, 'plan.md'), '# P\n\n## Global Constraints\n\n- Locale: ar.\n\n## Tasks\n');
fs.writeFileSync(path.join(plan, 'design.md'),
  '# D\n\n## Implementation Decisions\n\n**1. First.** D1 body.\n\n**2. Second.** D2 body.\n\n## Out of Scope\n\nO1.\n');
fs.writeFileSync(path.join(plan, 'state.md'), '# fx ledger: plan: docs/plans/x/plan.md\n## Log\nRuling: task 01 uses UTC.\nRuling: task 07 uses local time.\n');
const ctx = path.join(wt, 'ctx.md');
fs.writeFileSync(ctx, 'Task 00 produced Store#get(id).\n');
const runRaw = (taskText) => {
  const task = path.join(plan, 'tasks', '01-a.md');
  fs.writeFileSync(task, taskText);
  const out = path.join(wt, 'brief.md');
  return { out, r: spawnSync(process.execPath, [BIN, '--worktree', wt, '--context', ctx, 'x', task, out], { encoding: 'utf8', cwd: os.tmpdir() }) }; // artifact-gate: ok
};
const run = (taskText) => {
  const { out, r } = runRaw(taskText);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stdout.trim(), out);
  return fs.readFileSync(out, 'utf8');
};

const brief = run('# 01: a\n\n**Design:** Implementation Decisions > 2\n**Stack:** rails/The traps\n');
const heads = ['## Task', '## Global constraints', '## Context', '## Rulings', '## Design excerpt', '## Stack'];
const at = heads.map((h) => brief.indexOf(h));
assert.ok(at.every((i, k) => i >= 0 && (k === 0 || i > at[k - 1])), `six sections in order: ${at}`);
assert.ok(brief.includes('- Locale: ar.'), 'global constraints carried');
assert.ok(brief.includes('Task 00 produced Store#get(id).'), 'controller context carried');
assert.ok(brief.includes('Ruling: task 01 uses UTC.'), 'rulings carried');
assert.ok(brief.includes('D2 body.') && !brief.includes('D1 body.') && !brief.includes('O1.'), 'only decision 2');
assert.ok(!brief.includes('task 07 uses local time'), 'a ruling naming only another task is dropped');
for (const [line, name] of [['**Design:** Implementation Decisions > 2; Nope', 'Nope'], ['**Stack:** rails/No such section', 'rails/No such section']]) {
  const bad = runRaw(`# 01: a\n\n${line}\n`).r;
  assert.ok(bad.status !== 0 && bad.stderr.includes(name), `an entry that resolves to nothing fails, naming it: ${name}`);
}
const traps = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'references', 'stacks', 'rails.md'), 'utf8');
assert.ok(brief.includes(traps.slice(traps.indexOf('## The traps'), traps.indexOf('## The traps') + 200)), 'the named stack section, from the plugin');
assert.ok(!brief.includes('## Engines'), 'other stack sections left out');

const whole = run('# 01: a\n');
assert.ok(whole.includes('## Engines'), 'no Stack line: the whole stack file, as today');

console.log('compile-brief: OK');
