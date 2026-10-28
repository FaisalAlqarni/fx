// Run: node scripts/system-flow-coverage.test.js
// system-flow coverage report and Rules in force, run as a process.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from '../lib/json.js';
import { renderRules } from '../lib/sf-markdown.js';
import type { Model } from '../lib/sf-model.js';
import { sfFixture } from '../tests/helpers/sf-fixture.js';

type Fx = ReturnType<typeof sfFixture>;
type Entry = { id: string; kind: string; name: string; chapter: string | null };
type Ev = { root?: string; path: string; lines?: string; symbol: string };
const ev = (p: string, lines: string, symbol: string, root?: string): Ev[] => [{ ...(root === undefined ? {} : { root }), path: p, lines, symbol }];
const lines30 = Array.from({ length: 30 }, (_, i) => (i === 0 ? 'class Sweep' : `  # line ${i + 1}`)).join('\n') + '\n';

type Opts = { bullet?: Ev[]; covers?: string[]; second?: boolean; adrStatus?: string; ruleAdr?: string; ruleAdrRoot?: string; bare?: boolean };
// Inventory: one entry of each kind. Section s1 holds a bullet; s2 lists the system diagram.
function setup(o: Opts = {}): Fx {
  const f = sfFixture();
  f.put('host', 'app/jobs/sweep.rb', lines30);
  f.put('guide', 'app/jobs/sweep.rb', lines30);
  f.put('host', 'engines/a/app/x.rb', 'class Ax\nend\n');
  f.put('host', 'app/sms.rb', 'class Sms\nend\n');
  f.put('host', 'app/flow.rb', 'class Flow\nend\n');
  f.put('host', 'app/store.rb', 'class Store\nend\n');
  f.put('host', 'docs/adr/0001-x.md', `# 1. X\n\nStatus: ${o.adrStatus ?? 'accepted, 2026-01-01'}\n\n1. Use X.\n`);
  f.commit('host', 'files');
  f.commit('guide', 'files');
  f.fxJson({ system_flow: { roots: { guide: '../guide' } } });
  f.fragment('meta', { schemaVersion: 2, meta: { roots: [{ id: 'backend' }, { id: 'guide' }] } });
  f.fragment('level0', {
    levels: { root: 'system', diagrams: [{
      id: 'system', level: 0, title: 'System', summary: 'The whole system.', groups: [],
      nodes: [{ id: 'ea', label: 'Ax', kind: 'backend', look: 'service', role: 'Engine A', evidence: ev('engines/a/app/x.rb', '1', 'Ax') }, { id: 'eb', label: 'Y', kind: 'backend', look: 'service', role: 'Y', evidence: ev('app/y.rb', '1', 'Y') }],
      edges: [{ from: 'ea', to: 'eb', label: 'calls', evidence: ev('app/y.rb', '1', 'Y') }, ...(o.bare ? [{ from: 'eb', to: 'ea', label: 'replies', unconfirmed: true }] : [])],
    }] },
  });
  f.fragment('inventory', {
    inventory: [
      { id: 'job-sweep', kind: 'job', name: 'Sweep job', evidence: ev('app/jobs/sweep.rb', '1-20', 'Sweep') },
      { id: 'eng-a', kind: 'engine', name: 'Engine A', evidence: [{ path: 'engines/a/' }] },
      { id: 'int-sms', kind: 'integration', name: 'SMS', evidence: ev('app/sms.rb', '1', 'Sms') },
      { id: 'flow-x', kind: 'flow', name: 'Flow X', evidence: ev('app/flow.rb', '1', 'Flow') },
      { id: 'store-y', kind: 'store', name: 'Store Y', evidence: ev('app/store.rb', '1', 'Store') },
    ],
  });
  const bullet = (id: string, e: Ev[]) => ({ id, text: 'A fact.', evidence: e });
  f.fragment('chapters', {
    sections: [
      { id: 's1', title: 'Jobs', question: 'What sweeps?', bullets: [bullet('b1', o.bullet ?? ev('app/x.rb', '4', 'expired?'))], ...(o.covers ? { covers: o.covers } : {}) },
      { id: 's2', title: 'Engines', question: 'What is in A?', diagrams: ['system'], ...(o.second ? { covers: ['job-sweep'], bullets: [bullet('b2', ev('app/jobs/sweep.rb', '1', 'Sweep'))] } : {}) },
    ],
  });
  f.fragment('rules', { rules: [{ id: 'r1', text: 'Use X.', adr: { path: o.ruleAdr ?? 'docs/adr/0001-x.md', ...(o.ruleAdrRoot === undefined ? {} : { root: o.ruleAdrRoot }) }, decision: 'Decision 1: use X', evidence: ev('app/x.rb', '4', 'expired?') }] });
  return f;
}
const buildOk = (f: Fx) => { const r = f.run(['build']); assert.strictEqual(r.status, 0, `build exits 0\n${r.stdout}${r.stderr}`); return parseJson(r.stdout) as { coverage: Record<string, { covered: number; total: number }> }; };
const entries = (f: Fx): Entry[] => (parseJson(fs.readFileSync(path.join(f.host, 'docs/system-flow/model/coverage.json'), 'utf8')) as { entries: Entry[] }).entries;
const chapterOf = (f: Fx, id: string): string | null | undefined => entries(f).find((e) => e.id === id)?.chapter;
const read = (f: Fx, rel: string): string => fs.readFileSync(path.join(f.host, rel), 'utf8');

