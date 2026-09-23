# Lean build: implementation plan

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
**Goal:** fx builds consume fewer tokens and finish sooner, with fixture-measured quality the same or better.
**Architecture:** Build a measuring instrument first (transcript cost report, wider lane-triggering suite, seeded fixture build with hidden trap tests) and take a baseline. Then land three changes one at a time, each followed by an owner-run measurement that decides whether it ships: the plan-state notice fix, the controller context cap, and opt-in parallel tasks.
**Stack:** Node (no dependencies, `node file.test.js` style tests), bash, Markdown skills.
**Complexity:** Medium
**Risks:**
- HIGH: parallel tasks introduce a merge-caused defect: every guard fails toward serial, the fixture carries a hidden-dependency trap pair, and task 13 drops the step on any merge-caused defect.
- HIGH: a live run touches the real `~/.claude`: the fixture runs only inside the conformance jail and the triggering suite in a scratch home; cleanup removes only checked `mktemp` paths.
- MEDIUM: fixture runs are noisy: two parallel runs per variant (Ruling O), compared per trap on pooled counts, with a smoke run before the baseline and a sensitivity check that reopens the fixture if review has nothing to catch.
- MEDIUM: tightening the return contract hides information the controller needs: the report file still holds everything; only the reply shrinks.
**Testing:** Unit: `build-cost`, `plan-state`, `preamble`, new template gates, all in `scripts/check-all` · Live: row 04, the lane-triggering suite, the fixture build, all owner-run.

## Status notes

- **Step 0 is done.** The owner disabled `security-guidance` globally on 2026-09-23, so the baseline is measured without it.
- **The bootstrap size gate already exists.** `lib/preamble.test.js` asserts under 3,000 characters for the bootstrap and under 9,000 for the worst-case render, and `scripts/check-all` runs it. Design story 7 needs no task.

## Global Constraints

- Per-task review, the five-round fix loop, trigger-gated lenses, the coverage audit and the branch-end review are not weakened by any task.
- A step ships only if, pooled over its 2 fixture runs, no trap is caught at the end fewer times than at baseline; pooled over the review bench's reps, no planted defect is caught fewer times and the clean control draws no more false positives; and row 04 and lane-triggering fire rates are unchanged or better. Cost and time compare on medians. (Amended 2026-09-23, owner decision: byReview is recorded, not gating.)
- Bootstrap alone under 3,000 characters; worst-case render under 9,000.
- Nothing moves into the always-on text (ADR 0021).
- Every parallel guard fails toward serial.
- Any shipped-file change bumps the plugin version (`tests/gates/release-version.test.js`); bump once per phase merge.
- No em or en dashes, no attribution trailers, in any file or commit message.
- Live runs use a scratch `HOME`. Nothing writes, moves or deletes under the real `~/.claude`; reading one past transcript (task 01) and one credential file (the scratch-home copy) is allowed.
- Stage by path, never `git add -A` or `git add .`.

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | Build-cost report | none | `scripts/build-cost` reads a build's transcripts and prints deduplicated cost and time | MVP |
| 02 | Lane-triggering suite covers every model-facing lane | none | prompts for the 5 missing lanes, should-not-fire prompts, wrong-first-lane rule, scratch home | MVP |
| 03 | Seeded fixture build | 01, 02 | `tests/fixture-build/`: repo, 6-task plan, hidden trap tests scored at the end and by review, run script | MVP |
| 03b | Review bench | 03 | `tests/review-bench/`: planted-defect diffs scored against fx's own task reviewer | MVP |
| 04 | OWNER RUN: smoke, then baseline | 01, 02, 03, 03b | `measurements.md` with the baseline | MVP |
| 05 | A finished plan is not listed | 04 | `Plan complete:` line, written by `fx-implement`, read by `plan-state`; three ledgers backfilled | Core |
| 06 | Subagents do not receive the plans block | 04 | `render({ subagent })`; Claude Code hook passes it on `SubagentStart` | Core |
| 07 | OWNER RUN: measure step 2 | 05, 06 | verdict for step 2 | Core |
| 08 | Controller context cap | 07 | five-line replies everywhere, ledger lines by copy, findings by path, controller reading rules, a gate | Core |
| 09 | OWNER RUN: measure step 3 | 08 | verdict for step 3 | Core |
| 10 | Plans can declare parallel tasks | 09 | `Parallel with:` field and hot-file list in `fx-plan`; `isolated_test_execution` in `fx-setup`; a gate | Hardening |
| 11 | `fx-implement` runs declared-parallel tasks | 10 | parallel mechanics in `fx-implement`, every guard failing toward serial; a gate | Hardening |
| 12 | Scoped per-task tests for this repo | 09 | `scripts/test-scope`, `.fx.json` `test_scope`, a concurrency check | Hardening |
| 13 | OWNER RUN: measure step 4, ship or drop | 11, 12 | verdict for step 4; `isolated_test_execution` on ship only | Hardening |

Phases: MVP (01 to 04) merges on its own and changes no behaviour. Core (05 to 09) merges after task 09's verdict. Hardening (10 to 13) merges after task 13: on ship with `isolated_test_execution` set; on drop with tasks 10 and 11 reverted, the key off, and task 12's `test_scope` kept.

**Red-team, 2026-09-23:** 21 findings (3 Critical, 13 Important, 5 Minor), all applied. The design was amended for three of them: traps scored by review as well as at the end, 12 model-facing lanes instead of 17, and `isolated_test_execution` set only when parallel ships.

**Owner-run tasks** (04, 07, 09, 13) are live and spend model quota. `fx-implement` does not dispatch them: it stops, tells the owner the exact commands in the task file, and resumes when the owner reports the numbers.
