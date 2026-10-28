// Run: node scripts/system-flow-diagrams.test.js
// system-flow build writes the deep diagrams, archify specs and the SVG fallback pages, run as a process.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
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
  f.fxJson({});
  f.fragment('meta', { schemaVersion: 1, meta: { roots: [{ id: 'backend' }, { id: 'guide' }] } });
  f.fxJson({ system_flow: { roots: { guide: '../guide' } } });
  const nodes = (extra: Obj[] = []): Obj[] => [
    { id: 'api', label: '<b>', kind: 'backend', role: 'Takes calls', evidence: [
      { path: 'app/api.rb', lines: '10-42', symbol: 'Api#call' }, { path: 'app/api.rb', lines: '50', symbol: 'Api#log' },
      { path: 'app/api.rb', lines: '51', symbol: LONG }, { path: 'app/y.rb', lines: '1', symbol: 'Y' }] },
    { id: 'db', label: 'Database', kind: 'database', role: 'Stores rows', evidence: ev('app/y.rb', '1-2', 'Y') },
    { id: '2fa', label: 'Second factor', kind: 'security', role: 'Checks codes', evidence: ev('app/x.rb', '4', 'expired?') },
    ...extra,
  ];
  f.fragment('level0', { levels: { root: 'system', diagrams: [
    { id: 'system', level: 0, title: 'System', summary: 'All.', groups: [], nodes: [
      { id: 'engine', label: 'Engine', kind: 'backend', role: 'Runs', children: 'engine', evidence: ev('app/x.rb', '1-4', 'Link') },
      { id: 'store', label: 'Store', kind: 'database', role: 'Keeps', evidence: ev('app/y.rb', '1', 'Y') }],
      edges: [{ from: 'engine', to: 'store', label: 'writes', evidence: ev('app/y.rb', '1', 'Y') }] },
    { id: 'engine', level: 1, parent: 'system', title: 'Engine', summary: 'The engine.', groups: [], nodes: nodes(),
      edges: [{ from: 'api', to: 'db', label: 'reads', evidence: ev('app/y.rb', '1-2', 'Y') }, { from: 'api', to: '2fa', label: 'checks', evidence: ev('app/x.rb', '4', 'expired?') }] },
  ] } });
  f.fragment('chapters', { sections: [{ id: 's1', title: 'Links', question: 'Where do links expire?', diagrams: ['system', 'engine'], bullets: [{ id: 'b1', text: 'x', evidence: ev('app/x.rb', '4', 'expired?') }] }] });
  const msgs = Array.from({ length: 14 }, (_, i) => ({ n: i + 1, from: i % 2 ? 'db' : 'api', to: i % 2 ? 'api' : 'db', label: `Step ${i + 1}`, evidence: i === 13 ? ev('app/x.rb', '4', 'expired?') : ev('app/y.rb', '1', 'Y') }));
  f.fragment('flows', {
    sequences: [{ id: 'turn', title: 'Turn', chapter: 's1',
      participants: [{ id: 'api', label: 'API', evidence: ev('app/x.rb', '1', 'Link') }, { id: 'db', label: 'DB', evidence: ev('app/y.rb', '1', 'Y') }, { id: 'aux', label: 'Aux', evidence: ev('app/y.rb', '1', 'Y') }],
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
  assert.deepStrictEqual(s.meta.repository, { url: 'backend', revision: head, link_mode: 'local-only' });
  assert.strictEqual(s.meta.quality_profile, 'showcase');
  assert.strictEqual(s.meta.output, 'arch-engine.html');
  for (const n of fs.readdirSync(path.join(f.host, D, 'src'))) assert.ok(!read(f, `${D}/src/${n}`).includes(f.base), n);
  f.git('host', 'remote', 'add', 'origin', 'https://user:token@example.com/acme/app.git');
  build(f);
  assert.strictEqual(spec(f, 'arch-engine').meta.repository.url, 'https://example.com/acme/app.git');
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
  assert.deepStrictEqual(s.meta.viewBox, [Math.max(320, level.width), Math.max(240, level.height)]);
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
