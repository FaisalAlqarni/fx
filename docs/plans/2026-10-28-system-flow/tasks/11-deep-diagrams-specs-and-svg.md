# 11: Deep diagrams: archify specs and the SVG fallback

**Status:** ready-for-agent
**Blocked by:** 05, 07
**Phase:** Core

**What to build:** `build` writes one deep diagram per level diagram, sequence and store flow into `<site>/diagrams/`, named `arch-<id>.html`, `seq-<id>.html` and `flow-<id>.html`, with continuation pages `-p2`, `-p3` when a sequence or flow has more than 8 messages. For each it also writes the archify spec to `<site>/diagrams/src/<name>.json` (architecture for levels, sequence for sequences and flows) with `sources` on every primary element filled from its evidence (at most 3 ranges, from the diagram's owning root), `meta.repository` set to that root's credential-free remote (or, with no remote, the root id) and HEAD with `link_mode: "local-only"`, and evidence from other roots moved into the steps card. An architecture spec takes its geometry from the task 05 layout: each component's `pos` and `size` come from the matching `FigureSpec` node box and `meta.viewBox` from the figure's width and height, so archify draws the same arrangement the page's figure shows. Every spec is valid against archify 3.2.0's own schemas, copied into the repo as test fixtures. Without `--archify` (this task) every deep diagram is an fx page: a static SVG for a level diagram, an animated SVG for a sequence or flow. The build prints one line per diagram with the pick and the reason.

**Design:** Renderers; Output location; Error handling

**Files:**
- Create: `src/lib/sf-diagrams.ts` (names and page splits, archify specs, the SVG fallback pages, pick lines)
- Modify: `src/lib/sf-build.ts` (write diagrams and specs; fill `BuildResult.diagrams`)
- Modify: `src/lib/sf-schema.ts` (the keywords archify's schemas use beyond the task 01 subset: `allOf`, `anyOf`, `oneOf`, `not`, `const`, `minLength`, `minimum`, `maximum`, `exclusiveMinimum`, `minItems`, `maxItems`, `minProperties`, `maxProperties`, `propertyNames`, `prefixItems`, `items: false`, `additionalProperties` as a schema, and a `$ref` to another file's `$defs` resolved through a schema map passed in; `$schema`, `$id`, `title` and `description` are ignored; any other keyword fails validation with `unsupported keyword <name>`, so nothing is skipped silently; patterns compile with the `u` flag)
- Create: `tests/fixtures/archify-3.2.0/architecture.schema.json`, `sequence.schema.json`, `common.schema.json` and `LICENSE`, byte copies of the files of that name in the installed archify's `schemas/` folder and its root `LICENSE` (read from `/home/faisal/.claude/skills/archify/`, the owner's install, version `3.2.0` per its `skill-release.json`; copy with `cp`, never write into the archify folder; the path is typed literally because `scripts/scratch-env` moves `HOME`), plus `tests/fixtures/archify-3.2.0/README.md` of two lines naming the source version and that the files are copied verbatim for spec validation
- Create: `src/scripts/system-flow-diagrams.test.ts` (built to `scripts/system-flow-diagrams.test.js`)
- Modify: `scripts/check-all` (one line)

Read only: the installed archify's `references/repository-authoring.md` (archify 3.2.0) for the `meta.repository` rules. The schema facts this task relies on, checked against archify 3.2.0: `meta.repository` is `{ url, revision, link_mode?, provider? }` with `url` any non-empty string and `revision` 40 hex characters; `sources` is 1 to 3 entries of `{ path, line?, end_line?, label? }` with `label` at most 48 characters; a component takes `pos` (`[x, y]`) and `size` (`[w, h]`); a component or participant id matches `^[a-zA-Z][a-zA-Z0-9_-]*$`; `meta.output` is a relative `.html` path.

**Interfaces:**
- Consumes: `FigureSpec` (declared in `src/lib/sf-model.ts` by task 04), `layoutAll` (task 05; the SVG fallback draws from the same figure spec); `Theme`, `themeCss` (task 07); `Root`, `readCited` (task 03); `BuildResult` (task 04).
- Produces, `src/lib/sf-diagrams.ts`:

```ts
export type DeepDiagram = { name: string; kind: 'architecture' | 'sequence'; source: string; spec: object; pages: number; owningRoot: string };
export function deepDiagrams(model: Model, figures: FigureSpec[], roots: Map<string, Root>, pageLimit: Record<string, number>): DeepDiagram[];
export function svgPage(d: DeepDiagram, figure: FigureSpec, page: number): string; // a full HTML page loading ../assets/fx-tokens-1.css and ../assets/theme.css only
export function pickLine(name: string, renderer: 'archify' | 'svg', detail: string): string; // `<name>: <archify architecture|archify sequence|static SVG|animated SVG>, <detail>`
```

  `pageLimit` maps a diagram name to its messages per page (default 8; task 12 passes 5 for a retried diagram and the persisted limits). The owning root is the root most of the diagram's evidence entries cite; a tie goes to the host. Archify ids: a model id that starts with a digit is prefixed `n` (model ids allow a leading digit, archify ids do not). `meta.output` is the page's file name (`arch-engine.html`), relative, as archify's `portableOutputPath` requires.
- Produces, `src/lib/sf-schema.ts`: `validate(schema: object, value: unknown, refs?: Record<string, object>): { pointer: string; message: string }[]` (the task 01 signature plus `refs`, a map from file name such as `common.schema.json` to its schema). Messages added: `shorter than <n> characters`, `less than <n>`, `more than <n>`, `fewer than <n> items`, `more than <n> items`, `does not match exactly one of oneOf`, `matches a not schema`, `value <json> is not <const>`, `unsupported keyword <name>`.

