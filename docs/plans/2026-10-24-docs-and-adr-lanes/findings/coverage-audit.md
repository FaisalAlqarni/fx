# Coverage audit: design vs tasks 01 to 06, plan rulings S1 to S8, state.md rulings

Read-only audit. Sources: design.md (37 stories, every Implementation Decisions bullet of Phases A, B, C), tasks/01 to 06, plan.md (S1 to S8), state.md (pre-flight and fix-round rulings). Where I checked the built branch (HEAD b2c616e) I say so; the audit question is about the plan, and the branch shows the gaps were carried through.

Result: 9 gaps (G1 to G9). 6 of 9 are behaviours the design commits to that no acceptance criterion or ruling carries. The rest are weak or refusal-only criteria. Everything not listed in Gaps is owned, see the ownership map at the end.

## Gaps

### G1. Story 10, second half: nothing makes the next debugger or `/fx:fx-retro` read the bug reports (tasks 02, 06)
Story 10: reports exist "so that the next debugger and `/fx:fx-retro` start from evidence". Task 02 owns only the write side (fx-debug Phase 6 line). Task 05 defines a "doc" as `docs/**/*.md` outside `docs/issues/`, so the reverse index and every `docs-lookup.md` pointer exclude reports on purpose. `commands/fx-retro.md` `## Read` lists the docs lookup, ledger, cost, corrections and transcripts, not `docs/issues/`. fx-debug's Inputs section has no read of past reports. Verified on the branch: the only `docs/issues` mentions in skills/commands/references are the write line and the migration. A half-owned story: the file is created, nothing reaches it.
Fix: one line in `commands/fx-retro.md` `## Read` and one in fx-debug "Inputs that shape the loop" (read `docs/issues/` reports whose root cause cites the paths in play), with a criterion that greps both.

### G2. Story 33 and story 5 collide: ADR claims can never pass stale pass one free, and the lane that must keep them current is forbidden to touch them (tasks 05, 06, 01)
Task 05 frees a claim only when its doc has a verified marker (`<!-- fx-docs verified: <sha> -->`) and the cited lines are unchanged since it. Task 06 item 2 says rewrite the marker to HEAD after verifying a doc; item 6 says the docs lane never edits an ADR; S5(c) allows only a status line edit to an ADR. So an ADR doc has no marker, `stalePassOne` returns `recheck/unverified` for every ADR claim on every run, and no task says where an ADR's verified commit is recorded. Story 31 (cheap on small change) is lost for ADR evidence, and the drift check re-reads every ADR decision every time.
Fix: a ruling that ADR verification state lives outside the ADR (for example `.fx/` or the docs-index), or that ADR claims are always pass two by design with the cost stated.

### G3. ADR recognition in the parser does not match the discovery rules in the lane (tasks 05 vs 01)
Task 01 item 2 lets `fx-adr` find the ADR folder from `docs/adr/`, `docs/decisions/` or "the folder `mkdocs.yml` nav lists", and keep the repo's own status words (design: Shamel's Proposed, Accepted, Deprecated, Superseded, Ignored). Task 05 makes a claim `kind: 'adr'` only for a folder segment named `adr` or `decisions`, and `superseded` only when the status line contains "superseded by". Consequences: an ADR folder with any other name is read as ordinary docs, its superseded decisions stay `current` and are returned by every lookup (breaking story 6 and 36); a `Deprecated` or `Ignored` ADR is returned as current. Tests cover only `docs/adr/` and the S5 wording.
Fix: add to task 05 a parser case for a nav-listed ADR folder and for `Deprecated` and `Ignored`, or state that those are out of scope.

