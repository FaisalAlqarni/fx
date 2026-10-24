// Run: node tests/gates/skill-size.test.js
//
// Claude Code re-attaches a skill cut at 20,000 characters after compaction,
// so a SKILL.md at or over the limit loses its tail. PENDING names the skills
// still over, each with the task that fixes it; an entry that outlives its fix
// fails too. The same file drives scripts/check-paths over scratch trees for
// the markdown-link and reachability checks.
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

export const LIMIT = 20000;
export const PENDING: Record<string, string> = { 'fx-humanize': '11' };

export function oversize(root: string, pending: Record<string, string>): string[] {
  const out: string[] = [];
  const dir = path.join(root, 'skills');
  for (const name of fs.readdirSync(dir).sort()) {
    const file = path.join(dir, name, 'SKILL.md');
    if (!fs.existsSync(file)) continue;
    const n = fs.statSync(file).size;
    const over = n >= LIMIT;
    if (over && !(name in pending)) {
      out.push(`skill-size: skills/${name}/SKILL.md is ${n} bytes, at or over the ${LIMIT}-byte limit. Move what only some steps need into a file beside it.`);
    } else if (!over && name in pending) {
      out.push(`skill-size: skills/${name}/SKILL.md is ${n} bytes, under the limit: delete '${name}' from PENDING.`);
    }
  }
  return out;
}

const repo = path.join(__dirname, '..', '..');

function tree(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-size-'));
  for (const [rel, body] of Object.entries(files)) {
    const f = path.join(root, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, body);
  }
  return root;
}

function checkPaths(root: string) {
  const r = spawnSync('python3', ['-I', path.join(repo, 'scripts', 'check-paths'), '--root', root], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}

// Size gate on fixtures.
const sized = tree({ 'skills/a/SKILL.md': 'x'.repeat(20000), 'skills/b/SKILL.md': 'x'.repeat(19999) });
assert.deepStrictEqual(oversize(sized, {}), [
  'skill-size: skills/a/SKILL.md is 20000 bytes, at or over the 20000-byte limit. Move what only some steps need into a file beside it.',
]);
assert.ok(
  oversize(sized, { b: 'NN' }).includes("skill-size: skills/b/SKILL.md is 19999 bytes, under the limit: delete 'b' from PENDING."),
);

// Size gate on the repository.
assert.deepStrictEqual(oversize(repo, PENDING), []);

// Broken link.
let r = checkPaths(tree({ 'skills/x/SKILL.md': '[a](./references/a.md)\n' }));
assert.strictEqual(r.code, 1);
assert.ok(r.out.includes('skills/x/SKILL.md: link ./references/a.md -> no such file'), r.out);

// URLs and anchors are not file targets.
r = checkPaths(tree({ 'skills/x/SKILL.md': '[u](https://e.com/a.md) [m](mailto:a@b.c) [h](#top)\n' }));
assert.strictEqual(r.code, 0, r.out);

// Backticked mention does not reach a file.
r = checkPaths(tree({ 'skills/x/SKILL.md': 'see `extra.md`\n', 'skills/x/extra.md': 'x\n' }));
assert.strictEqual(r.code, 1);
assert.ok(r.out.includes('skills/x/extra.md: no link from another file in skills/x/ reaches it'), r.out);

// Nested orphan.
r = checkPaths(tree({ 'skills/x/SKILL.md': 'nothing\n', 'skills/x/references/deep.md': 'x\n' }));
assert.strictEqual(r.code, 1);
assert.ok(r.out.includes('skills/x/references/deep.md: no link from another file in skills/x/ reaches it'), r.out);

// COVERAGE.md is never a namer.
r = checkPaths(tree({ 'skills/x/SKILL.md': 'nothing\n', 'skills/x/COVERAGE.md': '[e](./extra.md)\n', 'skills/x/extra.md': 'x\n' }));
assert.strictEqual(r.code, 1);
assert.ok(r.out.includes('skills/x/extra.md: no link from another file in skills/x/ reaches it'), r.out);

// Nested link resolves.
r = checkPaths(tree({ 'skills/x/SKILL.md': '[d](./references/deep.md)\n', 'skills/x/references/deep.md': 'x\n' }));
assert.strictEqual(r.code, 0, r.out);

// The repository passes.
r = checkPaths(repo);
assert.strictEqual(r.code, 0, r.out);

console.log('skill-size: OK');
