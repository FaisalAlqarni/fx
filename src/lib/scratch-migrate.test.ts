import * as assert from 'assert';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { applyScratchMigration, planScratchMigration } from './scratch-migrate.js';

const script = path.join(__dirname, 'scratch-migrate.js');
const git = (d: string, ...a: string[]) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: d, encoding: 'utf8' });
const fixtureBase = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-scratch-'));
const fixtureScript = path.join(__dirname, '..', 'scripts', 'make-git-fixture');
let n = 0;

// Files are written, then the tracked set is committed; `untracked` stays out of the commit.
function repo(tracked: Record<string, string>, untracked: Record<string, string> = {}): string {
  const out = execFileSync(fixtureScript, [path.join(fixtureBase, `r${n++}`)], { encoding: 'utf8' }).trim();
  const d = out.split(' ')[0] as string;
  const put = (files: Record<string, string>) => {
    for (const [f, b] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true });
      fs.writeFileSync(path.join(d, f), b);
    }
  };
  put(tracked);
  git(d, 'add', '--', ...Object.keys(tracked), ...(Object.keys(tracked).length ? [] : ['.']));
  git(d, 'commit', '-q', '--allow-empty', '-m', 'init');
  put(untracked);
  return d;
}
const run = (d: string, ...a: string[]) => spawnSync('node', [script, d, ...a], { encoding: 'utf8' });
const read = (d: string, f: string) => fs.readFileSync(path.join(d, f), 'utf8');
const count = (d: string) => git(d, 'rev-list', '--count', 'HEAD').trim();
const snapshot = (d: string) => execFileSync('find', ['.', '-path', './.git', '-prune', '-o', '-type', 'f', '-print'], { cwd: d, encoding: 'utf8' }).split('\n').sort()
  .map((f) => (f ? `${f}=${fs.readFileSync(path.join(d, f), 'utf8')}` : '')).join('\n');

