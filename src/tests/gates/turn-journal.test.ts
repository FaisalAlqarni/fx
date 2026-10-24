// Run: node tests/gates/turn-journal.test.js
// The turn on Claude Code, at the process seam: hooks/fx-turn.js records user
// prompts, hooks/fx-context.js records a subagent's turn start, both into the
// per-session journal under a scratch state directory.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runHook, scratchHookEnv } from '../helpers/hook-env.js';
import { parseJson } from '../../lib/json.js';
import { stopReason } from '../../lib/stop-check.js';

const ROOT = path.join(__dirname, '..', '..');
const turn = path.join(ROOT, 'hooks', 'fx-turn.js');
const context = path.join(ROOT, 'hooks', 'fx-context.js');

async function main(): Promise<void> {
  const { env, dirs, cleanup } = scratchHookEnv();
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-turn-cwd-'));
  const sessions = path.join(dirs.state, 'sessions');
  const lines = (name: string) => fs.readFileSync(path.join(sessions, `${name}.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => parseJson(l));
  const files = () => (fs.existsSync(sessions) ? fs.readdirSync(sessions).sort() : []);
  const submit = { hook_event_name: 'UserPromptSubmit', session_id: 's1', cwd, prompt: 'deploy with token=abc123def456ghi789' };
  try {
    let r = await runHook(turn, submit, env);
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(r.out, '');
    const first = lines('s1');
    assert.strictEqual(first.length, 1);
    assert.deepStrictEqual({ ...first[0] as object, t: 0 }, { t: 0, kind: 'prompt', text: 'deploy with token=[REDACTED]' });
    if (process.platform !== 'win32') assert.strictEqual(fs.statSync(path.join(sessions, 's1.jsonl')).mode & 0o777, 0o600);

    r = await runHook(turn, { ...submit, prompt: 'second' }, env);
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(lines('s1').length, 2, 'a second prompt adds a line');

    // A prompt with an agent_id is the parent's dispatch text: the subagent's turn only.
    const before = fs.readFileSync(path.join(sessions, 's1.jsonl'), 'utf8');
    r = await runHook(turn, { hook_event_name: 'UserPromptSubmit', session_id: 's1', agent_id: 'a1', agent_type: 'default', prompt: 'implement task 3' }, env);
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(r.out, '');
    assert.strictEqual(fs.readFileSync(path.join(sessions, 's1.jsonl'), 'utf8'), before, 'the root journal is unchanged');
    const sub = lines('s1__a1');
    assert.strictEqual(sub.length, 1);
    assert.deepStrictEqual({ ...sub[0] as object, t: 0 }, { t: 0, kind: 'prompt', text: null });
    // Any non-empty agent_id marks a subagent, a number included (task 02 minor, ruled must-fix).
    r = await runHook(turn, { hook_event_name: 'UserPromptSubmit', session_id: 's1', agent_id: 7, prompt: 'implement task 4' }, env);
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(fs.readFileSync(path.join(sessions, 's1.jsonl'), 'utf8'), before, 'a numeric agent_id leaves the root journal alone');
    assert.deepStrictEqual({ ...lines('s1__7')[0] as object, t: 0 }, { t: 0, kind: 'prompt', text: null });

    // Fix round 1 (lens SF 1 mirror): a prompt that cannot be recorded leaves a null-text prompt, never the older one.
    {
      const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-turn-copy-'));
      try {
        for (const d of ['hooks', 'lib']) fs.cpSync(path.join(ROOT, d), path.join(copy, d), { recursive: true });
        fs.writeFileSync(path.join(copy, 'lib', 'redact.js'), "exports.CAP_PROMPT = 2000; exports.CAP_COMMAND = 2000; exports.redact = () => { throw new Error('redact'); };\n");
        const sizeBefore = lines('s1').length;
        r = await runHook(path.join(copy, 'hooks', 'fx-turn.js'), { ...submit, prompt: 'third' }, env);
        assert.strictEqual(r.code, 0, r.err);
        assert.strictEqual(r.out, '');
        const all = lines('s1');
        assert.strictEqual(all.length, sizeBefore + 1);
        assert.deepStrictEqual({ ...all.at(-1) as object, t: 0 }, { t: 0, kind: 'prompt', text: null });
      } finally {
        fs.rmSync(copy, { recursive: true, force: true });
      }
    }
    // fx's own continuation is not a user prompt.
    const names = files();
    r = await runHook(turn, { ...submit, prompt: '[fx] This turn edited files and no check has passed since the last edit.' }, env);
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(r.out, '');
    assert.deepStrictEqual(files(), names);
    assert.strictEqual(lines('s1').length, 3);
    // Wrapped by the harness, the continuation is still not a user prompt (final review I5).
    // Both texts come from lib/stop-check, so a reworded Stop reason fails here (final review, wave 2).
    for (const mode of ['block', 'reminder'] as const) {
      r = await runHook(turn, { ...submit, prompt: `Stop hook feedback:\n${stopReason('`npm test`', mode)}` }, env);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(lines('s1').length, 3, mode);
    }
    // The prompt is journaled even when lib/stop-check cannot load (final review U7).
    {
      const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-turn-copy-'));
      try {
        for (const d of ['hooks', 'lib']) fs.cpSync(path.join(ROOT, d), path.join(copy, d), { recursive: true });
        fs.writeFileSync(path.join(copy, 'lib', 'stop-check.js'), "throw new Error('stop-check broken');\n");
        r = await runHook(path.join(copy, 'hooks', 'fx-turn.js'), { ...submit, session_id: 's7', prompt: 'fourth' }, env);
        assert.strictEqual(r.code, 0, r.err);
        assert.deepStrictEqual(lines('s7').map((l) => ({ ...l as object, t: 0 })), [{ t: 0, kind: 'prompt', text: 'fourth' }]);
      } finally {
        fs.rmSync(copy, { recursive: true, force: true });
      }
    }

    // No session id, no journal.
    const fresh = scratchHookEnv();
    try {
      r = await runHook(turn, { hook_event_name: 'UserPromptSubmit', cwd, prompt: 'hi' }, fresh.env);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(r.out, '');
      assert.ok(!fs.existsSync(path.join(fresh.dirs.state, 'sessions')));
    } finally { fresh.cleanup(); }

    r = await runHook(turn, 'not json', env);
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(r.out, '');

    r = await runHook(turn, { hook_event_name: 'Stop', session_id: 's1' }, env);
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(r.out, '');
    // Stop records only the session's .fx.json baseline (the change notice), no turn event.
    const kinds = lines('s1').map((l) => Reflect.get(Object(l), 'kind'));
    assert.deepStrictEqual(kinds.filter((k) => k !== 'fx-json-hooks').length, 3, 'Stop adds no turn event');
    assert.deepStrictEqual(kinds.filter((k) => k === 'fx-json-hooks').length, 1, 'and one .fx.json baseline');

    // A state dir that cannot be created: exit 0, nothing on stdout, one [fx] journal line.
    const blocked = path.join(dirs.root, 'blocked');
    fs.writeFileSync(blocked, '');
    r = await runHook(turn, submit, { ...env, XDG_STATE_HOME: blocked, LOCALAPPDATA: blocked });
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(r.out, '');
    assert.ok(r.err.startsWith('[fx] journal:'), r.err);

    // SubagentStart: the printed context is unchanged, and the turn start is recorded.
    const start = { hook_event_name: 'SubagentStart', cwd };
    const plain = await runHook(context, start, env);
    assert.strictEqual(plain.code, 0, plain.err);
    assert.ok(plain.out.length > 0);
    const noIds = files();
    r = await runHook(context, { ...start, session_id: 's1', agent_id: 'a2' }, env);
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(r.out, plain.out, 'stdout is byte-identical');
    const s2 = lines('s1__a2');
    assert.strictEqual(s2.length, 1);
    assert.deepStrictEqual({ ...s2[0] as object, t: 0 }, { t: 0, kind: 'prompt', text: null, agentType: null });
    r = await runHook(context, { ...start, session_id: 's1', agent_id: 'a3', agent_type: 'fx-lens-security' }, env);
    assert.strictEqual(r.out, plain.out);
    assert.deepStrictEqual({ ...lines('s1__a3')[0] as object, t: 0 }, { t: 0, kind: 'prompt', text: null, agentType: 'fx-lens-security' });
    assert.deepStrictEqual(files(), [...noIds, 's1__a2.jsonl', 's1__a3.jsonl'].sort(), 'no ids, no journal');
    // A numeric agent_id is a subagent at SubagentStart too: one rule for every hook (final review, broad minor 2).
    r = await runHook(context, { ...start, session_id: 's1', agent_id: 8 }, env);
    assert.strictEqual(r.code, 0, r.err);
    assert.deepStrictEqual({ ...lines('s1__8')[0] as object, t: 0 }, { t: 0, kind: 'prompt', text: null, agentType: null });

    // SessionStart records only the session's .fx.json baseline, for the change notice.
    r = await runHook(context, { hook_event_name: 'SessionStart', session_id: 's9', cwd }, env);
    assert.deepStrictEqual(lines('s9').map((l) => Reflect.get(Object(l), 'kind')), ['fx-json-hooks']);
  } finally {
    cleanup();
    fs.rmSync(cwd, { recursive: true, force: true });
  }

  const reg = parseJson(fs.readFileSync(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8'));
  const group = (reg as { hooks: { UserPromptSubmit: { hooks: { command: string; timeout: number }[] }[] } }).hooks.UserPromptSubmit; // ts-gate-ok: the test reads a committed registration file
  assert.strictEqual(group[0]?.hooks[0]?.command, 'node "${CLAUDE_PLUGIN_ROOT}/hooks/fx-turn.js"');
  assert.strictEqual(group[0]?.hooks[0]?.timeout, 5);
  console.log('turn-journal.test.js: ok');
}

main().catch((e) => { console.error(e); process.exit(1); });
