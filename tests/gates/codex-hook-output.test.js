'use strict';
// Amendment A2. Codex rejects hook output carrying a key it does not know, and
// the rejection fails OPEN: the run is marked failed and nothing is blocked.
// So every shape fx-codex.js prints is pinned here, at the process seam.
// Pattern copied from ponytail's tests/hooks.test.js: spawn the real script
// with a real, scrubbed environment and assert on the JSON it prints.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const hook = path.join(root, 'hooks', 'fx-codex.js');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-codex-output-home-'));
// TMPDIR too: identity records go under os.tmpdir() (lib/plant-roles.js
// identityDir), and they must stay inside this scratch directory.
const env = { ...process.env, CODEX_HOME: home, HOME: home, TMPDIR: home };

// ponytail's Codex shape: systemMessage beside hookSpecificOutput, on SessionStart.
const TOP_SESSION = new Set(['hookSpecificOutput', 'systemMessage']);
const TOP = new Set(['hookSpecificOutput']);
const INNER = new Set(['hookEventName', 'additionalContext', 'permissionDecision', 'permissionDecisionReason']);

function run(payload) {
  const r = spawnSync('node', [hook], { input: JSON.stringify(payload), env, encoding: 'utf8' });
  return { code: r.status, out: r.stdout.trim(), err: r.stderr };
}
function keysOk(out, label, top = TOP) {
  if (!out) return;
  const j = JSON.parse(out);
  for (const k of Object.keys(j)) assert.ok(top.has(k), `${label}: unknown top-level key ${k}`);
  for (const k of Object.keys(j.hookSpecificOutput || {})) assert.ok(INNER.has(k), `${label}: unknown key ${k}`);
}
function denied(r) {
  return r.code === 2 || (r.out !== '' && JSON.parse(r.out).hookSpecificOutput.permissionDecision === 'deny');
}

const base = { session_id: 's', turn_id: 't', cwd: root, transcript_path: null };
const PATCH = '*** Begin Patch\n*** Add File: x.txt\n+hi\n*** End Patch\n';

let r = run({ ...base, hook_event_name: 'SessionStart', source: 'startup' });
assert.strictEqual(r.code, 0); keysOk(r.out, 'SessionStart', TOP_SESSION);
assert.ok(JSON.parse(r.out).hookSpecificOutput.additionalContext.includes('$fx-tdd'), 'Codex addressing');

r = run({ ...base, hook_event_name: 'SubagentStart', agent_id: 'a1', agent_type: 'default' });
assert.strictEqual(r.code, 0); keysOk(r.out, 'SubagentStart');

r = run({ ...base, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git branch -D fx-guard-probe' } });
keysOk(r.out, 'refused Bash');
assert.ok(denied(r), 'guard refuses');

r = run({ ...base, hook_event_name: 'SubagentStart', agent_id: 'lens1', agent_type: 'fx-lens-security' });
assert.strictEqual(r.code, 0);
r = run({ ...base, hook_event_name: 'PreToolUse', agent_id: 'lens1', agent_type: 'fx-lens-security',
  tool_name: 'apply_patch', tool_input: { command: PATCH } });
keysOk(r.out, 'refused apply_patch');
assert.ok(denied(r), 'read-only agent cannot patch');

// Amendment A5: a lens must not hand the write to a child or to an MCP server.
r = run({ ...base, hook_event_name: 'PreToolUse', agent_id: 'lens1', agent_type: 'fx-lens-security',
  tool_name: 'spawn_agent', tool_input: { message: 'create x.txt', agent_type: 'default' } });
keysOk(r.out, 'refused spawn_agent');
assert.ok(denied(r), 'read-only agent cannot spawn a child');

r = run({ ...base, hook_event_name: 'PreToolUse', agent_id: 'lens1', agent_type: 'fx-lens-security',
  tool_name: 'mcp__filesystem__write_file', tool_input: { path: 'x.txt', content: 'hi' } });
keysOk(r.out, 'refused mcp tool');
assert.ok(denied(r), 'read-only agent cannot call an MCP tool');

// Control: the same calls from a recorded default agent are not refused by the
// read-only rule. cwd is the scratch dir, which holds no plan, so the lane
// check has nothing to refuse and this measures the identity rule alone.
r = run({ ...base, cwd: home, hook_event_name: 'PreToolUse', agent_id: 'a1', agent_type: 'default',
  tool_name: 'apply_patch', tool_input: { command: PATCH } });
assert.strictEqual(r.code, 0, `a default agent can patch: ${r.err}`);
assert.strictEqual(r.out, '', 'an allowed patch prints nothing');

r = run({ ...base, cwd: home, hook_event_name: 'PreToolUse', agent_id: 'a1', agent_type: 'default',
  tool_name: 'spawn_agent', tool_input: { message: 'reply ok' } });
assert.strictEqual(r.code, 0, `a default agent can spawn: ${r.err}`);
assert.strictEqual(r.out, '', 'an allowed spawn prints nothing');

r = run({ ...base, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls' } });
assert.strictEqual(r.code, 0); assert.strictEqual(r.out, '', 'an allow prints nothing');

fs.rmSync(home, { recursive: true, force: true });
console.log('codex-hook-output: all passed');
