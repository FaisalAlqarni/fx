// Run: node lib/stop-check.test.js
// turnNeedsEvidence over journal event lists, and decideStop under a scratch
// state dir. Journal events are built directly, so these rules do not depend
// on how the tool recorder classifies a call.
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { machinePaths } from './fx-paths.js';
import { appendEvent, journalKey, readJournal } from './journal.js';
import { FX_JSON_NOTICE } from './fx-json-watch.js';
import { decideStop, turnNeedsEvidence } from './stop-check.js';
import type { JournalEvent } from './types.js';

let t = 0;
const edit = (p: string): JournalEvent => ({ t: ++t, kind: 'edit', path: p });
const check = (verified: boolean): JournalEvent => ({ t: ++t, kind: 'tool', tool: 'shell', command: 'make test', outcome: verified ? 'ok' : 'fail', verified });
const prompt = (): JournalEvent => ({ t: ++t, kind: 'prompt', text: 'go' });

assert.strictEqual(turnNeedsEvidence([edit('a.ts')]), true);
assert.strictEqual(turnNeedsEvidence([edit('a.ts'), check(true)]), false);
assert.strictEqual(turnNeedsEvidence([edit('a.ts'), check(true), edit('b.ts')]), true, 'an edit after the check');
assert.strictEqual(turnNeedsEvidence([edit('a.ts'), check(false)]), true, 'a check that did not verify');
assert.strictEqual(turnNeedsEvidence([edit('docs/x.md')]), false, 'documentation only');
assert.strictEqual(turnNeedsEvidence([edit('docs/x.md'), edit('a.ts')]), true);
assert.strictEqual(turnNeedsEvidence([edit('a.ts'), edit('docs/x.md')]), true, 'a doc edit after a code edit leaves the code edit unverified');
assert.strictEqual(turnNeedsEvidence([edit('a.ts'), check(true), edit('notes.TXT')]), false, 'a later doc edit does not undo the check');
assert.strictEqual(turnNeedsEvidence([]), false);
// Only an edit inside the repository needs evidence (final review, devil's advocate minor 5).
const repo = path.resolve('/w/repo');
assert.strictEqual(turnNeedsEvidence([edit(path.resolve('/tmp/scratch.ts'))], repo), false, 'a scratch file outside the repository');
assert.strictEqual(turnNeedsEvidence([edit(path.resolve('/w/repo-other/a.ts'))], repo), false, 'a sibling whose name starts with the root');
assert.strictEqual(turnNeedsEvidence([edit(path.join(repo, 'src', 'a.ts'))], repo), true);
assert.strictEqual(turnNeedsEvidence([edit(path.join(repo, 'a.ts')), edit(path.resolve('/tmp/scratch.ts'))], repo), true, 'a later outside edit leaves the inside one unverified');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-stop-check-'));
process.env.XDG_STATE_HOME = path.join(root, 'state');
process.env.XDG_CONFIG_HOME = path.join(root, 'config');
process.env.HOME = path.join(root, 'home');
process.env.APPDATA = path.join(root, 'appdata');
process.env.LOCALAPPDATA = path.join(root, 'localappdata');
const cwd = path.join(root, 'cwd');
fs.mkdirSync(cwd, { recursive: true });
fs.writeFileSync(path.join(cwd, '.fx.json'), '{"test_all":"make test"}');
const bare = path.join(root, 'bare');
fs.mkdirSync(bare);

const BLOCK = '[fx] This turn edited files and no check has passed since the last edit. Run `make test` and report the result before you finish. If you cannot run it, say so plainly.';
const REMIND = '[fx] The previous turn edited files and no check passed after the last edit. Run `make test` before you report that work as done.';
const input = (over: Record<string, unknown> = {}) => ({
  harness: 'claude-code' as const, sessionId: 's1', agentId: null, cwd, stopHookActive: false, mode: 'block' as const, ...over,
});
const seed = (session: string, ...events: JournalEvent[]) => {
  const key = journalKey(session);
  assert.ok(key !== null);
  for (const e of [prompt(), ...events]) appendEvent(key, e);
};

