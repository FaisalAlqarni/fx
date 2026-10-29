# /fx:fx-system-flow: an evidenced system model, and the site built from it

**Date:** 2026-10-28
**Status:** ready-for-agent
**Approved:** 2026-10-28
**Glossary:** fx has no GLOSSARY.md; terms follow PREAMBLE.md and the ADRs. Terms this design adds are defined under Implementation Decisions, "Terms".

Research: `research/system-flow-spec.md` (the study of the owner's hand-built system-flow site) and `research/fx-integration-facts.md` (the fx, docs-index and archify facts this design depends on).

## Problem Statement

The owner wants documentation of a whole system at the depth of the system-flow site built by hand for Shamel v2: a four-level drill-down map, numbered sequences, store tables and store flows, and chapters that each answer a reader's question, with evidence on every fact, edge and message. fx-docs cannot produce that today. On a seed app its runs wrote one map at one level, no store flows, no question-driven chapters and no evidence on diagram elements. archify is never wired into fx-docs, nothing reports which engines, flows, stores, jobs and integrations the docs leave out, and there is no single page to open.

The hand-built site also shows what a person cannot keep up by hand. Its validator checked that evidence paths exist, but not line ranges or symbols. Its archify diagrams never received the page palette, never cited sources and were never checked at 390 px, where its sequences overflow. Its chapter mapping for store flows was hard-coded in the build script. After the code moves, nothing tells the reader which facts are stale.

## Solution

The owner types `/fx:fx-system-flow` in a repo. The command maps the repo and any repos the owner names, proposes chapters, levels and a diagram count with an estimate of tokens and wall-clock time, and waits. After the owner approves or trims the plan, subagents investigate each area and write model fragments. The fx CLI merges them into one system model, checks every piece of evidence against the code, and builds the site: an `index.html` with the map, inline animated figures, chapters and evidence boxes; one deep diagram per model diagram, sequence and store flow (archify when installed, fx SVG otherwise); and Markdown docs with evidence lines, so the existing docs index and stale check keep working. The command then asks the owner the questions the code could not answer, one at a time or all at once on the recommended answers, and rebuilds.

Afterwards fx-docs keeps the site current. When fx-implement offers the docs step after a build and the owner says yes, fx-docs asks the CLI which model entries cite the paths the branch changed, re-verifies only those, rebuilds the affected Markdown, figures and diagrams, and lists every other stale entry without rewriting it. A full rebuild happens only when the owner asks for one.

## Approaches

1. **Model as the record, Markdown generated from it (chosen, owner, 2026-10-28).** One record, system-flow depth, and the docs index keeps reading evidence lines. It costs a new ADR that reverses the "no JSON model" decision of ADR 0062.
2. **Model only for the site, beside hand-written Markdown.** Faster to ship, but the model and the docs are two records that drift apart.
3. **Structured Markdown as the record, parsed into a model in memory.** Keeps ADR 0062 intact, but 344 edges and 132 messages in Markdown tables are hard to edit and easy to break, and the parser becomes a format contract.

## User Stories

1. As the owner, I want to type `/fx:fx-system-flow` in a repo and get a plan before any investigation runs, so that I decide what the full run costs.
2. As the owner, I want the plan to list areas, proposed chapters with their reader's question, levels per area, the diagram count, and an estimate of tokens and wall-clock time, so that I can approve it or trim it.
3. As the owner, I want to name other repos as part of the system, so that one site covers a system that spans several repositories.
4. As the owner, I want every node, edge, participant, message, store row, store flow step, catalogue entry and fact to cite a path, a line range and a symbol, so that I can open the code behind any claim.
5. As the owner, I want the build to fail when an evidence path is missing, a line range runs past the end of the file, or the symbol is not in the cited lines, so that no unchecked claim reaches the site.
6. As a new engineer, I want a map that drills down four levels from the whole system to a mechanism, with faded context nodes for the neighbours that live elsewhere, so that I can see where a part sits.
7. As a new engineer, I want numbered sequences in which every message cites its code, split into pages of at most 8 messages, so that I can follow a request step by step.
8. As a new engineer, I want store tables (SQL, cache, memory, files, client) and store flows that show who reads and writes what and when, so that I know where state lives.
9. As a new engineer, I want each chapter to open with the question it answers, so that I can find the chapter for my question.
10. As a new engineer, I want a component catalogue of the event streams and topics, API gateways, queues, schedulers, caches, external integrations and other backend components the repo has, so that nothing outside the main flows is invisible.
11. As a new engineer, I want a "Rules in force" chapter summarising the ADR decisions that are not superseded, so that I know which decisions still bind the code.
12. As the owner, I want a coverage report that lists every engine, flow, store, job and integration found in the code with the chapter that covers it or "not covered", so that I can see what the site leaves out.
13. As the owner, I want the site to use my repo's design language when it has one and fx's page design otherwise, with both themes passing a contrast check, so that the site looks like the rest of my docs.
14. As the owner, I want each deep diagram drawn with archify when it is installed and with fx SVG otherwise, with the pick and the reason stated in one line, so that I know what I am looking at.
15. As the owner, I want every page and diagram checked at 1440 and 390 px in light and dark, archify output included, so that the site reads on a phone.
16. As the owner, I want every inline figure to have at most 1 crossing and fit 860 px, with a layout report per figure, so that the figures read without tracing lines.
17. As the owner, I want the full run to draft everything first and then ask me only what the code cannot answer, each question with a recommended answer, one at a time or all recommended at once, so that my time goes to decisions.
18. As the owner, I want every change to an existing fact recorded in a corrections log, so that I can see what changed and why.
19. As the owner, I want fx-docs, after an fx-implement build, to update only the model entries whose evidence the branch touched and list the rest as stale, so that a branch's docs step stays small.
20. As the owner, I want the generated Markdown in my repo's docs structure, with section index pages, so that my existing docs site shows it.
21. As the owner, I want a short README beside the site that says how to rebuild it, so that anyone with fx can regenerate it.
22. As the owner, I want the CLI to tell me which entries are stale since they were last verified, per repo, so that I know what to recheck.

## Implementation Decisions

### Terms

- **System model:** the JSON record of one system, in system-flow's shape plus the additions below. It is the source of truth for the site and for its Markdown.
- **Fragment:** one JSON file of the model, written by one area's subagent or by the controller. The model is the merge of all fragments.
- **Evidence root:** a repository the model cites. The repo the command runs in is the host root; the owner may name more.
- **Item:** anything that carries evidence: a node, edge, group, participant, message, store row, store flow step, catalogue entry, inventory entry, rule or fact bullet.
- **Site:** the generated output: `index.html`, the deep diagrams, the Markdown and the README.

### The pieces

| Unit | What it does | How it is used | Depends on |
|---|---|---|---|
| `fx-system-flow` lane | Runs the planning pass, dispatches area subagents, runs the interview, runs the visual check, reports | The owner types `/fx:fx-system-flow` | The CLI, the runtime's subagents and browser |
| `system-flow` CLI | Every deterministic step: detect, estimate, check, build, query, stale, verify | `node <plugin>/scripts/system-flow <subcommand>` | The units below |
| Model and schema | Types, the JSON Schema file, the schema-subset validator, cross-reference checks | Called by `check` and `build` | Nothing |
| Merge | Reads fragments, merges them into one model, rejects duplicate ids | Called by `check` and `build` | Model |
| Evidence verifier | Checks path, range and symbol for every evidence entry in every root | Called by `check` and `build` | git |
| Layout | ELK layout per figure under the crossing and width limits, plus the layout report | Called by `build` | Vendored elkjs |
| Renderers | Page, Markdown, archify spec, SVG fallback, README | Called by `build` | Layout, theme, fx kit files |
| Theme detector | Finds the repo's design language and maps it onto fx tokens with a contrast check | Called by `detect` and `build` | Nothing |
| Stale and query | Which items cite given paths; which items changed since they were verified | `query`, `stale`, `verify` | doc-index's path check |
| Coverage | Inventory against model, written as a report | Called by `build` | Model |
| Estimate | Tokens and wall-clock from a plan | `estimate` | Nothing |

### The lane

`/fx:fx-system-flow` is a user-invoked lane with `disable-model-invocation: true`, the ninth in the user-invoked list, with a hand-written `SKILL.md` like `fx-audit`. Its description says it investigates a whole system and builds an evidenced site. The `SKILL.md` stays under 20,000 bytes by keeping the steps, stop points and rules inline and moving whole sections into files beside it: the planning pass, the area subagent brief, the fragment authoring guide (with the schema), the interview, and the check and report. It never commits; the owner runs git.

Arguments: `[--repo <path>]...` for extra evidence roots, `[--rebuild]` for a full rebuild of an existing site, `[cheap|fast|detailed]` for the archify preference of the existing adapter (`cheap` renders every deep diagram as SVG).

Steps:

1. **Detect.** `system-flow detect` reads the docs config, the design language and the evidence roots, prints what it found and the output location, and writes the pick into `.fx.json` under `system_flow`. Nothing is asked here.
2. **Planning pass.** The controller reads the top-level layout, manifests, entry points and existing docs of every root (semble first), splits the system into areas, and writes the plan: areas with their roots and file counts, proposed chapters each with its reader's question, the level-1 to level-3 diagrams per area, the sequence and store flow candidates, the catalogue kinds found, the inventory for the coverage report, and the output paths. `system-flow estimate` adds tokens and wall-clock. The controller shows the plan and stops until the owner approves or trims it. In a MkDocs repo the same message asks once whether to add the site to `nav` and the model and README to `exclude_docs`.
3. **Investigate.** One subagent per area, at most 4 at a time, each with the area brief, the schema guide and its slice of the plan. Each writes its fragment and runs `system-flow check --fragment <file>` until it passes, then returns its open questions, each with a recommended answer. The controller writes the level-0 fragment, the meta fragment, the chapters and the Rules in force fragment from the current ADRs.
4. **Build the draft.** `system-flow build`. A failed check returns to the subagent or fragment that owns the item (error handling below).
5. **Interview.** The controller merges the open questions, opens with the count and the choice ("<n> questions. Answer one at a time, skip, or take the recommended answer for every question."), and asks one at a time. An answer, a taken recommendation included, becomes evidence `owner, <date>` on the items it settles and clears their `unconfirmed` flag. On a skip the items stay `unconfirmed` and the questions stay listed on the site.
6. **Rebuild and check.** `system-flow build`, then the visual check of every page and diagram, then the report: counts, layout report summary, coverage, stale entries, open questions, and tokens and time against the estimate.

A rerun in a repo that already has a model offers three choices: refresh the stale entries, cover the uncovered inventory, or (only with `--rebuild` or on request) a full rebuild.

### The CLI

One TypeScript CLI beside `docs-index`, built by `scripts/build` into an extensionless `scripts/system-flow`, run from the plugin, never copied into a repo. Every subcommand takes `--root <host root>` (default: the git top level), prints JSON on stdout and problems on stderr as `<file>:<pointer>: <message>` (a problem with no file is `system-flow: <subcommand>: <message>`), and exits 0 on success, 1 on a failed check, 2 on usage.

| Subcommand | What it does |
|---|---|
| `detect [--write]` | Docs config, output location, design language pick, evidence roots. `--write` saves the pick in `.fx.json`. |
| `estimate <plan file>` | Tokens and wall-clock for the plan, per area and in total. The plan file is `plan.json`; after the run the report sets planned depth against built depth. |
| `check [--fragment <file>]` | Merge, schema, cross-references, evidence verification, dash ban, caps, ADR status of every rule. With `--fragment`, one fragment plus the ids it references. |
| `build [--only <item ids or paths>] [--archify <dir>]` | `check`, then layout, page, Markdown, deep diagrams, theme, README, coverage, layout report. `--only` rebuilds the Markdown docs, figures and deep diagrams that contain the given items; the page is always rewritten whole. |
| `query <path>... \| --diff <base>` | Items whose evidence cites the given paths, or the paths changed between `<base>` and HEAD in each root. |
| `stale` | Every item whose cited lines changed since the commit it was verified at, per root, with the reason (`shifted`, `changed`, `deleted`, `unverified`). |
| `verify <item id>... \| --all` | Records the current HEAD of each cited root as the item's verified commit, after the agent has re-read it. |

The CLI runs archify itself when `--archify <dir>` names an installed archify (the lane finds it and passes it): it writes each spec, then runs `node <dir>/bin/archify.mjs finalize <type> <spec> <out> --repo-root <root> --quality showcase --receipt <site>/diagrams/<name>.receipt.json --json`, one at a time (archify's delivery lock rejects concurrent calls in one folder), and reports the receipt path without parsing it. Without `--archify` it renders every deep diagram as SVG. <!-- prose-gate: quoting: archify quality profile name -->

### The model

Top level, `schemaVersion: 1`:

| Key | Shape |
|---|---|
| `meta` | `title`, `date`, `purpose`, `roots[]` (`id`, `label`, `remote`), `conventions[]` |
| `levels` | `root`, `diagrams[]`: `id`, `level` (0 to 3), `parent`, `title`, `summary`, `groups[]`, `nodes[]`, `edges[]` |
| `sequences[]` | `id`, `title`, `chapter`, `participants[]`, `messages[]` (`n`, `from`, `to`, `label`, `mode`, `evidence[]`, `note`), `notes[]` |
| `stores` | `sql[]`, `cache[]`, `memory[]`, `files[]`, `client[]`, each row with system-flow's columns (`cache` replaces `redis`) |
| `storeFlows[]` | `id`, `trigger`, `chapter`, `steps[]` (`n`, `actor`, `op`, `store`, `key`, `when`, `evidence[]`) |
| `catalogue[]` | `id`, `kind` (`stream`, `gateway`, `queue`, `scheduler`, `cache`, `integration`, `component`), `name`, `role`, `owner`, `connects[]`, `evidence[]` |
| `rules[]` | `id`, `text`, `adr` (root and path), `decision` (number or lead phrase), `evidence[]` |
| `inventory[]` | `id`, `kind` (`engine`, `flow`, `store`, `job`, `integration`), `name`, `evidence[]` |
| `sections[]` | `id`, `title`, `question` (required), `bullets[]` (`text`, `evidence[]`), `diagrams[]`, `sequences[]`, `storeFlows[]`, `storeRefs[]`, `catalogueRefs[]`, `covers[]` (inventory ids) |
| `questions[]` | `id`, `text`, `recommended`, `answer`, `date`, `items[]` |
| `corrections[]` | `id`, `date`, `item`, `before`, `after`, `reason` (`owner`, `stale`, `audit`), `evidence[]` |

Nodes: `id`, `label`, `kind`, `role`, `children`, `primary` (false draws a context node), `evidence[]`, `unconfirmed`. Edges: `from`, `to`, `label`, `short` (at most 26 characters), `mode` (`sync` or `async`), `evidence[]`, `unconfirmed`. Every item also carries `verified`: a map from root id to the 40-character commit it was last verified at, written only by `verify` and `build`; `build` fills a root's value only when the item has none, so it never replaces one.

Evidence entry:

```json
{ "root": "guide", "path": "app/x.rb", "lines": "63,67-245", "symbol": "X#call" }
{ "owner": "2026-10-28", "question": "q7" }
```

`root` defaults to the host root. A file entry needs `lines` and `symbol`. A path ending in `/` names a folder, needs neither, and is allowed only on catalogue and inventory entries. Paths with `*` or `{` are rejected.

Additions over system-flow and why: `chapter` on store flows and sequences (system-flow hard-coded it in the build), `catalogue`, `rules`, `inventory`, `questions`, `corrections`, `verified`, `root` on evidence, and a required `question` on every section.

**Versioning.** The schema is a JSON Schema file at `references/system-flow/system-model.schema.json`, and the CLI validates against it with its own subset validator (type, required, properties, additionalProperties false, items, enum, pattern, maxLength, `$ref`), so fx gains no runtime dependency and the schema has one copy. `check` rejects a model whose `schemaVersion` is higher than the CLI knows. A breaking change bumps the number and ships a migration in the CLI; version 1 has none.

**Caps checked by `check`:** at most 12 primary nodes per diagram; every node and edge has evidence unless `unconfirmed`; a node with `children` names an existing diagram whose `parent` is that node's diagram; no orphan node; every edge, message and flow step names existing ids; every section reference resolves; every chapter named by a sequence or flow exists; no em or en dash anywhere. Arabic script in a label is a warning naming the item, so a real product string passes and anything else gets fixed.

### Fragments and merge

Fragments live in `<site>/model/fragments/`: `meta.json`, `level0.json`, `chapters.json`, `rules.json`, `inventory.json`, `questions.json`, `corrections.json`, and one `<area>.json` per area. Each holds any subset of the top-level keys. Merge concatenates arrays and unions `stores` tables; ids are unique per kind (node `turn` and sequence `turn` may coexist), and two fragments defining the same id of one kind is an error naming both files. Items are named `<kind>:<id>` in every argument, output, question and correction. The fragments are the record and are committed. `build` writes the merged result to `<site>/model/system-model.json`, marked generated, for readers and other tools; nothing reads it back.

### Evidence verifier

For every evidence entry with a path, in every root:

1. The root resolves: the host root, or the path `.fx.json` gives for that root id (relative paths are resolved from the host root). A missing root is one error naming the root, not one per entry.
2. In a git root, the file is read from HEAD (`git show HEAD:<path>`), the bytes archify will also check. A cited file with uncommitted changes is an error for `build` and a warning for `check`. A root that is not a git repo is read from the working tree and reported as `no git: stale and archify sources unavailable`.
3. The file exists, or for a folder entry the folder exists.
4. Every range in `lines` is inside the file: start at least 1, end at most the line count, start not after end.
5. The symbol appears in the union of the cited lines. The whole symbol is tried first; failing that, its last segment after `#`, `.`, `::` or `/` (so `Link#expired?` matches a line holding `expired?`). Case-sensitive.

Any miss fails `check` and `build` with the item id, the evidence entry and which of the five tests failed. Owner evidence is not checked against code, the same as docs-index.

### Layout

Layout runs in Node at build time with the vendored elkjs, loaded from the plugin by path. For every inline figure (level diagrams, sequences drawn as boxes with folded arrows, store flows), the CLI follows system-flow's search: layered algorithm, orthogonal routing, labels beside their arrow, variants over node widths (188, 164, 144), direction (right, down) and aspect, scored on crossings, node hits, overwidth and overheight, preferring any variant at most 860 px wide, then layer wrapping and narrower nodes. While a figure has more than 1 crossing, it drops the arrow that crosses most others, never the last arrow of a box, and lists dropped arrows under the figure and in the step captions; the map still shows them. Level 0 is laid out the same way with groups as ELK compound nodes; system-flow's hand grid is not reproduced, and a model may give level 0 optional `layout` hints (grid cells per node) when auto layout is not good enough.

Labels come from `short` when set, else the rule-based cut at 26 characters on clause, then word, boundaries.

The layout report, written to `<site>/model/layout-report.json` and summarised on stdout, has one line per figure: key, width by height, direction, crossings, node hits, nodes, arrows, arrows not drawn, unlabelled edges.

### Renderers

**Page.** `index.html` is written from fx's page template, which gains two optional slots that existing pages leave empty: `NAV` (the numbered chapter list and the deep diagram list) and `DIAGRAMS` (the inline figure specs). The page loads only files from `<site>/assets/`: the kit and vendor files of `visual-assets.md`, plus `theme.css`. Contents in order: header with the system story, how to read the page, roots and model date; legend; chapter 00, the React Flow map over all levels with context nodes, groups, sync and async arrows, a "Show context nodes" toggle and "Show all arrows"; then one chapter per section: number, title, question as the lede, fact bullets, owned figures, deep diagram links, store flow tables, store tables, catalogue tables, and one collapsed "Files and locations (n)" evidence box grouped by fact, node, edge, participant, message, store row and flow step. Then fixed chapters: Components (the catalogue, one table per kind the repo has, left out when empty), Rules in force, Coverage, Open questions (left out when empty), Corrections. A figure used by two chapters is drawn in the first and linked from the second. Every string from a repository is HTML-escaped, and `<` in inline JSON is written as the six characters `<`, so a label `<script>alert(1)</script>` reaches the inline JSON as `<script>alert(1)</script>` and can never close the script element.

The inline player is a new kit file, `fx-flow-1.js` (TypeScript, built as a browser script): SVG from the figure spec, Back, Play or Pause, Next, Reset, a step counter and an `aria-live` caption naming the code for each step, a moving token, play when scrolled into view, reduced motion respected. The map moves to `fx-map-2.js` under the renaming rule, adding context nodes, groups and arrow mode; `fx-map-1.js` stays for existing pages.

**Markdown.** One doc per section, in the section folder the plan chose (below), plus `components.md`, `stores.md`, `rules-in-force.md` and `coverage.md` in the Markdown root, and one `index.md` per section folder listing its chapters and linking the site. Prose and table text escape `&`, `<` and `>`, so a repository string never becomes HTML in Markdown. A doc holds the question as its lead sentence, each fact with its evidence line, a Mermaid sequence diagram and a numbered message table for each sequence, a step table for each store flow, and a link to the figure in the site. Evidence lines use docs-index's format; `"63,67-245"` becomes two items, and a path in another root is written `@<root id>/<path>`. Each doc ends with `<!-- fx-system-flow generated: edit the model, then rebuild -->` and the `fx-docs verified:` marker set to the oldest host-root `verified` commit among its items, so docs-index's stale check over-reports at worst. The renderer never overwrites a file that lacks the generated marker; it reports the collision, and the plan picks another name.

**Deep diagrams.** One per level diagram, sequence and store flow, in `<site>/diagrams/`, named `arch-<id>.html`, `seq-<id>.html` and `flow-<id>.html`, with continuation pages `-p2`, `-p3` when a sequence or flow has more than 8 messages. With archify: the spec goes to `<site>/diagrams/src/<name>.json` (architecture for levels, sequence for sequences and flows), with `sources` on every primary element filled from its evidence (at most 3 ranges, from the diagram's owning root: the root most of its evidence cites), `meta.repository` set to that root's remote and HEAD with `link_mode: "local-only"`, and evidence from other roots moved into the steps card. Without archify, or when archify fails for a diagram: an fx page with a static SVG for a level diagram, an animated SVG for a sequence or flow. The build prints one line per diagram with the pick and the reason, for example `seq-turn: archify sequence, 14 messages in 2 pages` or `arch-engine: static SVG, archify not installed`.

**Theme.** `theme.css` sets fx's token names (`--paper --panel --ink --muted --rule --code --accent --accent-tint --warn --alert --violet --info --info-tint`) for light and dark from the detected source and loads after `fx-tokens-1.css`, so the kit file is never edited. Each archify output gets the same mapping, onto archify's own variable names (`--text`, `--arrow`, `--lane-stroke` and the rest), as a block between `/* fx-theme:begin */` and `/* fx-theme:end */` markers, replaced on every build, which generalises system-flow's `apply-theme.mjs`.

**README.** `<site>/README.md` in a few lines: what each folder holds, that `index.html`, `diagrams/`, `system-model.json` and the Markdown are generated, that the fragments are the record, and the two commands that rebuild (`system-flow check`, `system-flow build`) with the plugin path.

### Output location

`detect` decides, in order:

1. `mkdocs.yml`: the site goes in `<docs_dir>/system-flow/` and the Markdown in `<docs_dir>/system/` (plan deviation, recorded in ADR 0066: never in an existing section folder, since Out of Scope rules out generating into a folder that holds hand-written docs). When `<docs_dir>/system/` already holds a hand-written `.md` file (one without the generated marker), `detect` picks `<docs_dir>/system-generated/`, and when that also holds one it reports both folders and exits 1 so the owner names a folder in `.fx.json`. The nav and `exclude_docs` changes (the site's `index.html` and `system/index.md` in nav; `system-flow/README.md`, `system-flow/model/` and `system-flow/diagrams/src/` excluded) are written only on the owner's yes in the planning message.
2. Another docs generator config (Docusaurus, VitePress and similar): its docs folder, the same way, without config edits.
3. Otherwise `docs/system-flow/` for the site and `docs/system/` for the Markdown.

The site layout follows system-flow: `index.html`, `model/` (fragments, `system-model.json`, `layout-report.json`, `coverage.json`), `diagrams/`, `diagrams/src/`, `assets/`, `README.md`. `visual-assets.md` gains a row for this output root with path `assets/` from the page and `../assets/` from a diagram page. The pick is saved in `.fx.json` as `system_flow.output`.

### Theme detector

Silent, first hit wins, the source named in the report:

1. A CSS file under the docs tree that defines a background, a text and an accent custom property with a dark variant (Shamel.Backend's `docs/assets/docs.css`).
2. `mkdocs.yml` Material `palette` (Material colour names map through a fixed table), the scheme pair for light and dark, and `font.text` and `font.code`.
3. A Tailwind config (`theme.extend.colors`, or `@theme` with `--color-*` in v4).
4. App CSS custom properties in `:root`, the largest set, only with a dark variant.
5. Brand files: a design tokens JSON, a `brand.css` or brand folder with colour tokens.
6. Otherwise fx's tokens.

Source names map onto fx's slots by role (background to `--paper`, surface to `--panel`, text to `--ink`, accent or primary to `--accent`, and so on). Every text and border pair is checked in both themes, text at WCAG AA 4.5:1 and borders at 3:1; a pair that fails falls back to fx's value for that slot and is listed. The pick is saved in `.fx.json` as `system_flow.theme` (`source`, `kind`), and the values are re-read on every build, so a change to the repo's CSS reaches the site.

`.fx.json` gains one key. `diagrams` holds the rendering choices: `build` writes `prefer`, `pageLimits` and `svg` from its flags on success and reads them on every later build; `archify` is a folder the owner sets by hand. archify is found from `--archify`, else (unless `prefer` is `cheap`) `$CLAUDE_CONFIG_DIR/skills/archify`, `$HOME/.claude/skills/archify`, then `diagrams.archify`.

```json
"system_flow": {
  "output": { "site": "docs/system-flow", "markdown": "docs/system" },
  "theme": { "source": "docs/assets/docs.css", "kind": "docs-css" },
  "roots": { "guide": "../advantage-guide" },
  "diagrams": { "prefer": "fast", "pageLimits": { "seq-turn": 5 }, "svg": ["arch-engine"], "archify": "tools/archify" }
}
```

### Rules in force

The controller lists every ADR in every root's ADR folder whose status does not open with Superseded, Deprecated or Ignored, the rule `docs-index` already applies and the one fx-adr writes. One rule per numbered decision, summarised in one sentence, citing the ADR and the decision number (or its lead phrase for an unnumbered ADR) and the ADR's own evidence lines when it has them. `check` fails a rule whose ADR is superseded, so a later supersede shows up on the next build.

### Coverage report

The controller writes the inventory during the planning pass: every engine, flow, store, job and integration it finds in the code, each with evidence. `build` marks an inventory entry covered when an item in a chapter cites an overlapping range of the same file, or the chapter lists it in `covers`; it writes `coverage.json`, the Coverage chapter and `coverage.md`, each entry with its chapter or "not covered". The report counts how many of each kind are covered.

### Stale, query and the fx-docs branch step

`stale` and `query` reuse docs-index's line-level path check, exported from `doc-index.ts` and called once per root with that root's git directory. `stale` compares each item's `verified` commit for each root to that root's HEAD. docs-index learns one thing: an evidence path starting with `@` is skipped as `other-root`, since the CLI's `stale` covers it.

fx-docs branch mode, when the repo has a model:

1. `system-flow query --diff <merge-base>` lists the items citing changed paths.
2. fx-docs re-reads each of them against the code at HEAD, edits the fragments, adds a corrections entry for every changed or removed fact, and runs `verify` on each re-read item.
3. `system-flow build --only <those items>` rebuilds the Markdown, figures and deep diagrams that hold them.
4. `system-flow stale` lists every other recheck item; they are listed, not rewritten.
5. Inventory entries that the branch added and no chapter covers are listed as uncovered with a pointer to `/fx:fx-system-flow`.

The report line becomes `Docs: <n> model items updated, <n> listed stale, <n> uncovered, <n> diagrams rebuilt`. A repo without a model keeps today's branch mode unchanged.

### Corrections log

`check` compares the fragments with their committed version at HEAD. A fact, label, store row or flow step whose text changed or that was removed, with no new `corrections` entry naming its id, fails the check. The log renders as the Corrections chapter.

### What it replaces

- **fx-docs section 6, the full run, and `full-run.md`:** replaced. On "document the system" fx-docs says in one line that the full run is `/fx:fx-system-flow` and that the owner types it. A lane cannot invoke a user-invoked command (ADR 0055).
- **fx-docs section 7 and `html-pages.md`:** replaced by the site in a repo with a model; a repo without one keeps the HTML pages. Hand-written per-area pages in `docs/html/<area>/` are no longer written; existing ones are left as they are.
- **fx-docs section 4, branch mode:** gains the model path above; the Markdown path stays for repos without a model.
- **fx-implement's first-run offer:** names `/fx:fx-system-flow` for the owner to type. The `docs_first_run: "declined"` key keeps its meaning.
- **`archify-adapter.md`:** gains sources from evidence, the single-root rule, the theme block, and the 390 check; the per-diagram pick line stays.
- **`visual-check.md`:** archify outputs are opened at 1440 and 390, light and dark, like every page; archify's own check still runs as well.
- **`visual-assets.md`:** new rows for `fx-flow-1.js` and `fx-map-2.js`, and the site output root.
- **`page-template.html`:** two optional slots, `NAV` and `DIAGRAMS`.
- **Kept as they are:** `svg-static.md` and `svg-animated.md` (fx-architecture and fx-audit reports still use them), `fx-map-1.js`, `fx-tokens-1.css`.

### The ADR

ADR 0066, "A system model is the record for the system-flow site; its Markdown is generated", written through fx-adr:

- Supersedes 0062 decisions 2 and 4. Decision 2 ("the Markdown is the source of truth, with no separate JSON model") becomes: in a repo with a system model, the model's fragments are the record and the Markdown under the site's sections is generated from them; hand-written docs elsewhere keep evidence lines as the record. Decision 4's first full-run offer now names `/fx:fx-system-flow`. Decisions 1, 3 and 5 are restated under "Still in force".
- Records the CLI as the one place for deterministic steps, evidence verification on path, range and symbol, the `@<root>` evidence form, and `/fx:fx-system-flow` as the ninth user-invoked lane.
- Notes that it reverses the Out of Scope line of `docs/plans/2026-10-24-docs-and-adr-lanes/design.md` ("A JSON system model or a page build script in the system-flow style").
- 0062's status becomes `Superseded by 0066 (replaced: decisions 2, 4; the rest carried forward)`, and the index gets the row.

## Error handling

| Failure | What happens |
|---|---|
| An evidence check fails | `check` and `build` exit 1 and write nothing, listing each item, entry and failed test. During the full run the controller sends the list to the subagent that owns the fragment, at most 2 rounds; an item still failing is marked `unconfirmed` with its evidence removed, gets a question, and is reported. During branch mode fx-docs fixes the item from the code; the code wins. |
| A cited file has uncommitted changes | `build` stops and names the files; the owner commits or stashes. |
| An evidence root is missing | One error naming the root and the `.fx.json` path; nothing builds. |
| archify is not installed | Every deep diagram is SVG, said once in the report and once per diagram line. |
| archify fails for one diagram | The CLI runs one fixed retry on its own: a sequence or store flow is rendered again at 5 messages per page. Still failing, or an architecture diagram (which has no page limit to lower), that diagram falls back to SVG and the receipt path is reported. No agent edits the spec between attempts. |
| An archify page fails the 390 check | One retry with a sequence page limit of 5 messages; still failing, SVG for that diagram, reported. |
| A figure cannot meet 1 crossing and 860 px after variants and arrow dropping | `build` exits 1 naming the figure and its best layout line. The controller splits the diagram (moves a group of nodes to a child level) or adds level-0 layout hints, at most 2 rounds, then reports the figure to the owner with its numbers. `build` stays stopped until the owner decides, through a layout hint or a split; no flag holds one figure back. |
| A huge repo | The planning pass shows the estimate and the owner trims areas, levels or chapters before anything runs. An area over 400 files is split into sub-areas, one subagent each. The page is one file; its size is reported, and splitting it is out of scope until a proof run shows the need. |
| A Markdown target without the generated marker | That file is left alone and listed; the plan renames the doc. |
| A theme pair fails contrast | fx's value for that slot, listed in the report. |
| A rule cites a superseded ADR | `check` fails; the rule is rewritten from the ADR that superseded it. |
| No browser | `Visual check: not run: no browser`, naming every page and diagram, as `visual-check.md` already says. |

## Testing Decisions

**Seams, highest first. Please confirm them.**

1. **The `system-flow` CLI, run as a process.** Nearly every test lives here: a fixture repo built with `scripts/make-git-fixture` (one host root and one second root), a fragment set, a subcommand, then assertions on exit code, stdout JSON and the files written. This covers schema and caps, merge conflicts, each of the five evidence tests, the uncommitted file rule, the `@` form, layout limits on a fixture whose figure needs an arrow dropped and one that cannot fit, the layout report, Markdown output parsed back by docs-index's own parser, archify spec content (sources from evidence, single root, 8-message split) without running archify, the SVG fallback, theme detection on fixture CSS, mkdocs and Tailwind files with a failing contrast pair, coverage, Rules in force against a superseded ADR, the corrections check, `query --diff`, `stale` after a commit that shifts and one that changes cited lines, `verify`, `build --only`, and `estimate`.
2. **The docs-index CLI**, for the one change there: a path starting with `@` is skipped as `other-root`.
3. **Gate tests on text,** in the existing style: the lane's `SKILL.md` under 20,000 bytes, `disable-model-invocation: true` and its listing among user-invoked lanes, the `visual-assets.md` checksums for the new kit files, every pointer resolving, and the fx-docs and fx-implement text naming `/fx:fx-system-flow`.

The browser kit scripts (`fx-flow-1.js`, `fx-map-2.js`) are checked by the visual check in the proof runs, not by unit tests, as `fx-map-1.js` is today. A good test asserts what a user of the CLI sees, never an internal function.

Prior art: `src/scripts/plan-check.test.ts` (a CLI against a temp git repo), `src/lib/doc-index.test.ts`, `src/tests/gates/docs-lanes.test.ts`, `src/tests/gates/visual-kit.test.ts`, `src/tests/gates/user-invoked.test.ts`, `src/tests/gates/skill-size.test.ts`.

### Proof before merge

Run on scratch copies only, under the session scratchpad through `scripts/scratch-env`; never on the real repos, never under `/home/faisal` or `/mnt`.

**(a) Shamel.Backend.** Copy `/mnt/c/Users/Faisal/Downloads/Shamel.Backend` into the scratchpad and make it a git repo with one commit (the original is not one). Run `/fx:fx-system-flow` on it with archify installed. Pass when:

- `detect` picks `docs/assets/docs.css`, names `mkdocs.yml` as the docs config, and puts the site under `docs/system-flow/`.
- `check` passes on the final model, with every evidence entry verified on path, range and symbol.
- Against system-flow's 141 evidence entries in Shamel.Backend: the share of those items (nodes, edges, participants, messages, store rows, flow steps, facts citing a Shamel.Backend file) that the new model also states with overlapping evidence is reported, each one it misses is listed with a reason, and every item the new model adds is listed. The owner reads the comparison and decides whether the depth matches; there is no pass number.
- The visual check passes for `index.html` and every deep diagram at 1440 and 390, light and dark, archify outputs included.
- Rules in force lists the current decisions of `docs/adr/`.

**(b) Advantage, four roots.** Scratch copies (git clones) of `/development/advantage-backend` as the host, plus `/development/advantage-guide`, `/development/sdks/android` and `/development/test-apps/android/advantage-store`. Run the full command. Pass when `check` and the visual check pass, the coverage report lists every engine, and evidence across all four roots resolves.

**For both runs,** record the estimate and the actual: tokens and wall-clock (from `scripts/build-cost` on the controller transcript), subagent dispatches, files cited, evidence entries, items by kind, diagrams by renderer, layout report totals, and archify failures. Run (a) calibrates the estimate's constants; run (b) is estimated with them, and its actual tokens and wall-clock must each land within 50% of the estimate. The numbers go in `docs/plans/2026-10-28-system-flow/results.md`.

## Global Constraints

- No em or en dashes in any file, label, commit message or chat output.
- Labels and prose in English; Arabic only for real product strings and sample replies, wrapped as `<span lang="ar" dir="rtl">` on pages.
- Pages default to `lang="en" dir="ltr"` and use logical properties.
- Pages load only files under the site's `assets/`; no CDN, no network request.
- fx gains no runtime dependency; elkjs is loaded from `references/vendor/`.
- Edit `src/**/*.ts`, then run `scripts/build`; never hand-edit generated JavaScript.
- Every `skills/*/SKILL.md` stays under 20,000 bytes; references one level deep.
- An inline figure has at most 1 crossing and is at most 860 px wide.
- A sequence or store flow deep diagram page holds at most 8 messages.
- Tests run with TMPDIR in the session scratchpad through `scripts/scratch-env`; nothing is written or deleted under the owner's home or `/mnt`.
- Proof runs use scratch copies only, never the real repos.
- Never push, merge, open a PR or move the base branch; no attribution trailers.
- A kit file's byte change renames it (`fx-map-2.js`, `fx-flow-1.js`).
- Every string from a repository is HTML-escaped before it enters a page.

## Out of Scope

- Hosting, publishing or deploying the site, and a CI job for `check` or `stale` (ADR 0012).
- Owning a browser driver; the visual check uses the runtime's browser or reports none.
- A hand-placed level 0 in the style of system-flow's grid and routes; optional layout hints are the limit.
- Splitting the page into several HTML files.
- Migrating system-flow's existing Shamel model into the new schema.
- Diagram audits in the style of `diagram-audit.md` and an old-versus-new report; the corrections log is the record of change.
- Translating the site into Arabic.
- Generating Markdown into a folder that holds hand-written docs.
- Running archify's 1600, 1920 and 2048 captures as a gate; its finalize gates and fx's 1440 and 390 check are the gates.

Anti-goals: a site whose evidence was not checked against the code; a model that agents edit as one 600 KB file; generated Markdown that overwrites hand-written docs; a full run that starts before the owner has seen its cost.

## Open Questions

- [x] Approach → model as the record, Markdown generated (owner, 2026-10-28).
- [x] Command shape, evidence rules, renderer location, output location, scope, cost pass, interview, design language, contents, diagrams, fx-docs gaps, proof, language → decisions 1 to 13 (owner, 2026-10-28), each written into the sections above.
- [x] Evidence in other repos inside generated Markdown → written `@<root id>/<path>`, skipped by docs-index, covered by the CLI's `stale`.
- [x] Where verification state lives → a `verified` commit per root on each item, written by `verify` and `build`.
- [x] Where the Markdown goes in a MkDocs repo, given that an `index.md` in the site folder would collide with `index.html` → the site and the Markdown live in separate folders; the site folder holds no Markdown index page.
- [x] archify's single repository per diagram → the diagram's owning root carries `sources`; other roots go in the steps card.
- [ ] Whether archify sequence pages can pass the 390 px check at all. The design retries at 5 messages per page and falls back to SVG; proof run (a) answers it. If every archify sequence falls back, the owner decides whether to keep archify for sequences.
- [ ] The estimate's constants. They start from system-flow's counts (219 files, about 17,100 cited lines, 1,785 entries) and are replaced by the measured values of proof run (a). Without that run the estimate is a guess, and the plan says so.

Six of eight closed; the two open ones are settled by proof run (a), not by a decision now.

## Further Notes

- Size reference: system-flow's model is 654 KB with 1,161 evidenced items; its page is 1.05 MB with 44 inline figures and 58 archify files. Its Shamel.Backend share is 26 files and 141 entries.
- The CLI ports the logic of system-flow's `build.py` and `build-page.mjs` (about 750 lines) into tested TypeScript; system-flow's files stay where they are and are read for reference only.
