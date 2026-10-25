// Run: node lib/doc-index.test.js
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { buildIndex, loadIndex, queryIndex, stalePassOne } from './doc-index.js';

const ROOT = path.join(__dirname, '..');
const tmp = (name: string) => fs.mkdtempSync(path.join(os.tmpdir(), `fx-docidx-${name}-`));
function put(root: string, rel: string, text: string): void {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
}
const OVERVIEW = [
  'Shortlinks expire after 90 days.', 'Evidence: `engines/shortlink/app/models/link.rb:40-58` `Link#expired?`', '',
  'The product is sold in KSA.', 'Evidence: owner, 2026-10-23', '',
].join('\n');
const ADR1 = 'Status: superseded by 0002 (replaced: decisions 1; the rest carried forward).\n\n1. Keep MySQL.\n   Evidence: `db/schema.rb:1-9`\n';
const ADR2 = 'Status: accepted\n\n1. Keep Postgres as the source of truth.\n   Evidence: `db/schema.rb:1-9`\n';
function tree(): string {
  const r = tmp('tree');
  put(r, 'docs/arch/overview.md', OVERVIEW);
  put(r, 'docs/adr/0001-x.md', ADR1);
  put(r, 'docs/adr/0002-x.md', ADR2);
  put(r, 'docs/plans/p/design.md', 'A plan claim.\nEvidence: `lib/x.js`\n');
  put(r, 'docs/html/a/page.md', 'Html.\nEvidence: `lib/x.js`\n');
  put(r, 'docs/issues/i.md', 'Issue.\nEvidence: `lib/x.js`\n');
  return r;
}

// buildIndex reads docs outside plans, issues and html.
const t = tree();
const idx = buildIndex(t);
assert.strictEqual(idx.version, 1);
assert.deepStrictEqual(idx.claims.map((c) => `${c.doc}:${c.line}`), ['docs/adr/0001-x.md:4', 'docs/adr/0002-x.md:4', 'docs/arch/overview.md:2', 'docs/arch/overview.md:5']);
assert.deepStrictEqual(Object.keys(idx.verified), ['docs/adr/0001-x.md', 'docs/adr/0002-x.md', 'docs/arch/overview.md']);

// queryIndex: file, directory both ways; superseded claims never match; no match gives [].
assert.deepStrictEqual(queryIndex(idx, ['engines/shortlink']).map((c) => c.doc), ['docs/arch/overview.md']);
assert.deepStrictEqual(queryIndex(idx, ['engines/shortlink/app/models/link.rb']).length, 1);
assert.deepStrictEqual(queryIndex(idx, ['app/other.rb']), []);
assert.deepStrictEqual(queryIndex(idx, ['db/schema.rb']).map((c) => [c.doc, c.status]), [['docs/adr/0002-x.md', 'current']]);
assert.strictEqual(queryIndex(idx, ['engines', 'engines/shortlink']).length, 1, 'no duplicates');
assert.strictEqual(queryIndex(idx, ['engines/short']).length, 0, 'a directory matches whole segments');
const dirCited = { ...idx, claims: [{ ...idx.claims[2]!, evidence: [{ type: 'path' as const, path: 'engines/shortlink', start: null, end: null, symbol: null }] }] };
assert.strictEqual(queryIndex(dirCited, ['engines/shortlink/app/x.rb']).length, 1, 'a cited directory covers a path under it');

// Empty case: a doc without evidence lines.
const e = tmp('empty');
put(e, 'docs/readme.md', 'Just prose.\n');
assert.deepStrictEqual(buildIndex(e), { version: 1, claims: [], problems: [], verified: { 'docs/readme.md': null } });

// No docs, or docs holding only plans: an empty index and no .fx/.
for (const files of [[], ['docs/plans/p/plan.md']]) {
  const n = tmp('nodocs');
  for (const f of files) put(n, f, 'x\nEvidence: `a.rb`\n');
  assert.deepStrictEqual(loadIndex(n), { version: 1, claims: [], problems: [], verified: {} });
  assert.strictEqual(fs.existsSync(path.join(n, '.fx')), false, files.join());
}

// Cache: written once, rebuilt when a doc is newer, when a doc is deleted.
const c = tree();
const file = path.join(c, '.fx', 'docs-index.json');
assert.strictEqual(loadIndex(c).claims.length, 4);
const first = fs.readFileSync(file, 'utf8');
assert.strictEqual(loadIndex(c).claims.length, 4);
assert.strictEqual(fs.readFileSync(file, 'utf8'), first, 'a second load keeps the file');
const old = new Date(Date.now() - 3600_000);
fs.utimesSync(file, old, old);
const doc = path.join(c, 'docs/arch/overview.md');
fs.writeFileSync(doc, OVERVIEW + '\nA third.\nEvidence: `lib/y.js`\n');
fs.utimesSync(doc, new Date(), new Date());
assert.strictEqual(loadIndex(c).claims.length, 5, 'a newer doc rebuilds');
fs.unlinkSync(path.join(c, 'docs/arch/overview.md'));
assert.deepStrictEqual(loadIndex(c).claims.map((x) => x.doc), ['docs/adr/0001-x.md', 'docs/adr/0002-x.md'], 'a deleted doc leaves the index');
fs.writeFileSync(file, '{not json');
assert.strictEqual(loadIndex(c).claims.length, 2, 'an unreadable index rebuilds');

