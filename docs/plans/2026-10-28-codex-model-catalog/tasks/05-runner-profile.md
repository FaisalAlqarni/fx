# 05: Conformance runner uses the profile

**Status:** ready-for-agent
**Blocked by:** 02
**Phase:** MVP

**What to build:** under `FX_LIVE_PROVIDER=openrouter`, every Codex live row runs the shape a user gets: before the row's sessions, `live.sh` runs the generator CLI inside the jail with the key (so `codex debug models` can fetch OpenRouter's list), which writes `fx-openrouter.config.toml` and its catalog into the scratch `CODEX_HOME`, and `live_run` starts Codex as `codex --profile fx-openrouter exec ...`. The scratch `config.toml` never gains `model_catalog_json`. `--dangerously-bypass-hook-trust` stays.

**Design:** Implementation Decisions; Testing Decisions; Global Constraints

**Files:**
- Modify: `tests/conformance/lib/live.sh`
- Modify: `src/tests/conformance/openrouter.test.ts` and `tests/conformance/openrouter.test.js`
- Modify: `tests/conformance/live-openrouter.test.sh`
- Modify: `tests/conformance/README.md` (one short paragraph: Codex rows under OpenRouter run with `--profile fx-openrouter`, generated per row by `lib/codex-catalog.js`)

**Behaviour, exactly:**
- In `live.sh`, after the fx install block (`codex plugin add` and role planting) and only when `$OPENROUTER` is set and `$HARNESS` is `codex`, run once per row (not once per scratch home: run.sh can re-run a row on the fallback model, and `applySetup` rewrites `config.toml` per row):
  the jail with the key file bound read-only (the same construction `live_run` uses: `JAIL` with its trailing `--` replaced by `--ro-bind "$OR_KEYFILE" "$OR_KEYFILE" --`), then `sh "$FX/tests/conformance/lib/with-key.sh" "$OR_KEYFILE" "$OR_KEY_VAR" --`, then `node "$FX/lib/codex-catalog.js" setup`. Exit 0 continues; any other exit calls `fail "codex catalog setup failed: <the CLI's stderr or report>"`. Factor the key-bound jail construction into one small shell function used by both places rather than copying it.
- In `live_run`'s `codex)` branch, when `$OPENROUTER` is set, insert the global flag pair `--profile fx-openrouter` between `codex` and `exec`. Without OpenRouter the command line is unchanged.
- No new `rm`, `trap`, `bash -c` or `sh -c` text in `live.sh` or the test script.

**Interfaces:**
- Consumes: the CLI `node lib/codex-catalog.js setup` and its exit codes (task 02: 0 written, 3 nothing written, 1 error).

**Seam:** `providerSetup` in `openrouter.test.ts` (design seam 3) for the config, and the existing stub-CLI harness in `live-openrouter.test.sh` for the runner.

**Tests:**
- `openrouter.test.ts`: `or.providerSetup('codex', 'anthropic/claude-haiku-4.5').files['.codex/config.toml']` does not contain `model_catalog_json` and does not contain `profile`.
- `live-openrouter.test.sh`, new case, Codex harness with a stub `codex` in the fake `bin/`: the stub prints a one-model models JSON (slug `anthropic/claude-haiku-4.5`) for `debug models`, exits 0 for `plugin ...`, and for any other call appends its argument list, one line, to a file under the test's temp dir, then prints nothing. Run a probe row with `FX_LIVE_PROVIDER=openrouter FX_LIVE_MODEL=openrouter/anthropic/claude-haiku-4.5` and the harness `codex`. Expected: the recorded argument line starts with `--profile fx-openrouter exec`; the scratch `CODEX_HOME` held `fx-openrouter.config.toml` whose second line starts with `model_catalog_json = `; the scratch `config.toml` contains no `model_catalog_json`. Read how the file's existing claude-code stub cases locate the scratch home and logs, and follow that pattern; if the runner removes the scratch home before the test can read it, have the stub copy the two files into the test's temp dir when it is called for `exec`.
- `live-openrouter.test.sh`, failure case: the stub exits 1 for `debug models`. Expected: the row fails (not a pass and not a GAP) and its output contains `codex catalog setup failed`.
- The existing claude-code cases in `live-openrouter.test.sh` still pass unchanged.

**Risks:** the key must reach the CLI only through `with-key.sh` inside the jail; never export `OPENROUTER_API_KEY` in `live.sh` (it is unset there on purpose). The row's end-of-run key scrub already covers the whole scratch dir, including `models_cache.json`.

**Idempotency:** the CLI rewrites only fx-marked files in the scratch `CODEX_HOME`; a re-run of a row regenerates them for the row's model.

**Testing:** integration with stub CLIs, no model call and no key.

## Acceptance criteria
- [ ] A Codex row under OpenRouter generates the profile per row and runs `codex --profile fx-openrouter exec`.
- [ ] A generator failure fails the row with a named reason.
- [ ] `node tests/conformance/openrouter.test.js`, `bash tests/conformance/live-openrouter.test.sh`, `bash tests/conformance/live-exit-code.test.sh`, `bash tests/conformance/runner-isolation.test.sh` and `bash tests/conformance/run.sh codex --free` pass.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names**

- [ ] **3. Run them: verify RED**

Run: `scripts/build`, `node tests/conformance/openrouter.test.js`, `bash tests/conformance/live-openrouter.test.sh`, each prefixed by the scratch-env line from Global Constraints.
Expected: the new Codex stub case fails on the missing `--profile`.

- [ ] **4. Implement the minimum that passes** in `tests/conformance/lib/live.sh`

- [ ] **5. Run them: verify GREEN**

- [ ] **6. Run the scope** listed in the acceptance criteria

- [ ] **7. Commit by path**

```
git add tests/conformance/lib/live.sh src/tests/conformance/openrouter.test.ts tests/conformance/openrouter.test.js tests/conformance/live-openrouter.test.sh tests/conformance/README.md
git commit -m "test(conformance): run Codex rows under OpenRouter with the fx profile"
```
