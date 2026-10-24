// Run: node tests/gates/loop-nudge.test.js
// The stuck-loop nudges at the process seam: hooks/fx-turn.js (Claude Code) and
// hooks/fx-codex.js (Codex) record every tool call and print at most one
// advisory line per signal per turn, as hookSpecificOutput.additionalContext.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readDecisionLog, runHook, scratchHookEnv } from '../helpers/hook-env.js';
import { parseJson } from '../../lib/json.js';

const ROOT = path.join(__dirname, '..', '..');
const turn = path.join(ROOT, 'hooks', 'fx-turn.js');
const context = path.join(ROOT, 'hooks', 'fx-context.js');
const codex = path.join(ROOT, 'hooks', 'fx-codex.js');

const REPEAT = (lane: string) => `[fx] \`npm test\` has failed 3 times this turn. Stop retrying and invoke ${lane} to find the cause.`;
const STALL = (lane: string) => `[fx] 12 reads in a row with no edit. If you are going in circles, invoke ${lane}; otherwise say what you are looking for.`;

async function main(): Promise<void> {
  const { env, dirs, cleanup } = scratchHookEnv();
  const cwds: string[] = [];
  const mkcwd = (fxJson?: unknown): string => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-loop-cwd-'));
    cwds.push(d);
    if (fxJson !== undefined) fs.writeFileSync(path.join(d, '.fx.json'), JSON.stringify(fxJson));
    return d;
  };
  const journal = (name: string) => fs.readFileSync(path.join(dirs.state, 'sessions', `${name}.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => parseJson(l));
  const kinds = (name: string) => journal(name).map((e) => (typeof e === 'object' && e !== null && 'kind' in e ? e.kind : null));

  // Runs one hook call and returns what it printed, parsed, or null for nothing.
  const call = async (file: string, payload: Record<string, unknown>): Promise<unknown> => {
    const r = await runHook(file, payload, env);
    assert.strictEqual(r.code, 0, r.err);
    return r.out === '' ? null : parseJson(r.out);
  };
  const expectLine = (out: unknown, event: string, line: string, label: string) => {
    assert.deepStrictEqual(out, { hookSpecificOutput: { hookEventName: event, additionalContext: line } }, label);
  };

  try {
    // ---- Claude Code ----
    {
      const cwd = mkcwd();
      const base = { session_id: 's1', cwd };
      await call(turn, { ...base, hook_event_name: 'UserPromptSubmit', prompt: 'fix it' });
      const failure = { ...base, hook_event_name: 'PostToolUseFailure', tool_name: 'Bash', tool_input: { command: 'npm test' }, error: 'exit 1' };
      assert.strictEqual(await call(turn, failure), null, 'first failure');
      assert.strictEqual(await call(turn, failure), null, 'second failure');
      expectLine(await call(turn, failure), 'PostToolUseFailure', REPEAT('fx:fx-debug'), 'third failure');
      assert.strictEqual(await call(turn, failure), null, 'a fourth prints nothing');
      assert.strictEqual(kinds('s1').filter((k) => k === 'tool').length, 4);
    }
    {
      const cwd = mkcwd();
      const base = { session_id: 's2', cwd };
      const submit = { ...base, hook_event_name: 'UserPromptSubmit', prompt: 'look around' };
      const read = { ...base, hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: '/x' }, tool_response: { type: 'text' } };
      await call(turn, submit);
      for (let i = 1; i <= 11; i++) assert.strictEqual(await call(turn, read), null, `read ${i}`);
      expectLine(await call(turn, read), 'PostToolUse', STALL('fx:fx-debug'), 'twelfth read');
      await call(turn, submit);
      for (let i = 1; i <= 11; i++) assert.strictEqual(await call(turn, read), null, `a new turn: read ${i}`);
    }
    {
      const cwd = mkcwd({ test_all: 'scripts/check-all' });
      const base = { session_id: 's3', cwd };
      await call(turn, { ...base, hook_event_name: 'UserPromptSubmit', prompt: 'edit lots' });
      const edit = { ...base, hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: { file_path: path.join(cwd, 'a.ts') }, tool_response: {} };
      const check = { ...base, hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'scripts/check-all' }, tool_response: { stdout: '', stderr: '' } };
      for (let i = 0; i < 9; i++) assert.strictEqual(await call(turn, edit), null, `edit ${i + 1}`);
      assert.strictEqual(await call(turn, check), null);
      for (let i = 1; i < 10; i++) assert.strictEqual(await call(turn, edit), null, `edit ${i} after the check`);
      expectLine(await call(turn, edit), 'PostToolUse', '[fx] 10 edits since the last passing check. Run `scripts/check-all` now; if it fails, invoke fx:fx-debug.', 'tenth edit after the check');
      assert.strictEqual(await call(turn, edit), null, 'once per turn');
    }
    {
      const cwd = mkcwd({ hooks: { loop_nudge: false } });
      const base = { session_id: 's4', cwd };
      await call(turn, { ...base, hook_event_name: 'UserPromptSubmit', prompt: 'x' });
      const failure = { ...base, hook_event_name: 'PostToolUseFailure', tool_name: 'Bash', tool_input: { command: 'npm test' }, error: 'exit 1' };
      for (let i = 0; i < 3; i++) assert.strictEqual(await call(turn, failure), null, 'switched off');
      assert.strictEqual(kinds('s4').filter((k) => k === 'tool').length, 3, 'the record continues');
      assert.ok(!kinds('s4').includes('nudge'));
    }
    {
      const before = fs.readdirSync(path.join(dirs.state, 'sessions')).sort();
      const r = await call(turn, { hook_event_name: 'PostToolUseFailure', cwd: mkcwd(), tool_name: 'Bash', tool_input: { command: 'npm test' }, error: 'exit 1' });
      assert.strictEqual(r, null, 'no session id: nothing printed');
      assert.deepStrictEqual(fs.readdirSync(path.join(dirs.state, 'sessions')).sort(), before, 'and nothing written');
    }
    {
      const cwd = mkcwd();
      const sub = async (id: string, type: string) => call(context, { hook_event_name: 'SubagentStart', session_id: 's5', cwd, agent_id: id, agent_type: type });
      await sub('lens', 'fx-lens-security');
      await sub('worker', 'general-purpose');
      const payload = (id: string, extra: Record<string, unknown>) => ({ hook_event_name: 'PostToolUse', session_id: 's5', cwd, agent_id: id, ...extra });
      const failure = (id: string) => ({ ...payload(id, { tool_name: 'Bash', tool_input: { command: 'npm test' } }), hook_event_name: 'PostToolUseFailure', error: 'exit 1' });
      const read = (id: string) => payload(id, { tool_name: 'Read', tool_input: { file_path: '/x' }, tool_response: {} });
      for (let i = 0; i < 3; i++) assert.strictEqual(await call(turn, failure('lens')), null, 'a read-only review agent: no repeat-failure');
      for (let i = 0; i < 12; i++) assert.strictEqual(await call(turn, read('lens')), null, 'a read-only review agent: no passive-stall');
      assert.ok(kinds('s5__lens').includes('tool'), 'but the record is kept');
      assert.strictEqual(await call(turn, failure('worker')), null);
      assert.strictEqual(await call(turn, failure('worker')), null);
      expectLine(await call(turn, failure('worker')), 'PostToolUseFailure', REPEAT('fx:fx-debug'), 'a general-purpose subagent gets repeat-failure');
      for (let i = 0; i < 12; i++) assert.strictEqual(await call(turn, read('worker')), null, 'passive-stall is root-only');
    }

    // ---- Codex ----
    {
      const cwd = mkcwd();
      const base = { session_id: 'c1', turn_id: 't', cwd };
      await call(codex, { ...base, hook_event_name: 'UserPromptSubmit', prompt: 'fix it' });
      const post = (response: unknown) => ({ ...base, hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'npm test' }, tool_response: response });
      const failed = post('Exit code: 1\nOutput:\nfail');
      assert.strictEqual(await call(codex, failed), null);
      assert.strictEqual(await call(codex, failed), null);
      const out = await call(codex, failed);
      expectLine(out, 'PostToolUse', REPEAT('$fx:fx-debug'), 'codex third failure');
      assert.strictEqual(await call(codex, failed), null, 'once per turn');
      const unknown = { ...post('no code'), session_id: 'c2' };
      await call(codex, { ...base, session_id: 'c2', hook_event_name: 'UserPromptSubmit', prompt: 'x' });
      for (let i = 0; i < 3; i++) assert.strictEqual(await call(codex, unknown), null, 'an unknown outcome never counts as a failure');
      assert.strictEqual(kinds('c2').filter((k) => k === 'tool').length, 3);
    }
    // Task 13. A Codex read-only review subagent is never nudged; a general-purpose one is.
    {
      const cwd = mkcwd();
      const base = { session_id: 'c5', turn_id: 't', cwd };
      await call(codex, { ...base, hook_event_name: 'UserPromptSubmit', prompt: 'review it' });
      const failed = (id: string) => ({ ...base, agent_id: id, hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'npm test' }, tool_response: 'Exit code: 1\nOutput:\nfail' });
      for (const [id, type] of [['lens', 'fx-lens-security'], ['worker', 'general-purpose']]) {
        assert.strictEqual((await runHook(codex, { ...base, hook_event_name: 'SubagentStart', agent_id: id, agent_type: type }, env)).code, 0);
      }
      for (let i = 0; i < 3; i++) assert.strictEqual(await call(codex, failed('lens')), null, 'codex read-only agent: no repeat-failure');
      assert.strictEqual(kinds('c5__lens').filter((k) => k === 'tool').length, 3, 'but the record is kept');
      assert.strictEqual(await call(codex, failed('worker')), null);
      assert.strictEqual(await call(codex, failed('worker')), null);
      expectLine(await call(codex, failed('worker')), 'PostToolUse', REPEAT('$fx:fx-debug'), 'codex general-purpose subagent');
    }

    // ---- Fix round 1 ----
    // An interrupted call is neither a pass nor a failure: it does not count toward repeat-failure.
    {
      const cwd = mkcwd();
      const base = { session_id: 's6', cwd };
      await call(turn, { ...base, hook_event_name: 'UserPromptSubmit', prompt: 'x' });
      const stopped = { ...base, hook_event_name: 'PostToolUseFailure', tool_name: 'Bash', tool_input: { command: 'npm test' }, error: 'interrupted', is_interrupt: true };
      for (let i = 0; i < 3; i++) assert.strictEqual(await call(turn, stopped), null, 'an interrupted failure is not a retry');
      const outcomes = journal('s6').flatMap((e) => (typeof e === 'object' && e !== null && 'outcome' in e ? [e.outcome] : []));
      assert.deepStrictEqual(outcomes, ['unknown', 'unknown', 'unknown']);
      await call(turn, { ...base, hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'make test' }, tool_response: { stdout: 'Tests: 3 passed', stderr: '', interrupted: true } });
      const last = journal('s6').at(-1);
      assert.ok(typeof last === 'object' && last !== null && 'verified' in last && last.verified === false && 'outcome' in last && last.outcome === 'unknown', 'an interrupted call never verifies');
    }
    // A Codex shell apply_patch is an edit of the paths it names; a failed one is not.
    {
      const cwd = mkcwd();
      const patch = "apply_patch <<'PATCH'\n*** Begin Patch\n*** Update File: s.js\n*** End Patch\nPATCH";
      const post = (id: string, response: string) => ({ session_id: id, turn_id: 't', cwd, hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: patch }, tool_response: response });
      await call(codex, post('c3', 'Exit code: 0\nOutput:\nok'));
      assert.deepStrictEqual(kinds('c3'), ['tool', 'edit']);
      await call(codex, post('c4', 'Exit code: 1\nOutput:\nbad'));
      assert.deepStrictEqual(kinds('c4'), ['tool']);
    }
    // A broken tracker or patch-paths leaves a tracker-error line and never changes the exit code.
    {
      const copyOf = (stubs: Record<string, string>): string => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-loop-copy-'));
        cwds.push(dir);
        for (const d of ['hooks', 'lib', 'codex']) fs.cpSync(path.join(ROOT, d), path.join(dir, d), { recursive: true });
        fs.copyFileSync(path.join(ROOT, 'PREAMBLE.md'), path.join(dir, 'PREAMBLE.md'));
        for (const [name, body] of Object.entries(stubs)) fs.writeFileSync(path.join(dir, 'lib', name), body);
        return dir;
      };
      const trackerErrors = () => readDecisionLog(dirs).filter((e) => typeof e === 'object' && e !== null && 'source' in e && e.source === 'tracker-error').length;
      const cwd = mkcwd();
      const before = trackerErrors();
      const dead = copyOf({ 'loop-tracker.js': "throw new Error('stubbed tracker failure');\n" });
      assert.strictEqual(await call(path.join(dead, 'hooks', 'fx-turn.js'), { session_id: 'd1', cwd, hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: {}, tool_response: {} }), null);
      assert.strictEqual(trackerErrors(), before + 1, 'fx-turn: a tracker that cannot load is logged');
      assert.strictEqual(await call(path.join(dead, 'hooks', 'fx-codex.js'), { session_id: 'd2', turn_id: 't', cwd, hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'ls' }, tool_response: 'Exit code: 0' }), null);
      assert.strictEqual(trackerErrors(), before + 2, 'fx-codex: a tracker that cannot load is logged');

      // Only edit counting degrades without patch-paths: the call is still recorded and nudges still print.
      const noPatch = copyOf({ 'patch-paths.js': "throw new Error('stubbed patch-paths failure');\n" });
      const hook = path.join(noPatch, 'hooks', 'fx-codex.js');
      const patchCall = { session_id: 'd3', turn_id: 't', cwd, hook_event_name: 'PostToolUse', tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** Add File: x.txt\n+hi\n*** End Patch\n' }, tool_response: 'ok' };
      assert.strictEqual(await call(hook, patchCall), null);
      assert.deepStrictEqual(kinds('d3'), ['tool'], 'the call is recorded, its edits are not');
      assert.strictEqual(trackerErrors(), before + 3, 'and the edit counting failure is logged');
      const failing = { session_id: 'd4', turn_id: 't', cwd, hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'npm test' }, tool_response: 'Exit code: 1\nOutput:\nfail' };
      await call(hook, failing);
      await call(hook, failing);
      expectLine(await call(hook, failing), 'PostToolUse', REPEAT('$fx:fx-debug'), 'nudges survive a broken patch-paths');
    }
  } finally {
    cleanup();
    for (const d of cwds) fs.rmSync(d, { recursive: true, force: true });
  }
  console.log('loop-nudge.test.js: ok');
}

main().catch((e) => { console.error(e); process.exit(1); });
