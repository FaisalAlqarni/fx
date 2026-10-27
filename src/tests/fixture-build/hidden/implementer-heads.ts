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
// checked. A task with no such SHA is left out, and the fixture row scores it
// "unknown".
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from '../../../lib/json.js';

function fail(msg: string): never {
  process.stderr.write(msg + '\n');
  process.exit(2);
}

// Property read with JavaScript's own failure on null and undefined, so a
// transcript line of `null` crashes here exactly as it did before the port.
function get(v: unknown, key: string): unknown {
  if (v === null || v === undefined) throw new TypeError(`Cannot read properties of ${v} (reading '${key}')`);
  return Reflect.get(Object(v), key);
}

const file = process.argv[2];
if (!file) fail('usage: implementer-heads.js <controller.jsonl>');
if (!fs.existsSync(file)) fail(`file not found: ${file}`);

// `rec.message && rec.message.content`
function contentOf(rec: unknown): unknown {
  const m = get(rec, 'message');
  return m && get(m, 'content');
}

// Same reading as scripts/build-cost: a string, or the text blocks of an array.
function textOf(rec: unknown): string {
  const c = contentOf(rec);
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    const parts: string[] = [];
    for (const b of c) {
      if (!b || get(b, 'type') !== 'text') continue;
      const t = get(b, 'text');
      if (typeof t === 'string') parts.push(t);
    }
    return parts.join('\n');
  }
  return '';
}

function records(f: string): unknown[] {
  return fs.readFileSync(f, 'utf8').split('\n').flatMap((line, i): unknown[] => {
    if (!line.trim()) return [];
    try { return [parseJson(line)]; } catch (e) { return fail(`malformed JSON: ${f}:${i + 1}`); }
  });
}

const dir = path.join(path.dirname(file), path.basename(file, '.jsonl'), 'subagents');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(dir, f)) : [];

const original: Record<string, { start: number; recs: unknown[] }> = {};  // task -> { start, recs }
for (const f of files) {
  const recs = records(f);
  const first = recs.find((r) => get(r, 'type') === 'user');
  const m = first === undefined ? null : textOf(first).match(/You are implementing task (\d+)/);
  if (!m) continue;
  const task = (m[1] ?? '').padStart(2, '0');
  const start = Math.min(...recs.map((r) => Date.parse(String(get(r, 'timestamp')))).filter((t) => !Number.isNaN(t)));
  const prior = original[task];
  if (!prior || start < prior.start) original[task] = { start, recs };
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
function isToolResultOrSkillExpansion(rec: unknown): boolean {
  const c = contentOf(rec);
  if (Array.isArray(c) && c.length > 0 && c.every((b) => b && get(b, 'type') === 'tool_result')) return true;
  return get(rec, 'isMeta') === true && textOf(rec).startsWith(SKILL_EXPANSION);
}

// The last assistant text record before the first later user record that is
// a real new message: the implementer's first reply. Absent any such later
// user record (no fix round happened), that is the last assistant text in
// the whole file, same as today.
function firstReply(recs: unknown[]): unknown {
  const dispatch = recs.findIndex((r) => get(r, 'type') === 'user');
  let boundary = recs.length;
  for (let i = dispatch + 1; i < recs.length; i++) {
    const r = recs[i];
    if (get(r, 'type') !== 'user') continue;
    if (isToolResultOrSkillExpansion(r)) continue;
    boundary = i;
    break;
  }
  for (let i = boundary - 1; i > dispatch; i--) {
    if (get(recs[i], 'type') === 'assistant' && textOf(recs[i]).trim()) return recs[i];
  }
  return null;
}

const heads: Record<string, string> = {};
for (const task of Object.keys(original).sort()) {
  const reply = firstReply(original[task]?.recs ?? []);
  const text = reply ? textOf(reply) : '';
  // The reply's own Commits: <base>..<head> range first: a bare hex run also
  // matches a session id inside a report path (e2e bug 9).
  const range = /\bCommits:? ([0-9a-f]{7,40})\.\.([0-9a-f]{7,40})\b/.exec(text);
  const shas = text.match(/\b[0-9a-f]{7,40}\b/g);
  if (range) heads[task] = range[2] ?? '';
  else if (shas) heads[task] = shas[shas.length - 1] ?? '';
}
process.stdout.write(JSON.stringify(heads) + '\n');
