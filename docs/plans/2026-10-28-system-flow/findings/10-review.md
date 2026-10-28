# Task 10 review: the site page (642d177..e651fa4)

### Spec Compliance
- ❌ Issues found: the legend is rendered empty (one Important).
- ⚠️ Cannot verify from diff: the test body was not re-run; I read sf-page.ts and sf-build.ts in full.

### Strengths
- Every repository string goes through `t` or `escapeHtml`; inline JSON writes `<` as the JSON escape; replacement callbacks avoid `$&` surprises.
- Ruling 9 done in one pass at the end (prefix to `assets/`, map-1 to map-2, flow-1 and theme.css added); ruling 10 `@<root>/<path>` done in `where`.
- Copy-only-when-absent, licences copied, missing source stops the build before the page is written, collision on a non-generated index.html leaves `pageBytes` null.
- Asset count is right: the brief's "seven table files" are the five vendor files, fx-tokens-1.css and fx-map-1.js; plus fx-flow-1, fx-map-2, theme.css, minus fx-map-1 gives nine. The report's "concern" is a misreading, not a defect.

### Issues
#### Critical (Must Fix)
None.
#### Important (Should Fix)
1. src/lib/sf-page.ts (`.replace(slot('LEGEND'), () => '')`): the page keeps `<ul class="legend">` with no items. The brief orders "the legend" after the header, and the template says one li per kind the page uses. A reader gets an empty legend above the map.
#### Minor (Nice to Have)
1. Checksum mismatch is not reported (src/lib/sf-build.ts asset loop, `continue`). Not required by the brief (its Copy rule test only asks the file be left as is) or by the design passages (the design only mentions checksums for the gate test on visual-assets.md). The only source is the "Mismatch rule" in references/visual/visual-assets.md, a writer-side report line. Judged not blocking.
2. A missing fx asset throws a bare Error (sf-build.ts) instead of the CLI's `<file>:<pointer>: <message>` problem form.
3. Corrections `reason` and the dates use `escapeHtml` without `wrapArabic` (sf-page.ts corrections table); an Arabic reason would not get its direction span.
4. `.replace('details.ev"', ...)` patches template CSS by exact string; a template edit silently drops it.

### Assessment
**Task quality:** Needs fixes
**Reasoning:** Escaping, JSON escaping, offline loading, prefix rewrite and licences are sound; the empty legend is a missed requirement.

## Ledger lines
Task 10: minor (deferred): checksum mismatch on an existing asset is left alone but not reported, as visual-assets.md's Mismatch rule describes.
Task 10: minor (deferred): a missing fx asset throws a bare Error instead of a file:pointer: message problem.
Task 10: minor (deferred): corrections reason is escaped but Arabic runs in it are not wrapped.
Task 10: minor (deferred): the details.ev CSS patch matches an exact template string and fails silently if the template changes.
