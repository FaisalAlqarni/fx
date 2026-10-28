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

function setup(o: { catalogue?: boolean } = {}): Fx {
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
      { id: 's1', title: 'Links', question: 'Where do links expire?', diagrams: ['engine'], sequences: ['turn'], storeFlows: ['first'],
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
  f.fragment('corrections', { corrections: [{ id: 'c1', date: '2026-10-01', item: 'bullet:b1', reason: 'owner' }] });
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

// pageBytes.
assert.strictEqual(out.pageBytes, fs.statSync(path.join(f.host, SITE, 'index.html')).size);

console.log('system-flow-page.test.js: OK');
