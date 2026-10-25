// Run: node tests/gates/reference-leaves.test.js
// scripts/check-reference-leaves over scratch trees: a backticked `name.md` in
// any references/**/*.md fails when that basename exists elsewhere under
// references/, vendor excluded.
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

const script = path.join(__dirname, '..', '..', 'scripts', 'check-reference-leaves');

function tree(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-leaves-'));
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), body);
  }
  return root;
}

function run(root?: string) {
  const r = spawnSync('bash', root ? [script, root] : [script], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}

{
  const r = run(tree({ 'references/vocab/a.md': 'see `adr-template.md`\n', 'references/templates/adr-template.md': '# t\n' }));
  assert.strictEqual(r.code, 1, 'a vocab file naming a template fails');
  assert.ok(r.out.includes('  references/vocab/a.md -> adr-template.md'), r.out);
}
{
  const r = run(tree({ 'references/templates/x-template.md': 'see `wayfinder.md`\n', 'references/wayfinder.md': '# w\n' }));
  assert.strictEqual(r.code, 1, 'a template naming a top-level reference fails');
  assert.ok(r.out.includes('  references/templates/x-template.md -> wayfinder.md'), r.out);
}
{
  const r = run(tree({ 'references/a.md': 'see `LICENSE-x.md`\n', 'references/vendor/LICENSE-x.md': 'x\n' }));
  assert.strictEqual(r.code, 0, `vendor is not a target: ${r.out}`);
}
{
  const r = run(tree({ 'references/a.md': 'see `design.md`\n' }));
  assert.strictEqual(r.code, 0, r.out);
  assert.ok(r.out.includes('OK: no reference links to another reference'), r.out);
}
{
  const r = run();
  assert.strictEqual(r.code, 0, `the repository is clean: ${r.out}`);
}

console.log('reference-leaves.test.js: OK');
