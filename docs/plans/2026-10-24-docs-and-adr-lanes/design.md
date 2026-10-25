# ADR lane, visual kit and documentation lane

**Date:** 2026-10-25
**Status:** ready-for-agent. Built after the upstream update (`docs/plans/2026-10-24-upstream-update/`) ships.
**Approved:** 2026-10-25
**Glossary:** fx has no GLOSSARY.md; terms follow PREAMBLE.md and the ADRs. This design uses GLOSSARY.md and GLOSSARY-MAP.md for a repo's glossary, as the upstream update renames them.

## Problem Statement

The owner keeps decisions, issues and system documentation in several repos (fx, advantage-backend, Shamel.Backend, system-flow), and fx helps with none of it in a consistent way.

- **Decisions.** fx has no lane that writes an ADR. `domain-modeling.md` carries a one-paragraph format and fx-architecture offers an ADR when a candidate is rejected, but nothing keeps an index, follows the repo's own format, or handles supersession. The result is visible in fx's own records: ADR 0049 superseded all of 0047 and 0048 while parts of them still held, which forced 0050 to 0052 to restate the surviving decisions, and 0047's body was edited after the fact. advantage-backend's ADR 0030 was rewritten in place. Nobody can tell from the newest ADR alone what is in force.
- **Records.** A fixed bug leaves no record beyond a commit message. Design, PR description and retro templates are scattered across lanes or exist only inside the upstream update's new commands. Issues in advantage-backend live in `.scratch/`, which the owner wants retired.
- **Pages.** fx-architecture and fx-audit each write an HTML report from a Tailwind and Mermaid scaffold. The owner's best page, system-flow's, was built by hand outside fx: chapters, evidence on every fact, a drill-down map, light and dark, checked at two widths. No lane can produce it again.
- **Docs.** After fx-implement merges a change, the repo's docs say what the code did before it. Nothing checks a doc claim against the code, nothing finds docs elsewhere that went stale, and no lane reads the docs or ADRs before touching an area, so a lane can re-decide something a doc or ADR already settled.

## Solution

One design, three phases, each mergeable on its own and each passing `scripts/check-all`, in this order:

1. **Phase A: the ADR lane and shared record templates.** A new model-selectable lane, `fx-adr`, writes ADRs in the repo's own format, keeps the index, and supersedes by carrying still-valid decisions forward. A new `references/templates/` folder holds the ADR, design, PR description, retro and bug report templates. fx-debug ends by writing a bug report to `docs/issues/<date>-<slug>.md`. Issues are committed under `docs/issues/`, `.scratch/` is retired, and throwaway material goes to `.fx/`.
2. **Phase B: the visual kit.** `references/visual/` holds the page design generalised from system-flow's page template, the map, the SVG recipes, the archify adapter and the visual check, with the page libraries vendored once in fx. No new skill. fx-architecture and fx-audit move their reports onto it. Each diagram is archify, animated SVG or static SVG, chosen per diagram.
3. **Phase C: the docs lane, then the lanes-read-docs wiring.** A new lane, `fx-docs`, keeps Markdown docs with evidence lines as the source, optional HTML in `docs/html/<area>/`, follows the repo's structure and flavour, interviews the owner on a first full run, and runs a two-pass stale check. fx-implement runs it after the exit gate and before the merge question. Last, seven lanes read the docs and ADRs for the paths they touch through one reverse index from code path to doc claims.

## User Stories

Phase A: ADR lane and record templates

