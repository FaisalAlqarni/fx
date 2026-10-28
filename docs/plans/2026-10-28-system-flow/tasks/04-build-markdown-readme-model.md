# 04: build: Markdown, README, merged model and docs-index `@` paths

**Status:** ready-for-agent
**Blocked by:** 03
**Phase:** MVP

**What to build:** `system-flow build` runs `check` in build mode (an uncommitted cited file is now an error, and nothing is written on any failure), computes in memory the `verified` commit of every item that has none yet (that root's HEAD), writes the Markdown docs, the site README and the merged `system-model.json` from those values, and only then, as its last step and only when every earlier step succeeded, writes the new `verified` values into the fragments. Text from the model is escaped for the place it lands: Markdown table cells, Mermaid lines and evidence lines. The Markdown carries docs-index evidence lines, so `scripts/docs-index` indexes it and its stale check keeps working; evidence in another root is written `@<root id>/<path>` and docs-index skips it as `other-root`. A Markdown file without the generated marker is never overwritten.

**Design:** Renderers; Fragments and merge; Output location; Stale, query and the fx-docs branch step; Error handling

**Files:**
- Create: `src/lib/sf-markdown.ts` (section docs, `components.md`, `stores.md`, per-folder `index.md`; README text; `escapeCell`, `escapeMermaid`)
- Create: `src/lib/sf-build.ts` (the build pipeline: check, compute stamps, write outputs, write stamps last; later tasks add steps before the last one)
- Modify: `src/lib/sf-model.ts` (`LayoutLine`, `FigureSpec`, `stampVerified`)
- Modify: `src/scripts/system-flow.ts` (`build` subcommand; `--markdown` default `.fx.json` `system_flow.output.markdown`, else `docs/system`)
- Modify: `src/lib/doc-index.ts` (`@` paths skip as `other-root`; `Stale['reason']` gains `'other-root'`), `src/lib/doc-index.test.ts`
- Create: `src/scripts/system-flow-build.test.ts` (built to `scripts/system-flow-build.test.js`)
- Modify: `scripts/check-all` (one line)

**Interfaces:**
- Consumes: `mergeFragments`, `checkRules`, `resolveRoots`, `verifyEvidence(items, roots, 'build')` (tasks 01 to 03).
- Produces, `src/lib/sf-build.ts`: `build(opts: { hostRoot: string; site: string; markdown: string; only?: string[]; archify?: string }): Promise<BuildResult>` with `type BuildResult = { ok: boolean; problems: Problem[]; written: string[]; collisions: string[]; diagrams: { name: string; renderer: 'archify' | 'svg'; reason: string }[]; layout: LayoutLine[]; pageBytes: number | null }`. Fields this task does not fill stay empty arrays or `null`; tasks 05, 10, 11, 12, 14 and 17 fill them or add fields. Every later step goes before the stamp write, so a failure anywhere leaves the fragments byte-unchanged. Declared in `src/lib/sf-model.ts` in this task, so task 05 (which fills them) and task 08 (which copies the shape into the browser kit) share one definition:

```ts
export type LayoutLine = { key: string; width: number; height: number; direction: 'RIGHT' | 'DOWN'; crossings: number; nodeHits: number; nodes: number; arrows: number; notDrawn: number; unlabelled: number };
export type FigureSpec = {
  key: string;                       // level-<diagram id> | seq-<sequence id> | flow-<flow id>
  kind: 'level' | 'sequence' | 'flow';
  width: number; height: number; direction: 'RIGHT' | 'DOWN';
  nodes: { id: string; x: number; y: number; w: number; h: number; lines: string[]; kind: string; primary: boolean; store: boolean }[];
  edges: { id: string; d: string; mode: 'sync' | 'async'; label: { x: number; y: number; w: number; h: number; text: string } | null }[];
  groups: { id: string; label: string; x: number; y: number; w: number; h: number }[];
  steps: { edges: string[]; nodes: string[]; caption: string }[]; // caption is plain text holding the first evidence `path:lines`
  notDrawn: string[];                // edge ids
};
```
- Produces, `src/lib/sf-markdown.ts`: `renderMarkdown(model: Model, roots: Map<string, Root>, hostId: string, markdownRoot: string): { path: string; text: string }[]`, `evidenceLine(evidence: Evidence[], hostId: string): string`, `escapeCell(s: string): string` (`\` to `\\`, `|` to `\|`, each line break to one space) and `escapeMermaid(s: string): string` (`#` to `#35;` first, then `;` to `#59;`, `:` to `#58;`, `"` to `#quot;`, each line break to one space). Mermaid participants are declared `participant <participant id> as <escaped label>`, so a label never stands in as an id.
- Produces, `src/lib/sf-model.ts`: `planStamps(items: Item[], roots: Map<string, Root>): Map<string, Verified>` (handle to the values to add: `<root HEAD>` for each root an item's evidence cites and its `verified` lacks; never an existing value) and `stampVerified(fragmentsDir: string, stamps: Map<string, Verified>): string[]` (writes them, returns the fragment files it changed). `build` calls `planStamps` right after `check`, renders with the stamped values, and calls `stampVerified` last. It never overwrites an existing value (decided here: the design says `build` writes `verified` and that stale compares it to HEAD; overwriting would erase staleness).
- Produces: `Stale.reason` value `'other-root'` in `src/lib/doc-index.ts`.
- Produces, CLI stdout for `build`: the `BuildResult` JSON.

**Seam:** the `system-flow` CLI run as a process; the docs-index change at `src/lib/doc-index.test.ts` (design seam 2).

**Tests:** the task 01 fixture, host id `backend`, one section `s1` (`question: "Where do links expire?"`, one bullet `b1` "A link expires after 30 days." citing `app/x.rb` `lines: '1,4'` `symbol: 'expired?'`, one bullet `b2` citing `{root:'guide', path:'README.md', lines:'1', symbol:'Guide'}`), one sequence `turn` with 2 messages in chapter `s1`, one store flow `first` with 2 steps in `s1`.
- `build` exits 0; `docs/system/s1.md` exists; its first non-heading line is `Where do links expire?`; under bullet `b1` the line is ``Evidence: `app/x.rb:1` `expired?`; `app/x.rb:4` `expired?` ``; under `b2` it is ``Evidence: `@guide/README.md:1` `Guide` ``.
- Parse back: `parseDoc('docs/system/s1.md', text)` from `lib/doc-evidence.js` returns no problems and claims whose evidence paths are exactly `app/x.rb` (twice) and `@guide/README.md`.
- The doc ends with `<!-- fx-system-flow generated: edit the model, then rebuild -->` and `<!-- fx-docs verified: <host HEAD> -->`.
- The sequence renders a fenced `mermaid` block starting `sequenceDiagram` and a table whose header is `| # | From | To | Message | Evidence |` with 2 rows; the store flow renders a table with header `| # | Actor | Op | Store | Key | When | Evidence |`.
- `docs/system/index.md` lists `s1` with a link `s1.md` and a link to the site `../system-flow/index.html`.
- `docs/system/components.md` and `docs/system/stores.md` exist and carry the generated marker.
- `docs/system-flow/README.md` names `system-flow check` and `system-flow build`, says the fragments are the record, and names `index.html`, `diagrams/`, `system-model.json` and the Markdown as generated.
- `docs/system-flow/model/system-model.json` parses, has `"generated": true` at top level, and holds both sections' items.
- Stamping: after `build`, every item in the fragments carries `verified.backend` equal to the host HEAD, and `b2` also `verified.guide` equal to the guide HEAD; a second `build` changes no fragment byte.
- Oldest verified: set `b1`'s `verified.backend` to an older reachable commit `C0`; the marker in `s1.md` names `C0`.
- Collision: commit a hand-written `docs/system/s1.md` with no generated marker; `build` exits 0, leaves its bytes unchanged, and stdout `collisions` equals `["docs/system/s1.md"]`.
- Uncommitted cited file: edit `app/x.rb` without committing; `build` exits 1 with a stderr line ending `app/x.rb has uncommitted changes`, and no file under `docs/system/` or `docs/system-flow/` changes (compare bytes and listing before and after).
- Any check failure (a bad range): exit 1, nothing written.
- Table escape: a message label `a|b` renders the message table cell `a\|b`, and `parseDoc` still sees 5 cells in that row; a store row `key` of `user:{id}|v2` renders `user:{id}\|v2`; a label holding a line break renders as one line.
- Mermaid escape: message label `Reads #3; then: "writes"` renders the Mermaid line `    api->>db: Reads #35;3#59; then#58; #quot;writes#quot;`; participant `api` labelled `API; v2` renders `    participant api as API#59; v2`.
- Stamp last on failure: with a node citing a range past the end of `app/x.rb`, `build` exits 1 and every fragment's bytes equal their bytes before the build; with every check passing but `docs/system/` made unwritable (`fs.chmodSync(dir, 0o500)` in the test, restored to `0o700` after), `build` exits 1 and no fragment gained a `verified` field.
- `doc-index.test`: a doc whose only evidence is `` `@guide/README.md:1` `Guide` `` gets `{ verdict: 'skip', reason: 'other-root' }` from `stalePassOne`; a claim with one host path and one `@` path is judged on the host path alone.

**Idempotency:** `build` rewrites only files carrying the generated marker and the generated `system-model.json` and README; `stampVerified` runs last, only on success, and writes only values items lack. A rerun with no model change leaves every byte the same.

**Testing:** CLI process tests; `doc-index.test.js`.

## Acceptance criteria
- [ ] A built Markdown doc is read back by docs-index's own parser with no problems.
- [ ] `docs-index stale` never reports an `@` path as `deleted`.
- [ ] A hand-written doc is never overwritten, and the collision is listed.
- [ ] Fragments change only after every output is written, and only on success.
- [ ] A `|`, `#`, `;`, `:` or quote in model text cannot break a table row or a Mermaid line.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/scripts/system-flow-build.test.ts` and `src/lib/doc-index.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node scripts/system-flow-build.test.js` and `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node lib/doc-index.test.js`
Expected: `build` exits 2 (unknown subcommand); the `@` claim is `recheck`/`deleted`.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: both print OK.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/lib/sf-markdown.ts src/lib/sf-build.ts src/lib/doc-index.ts src/scripts/docs-index.ts src/scripts/system-flow.ts`, then the three earlier `system-flow-*.test.js` files under the same prefix

- [ ] **7. Commit by path**

```
git add src/lib/sf-markdown.ts lib/sf-markdown.js src/lib/sf-build.ts lib/sf-build.js src/lib/sf-model.ts lib/sf-model.js src/lib/doc-index.ts lib/doc-index.js src/lib/doc-index.test.ts lib/doc-index.test.js src/scripts/system-flow.ts scripts/system-flow src/scripts/system-flow-build.test.ts scripts/system-flow-build.test.js scripts/check-all
git commit -m "feat(system-flow): build Markdown, README and the merged model; docs-index skips other roots"
```

No attribution trailers. Then continue to the next task: never stop and wait.