### G4. Story 37: a wrong claim found by a lane is dropped when the docs step is declined or the owner is away (task 06, ruling S7)
Design: a lane that finds a doc wrong hands it to the docs step. S7 and task 06 make the docs step an offer. `final-review.md` ledgers `Docs: not run: declined` or `not run: offered, owner away`; the completion Docs line "repeats the ledger line and names each stale doc". The `Docs claim wrong:` ledger lines are consumed only when the step runs. If it does not, no criterion puts them in the completion report, so the owner never sees that a doc is wrong. Outside a build the lookup reference tells the owner, so only the in-build path is open.
Fix: criterion that the completion report's Docs line also lists every `Docs claim wrong:` ledger line when the step did not run.

### G5. Stories 24 and 28 ("first time on a repo") are unreachable from fx-implement under the pre-flight skip ruling (task 06, state.md ruling)
state.md ruling: no Markdown with Evidence lines under `docs/` outside `docs/plans/` means no docs step offer. Design story 28 and the Full run bullet: full run "on request or the first time on a repo / when no doc carries an evidence line"; story 24: write a new doc when a change adds an engine or subsystem that no doc covers. In a repo with plain docs or no docs (the situation the first full run exists for), fx-implement never offers the step, so story 24 never fires and the first full run happens only on an explicit "document the system" prompt. Task 06 text still says skip on "no docs/"; the ruling changed the condition but no criterion was rewritten. The two skip conditions now disagree (task 06 `Docs: not run: no docs/` versus the ruling).
Fix: owner decision. Either accept "docs lane is on request until a repo has evidence lines" and say so in the ADR 0062 and the design record, or make the offer fire when docs exist without evidence lines and offer the full run.

### G6. Story 25 step 3, "docs elsewhere that a change made stale", has no mechanism and no criterion (task 06)
Branch mode step 1 finds claims citing changed paths; step 2 updates those docs and verifies their claims; step 3 "list the docs elsewhere that the change made stale. Do not rewrite them." Nothing says what "elsewhere" is or how it is found: the reverse index returns only claims citing changed paths, and `docs-index stale` can run over the whole index but task 06 binds it to step 2 only. Story 34's out-of-date HTML listing has the same shape: `html-pages.md` is listed as holding "the out-of-date listing", but the Docs report line is "updated, written, listed stale" and the stale-HTML list has no place in it. No test or criterion touches either.
Fix: state step 3 as `docs-index stale` over every doc outside the touched set, and add the stale HTML pages to the Docs line.

### G7. ADR "committed with the task that made the decision" has no owner (tasks 01, 06)
Design Commits bullet and fx-adr item 8: inside fx-implement the ADR is committed with the task that made the decision. The only fx-implement wiring is the offer line under "Rulings I made" in `completion.md`, which runs at the end of the build, after the task commits. Neither `handling-reports.md` nor the implementer brief tells anyone to write an ADR inside a task. Verified on the branch: `completion.md:46` is the only ADR hook in `skills/fx-implement/references/`. The sentence in the lane is text with no path to execution; this build's own ADRs work only because tasks 02, 04, 06 name them in Files.
Fix: either drop the sentence (offer runs at completion, standalone commit rules apply) or add a handling-reports line for a ruling that passes the three tests.

### G8. Phase B behaviours are guarded by refusals and validators; the page itself is never exercised (tasks 03, 04, 06)
Task 03 tests: no unlisted load, no host, checksum, `validateMapData`, `levelPath`. All refusal or data checks. Not checked by any criterion: chapters with lead question, evidence toggle, legend, theme switch that remembers the choice (story 14), logical CSS properties so `dir="rtl"` works (design page template bullet), the map's side panel showing evidence per node and edge, drill-down opening the next level (`mount` is loaded in a DOM-less `vm`, so it never runs). The visual check at 1440 and 390 (story 19) is ledgered "not run: no browser" at tasks 03 and 04 by ruling, and task 06 has no step that runs it. Other holes:
- Task 04's repository case (`kitErrors` on `HTML-REPORT.md`) passes for a file that loads nothing at all, so "reports are on the kit" is not proven positively; criterion 1 checks card elements, and the scaffold line is the only link to the kit.
- Story 15 (offline pages) for docs pages: task 06 creates `skills/fx-docs/html-pages.md` but does not add it to the `kitErrors` file list, so docs pages are outside the host and unlisted-load gate. Task 04 added only HTML-REPORT.md.
- Story 16 (state the pick and reason in one line), story 17 (cheap/fast/detailed) live only in `archify-adapter.md`; fx-audit's Phase 4 step points at `svg-static.md` and the page template, not at the adapter, so its diagrams have no choice line.
- Design Further Notes: elkjs "copied only when a page that loads the map is written". `visual-assets.md` says copy when absent, not copy only what the page loads.
Fix: add a jsdom-free structural check (template contains the theme storage key, legend, evidence toggle, no physical `margin-left/right` and `left/right` properties), add `html-pages.md` and fx-audit's step to the `kitErrors` list, and say in task 06 that the docs HTML pages ledger `Visual check: not run: no browser` the same way.

