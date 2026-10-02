'use strict';
const assert = require('node:assert');
const path = require('path');
const or = require(path.join(__dirname, 'lib', 'openrouter'));

assert.strictEqual(or.MODELS.primary, 'qwen/qwen3.8-27b:free');
assert.strictEqual(or.MODELS.fallback, 'deepseek/deepseek-v4-flash');
assert.strictEqual(or.MODELS.claude, 'anthropic/claude-haiku-4.5');

process.env.OPENROUTER_API_KEY = 'sk-or-v1-testonly';
for (const h of ['codex', 'opencode', 'opencode-v2', 'claude-code']) {
  const m = h === 'claude-code' ? or.MODELS.claude : or.MODELS.primary;
  const s = or.providerSetup(h, m);
  assert.ok(s && typeof s.files === 'object' && typeof s.env === 'object', `${h}: setup has files and env`);
  const all = JSON.stringify(s);
  assert.ok(all.includes(m), `${h}: the model is set`);
  assert.ok(!all.includes('sk-or-'), `${h}: no key text in the setup, even with the key exported`);
}
assert.ok(JSON.stringify(or.providerSetup('codex', or.MODELS.primary).files).includes('OPENROUTER_API_KEY'),
  'codex reads the key from the environment');
assert.strictEqual(or.providerSetup('claude-code', or.MODELS.claude).env.ANTHROPIC_BASE_URL, 'https://openrouter.ai/api');
// A headless `opencode run` has no one to answer the question tool, and a session
// that calls it ends "Session interrupted: shutdown" (task 13, rows 04 and 15).
const v2cfg = JSON.parse(or.providerSetup('opencode-v2', or.MODELS.primary).files['.config/opencode/opencode.json']);
assert.deepStrictEqual(v2cfg.permissions, [{ action: 'question', resource: '*', effect: 'deny' }], 'opencode-v2 runs deny the question tool');
assert.deepStrictEqual(v2cfg.agents, { general: { permissions: [{ action: 'subagent', resource: '*', effect: 'allow' }] } }, "opencode-v2 runs carry the user's own rule that lets general dispatch");
assert.throws(() => or.providerSetup('unknown', or.MODELS.primary), /unknown harness/);

for (const [events, stderr] of [
  ['', 'ERROR: exceeded retry limit, last status: 429 Too Many Requests'],
  ['{"type":"error","message":"API Error: 503 upstream"}', ''],
  ['{"type":"turn.failed","error":{"message":"401 Unauthorized"}}', ''],
  ['', 'Insufficient credits. This account never purchased credits.'],
  ['{"type":"error","error":{"status":503,"message":"upstream"}}', ''],
  ['', 'HTTP/1.1 502 Bad Gateway'],
]) assert.ok(or.isProviderError(events, stderr), `provider error: ${events || stderr}`);
for (const [events, stderr] of [
  ['', 'FAIL  12  read-only agent cannot edit'],
  ['', 'expected a Skill call, saw none'],
  ['', ''],
  ['', 'error: could not write 512 bytes'],
  ['', 'Unauthorized tool: rm'],
  ['', 'error: exit code 500 from my script'],
  ['', 'fatal: error at line 500 of config'],
  ['', 'fx: no first token before the timeout'],
]) assert.ok(!or.isProviderError(events, stderr), `not a provider error: ${events || stderr || '(empty)'}`);
assert.strictEqual(or.isProviderError.length, 2, 'the check takes only CLI error events and stderr, never the whole stream');

// A 429 inside a subagent spawn reaches the CLI's stream as a collab_tool_call
// whose agent state is errored (Codex 0.155.1, row 07 of the baseline). Only
// that CLI-written state counts: not the spawn's prompt, the model's message
// or a tool's output, which carry text a model or a tool can write. A grandchild's
// error is not in the exec stream; it is in the rollout of the child that waited
// for it, as an event_msg CollabAgentToolCall (row 18, qwen run 2026-10-01).
const collab = (state, extra = {}) => JSON.stringify({ type: 'item.completed', item: { id: 'item_4', type: 'collab_tool_call', tool: 'wait',
  prompt: null, agents_states: { 'thread-1': state }, status: 'failed', ...extra } });
