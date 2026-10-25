# fx ledger: plan: docs/plans/2026-10-24-docs-and-adr-lanes/plan.md

## Standing rulings

No docs/plans/rulings.md exists in fx. The plan's standing rulings S1 to S8 (plan.md lines 46 to 55) apply as written, copied here:
- Ruling: S1, the brief tool.** Before task 01, the controller creates `git worktree add --detach <SCRATCH>/fx-brief-tool 67584d9` and compiles every brief with `node <SCRATCH>/fx-brief-tool/skills/fx-implement/scripts/compile-brief --worktree <build worktree> ...`. Never the installed tool (it cannot resolve `###` headings) and never the build worktree's copy (task 06 rewrites it).
- Ruling: S2, phase gates.** The `scripts/check-all` runs in tasks 02, 04 and 06 are plan-mandated phase gates, ledgered as `Task <NN>: ran test_all (plan-mandated phase gate)`.
- Ruling: S3, the new lanes.** `fx-adr` and `fx-docs` are not installed. Tasks 02, 04 and 06 write ADRs by following `skills/fx-adr/SKILL.md` in the build worktree; the reviewer checks each ADR against that file, and checks ADR 0061's supersession of 0015 with care, as the rule's first real use. This build's completion runs no docs step.
- Ruling: S4, ADR numbers.** Phase A writes 0059 and 0060, Phase B writes 0061, Phase C writes 0062 and 0063, unless that number already exists at the task's base, in which case the lane's next-number rule holds.
- Ruling: S5, the supersede rule (controller, after red-team finding 5; changes design.md's "Supersede rule" and "The index" wording, design.md itself not edited).** (a) Every still-in-force item is numbered as a decision of the new ADR, so a later ADR can name it. (b) The old ADR's status becomes `Superseded by NNNN (replaced: decisions 2, 4; the rest carried forward)`, never "Partly superseded", so each decision has exactly one live copy and the newest ADR alone tells the current story. (c) An ADR with no status line may get exactly one status line added under its title; that and changing that line are the only edits ever allowed. Index statuses are therefore current, superseded by NNNN, or the repo's own words.
- Ruling: S6, `.scratch/` that git ignores (owner, red-team finding 1).** The migration moves untracked or ignored `.scratch/` files with a filesystem move, shows in the dry run the `.gitignore` line it will remove, removes that line on apply, and leaves `git add -- docs/issues` to the owner. Tracked `.scratch/` files still move with `git mv --`.
- Ruling: S7, the docs step is an offer (controller, red-team finding 6).** fx-implement offers the docs step in one line before the branch pass instead of invoking `fx-docs`, so ADR 0006 (pointers, never invocations) stands. With the owner away it is not run and the completion report says so.
- Ruling: S8, locale (controller, red-team finding 22; design.md not edited).** The Locale constraint applies to product UI guidance (mockups, design templates, fx-design and web references). Pages fx writes about a codebase (reports, docs pages, the visual kit) default to `lang="en" dir="ltr"`, with Arabic product strings marked `lang="ar" dir="rtl"`.
- Ruling: <SCRATCH> is /tmp/claude-1000/-development-advantage-backend/41c30690-f980-4e40-a682-fd0bcbf989cf/scratchpad; the S1 brief tool is the existing detached worktree <SCRATCH>/fx-brief-tool, re-pinned to 67584d9.
- Ruling: owner rules and budget mode: HOME and TMPDIR in <SCRATCH>/fx-tests; tests through scripts/scratch-env; no rm, trap or bash -c typed; python3 -I only; nothing under /home/faisal; never run a migration against a real repository; no push, merge, PR or commit to main; no attribution trailers; no em or en dashes; standard tier unless HIGH risk; lenses only on a reported tripwire; a stop condition parks the task and the build continues.

## Log

Parked 2026-10-25: plan red-teamed (findings/plan-red-team.md, 10 blocks, 14 advisory). Two findings need the owner (1: advantage-backend's .scratch/ is git-ignored, so the issue migration cannot use git mv; 5: the ADR supersede rule needs numbered decisions and a status-line rule for ADRs that have none). Build waits for those answers, for the owner to merge branch upstream-update (this plan branches from it), and for the token quota to renew.
Ready 2026-10-25: red-team resolved (24 findings into 6 tasks; owner decided #1 normal copy, controller ruled #5 numbered decisions + Superseded-with-carry-forward + one added status line). Plan branches from main (upstream-update merged locally at 67584d9). Build not started: owner's token quota nearly spent; start with fx-implement after it renews.
Setup: worktree /development/fx/.worktrees/docs-adr-visual on branch docs-adr-visual from main 67584d9; plan directory copied in uncommitted; scripts/setup exit 0.
Pre-flight: table at .fx/2026-10-24-docs-and-adr-lanes/preflight.md (17 pair rows, 6 task rows, 5 conflicts; byte budgets match wc -c at HEAD). Rulings follow.
Ruling: "no docs/" cannot occur where fx plans (compile-brief needs docs/plans/<slug>/plan.md). Tasks 05 and 06 use this skip condition instead: no Markdown with Evidence lines under docs/ outside docs/plans/ means no lookup, no docs step offer, and no .fx/docs-index.json written; the test is a repo whose docs/ holds only docs/plans/. Why: pre-flight conflict 1. Cost if wrong: an index file in every build worktree, caught by that test.
Ruling: task 02 adds src/tests/gates/lane-rules.test.ts (and its built js) to its Files and retargets the assertion on fx-debug's prevention sentence to the new text; never weaken it. Why: pre-flight conflict 2. Cost if wrong: a red gate, caught by test_scope.
Ruling: fx-brainstorm's "Never `.scratch/`" line stays (it forbids writing designs there, still true); task 02's .scratch acceptance grep excludes that exact line. Why: pre-flight conflict 3. Cost if wrong: none.
Ruling: the 20-claim cap is implemented once, as task 05's queryIndex --limit (default 20, prints "+n more"); task 06's brief and lookup call it and do not cap again. Why: pre-flight conflict 4 (duplicated logic). Cost if wrong: two caps drifting, caught by task 06's review.
Ruling: the status wording is S5(b)'s "Superseded by NNNN (replaced: decisions 2, 4; the rest carried forward)", capital S, in task 04 and everywhere. Why: pre-flight conflict 5. Cost if wrong: an index status mismatch, caught by task 04's test.
Task 01: dispatched 86ffac9 2026-10-25T19:11:34Z
Task 02: dispatched 22df560 2026-10-25T19:17:04Z
Task 01: minor (deferred): fx-retro SKILL.md is 2,748 bytes against the 2,600 acceptance bound; the 2,300 estimate was unreachable, ratify the deviation.
Task 01: minor (deferred): package-lock.json still reads 0.6.0 (lines 3 and 9) while the four manifests and package.json read 0.7.0; bump it with the release.
Task 01: minor (deferred): SURFACE.md:235 References heading says 33 files, 29 markdown; the tree now has 37 files, 33 markdown.
Ruling: fx-retro SKILL.md at 2,748 bytes is ratified over the task's 2,600 estimate: it holds only the command's own rules and is far under the 20,000 gate. Cost if wrong: none.
Ruling: package-lock.json is bumped to 0.7.0 by task 02 (its brief already says to align it); SURFACE.md's reference count (37 files, 33 Markdown) is corrected in task 06's docs pass. Cost if wrong: a stale count, caught by the final review.
Task 01: confirmed ⚠️ resolved: the lane-triggering bench is on request only (design Testing Decisions); not run, budget mode.
Task 01: cost unavailable (no transcript recorded)
Task 01: complete (commits 86ffac9..22df560, review clean)
Task 02: ran test_all (plan-mandated phase gate): ALL GREEN per report.
Task 03: dispatched 87c9fec 2026-10-25T19:22:33Z
Task 02: minor (deferred): scratch-migrate undo leaves an empty docs/ when mkdir created it (src/lib/scratch-migrate.ts:86)
Task 02: minor (deferred): .gitignore rollback sed Ni is a no-op for a last line without newline, and sed -i is GNU only (src/lib/scratch-migrate.ts:125)
Task 02: minor (deferred): ADR 0060 decision 3 omits fx-setup's migration step as a place that still names .scratch/
Task 02: minor (deferred): fx-debug prevention line rewrap at skills/fx-debug/SKILL.md:372
Task 02: open Important (4, findings/02-review.md): undo re-runs the failed step and reports a false UndoIncomplete; symlinks followed for .scratch, docs, docs/issues and .gitignore; the plugin-root check duplicated in fx-setup; package-lock.json still 0.6.0 (ruling violated).
Ruling: task 02 fix round 1 runs after task 03 commits (one writer at a time): undo only completed steps; refuse a symlink at any path the migration reads or writes (.scratch, docs, docs/issues, .gitignore, entries, pointer files) with a test; one shared plugin-root check in fx-setup used by both migration steps; bump package-lock.json to 0.7.0. Minors stay deferred. Cost if wrong: a migration that writes through a link or misreports, caught by the fix round's re-review.
Task 02: fix round 1 dispatched (resumed implementer) 2026-10-25T19:30:34Z
Task 03: Visual check: not run: the light, dark and 390 px check needs a browser session; headless Chrome rendered the map with sample data only (implementer report).
Task 03: minor (deferred): SURFACE.md:237 References heading counts and vendored-library wording are stale after the kit.
Task 03: minor (deferred): visual-kit.test.ts runs its assertions on import, so task 04 importing kitErrors reruns the gate.
Task 03: minor (deferred): fx-map-1.ts:162 unguarded JSON.parse skips the on-page invalid-data message for malformed JSON.
Task 03: minor (deferred): fixed-size map nodes can clip long labels on dense levels; no overflow rule.
Task 03: confirmed ⚠️ resolved: the visual check is ledgered as not run (no browser session; red-team #14 rule); the old report-assets, mermaid and tailwind files are task 04's (it moves the reports onto the kit).
Task 03: cost unavailable (no transcript recorded)
Task 03: complete (commits 87c9fec..e1d5e27, review clean)
Task 04: dispatched af1f742 2026-10-25T19:34:48Z
Task 02: fix round 1/5 (4 addressed, 0 open; commits e1d5e27..530aa89)
Task 02: minor (deferred): scratch-migrate edit and .gitignore steps leave a truncated file and print "undone" when the write fails after open (src/lib/scratch-migrate.ts:117-121, 132-136)
Task 02: minor (deferred): scratch-migrate failed-move cleanup error masks the move error and still prints "undone"; the path has no test (src/lib/scratch-migrate.ts:101)
Task 02: minor (deferred): scratch-migrate refuses a tracked pointer symlink such as CLAUDE.md -> AGENTS.md, blocking the whole migration (src/lib/scratch-migrate.ts:64)
Task 02: cost unavailable (no transcript recorded)
Task 02: complete (commits 22df560..f231895 plus fix 530aa89, review clean after fix round 1)
Task 04: ran test_all (plan-mandated phase gate): ALL GREEN per report.
Task 04: Visual check: not run: no browser.
Task 05: dispatched 8a5ad39 2026-10-25T19:39:20Z
Task 04: minor (deferred): ADR 0061 decision 8 repeats the vendoring rule already in decisions 1 and 2, leaving two live copies.
Task 04: minor (deferred): fx-architecture SKILL.md badge row and ADR callout still name emerald, amber and slate while HTML-REPORT.md uses kit tokens.
Task 04: minor (deferred): visual-assets.md (task 03's file) edited by one sentence outside the Files list; disclosed and justified.
Task 04: confirmed ⚠️ resolved: visual check ledgered as not run (no browser). ADR 0015's status line quotes the replaced sentence instead of "decisions N" because 0015 has no numbered decisions; that follows fx-adr's lead-phrase rule for unnumbered ADRs and is accepted under S5.
Task 04: cost unavailable (no transcript recorded)
Task 04: complete (commits af1f742..e783040, review clean)
Task 06: dispatched 1ad05b1 2026-10-25T19:45:01Z
Task 05: minor (deferred): fence tracking ignores fence length, so a four-backtick fence containing a three-backtick block closes early
Task 05: minor (deferred): the `stale` subcommand and the `build` JSON output have no process-level test
Task 05: open Important: writeIndex writes .fx/docs-index.json for a docs tree with no evidence lines (prose-only docs/readme.md reproduces it); ruling violated.
Ruling: task 05 fix round 1 after task 06 commits (one writer): skip the write when the index has no claims and no problems; add the prose-only docs case to the nodocs test loop. Cost if wrong: an index file in every repo with plain docs, caught by that test.
Task 06: ran test_all (plan-mandated phase gate): ALL GREEN per report.
Ruling: the ADR 0059 to 0061 Evidence-format seam (task 06 concern 1: 10 malformed lines) is fixed in task 05's fix round 1, with the ADR template and fx-adr guidance, since task 05 owns the parser; those ADRs are new on this unmerged branch, so their bodies may change. Cost if wrong: unparsed ADR evidence, caught by an index build with 0 malformed lines in the fix report and the re-review.
Task 05: fix round 1 dispatched (resumed implementer) 2026-10-25T19:51:46Z
Task 06: minor (deferred): compile-brief docsOut discards docs-index stderr, so a failure message loses its cause
Task 06: minor (deferred): final-review.md branch-pass text now sits under the Docs step heading, add a branch-pass heading
Task 06: minor (deferred): no test covers compile-brief docsOut die paths (bad exit, missing claims list)
Task 06: open Important: skills/fx-docs/SKILL.md branch-mode query has no --limit, so it gets the default 20 claims and never visits docs past that on a large branch.
Ruling: task 06 fix round 1 after task 05's fix commits (one writer): branch mode passes an explicit no-cap value supported by task 05's queryIndex (add one only if none exists, with a test) so every claim the branch touches is visited; lane lookups keep the default 20. Cost if wrong: stale docs missed on large branches, caught by the re-review.
Task 06: confirmed ⚠️ resolved: check-all is the implementer's phase-gate run; the exit gate reruns it fresh.
Task 05: fix round 1: controller re-review (production change 9 lines in src/lib/doc-index.ts plus tests and ADR evidence lines): writeIndex now skips the write when claims and problems are both empty; the prose-only case was watched failing first; docs-index build over the worktree reports 0 malformed lines (was 10). ADR 0060's "references/templates/" became "references/templates" so directory queries match. Accepted.
Task 05: cost unavailable (no transcript recorded)
Task 05: complete (commits 8a5ad39..17da638 plus fix b2c616e, review clean after fix round 1)
Task 06: fix round 1 dispatched (resumed implementer) 2026-10-25T19:53:32Z
Task 06: fix round 1: controller re-review (4 code lines, src/scripts/docs-index.ts): --limit 0 now means no cap, watched failing first; fx-docs branch mode passes it; lane lookups keep 20. Accepted.
Task 06: cost unavailable (no transcript recorded)
Task 06: complete (commits 1ad05b1..3f88c5a plus fix 3043c87, review clean after fix round 1)
Coverage audit: 9 gaps (findings/coverage-audit.md), tasks 01 to 06.
Ruling: G2: an ADR's verified commit is recorded in fx's own index (.fx/docs-index.json verified map, keyed by the ADR path), never in the ADR (S5 allows only a status line); ADR claims then pass stale pass one like any doc. Fixed in the final fix wave. Cost if wrong: every ADR re-read every run, caught by a test.
Ruling: G5: in a repo with no evidence-bearing docs, fx-implement offers a first full documentation run once at build end; a decline is recorded in .fx.json (docs_first_run: declined) so it does not nag; task 06's "no docs/" wording is aligned with the pre-flight skip ruling. Fixed in the final fix wave. Cost if wrong: the first full run happens only on request, caught by the re-review.
Ruling: G1, G3, G4, G6, G7, G8, G9 go to the final branch review as named checks; confirmed ones are fixed in its single fix wave.
Final review: security lens finding 1 confirmed by the controller: references/visual/visual-assets.md:68-69 reads "every `<` written as `<`" (no \u003c anywhere), a script-injection hole in generated pages.
Owner 2026-10-25: after the token quota renews (Wednesday 15:00) and after this build finishes, run the end-to-end benchmark: 2 full runs on the README's invoice-approval feature (docs/plans/2026-10-21-audit-fx/plan-phase-runs.md method, Haiku simulated user, same models) plus the fixture build (tests/fixture-build/), with the docs and ADR steps as extra rows; compare against README 'What a build costs' (0.2.9: 12.5M to 13.1M tokens, 26.8 to 27.9 min).
Final review: broad 0C/8I/8M (findings/final-review.md); unprimed 6I/4M (final-unprimed.md); security lens 3I/1M (final-lens-security.md).
Ruling: G2's store is a tracked file docs/adr/.fx-verified (one line per ADR: file name and verified commit), not .fx/ (the broad review showed .fx/ is rebuilt and absent in fresh worktrees); ADR bodies stay untouched. Cost if wrong: one more tracked file per repo, caught by the re-review.
Ruling: one fix wave from .fx/2026-10-24-docs-and-adr-lanes/final-fix-list.md (17 items: page escaping and the \u003c rule, the repo-root plugin check, G2 and G5 built, ADR 0015/0061 per S5, partly-superseded handling, compile-brief degrades, migration references, CRLF and atomic edits, vendor rows asserted, --no-renames, scoped docs adoption, map error state, README count, coverage-gap assertions, five must-fix minors). Deferred: U-9, U-10, writeIndex via symlinked .fx/, 13 minors. Cost if wrong: a residual Important, surfaced in the completion report.
Final review: fix wave dispatched 2026-10-25T20:02:48Z at b874cd4 (Capable because: final fix wave across security and migration code)
