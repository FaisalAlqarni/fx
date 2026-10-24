import * as assert from 'assert';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { planMigration } from './glossary-migrate.js';

const script = path.join(__dirname, 'glossary-migrate.js');
const git = (d: string, ...a: string[]) =>
  execFileSync('git', ['-c', 'user.name=fx', '-c', 'user.email=fx@example.invalid', ...a], { cwd: d, encoding: 'utf8' });

function repo(extra: Record<string, string> = {}): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-migrate-'));
  const files: Record<string, string> = {
    'CONTEXT-MAP.md': '# Map\n[a](engines/a/CONTEXT.md)\n',
    'CONTEXT.md': 'root',
    'engines/a/CONTEXT.md': 'a',
    'CLAUDE.md': 'See CONTEXT-MAP.md.\n',
    'docs/plans/x.md': 'CONTEXT.md\n',
    ...extra,
  };
  git(d, 'init', '-q');
  for (const [n, b] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(d, n)), { recursive: true });
    fs.writeFileSync(path.join(d, n), b);
  }
  git(d, 'add', '.');
  git(d, 'commit', '-q', '-m', 'init');
  return d;
}
const run = (d: string, ...a: string[]) => spawnSync('node', [script, d, ...a], { encoding: 'utf8' });
const read = (d: string, n: string) => fs.readFileSync(path.join(d, n), 'utf8');
const count = (d: string) => git(d, 'rev-list', '--count', 'HEAD').trim();

{
  const d = repo();
  assert.deepStrictEqual(planMigration(d), {
    moves: [
      { from: 'CONTEXT-MAP.md', to: 'GLOSSARY-MAP.md' },
      { from: 'CONTEXT.md', to: 'GLOSSARY.md' },
      { from: 'engines/a/CONTEXT.md', to: 'engines/a/GLOSSARY.md' },
    ],
    edits: ['CLAUDE.md'],
    conflicts: [],
  });
}
{
  const d = repo();
  const r = run(d);
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, [
    'git mv CONTEXT-MAP.md GLOSSARY-MAP.md', 'git mv CONTEXT.md GLOSSARY.md',
    'git mv engines/a/CONTEXT.md engines/a/GLOSSARY.md', 'edit CLAUDE.md', 'dry run: nothing changed', ''].join('\n'));
  assert.strictEqual(git(d, 'status', '--porcelain'), '');
}
{
  const d = repo();
  const before = count(d);
  const r = run(d, '--apply');
  assert.strictEqual(r.status, 0);
  assert.ok(read(d, 'GLOSSARY-MAP.md').includes('[a](engines/a/GLOSSARY.md)'));
  assert.ok(fs.existsSync(path.join(d, 'engines/a/GLOSSARY.md')));
  assert.ok(!fs.existsSync(path.join(d, 'engines/a/CONTEXT.md')));
  assert.ok(read(d, 'CLAUDE.md').includes('See GLOSSARY-MAP.md.'));
  assert.ok(read(d, 'docs/plans/x.md').includes('CONTEXT.md'));
  assert.ok(r.stdout.trimEnd().endsWith('moved 3, edited 1, committed nothing'));
  assert.strictEqual(count(d), before);
  const again = run(d, '--apply');
  assert.strictEqual(again.status, 0);
  assert.ok(again.stdout.trimEnd().endsWith('moved 0, edited 0, committed nothing'));
}
{
  const d = repo({ 'engines/a/GLOSSARY.md': 'mine' });
  assert.deepStrictEqual(planMigration(d).conflicts, ['engines/a/GLOSSARY.md']);
  const r = run(d, '--apply');
  assert.strictEqual(r.status, 1);
  assert.ok(fs.existsSync(path.join(d, 'CONTEXT.md')));
  assert.strictEqual(read(d, 'engines/a/GLOSSARY.md'), 'mine');
  assert.strictEqual(git(d, 'status', '--porcelain'), '');
}
{
  // An untracked linked file: refuse before moving anything, one line, no stack.
  const d = repo();
  fs.mkdirSync(path.join(d, 'engines/b'));
  fs.writeFileSync(path.join(d, 'engines/b/CONTEXT.md'), 'b');
  fs.appendFileSync(path.join(d, 'CONTEXT-MAP.md'), '[b](engines/b/CONTEXT.md)\n');
  git(d, 'add', 'CONTEXT-MAP.md');
  git(d, 'commit', '-q', '-m', 'link b');
  const r = run(d, '--apply');
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.stderr.trim().split('\n').length, 1, r.stderr);
  assert.ok(!/\n\s+at /.test(r.stderr));
  assert.deepStrictEqual(planMigration(d).conflicts, ['engines/b/CONTEXT.md is not tracked by git']);
  assert.ok(fs.existsSync(path.join(d, 'CONTEXT-MAP.md')));
  assert.strictEqual(git(d, 'status', '--porcelain'), '?? engines/b/\n');
}
{
  // Links that leave the repository or are absolute are refused, nothing moves.
  const d = repo({ 'CONTEXT-MAP.md': '[x](../x/CONTEXT.md) [y](/engines/a/CONTEXT.md)\n' });
  const r = run(d, '--apply');
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.stderr.trim().split('\n').length, 1, r.stderr);
  assert.strictEqual(git(d, 'status', '--porcelain'), '');
}
{
  // A map link to a missing file is refused rather than skipped.
  const d = repo({ 'CONTEXT-MAP.md': '[z](engines/z/CONTEXT.md)\n' });
  assert.deepStrictEqual(planMigration(d).conflicts, ['engines/z/CONTEXT.md is missing']);
  assert.strictEqual(run(d, '--apply').status, 1);
  assert.strictEqual(git(d, 'status', '--porcelain'), '');
}
{
  // A rerun on a partly migrated repo finishes the job.
  const d = repo();
  git(d, 'mv', 'CONTEXT-MAP.md', 'GLOSSARY-MAP.md');
  git(d, 'mv', 'CONTEXT.md', 'GLOSSARY.md');
  assert.deepStrictEqual(planMigration(d).moves, [{ from: 'engines/a/CONTEXT.md', to: 'engines/a/GLOSSARY.md' }]);
  const r = run(d, '--apply');
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(read(d, 'GLOSSARY-MAP.md').includes('[a](engines/a/GLOSSARY.md)'));
  assert.ok(fs.existsSync(path.join(d, 'engines/a/GLOSSARY.md')));
  assert.ok(run(d, '--apply').stdout.trimEnd().endsWith('moved 0, edited 0, committed nothing'));
}
console.log('glossary-migrate.test.js: ok');
