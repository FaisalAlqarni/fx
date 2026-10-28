// Run: node scripts/system-flow-page.test.js
// system-flow build writes index.html and assets/, run as a process.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import { parseJson } from '../lib/json.js';
import { sfFixture } from '../tests/helpers/sf-fixture.js';

type Fx = ReturnType<typeof sfFixture>;
const SITE = 'docs/system-flow';
const KIT = path.join(__dirname, '..', 'references', 'visual');
const ev = (p: string, lines: string, symbol: string) => [{ path: p, lines, symbol }];
const LABEL = '<script>alert(1)</script>';

function setup(o: { catalogue?: boolean; questions?: boolean } = {}): Fx {
  const f = sfFixture();
  f.fxJson({});
  f.fragment('meta', { schemaVersion: 1, meta: { title: 'Fixture', purpose: 'A fixture system.', roots: [{ id: 'backend' }] } });
  f.fragment('level0', {
    levels: { root: 'engine', diagrams: [{
      id: 'engine', level: 0, title: 'Engine', summary: 'The engine.', groups: [],
      nodes: [
        { id: 'api', label: LABEL, kind: 'backend', role: 'Takes calls', evidence: ev('app/x.rb', '1-4', 'Link') },
        { id: 'db', label: 'Database', kind: 'database', role: 'Stores rows', evidence: [], unconfirmed: true },
      ],
      edges: [{ from: 'api', to: 'db', label: 'reads', evidence: ev('app/y.rb', '1-2', 'Y') }],
    }] },
  });
  f.fragment('chapters', {
    sections: [
      { id: 's1', title: 'Links', question: 'Where do links expire?', diagrams: ['engine'], sequences: ['turn'], storeFlows: ['first'], storeRefs: ['links-table'],
        bullets: [{ id: 'b1', text: 'Reply: مرحبا', evidence: ev('app/x.rb', '4', 'expired?') }] },
      { id: 's2', title: 'Again', question: 'Who else draws it?', diagrams: ['engine'] },
    ],
  });
  f.fragment('flows', {
    sequences: [{
      id: 'turn', title: 'Turn', chapter: 's1',
      participants: [{ id: 'api', label: 'API', evidence: ev('app/x.rb', '1', 'Link') }, { id: 'db', label: 'DB', evidence: ev('app/y.rb', '1', 'Y') }],
      messages: [{ n: 1, from: 'api', to: 'db', label: 'Reads link', evidence: ev('app/x.rb', '4', 'expired?') }, { n: 2, from: 'db', to: 'api', label: 'Returns row', evidence: ev('app/y.rb', '1', 'Y') }],
    }],
    stores: { sql: [{ id: 'links-table', table: 'links', evidence: ev('app/y.rb', '1', 'Y') }] },
    storeFlows: [{ id: 'first', trigger: 'A link is opened', chapter: 's1', steps: [{ n: 1, actor: 'api', op: 'read', store: 'sql', key: 'links:{id}', evidence: ev('app/x.rb', '4', 'expired?') }] }],
  });
  if (o.catalogue !== false) f.fragment('catalogue', { catalogue: [{ id: 'q1', kind: 'queue', name: 'Main queue', role: 'Holds jobs', evidence: ev('app/y.rb', '1', 'Y') }] });
  f.fragment('rules', { rules: [{ id: 'r1', text: 'Links expire.', evidence: ev('app/x.rb', '4', 'expired?') }] });
  f.fragment('inventory', { inventory: [{ id: 'job-a', kind: 'job', name: 'Job A', evidence: ev('app/x.rb', '1-4', 'Link') }, { id: 'job-b', kind: 'job', name: 'Job B', evidence: ev('app/y.rb', '1', 'Y') }] });
  f.fragment('corrections', { corrections: [{ id: 'c1', date: '2026-10-01', item: 'bullet:b1', before: 'Links never expire.', after: 'Links expire.', reason: 'owner' }] });
  if (o.questions) f.fragment('questions', { questions: [{ id: 'q1', text: 'Who prunes expired links?', recommended: 'The nightly job.', items: ['node:api'] }] });
  return f;
}
const read = (f: Fx, rel: string): string => fs.readFileSync(path.join(f.host, rel), 'utf8');
const build = (f: Fx) => { const r = f.run(['build']); assert.strictEqual(r.status, 0, `build exits 0\n${r.stdout}${r.stderr}`); return parseJson(r.stdout) as { pageBytes: number | null }; };
const chapter = (page: string, id: string): string => { const at = page.indexOf(`<section id="${id}"`); assert.ok(at >= 0, id); const end = page.indexOf('<section', at + 1); return page.slice(at, end < 0 ? undefined : end); };
const block = (page: string, id: string): unknown => { const m = new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`).exec(page); assert.ok(m, id); return parseJson(m[1] ?? ''); };
const sandbox = (file: string): Record<string, { [k: string]: (x: unknown) => unknown }> => {
  const ctx: Record<string, unknown> = {};
  vm.runInNewContext(fs.readFileSync(path.join(KIT, file), 'utf8'), ctx);
  return ctx as never;
};

const f = setup();
const out = build(f);
const page = read(f, `${SITE}/index.html`);

// Loads: only files under assets/ that exist, no network.
{
  const refs = [...page.matchAll(/\s(?:src|href)="([^"]*)"/g)].map((m) => m[1] ?? '').filter((r) => !r.startsWith('#') && !r.startsWith('diagrams/'));
  assert.ok(refs.every((r) => r.startsWith('assets/')), refs.join(','));
  const names = new Set(refs.map((r) => r.slice('assets/'.length)));
  for (const n of names) assert.ok(fs.existsSync(path.join(f.host, SITE, 'assets', n)), n);
  assert.deepStrictEqual([...names].sort(), ['elkjs-0.9.3.bundled.js', 'fx-flow-1.js', 'fx-map-2.js', 'fx-tokens-1.css', 'react-18.3.1.production.min.js', 'react-dom-18.3.1.production.min.js', 'reactflow-11.11.4.min.js', 'reactflow-11.11.4.style.css', 'theme.css']);
  assert.ok(!page.replace(/xmlns(:\w+)?="http:\/\/www\.w3\.org\/[^"]*"/g, '').match(/https?:\/\//), 'no network url');
  for (const l of ['LICENSE-react', 'LICENSE-reactflow', 'LICENSE-elkjs']) assert.ok(fs.existsSync(path.join(f.host, SITE, 'assets', l)), l);
  assert.ok(!fs.existsSync(path.join(f.host, SITE, 'assets', 'fx-map-1.js')));
}

// Each table scrolls in its own labelled region a keyboard can reach; the template has no page-wide table rule (A20).
{
  const tables = page.match(/<table>/g) ?? [];
  const wrapped = [...page.matchAll(/<div class="table-scroll" role="region" aria-label="([^"]+)" tabindex="0"><table>/g)].map((m) => m[1]);
  assert.ok(tables.length >= 4, `${tables.length} tables`);
  assert.strictEqual(wrapped.length, tables.length, 'every table is wrapped');
  assert.ok(wrapped.includes('Store: sql') && wrapped.includes('Corrections'), wrapped.join(','));
}

// Copy rule: an existing kit file is kept, theme.css is rewritten.
{
  const g = setup();
  g.put('host', `${SITE}/assets/fx-tokens-1.css`, '/* mine */');
  g.put('host', `${SITE}/assets/theme.css`, '/* fx stale */');
  build(g);
  assert.strictEqual(read(g, `${SITE}/assets/fx-tokens-1.css`), '/* mine */');
  assert.notStrictEqual(read(g, `${SITE}/assets/theme.css`), '/* fx stale */');
}

// Order, and the omitted open-questions chapter.
{
  const marks = ['<header', 'class="legend"', 'id="ch-00-explore"', 'id="ch-01-s1"', 'id="ch-02-s2"', 'id="components"', 'id="rules-in-force"', 'id="coverage"', 'id="corrections"'].map((m) => page.indexOf(m));
  assert.ok(marks.every((m, i) => m >= 0 && (i === 0 || m > (marks[i - 1] ?? 0))), marks.join(','));
  assert.ok(!page.includes('id="open-questions"'));
  assert.ok(page.includes('<html lang="en" dir="ltr">'));
}

// Legend: one item per node kind in the model, none of the template's stock labels.
{
  const items = (/<ul class="legend"[^>]*>([\s\S]*?)<\/ul>/.exec(page)?.[1] ?? '').match(/<li>[\s\S]*?<\/li>/g) ?? [];
  assert.deepStrictEqual(items.map((i) => i.replace(/<[^>]*>/g, '')), ['backend', 'database']);
}

// Lede and ownership.
{
  const s1 = chapter(page, 'ch-01-s1');
  assert.ok(/<h2[^>]*>[^<]*<\/h2>\s*<p[^>]*>Where do links expire\?<\/p>/.test(s1), 'question is the first paragraph');
  assert.strictEqual(page.split('<figure data-fx-flow="level-engine">').length - 1, 1);
  assert.ok(s1.includes('<figure data-fx-flow="level-engine">'));
  const s2 = chapter(page, 'ch-02-s2');
  assert.ok(s2.includes('href="#ch-01-s1"') && s2.includes('Drawn in chapter 01'));
  assert.ok(!s2.includes('data-fx-flow'));
}

// Evidence box.
{
  const s1 = chapter(page, 'ch-01-s1');
  assert.strictEqual(s1.split('<details class="evidence">').length - 1, 1);
  const box = /<details class="evidence"><summary>Files and locations \((\d+)\)<\/summary>([\s\S]*?)<\/details>/.exec(s1);
  assert.ok(box, 'evidence box');
  assert.strictEqual(Number(box[1]), (box[2]?.match(/<li/g) ?? []).length);
  for (const h of ['Facts', 'Diagram: Engine', 'Sequence: Turn', 'Store flow: A link is opened']) assert.ok((box[2] ?? '').includes(`>${h}<`), h);
  assert.ok(/<li[^>]*>[^]*?Database[^]*?unconfirmed/.test(box[2] ?? ''), 'unconfirmed marked');
}

// Components: one table for the kind; none without a catalogue.
{
  const c = chapter(page, 'components');
  assert.strictEqual(c.split('<table').length - 1, 1);
  assert.ok(c.includes('Main queue'));
  const g = setup({ catalogue: false });
  build(g);
  assert.ok(!read(g, `${SITE}/index.html`).includes('id="components"'));
}

// Escape: body entity form, JSON < form, and the data still parses back.
{
  assert.ok(page.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!page.includes('<script>alert') && page.split('</script').length === page.split('<script').length);
  for (const id of ['map-data', 'diagrams']) {
    const m = new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`).exec(page);
    assert.ok(m?.[1]?.includes('\\u003cscript>alert(1)\\u003c/script>'), id);
    assert.ok(JSON.stringify(parseJson(m?.[1] ?? '')).includes(LABEL.replace(/"/g, '\\"')) || JSON.stringify(parseJson(m?.[1] ?? '')).includes(LABEL), id);
  }
}

// Arabic.
assert.ok(page.includes('Reply: <span lang="ar" dir="rtl">مرحبا</span>'));

// Kit validators accept the inline data.
{
  assert.strictEqual(JSON.stringify(sandbox('fx-map-2.js').fxMap?.validateMapData?.(block(page, 'map-data'))), '[]');
  const figs = block(page, 'diagrams') as Record<string, unknown>;
  assert.deepStrictEqual(Object.keys(figs).sort(), ['flow-first', 'level-engine', 'seq-turn']);
  const flow = sandbox('fx-flow-1.js').fxFlow;
  for (const [k, spec] of Object.entries(figs)) assert.strictEqual(JSON.stringify(flow?.validateFigure?.(spec)), '[]', k);
}

// Design, Renderers (Page): NAV holds the numbered chapter list and the deep diagram list, and every deep page is linked.
{
  const nav = /<nav[^>]*>([\s\S]*?)<\/nav>/.exec(page)?.[1] ?? '';
  const items = (/<ol>([\s\S]*?)<\/ol>/.exec(nav)?.[1] ?? '').match(/<li>[\s\S]*?<\/li>/g) ?? [];
  assert.deepStrictEqual(items.map((i) => i.replace(/<[^>]*>/g, '')), ['Explore the system', 'Links', 'Again', 'Components', 'Rules in force', 'Coverage', 'Corrections']);
  for (const id of ['ch-00-explore', 'ch-01-s1', 'ch-02-s2', 'components', 'rules-in-force', 'coverage', 'corrections']) assert.ok(nav.includes(`href="#${id}"`), id);
  for (const d of ['arch-engine', 'seq-turn', 'flow-first']) {
    assert.ok(nav.includes(`href="diagrams/${d}.html"`), `nav links ${d}`);
    assert.ok(chapter(page, 'ch-01-s1').includes(`href="diagrams/${d}.html"`), `chapter s1 links ${d}`);
  }
  const written = fs.readdirSync(path.join(f.host, SITE, 'diagrams')).filter((n) => n.endsWith('.html'));
  assert.ok(written.length >= 3, written.join(','));
  for (const n of written) assert.ok(page.includes(`href="diagrams/${n}"`), `index.html links ${n}`);
  // ADR 0066 decision 3: a deep diagram is linked, never embedded, so the site never depends on archify.
  assert.ok(!/<(?:iframe|embed|object)\b[^>]*diagrams\//i.test(page), 'index.html embeds a deep diagram');
}

// Design, Renderers (Page): Open questions, Corrections, Coverage and the store tables hold their content.
{
  const g = setup({ questions: true });
  build(g);
  const pg = read(g, `${SITE}/index.html`);
  const q = chapter(pg, 'open-questions');
  for (const want of ['Who prunes expired links?', 'The nightly job.', 'node:api']) assert.ok(q.includes(want), want);
  const cells = (/<tbody><tr>([\s\S]*?)<\/tr>/.exec(chapter(pg, 'corrections'))?.[1] ?? '').split('</td><td>').map((c) => c.replace(/<[^>]*>/g, ''));
  assert.deepStrictEqual(cells, ['2026-10-01', 'bullet:b1', 'Links never expire.', 'Links expire.', 'owner']);
  const cov = parseJson(read(g, `${SITE}/model/coverage.json`)) as { entries: { kind: string; name: string }[]; counts: Record<string, { covered: number; total: number }> };
  const covHtml = chapter(pg, 'coverage');
  assert.ok(cov.entries.length > 0);
  for (const e of cov.entries) assert.ok(covHtml.includes(`>${e.name}<`), `coverage row ${e.name}`);
  for (const [k, c] of Object.entries(cov.counts)) assert.ok(covHtml.includes(`<td>${k}</td><td>${c.covered}</td><td>${c.total}</td>`), `coverage count ${k}`);
  const s1 = chapter(pg, 'ch-01-s1');
  assert.ok(/Store flow: A link is opened<\/h4>\s*<div class="table-scroll"[^>]*><table>[\s\S]*?<td>1<\/td><td>api<\/td><td>read<\/td><td>sql<\/td><td>links:\{id\}<\/td>/.test(s1), 'flow step row');
  assert.ok(/Store: sql<\/h4>\s*<div class="table-scroll"[^>]*><table>[\s\S]*?<td>links-table<\/td><td>links<\/td>/.test(s1), 'storeRefs row');
}

// Design, Layout: dropped arrows are listed under the figure; the map still holds every edge.
{
  const g = setup();
  const names = ['a1', 'a2', 'a3', 'b1', 'b2', 'b3'];
  const nodes = names.map((id) => ({ id, label: `Node ${id}`, kind: 'backend', role: `Role of ${id}`, evidence: ev('app/x.rb', '1-4', 'Link') }));
  const edges = ['a1', 'a2', 'a3'].flatMap((a) => ['b1', 'b2', 'b3'].map((b) => ({ from: a, to: b, label: `${a} to ${b}`, evidence: ev('app/y.rb', '1-2', 'Y') })));
  g.fragment('level0', { levels: { root: 'dense', diagrams: [{ id: 'dense', level: 0, title: 'Dense', summary: 'K33.', groups: [], nodes, edges }] } });
  g.fragment('chapters', { sections: [{ id: 's1', title: 'Dense', question: 'Why so many?', diagrams: ['dense'] }] });
  g.fragment('flows', {});
  g.fragment('corrections', {});
  build(g);
  const pg = read(g, `${SITE}/index.html`);
  const fig = (block(pg, 'diagrams') as Record<string, { notDrawn: string[] }>)['level-dense'];
  assert.ok(fig && fig.notDrawn.length >= 1, 'a dense figure drops an arrow');
  const note = /<p class="not-drawn">([\s\S]*?)<\/p>/.exec(chapter(pg, 'ch-01-s1'))?.[1] ?? '';
  for (const id of fig?.notDrawn ?? []) assert.ok(note.includes(id.slice(id.indexOf(':') + 1).replace('>', ' to ')), `${id} named under the figure`);
  assert.ok(chapter(pg, 'ch-01-s1').indexOf('</figure>') < chapter(pg, 'ch-01-s1').indexOf('class="not-drawn"'), 'the list follows the figure');
  const map = block(pg, 'map-data') as { levels: { edges: unknown[] }[] };
  assert.strictEqual(map.levels[0]?.edges.length, 9, 'map-data keeps every edge');
}

// pageBytes.
assert.strictEqual(out.pageBytes, fs.statSync(path.join(f.host, SITE, 'index.html')).size);

console.log('system-flow-page.test.js: OK');
