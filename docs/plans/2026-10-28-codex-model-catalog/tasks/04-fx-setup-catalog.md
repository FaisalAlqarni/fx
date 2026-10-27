# 04: fx-setup writes the catalog and reports it

**Status:** ready-for-agent
**Blocked by:** 02
**Phase:** MVP

**What to build:** on Codex, fx-setup's section 6 command, after planting roles, also runs `setupCatalog` and includes its report in the JSON it prints. The skill text tells the agent how to report it: the files written or kept, refusals, any fallback-cloned entry, the line `codex --profile fx-<provider>`, that the profile replaces the remote model list, and what fx's write checks can and cannot see for the provider. The existing `/hooks` trust instruction stays.

**Design:** Implementation Decisions; User Stories; Global Constraints

**Files:**
- Modify: `commands/fx-setup.md` (the source)
- Modify (generated): `skills/fx-setup/SKILL.md`, by running `scripts/gen-command-skills`
- Modify: `src/tests/gates/fx-setup-root-check.test.ts` and `tests/gates/fx-setup-root-check.test.js`

**Interfaces:**
- Consumes: `setupCatalog(): SetupReport` (task 02), loaded from the vetted root as `require(path.join(fx, "lib", "codex-catalog"))`.
- Produces: the section 6 command's stdout JSON gains a `catalog` key: the `SetupReport`, or `{ "error": "<message>" }` when `setupCatalog` throws (the roles part must still print). Add it inside the existing single command; do not add a second fenced command (the root-check test requires exactly one block that loads `plant-roles`).

**Report wording to add to section 6 (keep it tight; the file has about 1,200 bytes of room):**
- `catalog.skipped`: one line saying no catalog was needed and why.
- `catalog.profile` set: list `written`; print `catalog.command` as the line to start Codex with; say the profile's catalog replaces Codex's remote model list, so another model run under that profile gets Codex's fallback metadata; name each `cloned` slug and say its context window (272000) is Codex's guess.
- `kept` or `refused`, or `error`: name each, say nothing was written for it and why. Never edit `config.toml` and never ask to.
- The write-visibility fact, stated once for the provider: on OpenRouter an `openai/` model gets the `apply_patch` tool and fx sees its edits; an `anthropic/` model does not get it, so fx's write checks see only `apply_patch` run in the shell, and heredoc writes are not seen.

**Seam:** the section 6 command, run as `fx-setup-root-check.test.ts` already runs it (substituted base dir, scratch `HOME`, `TMPDIR` and `CODEX_HOME`).

**Tests:**
- Real root, no Codex config: the existing `ok` run. Its parsed stdout has `catalog.skipped === 'no third-party model in config.toml and no slug named'`, and the existing role assertions still pass.
- Real root, OpenRouter config: a fresh scratch `CODEX_HOME` holding `config.toml` with `model = "anthropic/claude-haiku-4.5"` and `model_provider = "openrouter"`, and `PATH` starting with a temp `bin/` whose stub `codex` prints a one-model `debug models` JSON (the Haiku shape from task 02's tests). Exit status `0`; `catalog.profile === 'fx-openrouter'`; `catalog.command === 'codex --profile fx-openrouter'`; `<CODEX_HOME>/fx-openrouter.config.toml` exists; `config.toml` is byte-identical.
- Error does not hide roles: same as above but the stub `codex` exits 1. Exit status `0`; `catalog.error` is a non-empty string; `written` still lists the six roles on a fresh `CODEX_HOME`.
- Size: `node tests/gates/skill-size.test.js` passes; `wc -c skills/fx-setup/SKILL.md` is below 20000.

**Risks:** the command text is vetted by an inline root check; the new `require` must come after that check and load only from `fx`. Do not move any refusal logic.

**Testing:** integration through `tests/gates/fx-setup-root-check.test.js`; size gate.

## Acceptance criteria
- [ ] An fx-setup run on Codex with a third-party model writes the profile and catalog and the report names `codex --profile fx-<provider>`.
- [ ] The report states the replaced model list and the Anthropic-on-OpenRouter write limit.
- [ ] `skills/fx-setup/SKILL.md` is regenerated, matches `scripts/check-generated`, and is under 20,000 bytes.
- [ ] `node tests/gates/fx-setup-root-check.test.js`, `node tests/gates/skill-size.test.js`, `scripts/check-prose` and `scripts/check-generated` pass.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/tests/gates/fx-setup-root-check.test.ts`

- [ ] **3. Run them: verify RED**

Run: `scripts/build`, then `node tests/gates/fx-setup-root-check.test.js`, each prefixed by the scratch-env line from Global Constraints.
Expected: fails on the missing `catalog` key.

- [ ] **4. Implement the minimum that passes** in `commands/fx-setup.md`, then `scripts/gen-command-skills`

- [ ] **5. Run them: verify GREEN**

- [ ] **6. Run the scope**: `scripts/check-generated`, `scripts/check-prose`, `node tests/gates/fx-setup-root-check.test.js`, `node tests/gates/skill-size.test.js`, `node tests/gates/user-invoked.test.js`

- [ ] **7. Commit by path**

```
git add commands/fx-setup.md skills/fx-setup/SKILL.md src/tests/gates/fx-setup-root-check.test.ts tests/gates/fx-setup-root-check.test.js
git commit -m "feat(fx-setup): declare a third-party model to Codex through an fx profile"
```