// Range overlap: the bullet's 10-12 sits inside 1-20.
{
  const f = setup({ bullet: ev('app/jobs/sweep.rb', '10-12', 'line 10') });
  const out = buildOk(f);
  assert.deepStrictEqual(entries(f).find((e) => e.id === 'job-sweep'), { id: 'job-sweep', kind: 'job', name: 'Sweep job', chapter: 's1' });
  assert.deepStrictEqual(out.coverage.job, { covered: 1, total: 1 });
  assert.deepStrictEqual(Object.keys(out.coverage).sort(), ['engine', 'flow', 'integration', 'job', 'store']);
  assert.deepStrictEqual(out.coverage.flow, { covered: 0, total: 1 });
}
// An unconfirmed item may have its evidence removed entirely (design: an evidence check that keeps failing).
{ const f = setup({ bare: true, bullet: ev('app/jobs/sweep.rb', '10-12', 'line 10') }); buildOk(f); assert.strictEqual(chapterOf(f, 'job-sweep'), 's1'); }
// No overlap, and the same path in another root.
assert.strictEqual(chapterOf((() => { const f = setup({ bullet: ev('app/jobs/sweep.rb', '21-30', 'line 21') }); buildOk(f); return f; })(), 'job-sweep'), null);
assert.strictEqual(chapterOf((() => { const f = setup({ bullet: ev('app/jobs/sweep.rb', '10-12', 'line 10', 'guide') }); buildOk(f); return f; })(), 'job-sweep'), null);
// Folder entry covered by a diagram node under it, found through the section's diagram list.
{ const f = setup(); buildOk(f); assert.strictEqual(chapterOf(f, 'eng-a'), 's2'); }
// covers needs no overlapping evidence.
{ const f = setup({ covers: ['int-sms'] }); buildOk(f); assert.strictEqual(chapterOf(f, 'int-sms'), 's1'); }
// First chapter in section order wins.
{ const f = setup({ covers: ['job-sweep'], second: true }); buildOk(f); assert.strictEqual(chapterOf(f, 'job-sweep'), 's1'); }
// coverage.md table.
{
  const f = setup({ bullet: ev('app/jobs/sweep.rb', '10-12', 'line 10') });
  buildOk(f);
  const md = read(f, 'docs/system/coverage.md');
  assert.ok(md.includes('| Kind | Name | Chapter |'), md);
  assert.ok(/^\| flow \| Flow X \| not covered \|$/m.test(md), md);
  assert.ok(/^\| job \| Sweep job \| .*s1.* \|$/m.test(md), md);
}
// Rules in force.
{
  const f = setup();
  const c = f.run(['check']);
  assert.strictEqual(c.status, 0, c.stderr);
  buildOk(f);
  const md = read(f, 'docs/system/rules-in-force.md');
  assert.ok(md.includes('r1'), md);
  assert.ok(md.includes('[docs/adr/0001-x.md](../adr/0001-x.md)'), md);
  assert.ok(md.includes('Decision 1: use X'), md);
}
// A rule whose ADR is out of force fails check; a partly superseded ADR does not.
for (const status of ['Superseded by 0002 (replaced: 1; the rest carried forward)', 'Deprecated', 'Ignored']) {
  const r = setup({ adrStatus: status }).run(['check']);
  assert.strictEqual(r.status, 1, status);
  assert.ok(r.stderr.trimEnd().endsWith('rule r1: ADR docs/adr/0001-x.md is superseded'), r.stderr);
}
assert.strictEqual(setup({ adrStatus: 'Partly superseded by 0002' }).run(['check']).status, 0);
{
  const r = setup({ ruleAdr: 'docs/adr/0009-gone.md' }).run(['check']);
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.trimEnd().endsWith('rule r1: ADR docs/adr/0009-gone.md not found'), r.stderr);
}

{ // An ADR root that names no root in meta.roots is an error, never skipped (final fix A5)
  const r = setup({ ruleAdrRoot: 'nope' }).run(['check']);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.ok(r.stderr.trimEnd().endsWith('rule r1: ADR names root nope, not in meta.roots'), r.stderr);
}
{ // An ADR path that could leave its link target is refused, as an evidence path is (final review N3)
  for (const bad of ['docs/adr/x) <img src=x onerror=alert(1)>.md', 'docs/adr/a b.md', 'docs/adr/a`b.md', '/etc/adr.md', 'docs/../adr.md']) {
    const f = setup({ ruleAdr: bad });
    if (!bad.startsWith('/') && !bad.includes('..')) { f.put('host', bad, '# X\n\nStatus: accepted\n'); f.commit('host', 'adr'); }
    const r = f.run(['check']);
    assert.strictEqual(r.status, 1, `${bad}: ${r.stdout}`);
    assert.ok(r.stderr.includes(`rule r1: ADR ${bad}: `), r.stderr);
  }
}
{ // The ADR link target is percent-encoded, ( and ) included, so no path closes the link
  const model = { rules: [{ id: 'r1', text: 'Use X.', adr: { path: 'docs/adr/a(b)%.md' } }] } as unknown as Model;
  const md = renderRules(model, new Map(), 'backend', 'docs/system').text;
  assert.ok(md.includes('](../adr/a%28b%29%25.md))'), md);
}
console.log('system-flow-coverage.test.js: ok');
