'use strict';
// For each fixture task, the head commit its original implementer reported.
//
//   node implementer-heads.js <controller.jsonl>
//
// Prints { "<NN>": "<sha>" }. The subagent transcripts beside the controller
// (<session>/subagents/*.jsonl) whose first user message contains
// "You are implementing task <NN>" are that task's implementer and fixers; the
// one with the earliest first timestamp is the original. Its head is the last
// 7 to 40 character hex SHA in its final assistant message. A task with no
// such SHA is left out, and the fixture row scores it "unknown".
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

const heads = {};
for (const task of Object.keys(original).sort()) {
  const last = original[task].recs.filter((r) => r.type === 'assistant' && textOf(r).trim()).pop();
  const shas = last ? textOf(last).match(/\b[0-9a-f]{7,40}\b/g) : null;
  if (shas) heads[task] = shas[shas.length - 1];
}
process.stdout.write(JSON.stringify(heads) + '\n');
