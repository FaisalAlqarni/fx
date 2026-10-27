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

// E2E bug 3: the path lives in <git common dir>/fx/transcript-path, which git never
// tracks and every worktree of the repo shares, so no ignore rule is needed.
const common = (cwd: string) => path.join(cwd, '.git', 'fx', 'transcript-path');
const repo = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-tp-')); assert.strictEqual(spawnSync('git', ['init', '-q'], { cwd: d }).status, 0, 'git init'); return d; };
const git = (cwd: string, ...args: string[]) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8' });

// A repo with no .gitignore gets the file, and the work tree stays clean.
const c = repo();
const g = run(c, { hook_event_name: 'SessionStart', transcript_path: '/x/s2.jsonl' });
assert.strictEqual(g.status, 0, g.stderr);
assert.ok(JSON.parse(g.stdout).hookSpecificOutput.additionalContext.length > 0, 'the preamble is still emitted'); // ts-gate-ok: the test parses output it just produced
assert.strictEqual(fs.readFileSync(common(c), 'utf8'), '/x/s2.jsonl\n', 'the path is recorded in the git common dir');
assert.strictEqual(git(c, 'status', '--porcelain').stdout, '', 'recording the path leaves the work tree clean');
assert.ok(!fs.existsSync(file(c)), 'nothing is written under the work tree');

// From a linked worktree, the path lands in the main checkout's common dir.
const m = repo();
assert.strictEqual(git(m, 'commit', '-q', '--allow-empty', '-m', 'init').status, 0, 'commit');
const wt = path.join(m, '.wt');
assert.strictEqual(git(m, 'worktree', 'add', '-q', '-b', 'wtb', wt).status, 0, 'worktree add');
run(wt, { hook_event_name: 'SessionStart', transcript_path: '/x/wt.jsonl' });
assert.strictEqual(fs.readFileSync(common(m), 'utf8'), '/x/wt.jsonl\n', 'a worktree session records into the shared common dir');

// Not a git repo: nothing is written.
const a = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-tp-'));
const r = run(a, { hook_event_name: 'SessionStart', transcript_path: '/x/s1.jsonl' });
assert.strictEqual(r.status, 0, r.stderr);
assert.ok(JSON.parse(r.stdout).hookSpecificOutput.additionalContext.length > 0, 'the preamble is still emitted'); // ts-gate-ok: the test parses output it just produced
assert.ok(!fs.existsSync(path.join(a, '.fx')), 'outside git the hook writes nothing');

const b = repo();
const s = run(b, { hook_event_name: 'SubagentStart', transcript_path: '/x/sub.jsonl' });
assert.strictEqual(s.status, 0, s.stderr);
assert.ok(!fs.existsSync(common(b)), 'a subagent start records nothing');

// A stale path from an earlier session is cleared when this session has none,
// so build-cost reports "no transcript recorded" instead of an old session's cost.
const e = repo();
run(e, { hook_event_name: 'SessionStart', transcript_path: '/old/session.jsonl' });
const n = run(e, { hook_event_name: 'SessionStart' });
assert.strictEqual(n.status, 0, n.stderr);
assert.ok(!fs.existsSync(common(e)), 'a session with no transcript_path clears the stale file');

// git missing: the preamble is still emitted.
const f = repo();
const noGit = spawnSync(process.execPath, [hook], { input: JSON.stringify({ cwd: f, hook_event_name: 'SessionStart', transcript_path: '/x/s4.jsonl' }), encoding: 'utf8', env: { ...scratch.env, PATH: '/nonexistent' } });
assert.strictEqual(noGit.status, 0, noGit.stderr);
assert.ok(JSON.parse(noGit.stdout).hookSpecificOutput.additionalContext.length > 0, 'the preamble is still emitted'); // ts-gate-ok: the test parses output it just produced

console.log('transcript-path: OK');
