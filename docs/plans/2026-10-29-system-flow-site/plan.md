# /fx:fx-system-flow, second iteration (the site that explains): implementation plan

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
**Goal:** rebuild the system-flow site from the owner's page structure, with prose (leads, bullets, glossary, code map) carried in a schema version 2 model, enforced by `check`, migrated by `system-flow migrate`, and proved on Shamel.Backend and the four Advantage repos.
**Architecture:** The model gains fields and two item kinds (`term`, `code`) in `src/lib/sf-model.ts` and the schema; sections merge across fragments; a new `src/lib/sf-prose.ts` holds the prose floor and the counts. The page renderer `src/lib/sf-page.ts` fills a new site template `references/system-flow/site-template.html` (the shared kit template returns to `main`), sequences are laid out as lifelines by a deterministic grid in `src/lib/sf-layout.ts`, and a new player `fx-flow-2.js` drives every figure card. The lane's sidecars, SKILL.md and ADR 0066 learn the prose duties; two headless proof runs close the work.
**Stack:** TypeScript under `src/` built per file by `scripts/build` (esbuild) into committed JavaScript; vendored elkjs; node `assert` tests run as processes; Playwright (scratch install, never a dependency of fx) for the browser checks; Markdown skills and references.
**Complexity:** High
**Risks:**
- HIGH: the prose floor applies to every whole-model `check` and `build`, so every existing system-flow test that builds a model fails the moment task 03 lands. Task 03 extends the fixture's `goodSet()` to a floor-meeting model and updates every test it breaks, in the same commit; expected chapter ids (`ch-01-s1` and so on) shift because four Start here chapters now come first.
- HIGH: `look` becomes required in task 01, so every fixture node and participant in 15 test files needs it. Task 01 adds it everywhere in one commit; nothing else changes in those tests.
- HIGH: proof runs need a real session. `/fx:fx-system-flow` is user-invoked (ADR 0055): no subagent may invoke it. Tasks 12 and 13 split into prep (agent), run (controller only: headless `claude -p --plugin-dir /development/fx/.worktrees/system-flow` on scratch copies) and results (agent).
- HIGH: the headless sessions need the owner's login. The controller copies the credential 0600 into a scratch `CLAUDE_CONFIG_DIR` and deletes the copy with `find -delete` at the end of its run step; nothing is written under `/home/faisal`.
- MEDIUM: section merge shares objects with fragment data, which `stampVerified` relies on to write stamps back. Task 02 tests that a bullet held in an area fragment's section is stamped in that file, not in `chapters.json`.
- MEDIUM: the page link label ("Open in archify" or "Open full diagram") needs the deep diagram outcome, which today is known only after the page is written. Task 07 moves the page write after the deep diagrams; a build that fails between them still writes nothing stamped.
- MEDIUM: browser behaviour (player, menu, filter) has no test in `scripts/check-all`. Tasks 06, 07 and 08 each extend one Playwright script, `proof/page-check.js` (TypeScript source under `src/docs/plans/2026-10-29-system-flow-site/proof/`), run on a fixture site, and task 11 adds the comparison; a browser failure there blocks the task like a failing test.
- MEDIUM: the scratch Playwright at `<PW>` lives under another session's `/tmp` folder. If it is gone, install `playwright` into `<SCRATCH>/pw` with `npm install --prefix <SCRATCH>/pw playwright` and `npx --prefix <SCRATCH>/pw playwright install chromium` with `PLAYWRIGHT_BROWSERS_PATH=<SCRATCH>/pw/browsers`, and use that path; record which one ran.
- LOW: tasks 01 to 09 share `src/lib/sf-build.ts`, `src/lib/sf-page.ts`, the fixture or `scripts/check-all`, and each ends in its own commit. Run them one at a time even where the frontier allows two (after 03 it allows 04, 05 and 09).
**Testing:** Unit: none beyond the CLI; every behaviour test runs `scripts/system-flow` as a process on `tests/helpers/sf-fixture.js` and asserts exit code, stdout JSON, stderr lines and written files · Integration: `scripts/check-all` (the `system-flow-*.test.js` lines, `visual-kit`, the new `site-template` gate, `skill-size`, `docs-lanes`, `user-invoked`) · E2E: `proof/page-check.js` (Playwright, Chromium) on a fixture site from task 06 on, then the migration proof and the two lane proof runs.

