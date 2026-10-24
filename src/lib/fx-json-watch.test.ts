// Run: node lib/fx-json-watch.test.js
// The notice that the hook switches of .fx.json changed during a session. State goes to scratch directories set before the first call.
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { FX_JSON_NOTICE, fxJsonFingerprint, fxJsonNotice } from './fx-json-watch.js';
import { machinePaths } from './fx-paths.js';
import { journalKey, readJournal } from './journal.js';
import { readDecisionLog } from '../tests/helpers/hook-env.js';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-json-watch-'));
process.on('exit', () => fs.rmSync(root, { recursive: true, force: true }));
process.env.XDG_STATE_HOME = path.join(root, 'state');
process.env.XDG_CONFIG_HOME = path.join(root, 'config');
process.env.LOCALAPPDATA = path.join(root, 'state');
const dirs = { root, home: root, config: path.join(root, 'config', 'fx'), state: path.join(root, 'state', 'fx') };

const repo = path.join(root, 'repo');
fs.mkdirSync(path.join(repo, 'sub'), { recursive: true });
assert.strictEqual(spawnSync('git', ['init', '-q'], { cwd: repo }).status, 0);
const write = (json: unknown) => fs.writeFileSync(path.join(repo, '.fx.json'), JSON.stringify(json));

assert.strictEqual(FX_JSON_NOTICE, '[fx] notice: the hook switches in .fx.json changed during this session. An agent can edit that file; check the change.');

// The fingerprint reads only hooks, from the top level.
write({ hooks: { stop_check: false }, test_all: 'make test' });
const first = fxJsonFingerprint(repo);
assert.match(first, /^[0-9a-f]{64}$/);
write({ hooks: { stop_check: false }, test_all: 'make check' });
assert.strictEqual(fxJsonFingerprint(repo), first, 'a test command change is not a switch change');
write({ hooks: { stop_check: false }, test_all: 'make check', rules: [{ id: 'a', glob: '*', rule: 'x' }] });
assert.strictEqual(fxJsonFingerprint(repo), first, 'the retired rules key is not watched (ADR 0049)');
assert.strictEqual(fxJsonFingerprint(path.join(repo, 'sub')), first, 'read from the top level');
fs.writeFileSync(path.join(repo, 'sub', '.fx.json'), '{"hooks":{"stop_check":true}}');
assert.strictEqual(fxJsonFingerprint(path.join(repo, 'sub')), first, 'a nested .fx.json is never read');
fs.writeFileSync(path.join(repo, '.fx.json'), 'not json');
const broken = fxJsonFingerprint(repo);
fs.rmSync(path.join(repo, '.fx.json'));
assert.strictEqual(fxJsonFingerprint(repo), broken, 'missing and not JSON both read as {}');
assert.notStrictEqual(broken, first);

// The notice: a baseline first, then one notice per change.
write({ hooks: { loop_nudge: true } });
assert.strictEqual(fxJsonNotice('s1', repo, 1), null, 'the first call records the baseline');
assert.deepStrictEqual(readJournal('s1').filter((e) => e.kind === 'fx-json-hooks').length, 1);
assert.strictEqual(fxJsonNotice('s1', repo, 2), null, 'unchanged');
write({ hooks: { loop_nudge: false } });
assert.strictEqual(fxJsonNotice('s1', repo, 3), FX_JSON_NOTICE, 'a switch changed');
assert.strictEqual(fxJsonNotice('s1', repo, 4), null, 'told once');
write({ hooks: { loop_nudge: false, edit_rules: false } });
assert.strictEqual(fxJsonNotice('s1', repo, 5), FX_JSON_NOTICE, 'a switch was added');
assert.strictEqual(fxJsonNotice(null, repo, 6), null, 'no session');
assert.strictEqual(fxJsonNotice('s2', path.join(root, 'missing-dir'), 7), null, 'a directory that does not exist');

// A 0.4.0 baseline hashed rules as well as hooks: it is no baseline, never a change.
fs.mkdirSync(path.join(machinePaths().stateDir, 'sessions'), { recursive: true });
fs.writeFileSync(path.join(machinePaths().stateDir, 'sessions', `${journalKey('s3')}.jsonl`), `${JSON.stringify({ t: 1, kind: 'fx-json', hash: 'old-shape' })}\n`);
assert.strictEqual(fxJsonNotice('s3', repo, 8), null, 'an old-kind baseline is re-recorded silently');
assert.strictEqual(fxJsonNotice('s3', repo, 9), null, 'and then holds');

const log = readDecisionLog(dirs);
assert.strictEqual(log.length, 2, JSON.stringify(log));
for (const e of log) {
  assert.ok(typeof e === 'object' && e !== null);
  assert.deepStrictEqual([Reflect.get(e, 'event'), Reflect.get(e, 'source'), Reflect.get(e, 'action'), Reflect.get(e, 'session')], ['health', 'fx-json', 'notice', 's1']);
}

// A baseline kept by the caller (opencode 1.x): same notice and log line, no journal event.
{
  const memory = new Map<string, string>();
  write({ rules: [] });
  assert.strictEqual(fxJsonNotice('m1', repo, 8, 'opencode', memory), null, 'the first call records the baseline');
  assert.strictEqual(fxJsonNotice('m1', repo, 9, 'opencode', memory), null, 'unchanged');
  write({ rules: [], hooks: { x: true } });
  assert.strictEqual(fxJsonNotice('m1', repo, 10, 'opencode', memory), FX_JSON_NOTICE, 'changed');
  assert.strictEqual(fxJsonNotice('m1', repo, 11, 'opencode', memory), null, 'told once');
  assert.deepStrictEqual(readJournal('m1'), [], 'nothing in the journal');
  const lines = readDecisionLog(dirs).filter((e) => typeof e === 'object' && e !== null && Reflect.get(e, 'session') === 'm1');
  assert.deepStrictEqual(lines.map((e) => [Reflect.get(Object(e), 'harness'), Reflect.get(Object(e), 'source'), Reflect.get(Object(e), 'action')]), [['opencode', 'fx-json', 'notice']]);
}
console.log('fx-json-watch.test.js: ok');
