// Run: node lib/loop-tracker.test.js
// The three stuck-loop rules over journal event lists (checkSignals), and the
// recording of one tool result (recordToolResult) under a scratch state dir.
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readJournal } from './journal.js';
import { checkSignals, recordToolResult } from './loop-tracker.js';
import type { JournalEvent } from './types.js';

let t = 0;
const tool = (kind: 'edit' | 'read' | 'shell' | 'other', command: string | null = null, outcome: 'ok' | 'fail' | 'unknown' = 'ok', verified = false): JournalEvent => ({ t: ++t, kind: 'tool', tool: kind, command, outcome, verified });
const fail = (c = 'npm test') => tool('shell', c, 'fail');
const edit = (p = 'a.ts'): JournalEvent => ({ t: ++t, kind: 'edit', path: p });
const nudge = (signal: 'repeat-failure' | 'passive-stall' | 'unverified-writes'): JournalEvent => ({ t: ++t, kind: 'nudge', signal });
const times = (n: number, f: () => JournalEvent) => Array.from({ length: n }, f);

assert.strictEqual(checkSignals([fail(), fail(), fail()]), 'repeat-failure');
assert.strictEqual(checkSignals([fail(), fail()]), null);
assert.strictEqual(checkSignals([fail(), edit(), fail(), fail()]), null, 'an edit between: the fx-tdd loop');
assert.strictEqual(checkSignals([fail(), fail(), edit(), fail()]), null, 'an edit splits the run');
assert.strictEqual(checkSignals([fail('a'), fail('b'), fail('a'), fail('b'), fail('a')]), 'repeat-failure', 'three of the same command, others between');
assert.strictEqual(checkSignals([fail('a'), fail('b'), fail('c')]), null, 'three different commands');
assert.strictEqual(checkSignals([fail(), fail(), fail(), nudge('repeat-failure')]), null, 'once per turn');
assert.strictEqual(checkSignals([tool('shell', null, 'fail'), tool('shell', null, 'fail'), tool('shell', null, 'fail')]), null, 'no command, no repeat');
assert.strictEqual(checkSignals(times(3, () => tool('shell', 'npm test', 'unknown'))), null, 'unknown is never a failure');

assert.strictEqual(checkSignals(times(12, () => tool('read'))), 'passive-stall');
assert.strictEqual(checkSignals(times(11, () => tool('read'))), null);
assert.strictEqual(checkSignals([...times(6, () => tool('read')), tool('shell', 'npm test'), ...times(6, () => tool('read'))]), null, 'a non-read breaks the run');
assert.strictEqual(checkSignals(times(12, () => tool('read')), ['passive-stall']), null, 'skipped for a subagent');
assert.strictEqual(checkSignals([...times(12, () => tool('read')), nudge('passive-stall')]), null);

assert.strictEqual(checkSignals([tool('shell', 'make test', 'ok', true), ...times(10, () => edit())]), 'unverified-writes');
assert.strictEqual(checkSignals([tool('shell', 'make test', 'ok', true), ...times(9, () => edit())]), null);
assert.strictEqual(checkSignals([...times(9, () => edit()), tool('shell', 'make test', 'ok', true), ...times(9, () => edit())]), null, 'a passing check resets the count');
assert.strictEqual(checkSignals(times(10, () => edit())), 'unverified-writes', 'counted from the turn start');
assert.strictEqual(checkSignals([...times(10, () => edit()), nudge('unverified-writes')]), null);
// order: repeat-failure before unverified-writes
assert.strictEqual(checkSignals([...times(10, () => edit()), fail(), fail(), fail()]), 'repeat-failure');
assert.strictEqual(checkSignals([...times(10, () => edit()), fail(), fail(), fail(), nudge('repeat-failure')]), 'unverified-writes');