1. As the owner, I want to say "record this decision" and get an ADR in the repo's own format and numbering, so that fx's records look like the ones already there.
2. As the owner, I want fx to offer an ADR when a brainstorm, a ruling or a review settles something durable, so that a decision is recorded while its reasons are still in the session.
3. As the owner, I want an offer only when the decision is hard to reverse, surprising without context and the result of a real trade-off, so that the ADR folder does not fill with obvious choices.
4. As the owner, I want the ADR index kept current with a status per ADR (current, partly superseded or superseded), so that one table tells me what holds.
5. As the owner, I want an ADR never edited beyond its status line, so that a record says what was decided when it was decided.
6. As the owner, I want a superseding ADR to name exactly which decisions it replaces and carry every still-valid decision forward under "Still in force", so that the newest ADR alone tells the current story.
7. As the owner, I want the old ADR's status line to name what replaced which part ("Partly superseded by 0053: decisions 2 and 4"), so that a reader of the old record is sent to the right place.
8. As the owner, I want an ADR in a repo that lists its ADRs in `mkdocs.yml` added to that nav too, so that the docs site shows it.
9. As the owner, I want a decision that spans projects proposed to fbrain through `fbrain propose`, never copied into it, so that the repo keeps its own record and the brain keeps the cross-project one.
10. As the owner, I want every fixed bug to leave `docs/issues/<date>-<slug>.md` with symptom, reproduction, root cause with file and line evidence, fix, guarding test and the prevention question, so that the next debugger and `/fx:fx-retro` start from evidence.
11. As an agent, I want one template per record type in one folder, so that an ADR, a design, a PR description, a retro and a bug report each have one shape wherever they are written.
12. As the owner, I want issues committed under `docs/issues/` and throwaway material kept in a git-ignored `.fx/`, so that issues travel with the code and drafts never get committed by accident.
13. As the owner, I want fx to offer once to move a repo's `.scratch/` issues into `docs/issues/`, with git and with the pointers updated, so that advantage-backend migrates without anything moving behind my back.

Phase B: visual kit

14. As the owner, I want every HTML page fx writes to share one design (chapters, evidence per fact, a drill-down map, light and dark), so that a report and a docs page read the same way.
15. As the owner, I want each page to work offline from libraries copied into the repo, so that opening a page sends nothing off the machine.
16. As the owner, I want fx to choose archify, animated SVG or static SVG per diagram and state the pick and reason in one line, so that a cheap sketch is not rendered as an interactive diagram and the reverse.
17. As the owner, I want to set a level for a whole run (cheap, fast, detailed), and be asked first only when a run would be expensive, so that I control cost without answering a question per diagram.
18. As the owner, I want SVG diagrams when archify is not installed, so that a page is never blocked on a skill I lack.
19. As the owner, I want every page checked in light and dark at 1440 and 390 px wide, so that a page that breaks on a phone or in dark mode does not ship.
20. As the owner, I want fx-architecture's and fx-audit's reports on the same kit, so that I learn one page layout.
21. As the maintainer, I want the kit to add nothing to the skill selection list, so that no new claimant enters the contest.

Phase C: docs lane and lanes-read-docs

22. As the owner, I want fx to update the docs a branch's changes affect after fx-implement and before it asks how to merge, so that docs merge together with the code they describe.
23. As the owner, I want every factual claim in a doc to carry an evidence line (path, lines, symbol), so that a claim can be checked by a machine and by me.
24. As the owner, I want fx to write a new doc when a change adds something no doc covers (an engine, a subsystem, a public flow, a command, an integration), asking me only what the code cannot answer.
25. As the owner, I want docs elsewhere that a change made stale listed, so that I see them before merge even when the branch did not touch them.
26. As the owner, I want the docs to follow my repo's structure, docs guide and Markdown flavour (MkDocs Material features where `mkdocs.yml` uses Material, GitHub callouts and Mermaid otherwise), so that fx's pages fit beside mine.
27. As the owner, I want a default docs guide only when my repo has none, so that fx never overrides the guide I wrote.
28. As the owner, I want a full documentation run on request or the first time on a repo, covering overview and architecture, flows, data and stores, and operations and onboarding, so that a new repo gets a complete doc set.
29. As the owner, I want a first full run to read the code first, draft everything, then validate it with me (purpose and users, history and decisions, operations), so that my time goes to what the code cannot say.
30. As the owner, I want to skip that interview and have every unconfirmed claim marked as an open question in the doc, so that nothing I did not confirm is stated as fact.
31. As the owner, I want a stale check that passes a claim free when its cited lines are unchanged and re-reads every other claim against the code, so that the check is cheap on a small change and complete on a large one.
32. As the owner, I want stale claims listed and re-verified, never silently rewritten, so that I see what changed in the docs and why.
33. As the owner, I want an ADR whose decision the code no longer follows flagged by the same stale check, so that a drifted decision surfaces.
34. As the owner, I want optional HTML pages in `docs/html/<area>/` that present the same facts their own way, so that I can show a system to a newcomer without rewriting the Markdown.
35. As the owner, I want doc prose and labels in English with Arabic only for real product strings and sample replies, so that docs are readable by the whole team.
36. As an agent in brainstorm, plan, implement, review, debug, architecture or retro, I want the docs and ADRs that cite the paths I touch handed to me, so that I do not re-decide a settled question.
37. As the owner, I want a lane that finds a doc wrong to hand it to the docs step, with the code winning, so that a wrong doc gets fixed and never followed.

