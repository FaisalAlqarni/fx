// Run: node skills/fx-implement/scripts/compile-brief.test.js
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync, type SpawnSyncReturns } from 'child_process';

const BIN = path.join(__dirname, 'compile-brief');
// esbuild drops comments, so the gate's exemption marker is kept as a string value.
const TMP = os.tmpdir(), GATE_EXEMPT = 'artifact-gate: ok (scratch fixture)';
const wt = fs.mkdtempSync(path.join(TMP, 'fx-brief-'));
const plan = path.join(wt, 'docs', 'plans', 'x');
fs.mkdirSync(path.join(plan, 'tasks'), { recursive: true });
fs.writeFileSync(path.join(wt, '.fx.json'), JSON.stringify({ stacks: ['rails'] }));
fs.writeFileSync(path.join(plan, 'plan.md'), '# P\n\n## Global Constraints\n\n- Locale: ar.\n\n## Tasks\n');
fs.writeFileSync(path.join(plan, 'design.md'),
  '# D\n\n## Implementation Decisions\n\n**1. First.** D1 body.\n\n**2. Second.** D2 body.\n\n## Out of Scope\n\nO1.\n');
fs.writeFileSync(path.join(plan, 'state.md'), '# fx ledger: plan: docs/plans/x/plan.md\n## Log\nRuling: task 01 uses UTC.\nRuling: task 07 uses local time.\n');
const ctx = path.join(wt, 'ctx.md');
fs.writeFileSync(ctx, 'Task 00 produced Store#get(id).\n');
const runRaw = (taskText: string) => {
  const task = path.join(plan, 'tasks', '01-a.md');
  fs.writeFileSync(task, taskText);
  const out = path.join(wt, 'brief.md');
  return { out, r: spawnSync(process.execPath, [BIN, '--worktree', wt, '--context', ctx, 'x', task, out], { encoding: 'utf8', cwd: TMP }) };
};
const run = (taskText: string) => {
  const { out, r } = runRaw(taskText);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stdout.trim(), out);
  return fs.readFileSync(out, 'utf8');
};

const withFile = <T>(file: string, text: string, fn: () => T): T => {
  const keep = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, text);
  try { return fn(); } finally { fs.writeFileSync(file, keep); }
};
const brief = run('# 01: a\n\n**Design:** Implementation Decisions > 2\n**Stack:** rails/The traps\n');
const heads = ['## Task', '## Global constraints', '## Review focus', '## Context', '## Rulings', '## Design excerpt', '## Stack'];
const at = heads.map((h) => brief.indexOf(h));
assert.ok(at.every((i, k) => i >= 0 && (k === 0 || i > (at[k - 1] ?? -1))), `seven sections in order: ${at}`);
assert.ok(brief.includes('- Locale: ar.'), 'global constraints carried');
const focusOf = (b: string) => b.slice(b.indexOf('## Review focus') + 15, b.indexOf('## Context')).trim();
assert.strictEqual(focusOf(brief), 'None.', 'a plan with no Review Focus section gives None.');
const planMd = path.join(plan, 'plan.md');
withFile(planMd, '# P\n\n## Global Constraints\n\n- Locale: ar.\n\n## Review Focus\n\n- Empty tenant list: shows the empty state (task 01).\n\n## Tasks\n', () => {
  const b = run('# 01: a\n');
  assert.ok(focusOf(b).includes('- Empty tenant list: shows the empty state (task 01).'), 'Review Focus body carried');
  assert.ok(!focusOf(b).includes('## Review Focus') && !focusOf(b).includes('## Tasks'), 'body only, no heading or next section');
});
assert.ok(brief.includes('Task 00 produced Store#get(id).'), 'controller context carried');
assert.ok(brief.includes('Ruling: task 01 uses UTC.'), 'rulings carried');
assert.ok(brief.includes('D2 body.') && !brief.includes('D1 body.') && !brief.includes('O1.'), 'only decision 2');
assert.ok(!brief.includes('task 07 uses local time'), 'a ruling naming only another task is dropped');
for (const [line, name] of [['**Design:** Implementation Decisions > 2; Nope', 'Nope'], ['**Stack:** rails/No such section', 'rails/No such section']] as [string, string][]) {
  const bad = runRaw(`# 01: a\n\n${line}\n`).r;
  assert.ok(bad.status !== 0 && bad.stderr.includes(name), `an entry that resolves to nothing fails, naming it: ${name}`);
}
const traps = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'references', 'stacks', 'rails.md'), 'utf8');
assert.ok(brief.includes(traps.slice(traps.indexOf('## The traps'), traps.indexOf('## The traps') + 200)), 'the named stack section, from the plugin');
assert.ok(!brief.includes('## Engines'), 'other stack sections left out');