assert.strictEqual(or.childProviderError([
  '{"type":"thread.started"}',
  collab({ status: 'errored', message: 'exceeded retry limit, last status: 429 Too Many Requests, request id: a4373093f98cedb4-MXP' }),
].join('\n')), 'last status: 429', 'a subagent 429 is a provider error');
assert.ok(or.childProviderError(collab({ status: 'errored', message: 'API Error: 503 upstream' })), 'a subagent 503 is one too');
assert.strictEqual(or.childProviderError(JSON.stringify({ type: 'event_msg', payload: { type: 'item_completed', item: { type: 'CollabAgentToolCall',
  agents_states: { t: { errored: 'exceeded retry limit, last status: 429 Too Many Requests' } } } } })), 'last status: 429', 'a grandchild 429, from the child\'s rollout');
for (const [what, line] of [
  ['a completed child', collab({ status: 'completed', message: 'done' })],
  ['an errored child with no HTTP error', collab({ status: 'errored', message: 'tool failed: status 500 in my script' })],
  ['429 text in the spawn prompt', collab({ status: 'running', message: null }, { tool: 'spawn_agent', prompt: 'say last status: 429 Too Many Requests' })],
  ['429 text in the model message', JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'exceeded retry limit, last status: 429 Too Many Requests' } })],
  ['429 in a command output', JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', aggregated_output: 'last status: 429 Too Many Requests' } })],
  ['a rollout function output', JSON.stringify({ type: 'response_item', payload: { type: 'function_call_output', output: '{"status":{"t":{"errored":"last status: 429 Too Many Requests"}}}' } })],
  ['a rollout message', JSON.stringify({ type: 'response_item', payload: { type: 'message', content: [{ text: 'last status: 429 Too Many Requests' }] } })],
  ['a rollout call whose state is not errored', JSON.stringify({ type: 'event_msg', payload: { item: { type: 'CollabAgentToolCall', agents_states: { t: { completed: 'last status: 429 Too Many Requests' } } } } })],
  ['no JSON', 'stderr: last status: 429 Too Many Requests'],
]) assert.strictEqual(or.childProviderError(line), null, `not a child provider error: ${what}`);

