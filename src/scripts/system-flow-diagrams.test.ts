// Run: node scripts/system-flow-diagrams.test.js
// system-flow build writes the deep diagrams, archify specs and the SVG fallback pages, run as a process.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import { parseJson } from '../lib/json.js';
import { layoutAll } from '../lib/sf-layout.js';
import type { Model } from '../lib/sf-model.js';
import { validate } from '../lib/sf-schema.js';
import { sfFixture } from '../tests/helpers/sf-fixture.js';

type Fx = ReturnType<typeof sfFixture>;
type Obj = Record<string, any>; // ts-gate-ok: specs are walked by key in assertions
const SITE = 'docs/system-flow';
const D = `${SITE}/diagrams`;
const SCHEMAS = path.join(__dirname, '..', 'tests', 'fixtures', 'archify-3.2.0');
const schema = (n: string): Obj => parseJson(fs.readFileSync(path.join(SCHEMAS, `${n}.schema.json`), 'utf8')) as Obj;
const refs = { 'common.schema.json': schema('common') };
const ev = (p: string, lines: string, symbol: string) => [{ path: p, lines, symbol }];
const LONG = 'A source label that is clearly longer than forty-eight characters';

function setup(): Fx {
  const f = sfFixture();
  f.put('host', 'app/api.rb', `${Array.from({ length: 49 }, (_, i) => (i === 9 ? '# Api#call' : `# line ${i + 1}`)).join('\n')}\n# Api#log\n# ${LONG}\n`);
  f.commit('host', 'api');
  f.git('host', 'remote', 'add', 'origin', 'https://example.com/acme/app.git');
  f.fxJson({});
  f.fragment('meta', { schemaVersion: 2, meta: { roots: [{ id: 'backend' }, { id: 'guide' }] } });
  f.fxJson({ system_flow: { roots: { guide: '../guide' } } });
  const nodes = (extra: Obj[] = []): Obj[] => [
    { id: 'api', label: '<b>', kind: 'backend', look: 'service', role: 'Takes calls', evidence: [
      { path: 'app/api.rb', lines: '10-42', symbol: 'Api#call' }, { path: 'app/api.rb', lines: '50', symbol: 'Api#log' },
      { path: 'app/api.rb', lines: '51', symbol: LONG }, { path: 'app/y.rb', lines: '1', symbol: 'Y' }] },
    { id: 'db', label: 'Database', kind: 'database', look: 'service', role: 'Stores rows', evidence: ev('app/y.rb', '1-2', 'Y') },
    { id: '2fa', label: 'Second factor', kind: 'security', look: 'service', role: 'Checks codes', evidence: ev('app/x.rb', '4', 'expired?') },
    ...extra,
  ];
  f.fragment('level0', { levels: { root: 'system', diagrams: [
    { id: 'system', level: 0, title: 'System', summary: 'All.', groups: [], nodes: [
      { id: 'engine', label: 'Engine', kind: 'backend', look: 'service', role: 'Runs', children: 'engine', evidence: ev('app/x.rb', '1-4', 'Link') },
      { id: 'store', label: 'Store', kind: 'database', look: 'service', role: 'Keeps', evidence: ev('app/y.rb', '1', 'Y') }],
      edges: [{ from: 'engine', to: 'store', label: 'writes', evidence: ev('app/y.rb', '1', 'Y') }] },
    { id: 'engine', level: 1, parent: 'system', title: 'Engine', summary: 'The engine.', groups: [], nodes: nodes(),
      edges: [{ from: 'api', to: 'db', label: 'reads', evidence: ev('app/y.rb', '1-2', 'Y') }, { from: 'api', to: '2fa', label: 'checks', evidence: ev('app/x.rb', '4', 'expired?') }] },
  ] } });
  f.fragment('chapters', { sections: [{ id: 's1', title: 'Links', question: 'Where do links expire?', diagrams: ['system', 'engine'], bullets: [{ id: 'b1', text: 'x', evidence: ev('app/x.rb', '4', 'expired?') }] }] });
  const msgs = Array.from({ length: 14 }, (_, i) => ({ n: i + 1, from: i % 2 ? 'db' : 'api', to: i % 2 ? 'api' : 'db', label: `Step ${i + 1}`, evidence: i === 13 ? ev('app/x.rb', '4', 'expired?') : ev('app/y.rb', '1', 'Y') }));
  f.fragment('flows', {
    sequences: [{ id: 'turn', title: 'Turn', chapter: 's1',
      participants: [{ id: 'api', label: 'API', look: 'service', evidence: ev('app/x.rb', '1', 'Link') }, { id: 'db', label: 'DB', look: 'service', evidence: ev('app/y.rb', '1', 'Y') }, { id: 'aux', label: 'Aux', look: 'service', evidence: ev('app/y.rb', '1', 'Y') }],
      messages: msgs }],
    stores: { sql: [{ id: 'links-table', table: 'links', evidence: ev('app/y.rb', '1', 'Y') }] },
    storeFlows: [{ id: 'first', trigger: 'A link is opened', chapter: 's1', steps: Array.from({ length: 7 }, (_, i) => ({ n: i + 1, actor: 'api', op: i % 2 ? 'write' : 'read', store: 'sql', key: 'links:{id}', evidence: ev('app/x.rb', '4', 'expired?') })) }],
  });
  return f;
}
const read = (f: Fx, rel: string): string => fs.readFileSync(path.join(f.host, rel), 'utf8');
const spec = (f: Fx, name: string): Obj => parseJson(read(f, `${D}/src/${name}.json`)) as Obj;
const build = (f: Fx) => { const r = f.run(['build']); assert.strictEqual(r.status, 0, `build exits 0\n${r.stdout}${r.stderr}`); return { out: parseJson(r.stdout) as { diagrams: { name: string; renderer: string; reason: string }[] }, err: r.stderr }; };

const f = setup();
const { out, err } = build(f);

// Names and page splits.
{
  const have = fs.readdirSync(path.join(f.host, D)).filter((n) => n.endsWith('.html')).sort();
  assert.deepStrictEqual(have, ['arch-engine.html', 'arch-system.html', 'flow-first.html', 'seq-turn-p2.html', 'seq-turn.html']);
  const json = fs.readdirSync(path.join(f.host, D, 'src')).sort();
  assert.deepStrictEqual(json, ['arch-engine.json', 'arch-system.json', 'flow-first.json', 'seq-turn-p2.json', 'seq-turn.json']);
  assert.deepStrictEqual(spec(f, 'seq-turn').messages.length, 8);
  assert.deepStrictEqual(spec(f, 'seq-turn-p2').messages.length, 6);
  for (const n of ['seq-turn', 'seq-turn-p2']) {
    const s = spec(f, n);
    const used = new Set(s.messages.flatMap((m: Obj) => [m.from, m.to]));
    assert.deepStrictEqual(s.participants.map((p: Obj) => p.id).sort(), [...used].sort(), n);
  }
}

// Sources.
{
  const c = spec(f, 'arch-engine').components.find((x: Obj) => x.id === 'api');
  assert.strictEqual(c.sources.length, 3);
  assert.deepStrictEqual(c.sources[0], { path: 'app/api.rb', line: 10, end_line: 42, label: 'Api#call' });
  assert.strictEqual(c.sources[2].label.length, 48);
  assert.ok(!('sources' in spec(f, 'arch-engine').connections[0]));
  for (const m of spec(f, 'seq-turn').messages) assert.ok(!('sources' in m));
}

// Repository, remote, absolute paths, cross-root evidence.
{
  const head = f.git('host', 'rev-parse', 'HEAD');
  const s = spec(f, 'arch-engine');
  assert.deepStrictEqual(s.meta.repository, { url: 'https://example.com/acme/app.git', revision: head, link_mode: 'local-only' });
  assert.strictEqual(s.meta.quality_profile, 'showcase');
  assert.strictEqual(s.meta.output, 'arch-engine.html');
  for (const n of fs.readdirSync(path.join(f.host, D, 'src'))) assert.ok(!read(f, `${D}/src/${n}`).includes(f.base), n);
  f.git('host', 'remote', 'set-url', 'origin', 'https://user:token@example.com/acme/app.git');
  build(f);
  assert.strictEqual(spec(f, 'arch-engine').meta.repository.url, 'https://example.com/acme/app.git');
}

// A root with no remote: archify needs a remote address for meta.repository and meta.repository for sources,
// so the spec carries neither and the evidence goes to the steps card.
{
  const g = setup();
  g.git('host', 'remote', 'remove', 'origin');
  build(g);
  for (const n of fs.readdirSync(path.join(g.host, D, 'src'))) {
    const s = parseJson(read(g, `${D}/src/${n}`)) as Obj;
    assert.ok(!('repository' in s.meta), n);
    assert.ok([...(s.components ?? []), ...(s.participants ?? [])].every((c: Obj) => !('sources' in c)), n);
    assert.deepStrictEqual(validate(schema(s.diagram_type === 'architecture' ? 'architecture' : 'sequence'), s, refs), [], n);
  }
  assert.ok(JSON.stringify(spec(g, 'arch-engine').cards).includes('@backend/app/api.rb:10-42'), JSON.stringify(spec(g, 'arch-engine').cards));
}

// A local-path origin (a clone of a clone) is no remote address: archify rejects it as url-invalid, so the spec
// carries no repository, exactly as with no remote.
{
  const g = setup();
  g.git('host', 'remote', 'set-url', 'origin', g.guide);
  build(g);
  for (const n of fs.readdirSync(path.join(g.host, D, 'src'))) assert.ok(!('repository' in (parseJson(read(g, `${D}/src/${n}`)) as Obj).meta), n);
}

// Cross-root evidence goes to the steps card, not to sources.
{
  const g = setup();
  const lvl = parseJson(fs.readFileSync(path.join(g.host, `${SITE}/model/fragments/level0.json`), 'utf8')) as Obj;
  const api = lvl.levels.diagrams[1].nodes[0];
  api.evidence = [api.evidence[0], api.evidence[3], { root: 'guide', path: 'README.md', lines: '1', symbol: 'Guide' }];
  g.fragment('level0', lvl);
  build(g);
  const s = spec(g, 'arch-engine');
  assert.ok(s.components.every((c: Obj) => !(c.sources ?? []).some((x: Obj) => x.path === 'README.md')));
  assert.ok(JSON.stringify(s.cards).includes('@guide/README.md:1'), JSON.stringify(s.cards));
}

// An actor named like its store keeps participant ids unique, and the spec still validates.
{
  const g = setup();
  const lvl = parseJson(fs.readFileSync(path.join(g.host, `${SITE}/model/fragments/level0.json`), 'utf8')) as Obj;
  lvl.levels.diagrams[1].nodes.push({ id: 'cache', label: 'Cache', kind: 'cloud', look: 'service', role: 'Holds', evidence: ev('app/y.rb', '1', 'Y') });
  lvl.levels.diagrams[1].edges.push({ from: 'api', to: 'cache', label: 'caches', evidence: ev('app/y.rb', '1', 'Y') });
  g.fragment('level0', lvl);
  const fl = parseJson(fs.readFileSync(path.join(g.host, `${SITE}/model/fragments/flows.json`), 'utf8')) as Obj;
  fl.stores.cache = [{ id: 'k1', pattern: 'k:*', evidence: ev('app/y.rb', '1', 'Y') }];
  fl.storeFlows.push({ id: 'second', trigger: 'Cached', chapter: 's1', steps: [{ n: 1, actor: 'cache', op: 'read', store: 'cache', key: 'k', evidence: ev('app/y.rb', '1', 'Y') }] });
  g.fragment('flows', fl);
  build(g);
  const s = spec(g, 'flow-second');
  const ids = s.participants.map((x: Obj) => x.id);
  assert.strictEqual(new Set(ids).size, 2, ids.join());
  assert.deepStrictEqual(validate(schema('sequence'), s, refs), []);
  assert.ok(s.messages.every((m: Obj) => ids.includes(m.from) && ids.includes(m.to)));
}

// archify 3.2.0's composition/viewport-height (desktop-readability.mjs predictedFixedWidthOverflow): a sequence with an
// authored viewBox gets no reader fit, so the page passes only when width / height >= 1.55 or, drawn 1346 px wide
// (1440 - 64 - 30), its height plus 126 px of chrome (12 + 39 + 75) stays within 900. A 2-message last page and a
// 3-step store flow included.
{
  const g = setup();
  const fl = parseJson(fs.readFileSync(path.join(g.host, `${SITE}/model/fragments/flows.json`), 'utf8')) as Obj;
  fl.sequences[0].messages = fl.sequences[0].messages.slice(0, 10);
  fl.storeFlows[0].steps = fl.storeFlows[0].steps.slice(0, 3);
  g.fragment('flows', fl);
  build(g);
  assert.strictEqual(spec(g, 'seq-turn-p2').messages.length, 2);
  assert.strictEqual(spec(g, 'flow-first').messages.length, 3);
  for (const n of ['seq-turn', 'seq-turn-p2', 'flow-first']) {
    const [w, h] = spec(g, n).meta.viewBox as [number, number];
    assert.ok(w / h >= 1.55 || Math.round(1346 * h / w) + 126 <= 900, `${n} ${w}x${h}`);
  }
}

// archify 3.2.0 geometry rules the specs must meet by construction (proof run (a): 20 of 28 specs rejected).
// render-architecture.mjs boundaryRect: a frame is the members' box padded 30 px left, right and top, 20 more at the bottom.
// render-sequence.mjs spreadColumnGeometry: lifeline centres on an authored width; noteLayout: a note wraps 7 px text
// (4.2 px a unit) inside one lane gap less 30 px, its bottom at y + 22 + 11 per extra line, and the next message must
// sit 22 px below it; legendRequiredHeight: content bottom + 12 + 86; a showcase message label is units * 6.6 + 12 wide.
const seqColumns = (w: number, count: number) => {
  const box = Math.max(86, Math.min(190, Math.round((w - 124) / count) - 24));
  const margin = Math.max(40, Math.min(62, w - 40 - (count * box + (count - 1) * 16)));
  const gap = count > 1 ? Math.max(box + 16, (w - 40 - margin - box) / (count - 1)) : 108;
  return (i: number): number => margin + box / 2 + i * gap;
};
const noteLines = (text: string, width: number): number => {
  let lines = 1, line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length * 4.2 > width) { lines += 1; line = word; } else line = next;
  }
  return lines;
};
const NOTE = 'only when the platform is enabled and the request carries a header, otherwise the validator passes the call through to the next middleware';
const WIDE = 'AddConfiguration(BuildInitialConfiguration): appsettings.{env}.json, then environment variables, then the database rows';
{
  const g = setup();
  const lvl = parseJson(fs.readFileSync(path.join(g.host, `${SITE}/model/fragments/level0.json`), 'utf8')) as Obj;
  lvl.levels.diagrams[1].groups = [{ id: 'edge', label: 'A boundary title that is much wider than the one node it wraps', members: ['api'], evidence: ev('app/x.rb', '1', 'Link') }];
  lvl.levels.diagrams[1].edges[0].label = 'reads every row of the links table at boot and again on each hourly refresh tick';
  g.fragment('level0', lvl);
  const fl = parseJson(fs.readFileSync(path.join(g.host, `${SITE}/model/fragments/flows.json`), 'utf8')) as Obj;
  const ms = fl.sequences[0].messages;
  ms[0].label = WIDE;
  ms[1].note = NOTE; ms[2].note = NOTE; ms[7].note = NOTE;
  ms[3].to = ms[3].from; ms[3].label = 'builds the client context';
  g.fragment('flows', fl);
  build(g);

  // A boundary frame, with its title, stays inside the canvas; archify sizes the canvas (no authored viewBox).
  const a = spec(g, 'arch-engine');
  assert.ok(!('viewBox' in a.meta), 'architecture spec leaves the canvas to archify');
  for (const b of a.boundaries) {
    const m = a.components.filter((c: Obj) => b.wraps.includes(c.id));
    const x0 = Math.min(...m.map((c: Obj) => c.pos[0])), x1 = Math.max(...m.map((c: Obj) => c.pos[0] + c.size[0]));
    const title = Math.max(30, b.label.length * 9 * 0.6 + 10) + 8;
    assert.ok(x0 - 30 - Math.max(0, title - (x1 - x0 + 60)) / 2 >= 0, `boundary "${b.label}" frame and title start inside the canvas`);
    assert.ok(Math.min(...m.map((c: Obj) => c.pos[1])) - 30 >= 0, `boundary "${b.label}" frame starts below the canvas top`);
  }
  // A connection carries the short label the layout made room for, not the model's full sentence.
  assert.ok(a.connections.every((c: Obj) => c.label.length <= 26), JSON.stringify(a.connections.map((c: Obj) => c.label)));

  for (const n of ['seq-turn', 'seq-turn-p2']) {
    const s = spec(g, n);
    const [w, h] = s.meta.viewBox as [number, number];
    const at = seqColumns(w, s.participants.length);
    const idx = new Map(s.participants.map((p: Obj, i: number) => [p.id, i]));
    const ms2 = s.messages as Obj[];
    // No self-message: archify rejects them (sequence/self-message-unsupported).
    assert.ok(ms2.every((m) => m.from !== m.to), `${n}: no self-message`);
    let bottom = 0;
    ms2.forEach((m, i) => {
      const xa = at(idx.get(m.from) as number), xb = at(idx.get(m.to) as number);
      const half = (m.label.length * 6.6 + 12) / 2, mid = (xa + xb) / 2;
      assert.ok(mid - half >= 0 && mid + half <= w, `${n}: label "${m.label}" fits the canvas ${w}`);
      const end = m.note ? m.y + 22 + 11 * (noteLines(m.note, Math.abs(xb - xa) - 30) - 1) : m.y + 6;
      bottom = Math.max(bottom, end);
      const next = ms2[i + 1];
      if (m.note && next) assert.ok(next.y >= end + 22, `${n}: message ${next.id} at ${next.y} clears the note above, which ends at ${end}`);
    });
    assert.ok(h >= bottom + 12 + 86, `${n}: height ${h} leaves the legend room below ${bottom}`);
  }
  // The self-message's step is kept as a note on a real message.
  assert.ok(spec(g, 'seq-turn').messages.some((m: Obj) => (m.note ?? '').includes('4. builds the client context')), 'self-message folded into a note');
}

