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
    edits: ['CLAUDE.md', 'GLOSSARY-MAP.md'],
    byHand: [],
    conflicts: [],
  });
}
{
  const d = repo();
  const r = run(d);
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, [
    'git mv CONTEXT-MAP.md GLOSSARY-MAP.md', 'git mv CONTEXT.md GLOSSARY.md',
    'git mv engines/a/CONTEXT.md engines/a/GLOSSARY.md', 'edit CLAUDE.md', 'edit GLOSSARY-MAP.md', 'dry run: nothing changed', ''].join('\n'));
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
  assert.ok(r.stdout.trimEnd().endsWith('moved 3, edited 2, committed nothing'));
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
// A git on PATH that fails the listed calls to `git mv` (1-based) and passes
// everything else to the real git, so a move can fail after earlier ones ran.
const realGit = (process.env.PATH ?? '').split(path.delimiter).map((p) => path.join(p, 'git'))
  .find((p) => fs.existsSync(p)) ?? 'git';
function runFailingMv(d: string, failOn: number[], ...a: string[]) {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-fakegit-'));
  const counter = path.join(bin, 'count');
  fs.writeFileSync(path.join(bin, 'git'), [
    '#!/bin/sh',
    'if [ "$1" = mv ]; then',
    `  n=$(($(cat ${JSON.stringify(counter)} 2>/dev/null || echo 0) + 1)); echo "$n" > ${JSON.stringify(counter)}`,
    `  case " ${failOn.join(' ')} " in *" $n "*) echo "fatal: injected failure on mv $n" >&2; exit 128 ;; esac`,
    'fi',
    `exec ${JSON.stringify(realGit)} "$@"`, ''].join('\n'), { mode: 0o755 });
  return spawnSync('node', [script, d, ...a], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` } });
}
// Every file outside .git with its content, so "identical" means byte for byte.
function snapshot(d: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (rel: string) => {
    for (const e of fs.readdirSync(path.join(d, rel), { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (r === '.git') continue;
      if (e.isDirectory()) walk(r); else out[r] = fs.readFileSync(path.join(d, r), 'utf8');
    }
  };
  walk('');
  return out;
}
{
  // A failure on the second move rolls back the first: the repo is identical.
  const d = repo();
  const before = snapshot(d);
  const r = runFailingMv(d, [2], '--apply');
  assert.strictEqual(r.status, 1);
  assert.strictEqual(git(d, 'status', '--porcelain'), '');
  assert.deepStrictEqual(snapshot(d), before);
  assert.match(r.stderr, /^glossary-migrate: refused, repo unchanged: /);
}
{
  // When the rollback itself fails, the message names what moved and what did not.
  const d = repo();
  const r = runFailingMv(d, [2, 3], '--apply');
  assert.strictEqual(r.status, 1);
  assert.doesNotMatch(r.stderr, /repo unchanged/);
  assert.match(r.stderr, /partly applied/);
  assert.match(r.stderr, /moved: CONTEXT-MAP\.md -> GLOSSARY-MAP\.md/);
  assert.match(r.stderr, /not moved: CONTEXT\.md, engines\/a\/CONTEXT\.md/);
}
{
  // A failed write after every move ran undoes the writes and the moves.
  const d = repo({ 'docs/guide.md': 'Read CONTEXT.md.\n' });
  const before = snapshot(d);
  fs.chmodSync(path.join(d, 'docs/guide.md'), 0o444);
  const r = run(d, '--apply');
  fs.chmodSync(path.join(d, 'docs/guide.md'), 0o644);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.strictEqual(git(d, 'status', '--porcelain'), '');
  assert.deepStrictEqual(snapshot(d), before);
  assert.match(r.stderr, /refused, repo unchanged/);
}
{
  // A path starting with - is refused, so git can never read it as an option.
  const d = repo({ 'CONTEXT-MAP.md': '[x](-x/CONTEXT.md)\n', '-x/CONTEXT.md': 'x' });
  assert.deepStrictEqual(planMigration(d).conflicts, ['-x/CONTEXT.md starts with -']);
  assert.strictEqual(run(d, '--apply').status, 1);
  assert.strictEqual(git(d, 'status', '--porcelain'), '');
}
{
  // Mentions are rewritten in the moved glossaries and in any tracked Markdown;
  // a non-Markdown file is listed for the owner and never edited.
  const spec = "it 'reads the map' do\n  read('CONTEXT-MAP.md')\nend\n";
  const d = repo({
    'engines/a/CONTEXT.md': 'See the root CONTEXT-MAP.md.\n',
    'engines/a/README.md': 'Terms: CONTEXT.md\n',
    'spec/docs_spec.rb': spec,
  });
  const dry = run(d);
  assert.strictEqual(dry.status, 0, dry.stderr);
  assert.ok(dry.stdout.includes('edit engines/a/README.md\n'), dry.stdout);
  assert.ok(dry.stdout.includes('edit engines/a/GLOSSARY.md\n'), dry.stdout);
  assert.ok(dry.stdout.includes('update by hand spec/docs_spec.rb:2\n'), dry.stdout);
  assert.strictEqual(run(d, '--apply').status, 0);
  assert.strictEqual(read(d, 'engines/a/GLOSSARY.md'), 'See the root GLOSSARY-MAP.md.\n');
  assert.strictEqual(read(d, 'engines/a/README.md'), 'Terms: GLOSSARY.md\n');
  assert.strictEqual(read(d, 'spec/docs_spec.rb'), spec);
}
{
  // A reference-style link in the map is followed like an inline one.
  const d = repo({ 'CONTEXT-MAP.md': '# Map\n[a]: engines/a/CONTEXT.md\n' });
  assert.ok(planMigration(d).moves.some((m) => m.from === 'engines/a/CONTEXT.md'));
}
{
  // A symlinked CLAUDE.md that points outside the repo is refused; the outside file is untouched.
  const outside = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fx-outside-')), 'notes.md');
  fs.writeFileSync(outside, 'See CONTEXT.md.\n');
  const d = repo();
  fs.unlinkSync(path.join(d, 'CLAUDE.md'));
  fs.symlinkSync(outside, path.join(d, 'CLAUDE.md'));
  git(d, 'add', 'CLAUDE.md');
  git(d, 'commit', '-q', '-m', 'link');
  assert.deepStrictEqual(planMigration(d).conflicts, ['CLAUDE.md is a symlink']);
  assert.strictEqual(run(d, '--apply').status, 1);
  assert.strictEqual(fs.readFileSync(outside, 'utf8'), 'See CONTEXT.md.\n');
  assert.strictEqual(git(d, 'status', '--porcelain'), '');
}
{
  // A symlinked map is refused before it is read.
  const d = repo();
  fs.renameSync(path.join(d, 'CONTEXT-MAP.md'), path.join(d, 'real-map.md'));
  fs.symlinkSync('real-map.md', path.join(d, 'CONTEXT-MAP.md'));
  git(d, 'add', '-A');
  git(d, 'commit', '-q', '-m', 'link map');
  assert.ok(planMigration(d).conflicts.includes('CONTEXT-MAP.md is a symlink'));
}
console.log('glossary-migrate.test.js: ok');
