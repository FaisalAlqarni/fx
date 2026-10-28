### Spec Compliance

- ✅ Spec compliant. Every Tests-field item has an assertion in src/scripts/system-flow-markdown.test.ts: paths and marker (l.735), root index links (l.741), lead (l.750), Not owned (l.760), code doc headers and `app/` row (l.770), caption before fence (l.779), glossary 15 rows sorted with `\|` escape (l.788), parseDoc read-back (l.806), hand-written collision with the exact message (l.824). Files list matches: sf-markdown.ts, sf-build.ts, new test, check-all line.
- ⚠️ Cannot verify from diff: the diff view elided context lines, so the full text of the section-merge and folder code was not seen. The README-level "Start here" folder index is assumed to come from the earlier `indexOf(folder)` loop, which the diff shows only partly. Exit-gate check-all (not run per ruling) is the check for cross-task breaks.

### Strengths

- renderGlossary reuses `table`, `cell`, `evCell`, `evidenceLine`, `oldestVerified` and `GENERATED`; no new escaping path.
- glossary.md is written through the same `writeGenerated` loop as coverage.md and rules-in-force.md (sf-build.ts), so the marker-collision rule applies unchanged; the collision test pins the message.
- The parse-back test counts expected claims from the model rather than hard-coding them.
- Root index folder links are derived from the sections' `folder` values, not a hard-coded Start here entry (sf-markdown.ts, `folders`).

### Judgement on the two implementer choices

- Editing system-flow-only.test.ts: justified. glossary.md is now rewritten on every build like coverage.md and rules-in-force.md, so the ALWAYS list in the only-test must include it. The edit is one list entry plus its comment. No finding.
- Glossary table with an Evidence cell plus a separate `## Evidence` list: justified. parseDoc (src/lib/doc-evidence.ts:10) only reads an `Evidence:` line that follows a claim line, so a table row cannot be read back; the list gives parseDoc one claim per term and the table cell matches the existing catalogue pattern (`evCell`). The cost is the evidence printed twice. See Minor 1.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

1. src/lib/sf-markdown.ts, renderGlossary: each term's evidence appears in the table cell and again in the `## Evidence` list, so a reader sees it twice and the two can only drift if one path changes. Acceptable given parseDoc; keep both built from the same `evidenceLine`/`evidenceItems` source (they are).
2. src/lib/sf-markdown.ts, diagrams block (`## Diagrams`): a diagram with no `summary` yields a bare `### title` heading with nothing under it. Skip the heading when there is no caption, or add a pointer line.
3. src/scripts/system-flow-markdown.test.ts:798: the sort expectation uses the same `toLowerCase().localeCompare` as renderGlossary, so it passes by construction if both change together. Pin an explicit expected term order from the fixture instead.
4. src/scripts/system-flow-markdown.test.ts:801: `r.includes('Evidence') === false` would fail on any term whose meaning contains the word "Evidence"; assert on the header row only.

## Ledger lines

Task 09: minor (deferred): glossary evidence is printed in both the table cell and the ## Evidence list (required by parseDoc, but doubled)
Task 09: minor (deferred): a diagram without a summary renders a bare ### heading under ## Diagrams
Task 09: minor (deferred): glossary sort assertion reuses the implementation's comparator, so it is tautological
Task 09: minor (deferred): glossary row assertion rejects any meaning containing the word Evidence

### Assessment

**Task quality:** Approved
**Reasoning:** Every Tests-field behavior is implemented through existing helpers and asserted by a CLI-process test with a valid runtime RED; the two flagged design choices are forced by parseDoc and the always-rewritten glossary.md. Only minor test and polish items remain.
