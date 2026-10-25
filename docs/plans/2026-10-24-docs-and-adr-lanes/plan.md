# ADR lane, visual kit and documentation lane: implementation plan

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
**Goal:** add the `fx-adr` lane with one folder of record templates, a visual kit that every fx HTML page uses, and the `fx-docs` lane with evidence lines, a reverse index and seven lanes that read it, in three phases that each pass `scripts/check-all`.
**Architecture:** Phase A is mostly Markdown (a `references/templates/` folder, a new lane, pointer lines, an `.fx.json` key) plus one tested TypeScript migration, `lib/scratch-migrate.js`, on `glossary-migrate`'s shape. Phase B adds `references/visual/` (an HTML page template, a CSS token file, a TypeScript map built to browser JavaScript, recipes), vendors React, React Flow and elkjs, then moves the two report writers onto it and removes Tailwind and Mermaid. Phase C adds two `src/lib/` modules and a `scripts/docs-index` command (parser, reverse index, stale pass one), the `fx-docs` lane, a docs step offered before fx-implement's branch pass, a shared lookup reference and a docs section in `compile-brief`.
**Stack:** Markdown skills and references; TypeScript under `src/` built by `scripts/build` (esbuild) into committed JavaScript; bash and Python gate scripts; node assert tests.
**Complexity:** High
**Risks:**
- HIGH: the installed fx (0.2.9) `compile-brief` resolves only `##` headings, and every task's Design line names `###` headings. Standing ruling S1 compiles every brief with the tool pinned at 67584d9; task 06 rewrites `compile-brief`, so the build worktree's copy is never used to compile.
- HIGH: `.scratch/` migration moves owner files, and in advantage-backend `.scratch/` is git-ignored. Task 02 ships it as `lib/scratch-migrate.js` with a dry run by default, `--apply`, undo on failure, a printed rollback, and tests on a git fixture; untracked files move with a filesystem rename, tracked ones with `git mv --`; it commits nothing and never applies unattended.
- MEDIUM: `fx-adr` and `fx-docs` are not in the installed plugin. Standing ruling S3: tasks 02, 04 and 06 write ADRs by following the build worktree's `skills/fx-adr/SKILL.md`, and this build's own completion has no docs step.
- MEDIUM: byte headroom is thin in fx-debug (18,983 now, about 19,360 after task 06) and fx-brainstorm (18,463 now, about 18,830 after task 06). Each task states the expected size and the section to move out past its ceiling.
- MEDIUM: `scripts/check-reference-leaves` resolves a named file only in `references/`, `vocab/`, `stacks/` and `testing/`; task 01 widens it to every subfolder, and templates take `-template` names so a backticked `design.md` is not read as a link.
- MEDIUM: the vendored files must be upstream's bytes. Task 03 names each file's path inside its npm package and ledgers both SHA-256 values and the tarball `integrity` for each.
- LOW: `tests/gates/release-version.test.js` fails a branch whose version is not above main's. Task 01 sets 0.7.0; each phase gate raises the minor version only when main already carries the branch's version.
**Testing:** Unit: node assert tests beside the code (`scratch-migrate.test`, `doc-evidence.test`, `doc-index.test`, `fx-json.test`, `compile-brief.test`) · Integration: the `check-all` gate suite (size, paths, prose, reference leaves, manifest, user-invoked, description overlap, brief size, the new `reference-leaves` and `visual-kit` gates, conformance row 09) · E2E: the live lane-triggering bench and the browser visual check, on request only, never in `check-all`.

## Global Constraints

- Every SKILL.md under 20,000 bytes.
- One claimant per intent: `fx-adr` and `fx-docs` are the only new skills; the visual kit and templates are references and add nothing to the skill selection list.
- References are leaves: no file in `references/` links another reference.
- Never push, merge, open a PR or move the base branch. Nothing leaves the machine unless the owner initiates it.
- No attribution trailers in any commit message, PR description or file.
- No em or en dashes in any file, commit message or chat output.
- Plain prose: lead with the point, say who acts, one term for one thing, the common word.
- Pages load only vendored files from the repo; no CDN, no network request.
- Edit `src/**/*.ts`, then `scripts/build`; never hand-edit generated JavaScript.
- Tests run with TMPDIR in the session scratchpad and through `scripts/scratch-env`; nothing is written or deleted under the owner's home.
- Doc prose and labels in English; Arabic only for real product strings and sample replies.
- Locale: Arabic is the default locale, with RTL support throughout, wherever fx produces user-facing product guidance or pages.

`<SCRATCH>` means the building session's own scratchpad directory. The controller fills it in once, as a standing ruling, before task 01.

