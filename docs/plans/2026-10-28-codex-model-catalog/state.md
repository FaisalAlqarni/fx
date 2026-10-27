# fx ledger: plan: docs/plans/2026-10-28-codex-model-catalog/plan.md

## Standing rulings

None: docs/plans/rulings.md does not exist.

## Log

Workspace: /development/fx/.worktrees/codex-catalog on codex-catalog (base main ce1fb19); the owner named it as the worktree. scripts/setup ran under scripts/scratch-env (npm ci ok). .fx/ is git-ignored.
Ruling: plan handoff took "Start implementing" without the red-team pass that fx-plan section 7 recommends for the HIGH risk (profile replaces the model list). Why: the owner pre-selected "Start implementing" and is away. Cost if wrong: a plan defect found later, caught by the per-task reviews and the final branch review with devil's advocate.
Ruling: an unknown slug's fallback clone takes Codex's instructions from a vendored copy of rust-v0.164.0 models-manager/prompt.md (task 01), non-ASCII escaped. Why: no Codex command prints the fallback instructions and Codex rejects an entry without them (protocol/src/openai_models.rs deserialize_model_infos_with_legacy_base). Cost if wrong: a stale copy on a later Codex, caught by nothing automatic; the design pins 0.164.0.

Pre-flight scan:
| Pair or task | Produces / Consumes | Found |
|---|---|---|
| 01 / 02 | 01 produces buildCatalog, loadFallback, CATALOG_MARKER in src/lib/codex-catalog.ts; 02 consumes them, same file and test file | consistent names; 02 edits after 01, serial |
| 02 / 04 | 02 produces setupCatalog(): SetupReport; 04 requires lib/codex-catalog and reads skipped, profile, command | consistent |
| 02 / 05 | 02 CLI exit 0 written, 3 nothing written, 1 error; 05 fails the row on non-zero | consistent; under OpenRouter the config model is always third-party |
| 03 / 06 | 06 cites src/lib/preamble.ts ADDRESSING and PREAMBLE.md | consistent |
| 04 / 06, 05 / 06 | 06 cites fx-setup report and live.sh | consistent |
| 01 | tests vs files: test in check-all, fallback json, notices | agrees |
| 02 | live check needs no key (catalog replaces the fetch) | agrees |
| 03 | only codex fixtures re-recorded; equivalence test gains root normalisation | agrees |
| 04 | one fenced plant-roles block kept, as fx-setup-root-check requires | agrees |
| 05 | key only via with-key.sh inside the jail | agrees |
| 06 | Amended-by form, per ADR 0045 and 0063 | agrees |
