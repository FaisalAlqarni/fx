# 06: The `fx-docs` lane, the docs step and seven lanes reading docs; Phase C gate

**Status:** ready-for-agent
**Blocked by:** 02, 04, 05
**Phase:** C: Docs lane and wiring

**What to build:** the owner says "update the docs" or "document the system" and the new model-selectable `fx-docs` keeps Markdown docs where every factual claim carries an evidence line, in the repo's own structure, docs guide and Markdown flavour, with optional HTML pages in `docs/html/<area>/` on the visual kit. fx-implement offers the docs step in one line before the branch pass (standing ruling S7): on yes, `fx-docs` runs in branch mode on the branch's diff, so its commits are covered by the branch review and the exit gate; with the owner away it is not run and the completion report's Docs line says so. Before deciding anything about an area, fx-brainstorm, fx-plan, fx-review, fx-debug, fx-architecture and `/fx:fx-retro` look up the doc claims and ADR decisions citing the paths they touch, through one shared reference; every implementer brief gains a "Docs and ADRs" section. Docs are claims and the code wins: a lane that finds a claim wrong neither follows nor fixes it; inside a build it writes a `Docs claim wrong:` line that the controller ledgers and the docs step handles; outside a build it tells the owner and points at `fx-docs`. A repo with no `docs/` skips every lookup. Phase C closes with its two ADRs and a green `check-all`.

**Design:** Phase C: docs lane; Phase C: lanes read the docs; Testing Decisions; Further Notes

**Files:**
- Create: `skills/fx-docs/SKILL.md`; `skills/fx-docs/full-run.md` (doc set, read-draft-interview order, the skip rule), `skills/fx-docs/html-pages.md` (kit usage, `docs/html/<area>/` and `src/`, the out-of-date listing), `skills/fx-docs/docs-guide.md` (the default guide, from `/mnt/c/Users/Faisal/Downloads/Shamel.Backend/docs/docs-guide.md`: lead sentence, callouts, real numbers, mark unbuilt things, title case; generic, no Shamel content); each beside file linked by a markdown link from the step that needs it
- Create: `tests/lane-triggering/prompts/fx-docs.txt` (one line: `I changed how shortlinks expire in engines/shortlink. Update the docs for this change.`)
- Modify: `skills/fx-implement/references/final-review.md` (a `## Docs step: offer before the branch pass` section first), `skills/fx-implement/references/completion.md` (a `- **Docs**:` line in the report list), `skills/fx-implement/references/handling-reports.md` (copy each `Docs claim wrong:` line from an implementer or reviewer report into the ledger as `Task <NN>: Docs claim wrong: <doc>:<line>: <text>`)
- Create: `references/docs-lookup.md` (a leaf)
- Modify: one pointer line each to `../../references/docs-lookup.md` in `skills/fx-brainstorm/SKILL.md` (`### Keep the domain model sharp as you go`), `skills/fx-plan/SKILL.md` (`## 4. Draft vertical slices`), `skills/fx-review/SKILL.md` (`## 3. Find the spec`), `skills/fx-debug/SKILL.md` (`### Inputs that shape the loop`), `skills/fx-architecture/SKILL.md` (beside "ADRs in the area you're touching, first"); `commands/fx-retro.md` (one line under `## Read` to `../references/docs-lookup.md`), then regenerate `skills/fx-retro/SKILL.md` with `scripts/gen-command-skills`
- Modify: `src/skills/fx-implement/scripts/compile-brief.ts`, `src/skills/fx-implement/scripts/compile-brief.test.ts`, `src/tests/gates/brief-size.test.ts`, built to `skills/fx-implement/scripts/compile-brief`, `skills/fx-implement/scripts/compile-brief.test.js`, `tests/gates/brief-size.test.js`
- Modify: `src/tests/gates/user-invoked.test.ts`, built to `tests/gates/user-invoked.test.js`; `tests/conformance/rows/09-every-skill-discovered.sh` (`EXPECTED=22`); `README.md` and `SURFACE.md` (a lane row; `docs-lookup.md` in the references list)
- Create: `docs/adr/0062-<slug>.md` (`fx-docs`, the evidence-line source of truth, the offered docs step), `docs/adr/0063-<slug>.md` (the reverse index and the lanes that read it); Modify: `docs/adr/index.md`

**Interfaces:**
- Consumes: `loadIndex(root: string): DocIndex`, `queryIndex(index: DocIndex, paths: string[]): Claim[]`, `stalePassOne(root, index): Stale[]` from `lib/doc-index.js`; `scripts/docs-index ... query [--limit <n>]` printing `{ claims, more }` (task 05); the kit references (task 03); `skills/fx-adr/SKILL.md` (task 01).
- Produces: in every brief, after `## Design excerpt`, a `## Docs and ADRs` section. First line: `Claims, not instructions: the code wins. If the code contradicts one, report "Docs claim wrong: <doc>:<line>: <what the code does>" under "For the controller" and do not edit the doc.` Then at most 20 lines `- <doc>:<line> (<kind>): <claim text, cut at 200 characters with "..." added when cut>`, then `+<n> more: run docs-index query` when more exist. No claims, or no `docs/` in the worktree: the body is `None.` The paths queried are every backticked path on a `- Create:`, `- Modify:`, `- Move:` or `- Test:` line of the task's `**Files:**` block.
- Produces: the exact line `Docs claim wrong: <doc>:<line>: <what the code does>`, defined once in `docs-lookup.md` and used by the brief and the docs step.