## Global Constraints

From the design, verbatim:

- No em or en dashes in any file, label, commit message or chat output.
- Labels and prose in English; Arabic only for real product strings and sample replies, wrapped as `<span lang="ar" dir="rtl">` on pages.
- Pages default to `lang="en" dir="ltr"` and use logical properties.
- Locale: the design names English with `lang="en" dir="ltr"` as the page default; logical properties keep `dir="rtl"` correct.
- Pages load only files under the site's `assets/`; no CDN, no network request.
- fx gains no runtime dependency; elkjs is loaded from `references/vendor/`.
- Edit `src/**/*.ts`, then run `scripts/build`; never hand-edit generated JavaScript.
- Every `skills/*/SKILL.md` stays under 20,000 bytes; references one level deep.
- A kit file's byte change renames it (`fx-flow-2.js`).
- Every string from a repository is HTML-escaped before it enters a page; inline JSON writes `<` as `\u003c` (`inlineJson` in `src/lib/sf-page.ts`).
- `references/visual/page-template.html` is identical to master at merge. (The base branch is `main`, at `6e2d88b`; "master" in the design means it.)
- `schemaVersion` is 2; a version-1 fragment is migrated by `system-flow migrate`, never by hand.
- Side menu column 240 px; collapse to the top bar below 900 px.
- Figures are drawn at 1:1 and never shrunk; no figure text under 12 px; a figure wider than its card scrolls inside the card; no page-level horizontal scroll at 390 px.
- A box figure is at most 860 px wide with at most 1 crossing; a lifeline sequence has at most 12 participants and fits 860 px up to 8.
- Chapter prose: lead 2 to 4 sentences, 4 to 8 bullets of at most 40 words, at least 100 words (120 to 200 expected); figure caption one sentence of 6 to 30 words; glossary 15 to 40 terms.
- Tests run with TMPDIR in the session scratchpad through `scripts/scratch-env`; nothing written or deleted under the owner's home or `/mnt`.
- Never type rm, trap, bash -c or sh -c; python3 runs with `-I` only.
- Each task commits its own paths on the `system-flow` branch (per-task commits, owner-approved); never push, merge or open a PR. No attribution trailers.

Carried from the first plan, still in force:

- `<SCRATCH>` is the session scratchpad. Every command a task runs is prefixed `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env`. Delete a tracked file with `git rm -q -- <path>`; leave scratch files in place.
- `<PW>` is `/tmp/claude-1000/-development-advantage-backend/41c30690-f980-4e40-a682-fd0bcbf989cf/scratchpad/e2e/pw` (Playwright with Chromium in `<PW>/browsers`). A browser script runs as `NODE_PATH=<PW>/node_modules PLAYWRIGHT_BROWSERS_PATH=<PW>/browsers node <script>`.
- The CLI's output contract: JSON on stdout, problems on stderr as `<file>:<pointer>: <message>` (file relative to the host root, pointer a JSON Pointer), or `system-flow: <cmd>: <message>` when no file applies; exit 0 on success, 1 on a failed check, 2 on usage.
- Ids match `^[a-z0-9][a-z0-9-]*$` and are unique per kind; handles are `<kind>:<id>`. This plan adds the prefixes `term` and `code`.
- Tests never delete what they create; fixtures live under `os.tmpdir()`, which `scripts/scratch-env` points into the scratchpad.
- Step 7 of every task: commit this task's paths on `system-flow`, staged by path with `git add -- <paths>` (never `-A` or `.`), with the message the task gives; never push, merge or open a PR. `fx-implement` reviews each task against its own commit.

