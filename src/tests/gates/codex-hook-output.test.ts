// Amendment A2. Codex rejects hook output carrying a key it does not know, and
// the rejection fails OPEN: the run is marked failed and nothing is blocked.
// So every shape fx-codex.js prints is pinned here, at the process seam.
// Pattern copied from ponytail's tests/hooks.test.js: spawn the real script
// with a real, scrubbed environment and assert on the JSON it prints.
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { READ_ONLY_AGENTS } from '../../lib/plant-roles.js';
import { scratchHookEnv } from '../helpers/hook-env.js';

const root = path.join(__dirname, '..', '..');
const hook = path.join(root, 'hooks', 'fx-codex.js');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-codex-output-home-'));
// TMPDIR too: identity records go under os.tmpdir() (lib/plant-roles.js
// identityDir), and they must stay inside this scratch directory.
// scratchHookEnv: XDG config and state in scratch too, so the developer's fx state is never read.
const scratch = scratchHookEnv();
const env = { ...scratch.env, CODEX_HOME: home, HOME: home, TMPDIR: home };
// On exit, not at the end: a failed assertion must not leave the scratch dir behind.
process.on('exit', () => { fs.rmSync(home, { recursive: true, force: true }); scratch.cleanup(); });

// The allowed top-level keys per event. ponytail's Codex shape: systemMessage
// beside hookSpecificOutput, on SessionStart. PreToolUse: the shell guard's
// warn form, per https://learn.chatgpt.com/docs/hooks ("PreToolUse and
// PermissionRequest support only systemMessage"; "Add context:
// hookSpecificOutput.additionalContext"). UserPromptSubmit prints only the lane
// hint, which task 01 measured Codex accepting (references/harnesses/codex.md,
// "User prompts"): top hookSpecificOutput, inner hookEventName and additionalContext.
// PostToolUse prints only the stuck-loop nudge: top hookSpecificOutput, inner hookEventName and additionalContext.
const TOP_SESSION = new Set(['hookSpecificOutput', 'systemMessage']);
const TOP = new Set(['hookSpecificOutput']);
const TOP_PRE = new Set(['hookSpecificOutput', 'systemMessage']);
const INNER = new Set(['hookEventName', 'additionalContext', 'permissionDecision', 'permissionDecisionReason']);

interface Result { code: number | null; out: string; err: string }

function run(payload: Record<string, unknown>): Result {
  const r = spawnSync('node', [hook], { input: JSON.stringify(payload), env, encoding: 'utf8' });
  return { code: r.status, out: r.stdout.trim(), err: r.stderr };
}
function keysOk(out: string, label: string, top: Set<string> = TOP) {
  if (!out) return;
  const j = JSON.parse(out); // ts-gate-ok: the test parses output it just produced
  for (const k of Object.keys(j)) assert.ok(top.has(k), `${label}: unknown top-level key ${k}`);
  for (const k of Object.keys(j.hookSpecificOutput || {})) assert.ok(INNER.has(k), `${label}: unknown key ${k}`);
}
function denied(r: Result) {
  // A deny must say why: exit 2 with an empty stderr is a silent refusal (final review Minor 11).
  return (r.code === 2 && r.err.trim() !== '') || (r.out !== '' && JSON.parse(r.out).hookSpecificOutput.permissionDecision === 'deny'); // ts-gate-ok: the test parses output it just produced
}

const base = { session_id: 's', turn_id: 't', cwd: root, transcript_path: null };
const PATCH = '*** Begin Patch\n*** Add File: x.txt\n+hi\n*** End Patch\n';

let r = run({ ...base, hook_event_name: 'SessionStart', source: 'startup' });
assert.strictEqual(r.code, 0); keysOk(r.out, 'SessionStart', TOP_SESSION);
assert.ok(JSON.parse(r.out).hookSpecificOutput.additionalContext.includes('$fx:fx-tdd'), 'Codex addressing'); // ts-gate-ok: the test parses output it just produced

r = run({ ...base, hook_event_name: 'SubagentStart', agent_id: 'a1', agent_type: 'default' });
assert.strictEqual(r.code, 0); keysOk(r.out, 'SubagentStart');

