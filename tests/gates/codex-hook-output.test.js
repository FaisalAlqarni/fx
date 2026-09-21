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
// On exit, not at the end: a failed assertion must not leave the scratch dir behind.
process.on('exit', () => fs.rmSync(home, { recursive: true, force: true }));

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

// Control: the controller (no agent_id) is not a subagent, so the read-only
// rule is not its business. It may spawn and call MCP tools.
r = run({ ...base, cwd: home, hook_event_name: 'PreToolUse', tool_name: 'spawn_agent', tool_input: { message: 'reply ok' } });
assert.strictEqual(r.code, 0, `the controller can spawn: ${r.err}`);
assert.strictEqual(r.out, '', 'an allowed controller spawn prints nothing');

r = run({ ...base, cwd: home, hook_event_name: 'PreToolUse', tool_name: 'mcp__x__y', tool_input: {} });
assert.strictEqual(r.code, 0, `the controller can call an MCP tool: ${r.err}`);
assert.strictEqual(r.out, '', 'an allowed controller MCP call prints nothing');

// Fail-closed allowlist for read-only agents: a tool the hook does not know
// is refused, not waved through. memory_tool and request_permissions_tool
// are Codex tools a role can carry (research/codex.md, "Making a subagent
// read-only").
for (const tool of ['memory_tool', 'request_permissions_tool']) {
  r = run({ ...base, cwd: home, hook_event_name: 'PreToolUse', agent_id: 'lens1', tool_name: tool, tool_input: {} });
  keysOk(r.out, `refused ${tool}`);
  assert.ok(denied(r), `read-only agent cannot call ${tool}`);
}

// Task 14 round 5: a read-only agent runs no git. The controller and a
// recorded default agent still can: their git goes through the git guard,
// never the read-only classifier. The controller's refused `git branch -D`
// above is the guard's refusal; these are its allows.
for (const command of ['git diff', 'git log --oneline', 'git status', '/usr/bin/git show x']) {
  r = run({ ...base, cwd: home, hook_event_name: 'PreToolUse', agent_id: 'lens1', tool_name: 'Bash', tool_input: { command } });
  keysOk(r.out, `lens ${command}`);
  assert.ok(denied(r), `a read-only agent cannot run ${command}`);
}
for (const [who, extra] of [['controller', {}], ['default agent', { agent_id: 'a1' }]]) {
  for (const command of ['git status', 'git log --oneline', 'git diff HEAD~1']) {
    r = run({ ...base, ...extra, cwd: root, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } });
    assert.strictEqual(r.code, 0, `the ${who} can run ${command}: ${r.err}`);
    assert.strictEqual(r.out, '', `an allowed ${who} git read prints nothing`);
  }
}

r = run({ ...base, cwd: home, hook_event_name: 'PreToolUse', agent_id: 'lens1', tool_name: 'Bash', tool_input: { command: 'cat file' } });
assert.strictEqual(r.code, 0, `a read-only agent can run a cleared read: ${r.err}`);
assert.strictEqual(r.out, '', 'an allowed read prints nothing');

for (const tool of ['memory_tool', 'request_permissions_tool']) {
  r = run({ ...base, cwd: home, hook_event_name: 'PreToolUse', agent_id: 'a1', tool_name: tool, tool_input: {} });
  assert.strictEqual(r.code, 0, `a default agent can call ${tool}: ${r.err}`);
  assert.strictEqual(r.out, '', `an allowed ${tool} prints nothing`);
}

// A classifier that throws must count as a write. No input makes the real
// classifier throw (it guards non-strings and caps recursion), so this
// preloads a stub that replaces isWritingToolCall on the cached module before
// fx-codex.js destructures it.
{
  const stub = path.join(home, 'throwing-classifier.js');
  fs.writeFileSync(stub, `require(${JSON.stringify(path.join(root, 'lib', 'plant-roles'))})`
    + '.isWritingToolCall = () => { throw new Error("classifier crashed"); };\n');
  const t = spawnSync('node', ['--require', stub, hook], {
    input: JSON.stringify({ ...base, cwd: home, hook_event_name: 'PreToolUse', agent_id: 'lens1',
      tool_name: 'Bash', tool_input: { command: 'cat file' } }),
    env, encoding: 'utf8',
  });
  const tr = { code: t.status, out: t.stdout.trim(), err: t.stderr };
  keysOk(tr.out, 'classifier crash');
  assert.ok(denied(tr), 'a classifier crash is refused, not treated as a read');
}

// ---- Task 16: the restart notice reaches the user, once, when roles were written ----
{
  const { READ_ONLY_AGENTS } = require(path.join(root, 'lib', 'plant-roles'));
  assert.strictEqual(READ_ONLY_AGENTS.length, 6, 'six read-only roles');
  const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-codex-notice-home-'));
  const env2 = { ...process.env, CODEX_HOME: fresh, HOME: fresh, TMPDIR: fresh };
  const start = () => {
    const r = spawnSync('node', [hook], {
      input: JSON.stringify({ ...base, hook_event_name: 'SessionStart', source: 'startup' }),
      env: env2, encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    keysOk(r.stdout.trim(), 'SessionStart with notice', TOP_SESSION);
    return JSON.parse(r.stdout);
  };
  // plantRoles returns absolute paths; the notice names each by path.basename(p, '.toml').
  const notice = (names) => `fx installed or updated its review roles (${names.join(', ')}). `
    + 'Codex reads roles when a session starts, so restart Codex once before dispatching an fx review agent.';

  const first = start();
  assert.strictEqual(first.systemMessage, notice(READ_ONLY_AGENTS), 'the user sees the exact notice');
  assert.ok(first.hookSpecificOutput.additionalContext.trimEnd().endsWith(notice(READ_ONLY_AGENTS)),
    'the model gets the same line');

  const second = start();
  assert.ok(!('systemMessage' in second), 'second session is silent');
  assert.ok(!second.hookSpecificOutput.additionalContext.includes('restart Codex once'), 'and carries no copy');

  fs.appendFileSync(path.join(fresh, 'agents', 'fx-lens-a11y.toml'), '\n# drift\n');
  const third = start();
  assert.strictEqual(third.systemMessage, notice(['fx-lens-a11y']), 'only the repaired role, by name');
  fs.rmSync(fresh, { recursive: true, force: true });
}

console.log('codex-hook-output: all passed');
