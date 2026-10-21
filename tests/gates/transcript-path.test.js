'use strict';
// Run: node tests/gates/transcript-path.test.js
// ADR 0040: the SessionStart hook records the session's transcript path for
// build-cost; a subagent start records nothing.
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const hook = path.join(__dirname, '..', '..', 'hooks', 'fx-context.js');
const run = (cwd, event) => spawnSync(process.execPath, [hook], { input: JSON.stringify({ cwd, ...event }), encoding: 'utf8' });
const file = (cwd) => path.join(cwd, '.fx', 'transcript-path');

const a = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-tp-'));
const r = run(a, { hook_event_name: 'SessionStart', transcript_path: '/x/s1.jsonl' });
assert.strictEqual(r.status, 0, r.stderr);
assert.ok(JSON.parse(r.stdout).hookSpecificOutput.additionalContext.length > 0, 'the preamble is still emitted');
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
assert.ok(JSON.parse(g.stdout).hookSpecificOutput.additionalContext.length > 0, 'the preamble is still emitted');
assert.ok(!fs.existsSync(file(c)), 'a git work tree without an ignore rule for .fx gets no file');

// ...and where .fx is ignored, the file is written.
const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-tp-'));
spawnSync('git', ['init', '-q'], { cwd: d });
fs.writeFileSync(path.join(d, '.gitignore'), '.fx/\n');
run(d, { hook_event_name: 'SessionStart', transcript_path: '/x/s3.jsonl' });
assert.strictEqual(fs.readFileSync(file(d), 'utf8'), '/x/s3.jsonl\n');

console.log('transcript-path: OK');
