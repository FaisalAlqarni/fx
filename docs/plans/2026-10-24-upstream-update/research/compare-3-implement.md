# Compare 3: implementation orchestration (upstream vs fx)

Scope: superpowers v7.0.1 (`2ce8aa1`) build skills, mattpocock-skills master `5beb35b` (`implement`, `implement-spec`, `handoff`), against fx `main` at `dd99986` (`skills/fx-implement/` and its references, scripts, ADRs). Read-only. Line numbers are `file:line` on the version named.

## 1. Files read

Upstream (superpowers, current head unless noted):

| File | Lines | Bytes |
|---|---:|---:|
| skills/subagent-driven-development/SKILL.md | 336 | 19,506 |
| skills/subagent-driven-development/implementer-prompt.md | 154 | 6,335 |
| skills/subagent-driven-development/task-reviewer-prompt.md | 207 | 9,031 |
| skills/subagent-driven-development/re-review-prompt.md | 115 | 4,761 |
| skills/subagent-driven-development/references/fix-loop.md | 77 | 4,249 |
| skills/subagent-driven-development/references/final-review.md | 47 | 2,447 |
| skills/subagent-driven-development/references/preflight.md | 26 | 1,353 |
| skills/subagent-driven-development/references/handling-reports.md | 15 | 1,062 |
| skills/subagent-driven-development/references/resuming.md | 12 | 614 |
| skills/subagent-driven-development/references/batching.md | 11 | 583 |
| skills/subagent-driven-development/references/cannot-verify.md | 10 | 513 |
| skills/subagent-driven-development/scripts/sdd-workspace | 87 | 3,684 |
| skills/subagent-driven-development/scripts/task-brief | 43 | 1,322 |
| skills/subagent-driven-development/scripts/review-package | 53 | 2,029 |
| skills/executing-plans/SKILL.md | 321 | 18,103 |
| skills/executing-plans/scripts/task-start | 28 | 963 |
| skills/executing-plans/scripts/task-done | 52 | 1,692 |
| skills/using-superpowers/references/claude-code-tools.md | 29 | 1,469 |
| skills/using-git-worktrees/SKILL.md | 167 | 6,813 |
| skills/verification-before-completion/SKILL.md | 120 | 3,646 |
| skills/dispatching-parallel-agents/SKILL.md | 167 | 6,078 |
| skills/finishing-a-development-branch/SKILL.md | 225 | 7,781 |
| tests/skill-size/test-skill-size.sh | 31 | |
| RELEASE-NOTES.md lines 15 to 35, 130 to 145 (the size cut and the nested controller entries) | 36 | |
| `git diff v6.3.0 HEAD` for every path above | | |

Upstream (mattpocock-skills master 5beb35b; base 1.2.3 = 30204e6):

| File | Lines | Release label |
|---|---:|---|
| skills/engineering/implement/SKILL.md (+ agents/openai.yaml 5) | 17 | existed at 1.2.3; Skill-tool wording and ticket fetch are on master, not yet released (6d6a5b9, 04320ee, e48341a are after v1.3.1) |
| skills/engineering/implement-spec/SKILL.md (+ agents/openai.yaml 5) | 40 | released in 1.3.0 (24f41cc, tags v1.3.0 and v1.3.1 contain it) |
| skills/productivity/handoff/SKILL.md (+ agents/openai.yaml 5) | 16 | temp-dir resolution is on master, not yet released (4f4e943, 0f5e033) |
| docs/engineering/implement.md | 97 | master |

fx (`/development/fx` at dd99986):

