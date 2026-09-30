# 08: OpenRouter live provider

**Status:** ready-for-agent
**Blocked by:** 07
**Phase:** Harness

**What to build:** with `FX_LIVE_PROVIDER=openrouter`, the live conformance rows run on OpenRouter for all four harnesses: Codex and both OpenCode majors on free Qwen with a DeepSeek fallback on provider errors, Claude Code on Haiku. The provider's variables actually reach the session through the jail, and the real Claude and Codex credentials never enter the scratch home, so a session cannot silently run on the owner's subscription. The model on each result line is the one the session itself reported. The key is read only from the environment and never lands in a kept log. Without the switch, nothing changes.

**Files:**
- Create: `tests/conformance/lib/openrouter.js`
- Create: `tests/conformance/openrouter.test.js`
- Modify: `tests/conformance/lib/live.sh`, `tests/conformance/run.sh`, `tests/conformance/README.md`
- Modify: `tests/conformance/lib/jail.sh`, `tests/conformance/jail-probe.test.sh`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: the design's §3 settings; the Codex config measured on 2026-09-30; the Claude Code environment measured on 2026-10-01; `probe-findings.md` question 10 (where v2's run output names the model).
- Produces, in `tests/conformance/lib/openrouter.js`:
  - `MODELS = { primary: 'qwen/qwen3.8-27b:free', fallback: 'deepseek/deepseek-v4-flash', claude: 'anthropic/claude-haiku-4.5' }`
  - `providerSetup(harness, model) -> { files: { [relPath]: string }, env: { [name]: string } }`: the scratch-config fragments and environment for that harness (OpenCode v1 `provider.openrouter`, OpenCode v2 `providers.openrouter`, Codex `config.toml` with command auth, Claude Code `ANTHROPIC_BASE_URL` and every model override). The key never appears in `files` or in `env` values; config reads it from the environment. For Claude Code, `live.sh` itself sets `ANTHROPIC_AUTH_TOKEN="$OPENROUTER_API_KEY"` and adds `ANTHROPIC_AUTH_TOKEN` to `FX_JAIL_PROVIDER_ENV`.
  - `isProviderError(cliErrors, stderr) -> boolean`: true for HTTP 401, 429, 5xx, `Insufficient credits`, `Too Many Requests`, and the runner's no-first-token timeout marker, matched only in its two arguments: the CLI's own error events (the `cli_errors` lines `live.sh` already extracts, `live.sh:235-242`) and the CLI's own stderr. It never sees assistant text or tool output, which a model could forge (`live.sh:247-250`).
  - `sessionModel(harness, logText) -> string | null`: the model the session reported in its own init event (Claude Code's `{"type":"system","subtype":"init","model":...}`; the matching event of each other CLI where one exists, per the probe for v2), or `null` when the CLI emits none.
  - `leaksKey(text) -> boolean`: true when `text` contains `sk-or-`.
- Produces, in `tests/conformance/lib/jail.sh`: when `FX_LIVE_PROVIDER=openrouter`, the `--clearenv` allowlist (`jail.sh:98-110`) also passes `OPENROUTER_API_KEY` and each name in `FX_JAIL_PROVIDER_ENV` (space-separated, exported by `live.sh` from `providerSetup(...).env` before it sources `jail.sh`). Without the switch the allowlist is unchanged.
- Produces, in `tests/conformance/lib/live.sh`: a row that stops on a provider error exits `75` with the matched reason on stderr. `keep_log` runs `leaksKey` on the log before it copies it, and fails the row on a hit.
- Produces, in `tests/conformance/run.sh`: under `FX_LIVE_PROVIDER=openrouter`, a row that exits `75` is re-run once with `FX_LIVE_MODEL=openrouter/<fallback>`; its line reads `... model=<id> attempt=2 (fallback)`. A second `75` is a GAP with the reason. Every live row's line ends in `model=<id>`, from `sessionModel`, or `model=<id> (config)` when that returns `null`.

**Seam:** the pure module, unit-tested; the jail, proved by `jail-probe.test.sh` with bwrap and no model call; `live.sh` and `run.sh` calling the module through `node -e`.

**Risks:**
- The jail rebuilds the environment with `--clearenv` (`jail.sh:98-110`), so exporting a provider variable in `live.sh` does nothing inside the jail unless the allowlist names it. `live.sh:94-105` copies the real Claude `.credentials.json` and Codex `auth.json` into the scratch home; under OpenRouter both copies are skipped, or Claude Code runs on the subscription while the line says Haiku and Codex's command auth echoes an empty key. The init-event check turns either mistake into a failed row instead of a false pass: a Claude Code session whose init `model` is not `anthropic/claude-haiku-4.5` fails.
- `fail()` exits the row (`live.sh:21`), so a fallback re-run inside `live.sh` can never happen: it lives in `run.sh`.
- Never echo the environment or a config file into a log. A fallback re-run is a second attempt of the same row on the fallback model, recorded as such; a capability failure is re-run once on the same model, as `tests/conformance/README.md` already requires, never switched to DeepSeek here (the rulings of tasks 11 to 14 decide model capability). `live.sh`'s llama-server check and llamacpp provider copy stay the default path.

**Idempotency:** pure functions; `live.sh` writes only into scratch homes; the jail change is gated on the switch.

**Testing:** the unit test; the jail probe; a one-row live smoke per harness (spends a few cents at most).

## Acceptance criteria
- [ ] `node tests/conformance/openrouter.test.js` passes.
- [ ] `bash tests/conformance/jail-probe.test.sh` passes, including: with `FX_LIVE_PROVIDER=openrouter` and `FX_JAIL_PROVIDER_ENV=ANTHROPIC_BASE_URL`, a sentinel `OPENROUTER_API_KEY` and `ANTHROPIC_BASE_URL` are visible inside the jail; without the switch neither is.
- [ ] With `FX_LIVE_PROVIDER=openrouter`, the scratch home holds no `.credentials.json` and no Codex `auth.json`.
- [ ] With `FX_LIVE_PROVIDER=openrouter`, row 01 passes live on each of `codex`, `opencode`, `opencode-v2` and `claude-code`, and its result line names the model the session reported (Claude Code: `anthropic/claude-haiku-4.5` from the init event).
- [ ] A row log containing `sk-or-` fails the row inside `keep_log`, before any copy; no kept log from the smoke runs contains it.
- [ ] A provider-error line in model output (assistant text or tool output) does not trigger the fallback; the same line in stderr does.
- [ ] Without the switch, `live.sh` and the jail behave exactly as before (the llama-server check still runs first).

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

assert.ok(or.leaksKey('token sk-or-v1-abc'), 'a key is caught');
assert.ok(!or.leaksKey('no secrets here'), 'clean text passes');
console.log('openrouter.test.js: OK');
```

Add `sessionModel` cases for `codex`, `opencode` and `opencode-v2` from a recorded init line of each when the CLI emits one (probe question 10 for v2); for a CLI that emits none, assert `null`. Run: FAIL, module not found.

- [ ] **2. RED, jail:** add to `tests/conformance/jail-probe.test.sh`, after its existing probes, a block that re-sources the jail twice in subshells: once with `FX_LIVE_PROVIDER=openrouter FX_JAIL_PROVIDER_ENV=ANTHROPIC_BASE_URL OPENROUTER_API_KEY=fx-sentinel-key ANTHROPIC_BASE_URL=https://openrouter.ai/api`, probing `[ "$OPENROUTER_API_KEY" = fx-sentinel-key ] && [ "$ANTHROPIC_BASE_URL" = https://openrouter.ai/api ]`; once with the same variables and no `FX_LIVE_PROVIDER`, probing `[ -z "${OPENROUTER_API_KEY:-}" ] && [ -z "${ANTHROPIC_BASE_URL:-}" ]`. Run `bash tests/conformance/jail-probe.test.sh`: the first probe FAILs.
- [ ] **3. Implement** `tests/conformance/lib/openrouter.js` and the jail allowlist change with `fx-tdd`.
- [ ] **4. GREEN:** `node tests/conformance/openrouter.test.js && bash tests/conformance/jail-probe.test.sh`.
- [ ] **5. Wire `live.sh`:** when `FX_LIVE_PROVIDER=openrouter`: before sourcing `jail.sh`, export `providerSetup`'s env and `FX_JAIL_PROVIDER_ENV`; skip the llama-server check, the llamacpp copy, `scratch_home_claude`'s credential copy and the Codex `auth.json` copy; require `OPENROUTER_API_KEY` (gap if unset); write `providerSetup`'s files into the scratch config; on a CLI exit 1 whose `cli_errors` or stderr satisfies `isProviderError`, exit `75` with the reason; move the `leaksKey` scan into `keep_log`, before its `cp`; record `sessionModel`'s answer for the result line and fail the row when it names a model other than the one requested.
- [ ] **6. Wire `run.sh`:** the `75` case and the `model=` suffix per **Produces**; a re-run keeps the row's first log beside the second.
- [ ] **7. Smoke:** with the key exported by the controller, run row 01 live on each harness with `FX_CONFORMANCE_ROWS` pointing at a directory holding only row 01. Check the scratch homes for `.credentials.json` and `auth.json` (expected: absent). Record each result line in the report.
- [ ] **8. check-all:** add `run conformance-openrouter node tests/conformance/openrouter.test.js` after `conformance-merge-opencode-provider`.
- [ ] **9. Commit**

```
git add tests/conformance/lib/openrouter.js tests/conformance/openrouter.test.js tests/conformance/lib/live.sh tests/conformance/run.sh tests/conformance/README.md tests/conformance/lib/jail.sh tests/conformance/jail-probe.test.sh scripts/check-all
git commit -m "test(conformance): OpenRouter live provider for four harnesses"
```