### G9. Lower items, text-only or small omissions (tasks 01, 02, 06)
- Stories 8 (mkdocs nav), 9 (fbrain propose), 3 (offer only when three tests pass), 26/27 (flavour, default guide), 29/30 (interview and skip) have no criterion beyond "SKILL.md covers the nine items" and a grep. Nothing triggers the behaviour. The lane-triggering bench is on request only and is not run in this build, so none of the new lane behaviour is exercised.
- Task 06 compile-brief queries paths on `Create`, `Modify`, `Move` and `Test` lines only. A `Delete` line is not queried, so the docs that cite a file the task deletes never reach its implementer (story 36, "paths I touch").
- The `exclude_docs` proposal in a MkDocs repo (Further Notes, owner at approval) has no recorded decline. A "no" is asked again on every run, unlike `scratch_migrate`.
- Task 05 treats an owner-only claim as `skip/owner`, so an owner-confirmed fact is never re-checked. The design does not say so.

## Ruling-carried (counted as owned)

- Story 4, 6, 7 and the index wording: S5 replaces "Partly superseded" with `Superseded by NNNN (replaced: ...; the rest carried forward)`. Task 01 item 4 and 5, task 04 (0015 status line), task 02 (index rows) carry it.
- Story 13 and the git-ignored `.scratch/`: S6 into task 02; the dry run shows the `.gitignore` line.
- Story 22 "after the exit gate and before the merge question": S7 turns it into an offer before the branch pass (task 06). Design wording "invokes `fx-docs`" is overridden, so story 22 now reads "offered".
- Locale constraint and pages: S8 (tasks 03, 06).
- The 20-claim cap: state.md ruling puts it in task 05 `--limit`; task 06 branch mode passes an explicit no-cap value (fix round).
- The evidence-line form in `adr-template.md` and `fx-adr` item 6, which task 01 left inert: state.md ruling puts it in task 05's fix round.
- Story 12 `.fx/` git-ignored: fx-setup already adds `.fx/` to `.gitignore` (`commands/fx-setup.md` around line 209 to 213); nothing new needed. The design says "local exclude file"; the existing step writes `.gitignore`. Not a gap, a wording difference.
- Design "COVERAGE rows corrected": task 02 declares `skills/fx-plan/COVERAGE.md` stays true; a grep of the COVERAGE files confirms that is the only `.scratch/` mention. No gap, but the deviation is stated only inside task 02.

## What the tasks assume that no design story states

