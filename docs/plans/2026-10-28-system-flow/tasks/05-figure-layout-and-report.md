# 05: Figure layout and the layout report

**Status:** ready-for-agent
**Blocked by:** 04
**Phase:** Core

**What to build:** `system-flow build` lays out every inline figure (each level diagram, each sequence drawn as boxes with folded arrows, each store flow) with the vendored elkjs in Node, under at most 1 crossing and at most 860 px wide. It ports system-flow's variant search and crossing reduction, drops the arrow that crosses most others while a figure has more than 1 crossing (never the last arrow of a box), and lists dropped arrows in the figure spec and the step captions. It writes `<site>/model/layout-report.json` and a one-line summary per figure on stdout. A figure that still cannot meet the limits fails the build, naming the figure and its best layout line.

**Design:** Layout; Error handling; The model

**Files:**
- Create: `src/lib/sf-layout.ts` (figure inputs from the model, ELK runs, crossing count from routed sections, node hits, variants, dropping, short labels, figure specs, level-0 `layout` hints as fixed grid positions)
- Modify: `src/lib/sf-build.ts` (lay out after check; write `layout-report.json`; fill `BuildResult.layout`; fail on an unfit figure)
- Create: `src/scripts/system-flow-layout.test.ts` (built to `scripts/system-flow-layout.test.js`)
- Create: `tests/fixtures/system-flow/parser-stages.json` (committed JSON, hand-copied: the ids, labels, kinds, `primary` flags and edges of system-flow's level-2 diagram `parser-stages` from its `model/system-model.json`, 10 nodes and 10 edges, with evidence rewritten to cite the task 01 fixture's `app/x.rb` `lines: '1-4'` `symbol: 'Link'`; the system-flow layout line it must not lose to, recorded in the file as `"systemFlowLine"`)
- Modify: `scripts/check-all` (one line)

Reference only, never edited: system-flow's `model/build-page.mjs` (`ruleShort`, the variant scoring `crossings*1000 + nodeHits*5000 + overwidth*60 + overheight*8 + aspect penalty`, `levelSpec`, `seqSpec`, `flowSpec`) under `/mnt/c/Users/Faisal/Desktop/system-flow/system-flow/`. To measure the two numbers the tests compare against, copy the whole `system-flow/` folder (model, vendor and template included) into `<SCRATCH>/system-flow-ref/` with `cp -r`, run the copy there (`TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node <SCRATCH>/system-flow-ref/model/build-page.mjs`), and read its `layout (key w x h dir ...)` lines on stdout. Nothing under `/mnt` is ever written; the copy's own `index.html` lands in the scratchpad.

**Interfaces:**
- Consumes: `Model`, `LayoutLine`, `FigureSpec` (declared in `src/lib/sf-model.ts` by task 04), `build` (task 04). elkjs is loaded with `require(path.join(__dirname, '..', 'references', 'vendor', 'elkjs-0.9.3.bundled.js'))` from the built `lib/sf-layout.js`.
- Produces, `src/lib/sf-layout.ts`:

```ts
export function shortLabel(label: string, short?: string): string;
export function layoutAll(model: Model): Promise<{ figures: FigureSpec[]; report: LayoutLine[]; unfit: { key: string; line: string }[] }>;
export function reportLine(l: LayoutLine): string; // `<key> <W>x<H> <direction> crossings=<n> hits=<n> nodes=<n> arrows=<n> notDrawn=<n> unlabelled=<n>`
```

**Seam:** the `system-flow` CLI run as a process (`build`), reading `layout-report.json` and stdout.

