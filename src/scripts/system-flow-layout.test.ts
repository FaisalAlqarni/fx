// Run: node scripts/system-flow-layout.test.js
// system-flow build lays out every inline figure under 1 crossing and 860 px, run as a process.
// Figure specs are not written to a file by this task, so the spec checks run layoutAll on the
// merged model the same build wrote (system-model.json); the report checks read layout-report.json.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from '../lib/json.js';
import { layoutAll } from '../lib/sf-layout.js';
import type { FigureSpec, LayoutLine, Model } from '../lib/sf-model.js';
import { sfFixture } from '../tests/helpers/sf-fixture.js';

type Fx = ReturnType<typeof sfFixture>;
const SITE = 'docs/system-flow';
const F = `${SITE}/model/fragments`;
const ev = [{ path: 'app/x.rb', lines: '1-4', symbol: 'Link' }];
// Measured on system-flow's scratch copy with K(3,3) added as level-3 diagram `dense`:
// `arch:dense 604x327 LR cross=1 hits=0 nodes=6 arrows=7 notDrawn=2 unlabeled=0`.
const K33_CAP = 2;

const node = (id: string, label = `Node ${id}`) => ({ id, label, kind: 'backend', look: 'service', role: `Role of ${id}`, evidence: ev });
const edge = (from: string, to: string, label = `${from} to ${to}`, extra: Record<string, unknown> = {}) => ({ from, to, label, evidence: ev, ...extra });
type Diagram = { id: string; level: number; parent?: string; title?: string; summary?: string; groups?: unknown[]; nodes: unknown[]; edges: unknown[]; layout?: unknown };
const diagram = (d: Diagram) => ({ title: d.id, summary: `The ${d.id} diagram shows its parts and links.`, groups: [], ...d });

function setup(level0: Diagram, extra: Diagram[] = []): Fx {
  const f = sfFixture();
  f.goodSet();
  f.fragment('level0', { levels: { root: 'system', diagrams: [diagram(level0)] } });
  if (extra.length) f.fragment('area', { levels: { diagrams: extra.map(diagram) } });
  f.floor();
  f.commit('host', 'model');
  return f;
}
const chain = (): Diagram => ({ id: 'system', level: 0, nodes: ['a', 'b', 'c', 'd'].map((id) => node(id)), edges: [edge('a', 'b'), edge('b', 'c'), edge('c', 'd')] });

type Built = { layout: LayoutLine[] };
const built = (f: Fx): Built => {
  const r = f.run(['build']);
  assert.strictEqual(r.status, 0, `build exits 0\n${r.stdout}${r.stderr}`);
  return parseJson(r.stdout) as Built;
};
const reportBytes = (f: Fx): string => fs.readFileSync(path.join(f.host, SITE, 'model', 'layout-report.json'), 'utf8');
const report = (f: Fx): LayoutLine[] => parseJson(reportBytes(f)) as LayoutLine[];
const entry = (f: Fx, key: string): LayoutLine => {
  const e = report(f).find((l) => l.key === key);
  assert.ok(e, `report has ${key}: ${reportBytes(f)}`);
  return e;
};
const mergedModel = (f: Fx): Model => {
  const { generated: _g, ...model } = parseJson(fs.readFileSync(path.join(f.host, SITE, 'model', 'system-model.json'), 'utf8')) as Model & { generated: boolean };
  return model;
};
async function figure(f: Fx, key: string): Promise<FigureSpec> {
  const fig = (await layoutAll(mergedModel(f))).figures.find((x) => x.key === key);
  assert.ok(fig, `figure ${key}`);
  return fig;
}
const labelOf = (fig: FigureSpec, id: string): string | undefined => fig.edges.find((e) => e.id === id)?.label?.text;

