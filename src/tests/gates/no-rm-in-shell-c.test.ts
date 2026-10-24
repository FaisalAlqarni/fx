// Run: node tests/gates/no-rm-in-shell-c.test.js
//
// Claude Code cannot inspect a bash -c string, so one that runs rm stops the
// session for a permission prompt (design decision 14, final review lens I6).
// Gates: .fx.json holds no -c quoted script with rm or trap in it; PREAMBLE.md
// carries the rule; scripts/test-one runs a test and leaves no fixture behind.
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

const root = path.join(__dirname, '..', '..');

const BULLET =
  "- **No rm inside a shell -c string.** Never put rm inside a bash -c or similar quoted script: Claude Code cannot inspect it and stops for a permission prompt. Leave scratch files for a later cleanup instead of deleting them in a -c string; fx's own commands carry their cleanup in script files.";

const config: unknown = JSON.parse(fs.readFileSync(path.join(root, '.fx.json'), 'utf8')); // ts-gate-ok: the test parses a repository file
assert.ok(typeof config === 'object' && config !== null, '.fx.json is an object');
const bad = Object.entries(config)
  .filter(([, v]) => typeof v === 'string' && /-c\s+['"]/.test(v) && (/\brm\s/.test(v) || /\btrap\b/.test(v)))
  .map(([k]) => k);
assert.deepStrictEqual(bad, [], `.fx.json values run rm or trap inside a -c string: ${bad.join(', ')}`);

assert.ok(fs.readFileSync(path.join(root, 'PREAMBLE.md'), 'utf8').includes(BULLET), 'PREAMBLE.md lacks the no-rm bullet verbatim');

// Process tests. The script under test is argv[2] when given, so the cases can
// be run against a broken copy; the default is the repository's scripts/test-one.
const script = process.argv[2] ?? path.join(root, 'scripts', 'test-one');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-no-rm-'));
const env = { ...process.env, HOME: scratch, TMPDIR: scratch };
const run = (...args: string[]) => spawnSync(script, args, { cwd: root, env, encoding: 'utf8', timeout: 600000 });
const out = (r: ReturnType<typeof run>) => `${String(r.status)}\n${r.stdout}\n${r.stderr}`;

// git-guard.test.ts reads both fixture paths from its arguments: a quoted $F
// hands it one argument and it fails.
const pass = run('src/lib/git-guard.test.ts');
assert.strictEqual(pass.status, 0, `test-one on git-guard.test.ts: ${out(pass)}`);
// A test that fails must fail the script: node's status is the script's status.
const fail = run('src/lib/no-such-test.test.ts');
assert.ok(fail.status !== null && fail.status !== 0, `test-one on a missing test exited 0: ${out(fail)}`);
// No argument: usage on stderr and exit 2, before any build or fixture.
const none = run();
assert.strictEqual(none.status, 2, `test-one with no argument: ${out(none)}`);
assert.ok(/usage/i.test(none.stderr), `test-one with no argument prints no usage: ${out(none)}`);
// A path that leaves the repository is refused the same way (final review, lens minor 8).
for (const arg of ['/tmp/x.test.ts', '../x.test.ts', 'src/../../x.test.ts']) {
  const r = run(arg);
  assert.strictEqual(r.status, 2, `test-one ${arg}: ${out(r)}`);
  assert.ok(/usage/i.test(r.stderr), `test-one ${arg} prints no usage: ${out(r)}`);
}
const left = fs.readdirSync(scratch);
assert.deepStrictEqual(left, [], `scripts/test-one left files in TMPDIR: ${left.join(', ')}`);
fs.rmdirSync(scratch);
console.log('no-rm-in-shell-c.test.js: ok');
