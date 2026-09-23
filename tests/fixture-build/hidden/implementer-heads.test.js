'use strict';
// Run: node tests/fixture-build/hidden/implementer-heads.test.js
// Synthetic controller and subagent transcripts; checks which commit each
// task's original implementer reported as its head.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const BIN = path.join(__dirname, 'implementer-heads.js');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-heads-'));
const ts = (s) => new Date(Date.UTC(2026, 0, 1, 0, 0, s)).toISOString();
const user = (t, text) => ({ type: 'user', timestamp: ts(t), message: { content: text } });
const asst = (t, text) => ({ type: 'assistant', timestamp: ts(t), message: { content: [{ type: 'text', text }] } });
const write = (file, recs) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, recs.map((r) => JSON.stringify(r)).join('\n') + '\n'); };

const ctl = path.join(root, 'sess.jsonl');
write(ctl, [user(0, 'build it'), asst(1, 'dispatching')]);
const sub = path.join(root, 'sess', 'subagents');
// The fixer sorts first by name and starts later: the earliest timestamp wins.
write(path.join(sub, 'a-fixer.jsonl'), [
  user(50, 'You are implementing task 01: store. If this is a fix round, append to the report.'),
  asst(60, 'Fixed. Commits 1111111..2222222'),
]);
write(path.join(sub, 'b-implementer.jsonl'), [
  user(10, [{ type: 'text', text: 'You are implementing task 01: store' }]),
  asst(20, 'Working from base abcdef0, will commit next.'),
  asst(30, 'Status: DONE. Commits 3333333..4444444abc, see report.'),
]);
// The reviewer starts first: counting it as an implementer would change the answer.
write(path.join(sub, 'c-reviewer.jsonl'), [
  user(5, "You are reviewing one task's implementation: task 01"),
  asst(7, 'Reviewed 5555555. Clean.'),
]);
write(path.join(sub, 'd-implementer.jsonl'), [
  user(70, 'You are implementing task 02: cli add and show'),
  asst(80, 'Status: BLOCKED, nothing committed.'),
]);
// fx-implement resumes the same agent for a fix round: the file's final
// message is the post-fix head, but review judged the first reply's head
// (SHA A), so that is what must come out, not the later fix's head (SHA B).
const toolResult = (t, id) => ({ type: 'user', timestamp: ts(t), message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'ok' }] } });
write(path.join(sub, 'e-implementer.jsonl'), [
  user(90, 'You are implementing task 03: readme'),
  asst(91, 'Reading the task file.'),
  toolResult(92, 'tool-1'),
  asst(93, 'Status: DONE. Commits aaaaaaa..bbbbbbb, see report.'),
  user(94, 'Task 03, fix round 1 of 5'),
  asst(95, 'Fixed. Commits ccccccc..ddddddd, see report.'),
]);

assert.deepStrictEqual(JSON.parse(execFileSync('node', [BIN, ctl], { encoding: 'utf8' })), { '01': '4444444abc', '03': 'bbbbbbb' });

const p = spawnSync('node', [BIN], { encoding: 'utf8' });
assert.strictEqual(p.status, 2, 'no argument exits 2');
fs.rmSync(root, { recursive: true, force: true });
console.log('implementer-heads test: ok');