## Implementation Decisions

### Phase A: ADR lane

- **A new lane, `fx-adr`, model-selectable** (no `disable-model-invocation`). It is the one claimant for writing, superseding and indexing ADRs. Its description is a trigger list: "record this decision", "write an ADR", "supersede ADR", "is this ADR still current", plus the stakes line every fx description carries.
- **One claimant per intent.** `domain-modeling.md` keeps its three tests for when an ADR is worth offering and loses its ADR format section; the format moves to the ADR template. fx-architecture's "offer an ADR" line, and the new offers in fx-brainstorm, fx-review and fx-implement's ruling report, become pointers to `fx-adr` (ADR 0006: pointers, never invocations). The offer passes the three tests or is not made.
- **The repo's own format.** Before writing, the lane reads the existing ADRs: file naming and numbering (`NNNN-slug.md`, `ADR-NNN-slug.md`), the heading form, how status is written (a `Status:` line, a `## Status` section, a bullet), and the sections in use. The new ADR copies that shape and takes the next number. A repo with no ADRs gets the fx template in `docs/adr/`.
- **Numbered decisions.** An ADR the lane writes numbers each decision in its Decision section, so a later ADR can name "decisions 2 and 4". An older ADR whose decisions are not numbered is named by quoting each replaced decision's lead phrase.
- **Supersede rule.** An existing ADR is never edited beyond its status line. A superseding ADR has a "Supersedes" line naming each replaced decision and a "Still in force" section restating every decision of the old ADR that still holds, so the newest ADR alone is the current story. The old ADR's status line becomes "Superseded by NNNN" or "Partly superseded by NNNN: decisions 2 and 4".
- **The index.** The lane keeps the repo's ADR index (an `index.md` or `README.md` in the ADR folder) and creates `index.md` there when none exists. One row per ADR with number, title, date and status. Status is one of current, partly superseded (with the ADR that did it) or superseded; a repo whose index already uses its own words (Shamel's Proposed, Accepted, Deprecated, Superseded, Ignored) keeps them, with "Partly superseded by NNNN" added. When `mkdocs.yml` lists ADRs in its nav, the lane adds the new one there.
- **Evidence for drift.** Each numbered decision may carry an evidence line naming the code it governs, in the same form docs use (Phase C). Until Phase C ships these lines are inert; afterwards the stale check reads them.
- **fbrain.** When fbrain is installed and a decision spans projects, the lane proposes a short note through `fbrain propose` that links the ADR. It never copies the ADR into the brain.
- **Commits.** The lane writes files and stages nothing on its own when invoked standalone; inside fx-implement the ADR is committed with the task that made the decision.

### Phase A: shared record templates

- **One folder, `references/templates/`, five files:** ADR, design, PR description, retro and bug report. Each is a leaf under `check-reference-leaves`: no template links another.
- **Design.** `references/design-template.md`, as the upstream update leaves it (Approaches section and anti-goals included), moves into the folder. Every pointer to it moves with it.
- **PR description and retro.** The shapes the upstream update gives `/fx:fx-pr` and `/fx:fx-retro` move out of those commands into templates; the commands point at them. Their content does not change.
- **ADR.** The fx default for a repo with no ADRs: title, status line, date, context, numbered decisions, consequences, alternatives only when worth remembering, and "Supersedes" and "Still in force" when superseding.
- **Bug report.** Status (fixed), symptom, reproduction, root cause with file and line evidence, fix, the guarding test, and the prevention question with a pointer to `/fx:fx-retro`.
- **Not moved:** `audit-template.md` stays where it is; it is one lane's skeleton, used by fx-audit alone.