// Existing target: refuse, tree unchanged.
{
  const d = repo({ '.scratch/feat/spec.md': 's', 'docs/issues/feat/x.md': 'x' });
  assert.deepStrictEqual(planScratchMigration(d).conflicts, ['docs/issues/feat already exists']);
  const before = snapshot(d);
  const r = run(d, '--apply');
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.includes('scratch-migrate: refused, repo unchanged:'), r.stderr);
  assert.strictEqual(snapshot(d), before);
}
// Dirty tracked file.
{
  const d = repo({ '.scratch/feat/spec.md': 's' });
  fs.writeFileSync(path.join(d, '.scratch/feat/spec.md'), 'changed');
  assert.ok(planScratchMigration(d).conflicts.includes('.scratch has uncommitted changes to tracked files'));
}
// Mixed tracked and untracked.
{
  const d = repo({ '.scratch/feat/a.md': 'a' }, { '.scratch/feat/b.md': 'b' });
  assert.deepStrictEqual(planScratchMigration(d).conflicts, ['.scratch/feat mixes tracked and untracked files']);
}
// Untracked and ignored: filesystem move, pointer edit, .gitignore line removed, no commit.
{
  const d = repo({ '.gitignore': 'node_modules\n.scratch/\n', 'CLAUDE.md': 'a\nb\nIssues in .scratch/<feature>/ here\n' },
    { '.scratch/feat/01-x.md': 'x' });
  const plan = planScratchMigration(d);
  assert.deepStrictEqual(plan.moves, [{ from: '.scratch/feat', to: 'docs/issues/feat', tracked: false }]);
  assert.deepStrictEqual(plan.gitignore, { file: '.gitignore', line: 2, text: '.scratch/' });
  assert.deepStrictEqual(plan.edits, [{ file: 'CLAUDE.md', line: 3, before: 'Issues in .scratch/<feature>/ here', after: 'Issues in docs/issues/<feature>/ here' }]);
  const before = count(d);
  const dry = run(d);
  assert.strictEqual(dry.status, 0);
  assert.ok(dry.stdout.includes('move .scratch/feat -> docs/issues/feat (filesystem move)'), dry.stdout);
  assert.ok(dry.stdout.includes('remove .gitignore:2: .scratch/'), dry.stdout);
  assert.ok(dry.stdout.includes('rollback:'), dry.stdout);
  assert.ok(fs.existsSync(path.join(d, '.scratch/feat/01-x.md')));
  applyScratchMigration(d);
  assert.strictEqual(read(d, 'docs/issues/feat/01-x.md'), 'x');
  assert.ok(!fs.existsSync(path.join(d, '.scratch')));
  assert.ok(!read(d, '.gitignore').split('\n').includes('.scratch/'));
  assert.strictEqual(read(d, 'CLAUDE.md').split('\n')[2], 'Issues in docs/issues/<feature>/ here');
  assert.strictEqual(count(d), before);
  // Second run: nothing left.
  const again = run(d);
  assert.strictEqual(again.status, 0);
  assert.strictEqual(again.stdout.trim(), 'scratch-migrate: nothing to move');
}
// Tracked apply: git mv shows as a rename.
{
  const d = repo({ '.scratch/feat/spec.md': 's' });
  assert.strictEqual(planScratchMigration(d).moves[0]?.tracked, true);
  applyScratchMigration(d);
  assert.ok(/^R\s+\.scratch\/feat\/spec\.md -> docs\/issues\/feat\/spec\.md$/m.test(git(d, 'status', '--porcelain')));
}
// Failure undo: a read-only edit target makes apply fail; the failed step is not
// undone, the message is true, and everything is put back.
if (process.getuid && process.getuid() === 0) {
  console.log('scratch-migrate.test.js: skipping the read-only failure cases when run as root');
} else {
  const d = repo({ '.gitignore': '.scratch/\n', 'CLAUDE.md': 'see .scratch/x\n' }, { '.scratch/feat/a.md': 'a' });
  fs.chmodSync(path.join(d, 'CLAUDE.md'), 0o444);
  const before = snapshot(d);
  const r = run(d, '--apply');
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.startsWith('scratch-migrate: failed at edit CLAUDE.md'), r.stderr);
  assert.ok(r.stderr.trim().endsWith('; undone'), r.stderr);
  assert.strictEqual(snapshot(d), before);
  assert.ok(!fs.existsSync(path.join(d, 'docs')), 'no leftover docs/');
  // A failed write step (.gitignore read-only) is also reported as undone.
  const e = repo({ '.gitignore': '.scratch/\n' }, { '.scratch/feat/a.md': 'a' });
  fs.chmodSync(path.join(e, '.gitignore'), 0o444);
  const r2 = run(e, '--apply');
  assert.ok(r2.stderr.startsWith('scratch-migrate: failed at remove .gitignore:1') && r2.stderr.trim().endsWith('; undone'), r2.stderr);
  assert.ok(fs.existsSync(path.join(e, '.scratch/feat/a.md')));
  assert.ok(!fs.existsSync(path.join(e, 'docs')), 'no leftover docs/');
}
// Symlinked entry.
{
  const d = repo({ 'x.md': 'x' });
  fs.mkdirSync(path.join(d, '.scratch'));
  fs.symlinkSync('../x.md', path.join(d, '.scratch/link'));
  assert.deepStrictEqual(planScratchMigration(d).conflicts, ['.scratch/link is a symlink']);
}
// Symlinks are refused before any change, and nothing outside the repo is touched.
{
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-scratch-out-'));
  fs.writeFileSync(path.join(outside, 'gi'), 'keep\n');
  const d = repo({ '.scratch/feat/a.md': 'a' });
  fs.symlinkSync(outside, path.join(d, 'docs'));
  fs.symlinkSync(path.join(outside, 'gi'), path.join(d, '.gitignore'));
  assert.deepStrictEqual(planScratchMigration(d).conflicts, ['.gitignore is a symlink', 'docs is a symlink']);
  const r = run(d, '--apply');
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.includes('scratch-migrate: refused, repo unchanged:'), r.stderr);
  assert.deepStrictEqual(fs.readdirSync(outside).sort(), ['gi']);
  assert.strictEqual(fs.readFileSync(path.join(outside, 'gi'), 'utf8'), 'keep\n');
  assert.ok(fs.existsSync(path.join(d, '.scratch/feat/a.md')));
  // .scratch itself and docs/issues.
  const e = repo({ 'x/a.md': 'a' });
  fs.symlinkSync(path.join(e, 'x'), path.join(e, '.scratch'));
  assert.deepStrictEqual(planScratchMigration(e).conflicts, ['.scratch is a symlink']);
  const f = repo({ '.scratch/feat/a.md': 'a' });
  fs.mkdirSync(path.join(f, 'docs'));
  fs.symlinkSync(outside, path.join(f, 'docs/issues'));
  assert.deepStrictEqual(planScratchMigration(f).conflicts, ['docs/issues is a symlink']);
}
console.log('scratch-migrate.test.js: ok');
