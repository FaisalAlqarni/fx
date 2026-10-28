// Run: node scripts/system-flow-archify.test.js
// system-flow build runs a fake archify per deep diagram: the call, the retry, the theme block,
// the saved choices and the lookup order, all through the CLI as a process.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from '../lib/json.js';
import { applyThemeBlock, outsideRefs } from '../lib/sf-diagrams.js';
import { SLOTS } from '../lib/sf-theme.js';
import type { Theme } from '../lib/sf-theme.js';
import { sfFixture } from '../tests/helpers/sf-fixture.js';

type Fx = ReturnType<typeof sfFixture>;
type Obj = Record<string, any>; // ts-gate-ok: JSON is walked by key in assertions
type Diag = { name: string; renderer: string; reason: string };
const SITE = 'docs/system-flow';
const D = `${SITE}/diagrams`;
const ev = (p: string, lines: string, symbol: string) => [{ path: p, lines, symbol }];

// The fake: records each call (arguments, message count, start and end) and fails by env settings.
const FAKE = `import fs from 'node:fs';
import path from 'node:path';
const a = process.argv.slice(2);
const [, type, specPath, out] = a;
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8')); // ts-gate-ok: plain JS inside the fake
const name = path.basename(out, '.html');
// The monotonic clock, shared by every process on the machine; the wall clock can step back under WSL.
const now = () => Number(process.hrtime.bigint() / 1000000n);
const start = now();
await new Promise((r) => setTimeout(r, Number(process.env.FAKE_SLEEP_MS || 0)));
const fails = (process.env.FAKE_FAIL || '').split(',').filter(Boolean);
const max = Number(process.env.FAKE_MAX_MSGS || 1e9);
const messages = (spec.messages || []).length;
// archify's browser-check refuses to replace evidence written for other page bytes (viewer/evidence-path-conflict),
// and the build rewrites every page with its theme block, so a leftover evidence file always mismatches.
const evidence = path.join(path.dirname(out), name + '.browser-check.json');
const conflict = process.env.FAKE_EVIDENCE === '1' && fs.existsSync(evidence);
const bad = conflict || fails.some((n) => name === n || name.startsWith(n + '-p')) || (type === 'sequence' && messages > max);
// archify leaves a pending marker beside a page whose delivery it did not finish.
fs.writeFileSync(path.join(path.dirname(out), name + '.delivery-pending.json'), '{}');
// archify runs its own stages with inherited stdio, so a hung stage holds the build's pipes open after archify dies.
if (process.env.FAKE_HANG_CHILD === name) (await import('node:child_process')).spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)'], { stdio: 'inherit' });
if (process.env.FAKE_HANG === name || process.env.FAKE_HANG_CHILD === name) await new Promise((r) => setTimeout(r, 60000));
const receipt = a[a.indexOf('--receipt') + 1];
fs.mkdirSync(path.dirname(receipt), { recursive: true });
if (process.env.FAKE_NORECEIPT !== name) fs.writeFileSync(receipt, JSON.stringify({ name, ok: !bad }));
if (bad && process.env.FAKE_NOISY === '1') {
  process.stdout.write(JSON.stringify({ ok: false, code: 'geometry/edge-through-node' }) + '\\n');
  for (let i = 1; i <= 25; i++) process.stderr.write('err ' + i + '\\n');
}
if (!bad) fs.writeFileSync(out, '<!doctype html><html><head><style>:root{--bg:#000}</style></head><body><a href="#top">top</a><a class="diagram-guide-credit" href="https://github.com/tt-a1i/archify">archify</a><img src="data:image/png;base64,AA">' + (process.env.FAKE_LEAK === name ? '<script src="https://cdn.example/x.js"></script>' : '') + name + '</body></html>');
if (!bad && process.env.FAKE_EVIDENCE === '1') fs.writeFileSync(evidence, '{}');
fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ args: a, name, messages, start, end: now() }) + '\\n');
process.exit(bad ? 1 : 0);
`;

