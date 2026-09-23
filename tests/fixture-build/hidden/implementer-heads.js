'use strict';
// For each fixture task, the head commit its original implementer reported.
//
//   node implementer-heads.js <controller.jsonl>
//
// Prints { "<NN>": "<sha>" }. The subagent transcripts beside the controller
// (<session>/subagents/*.jsonl) whose first user message contains
// "You are implementing task <NN>" are that task's implementer and fixers; the
// one with the earliest first timestamp is the original. Its head is the last
// 7 to 40 character hex SHA in its FIRST REPLY: the last assistant text
// before the first later user record that is neither a tool result nor a
// skill expansion (amended 2026-09-23, Ruling I). fx-implement resumes the
// same agent for fix rounds 1 to 3, so without this the file's final message
// would be read as the head, which is the post-fix head, not the one review
// judged. A task with no such SHA is left out, and the fixture row scores it
// "unknown".
const fs = require('fs');
const path = require('path');

function fail(msg) {
  process.stderr.write(msg + '\n');
  process.exit(2);
}

const file = process.argv[2];
if (!file) fail('usage: implementer-heads.js <controller.jsonl>');
if (!fs.existsSync(file)) fail(`file not found: ${file}`);

// Same reading as scripts/build-cost: a string, or the text blocks of an array.
function textOf(rec) {
  const c = rec.message && rec.message.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.filter((b) => b && b.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('\n');
  return '';
}

function records(f) {
  return fs.readFileSync(f, 'utf8').split('\n').flatMap((line, i) => {
    if (!line.trim()) return [];
    try { return [JSON.parse(line)]; } catch (e) { return fail(`malformed JSON: ${f}:${i + 1}`); }
  });
}

const dir = path.join(path.dirname(file), path.basename(file, '.jsonl'), 'subagents');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(dir, f)) : [];

const original = {};  // task -> { start, recs }
for (const f of files) {
  const recs = records(f);
  const first = recs.find((r) => r.type === 'user');
  const m = first && textOf(first).match(/You are implementing task (\d+)/);
  if (!m) continue;
  const task = m[1].padStart(2, '0');
  const start = Math.min(...recs.map((r) => Date.parse(r.timestamp)).filter((t) => !Number.isNaN(t)));
  if (!original[task] || start < original[task].start) original[task] = { start, recs };
}

// A boundary record: a real new coordinator message, not the async plumbing
// around a tool call. A tool result is every block of an array content typed
// tool_result. A skill expansion is specifically an isMeta record whose text
// starts "Base directory for this skill:" (amended 2026-09-23, fix round 2):
// isMeta alone is not enough, because the coordinator's own fix-round message
// is isMeta too (a real resumed-agent transcript's record 166, "The
// coordinator sent a message while you were working: ..."), and that one
// must end the first reply exactly like a plain user record does.
const SKILL_EXPANSION = 'Base directory for this skill:';
function isToolResultOrSkillExpansion(rec) {
  const c = rec.message && rec.message.content;
  if (Array.isArray(c) && c.length > 0 && c.every((b) => b && b.type === 'tool_result')) return true;
  return rec.isMeta === true && textOf(rec).startsWith(SKILL_EXPANSION);
}

// The last assistant text record before the first later user record that is
// a real new message: the implementer's first reply. Absent any such later
// user record (no fix round happened), that is the last assistant text in
// the whole file, same as today.
function firstReply(recs) {
  const dispatch = recs.findIndex((r) => r.type === 'user');
  let boundary = recs.length;
  for (let i = dispatch + 1; i < recs.length; i++) {
    const r = recs[i];
    if (r.type !== 'user') continue;
    if (isToolResultOrSkillExpansion(r)) continue;
    boundary = i;
    break;
  }
  for (let i = boundary - 1; i > dispatch; i--) {
    if (recs[i].type === 'assistant' && textOf(recs[i]).trim()) return recs[i];
  }
  return null;
}

const heads = {};
for (const task of Object.keys(original).sort()) {
  const reply = firstReply(original[task].recs);
  const shas = reply ? textOf(reply).match(/\b[0-9a-f]{7,40}\b/g) : null;
  if (shas) heads[task] = shas[shas.length - 1];
}
process.stdout.write(JSON.stringify(heads) + '\n');
