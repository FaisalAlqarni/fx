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
  'archify-adapter.md', 'fx-map-1.js', 'fx-tokens-1.css', 'page-template.html',
  'svg-animated.md', 'svg-static.md', 'visual-assets.md', 'visual-check.md',
]);
const REPORT = 'skills/fx-architecture/HTML-REPORT.md';
assert.deepStrictEqual(kitErrors(repo, [...shown.filter((n) => n !== 'visual-assets.md').map((n) => `references/visual/${n}`), REPORT]), []);

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

console.log('visual-kit: OK');