Standing rulings (the controller copies these into the ledger's `## Standing rulings` before task 01):

- **S1, the brief tool.** Before task 01, the controller creates `git worktree add --detach <SCRATCH>/fx-brief-tool 67584d9` and compiles every brief with `node <SCRATCH>/fx-brief-tool/skills/fx-implement/scripts/compile-brief --worktree <build worktree> ...`. Never the installed tool (it cannot resolve `###` headings) and never the build worktree's copy (task 06 rewrites it).
- **S2, phase gates.** The `scripts/check-all` runs in tasks 02, 04 and 06 are plan-mandated phase gates, ledgered as `Task <NN>: ran test_all (plan-mandated phase gate)`.
- **S3, the new lanes.** `fx-adr` and `fx-docs` are not installed. Tasks 02, 04 and 06 write ADRs by following `skills/fx-adr/SKILL.md` in the build worktree; the reviewer checks each ADR against that file, and checks ADR 0061's supersession of 0015 with care, as the rule's first real use. This build's completion runs no docs step.
- **S4, ADR numbers.** Phase A writes 0059 and 0060, Phase B writes 0061, Phase C writes 0062 and 0063, unless that number already exists at the task's base, in which case the lane's next-number rule holds.
- **S5, the supersede rule (controller, after red-team finding 5; changes design.md's "Supersede rule" and "The index" wording, design.md itself not edited).** (a) Every still-in-force item is numbered as a decision of the new ADR, so a later ADR can name it. (b) The old ADR's status becomes `Superseded by NNNN (replaced: decisions 2, 4; the rest carried forward)`, never "Partly superseded", so each decision has exactly one live copy and the newest ADR alone tells the current story. (c) An ADR with no status line may get exactly one status line added under its title; that and changing that line are the only edits ever allowed. Index statuses are therefore current, superseded by NNNN, or the repo's own words.
- **S6, `.scratch/` that git ignores (owner, red-team finding 1).** The migration moves untracked or ignored `.scratch/` files with a filesystem move, shows in the dry run the `.gitignore` line it will remove, removes that line on apply, and leaves `git add -- docs/issues` to the owner. Tracked `.scratch/` files still move with `git mv --`.
- **S7, the docs step is an offer (controller, red-team finding 6).** fx-implement offers the docs step in one line before the branch pass instead of invoking `fx-docs`, so ADR 0006 (pointers, never invocations) stands. With the owner away it is not run and the completion report says so.
- **S8, locale (controller, red-team finding 22; design.md not edited).** The Locale constraint applies to product UI guidance (mockups, design templates, fx-design and web references). Pages fx writes about a codebase (reports, docs pages, the visual kit) default to `lang="en" dir="ltr"`, with Arabic product strings marked `lang="ar" dir="rtl"`.

Owner safety rules (bind the planner, the controller and every implementer):

- Every command runs with `TMPDIR=<SCRATCH>/fx-tests/tmp`, and every test runs through `scripts/scratch-env`. The prefix used in every task is `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env`. Create the directory once per session with `mkdir -p <SCRATCH>/fx-tests/tmp`.
- Never write or delete anything under `/home/faisal`.
- Never type `rm`, `trap` or `bash -c`. Remove a tracked file with `git rm --`. Leave scratch files in TMPDIR.
- Run Python only as `python3 -I`.
- No push, no merge, no attribution trailers. Stage by path, never `git add -A` or `git add .`.
- No em or en dashes anywhere, chat included.

Tasks run one at a time; no two tasks share the worktree.

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | Record templates, the `fx-adr` lane and version 0.7.0 | none | five templates in `references/templates/`; leaf gate covers every subfolder; model-selectable `fx-adr`; four lanes point at it; skill count 21 | A: ADR lane and templates |
| 02 | Bug reports, `docs/issues/`, `.scratch/` migration; Phase A gate | 01 | fx-debug writes a bug report; tested `scratch-migrate`; ADRs 0059, 0060 and the index; `check-all` green | A: ADR lane and templates |
| 03 | Visual kit references and vendored libraries | 01 | `references/visual/`, a tested map, five vendored files with licences and provenance, the `visual-kit` gate | B: Visual kit |
| 04 | fx-architecture and fx-audit reports on the kit; Phase B gate | 01, 02, 03 | both reports on the kit; Tailwind, Mermaid and `report-assets.md` gone; ADR 0061 supersedes 0015's sentence; `check-all` green | B: Visual kit |
| 05 | Evidence lines, reverse index and stale pass one | 01, 03 | `lib/doc-evidence.js`, `lib/doc-index.js`, `scripts/docs-index` with tests | C: Docs lane and wiring |
| 06 | The `fx-docs` lane, the docs step and seven lanes reading docs; Phase C gate | 02, 04, 05 | model-selectable `fx-docs`; the offered docs step; one lookup reference, six pointer lines, a docs section in every brief; ADRs 0062, 0063; `check-all` green | C: Docs lane and wiring |