### Phase A: fx-debug bug report

- **At the end of Phase 6,** after the cleanup checklist, fx-debug writes `docs/issues/<date>-<slug>.md` from the bug report template and commits it with the fix. The prevention question Phase 6 already asks (upstream update) becomes the report's last section.
- **Size.** fx-debug is 18,540 bytes before the upstream update adds to it. The step is a checklist line and a template pointer, no inline template, so the SKILL.md stays under 20,000 bytes.
- **A debug session with no fix** writes no report.

### Phase A: issues and `.fx/`

- **Issues** are committed under `docs/issues/`. A bug report is a flat file, `<date>-<slug>.md`. A migrated feature directory keeps its own directory under `docs/issues/`, spec and numbered issues included.
- **`.fx/`** holds drafts, test material and anything regenerated (Phase C's reverse index). fx-setup adds it to the repo's local exclude file, as fx-audit already does for its drafts.
- **`.scratch/` is retired** in fx's own text: fx-brainstorm's "Never `.scratch/`" line names `docs/issues/` and `.fx/` instead, and the COVERAGE rows that mention it are corrected.
- **Migration.** fx-setup, when it finds a `.scratch/` with issues, asks once to move them. On yes it moves them into `docs/issues/` with git and updates the pointers in CLAUDE.md, AGENTS.md, repo.md and the repo's issue tracker doc (advantage-backend's `docs/agents/issue-tracker.md`). On no it records the answer in `.fx.json` and stops asking, the same pattern as the upstream update's glossary rename.

### Phase B: visual kit

- **References, not skills.** `references/visual/` is loaded on demand by any lane that writes a page. It adds nothing to the skill selection list. Its files, each a leaf:
  - **tokens:** the color tokens for light and dark, from system-flow's page template (paper, panel, ink, muted, rule, and the accent set), with the theme switch that remembers the reader's choice;
  - **page template:** chapters with a lead question, bullets with evidence per fact, an evidence toggle, a legend, and the slot for the map; written with logical CSS properties so a page set to `dir="rtl"` lays out correctly;
  - **map:** the React Flow and ELK drill-down map, where a node with children opens the next level and each node and edge shows its evidence in a side panel; the diagram structure is an inline JSON block the page reads, laid out by ELK in the browser;
  - **animated SVG recipe** and **static SVG recipe;**
  - **archify adapter:** how to render a spec with archify into a given folder, used only when archify is installed;
  - **assets:** the vendored libraries with version, source URL, SHA-256 and licence, and the copy, missing-file and mismatch rules generalised from `report-assets.md`, which the kit replaces;
  - **visual check:** what to check and at which sizes.
- **Vendored once in fx.** React 18.3.1, React DOM 18.3.1, React Flow 11.11.4 (script and stylesheet) and elkjs 0.9.3 join `references/vendor/` with their licences, at the versions system-flow runs. A page copies them into its output root's `_assets/` folder only when no file of that name is there; a mismatched checksum is reported and left alone. Output roots: `docs/plans/_assets/` for reports, `docs/html/_assets/` for docs pages (Phase C).
- **Diagram choice per diagram.** archify for detailed, interactive or many-level diagrams; animated SVG for small flows that need motion; static SVG for the cheapest sketch. The lane states its pick and reason in one line. The owner can set cheap, fast or detailed for the whole run. The lane asks first only when the run would render many archify diagrams. With no archify, every diagram is SVG. A Mermaid diagram belongs in Markdown only; HTML pages do not load Mermaid.
- **Visual check.** Every page is opened in light and dark at 1440 and 390 px and checked for console errors, a map that reaches every level, and text that fits. archify diagrams use archify's own browser check. Where the runtime has no browser, the lane says the check did not run and names the page; it never claims the page was checked.
- **Language.** Labels and prose in English; Arabic only for real product strings and sample replies, marked so they render right to left inside an English page.

