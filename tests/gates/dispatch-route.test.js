'use strict';
// The routing hook: a general dispatch with no model runs on the standard
// tier, and the most capable tier needs a written reason. It never refuses.
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const { route } = require(path.join(root, 'lib', 'dispatch-route'));
const hook = path.join(root, 'hooks', 'fx-pretooluse.js');

// route(): pure
assert.deepStrictEqual(
  route({ subagent_type: 'general-purpose', description: 'd', prompt: 'p' }),
  { subagent_type: 'general-purpose', description: 'd', prompt: 'p', model: 'sonnet' },
  'a general dispatch with no model gets the standard tier');
assert.strictEqual(route({ prompt: 'p' }), null, 'no type may be a fork: left alone');
assert.strictEqual(route({ model: 'opus', prompt: 'p' }), null, 'a fork is left alone even with a model');
assert.strictEqual(route({ subagent_type: 'claude', prompt: 'p' }).model, 'sonnet', 'claude is general');
assert.strictEqual(route({ subagent_type: 'Plan', prompt: 'p' }).model, 'sonnet', 'Plan is general');
assert.strictEqual(route({ subagent_type: 'general-purpose', model: 'haiku', prompt: 'p' }), null, 'a chosen tier stands');
assert.strictEqual(route({ subagent_type: 'general-purpose', model: 'sonnet', prompt: 'p' }), null, 'sonnet stands');
assert.strictEqual(route({ subagent_type: 'general-purpose', model: 'opus', prompt: 'do it' }).model, 'sonnet',
  'opus without a reason runs on the standard tier');
assert.strictEqual(
  route({ subagent_type: 'general-purpose', model: 'opus', prompt: 'Capable because: fix round 4\ndo it' }),
  null, 'opus with a reason stands');
assert.strictEqual(
  route({ subagent_type: 'general-purpose', model: 'opus', prompt: 'task text\n  Capable because: final branch review\n' }),
  null, 'the reason line may sit on any line');
assert.strictEqual(route({ subagent_type: 'fx:fx-lens-security', prompt: 'p' }), null, 'a typed agent keeps its own pin');
assert.strictEqual(route({ subagent_type: 'Explore', prompt: 'p' }), null, 'Explore keeps its own default');
assert.strictEqual(route({ subagent_type: 'fx:fx-lens-security', model: 'opus', prompt: 'p' }), null,
  'an fx agent pins its own tier, even with an explicit model');
assert.strictEqual(route({ subagent_type: 'other-plugin:agent', model: 'opus', prompt: 'p' }).model, 'sonnet',
  'an explicit opus on another type still needs a reason');
assert.strictEqual(route({ subagent_type: 'other-plugin:agent', prompt: 'p' }), null, 'another typed agent keeps its own pin');
assert.strictEqual(route(null), null, 'no input, no change');
assert.strictEqual(route('nonsense'), null, 'a non-object input is left alone');

// the hook, as a process
function run(payload) {
  const r = spawnSync('node', [hook], { input: JSON.stringify(payload), encoding: 'utf8' });
  return { code: r.status, out: r.stdout.trim(), err: r.stderr };
}
const base = { session_id: 's', cwd: root, hook_event_name: 'PreToolUse' };

let r = run({ ...base, tool_name: 'Agent', tool_input: { subagent_type: 'general-purpose', description: 'd', prompt: 'p' } });
assert.strictEqual(r.code, 0, `the hook never refuses: ${r.err}`);
const out = JSON.parse(r.out).hookSpecificOutput;
assert.strictEqual(out.hookEventName, 'PreToolUse');
assert.strictEqual(out.permissionDecision, undefined, 'the normal permission flow still applies');
assert.deepStrictEqual(out.updatedInput,
  { subagent_type: 'general-purpose', description: 'd', prompt: 'p', model: 'sonnet' });

r = run({ ...base, tool_name: 'Agent', tool_input: { subagent_type: 'general-purpose', model: 'sonnet', prompt: 'p' } });
assert.strictEqual(r.code, 0);
assert.strictEqual(r.out, '', 'a routed call passes with no output');

r = run({ ...base, tool_name: 'Task', tool_input: { subagent_type: 'general-purpose', prompt: 'p' } });
assert.strictEqual(JSON.parse(r.out).hookSpecificOutput.updatedInput.model, 'sonnet', 'the older tool name is routed too');

r = run({ ...base, tool_name: 'Agent', tool_input: { subagent_type: 'general-purpose', model: 'opus', prompt: 'p' } });
assert.strictEqual(JSON.parse(r.out).hookSpecificOutput.updatedInput.model, 'sonnet', 'the hook applies the opus rule');

// fail open: a copy of the hook against a broken module never refuses and never rewrites
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-route-broken-'));
  fs.cpSync(path.join(root, 'hooks'), path.join(tmp, 'hooks'), { recursive: true });
  fs.cpSync(path.join(root, 'lib'), path.join(tmp, 'lib'), { recursive: true });
  const call = { ...base, tool_name: 'Agent', tool_input: { subagent_type: 'general-purpose', prompt: 'p' } };
  const runCopy = () => spawnSync('node', [path.join(tmp, 'hooks', 'fx-pretooluse.js')],
    { input: JSON.stringify(call), encoding: 'utf8' });
  fs.writeFileSync(path.join(tmp, 'lib', 'dispatch-route.js'), "module.exports = { route() { throw new Error('boom'); } };\n");
  let b = runCopy();
  assert.strictEqual(b.status, 0, `a throwing route never refuses: ${b.stderr}`);
  assert.strictEqual(b.stdout.trim(), '', 'a throwing route leaves the call unchanged');
  assert.match(b.stderr, /dispatch routing off: boom/, 'a throwing route leaves a trace on stderr');
  fs.writeFileSync(path.join(tmp, 'lib', 'dispatch-route.js'), "throw new Error('load');\n");
  b = runCopy();
  assert.strictEqual(b.status, 0, `a module that fails to load never refuses: ${b.stderr}`);
  assert.strictEqual(b.stdout.trim(), '', 'a module that fails to load leaves the call unchanged');
  assert.match(b.stderr, /dispatch routing off: load/, 'a module that fails to load leaves a trace on stderr');
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('dispatch-route.test.js: OK');