| File | Lines | Bytes |
|---|---:|---:|
| skills/fx-implement/SKILL.md | 948 | 49,175 |
| skills/fx-implement/fix-loop.md | 136 | 7,904 |
| skills/fx-implement/implementer-prompt.md | 231 | 10,909 |
| skills/fx-implement/task-reviewer-prompt.md | 321 | 14,675 |
| skills/fx-implement/re-review-prompt.md | 189 | 8,189 |
| skills/fx-implement/COVERAGE.md | 269 | 17,744 |
| skills/fx-implement/scripts/compile-brief | 149 | 5,970 |
| skills/fx-implement/scripts/compile-brief.test.js | 113 | 6,569 |
| skills/fx-implement/scripts/review-package | 66 | 2,209 |
| references/vocab/worktree-setup.md | 87 | 3,436 |
| references/vocab/model-selection.md | 69 | 2,975 |
| references/vocab/verification.md | 177 | 8,028 |
| commands/fx-handoff.md (and its generated copy skills/fx-handoff/SKILL.md, 95) | 92 | 3,841 |
| scripts/build-cost (generated from src/scripts/build-cost.ts; esbuild boilerplate skipped) | 388 | 16,042 |
| docs/adr/0029, 0030, 0040, 0042, 0044 | 21, 29, 26, 28, 21 | |
| references/harnesses/claude-code.md (all), codex.md, opencode.md, opencode-v2.md (subagent sections) | 58 + parts | |
| lib/plan-state.js (scan, parseState, describePlans) | parts of 197 | |
| PREAMBLE.md (as injected) | 60 | |
| tests/gates/*.test.js that read fx-implement (grep of assertions only) | | |

Evidence outside both repos (measured, read-only): the owner's own nested run of 2026-10-24, main transcript `~/.claude/projects/-development/a06e0dd4-1271-4ef8-9cdd-073f459aa1cf.jsonl`, orchestrator `subagents/agent-a8bc048612c528253.jsonl` (4,279 records, 01:23 to 19:12) and its `.meta.json` files; ledger `/development/.worktrees/advantage-backend-measurement/docs/plans/2026-10-24-measurement-completion/state.md` (860 lines).

### What that run measured

The owner already ran fx-implement one layer down, by hand ("Backend lane controller", `general-purpose`, `model: sonnet`, background). Facts:

- It worked: 156 children (106 sonnet, 50 opus, every opus one with a `Capable because:` line), 38 `SendMessage` calls by the orchestrator to resume implementers, tasks 01 to 45 worked from one ledger.
- **build-cost was blind for the whole run.** The orchestrator's transcript holds 86 `cost unavailable (transcript is another session's)` results and zero `Task NN: cost` lines; the ledger carries 36 such lines. Cause: `build-cost --task` reads `.fx/transcript-path`, which is the main session's transcript, and requires a `Task NN: dispatched` ledger write in it (`scripts/build-cost`, `taskCost`, the "another session's" return); the orchestrator made those writes in its own subagent transcript. Even given the orchestrator's file, it looks for children in `<file>/subagents`, but Claude Code stores every depth in the main session's flat `subagents/` directory, with `parentAgentId` and `spawnDepth` in `.meta.json` (302 depth-2 files on this machine).
- **18 child completions reached the main session instead of the orchestrator.** The main session relayed each by `SendMessage` ("Its result was delivered to me instead of you"). Pattern seen at 01:59:39 to 02:01:04: the orchestrator ended its turn "waiting", and the implementer's completion went to main. 437 other notifications did reach the orchestrator.
- The main session also used `SendMessage` 9 times for steering: owner rulings, new tasks 38 to 45, production facts, and one repair (a detached HEAD at task 23).
- The orchestrator's brief was hand-written (it is the first user message of the orchestrator transcript): invoke `fx:fx-implement` fully, worktree already created and not to be entered, standing rulings, "Do NOT ask the merge question", and `NO_AGENT_TOOL` if the Agent tool is missing.

These are the defects the nested-controller design in section 4 closes.

## 2. Findings per upstream skill

Verdicts: **fx gap**, **upstream better**, **fx better**, **equivalent**, **n/a**. Size S/M/L.

### 2.1 subagent-driven-development (SKILL.md, references/, prompts, scripts)

**F1. SKILL.md size and the compaction cut.** Upstream: SDD SKILL.md moved from 32,577 to 19,506 bytes in 7.0.1, with fix loop, final review, report handling, resuming, preflight, batching and cannot-verify in `references/`, "read at the step that needs them", because "Claude Code re-attaches each skill cut off at 20,000 characters ... subagent-driven development lost its five-round limit and ran 18 fix rounds" (RELEASE-NOTES.md:22 to 27; `tests/skill-size/test-skill-size.sh:16` fails at 20,000 bytes). fx: `skills/fx-implement/SKILL.md` is 49,175 bytes; the 20,000-character cut lands at SKILL.md:402, inside "Controller reading rules". After a compaction the controller keeps nothing from: step 1 dispatch and `compile-brief` (426 to 481), report handling and the re-dispatch cap (483 to 527), the review, cost step and lens dispatch (529 to 646), the fix loop pointer and its five-round cap (648 to 663), completion lines (665 to 699), coverage audit, final review, exit gate, plan-complete line, completion report and the merge question (712 to 924). fx has no size gate. Verdict: **fx gap**, the same failure upstream shipped a release to fix. Why it matters: the controller is the only participant that compacts on a long build, and the rules it loses are exactly the caps. Change: split per section 5, and add `tests/gates/skill-size.test.js` failing any `skills/*/SKILL.md` at 20,000 bytes or more (it will also fail `fx-humanize` at 31,745 and `fx-authoring` at 20,774, outside this area). **L.**

**F2. "Read it again before every round."** Upstream SKILL.md:299 to 302: "read references/fix-loop.md ... Read it again before every round, even if you read it earlier in this session: it holds the round cap, the breaker, and the ledger line each round writes, and your memory of it does not survive compaction." Same pattern for handling-reports ("every time you get one", 243 to 245) and resuming ("before anything else", 118 to 120). fx: SKILL.md:662 to 663 points at fix-loop.md once, no re-read instruction. Verdict: **upstream better**; it is the mechanism that makes a split safe. Change: in fx SKILL.md §4, "Read fix-loop.md before every round, including rounds after a compaction: it holds the cap and the breaker." Apply the same wording to each pointer in section 5. **S.**

**F3. review-package range guard.** Upstream `scripts/review-package:25 to 28`: `git merge-base --is-ancestor "$base" "$head"` or exit 3 ("a wrong-branch HEAD yields a range that is ... not rooted at BASE"). fx `scripts/review-package:180 to 185` checks only for an empty range. Verdict: **upstream better**. Why: the measured run hit a detached HEAD at task 23; a HEAD that moved off the branch gives a non-empty range of the wrong commits, and the reviewer approves it. Change: add the ancestor check before the empty-range check, exit 3. **S.**

**F4. review-package first argument is documented four ways.** fx script usage is `SLUG BASE HEAD` (review-package:161, used as `.fx/$slug/review`); SKILL.md:540 and fix-loop.md:71 say `<TASK>`, SKILL.md:752 says `<PLAN>`, re-review-prompt.md:505 says `<slug>`. A task path as first argument writes to `.fx/tasks/03-foo.md/review/`. The relative `bash scripts/review-package` also only works from the skill directory, while SKILL.md:547 anchors `build-cost` with `<skill base directory>`; the measured orchestrator wrapped the scripts in its own `ctl.sh`. Verdict: **fx gap** (internal). Change: say `<SLUG>` and `bash <skill base directory>/scripts/review-package` everywhere. **S.**

**F5. The re-reviewer reads the task file, not the brief.** Upstream re-review-prompt.md:22: `[BRIEF_FILE]`. fx re-review-prompt.md:343 `[TASK_FILE]`; fix-loop.md:48 "the task path". ADR 0042 moved the task reviewer to the compiled brief so rulings and Global Constraints reach it; the re-reviewer was left on the raw task file. Verdict: **fx gap**. Why: a fix round that breaks a ruling made at task 02 passes the scoped re-review, because the re-reviewer never sees the ruling. Change: re-review-prompt.md reads `[BRIEF_FILE]` (recompiled before the re-review dispatch, as SKILL.md:560 already does for the reviewer); fix-loop.md:48 and the round 4 to 5 bullet pass the brief path. **S.**

**F6. Waiting and chasing lost children.** Upstream SKILL.md:186 to 195: wait in bounded 5 to 10 minute stretches, then "reconcile your live children: list them, and chase any that finished without reporting." fx SKILL.md:116 to 148 and 374 to 379 drop the bounded wait on a measured probe (dispatch is non-blocking, completion wakes the parent) and keep "a read of a report file that has already landed" (139 to 140). Verdict: **fx better** for a top-level controller; **fx gap** for a nested one, where 18 completions went to main. Also `COVERAGE.md:39` still records the bounded wait as "K", which is false. Change: the nested-controller reference (section 4) adds "on every wake, check the report and findings files of every outstanding dispatch"; fix COVERAGE.md:39 to "S: superseded by the measured non-blocking wake (SKILL.md §Waiting)". **S.**

**F7. Narration.** Upstream SKILL.md:14 to 15: "at most one short line". fx SKILL.md:45 to 48: chat "says what the user needs to follow along". COVERAGE.md:19 claims the upstream line is kept. Verdict: **equivalent** in effect, COVERAGE drift. Change: correct COVERAGE.md:19. **S.**

**F8. Making the scratch directory ignored without touching a tracked file.** Upstream `sdd-workspace:84 to 86`: create-only `.superpowers/sdd/.gitignore` containing `*`. fx SKILL.md:255 to 269 verifies `git check-ignore -q .fx`, adds `.fx/` to the project `.gitignore`, and spends a paragraph on `rails new` and `.git/info/exclude`; review-package:196 to 199 warns when `.fx/` is not ignored. Verdict: **upstream better**. Why: a self-ignoring `.fx/.gitignore` with `*` needs no edit to any tracked file, works on a greenfield repo before the generator runs, and deletes about 1 KB from SKILL.md. Change: whoever first creates `.fx/` (the SessionStart hook that writes `.fx/transcript-path`, compile-brief, review-package) writes `.fx/.gitignore` = `*` if absent; delete SKILL.md:257 to 269 except the `.worktrees/` line, which worktree-setup.md already owns. **S.**

**F9. Same-basename plan collisions.** Upstream `sdd-workspace:61 to 82` writes a `plan-path` marker. fx workspaces are `docs/plans/<slug>/` and `.fx/<slug>/`, unique by directory name. Verdict: **n/a**.

**F10. Task brief.** Upstream `task-brief` extracts the task heading with awk. fx `compile-brief` adds Global Constraints, controller context, live rulings, the named design passages and stack text, fails on an unresolvable entry, and has a test (compile-brief.test.js). Verdict: **fx better**. Keep.

**F11. Implementers dispatching subagents.** Upstream implementer-prompt.md:50 to 60: never. fx implementer-prompt.md:85 to 95: read-only Explore allowed, no writer, no reviewer (COVERAGE.md:140 to 142 records why). Verdict: **equivalent**, deliberate. Note for section 4: under a nested controller an implementer's Explore is depth 3, which is Claude Code's default limit (claude-code-tools.md:14 to 16); it fits without raising `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`.

**F12. Non-DONE reports.** Upstream references/handling-reports.md:9 to 15 has four BLOCKED moves. fx SKILL.md:501 to 519 adds the cap of two re-dispatches, the parked line, and "skip it, take the next unblocked task" (ADR 0040). Verdict: **fx better**.

**F13. Final review and fix wave.** Upstream references/final-review.md:6 to 29: one code reviewer, ONE fix subagent, one scoped re-review. fx SKILL.md:750 to 783: fx-review branch mode with the limited lens set (ADR 0044), may split serial fixers by file, still one wave. Verdict: **fx better**.

**F14. Cleanup.** Upstream deletes the whole workspace (final-review.md:42 to 45). fx deletes only `.fx/<slug>/` and keeps the committed ledger (SKILL.md:922 to 924). Verdict: **fx better**.

**F15. "Rulings I made".** Upstream final-review.md:33 to 40. fx SKILL.md:886 to 891, excluding the copied Standing rulings. Verdict: **equivalent**. Section 4 makes it the nested controller's relay contract.

**F16. Pre-flight scan.** Upstream references/preflight.md:6 to 26 and fx SKILL.md:325 to 346 are the same text. Verdict: **equivalent**; it moves to `references/preflight.md` in the split.

**F17. Cannot-verify items.** Upstream references/cannot-verify.md:5 to 10. fx SKILL.md:628 to 634 adds `Task <NN>: confirmed ⚠️: <exact text>` so the fixer reads it. Verdict: **fx better**.

**F18. Model selection.** Upstream SKILL.md:139 to 174 (cheapest tier for transcription). fx model-selection.md: standard default, `Capable because:` enforced by the routing hook (claude-code.md, ADR 0031/0044). Verdict: **fx better**. Change: one row for the nested controller (section 4). **S.**

**F19. Reviewer and implementer prompts.** fx's prompts carry everything upstream's do (verified line by line: do-not-trust-the-report, read-only checkout, no-subagents, tests not re-run, evidence-you-cannot-see, plan-mandated as Important, file:line, ⚠️ items) plus rulings-as-requirements, should-this-code-exist, callers and variants, tautological tests, runnable documents, findings-file-first, Tripwires, ledger lines. Verdict: **fx better**.

### 2.2 using-superpowers/references/claude-code-tools.md (the nested controller)

**F20. Nested controller.** Upstream claude-code-tools.md:9 to 29: on Claude Code, when the partner asks or says the session model is too expensive for coordination, dispatch ONE orchestrator subagent on a mid-tier model with the plan path and "use subagent-driven-development end to end"; it picks its own children per Model Selection; workspace and ledger are on disk; its final message carries "Rulings I made" verbatim and the parent relays it, not a summary; whole plan only. RELEASE-NOTES.md:138: "about half the cost and wall clock". fx: absent; the owner ran it ad hoc (section 1) and hit three defects. Verdict: **fx gap**, owner decided to adopt. Change: section 4. **L.**

### 2.3 executing-plans (SKILL.md, task-start, task-done)

**F21. Inline ("Native") execution.** Upstream rebuilt it in 6.4.1: no per-task implementer or reviewer, the session implements, one fresh final review (executing-plans/SKILL.md:8 to 18), chosen when the partner wants to spend less or the harness has no subagent tool (45 to 64). fx dropped executing-plans at absorption ("subagents are always available", fx-plan/COVERAGE.md:52). Upstream's new reason is cost; the nested controller answers cost while keeping per-task review, and every fx runtime has a dispatch tool (harnesses/*.md "Subagent dispatch"). Verdict: **n/a**, keep it dropped. Change: add a COVERAGE row in fx-implement/COVERAGE.md recording that 6.4.1 to 7.0.1 executing-plans was re-read and why it stays out. **S.**

**F22. Re-grade severity by effect.** Upstream executing-plans/SKILL.md:260 to 275: "The reviewer's severity labels are advice ... a finding's grade is what a reasonable person using this software gets if it ships, not whether the spec names the input that triggers it: a reviewer who set a finding at Minor because the spec was silent has graded the spec, not the effect." fx: Minor findings never enter the loop and go to the final review as deferred minors (fix-loop.md:21 to 26, SKILL.md:757 to 759); nothing tells the final reviewer to re-grade them by effect. Verdict: **upstream better**. Why: per-task reviewers grade against a brief; a Minor graded "the design does not mention this input" can be a user-visible defect, and the final pass is the last place it can be promoted. Change: in the final-review reference (section 5), the branch-mode brief tells the reviewer to re-grade each deferred minor by its effect on a person using the software and to promote any that would block a merge. The controller still never downgrades (pre-judging rule stands). **S.**

**F23. Review Focus passed verbatim to the final reviewer.** Upstream executing-plans/SKILL.md:244 to 247 passes the plan's Review Focus section (input classes and failure modes no task test exercises, added to writing-plans in 6.4.1). fx: the coverage audit (SKILL.md:712 to 748) checks design against task criteria, a different question. Verdict: **fx gap**, but it starts in fx-plan (the plan-area comparison owns whether to add the section). Change here, if fx-plan adds it: the final-review reference passes `plan.md`'s Review Focus verbatim into the branch brief. **S** in this area.

**F24. task-start and task-done.** Upstream scripts make "take the task" and "close the task" one call each, and task-done ledgers completion only when the test command passes (task-done:388 to 400). fx: the implementer runs tests, the controller writes the completion line after review and cost. Verdict: **n/a** for subagent execution. The underlying rule, "bookkeeping rides along with work" (executing-plans:179 to 181), fx already has (SKILL.md:688). **none.**

**F25. Self-review fallback ledger line** (executing-plans:253 to 258). Verdict: **n/a**; fx always dispatches.

### 2.4 using-git-worktrees (unchanged since 6.3.0)

**F26. Baseline wording contradicts ADR 0030.** fx worktree-setup.md:74 "then run setup and baseline in place" and :87 rationalization row "baseline tests can wait ... Run them now" contradict ADR 0030 decision 2 and fx SKILL.md:224 to 230 ("There is no baseline run before task 01"). Upstream still runs a baseline (using-git-worktrees:121 to 132), which is what fx inherited. Verdict: **fx gap** (internal contradiction). Change: delete "and baseline" at :74 and replace the :87 row with "The exit gate classifies failures against the merge base; a baseline run is not part of setup (ADR 0030)." **S.**

**F27. Duplicate rationalization rows.** fx SKILL.md:944 to 947 repeat worktree-setup.md:83 to 86 verbatim. Verdict: **fx gap** (bloat inside the size cut). Change: delete them from SKILL.md (about 800 bytes). **S.**

**F28. Committing the ignore entry.** Upstream :86 "Add to .gitignore, commit the change, then proceed." fx :62 adds it without saying whether to commit, so the main checkout is left with a modified tracked file. Verdict: **upstream clearer**; with F8 the `.fx/` half disappears, and for `.worktrees/` fx should say "commit it on its own, on the current branch, only with the owner's consent; otherwise use `.git/info/exclude`". **S.**

**F29. Create the worktree, do not enter it.** fx SKILL.md:198 to 207 inverts upstream's "use the native tool" for a controller, because a native tool pins the session. Verdict: **fx better**; section 4 relies on it (main creates, the orchestrator never enters).

### 2.5 verification-before-completion (unchanged since 6.3.0)

**F30.** fx keeps the Iron Law and gate inline (SKILL.md:785 to 815) and extends the reference (verification.md:38 to 118: environment is a dimension, an exit code is not a result, a pipe eats the status, a report not received is not a report). Verdict: **fx better**. Applied in section 4: main must not tell the owner the plan is done until the orchestrator's final message has arrived and the ledger holds `Plan complete:`.

### 2.6 dispatching-parallel-agents (unchanged since 6.3.0)

**F31.** Upstream: one agent per independent failure domain, all dispatches in one response (dispatching-parallel-agents:47 to 85). fx absorbed none of it and has no COVERAGE row saying so. fx already runs reviews and lenses in parallel (SKILL.md:381 to 390, 564 to 570) and forbids parallel test runs on a shared environment, which is the "shared state" exclusion upstream names (:134). Verdict: **n/a**. Change: a COVERAGE row "D: parallel investigation belongs to fx-debug; fx-implement runs reviews in parallel and implementers serially (shared test environment)". **S.**

### 2.7 finishing-a-development-branch (unchanged since 6.3.0)

**F32. Discard in the menu.** Upstream :222 to 249 presents three options and never offers discard; discard happens only on an explicit request, after a list of what will be deleted, on the typed word `discard` (:299 to 313, :385 to 386). fx SKILL.md:902 to 920 presents "4. Discard it" as a menu item and confirms by repeating the branch name. Verdict: **upstream better**. Why: a destructive option one keystroke from "3" is fx's own stop condition 1; the upstream text was available when fx absorbed and fx chose the opposite without a COVERAGE reason (COVERAGE.md:67 only says "completion report only"). Change: three-option menu; on an explicit discard request, list branch, commits and worktree path and require the typed word `discard`. **S.**

**F33. No procedure after the owner chooses.** Upstream steps 5 and 6: merge from the main root, test the merged result before removing anything, remove only worktrees under `.worktrees/` or `worktrees/`, never `--force` on a refused removal (show `git status --porcelain -uall` and ask), a two-option menu on a detached HEAD, confirm the base branch. fx SKILL.md:919: "Options 1 and 2 are theirs to choose and yours to then perform", with nothing on how. Verdict: **fx gap**. Change: new `skills/fx-implement/references/finishing.md`, read only after the owner answers: upstream steps 2, 3, 5, 6 and the rationalization table, with two fx edits: no `git pull` or push unless the owner asked (nothing leaves the machine), and option 2 hands over to the adopted `pr` lane. **M.**

**F34. Verify before the menu.** Upstream step 1 runs the suite. fx's exit gate runs `test_all`, every CI command and classifies failures (SKILL.md:817 to 852). Verdict: **fx better**.

### 2.8 mattpocock: implement, implement-spec, handoff

**F35. implement** (Skill-tool wording and ticket fetch: on master, not yet released). Upstream: call `tdd` at pre-agreed seams, typecheck and single test files often, full suite once, `code-review`, commit (implement/SKILL.md:7 to 17); the doc's "It's working if" asks for "an actual `tdd` Skill tool call in the trace" (docs/engineering/implement.md:84). fx: implementer step 1 invokes fx-tdd (implementer-prompt.md:37 to 39), `test_one`/`test_scope`/`test_all` once (49 to 55), and build-cost counts real fx-tdd calls per task (`fx-tdd k/i`, ADR 0040). Verdict: **fx better**. One gap: there is no typecheck step; `.fx.json` has no `typecheck` command, so a TypeScript repo's implementers never typecheck between test runs. Change (low priority): optional `typecheck` key in `.fx.json`; implementer runs it with `test_one`. **S.**

**F36. implement-spec: parallel frontier** (released in 1.3.0). Upstream implement-spec/SKILL.md:13 to 40: tickets as a task graph, implementers in the background each in its own worktree based on the integration branch, each merges the integration tip before reporting done, a merger subagent lands each, the frontier refills, one review fix wave, worktrees cleaned up. docs/engineering/implement.md:58 adds that `refs/stash` is shared across worktrees. fx: implementers are serial because the test environment is shared; `isolated_test_execution: true` in `.fx.json` "relaxes" it (SKILL.md:381 to 385) with no procedure for branches, merging, or review ranges. Verdict: **fx gap** when the flag is set. Change: `skills/fx-implement/references/parallel.md`, read only when the flag is true: implement-spec steps 4 to 6 and 9, with fx's per-task review kept (review range = the implementer branch's BASE..HEAD before merge), merges serial through one merger, the ledger written only by the controller, and "never `git stash` in parallel mode". **M.**

**F37. implement-spec: shared exploration notes** (step 2: one exploration subagent saves notes outside the repo for every implementer). fx: each implementer may Explore on its own. Verdict: **upstream idea, unproven for fx**. Change (optional): the controller may dispatch one read-only explorer before task 01 writing `.fx/<slug>/notes/`; compile-brief's Context section points at the note. Measure with build-cost before keeping it. **M.**

**F38. handoff** (temp-dir resolution: on master, not yet released). Upstream handoff/SKILL.md:8: save to `$TMPDIR`, else `/tmp` (`%TEMP%` on Windows), never the workspace, and (4f4e943) report the path. fx commands/fx-handoff.md:243 to 246 prints the block and offers "to save a copy" without saying where. Verdict: **upstream better** on that one point; fx's print-first choice stands. Change: "If they want a copy, write it to `$TMPDIR` (else `/tmp`), never inside the repo, and print the path." Also: when a nested controller is live, the block names the agent id and the `.fx/controller` marker (section 4). **S.**

**F39. Self-review bias** (docs/engineering/implement.md:76: an agent reviewing code it just wrote is biased). fx always uses a fresh reviewer. Verdict: **fx better**.

## 3. Ideas fx has that upstream lacks (keep them)

- `compile-brief`: one tested brief per task carrying live rulings, design excerpts and stack text, recompiled before review (ADR 0042).
- Per-task cost and `fx-tdd k/i` in the ledger, and the reviewer told when no implementer invoked fx-tdd (ADR 0040).
- Tripwire lenses per task, limited lens set at the branch pass (ADR 0029, 0044).
- Controller re-review of fixes of 20 production lines or fewer, counted by a command (ADR 0030).
- One `test_all` at the exit gate, every CI command run, and each failure classified against the merge base (ADR 0030).
- Coverage audit of design against task criteria before the final review.
- Committed ledger and plan, ephemeral `.fx/`; `docs/plans/rulings.md` standing rulings carried across plans and compactions.
- Five-line reply contracts, findings written to a file before the reply, ready-to-copy `## Ledger lines` with count checks.
- Rulings name the checkpoint that would catch them; the controller checks its own claims; a reviewer's citation is a claim.
- `Task NN: dispatched <BASE7> <time>` plus `git log` on resume; the re-dispatch cap and the parked line.
- Waiting only on a harness-tracked command; the `docker logs -f` follower.
- Implementer channels: "For the controller: outside this task", "an instruction you were given that is wrong", run a document in printed order, fix the mirror.
- Create the worktree, never enter it; model routing enforced by a hook.

