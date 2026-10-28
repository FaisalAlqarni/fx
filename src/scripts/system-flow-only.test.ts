// Run: node scripts/system-flow-only.test.js
// system-flow build --only: rebuilds the docs, figures and deep diagrams holding the given items, run as a process.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from '../lib/json.js';
import { sfFixture } from '../tests/helpers/sf-fixture.js';

type Fx = ReturnType<typeof sfFixture>;
type Rebuilt = { docs: string[]; figures: string[]; diagrams: string[] };
const ev = [{ path: 'app/x.rb', lines: '1-4', symbol: 'Link' }];
const TEXT = 'A link expires after 30 days.';
const corr = (item: string, before: string, after: string) => ({ id: `c-${item.replace(/\W/g, '-')}`, date: '2026-10-28', item, before, after, reason: 'stale', evidence: [{ owner: '2026-10-28' }] });

type Tweak = { b1?: string; api?: string; extra?: object[] };
const model = (f: Fx, t: Tweak = {}): void => {
  f.fragment('meta', { schemaVersion: 2, meta: { roots: [{ id: 'backend' }] } });
  f.fragment('level0', {
    levels: { root: 'engine', diagrams: [{ id: 'engine', level: 0, title: 'Engine', summary: 'S', groups: [],
      nodes: [{ id: 'api', label: t.api ?? 'API', kind: 'backend', look: 'service', role: 'R', evidence: ev }, { id: 'db', label: 'Db', kind: 'database', look: 'service', role: 'R', evidence: ev }, ...(t.extra ?? [])],
      edges: [{ from: 'api', to: 'db', label: 'reads', evidence: ev }] }] },
  });
  f.fragment('chapters', { sections: [
    { id: 's1', title: 'Links', question: 'Q?', diagrams: ['engine'], bullets: [{ id: 'b1', text: t.b1 ?? TEXT, evidence: ev }] },
    { id: 's2', title: 'Turns', question: 'Q?', bullets: [{ id: 'b2', text: 'Second.', evidence: ev }] },
  ] });
  f.fragment('flows', { sequences: [{ id: 'turn', title: 'Turn', chapter: 's2',
    participants: [{ id: 'api', label: 'API', look: 'service', evidence: ev }, { id: 'db', label: 'DB', look: 'service', evidence: ev }],
    messages: [{ n: 1, from: 'api', to: 'db', label: 'Reads', evidence: ev }] }] });
  f.floor();
};
const setup = (): Fx => { const f = sfFixture(); model(f); f.commit('host', 'fragments'); return f; };

// Rewritten by every --only build: the indexes (the Start here folder has its own), coverage.md, rules-in-force.md and glossary.md (final fix A16).
const ALWAYS = ['docs/system/index.md', 'docs/system/start-here/index.md', 'docs/system/coverage.md', 'docs/system/rules-in-force.md', 'docs/system/glossary.md'];
const GEN = ['docs/system/s1.md', 'docs/system/s2.md', 'docs/system-flow/diagrams/seq-turn.html', 'docs/system-flow/diagrams/arch-engine.html', 'docs/system-flow/index.html'];
const snap = (f: Fx): Record<string, { text: string; mtime: number }> => Object.fromEntries(GEN.map((r) => {
  const file = path.join(f.host, r);
  return [r, { text: fs.readFileSync(file, 'utf8'), mtime: fs.statSync(file).mtimeMs }];
}));
const pause = (): void => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 40); };
const full = (f: Fx) => { const r = f.run(['build']); assert.strictEqual(r.status, 0, `${r.stdout}${r.stderr}`); return parseJson(r.stdout) as { rebuilt: Rebuilt }; };
const only = (f: Fx, ...a: string[]) => { pause(); const r = f.run(['build', '--only', ...a]); assert.strictEqual(r.status, 0, `${r.stdout}${r.stderr}`); return parseJson(r.stdout) as { rebuilt: Rebuilt }; };
const same = (before: ReturnType<typeof snap>, after: ReturnType<typeof snap>, rel: string, why: string): void => {
  assert.deepStrictEqual(after[rel], before[rel], `${rel} kept its bytes and mtime: ${why}`);
};
const changed = (before: ReturnType<typeof snap>, after: ReturnType<typeof snap>, rel: string): void => {
  assert.notStrictEqual((after[rel] as { text: string }).text, (before[rel] as { text: string }).text, `${rel} changed`);
};