r = run({ ...base, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git branch -D fx-guard-probe' } });
keysOk(r.out, 'refused Bash', TOP_PRE);
assert.ok(denied(r), 'guard refuses');

r = run({ ...base, hook_event_name: 'UserPromptSubmit', prompt: 'publish it' });
assert.strictEqual(r.code, 0); assert.strictEqual(r.out, '', 'UserPromptSubmit prints nothing');
r = run({ ...base, hook_event_name: 'UserPromptSubmit', agent_id: 'a1', agent_type: 'default', prompt: 'implement task 3' });
assert.strictEqual(r.code, 0); assert.strictEqual(r.out, '', 'a subagent UserPromptSubmit prints nothing');

// PostToolUse: nothing until the third identical failure, then only the allowed keys.
{
  const post = { ...base, session_id: 'post-s', cwd: home, hook_event_name: 'PostToolUse', tool_name: 'Bash',
    tool_input: { command: 'npm test' }, tool_response: 'Exit code: 1\nOutput:\nfail' };
  for (let i = 1; i <= 2; i++) { r = run(post); assert.strictEqual(r.code, 0); assert.strictEqual(r.out, '', `PostToolUse ${i} prints nothing`); }
  r = run(post);
  assert.strictEqual(r.code, 0); assert.ok(r.out !== '', 'the third failure prints the nudge');
  keysOk(r.out, 'PostToolUse nudge', TOP);
  const inner = Object.keys(JSON.parse(r.out).hookSpecificOutput).sort(); // ts-gate-ok: the test parses output it just produced
  assert.deepStrictEqual(inner, ['additionalContext', 'hookEventName']);
}

// The shell guard's warned run, rendered by the real codexGuardOutput: a stub
// guardShell answers ask, and the guard-off form from a stub that rejects.
for (const [label, stub] of [
  ['shell guard ask', "exports.guardShell = async () => ({ action: 'ask', reason: '[fx] shell guard asks: x.', source: 'grey' });\n"],
  ['shell guard off', "exports.guardShell = () => Promise.reject(new Error('off'));\n"],
]) {
  const copy = fs.mkdtempSync(path.join(home, 'guard-'));
  for (const d of ['hooks', 'lib', 'codex']) fs.cpSync(path.join(root, d), path.join(copy, d), { recursive: true });
  fs.copyFileSync(path.join(root, 'PREAMBLE.md'), path.join(copy, 'PREAMBLE.md'));
  fs.writeFileSync(path.join(copy, 'lib', 'shell-guard.js'), stub!);
  const t = spawnSync('node', [path.join(copy, 'hooks', 'fx-codex.js')], {
    input: JSON.stringify({ ...base, cwd: home, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'npm publish' } }),
    env, encoding: 'utf8' });
  assert.strictEqual(t.status, 0, `${label}: ${t.stderr}`);
  assert.ok(t.stdout.trim() !== '', `${label}: prints the warning`);
  keysOk(t.stdout.trim(), label!, TOP_PRE);
}

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
const WHO: [string, Record<string, unknown>][] = [['controller', {}], ['default agent', { agent_id: 'a1' }]];
for (const [who, extra] of WHO) {
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
  assert.strictEqual(READ_ONLY_AGENTS.length, 6, 'six read-only roles');
  const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-codex-notice-home-'));
  const env2 = { ...scratch.env, CODEX_HOME: fresh, HOME: fresh, TMPDIR: fresh };
  const start = () => {
    const r = spawnSync('node', [hook], {
      input: JSON.stringify({ ...base, hook_event_name: 'SessionStart', source: 'startup' }),
      env: env2, encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    keysOk(r.stdout.trim(), 'SessionStart with notice', TOP_SESSION);
    return JSON.parse(r.stdout); // ts-gate-ok: the test parses output it just produced
  };
  // plantRoles returns absolute paths; the notice names each by path.basename(p, '.toml').
  const notice = (names: readonly string[]) => `fx installed or updated its review roles (${names.join(', ')}). `
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

// A plantRoles that throws leaves one stderr line with the reason, and the
// session still starts with its preamble.
{
  const stub = path.join(home, 'throwing-plant.js');
  fs.writeFileSync(stub, `require(${JSON.stringify(path.join(root, 'lib', 'plant-roles'))})`
    + '.plantRoles = () => { throw new Error("disk full"); };\n');
  const t = spawnSync('node', ['--require', stub, hook], {
    input: JSON.stringify({ ...base, hook_event_name: 'SessionStart', source: 'startup' }), env, encoding: 'utf8' });
  assert.strictEqual(t.status, 0, 'the session still starts when planting throws');
  keysOk(t.stdout.trim(), 'SessionStart with a planting failure', TOP_SESSION);
  assert.ok(JSON.parse(t.stdout).hookSpecificOutput.additionalContext.length > 0, 'and carries the preamble'); // ts-gate-ok: the test parses output it just produced
  assert.match(t.stderr, /\[fx\].*plant.*disk full/i, 'one stderr line names the failure and its reason');
  assert.strictEqual(t.stderr.trim().split('\n').length, 1, 'exactly one line');
}

// Final review I3: if lib/plant-roles fails to load, a subagent's call must
// not slip past the read-only check. A copy of the plugin whose plant-roles
// throws on require stands in for a broken install.
{
  const broken = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-codex-broken-'));
  try {
    for (const d of ['hooks', 'lib', 'codex']) fs.cpSync(path.join(root, d), path.join(broken, d), { recursive: true });
    fs.copyFileSync(path.join(root, 'PREAMBLE.md'), path.join(broken, 'PREAMBLE.md'));
    fs.writeFileSync(path.join(broken, 'lib', 'plant-roles.js'), "throw new Error('stubbed plant-roles failure');\n");
    const runBroken = (payload: Record<string, unknown>) => {
      const r = spawnSync('node', [path.join(broken, 'hooks', 'fx-codex.js')], { input: JSON.stringify(payload), env, encoding: 'utf8' });
      return { code: r.status, out: r.stdout.trim(), err: r.stderr };
    };
    for (const [tool, input] of [['apply_patch', { command: PATCH }], ['Bash', { command: 'cat README.md' }]]) {
      const b = runBroken({ ...base, hook_event_name: 'PreToolUse', agent_id: 'lens-broken', tool_name: tool, tool_input: input });
      assert.strictEqual(b.code, 2, `a subagent's ${tool} is refused when plant-roles did not load`);
      assert.match(b.err, /plant-roles/, 'and stderr names the module that failed');
    }
    const ctl = runBroken({ ...base, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'cat README.md' } });
    assert.strictEqual(ctl.code, 0, 'the controller (no agent_id) is not affected');
    const ss = runBroken({ ...base, hook_event_name: 'SessionStart', source: 'startup' });
    assert.strictEqual(ss.code, 0, 'the session still starts');
  } finally {
    fs.rmSync(broken, { recursive: true, force: true });
  }
  console.log('plant-roles load failure: passed');
}

// Pre-review fix (task 08): the fx-state patch refusal stays fail-closed. If
// lib/patch-paths cannot load, or its extractPatchPaths throws, an apply_patch
// (the direct tool or a shell heredoc) is denied with the load failure named.
for (const [label, stub] of [
  ['patch-paths fails to load', "throw new Error('stubbed patch-paths failure');\n"],
  ['extractPatchPaths throws', "exports.extractPatchPaths = () => { throw new Error('stubbed patch-paths failure'); };\n"],
]) {
  const broken = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-codex-broken-'));
  try {
    for (const d of ['hooks', 'lib', 'codex']) fs.cpSync(path.join(root, d), path.join(broken, d), { recursive: true });
    fs.copyFileSync(path.join(root, 'PREAMBLE.md'), path.join(broken, 'PREAMBLE.md'));
    fs.writeFileSync(path.join(broken, 'lib', 'patch-paths.js'), stub!);
    const runBroken = (payload: Record<string, unknown>) => {
      const b = spawnSync('node', [path.join(broken, 'hooks', 'fx-codex.js')], { input: JSON.stringify(payload), env, encoding: 'utf8' });
      return { code: b.status, out: b.stdout.trim(), err: b.stderr };
    };
    const direct = runBroken({ ...base, cwd: home, hook_event_name: 'PreToolUse', tool_name: 'apply_patch', tool_input: { command: PATCH } });
    assert.strictEqual(direct.code, 2, `${label}: a direct apply_patch into a normal path is denied`);
    assert.match(direct.err, /patch-paths|stubbed patch-paths failure/, `${label}: stderr names the failure`);
    const shell = runBroken({ ...base, cwd: home, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: `apply_patch <<'PATCH'\n${PATCH}PATCH` } });
    assert.strictEqual(shell.code, 2, `${label}: a shell apply_patch is denied`);
    assert.match(shell.err, /patch-paths|stubbed patch-paths failure/, `${label}: stderr names the failure`);
    const plain = runBroken({ ...base, cwd: home, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls' } });
    assert.strictEqual(plain.code, 0, `${label}: an ordinary shell call is not affected`);
    const post = runBroken({ ...base, cwd: home, hook_event_name: 'PostToolUse', tool_name: 'apply_patch', tool_input: { command: PATCH }, tool_response: 'ok' });
    assert.strictEqual(post.code, 0, `${label}: PostToolUse counting fails open`);
  } finally {
    fs.rmSync(broken, { recursive: true, force: true });
  }
}
console.log('patch-paths load failure: passed');

// Security re-review I2: lib/preamble (and lib/plan-state behind it) is only
// needed to render context. If either throws at load, a PreToolUse call must
// still be checked, never crash the hook with exit 1, which Codex treats as a
// failed, non-blocking run: the read-only check and the git guard would both
// be skipped.
for (const mod of ['preamble.js', 'plan-state.js']) {
  const broken = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-codex-broken-'));
  try {
    for (const d of ['hooks', 'lib', 'codex']) fs.cpSync(path.join(root, d), path.join(broken, d), { recursive: true });
    fs.copyFileSync(path.join(root, 'PREAMBLE.md'), path.join(broken, 'PREAMBLE.md'));
    fs.writeFileSync(path.join(broken, 'lib', mod), `throw new Error('stubbed ${mod} failure');\n`);
    const runBroken = (payload: Record<string, unknown>) => {
      const r = spawnSync('node', [path.join(broken, 'hooks', 'fx-codex.js')], { input: JSON.stringify(payload), env, encoding: 'utf8' });
      return { code: r.status, out: r.stdout.trim(), err: r.stderr };
    };
    const sub = runBroken({ ...base, hook_event_name: 'SubagentStart', agent_id: 'lens-np', agent_type: 'fx-lens-security' });
    assert.strictEqual(sub.code, 0, `${mod}: the subagent still starts`);
    const lens = runBroken({ ...base, hook_event_name: 'PreToolUse', agent_id: 'lens-np', tool_name: 'apply_patch', tool_input: { command: PATCH } });
    assert.strictEqual(lens.code, 2, `${mod}: a lens apply_patch is refused when ${mod} did not load`);
    const push = runBroken({ ...base, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git push --force origin main' } });
    assert.strictEqual(push.code, 2, `${mod}: a controller git push --force is refused when ${mod} did not load`);
    const ss = runBroken({ ...base, hook_event_name: 'SessionStart', source: 'startup' });
    assert.strictEqual(ss.code, 0, `${mod}: the session still starts`);
    assert.match(JSON.parse(ss.out).hookSpecificOutput.additionalContext, /NOT loaded/, `${mod}: and says the rules are missing`); // ts-gate-ok: the test parses output it just produced
  } finally {
    fs.rmSync(broken, { recursive: true, force: true });
  }
}
console.log('preamble load failure: passed');

// Security re-review Minor 5: stdin that is not a JSON object is refused. It
// cannot be told apart from a PreToolUse event, so falling through to the
// SessionStart output would allow the call. Empty stdin still starts a session.
{
  const raw = (input: string) => {
    const r = spawnSync('node', [hook], { input, env, encoding: 'utf8' });
    return { code: r.status, out: r.stdout.trim(), err: r.stderr };
  };
  for (const garbage of ['{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"git push --force"', 'not json', 'null', '42']) {
    const g = raw(garbage);
    assert.strictEqual(g.code, 2, `garbage stdin ${JSON.stringify(garbage)} is refused`);
    assert.ok(g.err.trim() !== '', 'and says why');
  }
  const empty = raw('');
  assert.strictEqual(empty.code, 0, 'empty stdin still starts a session');
  keysOk(empty.out, 'empty stdin');
  assert.ok(JSON.parse(empty.out).hookSpecificOutput.additionalContext.includes('$fx:fx-tdd'), 'with the preamble'); // ts-gate-ok: the test parses output it just produced
}
console.log('malformed stdin: passed');

// Stop and SubagentStop print nothing, or a block with exactly the keys decision and reason.
{
  const stopBase = { ...base, session_id: 'stop-s', cwd: home };
  r = run({ ...stopBase, hook_event_name: 'UserPromptSubmit', prompt: 'edit it' });
  r = run({ ...stopBase, hook_event_name: 'PostToolUse', tool_name: 'apply_patch', tool_input: { command: PATCH.replace('x.txt', 'x.ts') }, tool_response: 'ok' });
  r = run({ ...stopBase, hook_event_name: 'Stop', stop_hook_active: false, last_assistant_message: null });
  assert.strictEqual(r.code, 0, r.err); assert.ok(r.out !== '', 'an unverified edit blocks the stop');
  const stop = JSON.parse(r.out); // ts-gate-ok: the test parses output it just produced
  assert.deepStrictEqual(Object.keys(stop).sort(), ['decision', 'reason']);
  assert.strictEqual(stop.decision, 'block');
  r = run({ ...stopBase, hook_event_name: 'Stop', stop_hook_active: true, last_assistant_message: null });
  assert.strictEqual(r.code, 0); assert.strictEqual(r.out, '', 'Stop prints nothing when it already fired');
  r = run({ ...stopBase, hook_event_name: 'SubagentStop', agent_id: 'nobody', agent_type: 'default', stop_hook_active: false, last_assistant_message: null });
  assert.strictEqual(r.code, 0); assert.strictEqual(r.out, '', 'SubagentStop with no edits prints nothing');
}
console.log('stop output: passed');

console.log('codex-hook-output: all passed');
