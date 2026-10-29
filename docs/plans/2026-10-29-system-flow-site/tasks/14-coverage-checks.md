# 14: Coverage checks: lifeline styling, the 860 fit at 1440, panel Escape, conventions note

**Status:** ready-for-agent
**Blocked by:** 07, 08, 11
**Phase:** Core

**What to build:** added by the controller from the coverage audit (`findings/coverage-audit.md`, gaps G1, G2, G4, G5). The design's lifeline styling and the 860 px fit are computed and tested at layout time, but no browser check shows them on the page, so a regression in `fx-flow-2.js` or the card padding passes every check. Add browser checks to `proof/page-check.ts` on the fixture site, and pin the stores conventions note in the page and Markdown tests. No production behaviour changes unless a new check fails; if one fails, fix the cause in the file that owns it and say so in the report.

**Design:** Lifeline sequences; Cards; The site template; The page: chapter content

**Files:**
- Modify: `src/docs/plans/2026-10-29-system-flow-site/proof/page-check.ts` (built to `docs/plans/2026-10-29-system-flow-site/proof/page-check.js`)
- Modify: `src/tests/helpers/sf-fixture.ts` only if `goodSet()` lacks a `meta.conventions` string, a reply message, a leaving call or a store node (add the missing one without changing word counts)
- Modify: `src/scripts/system-flow-page.test.ts`, `src/scripts/system-flow-markdown.test.ts`

**Interfaces:**
- Consumes: the page DOM contract of tasks 06, 07 and 08; `fx-flow-2.js` drawing (`src/references/visual/fx-flow-2.ts`, reply dashes and `--warn` stroke near lines 130 to 131, look shapes near line 147); `toMid` as fixed in task 11 (centres the box).
- Produces: four named checks in page-check's JSON: `arrowStyle`, `fitAt1440`, `panelEscape`, plus page and Markdown test assertions for the conventions note.

## Acceptance criteria

- [ ] `arrowStyle` (1440 x 900, reduced motion on): on the fixture's sequence card, a reply arrow has a `stroke-dasharray`; the leaving call's stroke resolves to the `--warn` colour and its width is 2.4 px; after Next, the active arrow's width is 2.8 px; a store node draws its cap line. Each part fails alone when the matching `fx-flow-2` rule is removed (show one RED).
- [ ] `fitAt1440` (1440 x 900): for every figure whose SVG width is at most 860 px, `.fig` has `scrollWidth <= clientWidth`.
- [ ] `panelEscape` (390 x 844, JavaScript on): with the phone panel open, Escape closes it and focus returns to its summary.
- [ ] `system-flow-page.test.ts` asserts a `meta.conventions` string appears as `p.note` in the code chapter's stores overview and one "Shown in" cell links to its chapter; `system-flow-markdown.test.ts` asserts the same note in the code doc.
- [ ] `page-check.js` on the fixture site exits 0 with every check passing; test_scope on the touched tests exits 0.

## Steps

- [ ] 1. Invoke `fx-tdd`; add each check failing first where it can (break the rule locally, run, restore).
- [ ] 2. Build with `scripts/build`; run `page-check.js` on a fresh `fixture-site.js` build with `<PW>`.
- [ ] 3. Commit `test(system-flow): browser checks for lifeline styling, the 860 fit and the panel` with this task's paths.