async function main(): Promise<void> {
  try {
    seed('s1', edit('a.ts'));
    assert.deepStrictEqual(await decideStop(input({ sessionId: null })), { text: null, notice: null }, 'no session id');
    assert.deepStrictEqual(await decideStop(input({ stopHookActive: true })), { text: null, notice: null }, 'the harness says the hook already fired');
    assert.deepStrictEqual(await decideStop(input({ cwd: bare, sessionId: 'unseeded' })), { text: null, notice: null }, 'no journal');
    assert.deepStrictEqual(await decideStop(input()), { text: BLOCK, notice: null });
    assert.deepStrictEqual(await decideStop(input()), { text: null, notice: null }, 'the journal holds a stop-block: once per turn');
    assert.ok(readJournal('s1').some((e) => e.kind === 'stop-block'));

    seed('s1', edit('b.ts'));
    assert.deepStrictEqual(await decideStop(input()), { text: BLOCK, notice: null }, 'a new prompt starts a new turn');

    seed('s2', edit('a.ts'));
    assert.deepStrictEqual(await decideStop(input({ sessionId: 's2', mode: 'reminder' })), { text: REMIND, notice: null });

    seed('s3', edit('a.ts'));
    assert.strictEqual((await decideStop(input({ sessionId: 's3', cwd: bare }))).text?.includes("Run the project's tests and report"), true, 'no .fx.json: the project tests, no backticks');

    // In a git repository, edits outside its top level do not block.
    const gitCwd = path.join(root, 'git');
    fs.mkdirSync(path.join(gitCwd, 'sub'), { recursive: true });
    spawnSync('git', ['init', '-q', gitCwd]);
    fs.writeFileSync(path.join(gitCwd, '.fx.json'), '{"test_all":"make test"}');
    seed('g1', edit(path.join(root, 'scratch.ts')));
    assert.deepStrictEqual(await decideStop(input({ sessionId: 'g1', cwd: path.join(gitCwd, 'sub') })), { text: null, notice: null }, 'an edit outside the repository');
    seed('g2', edit(path.join(gitCwd, 'a.ts')));
    assert.deepStrictEqual(await decideStop(input({ sessionId: 'g2', cwd: path.join(gitCwd, 'sub') })), { text: BLOCK, notice: null }, 'an edit elsewhere in the repository');

    // a subagent reads its own journal
    const sub = journalKey('s4', 'a1');
    assert.ok(sub !== null);
    appendEvent(sub, prompt());
    appendEvent(sub, edit('a.ts'));
    assert.deepStrictEqual(await decideStop(input({ sessionId: 's4' })), { text: null, notice: null }, 'the root has no edits');
    assert.deepStrictEqual(await decideStop(input({ sessionId: 's4', agentId: 'a1' })), { text: BLOCK, notice: null }, 'the subagent does');

    // A journal that cannot be written would make the block repeat every turn: allow instead, and say so.
    for (const name of ['w1']) {
      seed(name, edit('a.ts'));
      const file = path.join(machinePaths().stateDir, 'sessions', `${name}.jsonl`);
      fs.chmodSync(file, 0o444);
      assert.deepStrictEqual(await decideStop(input({ sessionId: name })), { text: null, notice: null }, `${name}: an unwritable journal does not block`);
      const entries = fs.readFileSync(path.join(machinePaths().stateDir, 'decisions.jsonl'), 'utf8').split('\n').filter(Boolean).filter((l) => l.includes(`"session":"${name}"`));
      assert.strictEqual(entries.length, 1, `${name}: one log line`);
      assert.ok(entries[0]?.includes('"action":"allow"') && entries[0].includes('"source":"journal-error"'), entries[0]);
    }

    // A throw inside the check allows the stop and leaves one log line.
    seed('t1', edit('a.ts'));
    // A cwd that is not a string makes the repository lookup throw.
    assert.deepStrictEqual(await decideStop(input({ sessionId: 't1', cwd: 42 as unknown as string })), { text: null, notice: null });
    const thrown = fs.readFileSync(path.join(machinePaths().stateDir, 'decisions.jsonl'), 'utf8').split('\n').filter((l) => l.includes('"session":"t1"'));
    assert.strictEqual(thrown.length, 1);
    assert.ok(thrown[0]?.includes('"event":"stop"') && thrown[0].includes('"action":"allow"') && thrown[0].includes('"source":"stop-error"'), thrown[0]);

    // the log: one line per decision
    const log = fs.readFileSync(path.join(machinePaths().stateDir, 'decisions.jsonl'), 'utf8').split('\n').filter(Boolean);
    assert.ok(log.some((l) => l.includes('"source":"evidence"') && l.includes('"action":"block"')), 'the block is logged');
    assert.ok(log.every((l) => l.includes('"event":"stop"')));

    // The .fx.json notice, for the root session, before any early return.
    seed('n1', edit('a.ts'), check(true));
    assert.deepStrictEqual(await decideStop(input({ sessionId: 'n1' })), { text: null, notice: null }, 'the baseline');
    fs.writeFileSync(path.join(cwd, '.fx.json'), '{"test_all":"make test","hooks":{"stop_check":false}}');
    assert.deepStrictEqual(await decideStop(input({ sessionId: 'n1', agentId: 'a1' })), { text: null, notice: null }, 'a subagent gets no notice');
    assert.deepStrictEqual(await decideStop(input({ sessionId: 'n1', mode: 'reminder' })), { text: null, notice: null }, 'the opencode reminder has nowhere to show it');
    assert.deepStrictEqual(await decideStop(input({ sessionId: 'n1', stopHookActive: true })), { text: null, notice: FX_JSON_NOTICE });
    assert.deepStrictEqual(await decideStop(input({ sessionId: 'n1' })), { text: null, notice: null }, 'told once');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log('stop-check.test.js: ok');
}

main().catch((e) => { console.error(e); process.exit(1); });
