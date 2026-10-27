# 07: Close the coverage audit gaps G1 to G4

**Status:** ready-for-agent
**Blocked by:** 02, 04, 06
**Phase:** MVP
**Origin:** coverage audit before the final review (findings/coverage-audit.md, G1 to G4); added by the controller with a ledger ruling.

**What to build:** four small closures of design commitments that no task carried.

**Design:** User Stories; Implementation Decisions; Open Questions; Global Constraints

**Files:**
- Modify: `src/lib/codex-catalog.ts`, `lib/codex-catalog.js`, `src/lib/codex-catalog.test.ts`, `lib/codex-catalog.test.js`
- Modify: `commands/fx-setup.md`, regenerated `skills/fx-setup/SKILL.md` (`scripts/gen-command-skills`)
- Modify: `src/tests/gates/fx-setup-root-check.test.ts`, `tests/gates/fx-setup-root-check.test.js`
- Modify: `docs/plans/2026-10-28-codex-model-catalog/design.md` (Open Questions only), `references/harnesses/codex.md` (one clause)

**Behaviour, exactly:**
- G1, user-named slugs reach fx-setup. The section 6 command passes `slugs` from the environment variable `FX_CODEX_SLUGS` (whitespace separated, empty or unset means none): `setupCatalog({ slugs })`. The section 6 text tells the agent: when the user names models for Codex, set `FX_CODEX_SLUGS` to them on the command. Keep the single fenced block that loads `plant-roles`.
- G2, a stale fx profile is named. When `setupCatalog` returns `skipped`, it also returns `left: string[]`: the absolute paths of `fx-*.config.toml` files in `codexHome` that carry `PROFILE_MARKER` as their first line (regular files only), sorted. In every other result `left` is `[]`. `SetupReport` gains `left: string[]`. The section 6 text tells the agent to name each `left` file as an earlier fx profile still in place, which fx did not remove, and that a model change needs fx-setup run again.
- G3, the report statements are asserted. A root-check test reads section 6 of `commands/fx-setup.md` and asserts it contains each of: the profile replacing Codex's remote model list; the cloned context window `272000` as a guess; `kept`, `refused` or `error` left alone with `config.toml` never edited; the Anthropic-on-OpenRouter limit (`anthropic/` and `heredoc`); `FX_CODEX_SLUGS`; `left`.
- G4, the owner's decision is recorded. In design.md, the Open Questions item on write visibility becomes checked (`- [x]`) and ends with: `Decided 2026-10-28: the owner accepted shipping with this limit stated.` In `references/harnesses/codex.md`, the sentence that states the heredoc limit gains `(owner accepted 2026-10-28, ADR 0065)`.

**Tests:**
- `setupCatalog` with a temp `codexHome` holding `config.toml` `model = "gpt-6.1-sol"\n` and an fx-marked `fx-openrouter.config.toml`: `skipped` is the existing string, `left` deep-equals `[<home>/fx-openrouter.config.toml]`, the file is unchanged. Same without the fx file: `left` is `[]`. A user-written `fx-x.config.toml` without the marker is not in `left`.
- Root check: with `FX_CODEX_SLUGS="anthropic/claude-haiku-4.5"`, no `config.toml` model, and the stub `codex` from task 04's test, `catalog.profile === 'fx-custom'` and `catalog.slugs` deep-equals `['anthropic/claude-haiku-4.5']`.
- Root check: the G3 text assertions.

## Acceptance criteria
- [ ] Every Tests entry passes; RED seen first for each.
- [ ] `skills/fx-setup/SKILL.md` stays under 20,000 bytes (trim this plan's own section 6 catalog wording if needed, never other sections).
- [ ] `scripts/check-generated`, `scripts/check-types`, `scripts/check-prose`, `scripts/check-tool-names`, `node tests/gates/skill-size.test.js`, `node tests/gates/fx-setup-root-check.test.js`, `node lib/codex-catalog.test.js`, `node tests/gates/harness-facts.test.js` pass.

## Steps
- [ ] 1. Invoke `fx-tdd`. 2. Write the tests, see RED. 3. Implement. 4. GREEN. 5. Run the acceptance commands with the scratch-env prefix. 6. Commit by path:
`git commit -m "feat(codex): name stale fx profiles and pass user-named slugs from fx-setup"`
