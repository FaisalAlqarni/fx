# 06: ADR 0065 and the Codex harness facts

**Status:** ready-for-agent
**Blocked by:** 03, 04, 05
**Phase:** MVP

**What to build:** the decision record and the harness facts for this change. ADR 0065 records that on Codex fx declares the model and renders the preamble for how Codex loads a lane, including the limit the owner accepted: for Anthropic models on OpenRouter, fx cannot see heredoc writes. `references/harnesses/codex.md` is re-measured against Codex CLI 0.164.0 with the facts this work established. ADR 0020 and ADR 0039 point at 0065.

**Design:** Implementation Decisions; Further Notes; Global Constraints; Open Questions

**Files:**
- Create: `docs/adr/0065-on-codex-fx-declares-the-model-and-renders-for-how-codex-loads-a-lane.md`
- Modify: `docs/adr/0020-*.md` (status line), `docs/adr/0039-*.md` (status line), `docs/adr/index.md` (a 0065 row; the 0020 and 0039 rows' status column)
- Modify: `references/harnesses/codex.md`
- Modify: `src/tests/gates/harness-facts.test.ts` and `tests/gates/harness-facts.test.js`

**ADR 0065 content.** Follow the shape of `docs/adr/0064-the-transcript-path-is-recorded-in-the-git-common-dir.md` (title, `Status: accepted, 2026-10-28.`, Context, Decision as numbered items each with an `Evidence:` line naming a path and symbol, Consequences, Alternatives) and the rules in `docs/adr/0059-fx-adr-writes-supersedes-and-indexes-adrs.md`.
- Context: the root cause from `research/codex-integration.md` section 5 in three or four sentences, with the measured baseline (lane read first 0/6, code before design 4/6).
- Decisions:
  1. fx-setup declares a third-party model to Codex with a profile-scoped `model_catalog_json` entry built from Codex's own entry (flags `include_skills_usage_instructions: true`, `apply_patch_tool_type: "freeform"`), written to `$CODEX_HOME/fx-<provider>.config.toml` and `fx-<provider>.catalog.json`, never `config.toml`. Evidence: `src/lib/codex-catalog.ts` `buildCatalog`, `setupCatalog`.
  2. On Codex the preamble's ordering clause is a per-runtime slot, `{{ORDER}}`: reading the lane's `SKILL.md` is the first file read, and the render names absolute lane paths. Claude Code and opencode renders are unchanged. Evidence: `src/lib/preamble.ts` `ADDRESSING`, `PREAMBLE.md`.
  3. ADR 0039's shell `apply_patch` match stays as the only shell write detection: the only write channel fx sees for providers that drop `custom` tools, and the fallback elsewhere. Heredoc writes stay unseen by decision. Evidence: `src/hooks/fx-codex.ts` (the existing `apply_patch` shell match).
  4. The stated limit: for Anthropic models on OpenRouter, OpenRouter drops the `custom` `apply_patch` tool (run `ap4-tools`), so fx's write checks see only shell-run `apply_patch`; heredoc writes are not seen; protection against code before a design there rests on Codex's skill contract plus the preamble. The owner accepted shipping with this limit on 2026-10-28. fx-setup's report and `codex.md` state it.
  5. The conformance runner's Codex rows under OpenRouter run with the same profile and catalog a user gets. Evidence: `tests/conformance/lib/live.sh`.
- Relations: "Amends 0020: the premise that only names differ per runtime does not hold on Codex; the ordering clause becomes a per-runtime slot. Rendered, not copied, stands." "Amends 0039: the shell `apply_patch` match stays; heredoc writes stay unseen by decision." Cites ADR 0002 (nothing above the imperative), 0016, 0021, 0022, 0024.
- Alternatives: the design's Approaches B and C, each with its rejection reason in one sentence.

**Status lines.** ADR 0020 and ADR 0039 keep their decisions current for other runtimes, so use the `Amended by` form ADR 0045 uses (`Status: accepted. Amended by 0058.`), not `Superseded by`, which would drop them from the docs index (ADR 0063). If either file has no `Status:` line, add `Status: accepted. Amended by 0065.` as line 3 in the same form as 0045.

**`references/harnesses/codex.md` changes** (each new fact is one paragraph opening `MEASURED 2026-10-28 on Codex CLI 0.164.0:` or `READ 2026-10-28 on Codex CLI 0.164.0:`, which `tests/gates/harness-facts.test.js` parses; evidence from `research/experiments.md` run names and `CX:` source lines):
- `## Tool vocabulary`: replace "Edits go through `apply_patch`." with the conditional fact: the `apply_patch` tool exists only when the model's catalog entry sets `apply_patch_tool_type` (`CX:core/src/tools/spec_plan.rs:1409-1412`, only `freeform` exists in 0.164); over OpenRouter an `openai/` model receives it (`ap5-gpt-tools`) and an `anthropic/` model does not (`ap4-tools`); there edits arrive as shell `apply_patch` (seen by fx) or heredocs (not seen by fx, by decision, ADR 0065).
- New `## Skill trigger rules`: Codex appends its "How to use skills" trigger rules only when the model's entry has `include_skills_usage_instructions: true` (`CX:ext/skills/src/fragments.rs:21-33`); OpenRouter's `/models` entries have it off (`m0-base`); fx-setup's profile catalog turns it on (`p3b-prof`, `a3-haiku-1..3`).
- New `## Model catalog and profiles`: `model_catalog_json` replaces the remote list for the process (`m1-top`: 1 model); 0.164 profiles are files `$CODEX_HOME/<name>.config.toml` selected by `--profile <name>`, and the legacy `[profiles.x]` plus `profile = "x"` is rejected at startup (`p2-prof`).
- New `## Hook trust`: hooks fire in `codex exec` without `--dangerously-bypass-hook-trust` once trusted as `/hooks` does (`h1-trusted`, control `h0-untrusted`).
- The header line "Measured against Codex CLI 0.155.1." becomes "Measured against Codex CLI 0.155.1; sections dated 2026-10-28 against 0.164.0."

**Tests:**
- `harness-facts.test.ts` adds `fact('codex.md', 'Skill trigger rules')`, `fact('codex.md', 'Model catalog and profiles')`, `fact('codex.md', 'Hook trust')` and `fact('codex.md', 'Tool vocabulary')`; each returns a paragraph matching the existing `FACT` regex, and the `Tool vocabulary` fact contains `anthropic/`.
- `harness-facts.test.ts` asserts `codex.md` no longer contains the sentence `Edits go through \`apply_patch\`.`
- ADR gates in `scripts/check-all` (whatever checks `docs/adr` and `index.md`, for example `scripts/check-artifacts` and `scripts/check-paths`) pass with the new file.

**Testing:** gate tests; `scripts/check-prose` on the new prose.

## Acceptance criteria
- [ ] ADR 0065 exists, is indexed, and states the Anthropic-on-OpenRouter heredoc limit and the owner's acceptance date.
- [ ] ADR 0020 and 0039 carry `Amended by 0065` and their index rows agree.
- [ ] `codex.md` records the four facts and the conditional `apply_patch` sentence; `harness-facts.test.js` passes.
- [ ] `scripts/check-prose`, `scripts/check-paths`, `scripts/check-artifacts`, `scripts/check-generated` pass.

## Steps

- [ ] **1. Invoke `fx-tdd`** (the harness-facts assertions are the failing tests)

- [ ] **2. Write each test the Tests field names**

- [ ] **3. Run them: verify RED**

Run: `scripts/build`, then `node tests/gates/harness-facts.test.js`, each prefixed by the scratch-env line from Global Constraints.
Expected: fails on the missing `Skill trigger rules` section.

- [ ] **4. Write the ADR, the status lines, the index row and the `codex.md` facts**

- [ ] **5. Run them: verify GREEN**

- [ ] **6. Run the scope** listed in the acceptance criteria

- [ ] **7. Commit by path**

```
git add docs/adr/0065-on-codex-fx-declares-the-model-and-renders-for-how-codex-loads-a-lane.md docs/adr/index.md references/harnesses/codex.md src/tests/gates/harness-facts.test.ts tests/gates/harness-facts.test.js
git add <the 0020 and 0039 ADR files, by full name>
git commit -m "docs(adr): 0065, on Codex fx declares the model and renders for how Codex loads a lane"
```
