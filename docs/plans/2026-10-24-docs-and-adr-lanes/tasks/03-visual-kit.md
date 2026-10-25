# 03: Visual kit references and vendored libraries

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** B: Visual kit

**What to build:** any lane that writes an HTML page loads `references/visual/` on demand and produces system-flow's page: chapters with a lead question, bullets with evidence per fact, an evidence toggle, a legend, a drill-down map (React Flow with ELK layout, evidence in a side panel), light and dark with a remembered choice, logical CSS properties so `dir="rtl"` lays out correctly, `lang="en" dir="ltr"` by default (standing ruling S8). The page loads only files copied from fx into the output root's `_assets/` folder, licences included, so it opens offline. The kit adds nothing to the skill selection list. A gate proves every kit file loads only what the assets table names and names no host, that every vendored file matches its SHA-256, and that the map's data checks and level navigation work.

**Design:** Phase B: visual kit; Testing Decisions; Further Notes

**Files:**
- Create: `references/visual/page-template.html` (tokens and theme switch from system-flow's `model/page-template.html`, generalised: no Shamel content; slots for chapters, legend and map; loads `../_assets/<name>` only)
- Create: `references/visual/fx-tokens-1.css` (paper, panel, ink, muted, rule and the accent set, light and dark)
- Create: `src/references/visual/fx-map-1.ts`, built to `references/visual/fx-map-1.js` (browser, IIFE). It sets `globalThis.fxMap = { validateMapData, levelPath, mount }`; `mount` runs only when a `#map-data` element exists, so the file loads in node with no DOM.
- Modify: `scripts/build` (a case for `references/visual/fx-map-1.ts` beside the `helper.ts` case, with `platform=browser format=iife`), `tsconfig.browser.json` (include it), `tsconfig.json` (exclude it)
- Create: `references/visual/svg-animated.md`, `references/visual/svg-static.md`, `references/visual/archify-adapter.md`, `references/visual/visual-assets.md`, `references/visual/visual-check.md`
- Create: `references/vendor/react-18.3.1.production.min.js`, `references/vendor/react-dom-18.3.1.production.min.js`, `references/vendor/reactflow-11.11.4.min.js`, `references/vendor/reactflow-11.11.4.style.css`, `references/vendor/elkjs-0.9.3.bundled.js`, `references/vendor/LICENSE-react`, `references/vendor/LICENSE-reactflow`, `references/vendor/LICENSE-elkjs`
- Create: `.gitattributes` with `references/vendor/** -diff linguist-vendored`, so diffs and review packages show the bundles as binary
- Modify: `scripts/handwritten-js-allowlist.txt` (the four vendored `.js` files under `references/vendor/` and `docs/plans/_assets/`, one glob each, under "vendored third-party bundles")
- Modify: `THIRD_PARTY_NOTICES.md` (reword line 3 so it no longer says no code was copied; add a `## Vendored bundles` section: React, React DOM, React Flow under MIT, elkjs under EPL-2.0, each with version and licence file)
- Create: `src/tests/gates/visual-kit.test.ts`, built to `tests/gates/visual-kit.test.js`
- Modify: `scripts/check-all` (one `run visual-kit.test.js node tests/gates/visual-kit.test.js` line), `SURFACE.md` (references list gains `visual/`)

**Interfaces:**
- Produces: the assets table in `visual-assets.md`, columns exactly `| File | Library | Version | Package path | Source URL | SHA-256 | Licence file |`. Package paths: `react/umd/react.production.min.js`, `react-dom/umd/react-dom.production.min.js`, `reactflow/dist/umd/index.js`, `reactflow/dist/style.css`, `elkjs/lib/elk.bundled.js`. fx's own files (`fx-tokens-1.css`, `fx-map-1.js`) carry `fx` as library, the plugin version, no package path, URL or licence file.
- Produces: the map data shape a page writer fills, inline in `<script type="application/json" id="map-data">`, with every `<` written as `<`:

```json
{ "root": "l0",
  "levels": [ { "id": "l0", "title": "System", "nodes": [
      { "id": "api", "label": "API", "kind": "service", "role": "one line", "children": "l1-api",
        "evidence": [ { "path": "app/api.rb", "lines": "10-42", "symbol": "Api#call" } ] } ],
    "edges": [ { "from": "api", "to": "db", "label": "writes", "evidence": [] } ] } ] }
```

- Produces: `fxMap.validateMapData(data: unknown): string[]` with messages `root level <id> missing`, `level <id>: node <node> opens missing level <child>`, `level <id>: edge <from> -> <to> names a missing node`; `fxMap.levelPath(data, levelId: string): string[]`, the level ids from root to `levelId`.
- Produces: `kitErrors(root: string, files: string[]): string[]` exported from `visual-kit.test.ts`, messages used verbatim by task 04:
  - `visual-assets: <file> missing`
  - `visual-assets: <file> SHA-256 <got>, table says <want>`
  - `<path>: loads <value>, which is not in the assets table`
  - `<path>: names a host: <url>` (the XML namespace URIs `http://www.w3.org/2000/svg`, `http://www.w3.org/1999/xlink` and `http://www.w3.org/1999/xhtml` are not hosts)

**Rules the reference files carry (one place each):**
- `visual-assets.md`: the copy rule for two output roots, `docs/plans/_assets/` for reports and `docs/html/_assets/` for docs pages, both reached as `../_assets/` from a page one folder below; the `LICENSE-*` file of each copied bundle is copied beside it; copy only when no file of that name is there; the missing-file rule and the mismatch rule from `references/report-assets.md`; any byte change to an fx kit file bumps the number in its name (`fx-map-2.js`), so a repo never keeps an old copy under the new name.
- `archify-adapter.md` opens with the diagram choice: archify for detailed, interactive or many-level diagrams; animated SVG for small flows that need motion; static SVG for the cheapest sketch; state the pick and reason in one line; the owner may set `cheap`, `fast` or `detailed` for the run; ask first only when a run would render many archify diagrams; no archify installed: every diagram is SVG; Mermaid belongs in Markdown only and HTML pages never load it. Then how to render a spec with archify into a given folder.
- `visual-check.md`: open every page in light and dark at 1440 and 390 px wide; check no console errors, the map reaches every level, text fits; archify diagrams use archify's own browser check; with no browser, the ledger and the report say `Visual check: not run: no browser` and name the page, never claiming it ran.
- `page-template.html` comment and `visual-check.md`: labels and prose in English; Arabic only for real product strings and sample replies, in `<span lang="ar" dir="rtl">`.

**Seam:** the `visual-kit.test.js` process: `kitErrors` on scratch trees and the repository, and the built `fx-map-1.js` loaded in a `vm` context in node.

**Tests:**
- Repository: `kitErrors(<repo>, <every file in references/visual/ except visual-assets.md>)` returns `[]`; the test prints `visual-kit: OK`.
- Bad checksum: tree whose `references/vendor/elkjs-0.9.3.bundled.js` bytes differ from the table; returns exactly `['visual-assets: elkjs-0.9.3.bundled.js SHA-256 <got>, table says <want>']`.
- Missing file: table names `react-18.3.1.production.min.js`, no such file; returns `['visual-assets: react-18.3.1.production.min.js missing']`.
- Unlisted load: `references/visual/page-template.html` with `<script src="../_assets/other.js"></script>`; returns `['references/visual/page-template.html: loads ../_assets/other.js, which is not in the assets table']`.
- Host: `references/visual/svg-static.md` containing `https://example.com/x.svg`; returns `['references/visual/svg-static.md: names a host: https://example.com/x.svg']`.
- Namespace: `references/visual/svg-static.md` containing `<svg xmlns="http://www.w3.org/2000/svg">`; returns `[]`.
- Map data: `fxMap.validateMapData` on the example above with `children: "l1-api"` and no such level returns `['level l0: node api opens missing level l1-api']`; with that level added, `[]`; an edge to `db` with no `db` node gives `level l0: edge api -> db names a missing node`.
- Map navigation: with levels `l0` and `l1-api` (child of `api`), `fxMap.levelPath(data, 'l1-api')` deep-equals `['l0', 'l1-api']`.
- `scripts/check-artifacts`, `scripts/check-handwritten-js`, `scripts/check-reference-leaves` and `scripts/check-types` exit 0 on the repository.

**Risks:** the vendored bytes must be upstream's. Copy each from `/mnt/c/Users/Faisal/Desktop/system-flow/system-flow/vendor/`, run `npm pack react@18.3.1 react-dom@18.3.1 reactflow@11.11.4 elkjs@0.9.3` inside `<SCRATCH>/fx-tests/vendor-check/` through `scripts/scratch-env`, and compare each file with its package path. The report ledgers, per file, both SHA-256 values and the tarball's `integrity` value; a mismatch stops the task with both checksums. Take each licence from its package. `check-ts-escapes` bans `any` and `as` casts: declare narrow interfaces for the React, ReactFlow and ELK globals.

**Testing:** gate test on fixtures, the repository and the built map, part of `check-all`; the browser visual check runs on request only.

## Acceptance criteria
- [ ] `references/visual/` holds the seven reference files (counting `fx-tokens-1.css`) and the built `fx-map-1.js`, and nothing else.
- [ ] `git diff --stat` on the task's commit shows the vendored files as `Bin`.
- [ ] `node tests/gates/visual-kit.test.js` prints `visual-kit: OK`.
- [ ] No SKILL.md changed; the skill count is still 21.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/tests/gates/visual-kit.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/visual-kit.test.js`
Expected: the repository case fails with `visual-assets:` lines and the map cases fail because no kit exists.

- [ ] **4. Vendor the libraries, write `.gitattributes`, the reference files and the map**

- [ ] **5. Run them: verify GREEN**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/visual-kit.test.js`. Expected: `visual-kit: OK`.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-generated`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/tests/gates/visual-kit.test.ts src/references/visual/fx-map-1.ts references/visual/visual-assets.md`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env python3 -I scripts/check-artifacts` and `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-handwritten-js`

- [ ] **7. Commit by path**

```
git add .gitattributes references/visual/page-template.html references/visual/fx-tokens-1.css references/visual/fx-map-1.js src/references/visual/fx-map-1.ts references/visual/svg-animated.md references/visual/svg-static.md references/visual/archify-adapter.md references/visual/visual-assets.md references/visual/visual-check.md references/vendor/react-18.3.1.production.min.js references/vendor/react-dom-18.3.1.production.min.js references/vendor/reactflow-11.11.4.min.js references/vendor/reactflow-11.11.4.style.css references/vendor/elkjs-0.9.3.bundled.js references/vendor/LICENSE-react references/vendor/LICENSE-reactflow references/vendor/LICENSE-elkjs scripts/build tsconfig.browser.json tsconfig.json scripts/handwritten-js-allowlist.txt THIRD_PARTY_NOTICES.md src/tests/gates/visual-kit.test.ts tests/gates/visual-kit.test.js scripts/check-all SURFACE.md
git commit -m "feat(references): visual kit with vendored React Flow and ELK, checked offline"
```