Decided here (the design leaves them open):

- Prose problem messages, exact text, are listed in task 03 and nowhere else; tasks 04 and 10 quote them from there.
- The figure spec for a sequence and the step shape are fixed in task 05; tasks 07 and 08 consume them as written there.
- The page's DOM contract (ids, classes, slots) is fixed in tasks 06 and 07; the Playwright script and task 11 read only those names.
- Proof scripts (`fixture-site`, `page-check`, `compare`) are TypeScript under `src/docs/plans/2026-10-29-system-flow-site/proof/`, built by `scripts/build` to `.js` beside `results.md`: committed hand-written JavaScript fails `scripts/check-handwritten-js` (ADR 0046). Run as `node docs/plans/2026-10-29-system-flow-site/proof/<name>.js`.
- The player steps every 1.6 s; reaching the last step stops it for good (task 07).

## Review Focus

- A model with a Start here role but no section of another role, and a second `request` sequence named only by `chapter`: both count toward the role rules (task 03).
- A term that is a substring of a longer term ("Link" and "Short link"): the longer term links first and the shorter one does not link inside it (task 08).
- `migrate` on a set where `meta.json` is version 2 but an area fragment still says 1: the hint for that file, and migrate rewrites only it (task 04).
- A sequence whose only external participant receives a reply-only message: the reply is dashed and not marked as leaving (task 05).
- A figure with no steps (a level diagram whose nodes are all context): the bar shows `0 / 0`, Play disabled, no console error (task 07).
- `build --only` on a site whose deep pages came from archify: the card link still reads "Open in archify" and points at the first page on disk (task 07).
- The menu with JavaScript off at 1440 and 390, and a resize across 900 px with it on (task 06).

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | Schema version 2: new fields, `look`, glossary and code map items, the version-1 hint | none | `check` accepts version 2, lists `term:` and `code:` items, refuses version 1 with the migrate hint | MVP |
| 02 | Sections merge across fragments | 01 | an area fragment adds lead and bullets to a chapter `chapters.json` declares | MVP |
| 03 | The prose floor in `check` and `BuildResult.prose` | 02 | a thin chapter fails `check`; `build` reports words, leads, bullets, glossary and lifelines | MVP |
| 04 | `system-flow migrate` | 03 | version-1 fragments become version 2 in one command with the owed prose listed | MVP |
| 05 | Lifeline sequences end to end: layout, the `fx-flow-2` drawing, and the SVG fallback | 01, 03 | sequences laid out and drawn as lifelines by `fx-flow-2.js` (replacing `fx-flow-1`), box nodes with a second line and look, fallback pages from the same geometry | Core |
| 06 | Site template and the page shell | 02, 03, 05 | `index.html` from the new template: sticky grouped menu (open by `matchMedia` at 900 px and up, theme toggle in the phone bar), header, legend by look, chapter heads with lead and bullets, footer; kit template back to `main` | Core |
| 07 | Figure cards and the `fx-flow-2` player | 05, 06 | every figure in a card with caption, sticky control bar, Play that toggles to Pause, Back, Next, Reset, narration, autoplay every 1.6 s with pause and a stop at the last step, deep link by renderer (also under `--only`) | Core |
| 08 | Start here and Reference chapters, term links, the filter | 03, 07 | chapters 01 to 04 with their content, Glossary, Coverage with Not known yet, term links, the menu filter | Core |
| 09 | Markdown: leads, Start here docs, code map, captions, `glossary.md` | 03 | the docs carry what the page says | Core |
| 10 | The lane: sidecars, SKILL.md, ADR 0066 | 04, 08, 09 | planning, area brief, fragment guide, report and interview carry the prose duties; fx-docs sets `look` and stops on a floor failure; ADR 0066 amended | Core |
| 11 | Proof tooling, the owner's page baseline and the migration proof | 04, 08 | `proof/page-check.js` measure mode, the owner's numbers, `results.md` part Migration | Proof |
| 12 | Proof run (a): Shamel.Backend | 10, 11 | `results.md` part (a), the comparison table, the recalibrated estimate | Proof |
| 13 | Proof run (b): the four Advantage repos | 12 | `results.md` part (b) | Proof |

