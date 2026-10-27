// Run: node scripts/plan-check.test.js
// plan-check gates a build's artifacts before a completion claim (e2e bug 4).
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

const BIN = path.join(__dirname, 'plan-check');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-plan-check-'));
const git = (cwd: string, ...a: string[]) => assert.strictEqual(spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd }).status, 0, `git ${a.join(' ')}`);
git(root, 'init', '-q', '-b', 'main');
git(root, 'commit', '-q', '--allow-empty', '-m', 'init');
git(root, 'checkout', '-q', '-b', 'feature');

const plan = path.join(root, 'docs', 'plans', 'p');
const put = (rel: string, body: string) => { const f = path.join(plan, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, body); };
const del = (rel: string) => fs.rmSync(path.join(plan, rel), { force: true, recursive: true });
const check = () => spawnSync(process.execPath, [BIN, plan], { encoding: 'utf8', cwd: root });
const good = () => {
  del('');
  put('design.md', '# D\n\n**Status:** approved\n**Approved:** 2026-10-27\n');
  put('plan.md', '# P\n\n| # | Title | Blocked by |\n|---|---|---|\n| 01 | One | none |\n| 02 | Two | 01 |\n');
  put('tasks/01-one.md', '# 01\n');
  put('tasks/02-two.md', '# 02\n');
  put('state.md', 'Task 01: complete (commits a..b, review clean)\nTask 02: parked: needs you: x\nFinal review: clean\nExit gate: scripts/check-all: ALL GREEN\nDocs: offer pending\nADR candidates: none\n');
};

// A complete plan passes, one line per check.
good();
let r = check();
assert.strictEqual(r.status, 0, r.stdout + r.stderr);
assert.strictEqual(r.stdout.split('\n').filter((l) => l.startsWith('ok ')).length, 6, `six checks pass:\n${r.stdout}`);

const fails = (why: string, expect: RegExp) => {
  r = check();
  assert.strictEqual(r.status, 1, `${why}: exits 1\n${r.stdout}`);
  assert.match(r.stdout, expect, why);
  good();
};

put('design.md', '# D\n\n**Status:** draft\n');
fails('a design with no Approved line', /^FAIL design\.md/m);
del('design.md');
fails('no design.md', /^FAIL design\.md/m);
put('design.md', '**Approved:** yes\n');
fails('an Approved line with no date', /^FAIL design\.md/m);

del('tasks');
fails('tasks inline in plan.md, no tasks/', /^FAIL tasks: no task file for 01, 02/m);
del('tasks/02-two.md');
fails('a task row with no file', /^FAIL tasks: no task file for 02/m);
put('tasks/03-three.md', '# 03\n');
fails('a task file with no row', /^FAIL tasks: 03-three\.md has no row/m);
del('plan.md');
fails('no plan.md', /^FAIL plan\.md/m);

del('state.md');
fails('no state.md', /^FAIL state\.md/m);
put('state.md', 'Task 01: complete (x)\nFinal review: clean\nExit gate: ok\n');
fails('a task with no complete or parked line', /^FAIL tasks done: 02 has no/m);
put('state.md', 'Task 01: complete (x)\nTask 02: complete (y)\nExit gate: ok\n');
fails('no Final review line', /^FAIL ledger: no Final review: line/m);
put('state.md', 'Task 01: complete (x)\nTask 02: complete (y)\nFinal review: clean\n');
fails('no Exit gate line', /^FAIL ledger: no Exit gate: line/m);
put('state.md', 'Task 01: complete (x)\nTask 02: complete (y)\nFinal review: clean\nExit gate: ok\nADR candidates: none\n');
fails('no Docs line: the docs offer never reached the owner', /^FAIL ledger: no Docs: line/m);
put('state.md', 'Task 01: complete (x)\nTask 02: complete (y)\nFinal review: clean\nExit gate: ok\nDocs: offer pending\n');
fails('no ADR candidates line', /^FAIL ledger: no ADR candidates: line/m);

put('findings/08-review.md', 'fine\nan em \u2014 dash\n');
fails('an em dash in a findings file', /^FAIL dashes: findings\/08-review\.md:2/m);
put('state.md', 'Task 01: complete (x \u2013 y)\nTask 02: complete (y)\nFinal review: clean\nExit gate: ok\n');
fails('an en dash in the ledger', /^FAIL dashes: state\.md:1/m);

git(root, 'checkout', '-q', 'main');
fails('the work branch is main', /^FAIL branch: main/m);
git(root, 'checkout', '-q', 'feature');

r = spawnSync(process.execPath, [BIN], { encoding: 'utf8' });
assert.strictEqual(r.status, 2, 'no plan dir is a usage error');

fs.rmSync(root, { recursive: true, force: true });
console.log('plan-check: ok');