// A detector that cannot read the log is blind, never clean: a cut JSON line, or
// no rollout in a Codex log, throws.
assert.strictEqual(or.childCheck('codex', '{"type":"session_meta","payload":{"id":"t0"}}\n' + collab({ status: 'completed', message: 'ok' })), null);
assert.throws(() => or.childCheck('codex', collab({ status: 'completed', message: 'ok' })), /no rollout/, 'a Codex log with no session_meta is blind');
assert.throws(() => or.childCheck('claude-code', '{"type":"result"}\n{"type":"item.comp'), /unparseable/, 'a cut JSON line is blind');
assert.strictEqual(or.childCheck('claude-code', 'stderr: {not json}\ntranscript: {x'), null, 'prefixed lines are not stream lines');
// OpenCode (1.x and 2.x): a subagent's provider error lives in the session
// export's assistant message, info.error.data (real shape: row 18, 429 from
// OpenRouter). Claude Code: an API-error entry in the transcript carries
// isApiErrorMessage and apiErrorStatus (recorded from a real sidechain).
const exp = (info) => JSON.stringify({ fx_export: { info: { id: 'ses_c' }, messages: [{ info }] } });
for (const h of ['opencode']) {
  assert.strictEqual(or.childCheck(h, exp({ role: 'assistant', error: { name: 'APIError', data: { message: 'rate-limited upstream', statusCode: 429, isRetryable: true } } })), '429', `${h}: a child APIError status is a provider error`);
  assert.ok(or.childCheck(h, exp({ role: 'assistant', error: { name: 'APIError', data: { message: 'Insufficient credits', statusCode: 400 } } })), `${h}: a provider message counts too`);
  assert.strictEqual(or.childCheck(h, exp({ role: 'assistant', modelID: 'x' })), null, `${h}: a clean export`);
  assert.strictEqual(or.childCheck(h, exp({ role: 'assistant', error: { name: 'ToolError', data: { message: 'tool failed: status 500 in my script', statusCode: 400 } } })), null, `${h}: a non-provider error`);
}
// 2.x exports flat messages (no info key). The two assistant messages below
// are the real 2.0.18 export lines of a subagent whose provider call failed
// (probe-findings.md, section 12): `finish: "error"` and an `error` of
// {type, message, status}, no wrapper. A 401 came from a provider entry with a
// bad key; a 400 from a model id OpenRouter does not know.
const expv2 = (m) => JSON.stringify({ fx_export: { info: { id: 'ses_c' }, messages: [m] } });
const real = (error) => ({ id: 'msg_0fa1d6381001yAkr5hIXXi4Jj6', time: { created: 1790902625167, completed: 1790902625357 }, type: 'assistant', agent: 'badchild', model: { id: 'q', providerID: 'orbad', variant: 'default' }, content: [], snapshot: { files: [] }, finish: 'error', error });
assert.strictEqual(or.childCheck('opencode-v2', expv2(real({ type: 'provider.auth', message: 'Missing Authentication header', status: 401 }))), '401', 'opencode-v2: the real 401 export message');
assert.strictEqual(or.childCheck('opencode-v2', expv2(real({ type: 'provider.invalid-request', message: 'qwen/qwen3.8-27b-nope is not a valid model ID', status: 400 }))), null, 'opencode-v2: the real 400 is the row\'s own bad request, not a provider outage');
// The 429 and 503 cases below are synthetic: no real 429 or 503 was captured.
assert.strictEqual(or.childCheck('opencode-v2', expv2({ type: 'assistant', error: { type: 'provider.rate-limit', status: 429, message: 'rate-limited upstream' } })), '429', 'opencode-v2: a flat message error status');
assert.strictEqual(or.childCheck('opencode-v2', expv2({ type: 'assistant', error: { statusCode: 503 } })), '503', 'opencode-v2: statusCode works too');
assert.ok(or.childCheck('opencode-v2', expv2({ type: 'assistant', error: { message: 'Insufficient credits' } })), 'opencode-v2: a provider message counts');
assert.strictEqual(or.childCheck('opencode-v2', expv2({ type: 'assistant', model: { id: 'x' } })), null, 'opencode-v2: a clean flat message');
assert.strictEqual(or.childCheck('opencode-v2', expv2({ type: 'assistant', error: { message: 'tool failed: status 500 in my script', status: 400 } })), null, 'opencode-v2: a non-provider error');
const tr = (o) => 'transcript: ' + JSON.stringify(o);
assert.strictEqual(or.childCheck('claude-code', tr({ type: 'assistant', isSidechain: true, isApiErrorMessage: true, apiErrorStatus: 429, error: 'rate_limit' })), '429', 'claude-code: an API-error transcript entry');
assert.strictEqual(or.childCheck('claude-code', tr({ type: 'assistant', isApiErrorMessage: false, message: { content: [{ type: 'text', text: 'last status: 429' }] } })), null, 'claude-code: a clean transcript, 429 text in a message is not read');
assert.strictEqual(or.childCheck('claude-code', tr({ type: 'assistant', isSidechain: true, isApiErrorMessage: true, error: 'authentication_failed' })), 'authentication_failed', 'claude-code: an API error with no status still counts');
const cpx = require('child_process');
assert.strictEqual(cpx.spawnSync('node', [path.join(__dirname, 'lib', 'openrouter.js'), 'child', '/nonexistent/log', 'codex']).status, 3, 'a missing log exits 3');

const init = '{"type":"system","subtype":"init","model":"anthropic/claude-haiku-4.5","tools":[]}\n{"type":"result"}';
assert.strictEqual(or.sessionModel('claude-code', init), 'anthropic/claude-haiku-4.5');
assert.strictEqual(or.sessionModel('claude-code', '{"type":"system","subtype":"init","model":"claude-opus-4"}'), 'claude-opus-4',
  'the reported model is returned as is, so the runner can see a mismatch');
assert.strictEqual(or.sessionModel('claude-code', 'not json'), null);