**Tests:**
- Short label: an edge label `"Reads the session token from the cache, then refreshes it"` with no `short` renders in the figure spec label text as at most 26 characters, cut at the clause boundary: `"Reads the session token"`. With `short: "Session read"` the text is `"Session read"`.
- A simple level diagram of 4 nodes in a chain: `layout-report.json` has one entry with `key: "level-system"`, `crossings: 0`, `notDrawn: 0`, `nodes: 4`, `arrows: 3`, `width <= 860`.
- Planar grid: diagram `grid` with 9 primary nodes `n11` to `n33` in a 3 by 3 grid and its 12 grid edges (each node to its right and lower neighbour), all evidenced: report entry `crossings: 0`, `notDrawn: 0`, `arrows: 12`, `width <= 860`. A layout that drops an arrow from a planar graph fails this test.
- Arrow dropping: diagram `dense` with 6 primary nodes and the 9 edges of K(3,3) (`a1,a2,a3` each to `b1,b2,b3`), all evidenced: `build` exits 0; its report entry has `crossings <= 1`, `arrows + notDrawn == 9`, and `1 <= notDrawn <= K33_CAP`, where `K33_CAP` is the `notDrawn` system-flow's scratch copy reports for the same K(3,3) diagram (add it to the copy's `system-model.json` as a level-3 diagram, run it once, and write the number into the test as a named constant with a one-line comment giving the measured line); every node still has at least one drawn arrow; the figure's dropped edge ids appear in the spec's `notDrawn`; and the merged map data (`system-model.json`) still holds all 9 edges.
- Parity: the diagram in `tests/fixtures/system-flow/parser-stages.json` laid out by `build`: its report entry's `crossings`, `nodeHits` and `notDrawn` are each at most the same field of `systemFlowLine`, and `width <= 860`.
- Unfit: a level-0 diagram with `layout` hints that pin four nodes of degree one so that their two arrows cross twice (for example `a(0,0)->b(1,1)`, `c(0,1)->d(1,0)`, `e(2,0)->f(3,1)`, `g(2,1)->h(3,0)`): `build` exits 1, writes nothing (every fragment's bytes, `verified` included, equal their bytes before the build, and no file appears under `docs/system/` or `docs/system-flow/`), and stderr has one line starting `docs/system-flow/model/fragments/level0.json:/levels/diagrams/0: figure level-system cannot meet 1 crossing and 860 px: level-system ` followed by the report line, whose `crossings=` value is at least 2.
- Sequence figure: sequence `turn` with 3 participants and 4 messages, two of them between the same pair: the figure has 3 nodes and 3 edges, and the folded edge's label text holds both step numbers (`"1, 3"` style, the two `n` values joined by `, `); `steps` has 4 entries, the third caption holds `app/x.rb:` and the message's lines.
- Flow figure: flow `first` whose steps write `sql` twice and read `cache` once from actor `api`: nodes `api`, `sql`, `cache` with `store: true` on the two stores; edges labelled `write` and `read`.
- Groups: a level-0 diagram with groups `g1` (members `a`, `b`) and `g2` (members `c`) and no `layout` hints is laid out with the groups as ELK compound nodes: the spec's `groups` has 2 entries, and each member node's box lies inside its group's box.
- Stdout: `BuildResult.layout` has one entry per figure, equal to `layout-report.json`.
- Determinism: two builds of the same model produce byte-identical `layout-report.json`.

**Risks:** ELK is asynchronous; the CLI awaits it. Crossing counts come from ELK's routed sections (`sections[].startPoint/bendPoints/endPoint`), counted as proper segment intersections; port system-flow's counter. `check-ts-escapes` bans `any` and `as` casts: declare a narrow interface for the ELK object.

**Testing:** CLI process tests.

## Acceptance criteria
- [ ] No built figure exceeds 1 crossing or 860 px, or the build fails naming it.
- [ ] Dropped arrows are listed in the figure spec and remain in the model.
- [ ] A planar 3 by 3 grid drops nothing; K(3,3) drops no more than system-flow does; the parity fixture is no worse than system-flow's line.
- [ ] `layout-report.json` has one line per figure with every field the design names.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/scripts/system-flow-layout.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node scripts/system-flow-layout.test.js`
Expected: no `layout-report.json` is written.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: `system-flow-layout.test.js: OK`.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/lib/sf-layout.ts src/lib/sf-build.ts`, then `node scripts/system-flow-build.test.js` under the same prefix

- [ ] **7. Commit by path**

```
git add src/lib/sf-layout.ts lib/sf-layout.js src/lib/sf-build.ts lib/sf-build.js tests/fixtures/system-flow/parser-stages.json src/scripts/system-flow-layout.test.ts scripts/system-flow-layout.test.js scripts/check-all
git commit -m "feat(system-flow): ELK figure layout under 1 crossing and 860 px, with a layout report"
```

No attribution trailers. Then continue to the next task: never stop and wait.