// recordToolResult, under a scratch state dir
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-loop-tracker-'));
process.env.XDG_STATE_HOME = path.join(root, 'state');
process.env.HOME = path.join(root, 'home');
process.env.APPDATA = path.join(root, 'appdata');
process.env.LOCALAPPDATA = path.join(root, 'localappdata');
const cwd = path.join(root, 'cwd');
fs.mkdirSync(cwd, { recursive: true });
const long = `make ${'target '.repeat(20)}`.trim();
const base = { harness: 'claude-code' as const, sessionId: 's1', agentId: null, cwd, toolName: 'Bash', toolInput: { command: 'npm test' }, command: 'npm test', outcome: 'fail' as const, output: '' };
try {
  assert.strictEqual(recordToolResult({ ...base, sessionId: null }), null, 'no session id, no record');
  assert.strictEqual(recordToolResult(base), null);
  assert.strictEqual(recordToolResult(base), null);
  assert.strictEqual(recordToolResult(base), "[fx] `npm test` has failed 3 times this turn. Stop retrying and invoke fx:fx-debug to find the cause.");
  assert.strictEqual(recordToolResult(base), null, 'once per turn');
  const codex = recordToolResult({ ...base, harness: 'codex', sessionId: 's2' });
  assert.strictEqual(codex, null);
  recordToolResult({ ...base, harness: 'codex', sessionId: 's2' });
  assert.match(recordToolResult({ ...base, harness: 'codex', sessionId: 's2' }) ?? '', /invoke \$fx:fx-debug to find/);
  recordToolResult({ ...base, sessionId: 's3', command: long });
  recordToolResult({ ...base, sessionId: 's3', command: long });
  const cut = recordToolResult({ ...base, sessionId: 's3', command: long });
  assert.ok(cut?.includes(`\`${long.slice(0, 80)}\``) && !cut.includes(long.slice(0, 81)), 'the command is cut to 80 characters');
  const files = fs.readdirSync(path.join(root, 'state', 'fx', 'sessions'));
  assert.ok(files.includes('s1.jsonl'));
  // Fix round 1: a failed edit changed no file, so it is a tool event and no edit event.
  const failedEdit = { ...base, sessionId: 's4', toolName: 'Edit', toolInput: { file_path: path.join(cwd, 'a.ts') }, command: null };
  assert.strictEqual(recordToolResult(failedEdit), null);
  assert.deepStrictEqual(readJournal('s4').map((e) => e.kind), ['tool'], 'a failed Edit writes no edit event');
  recordToolResult({ ...failedEdit, outcome: 'ok' });
  assert.deepStrictEqual(readJournal('s4').map((e) => e.kind), ['tool', 'tool', 'edit'], 'a successful one does');
  recordToolResult({ ...failedEdit, outcome: 'unknown' });
  assert.deepStrictEqual(readJournal('s4').map((e) => e.kind), ['tool', 'tool', 'edit', 'tool', 'edit'], 'an unknown outcome still counts as an edit');
  // ...so a failed Edit between failures does not reset repeat-failure.
  const npm = { ...base, sessionId: 's5' };
  recordToolResult(npm);
  recordToolResult({ ...failedEdit, sessionId: 's5' });
  recordToolResult(npm);
  recordToolResult({ ...failedEdit, sessionId: 's5' });
  assert.match(recordToolResult(npm) ?? '', /has failed 3 times/);

  recordToolResult({ ...base, sessionId: 's9', command: 'make test', outcome: 'unknown', output: 'Tests: 3 passed', interrupted: true });
  recordToolResult({ ...base, sessionId: 's9', command: 'make test', outcome: 'unknown', output: 'Tests: 3 passed' });
  assert.deepStrictEqual(readJournal('s9').map((e) => e.kind === 'tool' && e.verified), [false, true], 'an interrupted call never verifies');

  // A Codex shell apply_patch is an edit of the paths it names.
  const patch = "apply_patch <<'PATCH'\n*** Begin Patch\n*** Update File: s.js\n*** End Patch\nPATCH";
  recordToolResult({ ...base, harness: 'codex', sessionId: 's6', toolName: 'Bash', toolInput: { command: patch }, command: patch, outcome: 'ok' });
  assert.deepStrictEqual(readJournal('s6').map((e) => e.kind), ['tool', 'edit']);
  recordToolResult({ ...base, harness: 'codex', sessionId: 's7', toolName: 'Bash', toolInput: { command: patch }, command: patch, outcome: 'fail' });
  assert.deepStrictEqual(readJournal('s7').map((e) => e.kind), ['tool'], 'a failed shell apply_patch is no edit');

  // Task 14, benchmark finding 4: a failed shell loop repeating one command counts as that many failures of it.
  const NODE_NUDGE = '[fx] `node --test` has failed 3 times this turn. Stop retrying and invoke fx:fx-debug to find the cause.';
  const run = (sessionId: string, command: string, outcome: 'ok' | 'fail' = 'fail') => recordToolResult({ ...base, sessionId, toolInput: { command }, command, outcome });
  assert.strictEqual(run('L1', 'for i in 1 2 3; do node --test; done'), NODE_NUDGE, 'three failures in one loop');
  assert.strictEqual(run('L1', 'for i in 1 2 3; do node --test; done'), null, 'once per turn');
  assert.strictEqual(run('L2', 'for i in 1 2; do node --test; done'), null);
  assert.strictEqual(run('L2', 'node --test'), NODE_NUDGE, 'a loop plus a later run');
  assert.strictEqual(run('L3', 'for i in $(seq 5); do\n  node --test\ndone'), NODE_NUDGE, 'seq, over lines');
  assert.strictEqual(run('L4', 'while true; do node --test; done'), NODE_NUDGE, 'a while loop');
  run('L5', 'for i in 1 2 3; do node --test; done', 'ok');
  run('L5', 'node --test');
  assert.strictEqual(run('L5', 'node --test'), null, 'a successful loop records no failure');
  assert.strictEqual(run('L6', 'for f in *.js; do node $f; done'), null, 'a loop over files is not one check');
  assert.strictEqual(run('L7', 'for i in 1 2 3; do npm run build; node --test; done'), null, 'a body of two commands');
  // Fix round 1, review minor 1: an until loop credits its condition; while counts only on true or a colon; a C-style count is parsed.
  assert.strictEqual(run('L8', 'until npm test; do sleep 1; done'), "[fx] `npm test` has failed 3 times this turn. Stop retrying and invoke fx:fx-debug to find the cause.", 'until credits its condition');
  assert.strictEqual(run('L9', 'while make; do node --test; done'), null, 'a while loop on a command is not counted');
  run('L9', 'node --test');
  assert.strictEqual(run('L9', 'node --test'), null, 'nor credited to its body');
  assert.strictEqual(run('L10', 'for ((i=0; i<1; i++)); do node --test; done'), null, 'a C-style loop that ran once');
  run('L10', 'node --test');
  assert.strictEqual(run('L10', 'node --test'), NODE_NUDGE, 'counts once');
  assert.strictEqual(run('L11', 'for ((i=0; i<3; i++)); do node --test; done'), NODE_NUDGE, 'a C-style loop of three');
  assert.strictEqual(run('L12', 'for f in *.js; do node --test; done'), null, 'a glob loop is charged once, not the threshold');
  // A journal that cannot be written leaves a tracker-error line in the decision log.
  const stateDir = path.join(root, 'state', 'fx');
  fs.rmSync(path.join(stateDir, 'sessions'), { recursive: true, force: true });
  fs.writeFileSync(path.join(stateDir, 'sessions'), 'not a directory');
  const logFile = path.join(stateDir, 'decisions.jsonl');
  const logged = () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '');
  assert.ok(!logged().includes('tracker-error'));
  assert.strictEqual(recordToolResult({ ...base, sessionId: 's8' }), null);
  assert.match(logged(), /"source":"tracker-error"/, 'a failed journal write is logged');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
console.log('loop-tracker.test.js: ok');
