### Spec Compliance

- ✅ Spec compliant. Every Tests entry has a matching assertion (src/lib/codex-catalog.test.ts:20-94); exports, marker text and signature match the brief; check-all line sits right after plant-roles (scripts/check-all diff); notices entry added.
- Checked: fallback JSON against models-manager/src/model_info.rs `model_info_from_slug` and the `ModelInfo` / `ModelMessages` structs (openai_models.rs:408 on). Every non-skipped field is present with the right value (visibility none, priority 99, include_apps_usage_instructions false, context 272000, effective 95, input_modalities text+image, truncation bytes 10000, use_responses_lite false). Skipped-when-None fields and `supports_reasoning_summary_parameter` are absent. `used_fallback_model_metadata` is absent. `model_messages` siblings are null, as the struct serialises them.
- Checked: `instructions_template` in the JSON is byte-identical to prompt.md (node, parsed string === file, both 20751 chars). The file holds only `\u` escapes (6 em, 3 en dashes in prompt.md; the report's "6" counts em dashes only).
- ⚠️ Cannot verify from diff: check-prose reported failing on two unrelated docs under docs/plans (report Concerns); the controller should confirm these are pre-existing at b267e47.
- ⚠️ Cannot verify from diff: the TDD RED run is reported, not captured; I did not re-run it.

### Strengths

- Input not mutated: every model is a fresh spread, and the test checks the original entry afterwards.
- Dedup via `new Set(slugs)` keeps input order, and `cloned` follows it.
- Refusal covers both the flag and a `# Skills` heading in `base_instructions` or the template.
- The fallback is read lazily, so a caller with its own `fallback` never touches the disk.
- Fallback follows the 0.164 struct, not the older spike field set, and the report says so.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

- src/lib/codex-catalog.test.ts:94 · the test source holds literal U+2014 and U+2013 characters. Global constraint: no em or en dashes in text fx ships. The compiled lib/codex-catalog.test.js has escapes, but the source ships. Build the characters with `String.fromCharCode(0x2014)` or `-` escapes in the source.
- THIRD_PARTY_NOTICES.md (new "Vendored Codex data" table) · the row names the Apache-2.0 licence but gives no copyright line or licence-file path, unlike the neighbouring tables, and Apache-2.0 redistribution wants the licence text and notice. Add the OpenAI copyright line and a LICENSE reference.
- src/lib/codex-catalog.ts:451 · `/^# Skills$/m` misses a `# Skills` heading in CRLF text (`$` stops before `\r`) and a heading with trailing spaces. A missed match means an entry with its own skill contract gets rewritten. Use `/^# Skills[ \t\r]*$/m`.

### Assessment

**Task quality:** Approved
**Reasoning:** The builder matches the brief and the 0.164 fallback entry field for field, with prompt.md reproduced exactly. Only polish findings remain.

## Ledger lines

Task 01: minor (deferred): codex-catalog.test.ts:94 holds literal em and en dash characters in a shipped source file; use escapes.
Task 01: minor (deferred): THIRD_PARTY_NOTICES.md Codex row lacks copyright line and licence file reference for Apache-2.0.
Task 01: minor (deferred): the `# Skills` heading regex misses CRLF or trailing-space headings, so a skill contract could be overwritten.
