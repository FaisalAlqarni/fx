# 08: Kit files fx-map-2 and fx-flow-1, page template slots

**Status:** ready-for-agent
**Blocked by:** 04
**Phase:** Core

**What to build:** the browser pieces the site page loads. `fx-map-2.js` is the drill-down map with context nodes (drawn faded), groups, sync and async arrows, a "Show context nodes" toggle and "Show all arrows"; `fx-map-1.js` stays for existing pages. `fx-flow-1.js` is the inline figure player: it draws SVG from a figure spec and offers Back, Play or Pause, Next, Reset, a step counter, an `aria-live` caption naming the code for each step, a moving token, play when scrolled into view, and reduced motion respected. The page template gains two optional slots, `NAV` and `DIAGRAMS`, that existing pages leave empty. The assets table gains the two kit files and the site output root.

**Design:** Renderers; Output location; What it replaces; Testing Decisions

**Files:**
- Create: `src/references/visual/fx-map-2.ts` (built to `references/visual/fx-map-2.js`, browser IIFE)
- Create: `src/references/visual/fx-flow-1.ts` (built to `references/visual/fx-flow-1.js`, browser IIFE)
- Modify: `scripts/build` (both paths in the `platform=browser format=iife` case), `tsconfig.browser.json` (include both), `tsconfig.json` (exclude both, as `fx-map-1.ts` is)
- Modify: `references/visual/page-template.html` (slots `<!-- slot: NAV -->` and `<!-- slot: DIAGRAMS -->`, each with a one-line comment saying a page without them leaves them empty)
- Modify: `references/visual/visual-assets.md` (rows for `fx-map-2.js` and `fx-flow-1.js`, library `fx`, version `0.8.0`, their SHA-256; an output-root row: page kind `System flow site`, output root `<site>/assets/`, page location `<site>/index.html` and `<site>/diagrams/<name>.html`, path from the page `assets/` and from a diagram page `../assets/`; the copy rule names `theme.css` as generated, never copied)
- Modify: `src/tests/gates/visual-kit.test.ts` (the `shown` and `listed` lists; vm tests for both new files)

**Interfaces:**
- Consumes: the `FigureSpec` shape declared in `src/lib/sf-model.ts` (task 04), copied here as the data contract because a browser file cannot import a Node module; this task does not import `sf-model` or `sf-layout`.
- Produces, `fx-map-2.js`: `globalThis.fxMap = { validateMapData(data: unknown): string[]; levelPath(data, levelId: string): string[]; mount(): void }`. Map data, inline in `<script type="application/json" id="map-data">`: `{ root: string; levels: { id: string; title: string; parent?: string; groups: { id: string; label: string; members: string[]; groups?: string[] }[]; nodes: { id: string; label: string; kind: string; role: string; children?: string; primary: boolean; evidence: { path: string; lines?: string; symbol?: string }[] }[]; edges: { from: string; to: string; label: string; mode: 'sync' | 'async'; evidence: { path: string; lines?: string; symbol?: string }[] }[] }[] }`. Validation messages: the three of `fx-map-1` (`root level <id> missing`, `level <id>: node <node> opens missing level <child>`, `level <id>: edge <from> -> <to> names a missing node`) plus `level <id>: group <group> names a missing node <member>`.
- Produces, `fx-flow-1.js`: `globalThis.fxFlow = { validateFigure(spec: unknown): string[]; mount(): void }`. `mount` reads `<script type="application/json" id="diagrams">` (an object keyed by figure key) and fills every `<figure data-fx-flow="<key>">`. Validation messages: `figure <key>: step <i> names a missing edge <id>`, `figure <key>: step <i> names a missing node <id>`, `figure <key>: wider than 860 px`.
- Produces: the slot names `NAV` and `DIAGRAMS` in `page-template.html`.

**Seam:** the `visual-kit.test.js` gate: the built files loaded in a `vm` context with no DOM, and `kitErrors` over the repository (design seam 3). Rendering is checked in the proof runs' visual check, as `fx-map-1.js` is today.

**Tests:**
- Repository: `kitErrors(<repo>, <every file in references/visual/ except visual-assets.md>)` returns `[]`; `shown` deep-equals the old list plus `fx-flow-1.js` and `fx-map-2.js`, sorted; `listed` gains both names.
- Checksums: the table's SHA-256 for `fx-map-2.js` and `fx-flow-1.js` equal the built files' (part of `kitErrors`).
- `fxMap.validateMapData` (fx-map-2) on a level with group `g` whose `members` holds `ghost`: `['level l0: group g names a missing node ghost']`; on a valid two-level map with a context node (`primary: false`) and an `async` edge: `[]`.
- `fxMap.levelPath(data, 'l1-api')` with `l1-api` a child of `api` in `l0`: `['l0', 'l1-api']`.
- `fxFlow.validateFigure` on a spec whose step 0 names edge `e9` that is not in `edges`: `['figure seq-turn: step 0 names a missing edge e9']`; on a spec with `width: 900`: `['figure seq-turn: wider than 860 px']`; on a valid spec: `[]`.
- Loading either file in a `vm` context with no `document` throws nothing (`mount` runs only when its data element exists).
- The template keeps every existing assertion of the gate (theme memory, legend, evidence toggle, logical properties) and holds `<!-- slot: NAV` and `<!-- slot: DIAGRAMS`.
- `fx-map-1.js` bytes are unchanged (its table SHA still matches).

**Risks:** `check-ts-escapes` bans `any` and `as` casts: declare narrow interfaces for the React, ReactFlow and ELK globals, as `fx-map-1.ts` does. Start `fx-map-2.ts` from a copy of `fx-map-1.ts`; never edit `fx-map-1.ts`.

**Testing:** gate test in `check-all`; browser rendering in the proof runs.

## Acceptance criteria
- [ ] `references/visual/` holds `fx-map-2.js` and `fx-flow-1.js` beside the unchanged `fx-map-1.js`.
- [ ] A page built from the template without `NAV` and `DIAGRAMS` is unchanged in behaviour.
- [ ] `node tests/gates/visual-kit.test.js` prints its OK line.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/tests/gates/visual-kit.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/visual-kit.test.js`
Expected: the new files are missing from `shown` and `fxFlow` is undefined.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: the gate's OK line.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/references/visual/fx-map-2.ts src/references/visual/fx-flow-1.ts references/visual/page-template.html references/visual/visual-assets.md src/tests/gates/visual-kit.test.ts`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-types`

- [ ] **7. Commit by path**

```
git add src/references/visual/fx-map-2.ts references/visual/fx-map-2.js src/references/visual/fx-flow-1.ts references/visual/fx-flow-1.js scripts/build tsconfig.browser.json tsconfig.json references/visual/page-template.html references/visual/visual-assets.md src/tests/gates/visual-kit.test.ts tests/gates/visual-kit.test.js
git commit -m "feat(references): fx-map-2 with context nodes and groups, fx-flow-1 figure player, template slots"
```

No attribution trailers. Then continue to the next task: never stop and wait.
