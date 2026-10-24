# 05: Plant roles in TypeScript

**Status:** ready-for-agent
**Blocked by:** 04
**Phase:** Core

**What to build:** the environment variables plant roles reads go through one environment parser, introduced here with its first consumer; and the module that plants fx's Codex roles into `$CODEX_HOME/agents` (and supplies read-only agent names to the opencode plugins and installer) is written in TypeScript with typed role definitions, planting exactly the same files.

**Design:** Implementation Decisions; Global Constraints

**Files:**
- Create: `src/lib/plant-roles.ts`
- Create: `src/lib/env.ts` (`parseFxEnv`), `src/lib/env.test.ts`
- Modify: `lib/plant-roles.js` (now generated)
- Modify: `src/lib/types.ts` (Codex role definition type), `lib/types.js` (generated)
- Modify: `scripts/check-all` (run `node lib/env.test.js`)

**Interfaces:**
- Produces: the same named exports as today's `module.exports` block at the end of `lib/plant-roles.js` (read it; includes `READ_ONLY_AGENTS`), same runtime shapes.
- Produces in `src/lib/types.ts`: the Codex role definition type, consumed by task 06.
- Produces: `parseFxEnv(env: NodeJS.ProcessEnv) -> FxEnv` where `FxEnv` holds `codexHome: string | undefined`, `undefined` when unset or empty, matching today's fallback. The temp directory stays `os.tmpdir()`, as today; it is not an environment read.

**Seam:** the existing plant-roles test and the Codex install run, unchanged.

**Tests:**
- `parseFxEnv({ CODEX_HOME: '/h' })`: `codexHome` equal to `'/h'`.
- `parseFxEnv({ CODEX_HOME: '' })`: `codexHome` equal to `undefined`.
- Existing, unchanged:
- `node lib/plant-roles.test.js`: exit 0.
- `bash tests/install/run.sh codex`: exit 0.
- `bash tests/conformance/plant-codex-roles.test.sh`: exit 0.
- Other consumers, unchanged: `node tests/gates/codex-hook-output.test.js`, `node tests/gates/opencode-plugin.test.js`, `node tests/gates/opencode-v2-plugin.test.js`, `node tests/gates/fx-setup-root-check.test.js`, `bash tests/install/run.sh opencode`: exit 0 (the Codex hook, both plugins, `fx-setup` and the installer's `node -e` bootstrap all read plant roles).

**Idempotency:** planting writes into a Codex home outside the repo. The tests use scratch homes; today's code already overwrites its own planted files, and the port must keep that (re-running plants the same bytes, never duplicates).

**Risks:** this is the largest module (537 lines) and writes files on users' machines; the generated `.toml` header comments in `codex/agents/` name this module, so keep any text it emits byte-identical.

**Testing:** existing unit test, install run, conformance planting test, `scripts/check-all`.

## Acceptance criteria
- [ ] Existing tests pass with no test file changed.
- [ ] A plant into a scratch Codex home produces byte-identical files before and after (compare with `diff -r`).

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Plant into a scratch Codex home with the current JavaScript and keep the result** (outside the repo)
- [ ] **3. Write `src/lib/plant-roles.ts` and the role type**
- [ ] **4. Build, run the tests, plant again and diff**

Run: `scripts/build && node lib/plant-roles.test.js && bash tests/install/run.sh codex && bash tests/conformance/plant-codex-roles.test.sh`
Expected: PASS; `diff -r` of the two planted homes is empty.

- [ ] **5. Run the scope**

Run: `scripts/check-all` (tracked background command)

- [ ] **6. Commit by path**

```
git add src/lib/plant-roles.ts src/lib/env.ts src/lib/env.test.ts src/lib/types.ts lib/types.js lib/plant-roles.js lib/env.js lib/env.test.js scripts/check-all
git commit -m "refactor(lib): plant roles in TypeScript"
```