### Phase B: fx-architecture and fx-audit on the kit

- **fx-architecture's report** keeps its content rules: candidate cards, badge row, files, problem, solution, wins in glossary terms, before and after diagrams, ADR callout, top recommendation. Its scaffold, styling and diagram patterns come from the kit instead of Tailwind and Mermaid. Before and after diagrams are static or animated SVG by default, archify when the owner sets detailed. The report path and the "never publish" rule do not change.
- **fx-audit's Phase 4 report** renders `design.md` with the kit page template and the same copy rules. Its gates and resume rules do not change.
- **Tailwind and Mermaid** stay in `references/vendor/` until no fx page loads them, then are removed in the same phase. A repo's existing `docs/plans/_assets/` copies are never deleted, so old reports keep opening.

### Phase C: docs lane

- **A new lane, `fx-docs`, model-selectable.** It owns writing, updating and checking system documentation. Triggers: "document this", "update the docs", "are the docs current", "document the system". fx-design keeps how a screen looks, fx-humanize keeps prose tone, fx-adr keeps decisions.
- **Source of truth.** The Markdown, with an evidence line on every factual claim: path, lines and symbol, in one form that both a reader and a parser accept. An owner-confirmed fact cites the owner and the date in place of a path. No separate JSON system model.
- **Unconfirmed claims** are written as open questions in the repo's callout form, never stated as fact.
- **Layout.** `docs/<area>/*.md` in folders, with Mermaid, always present. Optional HTML mirrors the folders in `docs/html/<area>/`, with diagram specs in `docs/html/<area>/src/`. In a repo that already has a docs structure, the lane writes into it and restructures only when told to.
- **Flavour.** `mkdocs.yml` with the Material theme present: Material features (admonitions, cards, tabs). Otherwise GitHub callouts and Mermaid. Never MkDocs admonitions in a repo not on MkDocs.
- **Docs guide.** The repo's guide wins. With none, the lane uses its default guide (shipped beside its SKILL.md, from Shamel's `docs-guide.md`: lead sentence, callouts, real numbers, mark unbuilt things, title case) and does not write it into the repo unless asked.
- **After fx-implement (branch mode).** fx-implement, after the exit gate and before "Then ask, and stop", invokes `fx-docs` in the worktree on the branch's diff. The lane:
  1. finds the claims citing changed paths through the reverse index;
  2. updates the docs those claims live in and verifies every claim in those docs;
  3. lists docs elsewhere that the change made stale;
  4. writes a new doc when the change adds an engine, subsystem, public flow, command or integration that no doc covers, asking the owner only what the code cannot answer;
  5. commits the doc changes on the branch.
  The completion report gains a "Docs" line: updated, written, listed stale.
- **Full run,** on request or when no doc in the repo carries an evidence line. The doc set: overview and architecture, flows, data and stores, operations and onboarding, named and placed to fit the repo. The lane reads the code and structure first, drafts everything, then interviews the owner, asking most about purpose and users, history and decisions, and operations. The owner can skip the interview.
- **Stale check, two passes.** Each doc records the commit it was last verified at. Pass one: a claim whose cited lines are unchanged between that commit and HEAD passes free. Pass two: every other claim is re-read against the code, using semble to find where the symbol or behaviour lives now, repowise when semble is missing or comes up empty, then grep. A stale claim is listed with its old and new evidence and re-verified; nothing is rewritten without being listed. ADR decisions with evidence lines go through the same check, and a drifted ADR is reported for `fx-adr`, never edited by the docs lane.
- **HTML pages** use the Phase B kit and present the facts their own way (chapters, drill-down map, interactive diagrams), never a copy of the Markdown prose. Each fact on a page carries the evidence its Markdown claim has. When an area's Markdown changes, its HTML pages are listed as out of date and rebuilt on request.
- **fbrain.** Repo docs stay in the repo. Cross-project decisions, status and lessons go to fbrain through `fbrain propose`, never copies of docs.
- **Size.** The lane's SKILL.md stays under 20,000 bytes; the full-run interview and the HTML steps live in files beside it, each pointed to from the step that needs it.