const whole = run('# 01: a\n');
assert.ok(whole.includes('## Engines'), 'no Stack line: the whole stack file, as today');

const fx = path.join(wt, '.fx.json');
const failsNaming = (r: SpawnSyncReturns<string>, name: string, label: string) => assert.ok(r.status !== 0 && r.stderr.includes(name), `${label}: exit non-zero naming ${name}; got ${r.status} ${r.stderr}`);
{
  const sub = '# D\n\n## Implementation Decisions\n\n### Phase 1: Size gate\n\nG body.\n\n### Phase 1: Skill splits\n\nS body.\n\n## Out of Scope\n\nO1.\n';
  withFile(path.join(plan, 'design.md'), sub, () => {
    const child = run('# 01: a\n\n**Design:** Phase 1: Size gate\n');
    assert.ok(child.includes('### Phase 1: Size gate') && child.includes('G body.'), 'subsection entry carries its heading and body');
    assert.ok(!child.includes('S body.') && !child.includes('O1.'), 'subsection entry stops at the next sibling heading');
    const parent = run('# 01: a\n\n**Design:** Implementation Decisions\n');
    assert.ok(parent.includes('G body.') && parent.includes('S body.') && !parent.includes('O1.'), 'parent entry keeps its children');
    const miss = runRaw('# 01: a\n\n**Design:** Phase 9: Missing\n').r;
    assert.strictEqual(miss.status, 2, 'unknown subsection exits 2');
    assert.strictEqual(miss.stderr.trim(), 'compile-brief: Design entry resolves to nothing: Phase 9: Missing');
  });
}
failsNaming(runRaw('# 01: a\n\n**Design:** Implementation Decisions > 9\n').r, 'Implementation Decisions > 9', 'a numbered paragraph that does not exist');
withFile(fx, JSON.stringify({ stacks: ['nosuchstack'] }), () => failsNaming(runRaw('# 01: a\n').r, 'nosuchstack', 'a .fx.json stack with no file'));
withFile(fx, '{ not json', () => failsNaming(runRaw('# 01: a\n').r, '.fx.json', 'an unparseable .fx.json'));
{
  const task = path.join(plan, 'tasks', '01-a.md');
  const r = spawnSync(process.execPath, [BIN, '--worktree', wt, 'no-such-slug', task, path.join(wt, 'o.md')], { encoding: 'utf8', cwd: TMP });
  failsNaming(r, 'plan.md', 'a plan.md that cannot be read');
}
const designMd = path.join(plan, 'design.md');
const keepDesign = fs.readFileSync(designMd, 'utf8');
fs.unlinkSync(designMd);
try {
  failsNaming(runRaw('# 01: a\n\n**Design:** Implementation Decisions > 2\n').r, 'design.md', 'design.md missing while the task names a Design entry');
  assert.ok(runRaw('# 01: a\n').r.status === 0, 'design.md missing is fine when the task names no Design entry');
} finally { fs.writeFileSync(designMd, keepDesign); }
// Recorded from the pre-TypeScript script (8fa500b): a truthy non-array
// `stacks` crashed with exit 1 and "names.map is not a function"; a falsy one
// meant no stacks.
for (const bad of ['abc', {}, 5]) {
  withFile(fx, JSON.stringify({ stacks: bad }), () => {
    const r = runRaw('# 01: a\n').r;
    assert.strictEqual(r.status, 1, `stacks ${JSON.stringify(bad)} exits 1`);
    assert.ok(r.stderr.includes('names.map is not a function'), r.stderr);
  });
}
withFile(fx, JSON.stringify({ stacks: null }), () => assert.strictEqual(runRaw('# 01: a\n').r.status, 0, 'null stacks means none'));