// Schema validity and mutations.
{
  for (const n of fs.readdirSync(path.join(f.host, D, 'src'))) {
    const s = parseJson(read(f, `${D}/src/${n}`)) as Obj;
    const sch = schema(s.diagram_type === 'architecture' ? 'architecture' : 'sequence');
    assert.deepStrictEqual(validate(sch, s, refs), [], n);
  }
  const bad = spec(f, 'arch-engine');
  bad.components[0].sources = [1, 2, 3, 4].map((line) => ({ path: 'a', line }));
  assert.ok(validate(schema('architecture'), bad, refs).some((e) => e.message === 'more than 3 items'));
  const bad2 = spec(f, 'arch-engine');
  bad2.meta.repository.revision = 'abc';
  assert.ok(validate(schema('architecture'), bad2, refs).some((e) => e.message === 'does not match ^[a-fA-F0-9]{40}$'));
}

// Geometry from the layout; archify ids.
async function geometry(): Promise<void> {
  const s = spec(f, 'arch-engine');
  // The page's figures come from layoutAll over the merged model the build wrote.
  const model = parseJson(read(f, `${SITE}/model/system-model.json`)) as Model;
  const level = (await layoutAll(model)).figures.find((x) => x.key === 'level-engine');
  assert.ok(level);
  for (const n of level.nodes) {
    const id = /^[0-9]/.test(n.id) ? `n${n.id}` : n.id;
    const c = s.components.find((x: Obj) => x.id === id);
    assert.ok(c, id);
    assert.deepStrictEqual([c.pos, c.size], [[n.x, n.y], [n.w, n.h]]);
  }
  assert.ok(s.components.some((c: Obj) => c.id === 'n2fa'));
  assert.ok(s.connections.some((c: Obj) => c.to === 'n2fa'));
}