### Phase C: lanes read the docs

- **One reverse index** from code path to the doc claims (and ADR decisions) citing it, built from the evidence lines by a TypeScript module with a small command that writes it to `.fx/` and rebuilds it when a doc is newer than the index. The stale check and the lanes use the same index.
- **Seven readers:** fx-brainstorm, fx-plan, the implementer brief fx-implement compiles, fx-review, fx-debug, fx-architecture and `/fx:fx-retro` look up the paths they touch and read the claims and ADRs returned. Each lane gets one pointer line to a shared reference that says how to query and what to do with the result.
- **Docs are claims; the code wins.** A lane that finds a doc claim wrong does not follow it and does not fix it: it names the claim in its output for the docs step, and fx-implement's docs step picks it up.
- **No index, no change.** In a repo with no evidence lines the lookup returns nothing and each lane behaves as it does today.

## Testing Decisions

Good tests here check external behaviour: a gate's exit code and message, the files a lane writes, which docs a lookup returns, the bytes a page loads. Never the wording of a rule.

Confirmed seams, all existing:

- **`src/tests/gates/*.test.ts`.**
  - `user-invoked.test.ts`: `fx-adr` and `fx-docs` are model-selectable, and the user-invoked set is unchanged.
  - `description-overlap.test.ts`: the two new descriptions do not overlap any existing lane's triggers.
  - The upstream update's size gate covers fx-debug, `fx-adr` and `fx-docs`.
  - A new gate test for the kit: every page template and recipe loads only files named in the assets table, names no `http` or `https` host, and every vendored file exists with the table's SHA-256.
- **`src/lib/*.test.ts`,** for the code Phase C adds:
  - the evidence-line parser: a path claim, an owner claim, a malformed line reported with its doc and line;
  - the reverse index: a fixture docs tree gives the expected path-to-claims map, ADR decisions included;
  - stale check pass one, on a git fixture made with `scripts/make-git-fixture`: unchanged cited lines pass, an edit inside a cited range or a deleted file sends the claim to pass two;
  - the empty case: no evidence lines, empty index, no error.
- **`check-all` text gates.** `check-paths` resolves every moved template pointer and every new reference pointer; `check-reference-leaves` covers `references/templates/` and `references/visual/`; `check-prose` covers every new Markdown file; the manifest and collision checks cover the two new skills.
- **Conformance rows.** "Every skill discovered" covers `fx-adr` and `fx-docs` on each harness.
- **The live lane-triggering bench, on request only:** "record this decision" invokes `fx-adr`; "update the docs for this change" invokes `fx-docs`; neither fires on an unrelated prompt; fx-architecture still wins its own prompts after its ADR offer becomes a pointer.

Prior art: `src/tests/gates/user-invoked.test.ts`, `description-overlap.test.ts`, `lens-content.test.ts`, `src/lib/*.test.ts`, `scripts/make-git-fixture`, `tests/conformance/rows/`, and the bench the upstream update names.

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

## Out of Scope

