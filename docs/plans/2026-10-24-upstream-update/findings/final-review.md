# Final branch review: upstream-update (dd99986..cb5c4cb)

Reviewer: broad pass, branch mode. Read-only; one file written (this one).
Evidence run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all` at cb5c4cb: ALL GREEN, exit 0, 119 gate headers. Working tree clean afterwards (only another reviewer's untracked findings file).
The diff package is caveman-compressed in places; where it elided context I read the files at HEAD directly.

## Strengths

- The size gate is real and tight: `src/tests/gates/skill-size.test.ts:14-15` with `PENDING = {}`, and it fails a stale PENDING entry. Every SKILL.md is under 20,000 bytes (largest: fx-tdd 19,368, fx-humanize 19,247, fx-debug 18,983, fx-brainstorm 18,463, fx-implement 18,271). `PENDING_ORPHANS` in `scripts/check-paths:22` is empty too.
- The fx-implement split kept what must survive compaction inline: stop conditions (`SKILL.md:55-63`), resume rules (`:100-118`), the five-round fix-loop cap (`:310-319`), and a "read X, every time" pointer at each step for final review, exit gate and completion (`:361-371`). Later edits (12, 16, 17) landed in the right files: declined rules in `references/review-inputs.md:38-50` and `reading-rules.md:12` (count = Minor + declined, which closes red-team finding 4), the re-reviewer brief in `fix-loop.md:76-77` and `re-review-prompt.md:22`, the range guard in `scripts/review-package:31-35`.
- compile-brief's level-aware `section()` (`src/skills/fx-implement/scripts/compile-brief.ts:35-44`) is the smallest correct change; the `## Review focus` section (`:65-66`, `:121`) matches the template heading (`skills/fx-plan/templates.md:45`) and both reviewer prompts.
- The fx-setup migration step runs behind the same inline FX vetting as the Codex block, on every runtime, and `src/tests/gates/fx-setup-root-check.test.ts` executes the shipped command against a fake root inside cwd and the real root. Task 10's Important 1 is properly closed.
- The humanizer rebase keeps every fx addition (`skills/fx-humanize/SKILL.md:9, 29, 35, 39, 51`) and the 26 marker is consistent in `PREAMBLE.md:58` and `src/lib/preamble.test.ts:128`.
- The three new commands are registered everywhere from one list (`src/lib/user-invoked-lanes.ts:5`), the opencode v2 plugin registers commands from `commands/` rather than a hard-coded list, and the generated skills match (check-generated green).

## Issues

### Critical (Must Fix)

None.

### Important (Should Fix)

**I1. `src/lib/glossary-migrate.ts:62-71` and `:90-95`: "refused, repo unchanged" can be false (named check 3).**
`applyMigration` validates the whole plan first, then runs `git mv` once per move and `writeFileSync` once per edit with no rollback. If move N fails after moves 1 to N-1 ran (an `index.lock` from a concurrent git process such as an editor or a hook), or a write fails after all moves ran (a read-only doc, EACCES), the `catch` at `:91-94` prints `glossary-migrate: refused, repo unchanged: ...`. The repo is changed. The task 10 ruling (state.md, fix round 1) required "on any failure leave the repo unchanged"; ADR 0054:17 and `commands/fx-setup.md:104-105` repeat the promise. A rerun does finish the job (tested at `glossary-migrate.test.ts:112-123`), so the damage is a false message, not a stuck repo. Fix: in `applyMigration`, record completed moves and original file contents; on any error, undo the writes, `git mv` the completed moves back in reverse, then rethrow. If the undo itself fails, print `partly applied: moved <list>; rerun to finish` instead of "repo unchanged". Add one scratch-repo test that makes the apply fail after the moves (`chmod 444` a docs file in the edit set, so its write throws) and asserts either `git status --porcelain` is empty or the message says "partly applied".

**I2. `src/lib/glossary-migrate.ts:54-58`: the dry run the owner says yes to hides breakage outside its edit set (escalates deferred minors 17 and 18).**
The edit set is only `CLAUDE.md`, `AGENTS.md`, `repo.md` and `docs/**` (minus plans and adr). The moved glossaries' own text is never rewritten (only `GLOSSARY-MAP.md` is, `:66`), and nothing else is listed. Measured read-only on the owner's own repo `/development/advantage-backend` (no migration run): `spec/boundaries/docs_spec.rb:6-9` reads `CONTEXT-MAP.md` by name, so applying the migration turns the owner's test suite red; `engines/core/CONTEXT.md:7` ("the root `CONTEXT.md`") and `engines/engagement/README.md:99` keep dead pointers. The dry run shows none of this, so the owner's yes is not an informed one. Also: a reference-style map link (`[a]: engines/a/CONTEXT.md`) is not followed by the regex at `:37`, but `rename()` still rewrites it in `GLOSSARY-MAP.md`, producing a dead link. Fix: (a) rewrite the moved files' own text with the same `rename()`; (b) after the plan, run `git grep -l` for the old names over tracked files outside the edit set, `docs/plans` and `docs/adr`, and print each as `still names the old file (not edited): <path>` in the dry run, so fx-setup shows it before asking; (c) follow `^\[[^\]]+\]:\s*(\S+)` definitions as well as inline links. One test per part.