void geometry().then(rest);
function rest(): void {
// Validator.
assert.deepStrictEqual(validate({ type: 'string', format: 'email' }, 'x'), [{ pointer: '', message: 'unsupported keyword format' }]);

// Fallback pages.
{
  const arch = read(f, `${D}/arch-engine.html`);
  assert.ok(arch.includes('<svg'));
  const refsIn = [...arch.matchAll(/<(?:link|script)\b[^>]*\s(?:src|href)="([^"]*)"/g)].map((m) => m[1]).sort();
  assert.deepStrictEqual(refsIn, ['../assets/fx-tokens-1.css', '../assets/theme.css']);
  assert.ok(arch.includes('&lt;b&gt;') && !arch.includes('<b>'));
  const seq = read(f, `${D}/seq-turn.html`);
  assert.ok(seq.includes('<animate') || (seq.includes('@keyframes') && seq.includes('prefers-reduced-motion')));
}

// A sequence page numbers each step once, by the list, and page 2 goes on from the message number.
for (const [n, first] of [['seq-turn', 1], ['seq-turn-p2', 9], ['flow-first', 1]] as const) {
  const items = [...read(f, `${D}/${n}.html`).matchAll(/<li\b([^>]*)>([^<]*)/g)];
  assert.ok(items.length > 0, n);
  assert.ok(items.every((m) => !/^\s*\d+\.\s/.test(m[2] ?? '')), `${n}: no item text starts with its own number: ${items[0]?.[2]}`);
  assert.strictEqual(items[0]?.[1], ` value="${first}"`, `${n}: the first item is number ${first}`);
}

// A static diagram page applies the theme the reader picked on index.html: it reads the key the page template writes,
// and with nothing stored it sets no theme, so the system setting decides.
{
  const tpl = fs.readFileSync(path.join(__dirname, '..', 'references', 'visual', 'page-template.html'), 'utf8');
  const key = /localStorage\.setItem\("([^"]+)"/.exec(tpl)?.[1];
  assert.ok(key, 'the page template stores the theme');
  for (const n of ['arch-engine', 'seq-turn']) {
    const html = read(f, `${D}/${n}.html`);
    const code = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
    const run = (stored: Record<string, string>): Record<string, string> => {
      const attrs: Record<string, string> = {};
      const document = { documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v; } } };
      const localStorage = { getItem: (k: string) => stored[k] ?? null };
      vm.runInNewContext(code, { document, localStorage });
      return attrs;
    };
    assert.strictEqual(run({ [key]: 'dark' })['data-theme'], 'dark', `${n}: stored dark applies`);
    assert.strictEqual(run({ [key]: 'light' })['data-theme'], 'light', `${n}: stored light applies`);
    assert.strictEqual(run({})['data-theme'], undefined, `${n}: nothing stored leaves the system setting`);
  }
}