// A scan that cannot run is never "clean": a missing file exits 3, not 0 or 10.
const cp = require('child_process');
assert.strictEqual(cp.spawnSync('node', [path.join(__dirname, 'lib', 'openrouter.js'), 'leaks', '/nonexistent/log']).status, 3);

// Recorded shapes, trimmed: Codex's rollout turn_context, OpenCode 1.18.25's and
// 2.0.18's session export (live.sh appends it as a fx_export line).
assert.strictEqual(or.sessionModel('codex',
  '{"type":"thread.started"}\n{"type":"turn_context","payload":{"model":"deepseek/deepseek-v4-flash","cwd":"/x"}}'), 'deepseek/deepseek-v4-flash');
assert.strictEqual(or.sessionModel('codex', '{"type":"thread.started"}'), null, 'no turn_context, no model');
assert.strictEqual(or.sessionModel('opencode',
  '{"fx_export":{"info":{"id":"ses_1"},"messages":[{"info":{"role":"user"}},{"info":{"role":"assistant","modelID":"qwen/qwen3.8-27b:free","providerID":"openrouter"}}]}}'),
  'qwen/qwen3.8-27b:free');
assert.strictEqual(or.sessionModel('opencode-v2',
  '{"fx_export":{"info":{"id":"ses_1"},"messages":[{"type":"user"},{"type":"assistant","model":{"id":"qwen/qwen3.8-27b:free","providerID":"openrouter"}}]}}'),
  'qwen/qwen3.8-27b:free');
assert.strictEqual(or.sessionModel('opencode-v2', '{"type":"text","part":{"text":"N=111"}}'), null, 'a run stream alone names no model');

assert.ok(or.leaksKey('token sk-or-v1-abc'), 'a key is caught');
assert.ok(!or.leaksKey('no secrets here'), 'clean text passes');
assert.ok(or.leaksKey('the key is hunter2-key here', 'hunter2-key'), "the key's own value is caught, with no sk-or- prefix");
assert.ok(!or.leaksKey('nothing', 'hunter2-key') && !or.leaksKey('nothing', ''), 'an empty or absent key value matches nothing');
assert.strictEqual(or.NO_FIRST_TOKEN, undefined, 'a timeout is no longer a provider error by itself');
// applySetup: a second call for the same row replaces the TOML fragment, and
// JSON merges into the existing config without dropping its other keys.
const fs = require('fs'), os = require('os');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'or-test-'));
fs.mkdirSync(path.join(home, '.codex'));
fs.writeFileSync(path.join(home, '.codex', 'config.toml'), '[plugins.fx]\nenabled = true\n\n[marketplaces.fx]\nsource = "/x"\n');
or.applySetup(or.providerSetup('codex', 'a/one'), home);
or.applySetup(or.providerSetup('codex', 'b/two'), home);
const toml = fs.readFileSync(path.join(home, '.codex', 'config.toml'), 'utf8');
assert.strictEqual(toml.split('[model_providers.openrouter]').length, 2, 'the provider table appears once');
assert.strictEqual(toml.split('[agents]').length, 2, 'the agents table appears once');
assert.ok(/\[agents\]\nmax_depth = 2\n/.test(toml), 'codex nests two deep, so rows 15 and 18 can judge a V1 model');
assert.ok(toml.includes('model = "b/two"') && !toml.includes('a/one') && toml.includes('[plugins.fx]\nenabled = true') && toml.includes('[marketplaces.fx]'), 'latest model, existing tables kept');
fs.mkdirSync(path.join(home, '.config', 'opencode'), { recursive: true });
fs.writeFileSync(path.join(home, '.config', 'opencode', 'opencode.json'), '{"plugin":["x"]}');
or.applySetup(or.providerSetup('opencode', or.MODELS.primary), home);
const oc = JSON.parse(fs.readFileSync(path.join(home, '.config', 'opencode', 'opencode.json'), 'utf8'));
assert.deepStrictEqual(oc.plugin, ['x']);
assert.strictEqual(oc.model, `openrouter/${or.MODELS.primary}`);
fs.rmSync(home, { recursive: true });
console.log('openrouter.test.js: OK');
