import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { appendEvent, currentTurn, journalCommand, journalKey, lastUserPrompt, pruneJournals, readJournal } from './journal.js';
import { JOURNAL_MAX_BYTES } from './thresholds.js';
import type { JournalEvent } from './types.js';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-journal-'));
process.on('exit', () => fs.rmSync(root, { recursive: true, force: true }));
const sessions = path.join(root, 'sessions');

assert.strictEqual(journalKey('s/1', 'a 1'), 's_1__a_1');
assert.strictEqual(journalKey('', 'a'), null);
assert.strictEqual(journalKey(7), null);
assert.strictEqual(journalKey('s1'), 's1');
assert.strictEqual(journalKey('s1', ''), 's1', 'an empty agent id adds nothing');
assert.strictEqual(journalKey('s1', 5), 's1', 'a non-string agent id adds nothing');

const prompt: JournalEvent = { t: 1, kind: 'prompt', text: 'hi' };
const edit: JournalEvent = { t: 2, kind: 'edit', path: 'a.ts' };
const tool: JournalEvent = { t: 3, kind: 'tool', tool: 'shell', command: 'ls', outcome: 'ok', verified: false };
assert.deepStrictEqual(currentTurn([tool, prompt, edit, tool]), [edit, tool]);
assert.deepStrictEqual(currentTurn([edit]), [edit]);
assert.deepStrictEqual(currentTurn([edit, prompt]), []);

// Append and read: a garbage line between two valid ones is skipped.
appendEvent('s0', prompt, root);
fs.appendFileSync(path.join(sessions, 's0.jsonl'), 'garbage\n');
appendEvent('s0', edit, root);
assert.deepStrictEqual(readJournal('s0', root), [prompt, edit]);
assert.deepStrictEqual(readJournal('missing', root), []);
if (process.platform !== 'win32') assert.strictEqual(fs.statSync(path.join(sessions, 's0.jsonl')).mode & 0o777, 0o600);

// Every string is redacted first.
appendEvent('s1', { t: 1, kind: 'tool', tool: 'shell', command: 'export TOKEN=abcdef1234567890abcdef1234567890abcdef12', outcome: 'ok', verified: false }, root);
const stored = readJournal('s1', root)[0];
assert.ok(stored && stored.kind === 'tool');
assert.ok(stored.command?.includes('[REDACTED]'));
assert.ok(!stored.command?.includes('abcdef1234567890'));
appendEvent('s1', { t: 2, kind: 'prompt', text: 'deploy with token=abc123def456ghi789' }, root);
assert.strictEqual(lastUserPrompt('s1', root), 'deploy with token=[REDACTED]');
// Tool commands are strings too.
appendEvent('s1', { t: 3, kind: 'tool', tool: 'shell', command: 'curl -H "Authorization: Bearer abc123" x', outcome: 'ok', verified: false }, root);
assert.ok(!fs.readFileSync(path.join(sessions, 's1.jsonl'), 'utf8').includes('abc123"'));

// lastUserPrompt: the last prompt wins; a null text or no journal gives null.
appendEvent('s2', { t: 1, kind: 'prompt', text: 'one' }, root);
appendEvent('s2', { t: 2, kind: 'prompt', text: null }, root);
assert.strictEqual(lastUserPrompt('s2', root), null);
assert.strictEqual(lastUserPrompt('nothing', root), null);
// The root key only: a subagent's journal is not read.
appendEvent('s3__a', { t: 1, kind: 'prompt', text: 'sub' }, root);
assert.strictEqual(lastUserPrompt('s3', root), null);

// Prune: older than seven days goes, six days stays.
const now = Date.now();
const DAY = 86400000;
for (const [name, age] of [['old', 8], ['young', 6]] as const) {
  const f = path.join(sessions, `${name}.jsonl`);
  fs.writeFileSync(f, '');
  fs.utimesSync(f, new Date(now - age * DAY), new Date(now - age * DAY));
}
pruneJournals(now, root);
assert.ok(!fs.existsSync(path.join(sessions, 'old.jsonl')));
assert.ok(fs.existsSync(path.join(sessions, 'young.jsonl')));
pruneJournals(now, path.join(root, 'nowhere'));

