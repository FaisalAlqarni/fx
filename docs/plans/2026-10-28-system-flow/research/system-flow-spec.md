# system-flow: a reverse-engineered spec, and what fx needs to produce it

Study date 2026-10-28. Source: `/mnt/c/Users/Faisal/Desktop/system-flow/system-flow` (read-only). fx compared at `/development/fx` main `ce1fb19`. All counts below were computed from the files, not estimated, unless marked "estimate". Scripts used: `/tmp/claude-1000/sf-study/counts.py`, `specs.py`, `shots.js`; raw output in `counts.txt`.

---

## 1. What it is

A self-contained, offline documentation site for one multi-repo system (Shamel v2: iOS app, portal, .NET Backend, TypeScript engine, Admin, parser, mocks, GPU stack, k8s values), written for people joining the team. It describes the system as it is today, not an audit (the brief's "Purpose rule": no findings table, no fix list, no environment or Helm detail; host names only inside evidence boxes).

Three layers, one source of truth:

| Layer | Files | Built by |
|---|---|---|
| Model | `model/system-model.json` (654 KB) | `model/build.py` assembles it from Python modules (`levels_a..d`, `seqs`, `stores`, `sections`, not shipped in the folder) and validates it |
| Page | `index.html` (1.05 MB, generated) | `model/build-page.mjs` + `model/page-template.html` + `vendor/elk.bundled.js` |
| Deep diagrams | 58 archify HTML files: 5 fixed names at the top level, 53 in `diagrams/` with specs in `diagrams/src/` | the archify skill, one `finalize` per spec |

Process records beside the model: `model/corrections.md` (242 lines), `model/diagram-audit.md` (207 lines), `model/old-vs-new.md` (150 lines), `model/previous/` (the earlier five archify specs and their visual checks), `model/previous-index.html` (the earlier 139 KB page: 14 chapters, 17 inline diagrams, 5 archify links).

Investigation inputs named in `meta.sources`: `.fx/sysdoc/brief.md`, `.fx/sysdoc/research/*.md`, `.fx/sysdoc/research/owner-questions.md` (section A), `.fx/sysdoc/research/owner-answers.md` (binding), and read-only code re-checks. `sysdoc` does not exist anywhere in fx; it was an ad-hoc folder in the Shamel workspace.

Vendor: React 18.3.1, React DOM 18.3.1, React Flow 11.11.4 (UMD + CSS), elkjs 0.9.3. These are the same five files fx already vendors (`references/visual/visual-assets.md`).

---

## 2. The model: schema with counts

Top-level keys: `meta`, `levels`, `sequences`, `stores`, `storeFlows`, `sections`.

### 2.1 meta

`title`, `date`, `purpose`, `pathBase` (evidence paths relative to the workspace root; `k8s-comm-apps/` relative to its parent), `sources[]`, `shapes` (the node, edge and evidence shapes written out as strings), `conventions[]` (key notation such as `{p}`, `{bp}`, `{state}`, `{subject}`, rendered as a note above the Redis table).

### 2.2 levels (the drill-down hierarchy)

`levels.root = "system"`, `levels.diagrams[]`: 23 diagrams.

| Level | Diagrams | Ids |
|---|---|---|
| 0 | 1 | system |
| 1 | 7 | backend, clients, gpu-stack, data-stores, engine, admin, parser |
| 2 | 11 | turn-pipeline, primary-and-runner, skill-runner, citizen-context, knowledge-retrieval, model-access (engine); upload-publish, embedding-reload, knowledge-generation, twk-bridge (admin); parser-stages (parser) |
| 3 | 4 | skill-selection, run-lifecycle, citizen-reads, vector-build |

Diagram shape: `id, level, parent, title, summary, groups[], nodes[], edges[], childrenDiagrams[]` (the last is derived by build.py).

- **Nodes: 301** (8 to 21 per diagram). Shape: `id, label, kind, role, children, primary, evidence[], unconfirmed?`. Kinds: backend 163, database 54, security 28, frontend 18, external 18, cloud 17, messagebus 3. `primary: false` (context, drawn faded: the neighbour that lives in another diagram) on 62 nodes. 85 nodes have `children` (they open a deeper diagram).
- **Edges: 344** (7 to 36 per diagram). Shape: `from, to, label, mode (sync|async), evidence[], unconfirmed?`, optional `short` (hand label, at most 26 chars). Modes: sync 328, async 13, unset 3. Unconfirmed: 2.
- **Groups: 11** (9 on level 0, 2 on data-stores). Shape: `id, label, members[], groups[]` (nesting, for example "TWK internal network" contains "Backend servers (IIS) behind the F5", "k8s", "Data servers", "GPU host", "Behind Apigee").
- Rule enforced in build.py: at most 12 primary nodes per diagram; every node and edge has evidence unless `unconfirmed`.

### 2.3 sequences

13 sequences, **76 participants, 132 messages** (6 to 16 messages each). Shape: `id, title, replaces (path of the old archify spec or null), correctionsApplied[], participants[] (id, label, kind, role, evidence[]), messages[] (n, from, to, label, mode, evidence[], note?), notes[]`. Message modes: sync 111, async 19. Self messages (from = to) exist and are rendered as a highlight step.

Ids: turn (14), turn-events (7), device-call (13), resume (7), first-message (14), later-message (7), new-session (6), skill-selection (9), skill-run (16), upload-publish (9), embedding (13), knowledge-generation (7), parse-app (10).

### 2.4 stores

**130 rows** in five tables:

| Key | Rows | Columns |
|---|---|---|
| sql | 61 | table, database, purpose, writtenBy, readBy, when, evidence |
| redis | 28 | pattern, owner, value, ttl, writtenBy, readBy, when, evidence |
| memory | 28 | owner, name, holds, key, lifetime, evidence |
| files | 11 | owner, path, purpose, writtenBy, readBy, evidence |
| client | 2 | owner, path, purpose, writtenBy, readBy, evidence |

### 2.5 storeFlows

8 flows, **77 steps**. Shape: `id, trigger, steps[] (n, actor, op (read|write|delete), store (sql|redis|memory|files), key, when, evidence[])`. Ops: write 52, read 24, delete 1. Stores touched: sql 34, redis 32, memory 6, files 5. Flows: first-message (18 steps), later-message 7, service-run 13, device-return 7, upload-publish 7, reload-embedding 10, knowledge-generation 7, parse-run 8. The chapter a flow belongs to is a hard-coded map in build-page.mjs (`STOREFLOW_SECTION`), not a model field.

### 2.6 sections (chapters)

**19 chapters, 101 fact bullets** (2 to 8 each). Shape: `id, title, question (nullable), bullets[] (text, evidence[]), diagrams[] (level ids), sequences[], storeRefs[]`. 14 of 19 carry a `question`, phrased in the owner's own words ("What is saved in DB?", "When and how does embedding happen, and how is it used?"). The chapters answer the owner's question list, not a generic doc set: system at a glance; SQL; Redis; memory; first message; later messages; parsing; after parsing; embedding; vectors; models; knowledge; agents; skill selection; device calls; citizen context; trust; replicas; limits.

### 2.7 Evidence

Shape everywhere: `{path, lines, symbol}`. Lines are a string: `"237"`, `"22-58"`, `"63,67-245"`.

| Measure | Count |
|---|---|
| Evidence entries | 1,785 (1,782 with lines, all with a symbol) |
| Distinct files cited | 219 |
| Distinct (path, lines) ranges | 961 |
| Distinct symbols | 878 |
| Union of cited source lines | about 17,100 |
| Evidenced items (nodes, edges, participants, messages, store rows, flow steps, bullets) | 1,161 |
| Entries citing owner answers or questions (`.fx/sysdoc/research/owner-*.md`) | 97 |
| Evidence rows rendered on the page (deduplicated per row, repeated per chapter) | 2,024 |

---

## 3. The build pipeline, step by step

### 3.1 build.py (model assembly and validation; Python)

1. Imports each diagram, the sequences, store tables, flows and sections from hand or agent-written Python modules.
2. Derives `childrenDiagrams` per diagram.
3. Structure checks: duplicate node ids; more than 12 primary nodes; bad `parent`; a node or edge with no evidence and not `unconfirmed`; `children` naming a missing diagram; an edge or message naming a missing node or participant; a section naming a missing diagram or sequence.
4. Evidence existence check: every evidence path (without `{` or `*`) must exist on disk under the workspace root.
5. Dash check: fails on an em or en dash anywhere in the model.
6. Writes the JSON, re-parses it, prints counts (by level, sequences, stores, flows, sections, unconfirmed, bytes) and the problem and missing-path lists.

It does not check line ranges against file length or symbol presence in the range.

### 3.2 build-page.mjs (page; Node or Bun, no network, 741 lines)

1. Loads the model, the template and `vendor/elk.bundled.js` (ELK runs in Node at build time).
2. **Short labels.** `ruleShort()` cuts each edge label to 26 chars on clause, then word, boundaries, drops an unclosed bracket and trailing stop words. A `SHORT` table overrides by `diagram:from>to`; a warning fires for an override whose edge no longer exists.
3. **Layout per inline figure.** ELK layered, orthogonal routing, labels reserved beside their own arrow. It tries node widths 188/164/144 x direction RIGHT/DOWN x aspect 1.6/1.0, scores each variant (`crossings*1000 + nodeHits*5000 + overwidth*60 + overheight*8 + aspect penalty`), and prefers any variant at most 860 px wide (the column). If still too wide, it retries with layer wrapping (MULTI_EDGE) and narrower nodes, then Coffman-Graham layering with 4 or 5 boxes per row.
4. **Crossing reduction.** While a figure has more than 1 crossing and more than 4 arrows: drop the arrow that crosses most others (never the last arrow of a box), re-layout. Dropped arrows are listed under "Arrows not drawn (n)" and in the step captions; a figure note explains.
5. **Level 0** is hand placed: a 4 x 5 grid (`L0.at`), hand routes for 21 main arrows (`L0.routes`), a main-arrow list (`MAIN0`, 23 keys) and a label placer that keeps labels on their own arrow, clear of boxes, other labels and zone borders. Two crossings are accepted and documented in a comment. `L0_AT` and `L0_DEBUG` env vars help tune it.
6. **Spec per figure** (`levelSpec`, `seqSpec`, `flowSpec`): nodes with wrapped lines and sizes, edge SVG paths, label boxes, and `steps[]` (edges to light, nodes to highlight, caption HTML with the first evidence `path:lines`). Sequences fold messages between the same pair into one arrow labelled with the step numbers; flows draw actors and stores as boxes with read, write or "read, write" arrows.
7. **Ownership.** A diagram used in two chapters is drawn in the first and linked from the second ("drawn in chapter 05"); `OWNER_OVERRIDE` moves one.
8. **Chapters.** Per section: number, title, question as lede, fact bullets, figures, an "Open the full diagram (archify)" list, store flow tables, store tables (`storeRefs`), and one collapsed "Files and locations (n)" box grouping evidence by fact, by diagram node and edge, by sequence participant and message, by store row and flow step.
9. **Archify link handling.** File names are deterministic: level 0 is `shamel-architecture.html`, four sequences have fixed names (`SEQ_FIXED`), everything else is `diagrams/<kind>-<id>.html` with kind `arch`, `seq` or `flow`. `fs.existsSync` decides: an existing file is a live link, a missing one prints "(not rendered yet)". The side nav lists the 5 fixed diagrams plus "More archify diagrams (39)". Split pages (`-p2`, `-p3`) are not linked from the page; only the first page of each is.
10. **Map data.** The whole `levels` block plus `MAIN0` and the level 0 hand layout (`l0.main`, `l0.all`) are inlined as JSON; all figure specs are inlined as `window.DIAGRAMS`. `</` and `<!--` are escaped.
11. **Template fill.** `%%NAV%%`, `%%SIDE%%`, `%%SECTIONS%%`, `%%MODEL%%`, `%%DIAGRAMS%%`, `%%DATE%%`, `%%NSEC%%`, `%%NDIAG%%`.
12. **Dash check** on the output (warning only), then write `index.html`.
13. **Report.** `index.html <bytes>, 19 chapters, 44 inline diagrams, <n> evidence rows`, then one line per figure: `key WxH dir cross= hits= nodes= arrows= notDrawn= unlabeled=`, then the list of pending archify files.

### 3.3 Archify rendering (manual, outside the build)

The README's command is `node <archify>/bin/archify.mjs` per spec (validate, deliver, visual-check). No script in the folder generates the archify specs from the model; their geometry (absolute `pos`/`size` per component, message `y`, 750x480 sequence canvases) shows a generator or agent wrote them, and the audit confirms "All 22 specs match the model edge for edge (same 271 edges)".

### 3.4 apply-theme.mjs (palette transplant)

Maps a source palette ("sdui-proposal": cool grey, teal accent, the same hex values as the page and as fx-tokens-1.css) onto archify's CSS variables: replaces archify's dark-first theme block with a marked light-default block, per-kind strokes and fills for 7 node kinds, the print block, the preset greens, and flips the default theme to light. Idempotent via `/* apply-theme:begin */` markers; takes file arguments. **No current output carries the marker** (0 files), so the current archify pages use archify's own default theme ("Classic", monospace), not the page palette; see screenshot 6.

---

## 4. Page anatomy

Screenshots (Playwright, chromium 1140, reduced motion), in `/tmp/claude-1000/sf-study/shots/`:

1. `index-1440-light-top.png`: header, legend, nav.
2. `index-1440-light-chapter.png`: chapter 05, number, title, question lede, fact bullets, first inline figure.
3. `index-1440-light-evidence.png`: the opened "Files and locations (207)" box of chapter 05.
4. `index-1440-dark-explore.png`: chapter 00, the React Flow map at level 0, dark.
5. `index-390-dark-chapter.png`: chapter 02 at 390 px, dark.
6. `archify-arch-engine-1440-dark.png`: `diagrams/arch-engine.html`.
7. `archify-seq-skill-run-390-light.png`: `diagrams/seq-skill-run.html` at 390 px.

Measured in the DOM at 1440 light: 20 sections (00 + 19), 44 inline figures, 19 evidence boxes with 2,024 rows, 13 tables with 207 body rows, 50 archify links, 0 pending links, 25 React Flow nodes on the opening level, page height 73,698 px, no horizontal scroll at 1440 or 390, **0 console errors** in all four combinations.

Anatomy:

- **Shell.** Two-column grid (230 px sticky nav, content up to 1240). Nav: numbered chapter list (`01`..`19` via CSS counters), then the fixed archify links and a collapsed "More archify diagrams (39)". Fixed theme pill top right ("Theme: light/dark", stored in `localStorage["sf-theme"]`, applied before paint). Dotted paper background. Serif display headings, Avenir body, SF Mono code.
- **Header.** One-paragraph system story, how to read the page, path base, model date and chapter count, "Open all evidence boxes" button, legend (service, data or files, phone or browser, outside, security check, request in flight).
- **00 Explore the system.** React Flow map over all 4 levels. Breadcrumb path, zoom, Fit all, Minimap, layout direction toggle (LR/TB), "Show context nodes", "Show all arrows (+n)" for dense levels, Full screen, Back, drag-to-resize. Hover a node or arrow for role and up to 4 evidence rows; click opens a detail panel with every arrow and an "Open next level" button. Level 0 reuses the build-time hand layout; other levels run ELK in the browser (cached per view).
- **Chapters 01..19.** Big number, title, question lede, fact bullets (plain text, no inline evidence), then each owned figure with a heading, then the archify link list with file paths, then flow tables and store tables, then the evidence box.
- **Inline diagram player.** SVG built from `window.DIAGRAMS`; zones, edges with label boxes, nodes (store boxes get a cylinder cap line, context nodes faded and dashed). Controls Back, Play/Pause, Next, Reset, step counter, an `aria-live` caption naming the code (`path:lines`) for that step. Plays when scrolled into view; a moving token marks the request in flight; reduced motion respected. Notes for undrawn arrows and unlabelled edges.
- **Evidence UI.** Per chapter, one `<details>`: groups "Facts", "Diagram: <title>" (Node, Edge rows), "Sequence: <title>" (participants, numbered messages), "Store flow", store tables. Each row lists `path:lines` in code plus the symbol. Unconfirmed items are marked.
- **Theme.** CSS variables `--paper --panel --ink --muted --rule --green --green-t --saffron --tok --magenta --blue --blue-t --code`, light and dark sets (identical values to fx-tokens-1.css under different names).

---

## 5. The archify layer

| Group | Count | Kind | Notes |
|---|---|---|---|
| `shamel-architecture` | 1 | architecture | level 0; 13 components, 2 boundaries, 14 connections (fewer than the model's 34: audit A0-3) |
| `shamel-{turn,turn-events,device-call,resume}-sequence` | 4 | sequence | fixed names, linked from the side nav |
| `diagrams/arch-<id>` | 22 | architecture | one per level 1 to 3 diagram |
| `diagrams/seq-<id>[-p2]` | 19 | sequence | 9 sequences not under a fixed name, plus split pages |
| `diagrams/flow-<id>[-p2,-p3]` | 12 | sequence (actors and stores as participants) | 8 store flows plus split pages |
| stray | 1 | | `diagrams/tmpf99eh7ra.html` (leftover temp output, no spec) |

Totals over all 58 specs: 299 components, 324 connections, 156 participants, 201 messages, 4 boundaries, 78 cards, 8 segments. Quality profile: `showcase` 51, `standard` 2. <!-- prose-gate: quoting: archify quality profile name -->

**Spec shape.** `schema_version: 1`, `diagram_type`, `meta {title, output, quality_profile, viewBox, column_fit}`, then `components[] {id, type, label, pos, size}` and `connections[] {id, from, to, label, labelAt?}` (architecture) or `participants[] {id, type, label}` and `messages[] {id, from, to, y, label, variant}` with optional `segments[]` (sequence). Every spec ends with `cards[]`: "Steps" (each step with a short `[file.ts:lines]` citation) and "Participants" or "Deeper diagrams (+)".

**Split rule.** A sequence or flow page holds at most 8 messages on a 750x480 canvas (`column_fit: "spread"`); a longer one continues in `-p2`, `-p3` with only the participants that page uses. 14 split pages.

**Evidence handling.** No spec uses archify's `sources` field (0 of 58), so archify's `--repo-root` provenance and source inspection were not used. Evidence was flattened into card text.

**Visual checks.** 57 of 58 have `*.visual-check.{json,html}` plus four PNGs (1440x900 and 2048x1320, light and dark). Missing: `arch-data-stores`. What the receipt checks per viewport: page overflow X/Y, reader and diagram width versus viewBox, minimum projected node text size (at least 6 px; arch-backend's smallest is 9.0 px, "F5 load balancer"), legend and navigation dock overlap, dock-to-stage gap (at least 10 px), viewer chrome reserve. Status on all present receipts: `containment pass`, `visualReview: pending`. **No archify check runs at 390 px**, and screenshot 7 shows the sequence cut off on the right and the toolbar clipped at 390.

What archify needs as input (from `~/.claude/skills/archify/SKILL.md` and `references/repository-authoring.md`): a candidate JSON of one of 10 types against `schemas/<type>.schema.json`, an output path, then `node bin/archify.mjs finalize <type> <candidate> <out.html> [--repo-root <root>] --quality showcase --json`. Gates: validate, deliver, strict check, real-browser check; optional `visual-check` capture. For repository diagrams it wants `sources` (at most three ranges) on primary elements only. Label length limits apply (common schema: 35 and 80 char fields, notes 140). <!-- prose-gate: quoting: archify quality profile name -->

---

## 6. The quality bar

1. **Model validation** (build.py): structure, evidence presence, evidence path existence, dash ban, primary-node cap.
2. **Layout report** (build-page.mjs): per figure size, direction, crossings, node hits, undrawn arrows, unlabelled edges; figures kept at most 860 px wide; level 0 hand-tuned to 2 crossings.
3. **Archify gates and visual check** per diagram (1440 and 2048, both themes).
4. **Manual page check** (README step 3): no console errors, the map reaches every level, light and dark, 1440 and 390.
5. **Diagram audit** (`diagram-audit.md`): a read-only audit of every diagram (map at levels 0 to 3 in four view combinations, 44 inline figures, the archify specs) in headless Chrome, with DOM-measured font sizes and label distances, screenshots of every figure, and a sample of edges re-checked against code. Findings typed Missing, Wrong, Inconsistent, Unreadable, each with evidence and a fix; 12 model corrections (C1..C12) flow back into the model.
6. **Corrections process** (`corrections.md`): every change against the earlier docs, per artifact and per chapter, in tables `Id | Today | Correction | Evidence`, citing code and `OWN n` (binding owner answers). Owner corrections and audit corrections are appended as dated sections.
7. **Old versus new** (`old-vs-new.md`): the fate of every old chapter, inline diagram and archify element (Kept, Corrected, Removed, Moved), plus "Candidates for the model" for facts true earlier but not re-checked.
8. **Writing rules**: current system only, plain words, English labels (Arabic only for real sample replies), no em or en dashes, host names only in evidence.

---

## 7. How the investigation was evidently done

From the evidence paths:

| Area | Distinct files cited | Evidence entries |
|---|---|---|
| Shamel.Engine (TypeScript engine, plugins, retrievers, eservices runner) | 94 | 839 |
| Shamel.Admin | 35 | 269 |
| Shamel.Backend (.NET) | 26 | 141 |
| E-services (the parser, tools, outputs) | 25 | 128 |
| Shamel.Frontend (portal) | 13 | 78 |
| Shamel.iOS (Swift) | 10 | 38 |
| Shamel.GPU (LiteLLM, compose, pipelines) | 5 | 33 |
| k8s-comm-apps (Helm values) | 4 | 122 |
| Shamel.Mocks | 3 | 7 |
| .fx/sysdoc research (owner questions and answers) | 2 | 97 |
| Makefile, docs/contract | 2 | 33 |

Extensions: ts 128, cs 22, md 18, mjs 16, swift 8, json 8, yaml 5, yml 3, js 4, tsx 3, other 4. Most cited: `turn-pipeline.ts` (86), `Admin/src/skills.ts` (82), engine `values.yaml` (79), `owner-answers.md` (67), `skill-run.ts` (62), `skill-turn.ts` (56), `Admin/server.ts` (50).

What it took (estimate from the above): reading about 219 files across 10 repositories, with focused reads of about 961 line ranges totalling about 17,000 source lines; a written brief; research notes per area; an owner question list and a binding answer file (97 citations, so owner answers settle topology that code cannot, such as network zones and what is deployed); then an audit pass that re-checked samples against code. It is several sessions of work by an agent with a human answering questions, followed by two review passes (corrections, diagram audit).

---

## 8. Gaps versus fx today

fx today: `skills/fx-docs/` (SKILL.md 126 lines, full-run.md 45, html-pages.md 29, docs-guide.md 38) and `references/visual/` (fx-tokens-1.css, page-template.html 134 lines, fx-map-1.js 191 lines, svg-static.md, svg-animated.md, archify-adapter.md, visual-check.md, visual-assets.md). The design (`docs/plans/2026-10-24-docs-and-adr-lanes/design.md`, Out of Scope) excludes "A JSON system model or a page build script in the system-flow style. Markdown is the source; HTML is written from it."

E2E outputs (`/tmp/claude-1000/fx-e2e-results/`, a 13-file seed app, so absolute numbers are not comparable; the ratio and shape are):

| Run | Docs + pages | Bytes | Evidence lines | Inline SVGs | Maps |
|---|---|---|---|---|---|
| claude-code-run1 | 5 md + 2 html | 65 KB | 106 | 2 | 1 |
| claude-code-retest | 4 md + 4 html | 94 KB | 149 | 10 | 0 |
| opencode-retest | 1 md + 1 html | 16 KB | 25 | 1 | 0 |

### 8.1 Depth

| Dimension | system-flow | fx today | Gap |
|---|---|---|---|
| Levels | 4 levels, 23 diagrams, parent/children links, context nodes | Map data format supports `children` but the lane never asks for levels; e2e: 1 map, 1 level | No rule to decompose to level 2 and 3 mechanisms; no context-node concept |
| Nodes and edges | 301 / 344, every one evidenced, sync/async, unconfirmed | Ad hoc per page | No node or edge inventory, no mode, no unconfirmed flag |
| Sequences | 13, 132 numbered messages, each with evidence | Mermaid in Markdown, SVG on pages | No numbered, evidenced message list |
| Store inventory | 130 rows (SQL, Redis, memory, files, client) with writer, reader, when, TTL | "Data and stores" doc | No required columns (writtenBy, readBy, when, ttl, key) |
| Store flows | 8 flows, 77 read or write steps | None | Missing concept entirely |
| Chapters | 19, driven by owner questions, each with a question lede | 4 doc kinds (overview, flows, data, operations) | Chapters do not come from the owner's questions |
| Evidence density | 1,785 entries, 219 files, 1.5 per item, symbol on every entry | One evidence line per claim | Similar per-claim rule, far lower coverage; no evidence on diagram elements |

### 8.2 Pipeline

| Step | system-flow | fx today |
|---|---|---|
| Model | JSON with schema and validator (build.py) | None by design; Markdown claims are the record, parsed by `scripts/docs-index` |
| Build | Deterministic Node script, ELK at build time, crossing reduction, width cap, label shortening, ownership, layout report | Agent writes each page by hand from the template |
| Render | 44 inline players + 58 archify pages, file names derived from ids, pending list | Static or animated SVG per page, archify optional, one per diagram |
| Check | Model validator, layout report, archify gates, manual 4-view check, diagram audit | visual-check.md (4 views, console, map levels, evidence toggle, no outside request) |
| Corrections | corrections.md, diagram-audit.md, old-vs-new.md | Stale check via `docs-index stale` (fx is stronger here: line-level drift detection) |

### 8.3 Structure

system-flow: one folder (`docs/system-flow/`) holding `index.html`, `model/`, `diagrams/`, `diagrams/src/`, `vendor/`, fixed names for 5 diagrams. fx: `docs/<area>/*.md`, pages in `docs/html/<area>/`, specs in `docs/html/<area>/src/`, shared `docs/html/_assets/`. fx has no single-page entry point and no model folder.

### 8.4 Design language

Nothing in fx detects a repo's design language. The only design-aware rule is Markdown flavour (`mkdocs.yml` with Material means admonitions, cards, tabs). Pages always use fx-tokens-1.css. system-flow did it by hand with apply-theme.mjs (a palette transplant into archify), but the current outputs do not carry it.

What a detector would have found in `/mnt/c/Users/Faisal/Downloads/Shamel.Backend`:

- `mkdocs.yml`: Material, `palette` with `scheme: default` and `scheme: slate`, `primary: teal`, `accent: teal`, fonts Inter and JetBrains Mono, `extra_css: assets/extra.css`, Mermaid superfence.
- `docs/assets/docs.css` (199 lines): a full token set for "the standalone HTML supplements" (`--bg --panel --ink --ink-soft --ink-faint --rule --accent --accent-soft --warn --warn-soft --danger --danger-soft --code-bg --shadow --mono --sans`), light, `prefers-color-scheme: dark`, and `[data-theme="dark"]`; used by 3 existing HTML pages (`architecture/overview-visual.html`, `client/visual-guide.html`, `shaheen/visual-guide.html`).
- `docs/diagrams/*.html` + `docs/diagrams/src/*.json`: four existing archify outputs with specs, a precedent for where diagrams live.

fx also has no rule for a Tailwind config (`tailwind.config.*`, `@theme` in CSS), CSS custom properties in app stylesheets, or a design-tokens JSON.

### 8.5 Other gaps

- No owner question list driving chapters, and no binding answers file as evidence (fx's interview cites `owner, <date>`, which is close).
- No layout quality numbers (crossings, width, undrawn arrows).
- No 390 px check for archify outputs (system-flow also lacks it; fx's visual-check would catch it only if it opened archify files, and it delegates them to archify's own check).
- Arabic default locale (design rule) versus system-flow's English page: the new command must choose per repo.

---

## 9. Candidate shapes for the new fx command

Working name: `/fx:fx-sysmap` (a command that dispatches a lane). Output must not break the existing fx-docs contract (Markdown stays the docs record); the system site is a separate artifact.

### Shape A: model + vendored generic build (closest to system-flow)

1. **Investigate** (subagents per area, one per repo or engine): each writes `research/<area>.md` with evidence; the controller writes `brief.md` and `owner-questions.md`, asks them one at a time with a recommended answer, records `owner-answers.md`.
2. **Model**: the agent writes `system-model.json` directly against a JSON Schema shipped in fx (`references/sysmap/system-model.schema.json`, the shape in section 2, plus `storeFlows[].section` and `levels.diagrams[].layout0` so nothing is hard-coded in the build).
3. **Validate**: `scripts/sysmap-check` (TypeScript in `src/`, built): schema, evidence path exists, line range within file length, symbol found in range (stronger than build.py), dash ban, primary cap, orphan nodes (audit M7), parent equals opener (audit M8).
4. **Build**: `scripts/sysmap-build` generalized from build-page.mjs: ELK at build time, variant search, crossing reduction, 860 px cap, rule-based short labels with model `short` overrides, ownership, store tables from whatever store kinds the model has, layout report. Level 0 is auto-laid out with groups (ELK compound nodes); a hand `layout0` block is optional.
5. **Archify specs**: the same script emits `diagrams/src/<kind>-<id>.json` from the model (with archify `sources` from evidence, and the 8-message split), then the lane runs `archify finalize` on each, at most N in parallel.
6. **Theme**: the build writes the page's token block from the detected design language and post-processes archify pages with a generalized apply-theme.
7. **Check**: fx visual-check (4 views) on `index.html`, archify browser-check per diagram plus a 390 px capture, layout report thresholds.

Output: `docs/system/` (or the repo's docs root, see detection below): `index.html`, `model/`, `research/`, `diagrams/`, `diagrams/src/`, and `_assets/` per visual-assets.md.

Costs: largest build (the build script is about 750 lines of logic to port into `src/` with tests; schema; checker). Agent cost per run is high: system-flow cites 219 files; expect 10 to 30 subagent dispatches for a repo that size. Archify rendering of about 50 diagrams is minutes of browser time.
Risks: reverses an explicit Out of Scope line, needs an ADR; two records of truth (Markdown docs and the model) can drift unless the model is declared the record for this artifact only and docs-index learns to read model evidence for the stale check; level 0 quality without hand placement will be worse than system-flow's.

### Shape B: model only for the site, Markdown docs generated from the model

Same as A for investigation, model, validation and page. In addition the build writes (or refreshes) the Markdown docs set (`overview`, one page per level 1 diagram, flows from sequences, stores from the store tables) with fx evidence lines, so `docs-index stale` keeps working unchanged and the docs lane and the site share one source.

Costs: A plus a Markdown emitter (smaller: about 200 lines). Removes the second-record problem.
Risks: generated Markdown competes with hand-written docs in repos that have them (Shamel.Backend has a MkDocs site); needs a rule: only emit into an empty area, otherwise list differences. Changes fx-docs' "Markdown is the record" principle the most.

### Shape C: no persistent model, page from evidenced Markdown + an ephemeral model

The command runs the fx-docs full run (Markdown is the record, as today) but with a required structure: a levels section per area, numbered sequence tables, store tables with fixed columns, store flow tables, and a question per chapter. A parser in `scripts/docs-index` (it already parses evidence lines) extracts an in-memory model, and `scripts/sysmap-build` renders the page and archify specs from it. Nothing JSON is committed except archify specs.

Costs: smallest conceptual change (keeps the design's Out of Scope intact for the record); parser work on structured Markdown tables (about 300 lines); the build script as in A.
Risks: Markdown tables for 344 edges and 132 messages are hard to edit and easy to break; the parser becomes a format contract; diagrams with groups and context nodes are awkward in Markdown. Most likely to lose depth over time.

### Design-language detection rules (shared by all shapes)

Checked in this order; the first hit wins and the run says which source it used:

1. An existing standalone-HTML token file in the docs tree: a CSS file under `docs/` that defines at least `--bg|--paper`, `--ink|--fg|--text` and `--accent|--primary` custom properties with a dark variant (Shamel.Backend: `docs/assets/docs.css`). Map its names onto the kit's slots; reuse its font stacks.
2. `mkdocs.yml` with `theme.name: material`: take `palette[].primary/accent` (Material colour names map to a fixed hex table), `scheme` pair for light and dark, `font.text/code`. Put the site under `docs_dir` and add it to `exclude_docs` or link it from nav (ask once).
3. Docusaurus, VitePress, Storybook or similar config with a custom CSS file: read its CSS variables.
4. A Tailwind config (`tailwind.config.{js,ts,cjs}` `theme.extend.colors`, or Tailwind v4 `@theme { --color-* }`): take the primary, neutral and danger scales.
5. A design-tokens JSON (`tokens.json`, Style Dictionary, `*.tokens.json`).
6. App CSS custom properties in `:root` (largest set wins), only if they include a dark variant.
7. Otherwise fx-tokens-1.css.

Contrast check on every mapped pair (text on paper, accent on paper, both themes) with WCAG AA; a pair that fails falls back to the fx token for that slot and is reported. The same mapped tokens drive the archify post-process (generalized apply-theme with the begin and end markers). Output location follows the same detection: inside the MkDocs `docs_dir` when present, beside existing `docs/diagrams/` when present, else `docs/system/`.

### Recommendation for the design discussion

Shape B gives system-flow depth with one record; Shape A is faster to ship but needs a drift rule; Shape C protects the current design at the cost of depth. Any shape needs an ADR that amends the 2026-10-24 Out of Scope line.
