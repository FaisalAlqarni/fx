# fx ledger: plan: docs/plans/2026-10-29-system-flow-site/plan.md

## Standing rulings

(none: docs/plans/rulings.md does not exist)

## Log

Setup: worktree /development/fx/.worktrees/system-flow on branch system-flow (existing, not entered). Plan dir committed in 6370471. scripts/setup ran under scripts/scratch-env with HOME and TMPDIR in /tmp/claude-1000/sf2-build. .fx/ is git-ignored (check-ignore exit 0). No .fx/transcript-path, so build-cost reports unavailable.
Ruling: <SCRATCH> is /tmp/claude-1000/sf2-build for every task. Why: the dispatch names it for exit trials; one scratch root keeps test output in one place. Cost if wrong: none beyond disk, caught by nothing needed.
Ruling: <PW> stays at the plan's path; it exists (browsers, node_modules listed at setup). Why: plan Risks says use it while present. Cost if wrong: a browser check fails to start, caught by the task's own Playwright run.
Ruling: Tasks 12 and 13 run steps are controller-only; this controller is a subagent and parks task 12 at its run step. Why: dispatch instruction and ADR 0055. Cost if wrong: none, the session controller runs them.
Ruling: compile-brief and review-package run from the worktree's skills/fx-implement/scripts, not the installed plugin 0.2.9. Why: the installed compile-brief fails to resolve 'The model: schema version 2' (a heading with a colon); the worktree's copy exits 0. Cost if wrong: a brief misses a design passage, caught by the task reviewer reading the brief.
Blocked: task 01 dispatch waits on the pre-flight scan (findings/00-preflight.md).
Pre-flight: scan in findings/00-preflight.md (53 pair rows, 13 task rows, 15 conflicts C1 to C15). Controller verified C1 (src/lib/sf-evidence.ts:164 refuses folder entries outside catalogue and inventory), C2 (src/references/visual/fx-flow-1.ts:35 and src/tests/gates/visual-kit.test.ts:260 use `figure <key>: step <i> names a missing edge <id>`, 0-based), C3 (design line 210 term links), C6 (task 12 step 1 makes only home/.claude). Rulings below, one per conflict.
Ruling: C1. Task 01 also modifies src/lib/sf-evidence.ts so a folder entry is allowed on code map entries (kind `code`), and adds one test that a folder entry on a glossary term still fails. Why: design line 90. Cost if wrong: one extra file in 01, caught by task 01 review.
Ruling: C2. Task 05 keeps today's message form and 0-based index: `figure <key>: step <i> names a missing row <id>` beside the existing `figure <key>: step <i> names a missing edge <id>`; the turn#9 test expects that form with the step's 0-based index. Why: design Testing seam 2 asks only that a missing row is rejected; the visual-kit gate already pins the box form. Cost if wrong: message text differs from task 05 line 35, caught by task 05 review.
Ruling: C3. Tasks 06 and 07 compare lead, bullet and caption text content with tags stripped (the `code.at` element in the first fact may still be asserted as markup); task 08 adjusts any 06 or 07 assertion its term links break and lists those test files in its report. Why: design line 210 puts term links in leads, bullets and captions. Cost if wrong: 08 edits earlier tests, caught by task 08 review.
Ruling: C4. Task 03's "update expected values only" also allows changing a test's own input where goodSet() now sets the field (use a field goodSet() leaves unset, or build the set locally); no assertion is removed or weakened. Why: design Testing seam 1 lists these as separate behaviours. Cost if wrong: a test loses its point, caught by task 03 review.
Ruling: C5. Task 08 edits goodSet() output inside its own tests (a bullet with `short link`, a summary with a term, a term inside code.at) after building the set, as task 03 does for word counts; goodSet() itself is not changed by 08. Why: keeps 03's word counts stable. Cost if wrong: none material, caught by task 08 review.
Ruling: C6. Tasks 12 and 13 step 1 also make <run>/home/.claude/skills. Why: cp -rL into a missing parent fails. Cost if wrong: none, caught by the controller's run step.
Ruling: C7. results.md names the two counts differently: floorWords (lead plus bullets plus not-owned, task 03) and readingWords (question, lead, bullets as rendered, task 11). Why: design lines 336 and the floor define different measures. Cost if wrong: a confusing table, caught by task 11 review.
Ruling: C8. migrate's `owed` holds the stderr lines `check` prints, verbatim, including `system-flow: check: ...` lines with no file. Why: design line 100 "the same list check would fail on". Cost if wrong: one format mismatch, caught by task 04 review.
Ruling: C9. Task 10's implementer names the gate that reads ADR text today and adds it to its files; single common words in its assertions become the full sentence each sidecar must contain. Why: a one-word substring cannot fail. Cost if wrong: weak gate, caught by task 10 review.
Ruling: C10. Task 06's page test asserts `lang="en" dir="ltr"` on index.html and `data-group` on each section.chapter. Why: Global Constraints and task 11 consume both. Cost if wrong: none, caught by task 06 review.
Ruling: C11. Task 07 adds one test: a build that fails in the deep diagram step leaves index.html as it was and writes no stamps. Why: plan Risks MEDIUM row names it, design keeps all-or-nothing writes. Cost if wrong: a test that is hard to provoke, caught by task 07 review.
Ruling: C12. Task 11's measure mode runs each behaviour check in the states where it is defined and records null elsewhere. Why: design line 328 describes the measure run, not every check. Cost if wrong: thinner coverage, caught by task 11 review.
Ruling: C13. Task 12 saves site (a)'s measure JSON at proof/measure-a.json beside results.md and names it there; task 13 reads it from there. Why: 13 consumes it and 12 named no home. Cost if wrong: none, caught by task 13 prep.
Ruling: C14. Task 08's test checks the parsed site index JSON holds `<script>` and the raw inline block holds `<script>` and no literal `<script>` from the data. Why: inlineJson rule in Global Constraints. Cost if wrong: none, caught by task 08 review.
Ruling: C15. Task 06's gate also asserts the site template loads kit files through `../_assets/<file>` links and keeps the `fx-tokens-1.css` link line verbatim, since src/lib/sf-page.ts:188-190 rewrites them. Why: pages load only files under assets/. Cost if wrong: a page with broken asset links, caught by task 06 browser check.
Task 01: dispatched 9faae15 2026-10-28T23:27:32+03:00
Task 01: implementer agent a6aeb5fefb93203b1 (sonnet, standard tier)
Blocked: waiting on task 01 implementer (follower on its report file); frontier has nothing else (02 needs 01).
Task 01: concern noted: skills/fx-system-flow/planning.md:66 still says schemaVersion 1; task 10 owns the sidecars and gets a pointer.
Task 01: reviewer agent af0488b019863a99c dispatched; findings/01-review.md
Task 02: dispatched fd40010 2026-10-28T23:42:50+03:00
Task 02: implementer agent afb048eada072be66 (sonnet). Ruling: task 02 dispatched while task 01's review runs; any 01 fix round waits until 02's implementer reports. Why: throughput, and the skill allows one review beside the next implementer. Cost if wrong: an 01 fix touches a file 02 changed, caught by the 01 re-review package.
Task 01: minor (deferred): folder-entry error message in sf-evidence.ts still says only catalogue and inventory entries; widen it with the evidence test in a later task
Task 01: minor (deferred): loadFragments parses meta.json twice (readVersion and the main loop)
Task 01: ⚠️ resolved by controller: tests/fixtures/system-flow/parser-stages.json gained `look` because the layout test loads it (required by `look` being mandatory); in scope. Diff elision: the reviewer read git show fd40010 directly; no gap.
Task 01: cost unavailable (no transcript recorded)
Task 01: complete (commits 9faae15..fd40010, review clean). Files: schema, sf-model.ts, sf-rules.ts, sf-evidence.ts, sf-fixture.ts, 15 system-flow tests, parser-stages.json fixture, built JS.
Ruling: (session controller instruction) scripts/check-all runs once, at the exit gate after the last task before the proof; implementers and fixers run test_scope on their paths only and never check-all. Why: session controller instruction, matches fx-implement. Cost if wrong: a cross-task break surfaces late, caught by the exit gate.
Ruling: (session controller instruction) independent frontier tasks run in parallel when their file lists do not overlap (after 03: 04, 05 and 09 candidates); fx tests use scratch temp dirs, not a shared database. One follower per child. This overrides plan Risks LOW row "run them one at a time" only for disjoint file lists. Why: session controller instruction. Cost if wrong: two implementers stage each other's files or race on a shared generated file, caught by each task's review package and test_scope.
Task 02: owner-rule breach reported by implementer: typed bash -c 'true' once inside scratch-env (no effect). Rule repeated in later dispatches.
Task 02: reviewer agent ad316d2c01888a93c dispatched
Task 03: dispatched 9550436 2026-10-28T23:56:42+03:00
Task 03: implementer agent aa218e2ff14684816 (opus). Capable because: prose floor breaks every system-flow test, plan Risks HIGH.
Task 02: minor (deferred): an area fragment may set title, question or role when chapters.json omits them; restrict to lead, bullets, notOwned and figure references.
Task 02: minor (deferred): a section id repeated inside one non-chapters fragment gives a scalar clash naming the same file.
Task 02: minor (deferred): sf-corrections drops merge problems for the HEAD model, so sections declared outside chapters.json at HEAD vanish from the corrections comparison.
Task 02: minor (deferred): stderrOf alias in check test and unused `_sections` binding in mergeFragments.
Task 02: ⚠️ resolved by controller: scope test evidence is in the report (no re-run needed); the bash -c slip is already ledgered above. No gap.
Task 02: cost unavailable (no transcript recorded)
Task 02: complete (commits fd40010..9550436, review clean). Files: sf-model.ts merge, check/build/corrections tests, built JS.
Task 03: ran test_all (rule): listing scripts/check-all as a touched path made test_scope run all of check-all (ALL GREEN).
Task 03: reviewer agent dispatched; findings/03-review.md
Task 04: dispatched 3561424 2026-10-29T00:32:01+03:00
Task 05: dispatched 3561424 2026-10-29T00:32:01+03:00
Task 04: implementer agent a3421ae0add99309b (sonnet). Task 05: implementer agent a3060e97039d0b6bc (opus, Capable because: new layout, kit file and fallback across seven files). Both run in parallel with task 03's review (a61a060269f2cb336). Task 09 waits: it shares src/lib/sf-build.ts with 05 and scripts/check-all with 04.
Task 03: minor (deferred): coverage test no longer pins a numbered chapter owning a diagram-covered entry; add a non-root diagram case in system-flow-coverage.test.ts
Task 03: minor (deferred): floor() leaves a stale floor.json if a test adds its own request sequence or glossary afterwards, and re-implements the cited-root walk from sf-prose.ts
Task 03: minor (deferred): hard-coded Depth constants 69 and 53 in build and estimate tests copy the fixture's arithmetic and will break on any goodSet() edit
Task 03: ⚠️ resolved by controller: the suite run evidence is in the report (test_scope ran all of check-all, ALL GREEN, ledgered above); no gap.
Task 03: cost unavailable (no transcript recorded)
Task 03: complete (commits 9550436..3561424, review clean). Files: src/lib/sf-prose.ts, sf-build, sf-model, fixture goodSet()/floor(), 16 system-flow suites, check-all line, built JS.
Task 04: owner-rule breach reported: typed bash -c true once (no effect). Second occurrence across implementers; rules file repeats it. Page and prose test failures it saw came from task 05's uncommitted edits in the shared tree.
Task 04: reviewer agent afe5ec2ca3044781b dispatched. Blocked: 09 waits on 05 (shared src/lib/sf-build.ts).
Task 04: minor (deferred): migrate drops mergeFragments problems, so a clashing v1 set exits 0 with a partial owed while check fails
Task 04: minor (deferred): a v2-declared fragment in a v1-meta set is rewritten (matches loader), untested
Task 04: minor (deferred): vacuous assert on oldTimes in the idempotency test
Task 04: minor (deferred): mixed-set test does not assert untouched fragments' bytes or the per-file check hint
Task 04: minor (deferred): implementer typed bash -c true once against the owner rule
Task 04: ⚠️ resolved by controller: src/scripts/system-flow-check.test.ts:313 asserts the single hint line for one version-1 fragment under a version-2 meta.json (task 01's test); covered.
Task 04: cost unavailable (no transcript recorded)
Task 04: complete (commits 3561424..3e2b47a, review clean). Files: src/lib/sf-migrate.ts, system-flow.ts migrate subcommand, sf-model.ts SCHEMA_FILE export, migrate test, check-all line, built JS.
Task 09: dispatched 9a08ac8 2026-10-29T00:48:08+03:00
Task 05: reviewer agent a9624df7a9391ad0c dispatched. Task 09: implementer agent ab426ab033caea3e0 (sonnet), parallel with 05's review. Blocked: 06 waits on 05's review.
Task 05: minor (deferred): label.y puts the label box 4 px above the arrow; the brief's "12 px above" may mean the gap, settle before task 07 reads label.y
Task 05: minor (deferred): a 26-character box sub line at 12 px is about 160 px in a 164 px node; check for clipping at the exit gate
Task 05: minor (deferred): fx-flow-2 drawing (looks, active arrow, bold label) has no committed automated check; only validateFigure is tested
Task 05: minor (deferred): SVG fallback box pages draw neither sub nor look, so they differ from the inline box figures
Task 05: ⚠️ resolved by controller: (1) the legend item for leaving calls is owned by task 06 (tasks/06-site-template.md:44 lists the legend li texts); (2) fx-flow-2 drawing is checked in the browser by proof/page-check.js from task 06 on (plan Risks MEDIUM row). Neither is a gap in 05.
Ruling: "12 px" for arrow labels is the font size, label placed above the arrow (design.md:248 "12 px, above the arrow from the calling lifeline"); task 05's reading stands. Why: the design row lists 12 px as a size beside the content. Cost if wrong: label offset off by 8 px, caught by task 07's browser checks.
Ruling: the fallback first page keeps the name seq-turn.html; task 05 step text naming seq-turn-p1.html is a plan wording error (its other test names seq-turn.html). Why: reviewer found the brief inconsistent with itself; existing links use seq-turn.html. Cost if wrong: one renamed file, caught by task 07 deep link tests.
Task 05: cost unavailable (no transcript recorded)
Task 05: complete (commits 3e2b47a..9a08ac8, review clean). Files: sf-model, sf-layout, sf-diagrams, sf-build, sf-page, fx-flow-2.ts (fx-flow-1 removed), scripts/build, tsconfigs, visual-assets.md, visual-kit gate, four tests, built JS.
Blocked: 06 waits on 09 (both edit src/lib/sf-build.ts and scripts/check-all).
Owner change (2026-10-29, via session controller): task 10 file now requires area-brief.md and planning.md to say the chapter-prose writer invokes fx-humanize before returning, and the controller does the same for Start here prose; docs-lanes asserts 'fx-humanize' and 'before returning' in both files; one new acceptance line. Task 10's brief is compiled from the file as it stands at dispatch. The humanize-gate branch is out of scope here.
Task 06: dispatched 1216d7d 2026-10-29T00:54:24+03:00
Task 09: review base is 4c7ec11 (the controller's ledger commit landed between 9a08ac8 and task 09's commit).
Task 09: reviewer agent acfd7ca52b0564566 dispatched. Task 06: implementer agent adba2a1da5bce3059 (opus, Capable because: new template, menu contract, gate and Playwright script).
Task 09: minor (deferred): glossary evidence is printed in both the table cell and the ## Evidence list (required by parseDoc, but doubled)
Task 09: minor (deferred): a diagram without a summary renders a bare ### heading under ## Diagrams
Task 09: minor (deferred): glossary sort assertion reuses the implementation's comparator, so it is tautological
Task 09: minor (deferred): glossary row assertion rejects any meaning containing the word Evidence
Task 09: ⚠️ resolved by controller: the elided section-merge code is task 02's (reviewed clean); the folder-index code is unchanged context. No gap.
Task 09: cost unavailable (no transcript recorded)
Task 09: complete (commits 4c7ec11..1216d7d, review clean). Files: sf-markdown.ts, sf-build.ts glossary.md write, markdown test, system-flow-only test adjustment, check-all line, built JS.
Note (session controller, 2026-10-29): fx main is a423fdd (0.8.2) with subagent-wait and humanize-gate merged. This controller does not merge main into system-flow; the session controller merges it before the final review. Branch version stays 0.9.0.
Task 06: ran test_all (rule): scripts/check-all passed as a test_scope path (ALL GREEN). Rules file now says it again.
Task 06: reviewer agent a1ba4263acc963b44 dispatched. Blocked: 07 waits on 06's review (07 edits the same sf-page.ts, template and page-check; a fix round would collide). Nothing else on the frontier.
Task 06: minor (deferred): system-flow-diagrams.test.ts:310 reads the theme key from the kit page template; point it at the site template.
Task 06: minor (deferred): header order is intro, roots/date/count, then how-to-read; the design puts how-to-read before roots.
Task 06: minor (deferred): button#theme aria-label "Change theme" does not contain its visible text "Theme: dark/light".
Task 06: minor (deferred): menu group h2s precede the page h1 in DOM order, so the heading list has no h1 first.
Task 06: minor (deferred): page-check.ts launches bundled Chromium only; add an optional executable path so the ::details-content path can run, and fix the brief's dom-reference line for task 11.
Task 06: ⚠️ resolved by reviewer probe: the ::details-content path checked in /usr/bin/google-chrome 145 (list shown with JavaScript off at 1440, summary hidden). page-check.js itself runs on <PW> Chromium 130 only.
Ruling: the /// <reference lib="dom" /> line in proof scripts is dropped; module-local declarations type the in-page code. Why: the ts-toolchain gate forbids it (reviewer confirmed). Cost if wrong: none at runtime, caught by check-types.
Task 06: cost unavailable (no transcript recorded)
Task 06: complete (commits 1216d7d..2534415, review clean). Files: references/system-flow/site-template.html, sf-page.ts, sf-build.ts, page-template.html restored to main, visual-kit gate, site-template gate, page test, proof fixture-site.ts and page-check.ts, check-all line, built JS.
Task 07: dispatched 2534415 2026-10-29T01:16:50+03:00
Task 07: implementer agent a9c593574ab09ca52 (opus, Capable because: player, write reorder with all-or-nothing, Playwright). Blocked: 08 waits on 07; 10 and 11 wait on 08.
Task 07: reviewer agent ae0da334a0ff95806 and fx-lens-silent-failure agent a4f4e73d429f7ed57 dispatched (tripwire: silent-failure in src/lib/sf-build.ts --only fallback link). Lens reply to be saved at findings/07-lens-silent-failure.md.
Task 07: lens silent-failure: 1 Important (sf-build.ts:377-379 --only with no deep page on disk links a missing page and reports nothing); enters the fix loop with the review's findings.
Task 07: minor (deferred): C11 test asserts only a non-zero status; pin the failure to the deep step with a stderr check.
Task 07: minor (deferred): the `-p1` first-page lookup in sf-build.ts and sf-page.ts is unreachable from the build's own names; remove after the plan wording is fixed.
Task 07: minor (deferred): manual Back/Next permanently disables autoplay and resume for that figure, which the brief did not specify; `mount(root)` is a test-only hook.
Task 07: fix round 1/5 dispatched to implementer a9c593574ab09ca52 (resume); open: lens [Important] sf-build.ts:377-379. FIX_BASE a7142ce 2026-10-29T01:40:59+03:00
Task 07: fix round 1/5 (1 addressed, 0 open: none; commits a7142ce..8c7c456)
Task 07: minor (deferred): missing-deep-page warning shows only in the stdout JSON, not on stderr
Task 07: cost unavailable (no transcript recorded)
Task 07: complete (commits 2534415..8c7c456, review clean after fix round 1). Files: sf-page.ts cards, fx-flow-2.ts player (checksum row updated), sf-build.ts write order and --only deep lookup with a missing-page warning, sf-diagrams svgPage marker, site template, page/only/archify tests, site-template and visual-kit gates, page-check (30 checks), built JS.
Task 08: dispatched b5f912a 2026-10-29T01:49:48+03:00
Task 08: implementer agent a953adfaaab93329c (opus, Capable because: term linking on escaped HTML, new chapters, filter with browser checks). Blocked: 10 and 11 wait on 08.
Task 10: dispatched f678edc 2026-10-29T02:08:45+03:00
Task 08: reviewer adc1330be0dc4f22b and fx-lens-security a3f1c197cd20a0d63 dispatched (tripwire: security, repository strings into HTML via term links, glossary rows, inline index). Task 10: implementer a7a0453da34d63cc3 (sonnet), parallel; file list disjoint from 08. Blocked: 11 waits on 08's review (both touch page-check.ts).
Task 08: lens security: 0 findings (findings/08-lens-security.md).
Task 08: minor (deferred): filter count writes "1 match" where the contract says "<n> matches"; readers of the count must accept both.
Task 08: minor (deferred): the stores table "Shown in" links are not asserted by system-flow-site.test.ts.
Task 08: minor (deferred): a model with no parts section drops the map and catalogue and leaves site-index parts pointing at chapter "" (build --only only).
Task 08: ⚠️ resolved by controller: Markdown output is task 09's (complete, review clean); task 08's file list names no sf-markdown.ts change. Chromium run evidence is in the report. No gap.
Task 08: cost unavailable (no transcript recorded)
Task 08: complete (commits b5f912a..f678edc, review clean, security lens 0). Files: sf-page.ts chapters and term links, site template filter, site and page tests, site-template gate, page-check filter and term checks, built JS.
Task 11: dispatched f678edc 2026-10-29T02:10:07+03:00
Task 11: implementer a229d672a8175cefe (sonnet), parallel with task 10 (disjoint files).
Task 10: reviewer a5b449cd53e974f7f dispatched.
Task 10: minor (deferred): area-brief.md does not tell writers that message `short` is capped at 26 characters.
Task 10: minor (deferred): no fresh-agent baseline run of the new skill wording; text gates only.
Task 10: minor (deferred): ADR 0066 status line omits that Still in force was renumbered 8 to 12.
Ruling: in task 10's fix, the owner-mandated assertions of the two phrases `fx-humanize` and `before returning` (owner change 2026-10-29) stay as the owner stated them; ruling C9's full-sentence rule applies to the other single-word assertions. Why: the owner named those two phrases; the gate may additionally pin the full sentence. Cost if wrong: a weak gate on two phrases, caught by the re-review.
Task 10: fix round 1/5 dispatched to implementer a7a0453da34d63cc3 (resume); open: spec ❌ C9 half applied (Important). FIX_BASE 6e27070 2026-10-29T02:14:06+03:00
Task 10: fix round 1/5 (2 addressed, 0 open: ; commits 6e27070..8f81765)
Task 10: cost unavailable (no transcript recorded)
Task 10: complete (commits f678edc..8f81765, review clean after fix round 1). Files: skills/fx-system-flow SKILL.md and five sidecars, skills/fx-docs/SKILL.md, ADR 0066 amended in place (fx-adr not listed by this runtime; repo convention followed), docs-lanes gate.
Task 11: reviewer a1e32d185b37e2462 dispatched. Exit trial (check-all) launched at bf822a7 in parallel.
Task 11: minor (deferred): results.md "reduced motion" and "pauses when away" rest on one figure; name it or check all figures.
Task 11: minor (deferred): lifeline detector is `line[stroke-dasharray]` attribute only; results.md wording claims a dashed vertical line under a participant.
Task 11: review finding verified by controller: src/docs/plans/2026-10-29-system-flow-site/proof/page-check.ts:590-593 toMid scrolls the area's top (getBoundingClientRect().top - innerHeight/2) to the window middle.
Ruling: page-check's toMid centres the figure box in the window (box centre at the window middle) for both owner and fx measures; task 07 step text "scroll each card's .fig top to the window's middle" is the procedure for short figures, and centring is the same position or a more visible one for every box. Why: a tall box with a 0.3 threshold never fires with its top at the middle (reviewer measured six owner figures of 1582 to 1954 px), so the old procedure measures the tool, not the page. Cost if wrong: an fx autoplay that fires only on top-crossing would pass a check it should fail, caught by the fx measure rerun in this fix round and by task 12's proof run.
Task 11: fix round 1/5 dispatched to implementer a229d672a8175cefe (resume); open: Important toMid defect; rerun owner and fixture measures and rewrite the autoplay rows in results.md. FIX_BASE bf822a7 2026-10-29T02:52:56+03:00
Coverage audit: agent adb5d3ecbdb2e0a5a dispatched (findings/coverage-audit.md), parallel with task 11 fix round 1 and the check-all exit trial.
Coverage audit: 6 gaps (G1, G2 medium; G3 to G6 low) and 7 unstated rules, in findings/coverage-audit.md.
Correction: the controller's Task 05 ⚠️ line said fx-flow-2 drawing "is checked in the browser by proof/page-check.js from task 06 on"; the audit shows page-check counts only lifeline dasharrays (page-check.ts:633), not arrow styling. That resolution was wrong; G1 owns it now.
Ruling: G1, G2, G4 and G5's Escape case become task 14 (tasks/14-coverage-checks.md), blocked by 07, 08, 11, run before the proof. Why: medium gaps let a styling or padding regression pass every check; the low ones are cheap in the same file. Cost if wrong: one extra task, caught by its review.
Ruling: G3 (story 2 "each in a sentence or two"), G6 (header roots, date, count, how-to-read text, menu number to chapter number) and the 7 unstated rules (end stop, 1.6 s, page after deep diagrams, migrate on a clean tree, one return round on the words warning, test-side contracts, autoplay position) are not built here; they go to the owner and the final review as design amendments. Why: they change the approved design's text or need an owner decision; the code already behaves per the tasks. Cost if wrong: a design that undersays what the code does, caught by the final branch review reading this line.
Exit trial 1 (check-all at bf822a7, before task 11's fix and task 14): EXIT 0, ALL GREEN, 787 lines read; all 21 system-flow suites, skill-size, visual-kit, site-template, docs-lanes OK. Noise only: MODULE_TYPELESS_PACKAGE_JSON warnings from the opencode plugin tests and expected [fx] failure lines from negative-path hook tests. Log: /tmp/claude-1000/sf2-build/check-all-bf822a7.log. A second run follows task 14.
Task 11: fix round 1/5: controller re-review (3 lines): 1 addressed, 0 open
Task 11: cost unavailable (no transcript recorded)
Task 11: complete (commits 8f81765..01dd512, review clean after fix round 1). Files: proof/page-check.ts measure mode, proof/compare.ts and its test, check-all line, results.md Baseline and Migration, built JS.
Task 14: dispatched 6d4eda7 2026-10-29T03:12:54+03:00
Task 12: dispatched (prep, steps 1 and 2 only) 6d4eda7 2026-10-29T03:13:14+03:00
Task 12: prep complete (commit c1c9779, proof/run-a.md); run folder /tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1 ready (home/.claude/skills made per C6; stamp check 0 newer files under /mnt source; scratch repo HEAD 4cd0689).
Task 12: parked: run step needs the session controller. Commands: docs/plans/2026-10-29-system-flow-site/proof/run-a.md Setup (install -m 600 credential, cp -rL archify), Runs 1 to 3 (claude -p --plugin-dir /development/fx/.worktrees/system-flow, then --resume twice), Teardown (copy transcript, find -delete the credential copy). After it, dispatch an agent for task 12 steps 4 to 7 (results, estimate recalibration, scope, commit), then task 13.
Task 14: minor (deferred): fitAt1440 passes with 42 px slack (856 in 898), so only a large card-padding regression fails it.
Task 14: minor (deferred): arrowStyle cap query matches any g > path with stroke-width 1.2, not specifically a store node.
Task 14: minor (deferred): no mutation RED run for fitAt1440, panelEscape or the Shown in link assertion.
Task 14: ⚠️ resolved by controller: the reviewer judged by reading that fitAt1440, panelEscape and the Shown in assertion each fail on the regression the audit names; the implementer showed RED for arrowStyle and the conventions note. Accepted; the looseness is ledgered as Minors for the final review.
Task 14: cost unavailable (no transcript recorded)
Task 14: complete (commits c1c9779..8e840a3, review clean). Files: proof/page-check.ts (arrowStyle, fitAt1440, panelEscape), system-flow-page and markdown tests, fixture if needed, built JS.
Exit trial 2 (check-all at 8e840a3, after task 14): EXIT 0, ALL GREEN, 787 lines read; same lines as trial 1 once temp paths, pids and timings are filtered (diff empty). Every skills/*/SKILL.md under 20,000 bytes (largest skills/fx-setup/SKILL.md 19,989, unchanged on this branch). Log: /tmp/claude-1000/sf2-build/check-all-8e840a3.log.
Final branch review: not run by this controller (session controller runs it after merging main). Deferred minors and the coverage-audit ruling above are its input.
Blocked: task 12 run step (parked, session controller), then task 12 steps 4 to 7 and task 13.
Task 12: results (steps 4 to 7) by agent. check exit 0, build exit 0 (22 archify, 4 SVG fallbacks). compare.js against owner-2.json: every Proof pass line passes (prose 183.8 vs 121.9 words, 9 of 9 lead and bullets, glossary 24, lifelines 5 of 5, menu 240 px 3 groups, filter 6 of 6, cards 3 of 3, autoplay 5 of 5, labels 12 px, player 10 of 10, 0 console errors). Full results: proof/results-a.md.
Task 12: build incident: the first results build ran under scratch-env (no archify in its HOME) and rewrote the 22 archify pages as SVG; a rebuild with HOME=<run>/home restored 22 archify and the same 4 fallbacks. No fragment touched.
Task 12: ⚠️ failed visual lines: archify architecture pages render node subtitles at 2.3 to 6 px, cut off at the box edge (archify's own check passed them); 2 of 41 glossary links per width stop out of view. Not run on site (a): page-check default mode (fixture-bound, clicks #ch-05-s1: arrowStyle, fitAt1440, panelEscape), map level walk, right to left, theme after reload.
Task 12: 964 px figure is seq-mobile-api-seq-prompt (9 participants, scrolls: true). Allowed by design.md "The 860 rule" (9 to 12 participants are 964 to 1276 px and scroll inside the card at 1440). Not a bug; no fix commit.
Task 12: lane findings recorded: 3 areas skipped fx-humanize on first return (mobile-api chapters never got it); 4 SVG fallback pages have no theme button (both themes render under the system setting); 8 arrows not drawn (1 mobile-api-l1, 2 mobile-api-l2-channels, 2 shaheen-l2-streaming, 3 shaheen-l2-fake).
Task 12: cost: 16,744,779 tokens (controller 11,291,484 over 78 requests, 4 area agents 5,453,295), deduplicated by request id; lane reported 15.4M; estimate 14.2M (+18%). Minutes 41.4 from step stamps against 27.6 (+50%); sum of duration_ms 13.2 min counts only each step's last segment, not used.
Task 12: fx-tdd RED (new expected values, old constants): "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal: + actual - expected ... id: 'A', + minutes: 4.1, + tokens: 649000 - minutes: 1.8, - tokens: 645000". GREEN: "system-flow-estimate.test.js: OK".
| 12 | The estimate reproduces run (a) 2026-10-29 within 10% (tokens -7.8%, minutes 0%) and run (b) within 12% (+9.5%, -0.2%) | `src/scripts/system-flow-estimate.test.ts` | unit | PASS | `scripts/scratch-env node scripts/system-flow-estimate.test.js` |
Task 12: scope: check-all EXIT 0, ALL GREEN (/tmp/claude-1000/sf2-build/check-all-task12.log).
Proof (a) fix round: dispatched 2a10ce0 2026-10-29, five items from results-a.md "Failed lines" and the lane findings.
Fix 1 (archify node text): fx-tdd RED "AssertionError [ERR_ASSERTION] ... actual: 'Sends prompts and reads answers over HTTP, SSE...', expected: undefined" (a long role was still a cut subtitle), then RED "actual: undefined, expected: [ 1000, 400 ]" (no authored canvas); GREEN "system-flow-archify.test.js: OK". Commits 69f9d66 and e1c7461 (ts-gate follow-up). Cause: fx cut roles to archify's 6 px subtitle floor, and archify height-fits an automatic canvas (scale 0.83 on arch-level0). After rebuild: 15 archify architecture pages at 1440, scale 1.34 to 1.35, node text 12.1 to 14.8 px, no subtitle cut; 3 labels on arch-twk-framework-l2-security still shortened by fx (archify rejects a label wider than its box). At 390 archify fits the canvas to the phone: 3 to 3.7 px, smaller than before; not fixable from the spec.
Fix 2 (term links): RED page-check --site termLinks on the old site "1440: 34 of 41 land in view ...; 390: 32 of 41"; cause 1: narration changed card height per step during the smooth scroll (page height 60850 to 62374 after one pass); cause 2: the glossary scroll box clipped row 1's 72 px scroll margin, row under the phone bar (top 35). GREEN after rebuild: 41 of 41 at 1440 and 390, 3 runs. Commit 4691bb8. Finding: build never overwrites an existing assets/fx-flow-2.js; the proof site needed the old file moved aside (<RUN>/stale-assets/) before build4.
Fix 3 (page-check on any site): page-check.js --site; run on site (a): arrowStyle, fitAt1440, panelEscape, termLinks, deepTheme, console all pass (<RUN>/results/site-after.json); default mode still passes on the fixture. Commit 55bd2fb.
Fix 4 (humanize enforced): fx-authoring; RED docs-lanes "skills/fx-system-flow/area-brief.md: holds `Humanized: <chapter ids, captions, glossary candidates, code-map lines>`"; GREEN "docs-lanes: OK". No subagent micro-test run (subagent may not dispatch children); the baseline failure is proof run (a): 3 of 4 areas skipped the pass. Commit 8a635eb.
Fix 5 (theme button on SVG pages): RED page-check deepTheme on the fixture "0 of 4 SVG deep pages ...; diagrams/arch-system.html: no #theme"; GREEN "4 of 4", and 3 of 3 on site (a). Commit 88bacd8.
Proof (a) after fixes: build4 exit 0, 23 archify and 3 SVG; page-check --measure fx exit 0; compare.js exit 0, every Proof pass line passes with unchanged figures. results-a.md "After fixes".
Fix round scope: check-all EXIT 0, ALL GREEN, 787 lines read (/tmp/claude-1000/sf2-build/check-all-fixes.log); noise is the usual hook-failure fixture lines and MODULE_TYPELESS warnings. First run failed check-ts-escapes on the fake archify's JSON.parse; fixed in the follow-up commit.
| F1 | An archify architecture spec carries no subtitle drawn under 9 px, keeps the whole role in a Parts card, and gets archify's own canvas at least 1000 wide | `src/scripts/system-flow-archify.test.ts` | cli | PASS | `scripts/test-one src/scripts/system-flow-archify.test.ts` |
| F2 | Every term link lands with its glossary row fully in view at 1440 and 390 | `proof/page-check.ts` termLinks | browser | PASS | `page-check.js --site` on site (a) and the fixture |
| F5 | Every fx SVG deep page toggles the theme, stores fx-theme and keeps it on reopen | `proof/page-check.ts` deepTheme | browser | PASS | `page-check.js --site` on site (a) and the fixture |