// A state dir that is a file: no throw, one stderr line.
const blocked = path.join(root, 'blocked');
fs.writeFileSync(blocked, '');
const written: string[] = [];
const write = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk: string | Uint8Array) => { written.push(String(chunk)); return true; };
try {
  appendEvent('s9', prompt, blocked);
} finally {
  process.stderr.write = write;
}
assert.strictEqual(written.length, 1);
assert.ok(written[0]?.startsWith('[fx] journal: '));
// Design decision 3: a journal command stops at 500 characters, and no line passes 2 KB.
// Short words: a run of 40 letters would be redacted.
assert.strictEqual(journalCommand('ab '.repeat(200)), `${'ab '.repeat(200).slice(0, 500)}[...]`);
appendEvent('cap', { t: 1, kind: 'tool', tool: 'shell', command: 'ab '.repeat(300), outcome: 'ok', verified: false }, root);
appendEvent('cap', { t: 2, kind: 'prompt', text: 'é'.repeat(1500) }, root);
appendEvent('cap', { t: 3, kind: 'prompt', text: '"'.repeat(1500) }, root);
const capLines = fs.readFileSync(path.join(sessions, 'cap.jsonl'), 'utf8').split('\n').filter(Boolean);
assert.strictEqual(capLines.length, 3);
for (const l of capLines) assert.ok(Buffer.byteLength(l) <= 2048, `a line of ${Buffer.byteLength(l)} bytes`);
const capEvents = readJournal('cap', root);
assert.deepStrictEqual(capEvents[0], { t: 1, kind: 'tool', tool: 'shell', command: `${'ab '.repeat(300).slice(0, 500)}[...]`, outcome: 'ok', verified: false });
assert.ok(capEvents[1]?.kind === 'prompt' && capEvents[1].text?.startsWith('éé'), 'a cut prompt keeps its start');

// A journal past its size limit keeps the newest events, its first prompt (the
// subagent's type) and the current turn's prompt.
assert.strictEqual(JOURNAL_MAX_BYTES, 262144);
appendEvent('big', { t: 1, kind: 'prompt', text: null, agentType: 'fx-review' }, root);
for (let i = 0; i < 1000; i++) appendEvent('big', { t: 2, kind: 'tool', tool: 'shell', command: `old ${i} ${'o'.repeat(100)}`, outcome: 'ok', verified: false }, root);
appendEvent('big', { t: 3, kind: 'prompt', text: 'current' }, root);
for (let i = 0; i < 2000; i++) appendEvent('big', { t: 4, kind: 'edit', path: `/r/f${i}-${'p '.repeat(50)}.ts` }, root);
assert.ok(fs.statSync(path.join(sessions, 'big.jsonl')).size <= JOURNAL_MAX_BYTES, 'the journal was cut back');
const big = readJournal('big', root);
assert.deepStrictEqual(big[0], { t: 1, kind: 'prompt', text: null, agentType: 'fx-review' });
assert.ok(big.some((e) => e.kind === 'prompt' && e.text === 'current'), 'the current turn keeps its prompt');
assert.ok(!big.some((e) => e.kind === 'tool'), 'the oldest events went');
const bigTurn = currentTurn(big);
assert.deepStrictEqual(bigTurn.at(-1), { t: 4, kind: 'edit', path: `/r/f1999-${'p '.repeat(50)}.ts` });
assert.ok(bigTurn.every((e) => e.kind === 'edit'));
if (process.platform !== 'win32') assert.strictEqual(fs.statSync(path.join(sessions, 'big.jsonl')).mode & 0o777, 0o600);
// The newest .fx.json baseline survives a cut, so the change notice never re-baselines silently.
appendEvent('fxj', { t: 1, kind: 'prompt', text: 'go' }, root);
appendEvent('fxj', { t: 1, kind: 'fx-json-hooks', hash: 'old' }, root);
appendEvent('fxj', { t: 1, kind: 'fx-json-hooks', hash: 'newest' }, root);
for (let i = 0; i < 3000; i++) appendEvent('fxj', { t: 2, kind: 'edit', path: `/r/f${i}-${'p '.repeat(50)}.ts` }, root);
assert.ok(fs.statSync(path.join(sessions, 'fxj.jsonl')).size <= JOURNAL_MAX_BYTES, 'the journal was cut back');
assert.deepStrictEqual(readJournal('fxj', root).filter((e) => e.kind === 'fx-json-hooks'), [{ t: 1, kind: 'fx-json-hooks', hash: 'newest' }]);

// A reader reads only the tail: a file that grew past the limit some other way
// is read from its last JOURNAL_MAX_BYTES, and a cut first line is skipped.
const raw = path.join(sessions, 'raw.jsonl');
fs.writeFileSync(raw, `${JSON.stringify({ t: 1, kind: 'prompt', text: 'oldest' })}\n`);
fs.appendFileSync(raw, `${JSON.stringify({ t: 2, kind: 'edit', path: 'q'.repeat(400) })}\n`.repeat(1000));
fs.appendFileSync(raw, `${JSON.stringify({ t: 3, kind: 'stop-block' })}\n`);
const tail = readJournal('raw', root);
assert.ok(!tail.some((e) => e.kind === 'prompt'), 'the head of the file was not read');
assert.deepStrictEqual(tail.at(-1), { t: 3, kind: 'stop-block' });
assert.ok(tail.length < 1000 && tail.length > 500);

console.log('journal.test.js: ok');