// stalePassOne on a git fixture.
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8' }).trim();
function repo(): string {
  const base = tmp('git');
  const main = execFileSync(path.join(ROOT, 'scripts', 'make-git-fixture'), [path.join(base, 'f')], { encoding: 'utf8' }).trim().split(' ')[0] ?? '';
  put(main, 'src/code.rb', ['l1', 'l2', 'l3', 'l4', 'l5', ''].join('\n'));
  git(main, 'add', '.');
  git(main, 'commit', '-q', '-m', 'code');
  return main;
}
function staleCase(setup: (r: string) => void, doc: (sha: string) => string, docPath = 'docs/arch/a.md'): [string, string][] {
  const r = repo();
  const sha = git(r, 'rev-parse', 'HEAD');
  put(r, docPath, doc(sha));
  setup(r);
  return stalePassOne(r, buildIndex(r)).map((s) => [s.verdict, s.reason]);
}
const cited = (sha: string | null) => `A claim.\nEvidence: \`src/code.rb:3-4\`\n${sha ? `\n<!-- fx-docs verified: ${sha} -->\n` : ''}`;
const commit = (r: string) => { git(r, 'add', '.'); git(r, 'commit', '-q', '-m', 'change'); };
const none = () => undefined;
assert.deepStrictEqual(staleCase(commit, cited), [['free', 'unchanged']]);
assert.deepStrictEqual(staleCase((r) => { put(r, 'src/code.rb', 'l1\nl2\nl3\nL4\nl5\n'); commit(r); }, cited), [['recheck', 'changed']]);
assert.deepStrictEqual(staleCase((r) => { put(r, 'src/code.rb', 'l1\nl2\nl3\nl4\nL5\n'); commit(r); }, cited), [['free', 'unchanged']], 'an edit below the range');
assert.deepStrictEqual(staleCase((r) => { put(r, 'src/code.rb', 'new\nl1\nl2\nl3\nl4\nl5\n'); commit(r); }, cited), [['recheck', 'shifted']]);
assert.deepStrictEqual(staleCase((r) => { git(r, 'rm', '-q', '--', 'src/code.rb'); commit(r); }, cited), [['recheck', 'deleted']]);
assert.deepStrictEqual(staleCase(none, () => cited(null)), [['recheck', 'unverified']]);
assert.deepStrictEqual(staleCase(none, () => cited('0'.repeat(40))), [['recheck', 'unverified']]);
assert.deepStrictEqual(staleCase(none, () => 'Owned.\nEvidence: owner, 2026-10-23\n'), [['skip', 'owner']]);
assert.deepStrictEqual(staleCase(none, () => ADR1, 'docs/adr/0001-x.md'), [['skip', 'superseded']]);
// A whole-file citation: any hunk rechecks it. The worst item decides.
assert.deepStrictEqual(staleCase((r) => { put(r, 'src/code.rb', 'l1\nl2\nl3\nl4\nL5\n'); commit(r); }, (s) => `A.\nEvidence: \`src/code.rb\`\n\n<!-- fx-docs verified: ${s} -->\n`), [['recheck', 'changed']]);
// Shifted code.rb plus a file new since the marker: the worst item (changed) wins.
assert.deepStrictEqual(staleCase((r) => { put(r, 'src/code.rb', 'new\nl1\nl2\nl3\nl4\nl5\n'); put(r, 'src/b.rb', 'x\n'); commit(r); },
  (s) => `A.\nEvidence: \`src/code.rb:3-4\`; \`src/b.rb\`\n\n<!-- fx-docs verified: ${s} -->\n`), [['recheck', 'changed']], 'b.rb did not exist at the verified commit');

// The command: --limit caps the claims and counts the rest; a bad command is a usage error.
const many = tmp('many');
put(many, 'docs/a.md', Array.from({ length: 25 }, (_, i) => `Claim ${i}.\nEvidence: \`app/x.rb:${i + 1}\`\n`).join('\n'));
const cmd = path.join(ROOT, 'scripts', 'docs-index');
const out = JSON.parse(execFileSync(cmd, ['--root', many, 'query', '--limit', '20', 'app/x.rb'], { encoding: 'utf8' })); // ts-gate-ok: the test parses output it just produced
assert.strictEqual(out.claims.length, 20);
assert.strictEqual(out.more, 5);
assert.strictEqual(JSON.parse(execFileSync(cmd, ['--root', many, 'query', 'app'], { encoding: 'utf8' })).claims.length, 20, 'the default limit is 20'); // ts-gate-ok: the test parses output it just produced
const bad = spawnSync(cmd, ['frob'], { encoding: 'utf8' });
assert.strictEqual(bad.status, 2);
assert.strictEqual(bad.stderr.trim(), 'docs-index: usage: docs-index [--root <dir>] build | query [--limit <n>] <path>... | stale');
const prob = tmp('prob');
put(prob, 'docs/a.md', 'A.\nEvidence: nonsense\n');
const pr = spawnSync(cmd, ['--root', prob, 'build'], { encoding: 'utf8' });
assert.strictEqual(pr.status, 0);
assert.strictEqual(pr.stderr.trim(), 'docs/a.md:2: malformed evidence line: Evidence: nonsense');

console.log('doc-index tests passed');