1. `scratch_migrate` key, `lib/scratch-migrate.js`, dry run, rollback lines, undo on failure, symlink refusal (task 02). Design says only "asks once, moves with git, updates pointers". Safe, but it is a feature.
2. Plugin version 0.7.0 and the release-version gate (task 01): plan risk, no story.
3. `check-reference-leaves` widened to subfolders (task 01): serves Global Constraints, no story.
4. The evidence-line grammar and its edges (task 05): `owner, date` items, 40-hex verified marker, `docs/**` excluding `plans`, `issues`, `html`, ADR kind by folder name, superseded by status text. Story 23 states only "path, lines, symbol". G3 comes from this.
5. `Docs claim wrong:` ledger protocol and the "Docs and ADRs" brief section (task 06). Design says "names the claim in its output".
6. 20-claim cap and 200 character cut (tasks 05, 06). No story.
7. `.fx/docs-index.json` is written by `compile-brief` as a side effect (task 06 Risks). Design says only "a small command writes it".
8. A first-time docs-less repo gets no offer (ruling), see G5.

## Ownership map: every story and Implementation Decisions bullet

Phase A stories
- 1 repo format, numbering: T01 item 2. 2 offer when settled: T01 offer lines (brainstorm, review, ruling report, architecture). 3 three tests: T01 (domain-modeling keeps them). 4 index: T01 item 5, T02 index rows. 5 never edited beyond status line: T01 item 4 and S5. 6 Still in force: T01 item 4, template, T04 (0061). 7 old status line: T01 item 4, S5 (wording changed). 8 mkdocs nav: T01 item 5 (text only, G9). 9 fbrain: T01 item 7 (G9). 10 bug report: T02 write side; read side unowned (G1). 11 templates: T01. 12 `docs/issues/` and `.fx/`: T02 and existing fx-setup. 13 migration: T02.
Phase B stories
- 14 shared page: T03, T04 (G8 on behaviour). 15 offline: T03 gate; docs pages outside gate (G8). 16 pick per diagram: T03 adapter (fx-audit not pointed, G8). 17 run level: T03 adapter (G8). 18 SVG when no archify: T03 adapter. 19 two widths: T03 visual-check.md; never run (G8). 20 reports on kit: T04. 21 nothing added to skill list: T03 criterion 4.
Phase C stories
- 22 docs after implement: T06 final-review (offer, S7). 23 evidence lines: T05 parser, T06 item 2. 24 new doc: T06 branch mode item 4; unreachable in evidence-free repos (G5). 25 stale elsewhere: T06 item 3 (G6). 26 flavour: T06 item 3. 27 default guide: T06 item 4 and docs-guide.md. 28 full run: T06 item 7, full-run.md (G5). 29 read, draft, validate: T06 full-run.md. 30 skip interview: T06 full-run.md "the skip rule". 31 two-pass stale: T05 pass one, T06 item 6 (ADR marker, G2). 32 listed not rewritten: T06 item 6. 33 ADR drift: T05 index, T06 item 6 (G2, G3). 34 HTML pages: T06 html-pages.md (G6, G8). 35 English prose: T06 item 9, S8. 36 seven readers: T05 query, T06 brief plus six pointers (G9 Delete). 37 code wins: T06 lookup reference, handling-reports (G4).
Implementation Decisions bullets
- Phase A ADR lane (10 bullets: lane, one claimant, repo format, numbered decisions, supersede rule, index, evidence for drift, fbrain, commits, model-selectable): T01 and S5; "commits" bullet is G7; "evidence for drift" is G2/G3.
- Phase A templates (5 bullets): T01. Phase A fx-debug (3 bullets): T02. Phase A issues and `.fx/` (4 bullets): T02 plus existing fx-setup. Retiring `.scratch/` text: T02.
- Phase B kit (7 file bullets plus vendoring, diagram choice, visual check, language): T03. Reports on kit (3 bullets): T04.
- Phase C lane (source of truth, unconfirmed claims, layout, flavour, docs guide, branch mode, full run, stale check, HTML pages, fbrain, size): T06 with T05; see G2, G5, G6. Lanes read the docs (index, seven readers, code wins, no index no change): T05, T06; see G1 and G4.
- Testing Decisions: user-invoked and description-overlap (T01, T06), kit gate (T03, T04), parser, index, stale pass one, empty case (T05), text gates (all), conformance row 09 (T01, T06), bench (prompt files only, on request).
