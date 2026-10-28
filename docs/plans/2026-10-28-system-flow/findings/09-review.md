# Task 09 review

### Spec Compliance
- ✅ Spec compliant. Files, interfaces, tests and the check-all line match the brief; ruling 11 held (separate `renderCoverage` and `renderRules`, `renderMarkdown` untouched); ruling 36 reading used for the fixture.
- ⚠️ Cannot verify from diff: the implementer's RED/GREEN runs and `scripts/check-all` pass (suite not re-run per rules). No controller cost line, so no TDD count check.

### Strengths
- `adrStatus` is extracted from `parseDoc` through a shared `fenceMask`; `parseDoc` now calls it, so docs-index and the CLI share one status test (src/lib/doc-evidence.ts). Partly superseded stays current, with a test.
- Escaping: `cell` runs `html` then `escapeCell`, the same path every other table uses. Entities such as `&amp;` render correctly in Markdown table cells (only code spans show them literally, and none are used here), so the Chapter column is fine.
- `checkRuleAdrs` runs inside `checkModel`, so `check` and `build` both fail; messages match the brief wording.

### Issues
#### Critical (Must Fix)
None.
#### Important (Should Fix)
None.
#### Minor (Nice to Have)
- src/lib/sf-coverage.ts:41 takes the host id from `meta.roots[0]` while src/lib/sf-rules.ts finds it with `roots.find(r => r.host)`; the two can disagree if the host is not listed first.
- src/lib/sf-markdown.ts rules-in-force: the ADR link target is not percent-encoded, so an ADR path with a space or parenthesis would break the link (ids and evidence paths reject whitespace elsewhere, so low risk).
- src/lib/sf-rules.ts: a rule whose ADR sits in a root that is missing is skipped silently; the missing-root error covers it, but no test pins it.

### Assessment
**Task quality:** Approved
**Reasoning:** All acceptance criteria are met with real process-level tests, ruling 11 is respected, and the ADR status test is shared. Only small robustness nits remain.

## Ledger lines
Task 09: minor (deferred): coverage uses meta.roots[0] as the host id while checkRuleAdrs uses the root flagged host; align them.
Task 09: minor (deferred): rules-in-force.md ADR link target is not percent-encoded.
Task 09: minor (deferred): no test for a rule whose ADR root is missing (skipped by checkRuleAdrs).
