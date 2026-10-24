import * as assert from 'assert';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseClaudeHookInput, parseCodexHookInput, subagentId } from './hook-input.js';

const bash = { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls' } };

for (const [label, parse] of [['claude', parseClaudeHookInput], ['codex', parseCodexHookInput]] as const) {
  const ok = parse(bash);
  assert.ok(ok.ok, `${label}: a PreToolUse payload parses`);
  assert.strictEqual(ok.value.tool_name, 'Bash', `${label}: tool_name`);
  assert.deepStrictEqual(ok.value.tool_input, { command: 'ls' }, `${label}: tool_input`);

  for (const raw of ['x', null, 7, ['a']]) {
    assert.deepStrictEqual(parse(raw), { ok: false, reason: 'hook input is not an object' }, `${label}: ${JSON.stringify(raw)}`);
  }

  // The hooks read tool_input as `tool_input || {}`: a falsy value is an empty
  // input, and a truthy non-object reaches dispatch routing as no input at all.
  const falsy = parse({ tool_input: false });
  assert.ok(falsy.ok);
  assert.deepStrictEqual(falsy.value.tool_input, {}, `${label}: falsy tool_input`);
  const str = parse({ tool_input: 'x' });
  assert.ok(str.ok);
  assert.strictEqual(str.value.tool_input, null, `${label}: string tool_input`);

  // hook_event_name is echoed into the context output as given.
  const seven = parse({ hook_event_name: 7 });
  assert.ok(seven.ok);
  assert.strictEqual(seven.value.hook_event_name, 7, `${label}: hook_event_name kept as sent`);

  const cwd = parse({ cwd: 42 });
  assert.ok(cwd.ok);
  assert.strictEqual(cwd.value.cwd, undefined, `${label}: a non-string cwd is dropped`);
}

// PostToolUse (task 08): tool_response is kept as sent, error only as a string.
{
  const post = parseClaudeHookInput({ hook_event_name: 'PostToolUse', tool_response: { stdout: 'o', stderr: '' } });
  assert.ok(post.ok);
  assert.deepStrictEqual(post.value.tool_response, { stdout: 'o', stderr: '' }, 'claude: tool_response kept as sent');
  const failure = parseClaudeHookInput({ hook_event_name: 'PostToolUseFailure', error: 'Exit code 1' });
  assert.ok(failure.ok);
  assert.strictEqual(failure.value.error, 'Exit code 1', 'claude: error string');
  const interrupt = parseClaudeHookInput({ hook_event_name: 'PostToolUseFailure', is_interrupt: true });
  assert.ok(interrupt.ok);
  assert.strictEqual(interrupt.value.is_interrupt, true, 'claude: is_interrupt');
  const badInterrupt = parseClaudeHookInput({ is_interrupt: 'yes' });
  assert.ok(badInterrupt.ok);
  assert.strictEqual(badInterrupt.value.is_interrupt, undefined, 'claude: a non-boolean is_interrupt is dropped');
  const badError = parseClaudeHookInput({ error: { message: 'x' } });
  assert.ok(badError.ok);
  assert.strictEqual(badError.value.error, undefined, 'claude: a non-string error is dropped');
  const codexPost = parseCodexHookInput({ hook_event_name: 'PostToolUse', tool_response: 'Exit code: 1' });
  assert.ok(codexPost.ok);
  assert.strictEqual(codexPost.value.tool_response, 'Exit code: 1', 'codex: tool_response kept as sent');
}

const turn = parseClaudeHookInput({ session_id: 's', prompt: 'hi', agent_id: 'a1', agent_type: 'x' });
assert.ok(turn.ok);
assert.strictEqual(turn.value.prompt, 'hi');
assert.strictEqual(turn.value.agent_id, 'a1');
assert.strictEqual(turn.value.agent_type, 'x');
const noTurn = parseClaudeHookInput({ prompt: 3, agent_type: 4 });
assert.ok(noTurn.ok);
assert.strictEqual(noTurn.value.prompt, undefined);
assert.strictEqual(noTurn.value.agent_type, undefined);

const claude = parseClaudeHookInput({ tool_name: 7, transcript_path: '/t.jsonl', session_id: 's' });
assert.ok(claude.ok);
assert.strictEqual(claude.value.tool_name, undefined, 'claude: a non-string tool_name is dropped');
assert.strictEqual(claude.value.transcript_path, '/t.jsonl');
assert.strictEqual(claude.value.session_id, 's');

// Codex echoes tool_name and agent_id into refusals, and a truthy agent_id of
// any type turns the read-only check on, so both are kept as sent.
const codex = parseCodexHookInput({ tool_name: 7, agent_id: 7, agent_type: 'fx-lens-security' });
assert.ok(codex.ok);
assert.strictEqual(codex.value.tool_name, 7, 'codex: tool_name kept as sent');
assert.strictEqual(codex.value.agent_id, 7, 'codex: agent_id kept as sent');
assert.strictEqual(codex.value.agent_type, 'fx-lens-security');
// The shell command: Bash with a string tool_input.command (exec_command arrives so); anything else is none.
const shell = parseCodexHookInput({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls' } });
assert.ok(shell.ok);
assert.strictEqual(shell.value.command, 'ls', 'codex: the Bash command');
for (const raw of [{ tool_name: 'Bash', tool_input: { command: 42 } }, { tool_name: 'apply_patch', tool_input: { command: 'ls' } }]) {
  const none = parseCodexHookInput(raw);
  assert.ok(none.ok);
  assert.strictEqual(none.value.command, undefined, `codex: no command in ${JSON.stringify(raw)}`);
}
const prompt = parseCodexHookInput({ hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt: 'publish it', agent_id: 'a1', agent_type: 'default' });
assert.ok(prompt.ok);
assert.strictEqual(prompt.value.prompt, 'publish it', 'codex: prompt');
assert.strictEqual(prompt.value.session_id, 's1', 'codex: session_id');
assert.strictEqual(prompt.value.agent_id, 'a1', 'codex: a string agent_id');
assert.strictEqual(prompt.value.agent_type, 'default', 'codex: a string agent_type');
const noPrompt = parseCodexHookInput({ prompt: 3 });
assert.ok(noPrompt.ok);
assert.strictEqual(noPrompt.value.prompt, undefined, 'codex: a non-string prompt is dropped');
const badType = parseCodexHookInput({ agent_type: 7 });
assert.ok(badType.ok);
assert.strictEqual(badType.value.agent_type, undefined, 'codex: a non-string agent_type is dropped');

// The hooks load this parser and lib/json. A broken copy of either, one that
// throws on load or one that loads without the export, refuses every
// PreToolUse call as a broken git guard does, refuses every Codex event (it
// cannot tell them apart), and turns the Claude context hook's output into the
// "not loaded" warning. None of it crashes open.
const ROOT = path.join(__dirname, '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-hook-input-'));
try {
  const env = {
    PATH: process.env.PATH ?? '', HOME: scratch, CODEX_HOME: scratch, TMPDIR: scratch,
    XDG_CONFIG_HOME: path.join(scratch, 'config'), XDG_STATE_HOME: path.join(scratch, 'state'),
    APPDATA: path.join(scratch, 'appdata'), LOCALAPPDATA: path.join(scratch, 'localappdata'),
  };
  const bashLs = JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls' }, cwd: scratch });
  const sessionStart = JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup', cwd: scratch });
  const stubs: [string, string, string, string][] = [
    ['hook-input.js', "throw new Error('load')\n", 'load', 'load'],
    ['json.js', "throw new Error('load')\n", 'load', 'load'],
    ['hook-input.js', 'module.exports = {};\n', 'parseClaudeHookInput is not a function', 'parseCodexHookInput is not a function'],
    ['json.js', 'module.exports = {};\n', 'parseJson is not a function', 'parseJson is not a function'],
  ];
  stubs.forEach(([lib, stub, claudeWhy, codexWhy], i) => {
    const copy = path.join(scratch, `copy-${i}`);
    for (const dir of ['hooks', 'lib', path.join('codex', 'agents')]) {
      fs.cpSync(path.join(ROOT, dir), path.join(copy, dir), { recursive: true });
    }
    fs.copyFileSync(path.join(ROOT, 'PREAMBLE.md'), path.join(copy, 'PREAMBLE.md'));
    fs.writeFileSync(path.join(copy, 'lib', lib), stub);
    const run = (hook: string, input: string) =>
      spawnSync(process.execPath, [path.join(copy, 'hooks', hook)], { input, cwd: scratch, env, encoding: 'utf8' });
    const refusal = (why: string) => `[fx] hook input parser failed to load (${why}). Denying every call until the plugin is repaired.\n`;
    const label = `lib/${lib} as ${JSON.stringify(stub)}`;

    for (const [hook, why, input] of [['fx-pretooluse.js', claudeWhy, bashLs], ['fx-codex.js', codexWhy, bashLs], ['fx-codex.js', codexWhy, sessionStart]] as const) {
      const r = run(hook, input);
      assert.strictEqual(r.status, 2, `${hook} with ${label}: exit ${r.status}, stderr ${r.stderr}`);
      assert.strictEqual(r.stderr, refusal(why), `${hook} with ${label}`);
      assert.strictEqual(r.stdout, '', `${hook} with ${label}: stdout`);
    }

    const ctx = run('fx-context.js', sessionStart);
    assert.strictEqual(ctx.status, 0, `fx-context.js with ${label}: exit ${ctx.status}, stderr ${ctx.stderr}`);
    assert.match(ctx.stdout, /PREAMBLE\.md could not be read/, `fx-context.js with ${label}: the warning`);
  });
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}

// Stop and SubagentStop: stop_hook_active is true only as a boolean true, and a
// missing or non-string last_assistant_message is null.
for (const [label, parse] of [['claude', parseClaudeHookInput], ['codex', parseCodexHookInput]] as const) {
  const stop = parse({ hook_event_name: 'Stop', session_id: 's', stop_hook_active: true, last_assistant_message: 'done' });
  assert.ok(stop.ok);
  assert.strictEqual(stop.value.stop_hook_active, true, `${label}: stop_hook_active`);
  assert.strictEqual(stop.value.last_assistant_message, 'done', `${label}: last_assistant_message`);
  const bare = parse({ hook_event_name: 'Stop', session_id: 's' });
  assert.ok(bare.ok);
  assert.strictEqual(bare.value.stop_hook_active, false, `${label}: absent stop_hook_active is false`);
  assert.strictEqual(bare.value.last_assistant_message, null, `${label}: absent message is null`);
  const odd = parse({ stop_hook_active: 'true', last_assistant_message: 7 });
  assert.ok(odd.ok);
  assert.strictEqual(odd.value.stop_hook_active, false, `${label}: a string is not true`);
  assert.strictEqual(odd.value.last_assistant_message, null, `${label}: a number is not a message`);
}

// Any non-empty agent_id marks a subagent, whatever its type (task 02 ruling; final review, broad minor 2).
assert.strictEqual(subagentId('a1'), 'a1');
assert.strictEqual(subagentId(7), '7');
assert.strictEqual(subagentId(0), '0');
for (const none of [undefined, null, '']) assert.strictEqual(subagentId(none), null, String(none));

console.log('hook-input.test.js: ok');