**I3. Named check 2: the "next lane asks once" path is half-specified and unsafe as written. Decision: correct the ADR and docs to match HEAD; do not implement a second runner.**
`references/vocab/domain-modeling.md:50-54` tells any lane, in the owner's session, to "show the dry-run list from the fx-setup migration and ask once". It names no command and no vetted FX root, and says nothing about what happens on yes. Running `glossary-migrate` safely needs the inline FX check that lives only in `commands/fx-setup.md:110-126`; copying it into a reference recreates the unvetted-root path the task 10 ruling forbade. README, INSTALL (`:309-326`) and SURFACE (`:221`) already describe HEAD: only `/fx:fx-setup` asks. ADR 0054:17 and design.md:85 still say "or the next lane". Fix: replace domain-modeling.md:50-54 with: a lane that would write to an old-named glossary writes to it, and in the owner's session says once that `/fx:fx-setup` renames it (no dry run, no migration from a lane; a dispatched subagent says nothing). Change ADR 0054:17 to "`/fx:fx-setup` asks the owner once; a lane that writes to an old-named glossary points at it." ADR 0054 is new on this branch, so editing it before merge does not break the status-line-only rule. Ledger a ruling recording the deviation from design.md:85. This absorbs deferred minor 20.

**I4. `skills/fx-implement/SKILL.md:110-113` with `references/status.md:19-22`: a parked task has no way back (story 14).**
Park-and-continue writes `Task <NN>: parked: needs you: ...` and leaves the step "unrun until the owner answers". The resume rules say a task with a `parked:` line "is never re-dispatched". Nothing says what the controller does when the owner answers, in this session or a resumed one, so a compacted or resumed controller skips the task forever and its dependants with it. Fix: one rule in status.md and one clause in the resume list: the owner's answer is ledgered as `Ruling: owner, <date>: Task <NN> unparked: <answer>`; a task whose last parked line is followed by an unpark ruling resumes at the parked step. Add the line shape to `ledger-lines.test.ts`.

