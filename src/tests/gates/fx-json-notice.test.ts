// Run: node tests/gates/fx-json-notice.test.js
// The .fx.json change notice at the process seam: a session starts, the agent
// changes the hook switches, and the next Stop or resume says so. A change to
// the retired `rules` key alone says nothing (ADR 0049).
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { runHook, scratchHookEnv } from '../helpers/hook-env.js';
import { FX_JSON_NOTICE } from '../../lib/fx-json-watch.js';
import { parseJson } from '../../lib/json.js';

const ROOT = path.join(__dirname, '..', '..');
const CONTEXT = path.join(ROOT, 'hooks', 'fx-context.js');
const TURN = path.join(ROOT, 'hooks', 'fx-turn.js');
const CODEX = path.join(ROOT, 'hooks', 'fx-codex.js');

function get(v: unknown, ...keys: string[]): unknown {
  let cur = v;
  for (const k of keys) cur = typeof cur === 'object' && cur !== null ? Reflect.get(cur, k) : undefined;
  return cur;
}
const keys = (out: string) => {
  const v = parseJson(out);
  return typeof v === 'object' && v !== null ? Object.keys(v).sort() : [];
};

async function main(): Promise<void> {
  const scratch = scratchHookEnv();
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-json-notice-'));
  spawnSync('git', ['init', '-q', repo]);
  const env = scratch.env;
  const fxJson = (v: unknown) => fs.writeFileSync(path.join(repo, '.fx.json'), JSON.stringify(v));
  const stop = (hook: string, session: string) =>
    runHook(hook, { hook_event_name: 'Stop', session_id: session, cwd: repo, stop_hook_active: false, last_assistant_message: null }, env);
  try {
    // Claude Code: SessionStart records the baseline; Stop after a change shows the notice.
    const start = await runHook(CONTEXT, { hook_event_name: 'SessionStart', session_id: 's5', cwd: repo, source: 'startup' }, env);
    assert.strictEqual(start.code, 0, start.err);
    assert.strictEqual(get(parseJson(start.out), 'systemMessage'), undefined, 'nothing changed yet');
    fxJson({ hooks: { edit_rules: false } });
    const first = await stop(TURN, 's5');
    assert.strictEqual(first.code, 0, first.err);
    assert.deepStrictEqual(parseJson(first.out), { systemMessage: FX_JSON_NOTICE });
    const quiet = await stop(TURN, 's5');
    assert.strictEqual(quiet.out, '', 'nothing changed since');
    // A rules-only change is ignored.
    fxJson({ hooks: { edit_rules: false }, rules: [{ id: 'a', glob: '*', rule: 'x' }] });
    assert.strictEqual((await stop(TURN, 's5')).out, '', 'rules are not watched');
    // A resume after a second change shows it in the session start output.
    fxJson({ hooks: { edit_rules: false, loop_nudge: false } });
    const resume = await runHook(CONTEXT, { hook_event_name: 'SessionStart', session_id: 's5', cwd: repo, source: 'resume' }, env);
    assert.strictEqual(resume.code, 0, resume.err);
    assert.strictEqual(get(parseJson(resume.out), 'systemMessage'), FX_JSON_NOTICE);
    assert.ok(String(get(parseJson(resume.out), 'hookSpecificOutput', 'additionalContext')).includes(FX_JSON_NOTICE));
    // A Stop that blocks carries the notice beside decision and reason.
    await runHook(TURN, { hook_event_name: 'UserPromptSubmit', session_id: 's5', cwd: repo, prompt: 'change the helper please' }, env);
    await runHook(TURN, { hook_event_name: 'PostToolUse', session_id: 's5', cwd: repo, tool_name: 'Edit', tool_input: { file_path: path.join(repo, 'a.ts') }, tool_response: {} }, env);
    fxJson({ hooks: { loop_nudge: false } });
    const blocked = await stop(TURN, 's5');
    assert.deepStrictEqual(keys(blocked.out), ['decision', 'reason', 'systemMessage']);
    assert.strictEqual(get(parseJson(blocked.out), 'systemMessage'), FX_JSON_NOTICE);

    // Codex: the same sequence; stdout keeps the keys Codex knows and the notice goes to stderr.
    const cstart = await runHook(CODEX, { hook_event_name: 'SessionStart', session_id: 's7', cwd: repo, source: 'startup' }, env);
    assert.strictEqual(cstart.code, 0, cstart.err);
    fxJson({ hooks: { stop_check: false } });
    const cstop = await stop(CODEX, 's7');
    assert.strictEqual(cstop.code, 0, cstop.err);
    assert.strictEqual(cstop.out, '');
    assert.ok(cstop.err.includes(FX_JSON_NOTICE), cstop.err);
    const cquiet = await stop(CODEX, 's7');
    assert.ok(!cquiet.err.includes(FX_JSON_NOTICE), 'told once');
  } finally {
    scratch.cleanup();
    fs.rmSync(repo, { recursive: true, force: true });
  }
  console.log('fx-json-notice.test.js: ok');
}

main().catch((e) => { console.error(e); process.exit(1); });