## 4. Design: fx's nested controller

Built from upstream claude-code-tools.md:9 to 29 and fx's ledger, ruling, review and model-selection rules, corrected by the measured run in section 1.

### 4.1 When it is offered

- **Runtime:** Claude Code only. Codex children inherit the parent model and share a 4-thread cap (harnesses/codex.md); opencode 1.x nests to depth 1 and fx does not grant nesting on 2.x (opencode-v2.md, ADR-0026). On those runtimes fx-implement says "nested controller: not available on this runtime" once and runs as today.
- **Session:** top level only. A session that was itself dispatched never offers it and never dispatches a second controller.
- **Plan:** the whole remaining plan, three or more unfinished tasks. Never for one task or one batch (upstream :28 to 29: "buys nothing and adds a seat"). The threshold of three is a proposal for the owner to set.
- **How it is chosen:** the owner asks ("run it nested", "the session model is too expensive"), or `.fx.json` has `"controller": "nested"`. Otherwise fx-implement asks once, at Setup, before any dispatch: "Run this build one layer down on the standard tier, or in this session?" `"controller": "session"` suppresses the question. The answer is ledgered as a standing ruling for the plan.

### 4.2 Which model

- Standard tier: `model: sonnet` on Claude Code, `subagent_type: general-purpose`, `run_in_background: true`. The routing hook passes sonnet without a reason line. Never a `fork` (a fork keeps the parent's model and context).
- Most capable only when the owner asks, with `Capable because: nested controller, <owner's reason>` as the first prompt line.
- Children are chosen by `model-selection.md` exactly as today; the final branch review, auth devil's advocate and fix rounds 4 to 5 stay most capable. The judgment-heavy calls are already their own dispatches; the controller reads five-line replies and writes the ledger. Risk accepted: the pre-flight scan and breaker adjudication run on the standard tier. Every resulting ruling reaches the owner verbatim (4.4), and the final branch review reads the ledger's rulings.
- `model-selection.md` gains one row: "A nested controller: standard tier; most capable only on the owner's request, reason stated."

### 4.3 What the main session does first, and what it hands over

Main keeps what needs the owner or the native tools: fx-implement Setup §1 (create the worktree, never enter it) and the `.fx.json` check. Everything from Setup §2 on belongs to the orchestrator.

Main fills `skills/fx-implement/controller-prompt.md` into `<main cwd>/.fx/<slug>/controller-brief.md`. A file, so a compacted or replacement orchestrator re-reads it. Contents:

1. Role: "You are the fx-implement controller for `<slug>`, one layer below the owner's session. Invoke `fx:fx-implement` with the Skill tool first and follow it fully. You are the controller it describes."
2. Paths: worktree (absolute, already created, never enter it, use `git -C`), plan directory, `.fx.json`, the main checkout (write nothing there outside `.fx/`).
3. The owner's rulings for this run, verbatim, to copy into `## Standing rulings`.
4. Limits: never dispatch another controller; never ask the merge question or present the completion menu; nobody reads your chat, so a stop condition ends your run with `Status: STOPPED` (4.4) rather than a question.
5. "If the Agent tool is missing, reply exactly `NO_AGENT_TOOL` and stop." (from the measured brief)
6. Waking: before ending a turn, either a tracked child is outstanding and the ledger has a `Blocked on:` line (SKILL.md:144 to 148), or the run is over. On every wake, check the report and findings file of every outstanding dispatch: a completion notice can reach the owner's session instead of you (measured: 18 in one run).
7. After any compaction, re-read this brief and the ledger tail before the next dispatch.
8. The final message contract (4.4).

The dispatch prompt itself is three lines: read the brief first, the brief path, the worktree path. Main then writes `<main cwd>/.fx/controller`: slug, worktree, agent id, dispatch time, brief path. The orchestrator writes `Controller: nested, standard tier, brief <path>` as its first ledger log line. Main never writes to the ledger: one writer.

### 4.4 What it must relay back

The orchestrator's final message, nothing before or after:

```
Status: COMPLETE | STOPPED | NO_AGENT_TOOL
Plan: <the "Plan complete:" line verbatim, or "not complete: next task NN">
Completion report: <absolute path>
Needs you: <the stop condition and what would unblock it, or "the branch <name> in <worktree>">
Rulings I made (<n>):
<every ledger line containing "Ruling:" outside "## Standing rulings", verbatim, in ledger order>
Deviations: <every skipped, compressed or reordered step, with the reason>
Parked: <lines>
Skipped: <tasks and what unblocks them>
```

Main's duties on receipt:

- Check before relaying: `n` equals the count of `Ruling:` lines in `state.md` after `## Log` (`sed -n '/^## Log/,$p' state.md | grep -c 'Ruling'`), and `COMPLETE` has a `Plan complete:` line. On a mismatch main relays the ledger's lines, not the message's, and says so. This is verification.md's "a report you have not received is not a report", applied to the orchestrator.
- Relay the Rulings list **verbatim** in its own reply, never summarised (upstream :24 to 26). The list can be long (94 `Ruling` lines in the measured ledger); that is the price of decisions made on the owner's behalf.
- Then, and only in main, present the completion menu (three options, F32).
- `STOPPED`: relay verbatim, ask the owner, send the answer to the same agent id with `SendMessage`.

### 4.5 Compaction and resume

- **Orchestrator compaction.** fx-implement is re-attached cut at 20,000 characters, so section 5's split is a prerequisite. The brief is a file (4.3 item 7), and the ledger plus `git log <BASE>..HEAD` already resume a task (SKILL.md:293 to 311).
- **Main compaction.** The session-start notice (`lib/plan-state.js` `describePlans`) today tells a session with an unfinished plan to "invoke fx-implement again before the next dispatch", which would start a second controller beside the live one. Change: when `.fx/controller` exists and the `state.md` it names has no `Plan complete:` line, the notice says instead: "A nested controller (agent <id>) is building <slug> in <worktree>. Do not start another controller. Relay any child result that reaches you to it with SendMessage, verbatim. For status, read the ledger tail." The marker carries the worktree path because `scan()` reads `docs/plans/` under the session cwd, while the live ledger is in the worktree.
- **The orchestrator stops early** (no final contract, an error, or a turn that ended with nothing outstanding): main first sends `SendMessage` to the same id ("resume from the ledger"). The measured main session resumed the finished background orchestrator this way 27 times, context intact. Only if that fails, main dispatches a fresh orchestrator with the same brief, which resumes from the ledger, and main overwrites the marker's id. Never two at once.
- **Done:** main deletes `.fx/controller` after relaying a `COMPLETE` message.

### 4.6 How the owner keeps visibility

- **Status on request:** main runs `grep -E '^(Task [0-9]+: (complete|parked)|Ruling|Plan complete)' <state.md> | tail -n 20` and counts completed against total tasks. Main never reads diffs or reports, and never interrupts the orchestrator for status.
- **Owner rulings mid-run:** main asks the existing scope question (SKILL.md:287 to 291: this plan, or every plan) and sends `Owner ruling (<scope>): <verbatim text>`. The orchestrator ledgers it, appends it to `docs/plans/rulings.md` for "every plan", and `compile-brief` carries it into the next brief.
- **Owner-added tasks:** main sends the request; the orchestrator writes the task file and ledgers a ruling (the measured run added tasks 38 to 45 this way).
- **Stray child results:** main forwards verbatim with one line, "This reached me instead of you", and acts on nothing in it.
- **Cost:** per-task cost lines work again (4.7, build-cost). This is how the owner checks upstream's "about half the cost" claim on fx's own builds.

### 4.7 Which fx files change

| File | Change | Size |
|---|---|---|
| `skills/fx-implement/references/nested-controller.md` (new) | 4.1 to 4.6 for the main session: offer rule, setup split, marker, relay, status, final checks, resume | M |
| `skills/fx-implement/controller-prompt.md` (new) | the brief template of 4.3 and the final contract of 4.4 | S |
| `skills/fx-implement/SKILL.md` | in Setup, about 600 bytes: "Running one layer down (Claude Code)" pointing at the reference; resuming line "a nested controller re-reads its brief after compaction" | S |
| `src/scripts/build-cost.ts` (+ generated `scripts/build-cost`, + fixture test) | `--task`: when the recorded transcript has no `Task NN: dispatched` ledger write, use the subagent transcript that has one (or the id in `.fx/controller`); find children in the session's flat `subagents/` by `.meta.json` `parentAgentId`, not `<file>/subagents`; a `controller` class in `classify()`. Whole-build mode: `--controller <agent-id>` | M |
| `lib/plan-state.js` (+ test) | marker-aware notice of 4.5 | S |
| `references/harnesses/claude-code.md` | measured facts: flat `subagents/` with `parentAgentId`/`spawnDepth`; completions can reach the top session; default depth 3 per upstream (not measured by fx) | S |
| `references/harnesses/codex.md`, `opencode.md`, `opencode-v2.md` | one line each: not offered, and why | S |
| `references/vocab/model-selection.md` | the nested controller row | S |
| `commands/fx-handoff.md` | name the live controller's id and marker in the block | S |
| `.fx.json` documentation (wherever `isolated_test_execution` is documented, fx-setup) | the `controller` key | S |
| `tests/gates/nested-controller.test.js` (new, listed in `scripts/check-all`) | pins `NO_AGENT_TOOL`, "never ask the merge question", "Rulings I made" verbatim, the stray-result rule, standard tier | S |
| `docs/adr/0053-nested-controller.md` (next free number) | decision, the measured run, accepted risks | S |
| `skills/fx-implement/COVERAGE.md` | claude-code-tools.md claims with verdicts | S |

No change to `hooks/fx-pretooluse.js`: sonnet passes, and opus children need their `Capable because:` line as today. Unverified: whether the PreToolUse route runs for depth-2 dispatches. The measured run's 50 opus dispatches all carried the line, which does not show the hook ran on them. One `claude -p` probe settles it.

## 5. Splitting fx-implement under 20,000 bytes

Upstream's 7.0.1 rule: SKILL.md keeps the spine every turn needs, plus a pointer at each step that says "read X now, and again every time". Everything read at one step moves to `skills/fx-implement/references/`. Prompt templates and `fix-loop.md` stay where they are: the gate tests pin those paths, and moving them buys nothing.

Measured section sizes of today's SKILL.md and where each goes (target sizes are estimates from those measurements):

| Today (lines, bytes) | Goes to | Stays inline (target bytes) |
|---|---|---|
| Intro and "task files look complete" (1 to 48, 2,429) | stays, condensed | 1,500 |
| Rulings, not stalls (50 to 115, 3,225) | "A reviewer's citation is a claim" and "your own claims" to `references/rulings.md` | format, checkpoint, four stops: 1,800 |
| Waiting, long commands (116 to 177, 3,103) | `references/waiting.md` | 3-line rule + pointer: 450 |
| When this applies (179 to 186, 345) | stays | 345 |
| Setup §1 to §3 (187 to 271, 4,180) | `references/setup.md` (uncommitted plan, detached HEAD, project setup, stacks, two workspaces; F8 deletes the ignore paragraph) | numbered pointers: 700 |
| Nested controller (new) | `references/nested-controller.md` | 600 |
| Ledger §4 (273 to 314, 2,377) | resume bullets and standing rulings to `references/resuming.md` | identity line + "if a ledger exists, read resuming.md before anything else": 450 |
| Read plan, pre-flight (316 to 346, 1,437) | scan to `references/preflight.md` | 500 |
| Model selection (348 to 358, 485) | stays | 485 |
| Loop head (360 to 391, 1,889) | batching to `references/batching.md` | context hygiene, serial implementers, one review outstanding: 1,000 |
| Controller reading rules (392 to 424, 2,125) | full rules to `references/reading-rules.md` | four one-line rules: 600 |
| Step 1 dispatch (426 to 481, 3,072) | stays, tightened | 2,300 |
| Step 2 reports (483 to 527, 1,915) | non-DONE statuses, `test_all` rule, re-dispatch cap and parked line to `references/handling-reports.md` | DONE + "any other status: read handling-reports.md, every time": 350 |
| Step 3 review (529 to 646, 5,825) | cost detail to `references/cost.md`; lens dispatch to `references/lens-dispatch.md`; "verify a constraint" and cannot-verify to `references/review-inputs.md` | gates, review-package, recompile, pre-judging rule, paths: 2,300 |
| Step 4 fix loop (648 to 663, 866) | stays, plus the re-read-every-round line (F2) | 900 |
| Step 5 complete (665 to 699, 1,635) | window and transcript detail to `references/cost.md` | 800 |
| Commits (701 to 710, 484) | stays | 480 |
| Coverage audit (712 to 748, 1,616) | `references/coverage-audit.md` | pointer: 200 |
| Final review (750 to 783, 2,130) | `references/final-review.md` (adds F22, F23) | pointer: 250 |
| Exit gate (785 to 852, 3,232) | CI commands and classification to `references/exit-gate.md` | Iron Law + five-step gate + pointer: 900 |
| Plan-complete line, completion report, menu, cleanup (854 to 924, 2,995) | into `references/final-review.md`; execution after the choice to `references/finishing.md` (F33) | pointer: 250 |
| Rationalizations (926 to 948, 2,788) | delete the 4 worktree duplicates (F27) and rows that restate an inline rule | 1,700 |
| Frontmatter | | 450 |
| **Total** | | **about 18,800** |

The gate test, not this arithmetic, decides: keep the result at or under 18,500 bytes for headroom below 20,000.

Consequences to handle in the same change:

- Gate tests that read `skills/fx-implement/SKILL.md` for sentences that move: `return-contract` (coverage-audit contract), `branch-pass` ("never fired on any task", `Capable because: final branch review, auth change`), `fix-loop-shape` ("ran test_all (rule)", "Never read a diff yourself"), `ledger-lines` (parked line, "at most twice", "git log <BASE>..HEAD", the section 3 and 5 cost assertions), `tripwire-table` (lens dispatch span). Point each assertion at the file its sentence moved to, so a lost rule still fails the test. A concatenating helper would let a rule drift into the wrong file unnoticed.
- `no-stories-in-loaded-lanes` should cover `skills/*/references/*.md`, since those are loaded too.
- fx's convention "References stay leaves" (ADR 0042): decide whether a skill-local reference may point at plugin `references/vocab/*` (final-review.md must point at verification.md). Proposal: one level is allowed, never a chain.
- COVERAGE.md: change the affected rows from K to R with the new file names.

## 6. Top recommendations (ranked)

1. Split fx-implement to about 18,500 bytes per section 5 and add a SKILL.md size gate; the 20,000-character cut currently lands at SKILL.md:402 and drops the fix-loop cap, dispatch, final review and exit gate (F1, F2). L.
2. Adopt the nested controller per section 4: controller brief template, final contract with verbatim rulings, main-session relay of stray results, `.fx/controller` marker in the session notice, Claude Code only, standard tier (F20). L.
3. Fix `build-cost --task` for a nested controller: find the controller transcript and children by `parentAgentId` in the flat `subagents/` directory; the measured run got zero cost lines (F20, 4.7). M.
4. Give the re-reviewer the recompiled brief, not the task file, so rulings and Global Constraints bind fix rounds too (F5). S.
5. Add the ancestor range guard to review-package and use one argument name (`<SLUG>`) and an anchored path everywhere (F3, F4). S.
6. Take discard out of the completion menu (typed `discard` only on request) and add `references/finishing.md` for what happens after the owner chooses (F32, F33). S+M.
7. Write a self-ignoring `.fx/.gitignore` (`*`) instead of editing the project's `.gitignore` (F8). S.
8. Remove the baseline-run wording from worktree-setup.md that contradicts ADR 0030, and the duplicate rows from SKILL.md (F26, F27). S.
9. Have the final branch review re-grade deferred minors by their effect on a person using the software (F22). S.
10. Write the parallel-implementer procedure for `isolated_test_execution: true` from implement-spec, with per-task review kept and no `git stash` (F36). M.

## 7. Not checked, and risks

- Not measured: whether fx's PreToolUse route runs on depth-2 dispatches; whether Claude Code compacts a subagent's context and re-attaches skills with the same 20,000-character cut (upstream's #2481 report is about the session; I infer it applies to a long-running orchestrator); whether a background orchestrator survives the owner closing the main session.
- The "about half the cost" figure is upstream's (RELEASE-NOTES.md:138). The measured fx run had build-cost blind, so fx has no number of its own yet.
- Section 5 sizes are estimates from today's measured section sizes.
- Read partially: `lib/plan-state.js` (scan, parseState, describePlans), harness notes outside their subagent sections, gate tests (assertions by grep), and `scripts/build-cost` without its esbuild boilerplate. Everything else in section 1 was read in full.