Frontier: 01; then 02; then 03; then 04, 05 and 09 (run one at a time); 06 after 05; 07 after 06; 08 after 07; 10 after 04, 08 and 09; 11 after 04 and 08; 12 after 10 and 11; 13 after 12.

Phases are review checkpoints, not merge points: the branch merges only after tasks 12 and 13 have run and the owner has read `results.md`. Each phase ends green on `scripts/check-all`.

## Deviations from the design

- **Test fixture.** The design's Testing Decisions name `scripts/make-git-fixture`; as in the first plan, tests use `tests/helpers/sf-fixture.js` (two git roots and one plain root), which task 03 extends with a floor-meeting `goodSet()`.
- **Browser checks before the proof.** The design checks browser behaviour only in the proof. Tasks 06 to 08 run the same Playwright script on a fixture site so a player or menu defect fails its own task, not the proof.
- **The version-1 hint covers the whole set.** When `meta.json` holds `schemaVersion` 1, every fragment gets the one hint line and nothing else is checked; a fragment that itself says 1 under a version-2 `meta.json` gets the hint alone (task 01).
- **`fx-flow-2.js` changes in place between tasks 05 and 07.** Task 05 creates it so the lifeline figures are drawn and validated the moment the layout changes (otherwise `fx-flow-1` would reject the new spec and the build would stay red until task 07); task 07 changes its bytes again without a rename, since no released page loads it. Its checksum row is updated in both tasks.
- **Reset kept, Play toggles to Pause** (owner change, 2026-10-29, design lines 230, 277, 395): task 07 tests both, and the proof table checks both.
- **Credential copy in the run step.** The controller, not the prep agent, copies the credential and archify into the scratch HOME and deletes the credential copy when its run ends (tasks 12, 13).
- **fx-docs is edited** (red-team finding 2): its model path sets `look` on nodes it adds and stops on a prose floor or migrate failure, pointing the owner to "Bring the prose up to date" (task 10). The design's Out of Scope excludes fx-docs pages, not its steps; without this, fx-docs breaks on every version-2 model.
- **Per-task commits** (red-team finding 10, owner-approved): design Global Constraints corrected to match.
- **The menu column is `aside#side`** with the name and theme toggle outside the `<details>`, so the phone bar shows the name and toggle with the list closed, as design "Below 900 px" requires (task 06).
- **`svgPage` writes the fx generated marker** so a later `--only` build can tell an SVG deep page from an archify one (task 07).

## Red-team findings: resolution

All 20 findings accepted by the controller. Each row names the task that owns the changed requirement and, where the change added a place the behaviour must appear, the task that owns that place.

