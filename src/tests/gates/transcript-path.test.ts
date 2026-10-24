// Run: node tests/gates/transcript-path.test.js
// ADR 0040: the SessionStart hook records the session's transcript path for
// build-cost; a subagent start records nothing.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { scratchHookEnv } from '../helpers/hook-env.js';

const scratch = scratchHookEnv();
process.on('exit', scratch.cleanup);

const hook = path.join(__dirname, '..', '..', 'hooks', 'fx-context.js');
const run = (cwd: string, event: Record<string, unknown>) => spawnSync(process.execPath, [hook], { input: JSON.stringify({ cwd, ...event }), encoding: 'utf8', env: scratch.env });
const file = (cwd: string) => path.join(cwd, '.fx', 'transcript-path');

const a = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-tp-'));
const r = run(a, { hook_event_name: 'SessionStart', transcript_path: '/x/s1.jsonl' });
assert.strictEqual(r.status, 0, r.stderr);
assert.ok(JSON.parse(r.stdout).hookSpecificOutput.additionalContext.length > 0, 'the preamble is still emitted'); // ts-gate-ok: the test parses output it just produced
assert.strictEqual(fs.readFileSync(file(a), 'utf8'), '/x/s1.jsonl\n');

const b = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-tp-'));
const s = run(b, { hook_event_name: 'SubagentStart', transcript_path: '/x/sub.jsonl' });
assert.strictEqual(s.status, 0, s.stderr);
assert.ok(!fs.existsSync(file(b)), 'a subagent start records nothing');

// Ruling B: in a git work tree where .fx is not ignored, writing .fx would dirty the tree.
const c = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-tp-'));
assert.strictEqual(spawnSync('git', ['init', '-q'], { cwd: c }).status, 0, 'git init');
const g = run(c, { hook_event_name: 'SessionStart', transcript_path: '/x/s2.jsonl' });
assert.strictEqual(g.status, 0, g.stderr);
assert.ok(JSON.parse(g.stdout).hookSpecificOutput.additionalContext.length > 0, 'the preamble is still emitted'); // ts-gate-ok: the test parses output it just produced
assert.ok(!fs.existsSync(file(c)), 'a git work tree without an ignore rule for .fx gets no file');

// ...and where .fx is ignored, the file is written.
const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-tp-'));
spawnSync('git', ['init', '-q'], { cwd: d });
fs.writeFileSync(path.join(d, '.gitignore'), '.fx/\n');
run(d, { hook_event_name: 'SessionStart', transcript_path: '/x/s3.jsonl' });
assert.strictEqual(fs.readFileSync(file(d), 'utf8'), '/x/s3.jsonl\n');

// A stale path from an earlier session is cleared when this session writes nothing,
// so build-cost reports "no transcript recorded" instead of an old session's cost.
const stale = (cwd: string) => { fs.mkdirSync(path.join(cwd, '.fx')); fs.writeFileSync(file(cwd), '/old/session.jsonl\n'); };
const e = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-tp-'));
stale(e);
const n = run(e, { hook_event_name: 'SessionStart' });
assert.strictEqual(n.status, 0, n.stderr);
assert.ok(!fs.existsSync(file(e)), 'a session with no transcript_path clears the stale file');

const f = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-tp-'));
stale(f);
const noGit = spawnSync(process.execPath, [hook], { input: JSON.stringify({ cwd: f, hook_event_name: 'SessionStart', transcript_path: '/x/s4.jsonl' }), encoding: 'utf8', env: { ...scratch.env, PATH: '/nonexistent' } });
assert.strictEqual(noGit.status, 0, noGit.stderr);
assert.ok(!fs.existsSync(file(f)), 'a git failure clears the stale file instead of leaving it');
assert.ok(JSON.parse(noGit.stdout).hookSpecificOutput.additionalContext.length > 0, 'the preamble is still emitted'); // ts-gate-ok: the test parses output it just produced

const h = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-tp-'));
spawnSync('git', ['init', '-q'], { cwd: h });
run(h, { hook_event_name: 'SessionStart', transcript_path: '/x/s5.jsonl' });
assert.ok(!fs.existsSync(path.join(h, '.fx')), 'clearing never creates .fx/');

console.log('transcript-path: OK');
