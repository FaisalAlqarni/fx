# /fx:fx-system-flow: implementation plan

> **Build this with `fx-implement`. Do not execute the tasks directly.**
>
> The tasks below are deliberately detailed. That makes them easy to follow and
> it is exactly why the lane gets skipped: nothing looks missing. What is
> missing is everything a task file cannot hold, and it is what `fx-implement`
> supplies: a worktree so the main checkout is never written to, a ledger that
> survives compaction, a fresh subagent per task, a review while each diff is
> still small, and lens dispatch on what the diff actually touched.
>
> Steps use `- [ ]` checkboxes.

**Design:** `./design.md`
**Goal:** add `/fx:fx-system-flow`, a user-invoked lane plus a `system-flow` CLI that merges evidenced model fragments, verifies every evidence entry against the code, and builds an offline site (page, deep diagrams, Markdown, README) that fx-docs then keeps current.
**Architecture:** One TypeScript CLI, `src/scripts/system-flow.ts` built to the extensionless `scripts/system-flow`, dispatches to focused `src/lib/sf-*.ts` modules (schema, model and merge, rules, evidence, layout, Markdown, page, diagrams, theme, detect, coverage, stale, corrections, estimate and depth). Two new browser kit files (`fx-map-2.js`, `fx-flow-1.js`) render the page; archify is run by the CLI when one is found or passed. The lane `skills/fx-system-flow/` drives the planning pass, area subagents and the interview, and fx-docs gains a model path in branch mode, recorded by ADR 0066.
**Stack:** TypeScript under `src/` built per file by `scripts/build` (esbuild) into committed JavaScript; vendored elkjs, React and React Flow from `references/vendor/`; node `assert` tests run as processes; Markdown skills and references; bash and Python gate scripts.
**Complexity:** High
**Risks:**
- HIGH: layout quality. ELK auto layout of level 0 will read worse than system-flow's hand grid, and a figure that cannot meet 1 crossing and 860 px stops the build. Task 05 ports system-flow's variant search and crossing reduction, measures itself against system-flow's own numbers (a K(3,3) cap and one parity fixture taken from a system-flow level diagram) and fails with the best layout line; level-0 `layout` hints are the escape hatch; task 20 measures it on a real repo.
- HIGH: the model becomes the record for generated Markdown, reversing ADR 0062 decision 2. Task 19 writes ADR 0066 through fx-adr in the same commit that changes fx-docs; the generated-marker rule (task 04) means hand-written docs are never overwritten, and fx-docs' Markdown path skips generated files.
- HIGH: proof runs need a real session. `/fx:fx-system-flow` is user-invoked (ADR 0055): no subagent may invoke it. Tasks 20 and 21 split into prep (agent), run (controller only, a headless `claude -p --plugin-dir <worktree>` session on scratch copies, which is a real session and not a subagent) and results (agent). Task 18 is an agent-runnable smoke test of the CLI and archify on a real repo so most failures surface before the expensive runs.
- HIGH: the headless proof sessions need the owner's login: they run with a scratch HOME and CLAUDE_CONFIG_DIR holding a 0600 credential copy and a copy of the archify skill, so nothing is written under /home/faisal; the copy is deleted with find -delete after the results step.
- MEDIUM: archify 3.2.0's spec format. Task 11 copies archify's `architecture`, `sequence` and `common` schemas (with archify's LICENSE) into `tests/fixtures/archify-3.2.0/` and validates every spec against them; a schema change shows as a failing fixture test, and task 18 runs the real archify.
- MEDIUM: ADR 0066 is reserved; 0065 belongs to the `codex-catalog` branch. If that branch merges first, the index rows must both stay. Never touch `/development/fx/.worktrees/codex-catalog`.
- MEDIUM: `tests/gates/release-version.test.js` fails a branch whose version is not above main's. Task 01 raises the plugin version from 0.7.0 to 0.8.0 in every file that gate reads; the codex-catalog branch may raise it too, and the later merge takes the higher number.
- MEDIUM: several tasks add one dispatch branch to `src/scripts/system-flow.ts` and one step to `src/lib/sf-build.ts`. Run CLI tasks one at a time even where the frontier allows two, or expect a trivial merge in those files.
- MEDIUM: the estimate's constants are guesses until task 20 measures them (design Open Questions). Task 14 states them in one table; task 20 replaces them with measured values.
- LOW: `skills/fx-system-flow/` exists from task 01 (the schema file) before its `SKILL.md` exists (task 15). Gates that iterate skill folders filter on `SKILL.md`; if any gate fails on the bare folder, task 01 records it and task 15 closes it.
**Testing:** Unit: none beyond the CLI; every behaviour test runs `scripts/system-flow` as a process against the fixture of task 01 (`tests/helpers/sf-fixture.js`: two git roots and one plain root) and asserts exit code, stdout JSON, stderr lines and written files · Integration: `scripts/check-all` (new `system-flow-*.test.js` lines, `doc-index.test.js`, `fx-json.test.js`, the `user-invoked`, `skill-size`, `visual-kit`, `docs-lanes` and `opencode-plugin` gates) · E2E: the smoke run (task 18) and the two proof runs (tasks 20 and 21) with the runtime's browser for the visual check.

## Global Constraints

- No em or en dashes in any file, label, commit message or chat output.
- Labels and prose in English; Arabic only for real product strings and sample replies, wrapped as `<span lang="ar" dir="rtl">` on pages.
- Pages default to `lang="en" dir="ltr"` and use logical properties.
- Locale: the design names English with `lang="en" dir="ltr"` as the page default; the kit keeps logical properties so `dir="rtl"` still lays out correctly.
- Pages load only files under the site's `assets/`; no CDN, no network request. A font named by the repo's theme is used by family name only, never fetched.
- fx gains no runtime dependency; elkjs is loaded from `references/vendor/`.
- Edit `src/**/*.ts`, then run `scripts/build`; never hand-edit generated JavaScript.
- Every `skills/*/SKILL.md` stays under 20,000 bytes; references one level deep.
- An inline figure has at most 1 crossing and is at most 860 px wide.
- A sequence or store flow deep diagram page holds at most 8 messages.
- Tests run with TMPDIR in the session scratchpad through `scripts/scratch-env`; nothing is written or deleted under the owner's home or `/mnt`.
- Proof and smoke runs use scratch copies only, never the real repos.
- Never push, merge, open a PR or move the base branch; no attribution trailers.
- A kit file's byte change renames it (`fx-map-2.js`, `fx-flow-1.js`).
- Every string from a repository is HTML-escaped before it enters a page; `<` inside inline JSON is written `<`.
- Owner rules for every command a task runs: HOME and TMPDIR in the session scratchpad (`TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env <command>`); never type `rm`, `trap` or `bash -c` (delete a tracked file with `git rm -q -- <path>`; leave scratch files in place); Python only as `python3 -I`; nothing written under `/home/faisal`. Reading an installed archify is allowed; tasks copy it into the scratchpad before running it.
- The CLI's output contract: JSON on stdout, problems on stderr as `<file>:<pointer>: <message>` (file relative to the host root, pointer a JSON Pointer), exit 0 on success, 1 on a failed check, 2 on usage. Every task's messages follow it.
- Tests never delete what they create: fixtures live under `os.tmpdir()`, which `scripts/scratch-env` points into the scratchpad. The fixture's `run` gives the CLI `HOME=<fixture>/home` and removes `CLAUDE_CONFIG_DIR` from the environment unless a test sets it, so no test ever finds the owner's archify.
- Ids (decided here; the design names ids without fixing them for every kind). Every declared id (diagram, node, group, sequence, participant, store flow, store row, bullet, catalogue, rule, inventory, section, question, correction, and every `meta.roots[].id`) and every section `folder` matches `^[a-z0-9][a-z0-9-]*$`. Ids are unique per kind, not globally: node `turn` and sequence `turn` may coexist, two nodes `api` may not. Derived ids: an edge is `<diagram id>:<from>><to>`, with `#2`, `#3` appended in order when one diagram holds more than one edge between the same pair; a participant `<sequence id>.<participant id>`; a message `<sequence id>#<n>`; a flow step `<flow id>#<n>`. Store rows share one kind across the five tables.
- Handles (decided here). Everywhere the CLI takes or prints an item, and in `questions[].items` and `corrections[].item`, an item is named `<kind>:<id>`, the prefix always present. The prefixes are `diagram`, `node`, `edge`, `group`, `seq`, `participant`, `message`, `flow`, `step`, `store`, `bullet`, `catalogue`, `inventory`, `rule`, `section`, `question`, `correction`. The prefix ends at the first `:`, so `edge:engine:api>db` is the edge `engine:api>db`.
- Evidence (decided here, beyond the design's list). Every evidenced kind (node, edge, group, participant, message, store row, flow step, catalogue entry, inventory entry, rule, bullet) carries `evidence[]`, optional `unconfirmed` and optional `verified`, and needs at least one evidence entry unless `unconfirmed` is true. An evidence `path` holding whitespace or a backtick, or a `symbol` holding a backtick, is rejected, since docs-index's evidence line cannot hold them.
- The children rule (decided here; the design states it for every node). A primary node's `children` must name an existing diagram whose `parent` is that node's diagram; a context node (`primary: false`) only needs its `children` to name an existing diagram.
- `.fx.json` `system_flow` (decided here, beyond the design's block): `output`, `theme`, `roots` (root id to a path relative to the host root, written by `detect --repo ... --write`) and `diagrams` (`prefer`: `cheap`, `fast` or `detailed`; `pageLimits`: diagram name to messages per page; `svg`: diagram names forced to SVG; `archify`: an archify folder the owner sets by hand). `build` writes `diagrams.prefer`, `diagrams.pageLimits` and `diagrams.svg` from its flags and reads them on every later build. No command writes an absolute machine path into `.fx.json` or into a spec.
- Finding archify (decided here): `--archify <dir>` when given; otherwise, unless `prefer` is `cheap`, the first folder holding `bin/archify.mjs` among `$CLAUDE_CONFIG_DIR/skills/archify`, `$HOME/.claude/skills/archify` and `.fx.json` `system_flow.diagrams.archify` (resolved from the host root). `detect` prints the pick; the lane and fx-docs pass it as `--archify`.

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | system-flow CLI, model schema, fragment merge and the fixture | none | `system-flow check` validates fragments against the shipped JSON Schema and merges them | MVP |
| 02 | Structure rules and caps in check | 01 | cross-references, evidence per kind, caps, orphans, dash ban, Arabic warning | MVP |
| 03 | Evidence verifier and evidence roots | 02 | path, range and symbol checked in every root with one read per file; `.fx.json` `system_flow`; `check --fragment` | MVP |
| 04 | build: Markdown, README, merged model and docs-index `@` paths | 03 | `system-flow build` writes escaped, evidenced Markdown docs-index reads back; stamps last | MVP |
| 05 | Figure layout and the layout report | 04 | ELK layout under 1 crossing and 860 px measured against system-flow, figure specs, `layout-report.json` | Core |
| 06 | detect: docs config, output location and evidence roots | 03 | `system-flow detect [--repo <path>]... [--write]` | Core |
| 07 | Theme detector and theme.css | 06 | colours and fonts mapped onto fx tokens with a contrast check | Core |
| 08 | Kit files fx-map-2 and fx-flow-1, page template slots | 04 | the map with context nodes and groups, the inline figure player | Core |
| 09 | Coverage report and Rules in force | 04 | `coverage.json`, `coverage.md`, `rules-in-force.md`, superseded-ADR check | Core |
| 10 | The site page | 05, 07, 08, 09 | `index.html` with map, chapters, figures, evidence boxes, fixed chapters | Core |
| 11 | Deep diagrams: archify specs and the SVG fallback | 05, 07 | one deep diagram per level, sequence and store flow, specs valid against archify's schemas | Core |
| 12 | Running archify, its retry, theme block, persisted choices and adapter rules | 11 | `build --archify`, archify lookup, fixed retry, `.fx.json` `system_flow.diagrams` | Core |
| 13 | query, stale and verify | 04 | items by cited path or by diff in each root, stale items per root, verified commits | Core |
| 14 | estimate, the plan file and the depth report | 04 | tokens and wall-clock per area; planned against built depth in `BuildResult` | Core |
| 15 | The fx-system-flow lane | 06, 09, 10, 12, 13, 14 | `/fx:fx-system-flow`, the ninth user-invoked lane | Core |
| 16 | Corrections check | 03 | changed facts need a corrections entry, compared by id across merged models | Hardening |
| 17 | build --only | 10, 12, 13 | rebuild only the docs, figures and diagrams holding given items | Hardening |
| 18 | Smoke run: CLI and archify on a Shamel.Backend scratch copy | 17 | `results.md` part Smoke: check, build with archify, flagless rebuild and the visual check on a real repo | Hardening |
| 19 | fx-docs on the model, ADR 0066 and the first-run offer | 13, 15, 16, 17 | fx-docs branch mode updates model items and still runs the Markdown path; full run replaced | Hardening |
| 20 | Proof run (a): Shamel.Backend and estimate calibration | 18, 19 | `results.md` part (a), depth against the hand-built bar, measured estimate constants | Polish |
| 21 | Proof run (b): four Advantage roots | 20 | `results.md` part (b), estimate within 50% | Polish |

Each phase ends green on `scripts/check-all`. Phases are checkpoints for review, not merge points: the branch merges only after tasks 20 and 21 have run and the owner has read `results.md`, which is the design's "Proof before merge".

## Deviations from the design

- **Markdown output location.** The design put Markdown into `<docs_dir>`'s existing section folders where a chapter fits one. That contradicts the design's own Out of Scope line ("Generating Markdown into a folder that holds hand-written docs"), so all generated Markdown goes to `<docs_dir>/system/`; when that folder already holds hand-written Markdown, `detect` picks `<docs_dir>/system-generated/` or exits 1 (task 06). The MkDocs nav offer gains `system/index.md`. The design's Output location text is amended, and ADR 0066 records the rule (task 19).
- **`query --diff` scope.** None: implemented for each root as designed (task 13). The host root diffs against `<base>`; another root diffs against `--base <root id>=<ref>` when given, else against the oldest `verified` commit any item records for it.
- **Fonts.** None: kept as designed (task 07). `font.text` and `font.code` from MkDocs Material reach `theme.css` by family name, with no font fetched.
- **HTML pages in repos without a model.** The design replaces fx-docs section 7 and `html-pages.md` with the site everywhere. The plan keeps them, unchanged, for repos without a system model, so a repo that never runs `/fx:fx-system-flow` loses nothing; in a repo with a model the site replaces them (task 19).
- **The test fixture.** The design names `scripts/make-git-fixture`. That script builds a commit-less linked-worktree fixture for the git guard and starts with `rm -rf`, so it fits neither these tests nor the owner rules. Task 01 adds `tests/helpers/sf-fixture.js` instead: two git roots and one plain root, committed files the good fragment set cites, `git(root, ...args)`, and a `.fx.json` writer.
- **The archify repair round.** The design said "one repair round following archify's own repair rule", which would need an agent to edit specs inside the build. The plan makes it a fixed CLI retry: a sequence or flow is rendered again at 5 messages per page, then falls back to SVG; an architecture diagram falls back at once (task 12). The design's Error handling table is amended to match.

## Coverage of the red-team findings

| Finding | Owner |
|---|---|
| 1 children rule for primary and context nodes | 02 |
| 2 evidence on every evidenced kind, Group evidenced | 01 (types and schema), 02 (rule and tests per kind) |
| 3 depth: plan, report, brief, proof bar | 14 (plan file and `BuildResult.depth`), 15 (`planning.md`, `area-brief.md`, report), 20 and 21 (results against the bar) |
| 4 ids unique per kind, prefixed handles, area prefix on node ids | 01 (per-kind duplicates), 02 (question and correction handles), 13 and 17 (CLI handles), 15 (`fragment-guide.md`) |
| 5 id and folder pattern | 01 |
| 6 escape of inline JSON | 10; design text fixed |
| 7 Markdown escaping | 04 (tables, Mermaid), 03 (evidence path and symbol characters) |
| 8 persisted diagram choices | 03 (type), 12 (write, read, flagless rebuild), 19 (fx-docs passes `--archify`) |
| 9 archify geometry, schemas and repository | 11 |
| 10 the fixed retry | 12; design text fixed |
| 11 `detect --repo ... --write` writes roots | 06 (CLI), 15 (`planning.md` copies them into `meta.roots`) |
| 12 estimate from `filesToRead` | 14 |
| 13 no per-phase merge | plan.md, above |
| 14 stamp last | 04; 05 asserts on an unfit layout |
| 15 `FigureSpec` in `sf-model.ts` | 04 declares it, 05 fills it, 08 blocked by 04 |
| 16 one read per cited file | 03 |
| 17 corrections compared by id | 16 |
| 18 both fx-docs paths in a model repo | 19 |
| 19 fx-docs adds inventory entries | 13 (`added` paths in `query --diff`), 19 (lane text) |
| 20 query per root, fonts, HTML pages | 13, 07, 19 |
| 21 `<docs_dir>/system/` | 06 (detect), 19 (ADR 0066), 20 (`mkdocs build --strict`); design text fixed |
| 22 controller-run proofs, smoke task, archify lookup | 18 (smoke), 20 and 21 (prep, run, results), 12 (lookup), 15 (lane uses it) |
| 23 layout tests against system-flow | 05 |
| 24 the fixture helper | 01; deviation above |
