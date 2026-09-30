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
assert.throws(() => or.providerSetup('unknown', or.MODELS.primary), /unknown harness/);

for (const [events, stderr] of [
  ['', 'ERROR: exceeded retry limit, last status: 429 Too Many Requests'],
  ['{"type":"error","message":"API Error: 503 upstream"}', ''],
  ['{"type":"turn.failed","error":{"message":"401 Unauthorized"}}', ''],
  ['', 'Insufficient credits. This account never purchased credits.'],
]) assert.ok(or.isProviderError(events, stderr), `provider error: ${events || stderr}`);
for (const [events, stderr] of [
  ['', 'FAIL  12  read-only agent cannot edit'],
  ['', 'expected a Skill call, saw none'],
  ['', ''],
]) assert.ok(!or.isProviderError(events, stderr), `not a provider error: ${events || stderr || '(empty)'}`);
assert.strictEqual(or.isProviderError.length, 2, 'the check takes only CLI error events and stderr, never the whole stream');

const init = '{"type":"system","subtype":"init","model":"anthropic/claude-haiku-4.5","tools":[]}\n{"type":"result"}';
assert.strictEqual(or.sessionModel('claude-code', init), 'anthropic/claude-haiku-4.5');
assert.strictEqual(or.sessionModel('claude-code', '{"type":"system","subtype":"init","model":"claude-opus-4"}'), 'claude-opus-4',
  'the reported model is returned as is, so the runner can see a mismatch');
assert.strictEqual(or.sessionModel('claude-code', 'not json'), null);

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
assert.ok(toml.includes('model = "b/two"') && !toml.includes('a/one') && toml.includes('[plugins.fx]\nenabled = true') && toml.includes('[marketplaces.fx]'), 'latest model, existing tables kept');
fs.mkdirSync(path.join(home, '.config', 'opencode'), { recursive: true });
fs.writeFileSync(path.join(home, '.config', 'opencode', 'opencode.json'), '{"plugin":["x"]}');
or.applySetup(or.providerSetup('opencode', or.MODELS.primary), home);
const oc = JSON.parse(fs.readFileSync(path.join(home, '.config', 'opencode', 'opencode.json'), 'utf8'));
assert.deepStrictEqual(oc.plugin, ['x']);
assert.strictEqual(oc.model, `openrouter/${or.MODELS.primary}`);
fs.rmSync(home, { recursive: true });
console.log('openrouter.test.js: OK');
