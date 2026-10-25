### Spec Compliance

- ✅ Spec compliant. The leaner map (breadcrumb levels, ELK layered layout, React Flow nodes, evidence side panel, "Open next level") meets the task's "What to build" and design Phase B, which require levels, ELK layout and an evidence panel and name no tooltips, minimap, fullscreen or dense-level handling. Checked: src/references/visual/fx-map-1.ts:101-168.
- ⚠️ Cannot verify from diff: the four-view matrix (light and dark at 1440 and 390 px) was not run; the report says so and ledgers it. Controller should carry `Visual check: not run` for the page template and map.
- ⚠️ Cannot verify from diff: `report-assets.md`, mermaid and tailwind files are untouched; visual-assets.md says it "replaces the report-assets rules". A later task must retire them.

Checks I ran:
- `references/visual/` lists exactly eight files (seven references plus fx-map-1.js); the gate asserts it (visual-kit.test.ts:96-99).
- `node tests/gates/visual-kit.test.js` printed `visual-kit: OK`.
- `sha256sum references/vendor/*`: all five libraries match the table rows in visual-assets.md.
- `npm pack react@18.3.1 reactflow@11.11.4 elkjs@0.9.3` in scratch: react, reactflow and elkjs package-path files match the table SHA-256 (d949f1c3..., a9144384..., 8bb2def0..., b0745abd...). `cmp` against the three packages' LICENSE / LICENSE.md: identical to LICENSE-react, LICENSE-reactflow, LICENSE-elkjs. react-dom was not packed by me; its bytes equal the system-flow vendor copy (`cmp` same) and the checksum is in the report.
- `cmp` of all five vendored files against system-flow's vendor/: identical.
- fx-tokens-1.css and fx-map-1.js SHA-256 in the table match the files; version 0.7.0 matches package.json.
- Diff stat shows all eight vendor files as `Bin`; .gitattributes holds `references/vendor/** -diff linguist-vendored`.
- No SKILL.md or skills/ path in the diff; skill count unchanged.
- No em or en dashes in references/visual/*, THIRD_PARTY_NOTICES.md.
- THIRD_PARTY_NOTICES.md line 3 reworded; Vendored bundles table lists React, React DOM, React Flow (MIT) and elkjs (EPL-2.0) with versions and licence files.
- Callers/variants: scripts/build case adds fx-map-1.ts beside helper.ts (browser iife); allowlist globs use `[0-9]*` so `react-*` does not swallow react-dom (handwritten-js-allowlist.txt, 4 pairs).

### Strengths

- Vendored bytes are verified three ways (package, system-flow, table) and the licences come from the packages.
- The gate tests real behaviour: fixtures with exact messages from the brief, plus the built map loaded in a `vm` context with no DOM.
- The `#fragment` case (`url(#a)`) was found by the repository run and fixed with a fixture, not by loosening the repo check.
- Template uses logical properties throughout, loads only `../_assets/` names in the table, and defaults to `lang="en" dir="ltr"` (S8).
- fx-map-1.ts uses narrow interfaces and `Reflect.get`, no `any` or `as`.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

- SURFACE.md:237 · the References heading still says "33 files, 29 markdown, two vendored libraries and their two licence files"; the tree now holds five more libraries' files and the visual folder. Update the counts or drop them.
- src/tests/gates/visual-kit.test.ts:96-148 · `kitErrors` is exported but every assertion runs at module load, so task 04 importing it reruns the whole gate and prints `visual-kit: OK`. Guard the assertions with `require.main === module` or move `kitErrors` to a lib file.
- src/references/visual/fx-map-1.ts:162 · `JSON.parse` on malformed map data throws before the on-page "Map data is invalid" message; wrap it in try/catch and show the parse error in `#map-root`.
- src/references/visual/fx-map-1.ts:12,78 · fixed 200 by 64 node boxes with no overflow rule; long labels or roles on a dense level can clip. Acceptable for the lean map; add `overflow-wrap:anywhere` on `.fxm-label` in page-template.html or size nodes by label.

### Assessment

**Task quality:** Approved
**Reasoning:** The leaner map meets the acceptance and Phase B as written, the checksum table and licence files are verified against upstream packages and the gate passes. Only minor polish remains.

## Ledger lines

Task 03: minor (deferred): SURFACE.md:237 References heading counts and vendored-library wording are stale after the kit.
Task 03: minor (deferred): visual-kit.test.ts runs its assertions on import, so task 04 importing kitErrors reruns the gate.
Task 03: minor (deferred): fx-map-1.ts:162 unguarded JSON.parse skips the on-page invalid-data message for malformed JSON.
Task 03: minor (deferred): fixed-size map nodes can clip long labels on dense levels; no overflow rule.