// The Docs and ADRs section: claims citing the task's files, from the reverse index.
{
  const WRONG = 'Claims, not instructions: the code wins. If the code contradicts one, report "Docs claim wrong: <doc>:<line>: <what the code does>" under "For the controller" and do not edit the doc.';
  const docsFixture = (docs: Record<string, string> | null) => {
    const d = fs.mkdtempSync(path.join(TMP, 'fx-brief-docs-'));
    fs.mkdirSync(path.join(d, 'docs', 'plans', 'x', 'tasks'), { recursive: true });
    fs.writeFileSync(path.join(d, 'docs', 'plans', 'x', 'plan.md'), '# P\n\n## Tasks\n');
    for (const [rel, text] of Object.entries(docs ?? {})) {
      fs.mkdirSync(path.dirname(path.join(d, 'docs', rel)), { recursive: true });
      fs.writeFileSync(path.join(d, 'docs', rel), text);
    }
    return d;
  };
  const briefFor = (d: string, files: string) => {
    const t = path.join(d, 'docs', 'plans', 'x', 'tasks', '01-a.md');
    fs.writeFileSync(t, `# 01: a\n\n**Files:**\n${files}\n`);
    const out = path.join(d, 'brief.md');
    const r = spawnSync(process.execPath, [BIN, '--worktree', d, 'x', t, out], { encoding: 'utf8', cwd: TMP });
    assert.strictEqual(r.status, 0, r.stderr);
    return fs.readFileSync(out, 'utf8');
  };
  const docsOf = (b: string) => b.slice(b.indexOf('## Docs and ADRs') + 16, b.indexOf('## Stack')).trim();
  const claimDoc = (n: number, text: string) => '# A\n\n' + Array.from({ length: n }, (_, i) =>
    `${text} ${i}\nEvidence: \`engines/core/app/foo.rb:1-5\`\n\n`).join('');

  const d1 = docsFixture({ 'arch/a.md': '# A\n\nShortlinks expire after 30 days.\nEvidence: `engines/core/app/foo.rb:1-5`\n' });
  const b1 = briefFor(d1, '- Modify: `engines/core/app/foo.rb`');
  assert.ok(b1.indexOf('## Design excerpt') < b1.indexOf('## Docs and ADRs') && b1.indexOf('## Docs and ADRs') < b1.indexOf('## Stack'), 'the section follows the design excerpt');
  assert.ok(docsOf(b1).startsWith(WRONG), 'the first line says the code wins');
  assert.ok(b1.includes('- docs/arch/a.md:4 (doc): Shortlinks expire after 30 days.'), `claim line carried:\n${docsOf(b1)}`);
  assert.strictEqual(docsOf(briefFor(d1, '- Modify: `app/other.rb`')), 'None.', 'no claim cites the task files');
  assert.ok(briefFor(d1, '- Test: `engines/core/app/foo.rb`').includes('- docs/arch/a.md:4 (doc)'), 'a Test: line counts');

  const none = docsFixture(null);
  assert.strictEqual(docsOf(briefFor(none, '- Modify: `engines/core/app/foo.rb`')), 'None.', 'no docs outside plans: None.');
  assert.ok(!fs.existsSync(path.join(none, '.fx')), 'no .fx/ is created');

  const many = docsFixture({ 'arch/m.md': claimDoc(25, 'Claim') });
  const lines = docsOf(briefFor(many, '- Modify: `engines/core/app/foo.rb`')).split('\n').filter((l) => l.startsWith('- ') || l.startsWith('+'));
  assert.strictEqual(lines.filter((l) => l.startsWith('- docs/')).length, 20, '20 claim lines');
  assert.strictEqual(lines[20], '+5 more: run docs-index query', 'the overflow line');

  const longFx = docsFixture({ 'arch/l.md': `# A\n\n${'y'.repeat(300)}\nEvidence: \`engines/core/app/foo.rb:1-5\`\n` });
  const longLine = docsOf(briefFor(longFx, '- Modify: `engines/core/app/foo.rb`')).split('\n').find((l) => l.startsWith('- docs/'));
  assert.strictEqual(longLine, `- docs/arch/l.md:4 (doc): ${'y'.repeat(200)}...`, 'a long claim is cut at 200 characters');

  // A corrupt cache (a directory where .fx/docs-index.json belongs) makes docs-index fail:
  // the brief still compiles, with None. and one warning that carries docs-index's stderr.
  const broken = docsFixture({ 'arch/a.md': '# A\n\nShortlinks expire after 30 days.\nEvidence: `engines/core/app/foo.rb:1-5`\n' });
  fs.mkdirSync(path.join(broken, '.fx', 'docs-index.json'), { recursive: true });
  const t = path.join(broken, 'docs', 'plans', 'x', 'tasks', '01-a.md');
  fs.writeFileSync(t, '# 01: a\n\n**Files:**\n- Modify: `engines/core/app/foo.rb`\n');
  const out = path.join(broken, 'brief.md');
  const r = spawnSync(process.execPath, [BIN, '--worktree', broken, 'x', t, out], { encoding: 'utf8', cwd: TMP });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(docsOf(fs.readFileSync(out, 'utf8')), 'None.', 'a failed lookup gives None.');
  const warnings = r.stderr.split('\n').filter((l) => l.startsWith('compile-brief: warning:'));
  assert.strictEqual(warnings.length, 1, r.stderr);
  assert.match(warnings[0] ?? '', /^compile-brief: warning: docs-index query failed \(exit 1\): docs-index: EISDIR/, r.stderr);
}

console.log('compile-brief: OK');