| # | Finding, as resolved | Owner task | Added place, and its owner |
|---|---|---|---|
| 1 | The prose word floor is stated in the briefs; a 120 to 200 words warning goes back to the writer once | 10 | `area-brief.md` and `planning.md` gate phrases `120 to 200 words`, `at least 100 words`; `check-and-report.md` phrase on the one return round (10) |
| 2 | fx-docs sets `look` on nodes it adds and stops on a floor or migrate failure, pointing to "Bring the prose up to date"; the interview keeps chapters on the floor | 10 | `skills/fx-docs/SKILL.md` and `interview.md` added to Files and to the `docs-lanes` gate (10) |
| 3 | 05 blocked by 01 and 03; 06 blocked by 02, 03 and 05 | 05, 06 | Tasks table and frontier line (plan) |
| 4 | Version-1 hint test expects three lines, meta, level0, chapters, with the exact chapters line | 01 | none |
| 5 | `goodSet()` chapters at 120 words; `averageWords` 124; the 99, 100 and 201 word variants live only in `system-flow-prose.test.ts` | 03 | none |
| 6 | Under `--only`, a figure not rebuilt takes renderer and first page from deep pages on disk | 07 | `svgPage` generated marker (07); `system-flow-only.test.ts` (07) |
| 7 | The SVG fallback step list prints the caption without `Step <k>: `, then `where` | 05 | fallback `li` test (05) |
| 8 | Menu open state follows `matchMedia('(min-width: 900px)')`; closed with no JavaScript, desktop shown by `::details-content` or a visible summary | 06 | gate on the template; `resize` and `noScript` browser checks (06) |
| 9 | `checkProse(model, mode)` calls `fieldOrigin` and `originOf` itself | 03 | consumer signature in 04; note in 02 |
| 10 | Per-task commits on `system-flow`; never push, merge or open a PR | every task, step 7 | Global Constraints (plan); design Global Constraints corrected |
| 11 | Measure only the `section.chapter` elements whose `data-group` is `start` or `how`; the owner's number is question plus bullets | 11 | `results.md` Baseline wording (11); used by 12 and 13 through `compare.js` |
| 12 | Autoplay stops at the last step and clears playing, no resume; fixed 1.6 s interval | 07 | `interval`, `endStops`, `noResumeAtEnd` checks (07); the proof player measures (11) |
| 13 | Play button changes text Play and Pause, no `aria-pressed` | 07 | `playPause` check (07) |
| 14 | Theme toggle in the summary row below 900 px | 06 | `aside#side` DOM contract and `phoneBar` check (06) |
| 15 | Scroll spy check: `window.scrollY` unchanged by the spy, only `#menu.scrollTop` moves | 06 | `scrollSpy` check at 1440 x 900 and 1440 x 400 (06) |
| 16 | Gate: the `.card` rule has no overflow | 07 | `site-template` gate (07) |
| 17 | The `validateMapData` page assertion moves to `system-flow-site.test.ts` | 08 | `system-flow-page.test.ts` in Files (08) |
| 18 | Root Markdown `index.md` links `start-here/index.md` and `glossary.md` | 09 | Root index test (09) |
| 19 | A step caption strips a trailing `.`, `!` or `?` from the label before the period | 05 | one test (05); the narration in 07 shows the caption as built |
| 20 | Rerun migrate only on a clean tree, undo with `git restore` on the fragments; short glossary gets one extra round; a failed proof pass line is recorded and reported, never tuned | 10, 12, 13 | `SKILL.md` and `check-and-report.md` gate phrases (10); the Tests field and a results step in 12 and 13 |

Also from the controller: the player keeps Reset and the Play/Pause toggle (task 07, unchanged).

### Coverage walk over what changed (fx-plan §6.1)

- Design "Error handling" row "The glossary is under 15 terms": the extra round is now asserted (10, finding 20); before, only the lane text carried it.
- Design "Below 900 px" (name and theme toggle in the bar, `<details>` that opens without JavaScript): owned by 06 through `aside#side`, `phoneBar`, `noScript` and `resize`.
- Design "Menu" scroll spy that "scrolls the menu itself (never the page)": 06, `scrollSpy`.
- Design "Cards" (autoplay, Play or Pause, Reset kept): 07; the interval and end stop are plan decisions recorded in Decided here.
- Design "Error handling" row "A prose rule fails" (2 rounds, then the owner): 10 for the lane, and fx-docs now meets the same failure (10).
- Design "Migration" (rerun path runs `migrate`): 10, with the clean tree and undo.
- Design "Markdown" (`start-here/` and `glossary.md` reachable): 09, root index test.
- Design "Proof" table, first row (question, lead, bullets per chapter): 11 fixes the chapter set; 12 and 13 consume it.
- No requirement lost an owner: tasks 01 to 13 still cover every design heading they cited before, and every `**Design:**` heading resolves (`compile-brief` exits 0 on all 13 tasks).
