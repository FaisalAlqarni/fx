'use strict';
// Run: node tests/gates/release-version.test.js [<repo>]
//
// A Claude Code plugin update only lands when the version changes (measured in
// the task 13 review, docs/plans/2026-09-21-multi-harness/). A branch that
// changes what the plugin ships and keeps the base branch's version merges
// cleanly and then never reaches an installed copy. This gate fails that
// branch: shipped files differ from the merge-base with the base branch, and
// .claude-plugin/plugin.json's version is not greater than the base's.
//
// Shipped means every tracked path except the ones no runtime loads: docs/,
// tests/, tasks/, .github/ and the human-facing root documents. The working
// tree is compared, not HEAD, so the gate says the same thing before and after
// the commit. The version sync across the three manifests is
// tests/gates/codex-manifest.test.js's job, not this one's.
//
// No base branch to compare (a shallow CI clone, a fresh repo): skipped, and
// it says so.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const BASES = ['main', 'master', 'origin/main', 'origin/master'];
const NOT_SHIPPED = ['docs', 'tests', 'tasks', '.github', 'README.md', 'INSTALL.md', 'SURFACE.md'];
const MANIFEST = '.claude-plugin/plugin.json';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const ok = (cwd, ...args) => spawnSync('git', args, { cwd }).status === 0;

// ponytail: plain MAJOR.MINOR.PATCH only; a pre-release suffix compares as its numeric part.
const newer = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split(/[.-]/).slice(0, 3).map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

// Returns { skipped: reason } or { errors: [...] }.
function releaseCheck(repo) {
  const base = BASES.find((b) => ok(repo, 'rev-parse', '--verify', '--quiet', `${b}^{commit}`));
  if (!base) return { skipped: 'no base branch to compare' };
  const mb = git(repo, 'merge-base', base, 'HEAD');
  const changed = !ok(repo, 'diff', '--quiet', mb, '--', '.', ...NOT_SHIPPED.map((p) => `:!${p}`));
  if (!changed) return { errors: [] };
  if (!ok(repo, 'cat-file', '-e', `${mb}:${MANIFEST}`)) return { skipped: `no ${MANIFEST} at the merge-base ${mb.slice(0, 7)}` };
  const was = JSON.parse(git(repo, 'show', `${mb}:${MANIFEST}`)).version;
  const now = JSON.parse(fs.readFileSync(path.join(repo, MANIFEST), 'utf8')).version;
  return { errors: newer(now, was) ? [] : [
    `shipped files differ from ${base} (merge-base ${mb.slice(0, 7)}) but ${MANIFEST} is ${now}, not greater than ${was}: bump the version or the update never lands`,
  ] };
}

// Fixture: a base branch at 0.1.0, a feature branch off it.
function fixture(dir, { version, file }) {
  const g = (...a) => git(dir, '-c', 'user.name=fx', '-c', 'user.email=fx@example.invalid', ...a);
  fs.mkdirSync(path.join(dir, '.claude-plugin'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'skills'));
  fs.mkdirSync(path.join(dir, 'docs'));
  const write = (rel, text) => fs.writeFileSync(path.join(dir, rel), text);
  write(MANIFEST, JSON.stringify({ version: '0.1.0' }));
  write('skills/a.md', 'one\n');
  write('docs/a.md', 'one\n');
  g('init', '-q', '-b', 'main');
  g('add', '.');
  g('commit', '-q', '-m', 'base');
  g('checkout', '-q', '-b', 'feat');
  write(file, 'two\n');
  write(MANIFEST, JSON.stringify({ version }));
  g('commit', '-q', '-am', 'change');
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-release-version-'));
try {
  const at = (name, opts) => { const d = path.join(tmp, name); fs.mkdirSync(d); fixture(d, opts); return releaseCheck(d); };

  const same = at('same', { version: '0.1.0', file: 'skills/a.md' });
  assert.strictEqual(same.errors.length, 1, `a shipped change at the base version fails: ${JSON.stringify(same)}`);
  assert.deepStrictEqual(at('lower', { version: '0.0.9', file: 'skills/a.md' }).errors.length, 1, 'a lower version fails');
  assert.deepStrictEqual(at('bumped', { version: '0.1.1', file: 'skills/a.md' }), { errors: [] }, 'a bumped version passes');
  assert.deepStrictEqual(at('docs', { version: '0.1.0', file: 'docs/a.md' }), { errors: [] }, 'a docs-only change needs no bump');
  assert.ok(newer('0.10.0', '0.9.0'), 'versions compare numerically');

  const bare = path.join(tmp, 'bare');
  fs.mkdirSync(bare);
  git(bare, 'init', '-q', '-b', 'feat');
  assert.ok(releaseCheck(bare).skipped, 'no base branch skips');

  // A merge-base with no manifest yet (the plugin is new on this branch) has
  // no version to exceed: skipped with a reason, never an uncaught throw.
  const fresh = path.join(tmp, 'fresh');
  fs.mkdirSync(fresh);
  const g = (...a) => git(fresh, '-c', 'user.name=fx', '-c', 'user.email=fx@example.invalid', ...a);
  fs.writeFileSync(path.join(fresh, 'a.md'), 'one\n');
  g('init', '-q', '-b', 'main'); g('add', '.'); g('commit', '-q', '-m', 'base');
  g('checkout', '-q', '-b', 'feat');
  fs.mkdirSync(path.join(fresh, '.claude-plugin'));
  fs.writeFileSync(path.join(fresh, MANIFEST), JSON.stringify({ version: '0.1.0' }));
  g('add', '.'); g('commit', '-q', '-m', 'add manifest');
  assert.match(String(releaseCheck(fresh).skipped), /no .*plugin\.json/, 'a merge-base without a manifest skips, and says why');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// This tree, or the repository named on the command line.
const root = process.argv[2] || path.join(__dirname, '..', '..');
const here = releaseCheck(root);
if (here.skipped) console.log(`release-version.test.js: skipped on this tree (${here.skipped})`);
else assert.deepStrictEqual(here.errors, [], here.errors.join('\n'));

console.log('release-version.test.js: OK');