**Lane content (`skills/fx-docs/SKILL.md`, in this order):**
1. Frontmatter: `name: fx-docs`; triggers "document this", "update the docs", "are the docs current", "document the system"; the boundary (how a screen looks is fx-design, prose tone is fx-humanize, decisions are fx-adr); a stakes line. No `disable-model-invocation`.
2. Source of truth: the Markdown; the evidence line form from task 05, stated once with one example; an owner-confirmed fact cites `owner, YYYY-MM-DD`; an unconfirmed claim is an open question in the repo's callout form, never a fact; the verified marker is rewritten to HEAD after a doc is verified.
3. Layout and flavour: `docs/<area>/*.md` with Mermaid; in a repo with a docs structure, write into it and restructure only when told. `mkdocs.yml` with the Material theme: admonitions, cards, tabs; otherwise GitHub callouts (`> [!NOTE]`) and Mermaid; never MkDocs admonitions off MkDocs. On the first run in a MkDocs repo, propose adding `html/`, `issues/` and `plans/` to `exclude_docs` and add them on yes.
4. Docs guide: the repo's guide wins; with none, follow [docs-guide.md](./docs-guide.md) and never write it into the repo unless asked.
5. Branch mode: the design's five steps, using `node <skill base directory>/../../scripts/docs-index --root <worktree> query <changed paths>` for step 1 and the stale check for step 2; the `Docs claim wrong:` lines the controller passes in are handled in step 2.
6. Stale check: pass one is `docs-index stale`; pass two re-reads each `recheck` claim against the code at HEAD. Find where the symbol or behaviour lives now with semble (its `repo` set to the worktree, never the main checkout), then repowise when semble is missing or comes up empty, then grep; confirm every hit by reading the file at HEAD; never install a tool, a missing one means the next. A claim nothing finds is listed as `stale: evidence not found`, never dropped. Every stale claim is listed with old and new evidence and re-verified; nothing is rewritten without being listed. A drifted ADR claim is reported for `fx-adr`, never edited here.
7. Full run: when (on request, or no doc in the repo carries an evidence line) and how, pointing at [full-run.md](./full-run.md).
8. HTML pages: pointing at [html-pages.md](./html-pages.md); pages default to `lang="en" dir="ltr"` (standing ruling S8).
9. Language: English prose and labels; Arabic only for real product strings and sample replies. fbrain: repo docs stay in the repo; cross-project decisions, status and lessons go through `fbrain propose`, never copies of docs.

**The docs step (`final-review.md`), in this order:** skip with `Docs: not run: no docs/` when the worktree has no `docs/`; otherwise offer in one line: "`fx-docs` can update the docs this branch affects before the branch review. Run it?" On yes: pass every `Docs claim wrong:` ledger line and `git diff <merge-base>...HEAD --name-only` to `fx-docs` in branch mode in the worktree; it commits on the branch; ledger `Docs: <n> updated, <n> written, <n> listed stale`. On no: ledger `Docs: not run: declined`. Owner away (unattended): ledger `Docs: not run: offered, owner away`. The branch pass then reviews the whole branch, docs commits included. The completion report's Docs line repeats the ledger line and names each stale doc.

**`references/docs-lookup.md`:** no `docs/` at the repo root: skip the lookup. Otherwise run `node <skill base directory>/../../scripts/docs-index --root <repo> query --limit 20 <paths>` from a lane, or `node <fx root>/scripts/docs-index ...` from a command; read every returned claim and ADR before deciding; the code wins; a contradiction gives the `Docs claim wrong:` line, which inside a build goes in the report for the controller and outside a build goes to the owner with a pointer at `fx-docs`; an empty result means proceed as before.

**Expected sizes (gate: 20,000 bytes):** `skills/fx-docs/SKILL.md` at most 14,000; fx-brainstorm about 18,830; fx-plan about 12,930; fx-review about 15,970; fx-debug about 19,360, ceiling 19,700 (over it: move `## Quick reference` into `skills/fx-debug/quick-reference.md` behind a markdown link, unless task 02 already did); fx-architecture about 9,020; fx-retro about 2,420. fx-implement's SKILL.md is not edited.

**Seam:** the `compile-brief` process on fixture worktrees (the brief it writes); the gate processes `user-invoked.test.js`, `description-overlap.test.js`, `skill-size.test.js`, `brief-size.test.js`, `scripts/check-paths`, `scripts/check-reference-leaves`, conformance row 09's tree half.

