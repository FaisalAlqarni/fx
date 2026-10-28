// Run: node tests/gates/visual-kit.test.js
//
// The visual kit opens offline: every file under references/visual/ loads only
// files its assets table names, names no host, and every file the table lists
// exists with the table's SHA-256. The built map is loaded in a vm context
// with no DOM to check its data validation and level navigation.
import * as assert from 'assert';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vm from 'vm';

const TABLE = 'references/visual/visual-assets.md';
const NAMESPACES = ['http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xlink', 'http://www.w3.org/1999/xhtml'];

const sha = (b: Buffer | string): string => crypto.createHash('sha256').update(b).digest('hex');

interface Row { file: string; sha: string }

function rows(root: string): Row[] {
  const out: Row[] = [];
  for (const line of fs.readFileSync(path.join(root, TABLE), 'utf8').split('\n')) {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim().replace(/^`|`$/g, ''));
    const [file, , , , , hash] = cells;
    if (cells.length === 7 && file && hash && /^[0-9a-f]{64}$/.test(hash)) out.push({ file, sha: hash });
  }
  return out;
}

function findFile(root: string, name: string): string | undefined {
  return ['references/vendor', 'references/visual'].map((d) => path.join(root, d, name)).find((p) => fs.existsSync(p));
}

export function kitErrors(root: string, files: string[]): string[] {
  const table = rows(root);
  const known = new Set(table.map((r) => r.file));
  const out: string[] = [];
  for (const r of table) {
    const p = findFile(root, r.file);
    if (!p) { out.push(`visual-assets: ${r.file} missing`); continue; }
    const got = sha(fs.readFileSync(p));
    if (got !== r.sha) out.push(`visual-assets: ${r.file} SHA-256 ${got}, table says ${r.sha}`);
  }
  for (const f of files) {
    const text = fs.readFileSync(path.join(root, f), 'utf8');
    if (/\.(html|md|css)$/.test(f)) {
      const loads = [
        ...text.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']?([^\s"'>]+)/g),
        ...text.matchAll(/<link\b[^>]*\bhref\s*=\s*["']?([^\s"'>]+)/g),
        ...text.matchAll(/@import\s+(?:url\()?["']?([^\s"')]+)/g),
        ...text.matchAll(/url\(\s*["']?([^\s"')]+)/g),
      ].map((m) => m[1] ?? '');
      for (const v of loads.filter((x) => !x.startsWith('#'))) {
        const ok = v.startsWith('../_assets/') && known.has(v.slice('../_assets/'.length));
        if (!ok) out.push(`${f}: loads ${v}, which is not in the assets table`);
      }
    }
    for (const m of text.matchAll(/https?:\/\/[^\s"'<>)\]`]+/g)) {
      if (!NAMESPACES.includes(m[0])) out.push(`${f}: names a host: ${m[0]}`);
    }
  }
  return out;
}

const repo = path.join(__dirname, '..', '..');

function tree(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-kit-'));
  for (const [rel, body] of Object.entries(files)) {
    const f = path.join(root, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, body);
  }
  return root;
}

const row = (file: string, hash: string): string => `| \`${file}\` | Lib | 1 | pkg/${file} | https://example.org | \`${hash}\` | \`LICENSE-x\` |`;
const TABLE_HEAD = '| File | Library | Version | Package path | Source URL | SHA-256 | Licence file |\n|---|---|---|---|---|---|---|\n';
const ELK = 'elkjs-0.9.3.bundled.js';
const REACT = 'react-18.3.1.production.min.js';

function kit(extra: Record<string, string> = {}, bytes = 'elk bytes'): string {
  return tree({
    [TABLE]: TABLE_HEAD + row(ELK, sha('elk bytes')) + '\n',
    [`references/vendor/${ELK}`]: bytes,
    ...extra,
  });
}

// Repository.
const dir = path.join(repo, 'references', 'visual');
const shown = fs.readdirSync(dir).sort();
assert.deepStrictEqual(shown, [
  'archify-adapter.md', 'fx-flow-1.js', 'fx-map-1.js', 'fx-map-2.js', 'fx-tokens-1.css', 'page-template.html',
  'svg-animated.md', 'svg-static.md', 'visual-assets.md', 'visual-check.md',
]);
for (const part of ['<!-- slot: NAV', '<!-- slot: DIAGRAMS']) assert.ok(fs.readFileSync(path.join(dir, 'page-template.html'), 'utf8').includes(part), `page-template.html holds ${part}`);
const REPORT = 'skills/fx-architecture/HTML-REPORT.md';
// Every lane file that writes a page is under the same load and host check.
const PAGE_LANES = [REPORT, 'skills/fx-docs/html-pages.md', 'skills/fx-audit/SKILL.md'];
assert.deepStrictEqual(kitErrors(repo, [...shown.filter((n) => n !== 'visual-assets.md').map((n) => `references/visual/${n}`), ...PAGE_LANES]), []);

// The table has a well-formed row for each vendored library and kit file, and every file in
// references/vendor/ is either a row's file or a row's licence file.
const tableText = fs.readFileSync(path.join(repo, TABLE), 'utf8');
const listed = rows(repo).map((r) => r.file).sort();
assert.deepStrictEqual(listed, [
  'elkjs-0.9.3.bundled.js', 'fx-flow-1.js', 'fx-map-1.js', 'fx-map-2.js', 'fx-tokens-1.css', 'react-18.3.1.production.min.js',
  'react-dom-18.3.1.production.min.js', 'reactflow-11.11.4.min.js', 'reactflow-11.11.4.style.css',
]);
const licences = [...tableText.matchAll(/`(LICENSE-[\w-]+)`/g)].map((m) => m[1]);
const unlisted = fs.readdirSync(path.join(repo, 'references', 'vendor')).filter((n) => !listed.includes(n) && !licences.includes(n));
assert.deepStrictEqual(unlisted, [], 'every vendored file has a row in the assets table');

// The page template keeps the theme memory, the legend and the evidence toggle, and lays
// out with logical properties only, so dir="rtl" mirrors it.
const template = fs.readFileSync(path.join(dir, 'page-template.html'), 'utf8');
for (const part of ['localStorage.setItem("fx-theme"', 'class="legend"', 'id="evtoggle"']) {
  assert.ok(template.includes(part), `page-template.html keeps ${part}`);
}
// React Flow's default edge-label background is white: under light text in dark mode the label vanishes (e2e bug 5).
assert.ok(template.includes('.react-flow__edge-textbg{fill:var(--panel)}'), 'page-template.html themes the edge-label background');
assert.deepStrictEqual(template.match(/(?<![\w-])(margin|padding|border)-(left|right)\b|(?<![\w-])(left|right)\s*:/g) ?? [], [], 'page-template.html uses logical properties');

// The architecture report and the audit's Phase 4 page start from the kit, and the audit's
// diagrams state their choice through the archify adapter.
for (const part of ['page-template.html', 'visual-assets.md']) assert.ok(fs.readFileSync(path.join(repo, REPORT), 'utf8').includes(part), `${REPORT} names ${part}`);
assert.ok(fs.readFileSync(path.join(repo, 'skills/fx-audit/SKILL.md'), 'utf8').includes('../../references/visual/archify-adapter.md'),
  'fx-audit Phase 4 points at the archify adapter');

// The architecture report loads only kit assets: an unlisted Mermaid script is caught.
const mermaid = '<script src="../_assets/mermaid-11.17.2.min.js"></script>';
assert.deepStrictEqual(
  kitErrors(kit({ [REPORT]: fs.readFileSync(path.join(repo, REPORT), 'utf8') + '\n' + mermaid }), [REPORT]),
  [`${REPORT}: loads ../_assets/mermaid-11.17.2.min.js, which is not in the assets table`],
);

// No lane text names the retired Tailwind, Mermaid or report-assets files.
function walk(d: string): string[] {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
}
const retired = /tailwindcss-play|mermaid-11|report-assets/;
const stale = ['skills', 'commands', 'references', 'agents']
  .flatMap((d) => walk(path.join(repo, d)))
  .filter((f) => /\.(md|html|json)$/.test(f) && retired.test(fs.readFileSync(f, 'utf8')))
  .map((f) => path.relative(repo, f));
assert.deepStrictEqual(stale, []);

// With Tailwind gone, the architecture report names kit tokens, never Tailwind colour names.
for (const f of ['skills/fx-architecture/SKILL.md', REPORT]) {
  const names = fs.readFileSync(path.join(repo, f), 'utf8').match(/\b(emerald|amber|slate)\b/gi) ?? [];
  assert.deepStrictEqual(names, [], `${f} names Tailwind colours`);
}

// The map-data escape rule keeps a hostile label inside the JSON block: applied as the
// page writer applies it, no `</script` survives and the data parses back unchanged.
const escape = /every `<` written as\s+`([^`]+)`/.exec(fs.readFileSync(path.join(repo, TABLE), 'utf8'))?.[1];
assert.ok(escape, `${TABLE} states how a < in map data is written`);
const hostile = { root: 'l0', levels: [{ id: 'l0', title: '</script><script>alert(1)</script>', nodes: [], edges: [] }] };
const inline = JSON.stringify(hostile).split('<').join(escape);
assert.ok(!/<\/script/i.test(inline), `map data written with ${escape} still closes its script block: ${inline}`);
assert.deepStrictEqual(JSON.parse(inline), hostile); // ts-gate-ok: the test parses data it just wrote
assert.ok(
  fs.readFileSync(path.join(dir, 'page-template.html'), 'utf8').includes(`Write every < inside the JSON as ${escape}.`),
  'page-template.html states the same map-data escape as the assets table',
);

// Every file that tells a lane to write a page from repo text says to HTML-escape that text.
const PAGE_WRITERS = ['references/visual/page-template.html', 'skills/fx-docs/html-pages.md', REPORT, 'skills/fx-audit/SKILL.md'];
const ESCAPE_RULE = 'HTML-escape `&`, `<`, `>` and `"`';
assert.deepStrictEqual(PAGE_WRITERS.filter((f) => !fs.readFileSync(path.join(repo, f), 'utf8').includes(ESCAPE_RULE)), []);

// Bad checksum.
assert.deepStrictEqual(kitErrors(kit({}, 'other bytes'), []), [
  `visual-assets: ${ELK} SHA-256 ${sha('other bytes')}, table says ${sha('elk bytes')}`,
]);

// Missing file.
assert.deepStrictEqual(
  kitErrors(tree({ [TABLE]: TABLE_HEAD + row(REACT, sha('x')) + '\n' }), []),
  [`visual-assets: ${REACT} missing`],
);

// Unlisted load.
const page = 'references/visual/page-template.html';
assert.deepStrictEqual(kitErrors(kit({ [page]: '<script src="../_assets/other.js"></script>' }), [page]), [
  `${page}: loads ../_assets/other.js, which is not in the assets table`,
]);
assert.deepStrictEqual(kitErrors(kit({ [page]: `<script src="../_assets/${ELK}"></script>` }), [page]), []);

// Host and namespace.
const svg = 'references/visual/svg-static.md';
assert.deepStrictEqual(kitErrors(kit({ [svg]: 'see https://example.com/x.svg' }), [svg]), [
  `${svg}: names a host: https://example.com/x.svg`,
]);
assert.deepStrictEqual(kitErrors(kit({ [svg]: '<svg xmlns="http://www.w3.org/2000/svg">' }), [svg]), []);

// An in-page reference is not a load.
assert.deepStrictEqual(kitErrors(kit({ [svg]: '<path marker-end="url(#a)"/>' }), [svg]), []);

// The built map, loaded with no DOM.
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(dir, 'fx-map-1.js'), 'utf8'), ctx);
interface FxMap { validateMapData(d: unknown): string[]; levelPath(d: unknown, id: string): string[] }
const fxMap = (ctx as { fxMap: FxMap }).fxMap;
const plain = (v: unknown): unknown => JSON.parse(JSON.stringify(v)); // ts-gate-ok: copies a vm-realm array into this realm

const node = (id: string, children?: string) => ({ id, label: id, kind: 'service', role: 'r', ...(children ? { children } : {}), evidence: [] });
const data = (levels: unknown[]) => ({ root: 'l0', levels });
const l0 = { id: 'l0', title: 'System', nodes: [node('api', 'l1-api'), node('db')], edges: [{ from: 'api', to: 'db', label: 'writes', evidence: [] }] };
const l1 = { id: 'l1-api', title: 'API', nodes: [node('x')], edges: [] };

assert.deepStrictEqual(plain(fxMap.validateMapData(data([l0]))), ['level l0: node api opens missing level l1-api']);
assert.deepStrictEqual(plain(fxMap.validateMapData(data([l0, l1]))), []);
assert.deepStrictEqual(
  plain(fxMap.validateMapData(data([{ ...l0, nodes: [node('api', 'l1-api')] }, l1]))),
  ['level l0: edge api -> db names a missing node'],
);
assert.deepStrictEqual(plain(fxMap.validateMapData({ root: 'zz', levels: [] })), ['root level zz missing']);
assert.deepStrictEqual(plain(fxMap.levelPath(data([l0, l1]), 'l1-api')), ['l0', 'l1-api']);

// fx-map-1.js bytes stay as released: its table row still matches (kitErrors above) and its name is not reused.
// The built map 2 and flow player, loaded with no DOM.
function load(name: string): Record<string, unknown> {
  const c = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(dir, name), 'utf8'), c);
  return c as Record<string, unknown>;
}
const map2 = load('fx-map-2.js').fxMap as FxMap;
const ctxNode = (id: string) => ({ ...node(id), primary: false, children: undefined });
const gnode = (id: string) => ({ ...node(id), primary: true });
const glevel = { id: 'l0', title: 'System', groups: [{ id: 'g', label: 'G', members: ['api', 'ghost'] }], nodes: [gnode('api')], edges: [] };
assert.deepStrictEqual(plain(map2.validateMapData(data([glevel]))), ['level l0: group g names a missing node ghost']);
const m2l0 = { id: 'l0', title: 'System', groups: [], nodes: [{ ...gnode('api'), children: 'l1-api' }, ctxNode('ext')],
  edges: [{ from: 'api', to: 'ext', label: 'calls', mode: 'async', evidence: [] }] };
const m2l1 = { id: 'l1-api', title: 'API', groups: [], nodes: [gnode('x')], edges: [] };
assert.deepStrictEqual(plain(map2.validateMapData(data([m2l0, m2l1]))), []);
assert.deepStrictEqual(plain(map2.levelPath(data([m2l0, m2l1]), 'l1-api')), ['l0', 'l1-api']);
assert.deepStrictEqual(plain(map2.validateMapData(data([{ ...m2l0, nodes: [gnode('api')] }, m2l1]))),
  ['level l0: edge api -> ext names a missing node']);

interface FxFlow { validateFigure(s: unknown): string[] }
const flow = load('fx-flow-1.js').fxFlow as FxFlow;
const fig = (over: object = {}) => ({
  key: 'seq-turn', kind: 'sequence', width: 400, height: 200, direction: 'DOWN',
  nodes: [{ id: 'a', x: 0, y: 0, w: 100, h: 40, lines: ['A'], kind: 'service', primary: true, store: false }],
  edges: [{ id: 'e1', d: 'M0 0L10 10', mode: 'sync', label: null }],
  groups: [], steps: [{ edges: ['e1'], nodes: ['a'], caption: 'a.rb:1' }], notDrawn: [], ...over,
});
assert.deepStrictEqual(plain(flow.validateFigure(fig())), []);
assert.deepStrictEqual(plain(flow.validateFigure(fig({ steps: [{ edges: ['e9'], nodes: ['a'], caption: 'c' }] }))), ['figure seq-turn: step 0 names a missing edge e9']);
assert.deepStrictEqual(plain(flow.validateFigure(fig({ steps: [{ edges: ['e1'], nodes: ['zz'], caption: 'c' }] }))), ['figure seq-turn: step 0 names a missing node zz']);
assert.deepStrictEqual(plain(flow.validateFigure(fig({ width: 900 }))), ['figure seq-turn: wider than 860 px']);

// mount with stand-ins for React, ReactDOM and React Flow, and an ELK whose layout fails:
// the canvas shows an error in place of the "Laying out" message.
interface El { type: unknown; children: unknown[] }
const textOf = (n: unknown): string => (typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('')
  : n !== null && typeof n === 'object' && 'children' in n ? textOf((n as El).children) : '');
function mountWith(layout: () => Promise<unknown>): () => string {
  const state: unknown[] = [];
  const deps: (unknown[] | undefined)[] = [];
  let slot = 0;
  let app: (() => unknown) | null = null;
  let tree: unknown = null;
  let effects: (() => void)[] = [];
  const render = (): void => {
    slot = 0;
    effects = [];
    tree = app ? app() : null;
    const run = effects;
    run.forEach((f) => f());
  };
  const React = {
    createElement: (type: unknown, _props: unknown, ...children: unknown[]): El => ({ type, children }),
    useState: (init: unknown) => {
      const i = slot++;
      if (!(i in state)) state[i] = init;
      return [state[i], (v: unknown) => { state[i] = v; render(); }];
    },
    useEffect: (f: () => void, d: unknown[]) => {
      const i = slot++;
      if (JSON.stringify(deps[i]) !== JSON.stringify(d)) { deps[i] = d; effects.push(f); }
    },
  };
  const ReactDOM = { createRoot: () => ({ render: (el: El) => { app = el.type as () => unknown; render(); } }) };
  Object.assign(ctx, { React, ReactDOM, ReactFlow: { default: 'flow', Controls: 'controls' }, ELK: class { layout = layout; } });
  (ctx as { fxMap: { mount(host: unknown, d: unknown): void } }).fxMap.mount({}, data([l0, l1]));
  return () => textOf(tree);
}
const failed = mountWith(() => Promise.reject(new Error('elk broke')));
assert.ok(failed().includes('Laying out the map.'), 'the canvas waits for the layout');
setTimeout(() => {
  assert.ok(failed().includes('The map could not be laid out: Error: elk broke'), `a failed layout shows an error: ${failed()}`);
  console.log('visual-kit: OK');
}, 0);