// start-parts lists the level-0 diagram engine, so an item on it also rebuilds start-parts.md.
{
  const f = setup();
  const first = full(f);
  assert.deepStrictEqual(first.rebuilt.docs.filter((d) => /\/s\d\.md$/.test(d)).sort(), ['docs/system/s1.md', 'docs/system/s2.md'], 'full build lists every section doc');
  assert.ok(first.rebuilt.figures.includes('level-engine') && first.rebuilt.diagrams.includes('seq-turn'), 'full build lists every figure and diagram');
  const before = snap(f);

  model(f, { b1: 'A link expires after 60 days.' });
  f.fragment('corrections', { corrections: [corr('bullet:b1', TEXT, 'A link expires after 60 days.')] });
  const r = only(f, 'bullet:b1');
  assert.deepStrictEqual(r.rebuilt, { docs: ['docs/system/s1.md', ...ALWAYS], figures: [], diagrams: [] });
  const after = snap(f);
  changed(before, after, 'docs/system/s1.md');
  for (const rel of ['docs/system/s2.md', 'docs/system-flow/diagrams/seq-turn.html', 'docs/system-flow/diagrams/arch-engine.html']) same(before, after, rel, 'bullet:b1');
  assert.notStrictEqual((after['docs/system-flow/index.html'] as { mtime: number }).mtime, (before['docs/system-flow/index.html'] as { mtime: number }).mtime, 'index.html rewritten');

  // A repeated --only build rewrites the same bytes.
  const again = snap(f);
  only(f, 'bullet:b1');
  assert.deepStrictEqual(Object.values(snap(f)).map((x) => x.text), Object.values(again).map((x) => x.text), 'repeat gives the same bytes');

  // By path: the same set `query` prints.
  const q = parseJson(f.run(['query', 'app/x.rb']).stdout) as { items: { handle: string }[] };
  assert.ok(q.items.length > 0);
  assert.deepStrictEqual(only(f, 'app/x.rb').rebuilt, { docs: ['docs/system/start-here/start-parts.md', 'docs/system/s1.md', 'docs/system/s2.md', ...ALWAYS], figures: ['level-engine', 'seq-turn'], diagrams: ['arch-engine', 'seq-turn'] });
  // Comma list and repeated flags both work.
  assert.deepStrictEqual(only(f, 'bullet:b1,bullet:b2').rebuilt.docs, ['docs/system/s1.md', 'docs/system/s2.md', ...ALWAYS]);
  assert.deepStrictEqual(only(f, 'bullet:b1', '--only', 'bullet:b2').rebuilt.docs, ['docs/system/s1.md', 'docs/system/s2.md', ...ALWAYS]);
}
{
  const f = setup();
  full(f);
  model(f, { api: 'Gateway' });
  f.fragment('corrections', { corrections: [corr('node:api', 'API', 'Gateway')] });
  const before = snap(f);
  const r = only(f, 'node:api');
  assert.deepStrictEqual(r.rebuilt, { docs: ['docs/system/start-here/start-parts.md', 'docs/system/s1.md', ...ALWAYS], figures: ['level-engine'], diagrams: ['arch-engine'] });
  same(before, snap(f), 'docs/system-flow/diagrams/seq-turn.html', 'node:api');
}
{
  const f = setup();
  full(f);
  assert.deepStrictEqual(only(f, 'seq:turn').rebuilt, { docs: ['docs/system/s2.md', ...ALWAYS], figures: ['seq-turn'], diagrams: ['seq-turn'] });
  assert.deepStrictEqual(only(f, 'diagram:engine').rebuilt, { docs: ['docs/system/start-here/start-parts.md', 'docs/system/s1.md', ...ALWAYS], figures: ['level-engine'], diagrams: ['arch-engine'] });
  assert.deepStrictEqual(only(f, 'section:s2').rebuilt, { docs: ['docs/system/s2.md', ...ALWAYS], figures: [], diagrams: [] });
}
{
  const f = sfFixture();
  model(f, { extra: [{ id: 'turn', label: 'Turn', kind: 'backend', look: 'service', role: 'R', evidence: ev }] });
  f.fragment('level0', { levels: { root: 'engine', diagrams: [{ id: 'engine', level: 0, title: 'Engine', summary: 'S', groups: [],
    nodes: [{ id: 'api', label: 'API', kind: 'backend', look: 'service', role: 'R', evidence: ev }, { id: 'turn', label: 'Turn', kind: 'backend', look: 'service', role: 'R', evidence: ev }],
    edges: [{ from: 'api', to: 'turn', label: 'x', evidence: ev }] }] } });
  f.floor();
  f.commit('host', 'fragments');
  full(f);
  const r = only(f, 'node:turn').rebuilt;
  assert.deepStrictEqual(r.figures, ['level-engine'], 'node turn is not sequence turn');
  assert.deepStrictEqual(r.diagrams, ['arch-engine']);
}
{
  const f = setup();
  full(f);
  const before = snap(f);
  const r = f.run(['build', '--only', 'node:ghost']);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /^system-flow: build: no item node:ghost$/m);
  assert.deepStrictEqual(snap(f), before, 'nothing written');
}
{
  const f = setup();
  full(f);
  const before = snap(f);
  f.fragment('chapters', { sections: [
    { id: 's1', title: 'Links', question: 'Q?', diagrams: ['engine'], bullets: [{ id: 'b1', text: TEXT, evidence: [{ path: 'app/x.rb', lines: '90-99', symbol: 'Link' }] }] },
    { id: 's2', title: 'Turns', question: 'Q?', bullets: [{ id: 'b2', text: 'Second.', evidence: ev }] },
  ] });
  const r = f.run(['build', '--only', 'bullet:b1']);
  assert.strictEqual(r.status, 1, 'a bad range fails the check first');
  assert.deepStrictEqual(snap(f), before, 'nothing written');
}
{
  // An unverified item outside --only stays unverified; the selected one is stamped.
  const f = setup();
  const head = f.git('host', 'rev-parse', 'HEAD');
  full(f);
  const chapters = (): { sections: { bullets: { id: string; verified?: Record<string, string> }[] }[] } => parseJson(fs.readFileSync(path.join(f.host, 'docs/system-flow/model/fragments/chapters.json'), 'utf8')) as never;
  const strip = chapters();
  for (const s of strip.sections) for (const b of s.bullets) delete b.verified;
  f.fragment('chapters', strip);
  only(f, 'bullet:b1');
  const [s1, s2] = chapters().sections.slice(4);
  assert.deepStrictEqual(s1?.bullets[0]?.verified, { backend: head }, 'selected item stamped');
  assert.strictEqual(s2?.bullets[0]?.verified, undefined, 'item outside --only not stamped');
}
{ // A store handle rewrites stores.md
  const f = setup();
  f.fragment('stores', { stores: { sql: [{ id: 'links-table', table: 'links', evidence: ev }] } });
  f.commit('host', 'stores');
  full(f);
  f.fragment('stores', { stores: { sql: [{ id: 'links-table', table: 'short_links', evidence: ev }] } });
  f.fragment('corrections', { corrections: [corr('store:links-table', 'links', 'short_links')] });
  const r = only(f, 'store:links-table');
  assert.deepStrictEqual(r.rebuilt.docs, ['docs/system/stores.md', ...ALWAYS]);
  assert.ok(fs.readFileSync(path.join(f.host, 'docs/system/stores.md'), 'utf8').includes('| short_links |'));
}
process.stdout.write('system-flow-only.test.js: OK\n');