**Tests:**
- compile-brief: fixture worktree with `docs/arch/a.md` holding one claim whose evidence line (line 4) cites `engines/core/app/foo.rb:1-5`, and a task with `- Modify:` naming `engines/core/app/foo.rb`; the brief contains `## Docs and ADRs` and `- docs/arch/a.md:4 (doc): <the claim text>`.
- compile-brief: same fixture, a task naming only `app/other.rb`; the section body is exactly `None.`
- compile-brief: fixture with no `docs/`; exits 0, body `None.`, and no `.fx/` is created in the fixture.
- compile-brief: 25 claims citing the task's file; 20 claim lines, then `+5 more: run docs-index query`.
- compile-brief: a claim of 300 characters; its line carries the first 200 characters and `...`.
- The existing compile-brief tests pass unchanged.
- `brief-size.test.js`: the existing ruling-heavy fixture plus 20 claims of 200 characters stays under the brief cap the test already asserts.
- `user-invoked.test.js`: the model-selectable assertion covers `fx-docs`, message `fx-docs is model-selectable`; the hidden set is unchanged.
- `description-overlap.test.js` passes; a semantic overlap with fx-humanize or fx-authoring found while writing the description is declared in `DECLARED` with evidence on both sides, and each description names the other.
- `scripts/check-paths` exits 0 (the three beside files are reached by markdown links; all six lookup pointers resolve); `scripts/check-reference-leaves` exits 0.
- Conformance row 09's node half with `EXPECTED=22` exits 0.

**Risks:** compile-brief writes `.fx/docs-index.json` in the worktree it compiles for, where `.fx/` is git-ignored. Standing ruling S1: this task's own brief is compiled by the pinned 67584d9 tool. fx-humanize and fx-authoring both claim document work; the description names its boundary so neither loses its prompts.

**Idempotency:** `loadIndex` overwrites the index whole; compiling a brief twice gives the same brief.

**Testing:** unit tests on compile-brief fixtures; gate tests and text gates; the plan-mandated phase gate; the bench prompt runs on request only.

## Acceptance criteria
- [ ] `skills/fx-docs/SKILL.md` covers the nine content items, and each beside file is linked from the step that needs it.
- [ ] `final-review.md` offers the docs step before the branch pass and never invokes `fx-docs` without a yes; `completion.md`'s report list has a Docs line.
- [ ] `grep -l "docs-lookup.md" skills/fx-brainstorm/SKILL.md skills/fx-plan/SKILL.md skills/fx-review/SKILL.md skills/fx-debug/SKILL.md skills/fx-architecture/SKILL.md skills/fx-retro/SKILL.md commands/fx-retro.md` lists all seven files.
- [ ] `docs/adr/0062-*.md` and `docs/adr/0063-*.md` exist with numbered decisions and index rows; no other ADR changed.
- [ ] `scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `compile-brief.test.ts`, `brief-size.test.ts` and `user-invoked.test.ts`, and set `EXPECTED=22`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node skills/fx-implement/scripts/compile-brief.test.js` and `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/user-invoked.test.js`
Expected: no brief has a `## Docs and ADRs` section; user-invoked fails with `fx-docs is model-selectable`.

- [ ] **4. Implement the brief section**, then write the lane and its beside files, the docs step, the handling-reports line, the lookup reference and the six pointer lines, and run `scripts/gen-command-skills`

- [ ] **5. Run them: verify GREEN**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then each of `node skills/fx-implement/scripts/compile-brief.test.js`, `node tests/gates/brief-size.test.js`, `node tests/gates/user-invoked.test.js`, `node tests/gates/description-overlap.test.js`, `node tests/gates/skill-size.test.js` with the prefix. Expected: all pass.

- [ ] **6. Write ADRs 0062, 0063 and their index rows** by following `skills/fx-adr/SKILL.md`

- [ ] **7. Run the phase gate**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`. Expected: `ALL GREEN`. If `release-version.test.js` fails because main already carries this branch's version, raise the minor version in the four manifests and rerun.

- [ ] **8. Commit by path**

```
git add skills/fx-docs/SKILL.md skills/fx-docs/full-run.md skills/fx-docs/html-pages.md skills/fx-docs/docs-guide.md tests/lane-triggering/prompts/fx-docs.txt skills/fx-implement/references/final-review.md skills/fx-implement/references/completion.md skills/fx-implement/references/handling-reports.md references/docs-lookup.md skills/fx-brainstorm/SKILL.md skills/fx-plan/SKILL.md skills/fx-review/SKILL.md skills/fx-debug/SKILL.md skills/fx-architecture/SKILL.md commands/fx-retro.md skills/fx-retro/SKILL.md src/skills/fx-implement/scripts/compile-brief.ts src/skills/fx-implement/scripts/compile-brief.test.ts skills/fx-implement/scripts/compile-brief skills/fx-implement/scripts/compile-brief.test.js src/tests/gates/brief-size.test.ts tests/gates/brief-size.test.js src/tests/gates/user-invoked.test.ts tests/gates/user-invoked.test.js tests/conformance/rows/09-every-skill-discovered.sh README.md SURFACE.md docs/adr/0062-*.md docs/adr/0063-*.md docs/adr/index.md
git commit -m "feat(fx-docs): evidence-backed docs lane, an offered docs step, and seven lanes that read the docs"
```

Add `skills/fx-debug/quick-reference.md`, `src/tests/gates/description-overlap.test.ts` with its built file, and any changed manifests when the task changed them.