**I5. Seven coverage gaps: every rule is present in text; none of the seven is asserted (plan-mandated by the ledger ruling that sends them to this review's fix wave).** Named check 1, one line each:
1. Gap 1, vision rule: present at `skills/fx-implement/task-reviewer-prompt.md:168` and `skills/fx-review/reviewer-prompt.md:38`; no test. Missing: an `includes('as a vision, not a checklist')` on both templates in `review-content.test.ts`.
2. Gap 2, tdd and debug: present at `skills/fx-tdd/SKILL.md:124` (seam catches and misses), `:126-127` (no RED from a browser or system test), `:272` (name every failure), `:317-319` (undo by diff, never checkout or stash); `skills/fx-debug/SKILL.md:327` (forced red by diff), `:344-345` (verification.md), `:368-370` (prevention, fx-retro). Commit 06a694c added no test at all. Missing: one `includes` per rule, seven in all.
3. Gap 3, finishing and parallel: present at `references/finishing.md:44` (no `git pull`), `:76` (never `--force`), `references/parallel.md:17-29` (per-task review, one merger, controller-only ledger, never `git stash`); only reachability is tested. Missing: `includes` for "Run no `git pull`", "Never add `--force`", "Only the controller writes the ledger", "Never `git stash`".
4. Gap 4, glossary halves: subagent writes old-named file present at domain-modeling.md:53-54 (rewritten by I3); map format present at `:112-138`. Missing: assert `## Relationships` and "If unclear," in domain-modeling.md, and the I3 replacement sentence.
5. Gap 5, plan lane: reader framing at `skills/fx-plan/SKILL.md:29`, scratch-build ban at `:78`, self-review checks at `:175-178`. Only the template heading is asserted (`plan-template.test.ts:28`). Missing: `includes` for "What they cannot know is what you decided", "no scratch implementation", "**Review Focus.**", "**Proportion.**".
6. Gap 6, commands: four headings at `commands/fx-pr.md:24-35`, no-push at `:12-13`, `Not run:` at `:31`, citation rule at `commands/fx-retro.md:33-35`. Missing: assert the four `## ` headings, "Never run `git push`", "Not run:" and "Citation or drop" on the generated skills; add fx-retro to the on-request lane-triggering bench list.
7. Gap 7, humanize: "How to work" (`SKILL.md:27`) and "When not to act" (`:189`) present; COVERAGE.md:5 describes 3.1.0 accurately except a stray line (Minor M1). Missing: `includes('## How to work')` and `includes('## When not to act')`.

### Minor (Nice to Have)

- **M1.** `skills/fx-humanize/COVERAGE.md:3`: "Renamed to GLOSSARY.md and GLOSSARY-MAP.md following mattpocock-skills 1.3.0." Humanizer has no glossary; the line came from task 10's Files list (a plan error) and is false in this file. Delete it.
- **M2.** `commands/fx-retro.md:9-11`: "the ledger in `.fx/<slug>/`". The ledger is `docs/plans/<slug>/state.md` (`.fx/` holds briefs and reports). The Read list at `:17` has it right; fix the argument line.
- **M3.** `commands/fx-retro.md:20`: `node <fx root>/scripts/build-cost`; `<fx root>` is defined nowhere in the command, and the task 19 ruling assumed the command already resolves one. Use the form `references/cost.md:3` uses: `node <skill base directory>/../../scripts/build-cost`.
- **M4.** `commands/fx-pr.md:22-40`: the draft's four headings are written as live `##` headings of the command, so the following `## Output` reads as a fifth draft section. Put the template in a fenced block.
- **M5.** `docs/adr/0025-*.md:1`: ADR 0055:18 says it amends ADR 0025, but 0025 carries no "Amended by 0055" status line (0045 got one for 0058).
- **M6.** `INSTALL.md` `.fx.json` keys: `isolated_test_execution` appears only in `skills/fx-implement/references/parallel.md:3` and `SKILL.md:163`; no doc lists it and no code reads it.
- **M7.** `skills/fx-implement/references/final-review.md:9-10` says to name every ruled `declined:` line in the branch brief; this brief pointed at the ledger instead. They reached me (state.md:126-127 with rulings at :128-129), so the second Task 12 declined item is answered: the mechanism works through the ledger pointer, but the brief did not follow the reference's wording.
- **M8.** `INSTALL.md:320`: "`/fx-setup` lists what would change"; the rest of the docs say `/fx:fx-setup`. One term for one thing.

## Spec compliance

- ❌ Issues found: design.md:85 ("or the next lane that writes to the glossary, asks once") is not implemented as a runnable path; I3 rules that the design line is corrected, not built. design.md:144 ("park, continue") lacks the unpark half (I4). Story 5's "nothing renamed behind my back" holds, but the dry run under-reports (I2).
- Plan deviations already ruled and accepted: version bump in task 01; six ADRs (0058 added); budget-mode batching; humanize COVERAGE moved to task 11.
- Plan-level issue: task 10's Files list put the glossary-rename line in `skills/fx-humanize/COVERAGE.md` (M1). The coverage audit also shows the plan let several ACs be met by a file existing (gaps 3, 6).
- ⚠️ Cannot verify from diff: the live lane-triggering bench for the new commands and the pressure fixtures (on request by design); real Codex and opencode registration of the three new commands (conformance rows run against fixtures).

## Carried findings triage

Numbers are the order of the 45 `minor (deferred)` lines in state.md.

**Must fix before merge**
- 17, 18 (reference-style links, mentions of unmoved files): fold into I2; the owner's own repo is the blast radius.
- 20 (domain-modeling dry run with no command or root): fold into I3.
- 23 (false "repo unchanged"): I1.
- 31 (`README.md:54` still lists discard on the menu): the user-facing summary contradicts story 15; one line.

**Already resolved at HEAD, close them**
- 9: the sentence is back at `skills/fx-review/SKILL.md:270` (b619726).
- 36: `commands/fx-pr.md:31` now names a literal `Not run:` line (ruling carried out).
- 19, first half: fx-setup now says what to do with a conflict list (`commands/fx-setup.md:104-105`); the stdout and stderr wording difference can wait.

**Fix in the same wave (one line each, cheap), not blocking**
- 38 (retro offer after "Which?" in `completion.md:59`): move it above the menu so it cannot read as a fourth option.
- 32 (ledger-lines does not assert the declined needs-you shape in status.md): add with I4's assertion.
- 34, 37 (stale "five commands" and "seven lanes" in conformance rows 13 and 14, and `src/plugins/fx-opencode-v1.ts:279`): comments and error strings only.
- 43 (ADR 0054 "four cases"): fix while editing ADR 0054 for I3.

**Confirmed deferred, can wait**
- 1 (fenced `# ` in section()): same behaviour as before the change; no brief hit it.
- 2, 7, 8, 27, 29, 33, 39: layout and wording only.
- 3, 21: missing captured REDs; the gates are green and exercised.
- 4 (stale PENDING_ORPHANS not flagged): the list is empty.
- 5 (fix-loop-shape negative checks skip SKILL.md): the text is gone from both; low value.
- 6 (positional words in moved text): readable; fix on the next edit of those files.
- 10 (`server.cts:402` string replace): `helper.js` holds no `$` replacement sequences today; latent only.
- 11 (good-tests.md at 8,998 of 9,000): the leaf-size gate catches the next edit, and a standing ruling says what to do.
- 12 (good-tests dropped "describe what, not how" and an example): a dropped rule, but in a fix task, not a split; restore when good-tests is next split.
- 13, 14 (COVERAGE rows without claim ids): bookkeeping.
- 15, 16 (render-level declined path, malformed .fx.json): unit-tested in glossary.test.ts; the render path is a try/catch around the same call.
- 22 (§26 named only via replies.md): reachable from step 1.
- 24, 25 (branch-pass declined `fix` path and line rename): this run shows the rename is easy to skip (M7); fix when final-review.md is next edited.
- 26, 28 (prose with no assertion): same class as I5; add with the wave if cheap.
- 30 (Phase 6 prevention only in the checklist): the checklist is what is acted on.
- 35 (finishing.md "following the repo's template"): accurate for the forge; harmless.
- 40, 41 (pressure criteria): live-only fixtures; fix before the first live run.
- 42, 44, 45 (ADR 0056 citation, ADR 0045 date form, SURFACE six vs seven): docs polish.

**Ruled declined lines (2, both reached this review via the ledger)**
- Task 12 declined 1 (includes assertions pin wording, not behaviour): ruling stands. Text gates are the seam the design names; I5 asks for more of them, not different ones.
- Task 12 declined 2 (do ruled declined lines reach the final brief in a real run): answered by this run. They reached me through the ledger pointer, not named inline as final-review.md:9-10 asks (M7). Ruling stands; close it.

## Declined to judge

- Whether the lane-triggering bench would show any of the three new commands firing on an unrelated prompt: live run, on request only.
- Whether the pressure fixtures trigger the intended failure in a real model: live run.
- Whether `parallel.md` works end to end: no `.fx.json` in any repo here sets `isolated_test_execution`, and no code reads the key.

## Recommendations

- Do I1 to I4 and the "must fix" minors as one fix wave; I5's assertions can ride in the same commit set as text-gate additions in `review-content.test.ts`, `plan-template.test.ts` and a small new `lane-rules.test.ts` for fx-tdd, fx-debug, finishing and parallel.
- Before the owner runs `/fx:fx-setup` on advantage-backend, rerun the dry run after I2 so `spec/boundaries/docs_spec.rb` shows up in the list.
- For the next plan: an AC that a file "contains X" needs an `includes` in the task's Tests, or the coverage audit will keep finding the same gap class.

## Assessment

**Ready to merge?** With fixes
**Reasoning:** check-all is green and the size, split and command seams hold; the glossary migration can misreport a partial apply and under-reports what it breaks in a real repo (the owner's own repo included), and parked tasks have no resume path. All four Important fixes are small.

## Ledger lines

Task 10: minor (deferred): skills/fx-humanize/COVERAGE.md:3 carries a glossary-rename line that does not apply to humanizer
Task 19: minor (deferred): commands/fx-retro.md:9-11 places the ledger in .fx/<slug>/ instead of docs/plans/<slug>/state.md
Task 19: minor (deferred): commands/fx-retro.md:20 uses an undefined <fx root>; use the skill base directory form from references/cost.md:3
Task 18: minor (deferred): commands/fx-pr.md draft headings are live ## headings, so ## Output reads as a fifth section; fence the template
Task 22: minor (deferred): ADR 0025 has no "Amended by 0055" status line though ADR 0055 amends it
Task 23: minor (deferred): isolated_test_execution is undocumented in INSTALL.md and read by no code
Task 12: minor (deferred): the final brief pointed at the ledger instead of naming each ruled declined line as final-review.md:9-10 says
Task 23: minor (deferred): INSTALL.md:320 says /fx-setup where every other doc says /fx:fx-setup
