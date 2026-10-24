// Run: node tests/gates/review-package.test.js
// review-package refuses a range whose BASE is not an ancestor of HEAD, so a
// reviewer never approves the wrong commits.
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync, spawnSync } from 'child_process';

const script = path.join(__dirname, '..', '..', 'skills', 'fx-implement', 'scripts', 'review-package');
// Scratch repo stays in os.tmpdir() (scratch-env points that at TMPDIR); nothing is deleted.
const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'review-package-'));
const git = (...args: string[]) =>
  execFileSync('git', ['-c', 'user.name=fx', '-c', 'user.email=fx@example.invalid', ...args], { cwd: repo, encoding: 'utf8' }).trim();
const commit = (file: string) => {
  fs.writeFileSync(path.join(repo, file), file);
  git('add', file);
  git('commit', '-m', file);
  return git('rev-parse', 'HEAD');
};
const run = (base: string, head: string) => spawnSync('bash', [script, 's', base, head], { cwd: repo, encoding: 'utf8' });

git('init', '-q', '-b', 'main');
const a = commit('a');
git('checkout', '-q', '-b', 'x');
const b = commit('b');
git('checkout', '-q', '-b', 'y', a);
const c = commit('c');

const bad = run(b, c);
assert.strictEqual(bad.status, 3, 'a non-ancestor BASE exits 3');
assert.strictEqual(bad.stderr.trim(), `BASE ${b} is not an ancestor of HEAD ${c}: refusing a range not rooted at BASE`);
assert.ok(!fs.existsSync(path.join(repo, '.fx', 's', 'review')), 'no review file is written');

const good = run(a, b);
assert.strictEqual(good.status, 0, `an ancestor range exits 0: ${good.stderr}`);
const m = /^wrote (.+): 1 commit\(s\), \d+ bytes$/.exec(good.stdout.trim());
assert.ok(m && m[1] !== undefined && fs.existsSync(m[1]), 'the package path is printed and exists');

const empty = run(b, b);
assert.strictEqual(empty.status, 3, 'an empty range still exits 3');
assert.strictEqual(empty.stderr.trim(), `empty range ${b}..${b}: no commits to review`);
console.log('review-package.test: OK');
