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