// A narrow screen keeps the diagram's 13 px text at 12 px or more: the svg never shrinks below 12/13 of its drawn
// width, and it scrolls inside its own box so the page does not scroll sideways.
for (const n of ['arch-engine', 'seq-turn']) {
  const html = read(f, `${D}/${n}.html`);
  const w = Number(/<svg\b[^>]*\swidth="(\d+)"/.exec(html)?.[1]);
  const min = Number(/<svg\b[^>]*min-inline-size:(\d+)px/.exec(html)?.[1]);
  assert.ok(min >= Math.ceil((w * 12) / 13), `${n}: svg min-inline-size ${min} keeps text at 12 px for width ${w}`);
  assert.ok(/<div class="scroll">\s*<svg\b/.test(html), `${n}: svg sits in the scroll box`);
  assert.ok(/\.scroll\{[^}]*overflow-x:auto/.test(html), `${n}: the scroll box scrolls sideways`);
  // Proof (b), 390 px: a step's file path is one long word, and unwrapped it widened the page to 619 px.
  assert.ok(/(?:^|\n)body\{[^}]*overflow-wrap:anywhere/.test(html), `${n}: long words in the steps wrap`);
}

// Pick lines.
{
  assert.deepStrictEqual(out.diagrams.find((d) => d.name === 'seq-turn'), { name: 'seq-turn', renderer: 'svg', reason: 'animated SVG, archify not installed' });
  assert.deepStrictEqual(out.diagrams.find((d) => d.name === 'arch-engine'), { name: 'arch-engine', renderer: 'svg', reason: 'static SVG, archify not installed' });
  assert.strictEqual(err, '');
}

// Rebuild leaves every diagram byte the same.
{
  const snap = (): Record<string, string> => Object.fromEntries(fs.readdirSync(path.join(f.host, D), { recursive: true, withFileTypes: false } as never).filter((n) => String(n).includes('.')).map((n) => [String(n), read(f, `${D}/${String(n)}`)]));
  const a = snap();
  build(f);
  assert.deepStrictEqual(snap(), a);
}
console.log('system-flow-diagrams.test.js: OK');
}