- A JSON system model or a page build script in the system-flow style. Markdown is the source; HTML is written from it.
- Hosting, publishing or deploying docs or pages, and a CI job for the stale check (ADR 0012's "No CI" stands).
- Owning a browser driver. The visual check uses one the runtime already has, or archify's, and reports when none is there.
- Rewriting or restructuring a repo's existing docs or ADR format without the owner's instruction.
- Editing old ADRs to the new supersede rule, numbering their decisions, or rewriting fx's own 0047 to 0052.
- Bug reports for debug sessions that end with no fix, and a triage workflow for `docs/issues/` beyond the bug report and the migration.
- A design reference corpus beyond the kit's tokens (ADR 0012).
- Translating docs into Arabic.
- Migrating any repo's `.scratch/` without the owner's yes.
- The upstream update's work (glossary rename, `/fx:fx-pr`, `/fx:fx-retro`, the size gate): this design builds on it and changes none of it.

## Open Questions

None. Every question below was settled with the owner in interview rounds R0 to R5. Where two lines disagree, the later round holds: R3's Markdown source of truth replaces R1's evidence model, R5's visual kit replaces R2's shared HTML design, and R5's order replaces the three-project list in the earlier draft.

- [x] What the docs step does after fx-implement → update the docs the branch's changes affect, check every claim in them against the code, list docs elsewhere that now look stale, and write a new doc when the change adds something no doc covers (new engine, subsystem, public flow, command, integration), asking the owner only what the code cannot answer. Full system documentation only on request or the first time on a repo. (R1)
- [x] Source of truth → an evidence model in the system-flow style; Markdown is always generated from it, HTML on request from the same model and the shared template. (R1)
- [x] Issues and triage → committed under `docs/issues/`. Temporary and test material goes to `.fx/` (git-ignored); `.scratch/` is retired. advantage-backend's `.scratch/` issues move to `docs/issues/`. (R1)
- [x] Order → the upstream update (superpowers, mattpocock-skills, humanizer) ships first. (R1)
- [x] Diagrams → chosen per diagram, never one setting per repo (R2): archify for detailed, interactive or many-level diagrams; animated SVG for small flows that need motion; static SVG for the cheapest sketch. fx states its pick and reason in one line; the owner can set a level for the whole run (cheap, fast, detailed); fx asks first only when a run would be expensive (many archify renders). No archify installed: SVG only.
- [x] ADR lane → a new lane, required, used across all systems. (owner, R0)
- [x] fbrain boundary → repo docs stay in the repo; cross-project decisions, status and lessons go to fbrain through `fbrain propose`, never copies of docs. (confirmed R3)
- [x] Layout → docs/<area>/*.md in folders with Mermaid, always present; docs/html/<area>/ mirrors the folders for the optional HTML (system-flow style pages, archify or SVG diagrams, diagram specs in docs/html/<area>/src/). Modelled on Shamel.Backend/docs. (R3, owner)
- [x] Source of truth (reopens R1; owner undecided, fx's call R3) → the Markdown with machine-checkable evidence lines (path, lines, symbol) on every factual claim. HTML is its own presentation of the same facts, laid out its own way (chapters, drill-down map, interactive diagrams), never a copy of the Markdown prose. No separate JSON system model; only diagram structure lives in docs/html/<area>/src/.
- [x] Markdown flavour → follow the repo: mkdocs.yml with Material present uses its features (admonitions, cards, tabs); otherwise GitHub callouts (> [!NOTE]) and Mermaid, which GitHub renders and MkDocs can render with a callouts plugin. Never MkDocs admonitions in a repo not on MkDocs. (R3)
- [x] Structure and docs guide → adapt to the structure and docs guide the repo already has; restructure only when told to. fx ships a default guide (from Shamel's docs-guide.md: lead sentence, callouts, real numbers, mark unbuilt things, title case) used only when the repo has none. (R3)
- [x] Doc set for a full run → overview and architecture, flows, data and stores, operations and onboarding; named and placed to fit the repo's existing structure. (R3)
- [x] First full run → read the code and structure first, draft everything, then validate it with the owner, asking most about purpose and users, history and decisions, and operations. The owner can skip the interview; anything unconfirmed is marked as an open question in the doc, never stated as fact. (R4)
- [x] Stale check → two passes (R4): claims whose cited lines are unchanged since last verified (git diff on those lines) pass for free; every other claim is re-read against the code, using semble (fallback repowise, then grep) to find where the symbol or behaviour lives now. Stale claims are listed and re-verified, never silently rewritten.
- [x] Shared HTML design → system-flow's page template (chapters, evidence per fact, React Flow map with ELK layout, light and dark, checked at 1440 and 390 px); fx-architecture and fx-audit move onto it. (R2)
- [x] HTML libraries → vendored once into the repo (docs/_assets style), pages work offline, no CDN. (R2)
- [x] Doc language → English prose and labels; Arabic only for real product strings and sample replies. (R2)
- [x] ADR lane duties (R4) → write ADRs from decisions ('record this decision', and offered when brainstorm, a ruling or a review settles something durable), in the repo's own format and numbering; keep the ADR index with a status per ADR; flag ADRs whose decision the code no longer follows, through the docs stale check.
- [x] Supersede rule (R4, owner) → an ADR is never edited beyond its status line. A new ADR replaces named decisions and carries every still-valid decision of the old one forward in a "Still in force" section, so the newest ADR alone tells the current story. The old ADR's status names exactly what was replaced ("Partly superseded by NNNN: decisions 2 and 4"). The index shows current, partly superseded or superseded. Lesson: 0049 superseded all of 0047 while parts still held, which forced 0050 to 0052.
- [x] Owner's example docs → Shamel.Backend/docs (MkDocs Material, folders by audience and area, adr/, diagrams/src archify specs, docs-guide.md) and system-flow. (R3)
- [x] Visual kit (R5) → references, not skills: references/visual/ (color tokens, page template, React Flow and ELK map, animated SVG recipe, static SVG recipe, archify adapter used only when installed, visual check), loaded on demand by any lane; libraries vendored once in fx and copied into a repo when a page needs them. Adds nothing to the skill selection list. Replaces project B "shared HTML design".
- [x] Lanes read the docs (R5) → built as the docs project's last phase: brainstorm, plan, implement brief, review, debug, architecture and retro read the area docs and ADRs for the paths they touch, through one reverse index (code path to the doc claims citing it) that the stale check also uses. Docs are claims: the code wins, and a lane that finds a doc wrong hands it to the docs step.
- [x] Order (R5) → ADR lane, then visual kit, then docs lane (with the lanes-read-docs wiring), all after the upstream update.
- [x] Bug report (R5, owner) → fx-debug ends by writing docs/issues/<date>-<slug>.md (status fixed): symptom, reproduction, root cause with file and line evidence, fix, the guarding test, and the prevention question that feeds /fx:fx-retro. Its template lives in a shared references/templates/ folder with the ADR, design, PR description and retro templates. Built in the ADR project, which becomes "ADR lane plus shared record templates".

24 settled, 0 open.

## Further Notes

- **Prior art.** system-flow (`/mnt/c/Users/Faisal/Desktop/system-flow/system-flow`): `model/page-template.html` gives the tokens, chapter layout and map; `model/build-page.mjs` shows the ELK layout and the evidence blocks; `model/corrections.md` shows why every fact needs evidence; its `vendor/` folder pins the library versions above. Its evidence shape (path, lines, symbol) is the evidence line's shape. Shamel.Backend's `docs/` and `mkdocs.yml` give the MkDocs Material flavour, the default docs guide and an ADR index with statuses. advantage-backend's `docs/adr/` (bullet status lines, no index) and `docs/agents/issue-tracker.md` (the `.scratch/` layout to migrate) are the other formats the ADR lane and the migration must handle.
- **Size of the vendored set.** elkjs is about 1.6 MB of the roughly 1.9 MB system-flow vendors. It is copied into a repo only when a page that loads the map is written.
- **MkDocs and `docs/`.** A repo on MkDocs serves everything under its `docs_dir`, so `docs/html/`, `docs/issues/` and `docs/plans/` reach the built site unless the repo excludes them. On its first run in such a repo the docs lane proposes adding those folders to `mkdocs.yml`'s exclude list (`exclude_docs`) and adds them on the owner's yes (owner, at approval).
- **Each phase's records.** Phase A adds an ADR for `fx-adr` and the supersede rule, and one for `references/templates/` and the retirement of `.scratch/`. Phase B adds one for the visual kit replacing the Tailwind and Mermaid reports. Phase C adds one for `fx-docs` and the evidence-line source of truth, and one for the reverse index and the lanes that read it. Each is written by `fx-adr` once Phase A has shipped.
