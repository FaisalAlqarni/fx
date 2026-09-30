# 08: OpenRouter live provider

**Status:** ready-for-agent
**Blocked by:** 07
**Phase:** Harness

**What to build:** with `FX_LIVE_PROVIDER=openrouter`, the live conformance rows run on OpenRouter for all four harnesses: Codex and both OpenCode majors on free Qwen with a DeepSeek fallback on provider errors, Claude Code on Haiku. The key is read only from the environment and never lands in a kept log. Each row's result line names the model it ran on. Without the switch, nothing changes.

**Files:**
- Create: `tests/conformance/lib/openrouter.js`
- Create: `tests/conformance/openrouter.test.js`
- Modify: `tests/conformance/lib/live.sh`, `tests/conformance/run.sh`, `tests/conformance/README.md`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: the design's §3 settings; the Codex config measured on 2026-09-30; the Claude Code environment measured on 2026-10-01.
- Produces, in `tests/conformance/lib/openrouter.js`:
  - `MODELS = { primary: 'qwen/qwen3.8-27b:free', fallback: 'deepseek/deepseek-v4-flash', claude: 'anthropic/claude-haiku-4.5' }`
  - `providerSetup(harness, model) -> { files: { [relPath]: string }, env: { [name]: string } }`: the scratch-config fragments and environment for that harness (OpenCode v1 `provider.openrouter`, OpenCode v2 `providers.openrouter`, Codex `config.toml` with command auth, Claude Code `ANTHROPIC_*` variables). The key never appears in `files`; config reads it from the environment.
  - `isProviderError(text) -> boolean`: true for HTTP 429, 5xx, `Insufficient credits`, `Too Many Requests`, and the runner's no-first-token timeout marker; false for an ordinary row failure.
  - `leaksKey(text) -> boolean`: true when `text` contains `sk-or-`.

**Seam:** the pure module, unit-tested; `live.sh` calls it through `node -e`.

**Risks:** never echo the environment or a config file into a log. A fallback re-run is a second attempt of the same row on the fallback model, recorded as such; a capability failure is re-run once on the same model, as `tests/conformance/README.md` already requires, never switched to DeepSeek. `live.sh`'s llama-server check and llamacpp provider copy stay the default path.

**Idempotency:** pure functions; `live.sh` writes only into scratch homes.

**Testing:** the unit test; a one-row live smoke per harness (spends a few cents at most).

## Acceptance criteria
- [ ] `node tests/conformance/openrouter.test.js` passes.
- [ ] With `FX_LIVE_PROVIDER=openrouter`, row 01 passes live on each of `codex`, `opencode`, `opencode-v2` and `claude-code`, and its result line names the model.
- [ ] A kept row log containing `sk-or-` fails the row; no kept log from the smoke runs contains it.
- [ ] Without the switch, `live.sh` behaves exactly as before (the llama-server check still runs first).

## Steps

- [ ] **1. RED:** create `tests/conformance/openrouter.test.js`:

```js
'use strict';
const assert = require('node:assert');
const path = require('path');
const or = require(path.join(__dirname, 'lib', 'openrouter'));

assert.strictEqual(or.MODELS.primary, 'qwen/qwen3.8-27b:free');
assert.strictEqual(or.MODELS.fallback, 'deepseek/deepseek-v4-flash');
assert.strictEqual(or.MODELS.claude, 'anthropic/claude-haiku-4.5');

for (const h of ['codex', 'opencode', 'opencode-v2', 'claude-code']) {
  const m = h === 'claude-code' ? or.MODELS.claude : or.MODELS.primary;
  const s = or.providerSetup(h, m);
  assert.ok(s && typeof s.files === 'object' && typeof s.env === 'object', `${h}: setup has files and env`);
  const all = JSON.stringify(s);
  assert.ok(all.includes(m), `${h}: the model is set`);
  assert.ok(!all.includes('sk-or-'), `${h}: no key text in the setup`);
}
assert.ok(JSON.stringify(or.providerSetup('codex', or.MODELS.primary).files).includes('OPENROUTER_API_KEY'),
  'codex reads the key from the environment');
assert.strictEqual(or.providerSetup('claude-code', or.MODELS.claude).env.ANTHROPIC_BASE_URL, 'https://openrouter.ai/api');
assert.throws(() => or.providerSetup('unknown', or.MODELS.primary), /unknown harness/);

for (const t of ['ERROR: exceeded retry limit, last status: 429 Too Many Requests', 'API Error: 503 upstream',
  'Insufficient credits. This account never purchased credits.']) assert.ok(or.isProviderError(t), `provider error: ${t}`);
for (const t of ['FAIL  12  read-only agent cannot edit', 'expected a Skill call, saw none']) {
  assert.ok(!or.isProviderError(t), `not a provider error: ${t}`);
}
assert.ok(or.leaksKey('token sk-or-v1-abc'), 'a key is caught');
assert.ok(!or.leaksKey('no secrets here'), 'clean text passes');
console.log('openrouter.test.js: OK');
```

Run: FAIL, module not found.
- [ ] **2. Implement** `tests/conformance/lib/openrouter.js` with `fx-tdd`.
- [ ] **3. GREEN:** `node tests/conformance/openrouter.test.js`.
- [ ] **4. Wire `live.sh`:** when `FX_LIVE_PROVIDER=openrouter`, skip the llama-server check and the llamacpp copy, require `OPENROUTER_API_KEY` (gap if unset), write `providerSetup`'s files into the scratch config and export its env for the session; on a failed row whose output `isProviderError`, re-run once on the fallback model; append `model=<id>` to each row's result line; before keeping any log, `leaksKey` fails the row on a hit.
- [ ] **5. Smoke:** with the key exported by the controller, run row 01 live on each harness with `FX_CONFORMANCE_ROWS` pointing at a directory holding only row 01. Record each result line in the report.
- [ ] **6. check-all:** add `run conformance-openrouter node tests/conformance/openrouter.test.js` after `conformance-merge-opencode-provider`.
- [ ] **7. Commit**

```
git add tests/conformance/lib/openrouter.js tests/conformance/openrouter.test.js tests/conformance/lib/live.sh tests/conformance/run.sh tests/conformance/README.md scripts/check-all
git commit -m "test(conformance): OpenRouter live provider for four harnesses"
```
