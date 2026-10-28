# 18b review (67bde3c..acb9eb4)

### Spec Compliance
- ✅ Spec compliant. Not run: no tests re-run (rules); read-only review of diff plus focused greps.
- ⚠️ Cannot verify from diff: the G1, G13 and G3-caption tests were not mutation-run by me; dependence named below from source.

### Strengths
- G1 would fail without NAV (sf-page.ts:154 nav build) or the markdown link (sf-markdown.ts:109); G13 without the folder index (sf-markdown.ts:135); G3 captions without the ' (arrow not drawn)' suffix (sf-layout.ts:78); G3 under-figure note without the new not-drawn paragraph (RED shown).
- G11: outsideRefs accepts data:, #anchor, relative same-folder files; fake output carries data: and #top and still stays archify; fallback reason lands in diagrams[].reason via pickLine (asserted exactly).
- Design amendments are one-sentence in-place edits matching the audit rows (G7, G10, R1, R4 to R10, schema path).
- R2: fragment-guide.md, planning.md and SKILL.md agree; check enforces no area prefix, so the rule is lane-only and consistent.

### Issues
#### Critical (Must Fix)
None.
#### Important (Should Fix)
None.
#### Minor (Nice to Have)
1. outsideRefs (sf-diagrams.ts:277) ignores CSS url()/@import, srcset and `../` escapes; only src/href with a scheme or `//`.
2. G11 test covers only unpaged arch-engine; a leak in a -p2 page is untested.
3. R3 audit row also asked for the sentence in the design's caps paragraph; not added.
4. planning.md level0 bullet now has one over-long line (the "Nodes and edges carry evidence" run-on).

### Assessment
**Task quality:** Approved
**Reasoning:** Every row has a test that fails without its behaviour, G11 is scoped correctly with a named fallback, and the R2 rule is consistent across lane files.

## Ledger lines
Task 18b: minor (deferred): outsideRefs misses CSS url()/@import, srcset and ../ escapes.
Task 18b: minor (deferred): G11 test covers only the unpaged page, not a -pN leak.
Task 18b: minor (deferred): R3 sentence not added to the design's caps paragraph.
Task 18b: minor (deferred): planning.md level-0 bullet has one over-long line.
