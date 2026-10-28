# 17: build --only

**Status:** ready-for-agent
**Blocked by:** 10, 12, 13
**Phase:** Hardening

**What to build:** a branch's docs step stays small. `build --only <handles or paths>` runs the full `check`, then rebuilds only the Markdown docs, inline figures and deep diagrams that contain the given items (a path selects the items citing it); the page is always rewritten whole. Every other generated file keeps its bytes. stdout says what was rebuilt, so fx-docs can count diagrams rebuilt.

**Design:** The CLI; Stale, query and the fx-docs branch step

**Files:**
- Modify: `src/lib/sf-build.ts` (selection by item; `BuildResult.rebuilt`)
- Modify: `src/scripts/system-flow.ts` (`--only` takes a comma-separated list or repeats)
- Create: `src/scripts/system-flow-only.test.ts` (built to `scripts/system-flow-only.test.js`)
- Modify: `scripts/check-all` (one line)

**Interfaces:**
- Consumes: `build`, `BuildResult` (04 to 12); `parseHandle` (task 01); `queryPaths` (task 13) to turn paths into items; `sectionItems` (task 09) to map items to section docs; `deepDiagrams` (task 11) to map items to diagram names.
- Produces: `BuildResult.rebuilt: { docs: string[]; figures: string[]; diagrams: string[] }`, filled on every build (a full build lists everything); CLI `build --only <handle|path>[,<handle|path>...]`. An argument with a handle prefix is a handle (`diagram:engine`, `seq:turn`, `flow:first` and `section:s1` select everything in that diagram, sequence, flow or section); any other argument is a path. A diagram, sequence, flow or section handle selects its doc, figure and deep diagram.

**Seam:** the `system-flow` CLI run as a process.

**Tests:** a full build first of a model with sections `s1` (bullet `b1`, diagram `engine`) and `s2` (bullet `b2`, sequence `turn`); record every generated file's bytes and mtime.
- By handle: edit `b1`'s text (with its correction), `build --only bullet:b1`: exit 0; `docs/system/s1.md` changed; `docs/system/s2.md`, `diagrams/seq-turn.html` and `diagrams/arch-engine.html` have the same bytes and mtime; `index.html` was rewritten (mtime changed); `rebuilt` deep-equals `{ docs: ["docs/system/s1.md"], figures: [], diagrams: [] }`.
- Node in a diagram: edit node `api` in `engine`, `build --only node:api`: `rebuilt.figures` is `["level-engine"]`, `rebuilt.diagrams` is `["arch-engine"]`, `rebuilt.docs` is `["docs/system/s1.md"]`; `seq-turn.html` keeps its mtime.
- By path: `build --only app/x.rb` selects every item citing `app/x.rb`, the same set `query app/x.rb` prints.
- Container handle: `build --only seq:turn`: `rebuilt` deep-equals `{ docs: ["docs/system/s2.md"], figures: ["seq-turn"], diagrams: ["seq-turn"] }`.
- Same id, two kinds: with node `turn` in `engine` and sequence `turn`, `build --only node:turn` rebuilds `level-engine` and not `seq-turn`.
- Unknown handle: `build --only node:ghost` exits 1 with `system-flow: build: no item node:ghost` and writes nothing.
- Check first: a bad range anywhere in the model makes `build --only bullet:b1` exit 1 and write nothing.
- Full build: `rebuilt.docs` lists every section doc.

**Idempotency:** a repeated `--only` build rewrites the same selected files with the same bytes.

**Testing:** CLI process tests.

## Acceptance criteria
- [ ] Only the docs, figures and diagrams holding the given items change; the page is always rewritten.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/scripts/system-flow-only.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node scripts/system-flow-only.test.js`
Expected: `--only` exits 2.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: `system-flow-only.test.js: OK`.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/lib/sf-build.ts src/scripts/system-flow.ts`, then every `scripts/system-flow-*.test.js` under the same prefix

- [ ] **7. Commit by path**

```
git add src/lib/sf-build.ts lib/sf-build.js src/scripts/system-flow.ts scripts/system-flow src/scripts/system-flow-only.test.ts scripts/system-flow-only.test.js scripts/check-all
git commit -m "feat(system-flow): build --only rebuilds the docs, figures and diagrams holding given items"
```

No attribution trailers. Then continue to the next task: never stop and wait.