**Seam:** the `system-flow` CLI run as a process (`build` without `--archify`).

**Tests:**
- Names: model with level diagrams `system` and `engine`, sequence `turn` (14 messages), flow `first` (7 steps): `docs/system-flow/diagrams/` holds `arch-system.html`, `arch-engine.html`, `seq-turn.html`, `seq-turn-p2.html`, `flow-first.html`, and `diagrams/src/` holds a `.json` per page.
- Split: `seq-turn.json` has 8 messages and `seq-turn-p2.json` 6, each page listing only the participants it uses.
- Sources: in `arch-engine.json`, component `api` (evidence `app/api.rb` lines `10-42` symbol `Api#call`, plus `app/api.rb` lines `50` symbol `Api#log`, plus two more ranges) carries `sources` with exactly 3 entries, the first `{ path: "app/api.rb", line: 10, end_line: 42, label: "Api#call" }`.
- Single root: a diagram with 3 host entries and 1 guide entry: `meta.repository` deep-equals `{ url: "backend", revision: <host HEAD>, link_mode: "local-only" }` (the fixture's host has no remote, so the url is the root id); after `git('host', 'remote', 'add', 'origin', 'https://user:token@example.com/acme/app.git')` and a rebuild, `url` is `https://example.com/acme/app.git` (userinfo removed); no spec under `diagrams/src/` contains the fixture's absolute base path; the guide entry appears in the steps card text as `@guide/<path>:<lines>` and in no `sources`.
- Schema: every `.json` under `diagrams/src/` validates with `validate(<architecture or sequence schema>, spec, { 'common.schema.json': <common> })` from the copied fixtures with no problem. A spec mutated to carry `sources` of 4 entries fails with `more than 3 items`; one carrying `meta.repository.revision: "abc"` fails with `does not match ^[a-fA-F0-9]{40}$`.
- Geometry: in `arch-engine.json` each component's `pos` and `size` equal the matching node's `[x, y]` and `[w, h]` in the `level-engine` figure spec, and `meta.viewBox` covers the figure's width and height.
- Archify ids: a node `2fa` becomes component id `n2fa`, and edges naming it use `n2fa`.
- Validator: `validate({ type: 'string', format: 'email' }, 'x')` returns `[{ pointer: '', message: 'unsupported keyword format' }]`.
- Messages and connections carry no `sources`.
- Labels: a source label longer than 48 characters is cut to 48; a component label stays within archify's 35 and 80 limits.
- Fallback pages: `arch-engine.html` holds an `<svg` and loads only `../assets/fx-tokens-1.css` and `../assets/theme.css`; `seq-turn.html` holds an animated SVG (`<animate` or a CSS animation guarded by `prefers-reduced-motion`).
- Pick lines: stdout `diagrams` holds `{ name: "seq-turn", renderer: "svg", reason: "animated SVG, archify not installed" }` and `{ name: "arch-engine", renderer: "svg", reason: "static SVG, archify not installed" }`; `pickLine` output is `<name>: <reason>`, so the second reads `arch-engine: static SVG, archify not installed`; stderr is empty.
- Escape: a node label `<b>` appears in the SVG page as `&lt;b&gt;`.
- Rebuild: a second build leaves every diagram byte the same.

**Idempotency:** diagram pages and specs are generated and rewritten whole from the model.

**Risks:** archify's LICENSE must travel with the copied schemas; check it permits redistribution before committing, and stop and report if it does not. A later archify release with a different schema shows up only in task 18; the fixture folder name carries the version so a refresh is a new folder.

**Testing:** CLI process tests.

## Acceptance criteria
- [ ] Every level diagram, sequence and store flow has a deep diagram, and no page holds more than 8 messages.
- [ ] Every archify spec cites one repository and carries sources only on primary elements.
- [ ] Every spec validates against the copied archify 3.2.0 schemas, takes its geometry from the page's layout, and holds no absolute machine path.
- [ ] Without archify, every deep diagram is SVG, said once per diagram.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Copy the archify fixtures**

Run: `cp /home/faisal/.claude/skills/archify/schemas/architecture.schema.json /home/faisal/.claude/skills/archify/schemas/sequence.schema.json /home/faisal/.claude/skills/archify/schemas/common.schema.json /home/faisal/.claude/skills/archify/LICENSE tests/fixtures/archify-3.2.0/` (after `mkdir -p tests/fixtures/archify-3.2.0`), then write its `README.md`.

- [ ] **3. Write each test the Tests field names** in `src/scripts/system-flow-diagrams.test.ts`

- [ ] **4. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node scripts/system-flow-diagrams.test.js`
Expected: no `diagrams/` folder.

- [ ] **5. Implement the minimum that passes**

- [ ] **6. Run them: verify GREEN**

Run: same. Expected: `system-flow-diagrams.test.js: OK`.

- [ ] **7. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/lib/sf-diagrams.ts src/lib/sf-build.ts`, then every `scripts/system-flow-*.test.js` under the same prefix

- [ ] **8. Commit by path**

```
git add src/lib/sf-diagrams.ts lib/sf-diagrams.js src/lib/sf-schema.ts lib/sf-schema.js tests/fixtures/archify-3.2.0/architecture.schema.json tests/fixtures/archify-3.2.0/sequence.schema.json tests/fixtures/archify-3.2.0/common.schema.json tests/fixtures/archify-3.2.0/LICENSE tests/fixtures/archify-3.2.0/README.md src/lib/sf-build.ts lib/sf-build.js src/scripts/system-flow-diagrams.test.ts scripts/system-flow-diagrams.test.js scripts/check-all
git commit -m "feat(system-flow): deep diagram archify specs from evidence and the SVG fallback"
```

No attribution trailers. Then continue to the next task: never stop and wait.
