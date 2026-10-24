import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { logDecision, type DecisionLogEntry } from './decision-log.js';
import { parseJson } from './json.js';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-decision-log-'));
process.on('exit', () => fs.rmSync(root, { recursive: true, force: true }));
const state = path.join(root, 'state', 'fx');
const file = path.join(state, 'decisions.jsonl');
const lines = (f: string) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => parseJson(l));

const entry: DecisionLogEntry = {
  ts: '2026-10-22T00:00:00.000Z', harness: 'claude-code', event: 'guard', session: 's1', cwd: '/w',
  text: 'export TOKEN=abc && ls', source: 'grey', action: 'allow',
};

// One call, one line, text redacted, created in a state dir that did not exist.
logDecision(entry, state);
assert.deepStrictEqual(lines(file), [{ ...entry, text: 'export TOKEN=[REDACTED] && ls' }]);
if (process.platform !== 'win32') assert.strictEqual(fs.statSync(file).mode & 0o777, 0o600);
logDecision(entry, state);
assert.strictEqual(lines(file).length, 2);

// Past 5 MB the file moves aside, replacing an older one, before the next append.
fs.writeFileSync(path.join(state, 'decisions.1.jsonl'), 'old\n');
fs.writeFileSync(file, 'x'.repeat(5242881));
logDecision(entry, state);
assert.strictEqual(fs.statSync(path.join(state, 'decisions.1.jsonl')).size, 5242881);
assert.strictEqual(lines(file).length, 1);

// Rotation runs under a lock (final review, lens minor 3): while another hook holds it, this one
// appends and leaves the older generation alone, so two rotations at once never lose it.
const lock = path.join(state, 'decisions.rotate.lock');
fs.writeFileSync(path.join(state, 'decisions.1.jsonl'), 'old\n');
fs.writeFileSync(file, 'x'.repeat(5242881));
fs.writeFileSync(lock, '');
logDecision(entry, state);
assert.strictEqual(fs.readFileSync(path.join(state, 'decisions.1.jsonl'), 'utf8'), 'old\n');
assert.strictEqual(fs.statSync(file).size > 5242881, true, 'appended to the current log');
assert.ok(fs.existsSync(lock), 'another hook\'s lock is not taken');
// A lock a crashed hook left behind for more than ten seconds is cleared, and the log rotates.
fs.utimesSync(lock, new Date(Date.now() - 11000), new Date(Date.now() - 11000));
logDecision(entry, state);
assert.ok(fs.statSync(path.join(state, 'decisions.1.jsonl')).size > 5242881);
assert.strictEqual(lines(file).length, 1);
assert.ok(!fs.existsSync(lock), 'the lock is released');

// Every string field is redacted, not only text.
const loose = path.join(root, 'loose');
logDecision({ ...entry, session: 'TOKEN=s1', cwd: '/w/TOKEN=c', source: 'TOKEN=src', action: 'TOKEN=a', unavailable: 'TOKEN=u' }, loose);
const [line] = lines(path.join(loose, 'decisions.jsonl'));
assert.deepStrictEqual(line, {
  ...entry, text: 'export TOKEN=[REDACTED] && ls', session: 'TOKEN=[REDACTED]', cwd: '/w/TOKEN=[REDACTED]', source: 'TOKEN=[REDACTED]',
  action: 'TOKEN=[REDACTED]', unavailable: 'TOKEN=[REDACTED]',
});

// A long path is not a secret: cwd keeps its value unless it names one.
const longCwd = '/home/faisal/development/projects/backend/src/main';
logDecision({ ...entry, cwd: longCwd }, loose);
assert.strictEqual((lines(path.join(loose, 'decisions.jsonl'))[1] as { cwd?: unknown }).cwd, longCwd);

// An existing directory and file are tightened, not only new ones.
if (process.platform !== 'win32') {
  fs.chmodSync(loose, 0o755);
  fs.chmodSync(path.join(loose, 'decisions.jsonl'), 0o644);
  logDecision(entry, loose);
  assert.strictEqual(fs.statSync(loose).mode & 0o777, 0o700);
  assert.strictEqual(fs.statSync(path.join(loose, 'decisions.jsonl')).mode & 0o777, 0o600);
}

// A state dir that is a file: no throw, one stderr line.
const blocked = path.join(root, 'blocked');
fs.writeFileSync(blocked, '');
const written: string[] = [];
const write = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk: string | Uint8Array) => { written.push(String(chunk)); return true; };
try {
  logDecision(entry, blocked);
} finally {
  process.stderr.write = write;
}
assert.strictEqual(written.length, 1, written.join(''));
assert.ok(written[0]?.startsWith('[fx] decision log:'), written[0]);
assert.ok(written[0]?.endsWith('\n'));