async function main(): Promise<void> {
  // Short label: the rule cut at 26 characters, or `short` when set.
  {
    const long = 'Reads the session token from the cache, then refreshes it';
    const f = setup({ id: 'system', level: 0, nodes: ['a', 'b', 'c'].map((id) => node(id)), edges: [edge('a', 'b', long), edge('b', 'c', long, { short: 'Session read' })] });
    built(f);
    const fig = await figure(f, 'level-system');
    assert.strictEqual(labelOf(fig, 'system:a>b'), 'Reads the session token');
    assert.strictEqual(labelOf(fig, 'system:b>c'), 'Session read');
  }

  // A chain of 4 nodes: one report entry beside goodSet()'s request sequence, nothing crossed or dropped.
  {
    const f = setup(chain());
    built(f);
    const r = report(f);
    assert.deepStrictEqual(r.map((l) => l.key), ['level-system', 'seq-turn'], reportBytes(f));
    const e = entry(f, 'level-system');
    assert.deepStrictEqual([e.crossings, e.notDrawn, e.nodes, e.arrows], [0, 0, 4, 3]);
    assert.ok(e.width <= 860, `width ${e.width}`);
  }

  // A planar 3 by 3 grid draws every arrow with no crossing.
  {
    const ids = [1, 2, 3].flatMap((r) => [1, 2, 3].map((c) => `n${r}${c}`));
    const edges = [];
    for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) {
      if (c < 3) edges.push(edge(`n${r}${c}`, `n${r}${c + 1}`));
      if (r < 3) edges.push(edge(`n${r}${c}`, `n${r + 1}${c}`));
    }
    const f = setup(chain(), [{ id: 'grid', level: 1, parent: 'system', nodes: ids.map((id) => node(id)), edges }]);
    built(f);
    const e = entry(f, 'level-grid');
    assert.deepStrictEqual([e.crossings, e.notDrawn, e.arrows], [0, 0, 12]);
    assert.ok(e.width <= 860, `width ${e.width}`);
  }

  // K(3,3): arrows are dropped until at most 1 crossing, no more than system-flow drops.
  {
    const edges = ['a1', 'a2', 'a3'].flatMap((a) => ['b1', 'b2', 'b3'].map((b) => edge(a, b)));
    const f = setup(chain(), [{ id: 'dense', level: 1, parent: 'system', nodes: ['a1', 'a2', 'a3', 'b1', 'b2', 'b3'].map((id) => node(id)), edges }]);
    built(f);
    const e = entry(f, 'level-dense');
    assert.ok(e.crossings <= 1, `crossings ${e.crossings}`);
    assert.strictEqual(e.arrows + e.notDrawn, 9);
    assert.ok(e.notDrawn >= 1 && e.notDrawn <= K33_CAP, `notDrawn ${e.notDrawn}`);
    const fig = await figure(f, 'level-dense');
    const all = edges.map((x) => `dense:${x.from}>${x.to}`);
    assert.strictEqual(fig.notDrawn.length, e.notDrawn);
    for (const id of fig.notDrawn) assert.ok(all.includes(id), `notDrawn ${id} is an edge id`);
    const drawn = fig.edges.map((x) => x.id);
    for (const n of ['a1', 'a2', 'a3', 'b1', 'b2', 'b3']) {
      assert.ok(drawn.some((id) => id.startsWith(`dense:${n}>`) || id.endsWith(`>${n}`)), `${n} keeps an arrow`);
    }
    // Design, Layout: step captions name the arrows the figure leaves out.
    for (const id of fig.notDrawn) {
      const [from, to] = id.slice(id.indexOf(':') + 1).split('>');
      assert.ok(fig.steps.some((s) => s.caption.includes(`to Node ${to}: ${from} to ${to} (arrow not drawn)`)), `${id} named in a step caption`);
    }
    const dense = mergedModel(f).levels.diagrams.find((d) => d.id === 'dense');
    assert.strictEqual(dense?.edges.length, 9, 'the map data keeps every edge');
  }

  // Parity with system-flow on its parser-stages diagram.
  {
    const fixture = parseJson(fs.readFileSync(path.join(__dirname, '..', 'tests', 'fixtures', 'system-flow', 'parser-stages.json'), 'utf8')) as { diagram: Diagram; systemFlowLine: LayoutLine };
    const f = setup(chain(), [fixture.diagram]);
    built(f);
    const e = entry(f, 'level-parser-stages');
    const sf = fixture.systemFlowLine;
    assert.ok(e.crossings <= sf.crossings && e.nodeHits <= sf.nodeHits && e.notDrawn <= sf.notDrawn, `${JSON.stringify(e)} vs ${JSON.stringify(sf)}`);
    assert.ok(e.width <= 860, `width ${e.width}`);
  }

  // Unfit: hints pin four degree-one pairs into two crossings; no arrow may go, since each is the last of its boxes.
  // The fifth arrow, i to j, crosses nothing and lifts the count above the 4 arrows a figure keeps at least.
  {
    const at = { a: [0, 0], b: [1, 1], c: [0, 1], d: [1, 0], e: [2, 0], f: [3, 1], g: [2, 1], h: [3, 0], i: [0, 2], j: [1, 2] };
    const layout = Object.fromEntries(Object.entries(at).map(([id, [col, row]]) => [id, { col, row }]));
    const f = setup({ id: 'system', level: 0, nodes: Object.keys(at).map((id) => node(id)), edges: [edge('a', 'b'), edge('c', 'd'), edge('e', 'f'), edge('g', 'h'), edge('i', 'j')], layout });
    const frag = (n: string): string => fs.readFileSync(path.join(f.host, F, n), 'utf8');
    const before = fs.readdirSync(path.join(f.host, F)).map((n) => [n, frag(n)]);
    const r = f.run(['build']);
    assert.strictEqual(r.status, 1, `${r.stdout}${r.stderr}`);
    assert.deepStrictEqual(fs.readdirSync(path.join(f.host, F)).map((n) => [n, frag(n)]), before);
    assert.ok(!fs.existsSync(path.join(f.host, 'docs', 'system')), 'no docs/system');
    assert.deepStrictEqual(fs.readdirSync(path.join(f.host, SITE)), ['model']);
    assert.deepStrictEqual(fs.readdirSync(path.join(f.host, SITE, 'model')), ['fragments']);
    const lines = r.stderr.split('\n').filter(Boolean);
    const prefix = 'docs/system-flow/model/fragments/level0.json:/levels/diagrams/0: figure level-system cannot meet 1 crossing and 860 px: level-system ';
    const hit = lines.filter((l) => l.startsWith(prefix));
    assert.strictEqual(hit.length, 1, r.stderr);
    const crossings = Number(/ crossings=([0-9.]+) /.exec(hit[0] ?? '')?.[1]);
    assert.ok(crossings >= 2, hit[0]);
  }

  // check --fragment lays out the fragment's own figures, so an area agent sees an unfit figure before it returns.
  {
    const at = { a: [0, 0], b: [1, 1], c: [0, 1], d: [1, 0], e: [2, 0], f: [3, 1], g: [2, 1], h: [3, 0], i: [0, 2], j: [1, 2] };
    const layout = Object.fromEntries(Object.entries(at).map(([id, [col, row]]) => [id, { col, row }]));
    const w = (id: string): string => `w${id}`;
    const wide = { id: 'wide', level: 1, parent: 'system', nodes: Object.keys(at).map((id) => node(w(id))), edges: [edge(w('a'), w('b')), edge(w('c'), w('d')), edge(w('e'), w('f')), edge(w('g'), w('h')), edge(w('i'), w('j'))], layout: Object.fromEntries(Object.entries(layout).map(([id, v]) => [w(id), v])) };
    const f = setup(chain(), [wide]);
    const r = f.run(['check', '--fragment', `${F}/area.json`]);
    assert.strictEqual(r.status, 1, `${r.stdout}${r.stderr}`);
    assert.match(r.stderr, /^docs\/system-flow\/model\/fragments\/area\.json:\/levels\/diagrams\/0: figure level-wide cannot meet 1 crossing and 860 px: level-wide .*; split it one level down$/m);
    assert.strictEqual(f.run(['check', '--fragment', `${F}/level0.json`]).status, 0, 'another fragment does not answer for it');
  }

  // A hinted diagram draws a self-loop as a finite path that leaves and re-enters its own box.
  {
    const layout = { a: { col: 0, row: 0 }, b: { col: 1, row: 0 } };
    const f = setup({ id: 'system', level: 0, nodes: [node('a'), node('b')], edges: [edge('a', 'b'), edge('a', 'a', 'retries')], layout });
    built(f);
    const fig = await figure(f, 'level-system');
    const loop = fig.edges.find((x) => x.id === 'system:a>a');
    assert.ok(loop && !loop.d.includes('NaN'), JSON.stringify(loop));
    const box = fig.nodes.find((n) => n.id === 'a');
    const pts = [...(loop?.d ?? '').matchAll(/(-?[0-9.]+),(-?[0-9.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    assert.ok(box && pts.some(([x, y]) => (x ?? 0) > box.x + box.w || (y ?? 0) < box.y), `loop leaves box a: ${loop?.d}`);
  }

  // Sequence: messages between the same pair fold into one arrow labelled with both step numbers.
  // goodSet() holds sequence turn, so this one is trip.
  {
    const f = setup(chain());
    f.fragment('flows', {
      sequences: [{
        id: 'trip', title: 'Trip', chapter: 's1', summary: 'The api reads the link and the token in turn.',
        participants: ['api', 'db', 'cache'].map((id) => ({ id, label: id.toUpperCase(), look: 'service', evidence: ev })),
        messages: [
          { n: 1, from: 'api', to: 'db', label: 'Reads link', evidence: ev },
          { n: 2, from: 'api', to: 'cache', label: 'Reads token', evidence: ev },
          { n: 3, from: 'db', to: 'api', label: 'Returns row', evidence: [{ path: 'app/x.rb', lines: '4', symbol: 'expired?' }] },
          { n: 4, from: 'cache', to: 'db', label: 'Warms', evidence: ev },
        ],
      }],
    });
    f.commit('host', 'sequence');
    built(f);
    const fig = await figure(f, 'seq-trip');
    assert.deepStrictEqual([fig.nodes.length, fig.edges.length, fig.steps.length], [3, 3, 4]);
    assert.ok(fig.edges.some((x) => x.label?.text === '1, 3'), JSON.stringify(fig.edges.map((x) => x.label?.text)));
    assert.ok(fig.steps[2]?.caption.includes('app/x.rb:4'), fig.steps[2]?.caption);
  }

  // Store flow: the actor and its stores, one arrow per actor and store, labelled by operation.
  {
    const f = setup({ id: 'system', level: 0, nodes: [node('api'), node('db')], edges: [edge('api', 'db')] });
    f.fragment('flows', {
      storeFlows: [{
        id: 'first', trigger: 'A link is opened', chapter: 's1', summary: 'The api writes two rows and reads one token.',
        steps: [
          { n: 1, actor: 'api', op: 'write', store: 'sql', key: 'links', evidence: ev },
          { n: 2, actor: 'api', op: 'write', store: 'sql', key: 'clicks', evidence: ev },
          { n: 3, actor: 'api', op: 'read', store: 'cache', key: 'token', evidence: ev },
        ],
      }],
    });
    f.commit('host', 'flow');
    built(f);
    const fig = await figure(f, 'flow-first');
    assert.deepStrictEqual(fig.nodes.map((n) => [n.id, n.store]), [['api', false], ['sql', true], ['cache', true]]);
    assert.deepStrictEqual(fig.edges.map((x) => x.label?.text).sort(), ['read', 'write']);
  }

  // Groups: level 0 groups become ELK compound nodes that hold their members.
  {
    const f = setup({
      id: 'system', level: 0, nodes: ['a', 'b', 'c', 'd'].map((id) => node(id)), edges: [edge('a', 'b'), edge('b', 'c'), edge('c', 'd')],
      groups: [{ id: 'g1', label: 'Group one', members: ['a', 'b'], evidence: ev }, { id: 'g2', label: 'Group two', members: ['c'], evidence: ev }],
    });
    built(f);
    const fig = await figure(f, 'level-system');
    assert.strictEqual(fig.groups.length, 2);
    const inside = (n: string, g: string): boolean => {
      const b = fig.nodes.find((x) => x.id === n), r = fig.groups.find((x) => x.id === g);
      return !!b && !!r && b.x >= r.x && b.y >= r.y && b.x + b.w <= r.x + r.w && b.y + b.h <= r.y + r.h;
    };
    assert.ok(inside('a', 'g1') && inside('b', 'g1') && inside('c', 'g2'), JSON.stringify(fig));
  }

  // stdout: BuildResult.layout equals layout-report.json; two builds of one model give the same bytes.
  {
    const f = setup(chain(), [{ id: 'grid2', level: 1, parent: 'system', nodes: ['p', 'q'].map((id) => node(id)), edges: [edge('p', 'q')] }]);
    const out = built(f);
    assert.strictEqual(out.layout.length, 3);
    assert.deepStrictEqual(out.layout, report(f));
    const g = setup(chain(), [{ id: 'grid2', level: 1, parent: 'system', nodes: ['p', 'q'].map((id) => node(id)), edges: [edge('p', 'q')] }]);
    built(g);
    assert.strictEqual(reportBytes(g), reportBytes(f));
  }

  console.log('system-flow-layout.test.js: OK');
}

main().catch((e: Error) => { console.error(e.stack ?? e.message); process.exit(1); });