function fake(f: Fx, dir: string): string {
  const abs = path.isAbsolute(dir) ? dir : path.join(f.base, dir);
  fs.mkdirSync(path.join(abs, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(abs, 'bin', 'archify.mjs'), FAKE);
  fs.writeFileSync(path.join(abs, 'skill-release.json'), '{"version": "0.0.0-fake"}\n');
  return abs;
}

function setup(extraSeqs = 0): Fx {
  const f = sfFixture();
  f.fxJson({});
  f.fragment('meta', { schemaVersion: 1, meta: { roots: [{ id: 'backend' }] } });
  const nodes = [
    { id: 'api', label: 'API', kind: 'backend', role: 'Takes calls', evidence: ev('app/x.rb', '1-4', 'Link') },
    { id: 'db', label: 'Database', kind: 'database', role: 'Stores rows', evidence: ev('app/y.rb', '1-2', 'Y') },
  ];
  f.fragment('level0', { levels: { root: 'system', diagrams: [
    { id: 'system', level: 0, title: 'System', summary: 'All.', groups: [], nodes: [
      { id: 'engine', label: 'Engine', kind: 'backend', role: 'Runs', children: 'engine', evidence: ev('app/x.rb', '1-4', 'Link') },
      { id: 'store', label: 'Store', kind: 'database', role: 'Keeps', evidence: ev('app/y.rb', '1', 'Y') }],
      edges: [{ from: 'engine', to: 'store', label: 'writes', evidence: ev('app/y.rb', '1', 'Y') }] },
    { id: 'engine', level: 1, parent: 'system', title: 'Engine', summary: 'The engine.', groups: [], nodes,
      edges: [{ from: 'api', to: 'db', label: 'reads', evidence: ev('app/y.rb', '1-2', 'Y') }] },
  ] } });
  f.fragment('chapters', { sections: [{ id: 's1', title: 'Links', question: 'Where?', diagrams: ['system', 'engine'], bullets: [{ id: 'b1', text: 'x', evidence: ev('app/x.rb', '4', 'expired?') }] }] });
  const parts = [{ id: 'api', label: 'API', evidence: ev('app/x.rb', '1', 'Link') }, { id: 'db', label: 'DB', evidence: ev('app/y.rb', '1', 'Y') }];
  const seq = (id: string, n: number) => ({ id, title: id, chapter: 's1', participants: parts,
    messages: Array.from({ length: n }, (_, i) => ({ n: i + 1, from: i % 2 ? 'db' : 'api', to: i % 2 ? 'api' : 'db', label: `Step ${i + 1}`, evidence: ev('app/y.rb', '1', 'Y') })) });
  f.fragment('flows', {
    sequences: [seq('turn', 14), ...Array.from({ length: extraSeqs }, (_, i) => seq(`x${i}`, 2))],
    stores: { sql: [{ id: 'links-table', table: 'links', evidence: ev('app/y.rb', '1', 'Y') }] },
    storeFlows: [{ id: 'first', trigger: 'A link is opened', chapter: 's1', steps: Array.from({ length: 7 }, (_, i) => ({ n: i + 1, actor: 'api', op: i % 2 ? 'write' : 'read', store: 'sql', key: 'links:{id}', evidence: ev('app/x.rb', '4', 'expired?') })) }],
  });
  return f;
}

const logOf = (f: Fx) => (fs.existsSync(path.join(f.base, 'calls.log')) ? fs.readFileSync(path.join(f.base, 'calls.log'), 'utf8').trim().split('\n').filter(Boolean).map((l) => parseJson(l) as Obj) : []);
const run = (f: Fx, args: string[], env: Record<string, string> = {}) => f.run(['build', ...args], { FAKE_LOG: path.join(f.base, 'calls.log'), ...env });
const ok = (f: Fx, args: string[], env: Record<string, string> = {}): { diagrams: Diag[] } => {
  const r = run(f, args, env);
  assert.strictEqual(r.status, 0, `build ${args.join(' ')}\n${r.stdout}${r.stderr}`);
  return parseJson(r.stdout) as { diagrams: Diag[] };
};
const read = (f: Fx, rel: string): string => fs.readFileSync(path.join(f.host, rel), 'utf8');
const fxDoc = (f: Fx): Obj => parseJson(read(f, '.fx.json')) as Obj;
const reason = (o: { diagrams: Diag[] }, name: string): Diag => o.diagrams.find((d) => d.name === name) as Diag;

{ // Calls
  const f = setup();
  const a = fake(f, 'fake');
  ok(f, ['--archify', a]);
  const calls = logOf(f);
  assert.deepStrictEqual(calls.map((c) => c.name).sort(), ['arch-engine', 'arch-system', 'flow-first', 'seq-turn', 'seq-turn-p2']);
  for (const c of calls) {
    const type = c.name.startsWith('arch-') ? 'architecture' : 'sequence';
    assert.deepStrictEqual(c.args, ['finalize', type, path.join(f.host, D, 'src', `${c.name}.json`), path.join(f.host, D, `${c.name}.html`),
      '--repo-root', f.host, '--quality', 'showcase', '--receipt', path.join(f.host, D, `${c.name}.receipt.json`), '--json'], c.name);
  }
  assert.deepStrictEqual(fs.readdirSync(path.join(f.host, D)).filter((n) => n.endsWith('.delivery-pending.json')), [], 'no pending marker outlives the build (A22)');
}

{ // A second build keeps archify: it clears the browser-check evidence of the pages it rewrote with the theme block
  const f = setup();
  const a = fake(f, 'fake');
  const first = ok(f, ['--archify', a], { FAKE_EVIDENCE: '1' });
  assert.ok(first.diagrams.every((d) => d.renderer === 'archify'), JSON.stringify(first.diagrams));
  const again = ok(f, ['--archify', a], { FAKE_EVIDENCE: '1' });
  assert.ok(again.diagrams.every((d) => d.renderer === 'archify'), JSON.stringify(again.diagrams));
}

{ // One at a time: archify's delivery lock rejects a second finalize in the same folder
  const f = setup(4);
  const a = fake(f, 'fake');
  ok(f, ['--archify', a], { FAKE_SLEEP_MS: '200' });
  const calls = logOf(f);
  assert.strictEqual(calls.length, 9);
  const overlap = Math.max(...calls.map((c) => calls.filter((o) => o.start < c.end && c.start < o.end).length));
  assert.strictEqual(overlap, 1, `overlap ${overlap}`);
}

const theme = (ink: string, accent: string): Theme => {
  const v = (k: string) => Object.fromEntries(SLOTS.map((s) => [s, s === '--ink' ? ink : s === '--accent' ? accent : '#abcdef']));
  return { source: 't', kind: 'fx', light: v('l'), dark: v('d'), fonts: { text: null, code: null }, fallbacks: [] };
};
const BEGIN = '/* fx-theme:begin */', END = '/* fx-theme:end */';
const varOf = (css: string, name: string): string[] => [...css.matchAll(new RegExp(`${name}:\\s*([^;]+);`, 'g'))].map((m) => m[1] as string);

{ // Theme block: one per output, archify's --text is the theme's --ink in both themes, replaced on a second apply
  const f = setup();
  ok(f, ['--archify', fake(f, 'fake')]);
  const css = read(f, `${SITE}/assets/theme.css`);
  const inkLight = (/:root \{[^}]*--ink: ([^;]+);/.exec(css) as RegExpExecArray)[1];
  const inkDark = (/:root\[data-theme="dark"\] \{[^}]*--ink: ([^;]+);/.exec(css) as RegExpExecArray)[1];
  assert.notStrictEqual(inkLight, inkDark);
  for (const n of ['arch-system', 'arch-engine', 'seq-turn', 'seq-turn-p2', 'flow-first']) {
    const html = read(f, `${D}/${n}.html`);
    assert.strictEqual(html.split(BEGIN).length, 2, n);
    assert.strictEqual(html.split(END).length, 2, n);
    const body = html.slice(html.indexOf(BEGIN), html.indexOf(END));
    assert.deepStrictEqual(varOf(body, '--text'), [inkLight, inkDark, inkDark], n);
    assert.ok(html.indexOf('--bg:#000') < html.indexOf(BEGIN), 'block comes after archify\'s own variables');
  }
  const once = applyThemeBlock(read(f, `${D}/seq-turn.html`), theme('#111111', '#222222'));
  const twice = applyThemeBlock(once, theme('#333333', '#444444'));
  assert.strictEqual(twice.split(BEGIN).length, 2);
  assert.deepStrictEqual(varOf(twice, '--text'), ['#333333', '#333333', '#333333']);
  assert.ok(!twice.includes('#111111'));
  assert.strictEqual(applyThemeBlock('<p>no style</p>', theme('#111111', '#222222')).split(BEGIN).length, 2);
}

{ // Retry then pass
  const f = setup();
  const o = ok(f, ['--archify', fake(f, 'fake')], { FAKE_MAX_MSGS: '5' });
  assert.deepStrictEqual(logOf(f).filter((c) => c.name.startsWith('seq-turn')).map((c) => `${c.name}:${c.messages}`).sort(),
    ['seq-turn-p2:6', 'seq-turn-p2:5', 'seq-turn-p3:4', 'seq-turn:5', 'seq-turn:8'].sort());
  assert.deepStrictEqual(reason(o, 'seq-turn'), { name: 'seq-turn', renderer: 'archify', reason: 'archify sequence, 14 messages in 3 pages, retried at 5 per page' });
  assert.ok(fs.existsSync(path.join(f.host, D, 'seq-turn-p3.html')));
}

{ // Retry then fallback
  const f = setup();
  const o = ok(f, ['--archify', fake(f, 'fake')], { FAKE_FAIL: 'flow-first' });
  assert.deepStrictEqual(logOf(f).filter((c) => c.name.startsWith('flow-first')).map((c) => `${c.name}:${c.messages}`).sort(),
    ['flow-first-p2:2', 'flow-first:5', 'flow-first:7']);
  assert.ok(read(f, `${D}/flow-first.html`).includes('<svg'));
  assert.deepStrictEqual(reason(o, 'flow-first'), { name: 'flow-first', renderer: 'svg', reason: `animated SVG, archify failed: ${D}/flow-first-p2.retry.receipt.json` });
}

{ // A failed retry: no page or spec of the diagram outlives the fallback, and each attempt keeps its own receipt
  const f = setup();
  // Files that only look like the diagram's: the cleanup takes <name>, <name>-p<digits> and nothing else.
  const hand = [`${D}/seq-turn-notes.html`, `${D}/seq-turn-p2x.html`, `${D}/seq-turn-p.html`, `${D}/src/seq-turn.extra.json`];
  for (const h of hand) { fs.mkdirSync(path.dirname(path.join(f.host, h)), { recursive: true }); fs.writeFileSync(path.join(f.host, h), 'hand'); }
  const o = ok(f, ['--archify', fake(f, 'fake')], { FAKE_FAIL: 'seq-turn-p2' });
  for (const h of hand) assert.strictEqual(read(f, h), 'hand', h);
  for (const h of hand) fs.renameSync(path.join(f.host, h), path.join(f.base, path.basename(h)));
  assert.deepStrictEqual(logOf(f).filter((c) => c.name.startsWith('seq-turn')).map((c) => `${c.name}:${c.messages}`).sort(),
    ['seq-turn-p2:5', 'seq-turn-p2:6', 'seq-turn-p3:4', 'seq-turn:5', 'seq-turn:8']);
  const mine = (dir: string, end: string): string[] => fs.readdirSync(path.join(f.host, dir)).filter((n) => n.startsWith('seq-turn') && n.endsWith(end)).sort();
  assert.deepStrictEqual(mine(D, '.html'), ['seq-turn-p2.html', 'seq-turn.html']);
  for (const n of mine(D, '.html')) assert.ok(read(f, `${D}/${n}`).includes('<svg'), n);
  assert.deepStrictEqual(mine(`${D}/src`, '.json'), ['seq-turn-p2.json', 'seq-turn.json']);
  assert.deepStrictEqual(mine(D, '.receipt.json'), ['seq-turn-p2.receipt.json', 'seq-turn-p2.retry.receipt.json', 'seq-turn-p3.retry.receipt.json', 'seq-turn.receipt.json', 'seq-turn.retry.receipt.json']);
  assert.deepStrictEqual(reason(o, 'seq-turn'), { name: 'seq-turn', renderer: 'svg', reason: `animated SVG, archify failed: ${D}/seq-turn-p2.retry.receipt.json` });
}

{ // Design, Global Constraints: pages load only files under the site; a page with an outside src or href falls back to SVG
  const f = setup();
  const o = ok(f, ['--archify', fake(f, 'fake')], { FAKE_LEAK: 'arch-engine' });
  assert.ok(read(f, `${D}/arch-engine.html`).includes('<svg'));
  assert.deepStrictEqual(reason(o, 'arch-engine'), { name: 'arch-engine', renderer: 'svg', reason: 'static SVG, archify page loads outside the site: https://cdn.example/x.js' });
  for (const n of ['arch-system', 'seq-turn', 'seq-turn-p2', 'flow-first']) {
    assert.strictEqual(reason(o, n).renderer, 'archify', n);
    assert.deepStrictEqual(outsideRefs(read(f, `${D}/${n}.html`)), [], n);
  }
  // A link is not a load: anchors stay. Loads leave the site by a scheme, //, a root path, or ../ above the site from diagrams/.
  const page = '<a href="//x.io/a"></a><a href="https://github.com/tt-a1i/archify">c</a><link rel="stylesheet" href=\'http://y\'>'
    + '<img src="assets/a.png"><img src="data:image/png;base64,AA"><img srcset="a.png 1x, https://z.io/b.png 2x"><script src="../../up.js"></script>'
    + '<link rel="stylesheet" href="../assets/ok.css"><img src="/root.png">'
    + '<style>@import "https://i.io/x.css"; @import url(../../w.css); .a{background:url(https://u.io/p.png)} .b{background:url("data:image/png;base64,AA")} .c{background:url(\'../assets/k.png\')}</style>';
  assert.deepStrictEqual(outsideRefs(page).sort(), ['../../up.js', '../../w.css', '/root.png', 'http://y', 'https://i.io/x.css', 'https://u.io/p.png', 'https://z.io/b.png']);
}

{ // No retry for architecture
  const f = setup();
  const o = ok(f, ['--archify', fake(f, 'fake')], { FAKE_FAIL: 'arch-engine' });
  assert.strictEqual(logOf(f).filter((c) => c.name === 'arch-engine').length, 1);
  assert.ok(read(f, `${D}/arch-engine.html`).includes('<svg'));
  assert.deepStrictEqual(reason(o, 'arch-engine'), { name: 'arch-engine', renderer: 'svg', reason: `static SVG, archify failed: ${D}/arch-engine.receipt.json` });
}

{ // A hung archify call is killed at the timeout and that diagram falls back with the reason
  const f = setup();
  const o = ok(f, ['--archify', fake(f, 'fake'), '--archify-timeout', '1'], { FAKE_HANG: 'arch-engine' });
  assert.deepStrictEqual(reason(o, 'arch-engine'), { name: 'arch-engine', renderer: 'svg', reason: 'static SVG, archify timed out after 1 s' });
  assert.strictEqual(reason(o, 'arch-system').renderer, 'archify');
}

{ // The timeout kills archify's whole process group: a stage holding the inherited streams does not stall the build
  const f = setup();
  const t0 = Date.now();
  const o = ok(f, ['--archify', fake(f, 'fake'), '--archify-timeout', '2'], { FAKE_HANG_CHILD: 'arch-engine' });
  const elapsed = (Date.now() - t0) / 1000;
  assert.strictEqual(reason(o, 'arch-engine').reason, 'static SVG, archify timed out after 2 s');
  assert.ok(elapsed < 15, `the build returned ${elapsed} s after a 2 s timeout; a 30 s stage outlived the kill`);
}

{ // A failure keeps archify's --json result and the last 20 lines of its stderr; a missing receipt says so
  const f = setup();
  const o = ok(f, ['--archify', fake(f, 'fake')], { FAKE_FAIL: 'arch-engine', FAKE_NOISY: '1', FAKE_NORECEIPT: 'arch-engine' });
  const tail = Array.from({ length: 20 }, (_, i) => `err ${i + 6}`).join(' | ');
  assert.strictEqual(reason(o, 'arch-engine').reason, `static SVG, archify failed: no receipt; result: {"ok":false,"code":"geometry/edge-through-node"}; stderr: ${tail}`);
}

{ // Page limit
  const f = setup();
  ok(f, ['--archify', fake(f, 'fake'), '--page-limit', 'seq-turn=5']);
  assert.deepStrictEqual(logOf(f).filter((c) => c.name.startsWith('seq-turn')).map((c) => `${c.name}:${c.messages}`).sort(), ['seq-turn-p2:5', 'seq-turn-p3:4', 'seq-turn:5']);
}

{ // Forced SVG
  const f = setup();
  const o = ok(f, ['--archify', fake(f, 'fake'), '--svg', 'seq-turn']);
  assert.deepStrictEqual(logOf(f).map((c) => c.name).filter((n) => n.startsWith('seq-turn')), []);
  assert.strictEqual(reason(o, 'seq-turn').reason, 'animated SVG, owner or lane chose SVG');
  assert.strictEqual(reason(o, 'seq-turn-p2').reason, 'animated SVG, owner or lane chose SVG');
}

{ // Persisted, then a flagless rebuild keeps the renderers
  const f = setup();
  f.fxJson({ keep: 1, system_flow: { output: { site: SITE, markdown: 'docs/system' } } });
  const first = ok(f, ['--archify', fake(f, 'fake'), '--page-limit', 'seq-turn=5', '--svg', 'arch-engine']);
  const doc = fxDoc(f);
  assert.deepStrictEqual(doc.system_flow.diagrams, { pageLimits: { 'seq-turn': 5 }, svg: ['arch-engine'] });
  assert.strictEqual(doc.keep, 1);
  assert.deepStrictEqual(doc.system_flow.output, { site: SITE, markdown: 'docs/system' });
  assert.ok(!read(f, '.fx.json').includes(f.base), 'no absolute path in .fx.json');
  const names = ['seq-turn', 'seq-turn-p2', 'seq-turn-p3', 'arch-engine'];
  const bytes = () => names.map((n) => read(f, `${D}/${n}.html`));
  const before = bytes();
  fake(f, path.join(f.home, '.claude', 'skills', 'archify'));
  const second = ok(f, []);
  assert.deepStrictEqual(second.diagrams, first.diagrams);
  assert.strictEqual(reason(second, 'seq-turn').reason, 'archify sequence, 14 messages in 3 pages');
  assert.strictEqual(reason(second, 'arch-engine').reason, 'static SVG, owner or lane chose SVG');
  assert.deepStrictEqual(bytes(), before);
  ok(f, ['--page-limit', 'seq-turn=5', '--svg', 'arch-engine']);
  assert.deepStrictEqual(fxDoc(f).system_flow.diagrams, { pageLimits: { 'seq-turn': 5 }, svg: ['arch-engine'] });
}

{ // A failed build saves nothing
  const f = setup();
  fake(f, path.join(f.home, '.claude', 'skills', 'archify'));
  f.fragment('bad', { sections: [{ id: 's1', title: 'dup', question: 'q' }] });
  assert.strictEqual(run(f, ['--svg', 'arch-engine']).status, 1);
  assert.strictEqual(fxDoc(f).system_flow?.diagrams, undefined);
}

const detectOf = (f: Fx, env: Record<string, string> = {}): Obj => parseJson(f.run(['detect'], env).stdout) as Obj;

{ // Lookup order
  const f = setup();
  assert.strictEqual(detectOf(f).archify, null);
  fs.mkdirSync(path.join(f.base, 'empty-cfg', 'skills', 'archify'), { recursive: true }); // no bin/archify.mjs
  assert.strictEqual(detectOf(f, { CLAUDE_CONFIG_DIR: path.join(f.base, 'empty-cfg') }).archify, null);
  // A repo file is never run: .fx.json cannot name an archify folder (final fix A3).
  fake(f, path.join(f.host, 'tools', 'archify'));
  f.fxJson({ system_flow: { diagrams: { archify: 'tools/archify' } } });
  const named = f.run(['detect']);
  assert.strictEqual(named.status, 1, named.stdout);
  assert.ok(named.stderr.includes('/system_flow/diagrams/archify'), named.stderr);
  assert.strictEqual(run(f, []).status, 1, 'build refuses it too');
  assert.deepStrictEqual(logOf(f), [], 'the repo copy never ran');
  f.fxJson({});
  const home = fake(f, path.join(f.home, '.claude', 'skills', 'archify'));
  assert.strictEqual(detectOf(f).archify.via, 'HOME');
  assert.strictEqual(detectOf(f).archify.dir, home);
  const cfg = fake(f, path.join(f.base, 'cfg', 'skills', 'archify'));
  const d = detectOf(f, { CLAUDE_CONFIG_DIR: path.join(f.base, 'cfg') });
  assert.deepStrictEqual(d.archify, { dir: cfg, version: '0.0.0-fake', via: 'CLAUDE_CONFIG_DIR' });
}

{ // Cheap, and a later detailed
  const f = setup();
  fake(f, path.join(f.home, '.claude', 'skills', 'archify'));
  const o = ok(f, ['--prefer', 'cheap']);
  assert.deepStrictEqual(logOf(f), []);
  for (const d of o.diagrams) assert.ok(d.reason.endsWith(', preference cheap'), d.reason);
  assert.strictEqual(fxDoc(f).system_flow.diagrams.prefer, 'cheap');
  assert.strictEqual(detectOf(f).archify, null);
  ok(f, []);
  assert.strictEqual(logOf(f).length, 0, 'the saved cheap holds');
  const d = ok(f, ['--prefer', 'detailed']);
  assert.strictEqual(logOf(f).length, 5);
  assert.strictEqual(reason(d, 'arch-system').renderer, 'archify');
  assert.strictEqual(reason(d, 'arch-system').reason, 'archify architecture, 2 components');
  assert.strictEqual(reason(d, 'flow-first').reason, 'archify sequence, 7 messages in 1 pages');
}

{ // An explicit --archify wins over a saved or given cheap
  const f = setup();
  f.fxJson({ system_flow: { diagrams: { prefer: 'cheap' } } });
  const a = fake(f, 'fake');
  const o = ok(f, ['--archify', a]);
  assert.strictEqual(logOf(f).length, 5);
  assert.strictEqual(reason(o, 'arch-system').renderer, 'archify');
  ok(f, ['--prefer', 'cheap', '--archify', a]);
  assert.strictEqual(logOf(f).length, 10);
  assert.strictEqual(fxDoc(f).system_flow.diagrams.prefer, 'cheap');
}

{ // Labels past archify's measured limits are cut with an ellipsis in the spec, and the reason names each one
  const f = setup();
  const lvl = parseJson(read(f, `${SITE}/model/fragments/level0.json`)) as Obj;
  const [api, db] = lvl.levels.diagrams[1].nodes;
  const ROLE = 'Sends prompts and reads answers over HTTP, SSE or SignalR to the backend.';
  const LABEL = 'Primary relational database cluster';
  api.role = ROLE;
  db.label = LABEL;
  f.fragment('level0', lvl);
  const fl = parseJson(read(f, `${SITE}/model/fragments/flows.json`)) as Obj;
  const PART = 'AnswerChannelPumpBackgroundWorker';
  fl.sequences[0].participants[0].label = PART;
  f.fragment('flows', fl);
  const o = ok(f, ['--archify', fake(f, 'fake')]);
  const cutOf = (whole: string, got: string): void => { assert.ok(got.endsWith('...') && whole.startsWith(got.slice(0, -3)), got); };
  const arch = parseJson(read(f, `${D}/src/arch-engine.json`)) as Obj;
  const c = (id: string): Obj => arch.components.find((x: Obj) => x.id === id);
  // archify 3.2.0: a sublabel needs units * 6 px * 0.6 within width - 8; a label units * 6.6 within width + 8.
  cutOf(ROLE, c('api').sublabel);
  assert.ok([...c('api').sublabel].length * 3.6 <= c('api').size[0] - 8, c('api').sublabel);
  cutOf(LABEL, c('db').label);
  assert.ok([...c('db').label].length * 6.6 <= c('db').size[0] + 8, c('db').label);
  for (const n of ['seq-turn', 'seq-turn-p2']) {
    const seq = parseJson(read(f, `${D}/src/${n}.json`)) as Obj;
    // archify 3.2.0 on an authored viewBox: box width max(86, min(190, round((W - 124) / count) - 24)), label units * 6.8 within it + 6.
    const box = Math.max(86, Math.min(190, Math.round((seq.meta.viewBox[0] - 124) / seq.participants.length) - 24));
    const p = seq.participants.find((x: Obj) => x.id === 'api');
    cutOf(PART, p.label);
    assert.ok([...p.label].length * 6.8 <= box + 6, `${n} ${p.label} ${box}`);
  }
  assert.strictEqual(reason(o, 'arch-engine').reason, 'archify architecture, 2 components, shortened: api sublabel, db label');
  assert.strictEqual(reason(o, 'seq-turn').reason, 'archify sequence, 14 messages in 2 pages, shortened: api label');
  assert.strictEqual(reason(o, 'arch-system').reason, 'archify architecture, 2 components');
}

{ // An --archify folder without bin/archify.mjs is an error naming the path
  const f = setup();
  const empty = path.join(f.base, 'no-archify');
  fs.mkdirSync(empty);
  const r = run(f, ['--archify', empty]);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.strictEqual(r.stderr, `system-flow: build: --archify ${empty} has no bin/archify.mjs\n`);
}

{ // Not installed
  const f = setup();
  const o = ok(f, []);
  assert.deepStrictEqual(logOf(f), []);
  for (const d of o.diagrams) assert.ok(d.reason.endsWith(', archify not installed'), d.reason);
}

{ // Usage
  const f = setup();
  for (const args of [['--page-limit', 'seq-turn'], ['--page-limit', 'seq-turn=9'], ['--page-limit', 'seq-turn=0'], ['--prefer', 'max'], ['--svg']]) {
    const r = run(f, args);
    assert.strictEqual(r.status, 2, args.join(' '));
  }
}

{ // Text
  const root = path.join(__dirname, '..');
  const adapter = fs.readFileSync(path.join(root, 'references', 'visual', 'archify-adapter.md'), 'utf8');
  for (const s of ['sources', 'one repository', 'fx-theme:begin', '390', '5 messages per page', '$CLAUDE_CONFIG_DIR/skills/archify']) assert.ok(adapter.includes(s), s);
  const check = fs.readFileSync(path.join(root, 'references', 'visual', 'visual-check.md'), 'utf8');
  assert.ok(/archify outputs are opened at 1440 and 390, light and dark/.test(check));
}
console.log('system-flow-archify.test.js: OK');
