# Gap report: 2026-10-21-audit-fx

**Date:** 2026-10-21
**Phase:** 3 of 4
**Compared against:** the current system alone
**Stated targets:**

- "to increase the speed and reduce the token usage. whenever i use brainstormin>desing>plan>impelemnt it takes soooooooo looooong to fininsh" from the invocation text

## Verdict table

**Feature count:** 50 features and business rules listed in `01-current.md`'s feature and business-rule inventory. **Target count:** 1. **Row count:** 51 rows below.

| Feature / target | Verdict | File:line | Impact | Note |
|---|---|---|---|---|
| Target: speed and token use across brainstorm > design > plan > implement | wrong | skills/fx-implement/SKILL.md:386 | high | Six-task fixture builds take 33 to 56 min and 18 to 29M tokens; real 5 to 13-task plans span 25 to 70 h; subagents hold 75% of tokens (rows below carry the causes) |
| 29 Implementer invokes fx-tdd, which loads good-tests.md | over-engineered | skills/fx-implement/implementer-prompt.md:47 | high | Each implementer reads 55 to 70 KB before its task and costs about 1.0M tokens; TDD rules arrive three times (template summary, fx-tdd, preamble) |
| 45 Fixture build cost (33-56 min, 18-29M tokens) | wrong | docs/plans/2026-09-23-lean-build/measurements.md:9 | high | Measured baseline the target is against |
| 46 Implementer is 57.5% of agent-minutes | wrong | docs/plans/2026-09-29-lean-review/design.md:22 | high | The largest cost, and the one no earlier lean pass touched |
| 48 Subagents carry 75% of tokens, 89% of turns | wrong | explore/01-real-cost.md:87 | high | Context per subagent turn, not output, is the lever (99.4% cache reads) |
| 21 Task template: 11 fields and 6 steps | over-engineered | skills/fx-plan/SKILL.md:285 | high | Tasks grow to 10-16 steps and 6.7 to 24 KB; every implementer reads its whole task |
| 22 Test code written out in full in tasks | over-engineered | skills/fx-plan/SKILL.md:409 | high | 41% of lean-review task bytes are fenced code nobody has run; the skill itself expects it to fail at RED (:416-421) |
| 49 Plans of 11-28 tasks, 8.5 KB average | over-engineered | /development/advantage-backend/docs/plans/2026-10-12-engagement-dashboard-v2/state.md:21 | high | 18 tasks in this plan; each task becomes an implementer, a reviewer, lenses and fix rounds |
| 24 Red-team recommended at 10+ tasks | wrong | skills/fx-plan/SKILL.md:166 | high | Every sampled plan has 11+ tasks, so the "optional" opus pass is always recommended |
| 13 Approaches, then five design sections with approval after each | over-engineered | skills/fx-brainstorm/SKILL.md:249 | high | Up to 6 user stops, and the design is then written again as design.md |
| 15 design.md with an "extremely extensive" user-story list | over-engineered | references/design-template.md:35 | medium | Duplicates the approved chat sections; grows every downstream read |
| 20 fx-plan restates requirements and waits | over-engineered | skills/fx-plan/SKILL.md:40 | medium | Repeats a confirmation the approved design.md already holds |
| 12 Confidence check as its own stopping message | over-engineered | skills/fx-brainstorm/SKILL.md:163 | medium | One extra turn by design (ADR 0033); could carry the approaches |
| 32 Task reviewer reads the whole ledger | wrong | skills/fx-implement/task-reviewer-prompt.md:29 | high | 20 to 100 KB per review for a few `Ruling:` lines; contradicts SKILL.md:397 |
| 30 Task review mandatory per task | correct | skills/fx-implement/SKILL.md:516 | medium | Quality floor; the bench shows lighter review held 23 of 24 defects |
| 31 Tripwire lenses per task | correct | skills/fx-implement/SKILL.md:532 | medium | Lenses are 3.3% of agent-minutes (ADR 0029) |
| 33 Fix loop capped at five, rounds 4-5 on top tier | correct | skills/fx-implement/fix-loop.md:35 | medium | Bounded; fix rounds still average 2 to 2.8 per task on large builds |
| 50 Fix rounds 2 to 2.8 per task on large builds | wrong | /development/advantage-backend/docs/plans/2026-10-12-engagement-dashboard-v2/state.md:27 | high | Fix round per task after review and lens, as here; tied to task size and unverified test code in tasks |
| 35 Coverage audit then branch review with every lens and the devil's advocate | over-engineered | skills/fx-implement/SKILL.md:710 | high | Re-reviews code already reviewed per task; 6 to 9 agents, up to 3 on opus |
| 39 Branch pass up to 10 parallel agents, braked by prose only | wrong | skills/fx-review/SKILL.md:87 | medium | No mechanical cap |
| 40 Security lens and devil's advocate pinned to opus | wrong | agents/fx-lens-security.md:15 | medium | Bypasses route() and the standard-tier rule (lib/dispatch-route.js:20) |
| 4 Model routing hook defaults to sonnet | correct | lib/dispatch-route.js:21 | medium | Cost control enforced in code |
| 27 Serial implementers | correct | skills/fx-implement/SKILL.md:386 | medium | Shared test database; parallel tasks measured at 6% gain and dropped |
| 28 Reviews run beside the next implementer | wrong | skills/fx-implement/SKILL.md:147 | medium | Lens finding 1: no bound on outstanding reviews, so a Critical can land tasks later |
| 37 Five-line reply contract | correct | skills/fx-implement/implementer-prompt.md:356 | medium | Keeps the controller at 6 to 8K growth per task |
| 36 test_all once at the exit gate | correct | skills/fx-implement/SKILL.md:238 | medium | 6 full runs against about 3,300 scoped runs |
| 44 build-cost exists but no lane runs it | missing | scripts/build-cost:5 | medium | Ledgers carry no tokens or durations; cost cannot be attributed per task |
| 2 Invoke a lane at 1% chance, before any response | correct | PREAMBLE.md:15 | medium | The plugin's core mechanism; cost is the size of the lane loaded, not the rule |
| 1 Preamble in every session and subagent | correct | hooks/hooks.json:16 | low | About 800 tokens, capped and tested |
| 41 Skill and agent descriptions listed every session | correct | skills/fx-design/SKILL.md:3 | low | About 2.3k tokens; long triggers are deliberate (ADR 0004) |
| 10 One task-tool item per brainstorm checklist step | over-engineered | skills/fx-brainstorm/SKILL.md:49 | low | Up to 20 tool calls with no user-visible effect |
| 11 Interview rounds of 2 to 4 with a ledger | correct | skills/fx-brainstorm/SKILL.md:110 | low | Fewer trips than one question at a time |
| 14 Seams confirmation | over-engineered | skills/fx-brainstorm/SKILL.md:297 | low | One more stop; could join the design approval |
| 16 Self-review with optional fx-humanize, then doc review | correct | skills/fx-brainstorm/SKILL.md:313 | low | One review of the written doc is the gate worth keeping |
| 9 HARD-GATE on every path | correct | skills/fx-brainstorm/SKILL.md:17 | low | Scaled by path |
| 17 Brainstorm hands off only to fx-plan | wrong | skills/fx-brainstorm/SKILL.md:82 | low | UI direction from fx-design can land after the plan froze tasks |
| 19 fx-design has no handoff to fx-plan | missing | skills/fx-design/SKILL.md:183 | low | No named gate or next lane |
| 18 Visual companion | correct | skills/fx-brainstorm/SKILL.md:184 | low | Just in time, opt-in |
| 23 "Similar to task N: repeat it" | over-engineered | skills/fx-plan/SKILL.md:432 | low | Forces duplication across tasks |
| 25 Four-way handoff menu | correct | skills/fx-plan/SKILL.md:172 | low | One stop that carries the red-team choice |
| 26 Phasing above 10 tasks | correct | skills/fx-plan/SKILL.md:128 | low | Never limits task count |
| 34 Controller re-review for small fixes | correct | skills/fx-implement/fix-loop.md:90 | low | Saves a dispatch (ADR 0030) |
| 3 PreToolUse hook spawns Node on every tool call | over-engineered | hooks/hooks.json:30 | low | About 18 ms per call; matcher `*` includes Read and Grep |
| 5 laneCheck nudges once per repo | correct | lib/lane-check.js:65 | low | At most two extra turns per repo |
| 6 Unfinished-plans block | correct | lib/plan-state.js:107 | low | Bounded to 3 plans, 10 rulings |
| 7 Four harness front ends repeat routing | over-engineered | hooks/fx-codex.js:89 | low | Change cost, not run cost |
| 8 index.js spawns `opencode --version` on load | over-engineered | index.js:31 | low | Up to 3 s, opencode only |
| 38 fx-review mandatory after every task and at the end | correct | skills/fx-review/SKILL.md:26 | low | Per-task half is right; the end half overlaps row 35 |
| 42 fx test_scope runs every gate test on any .md edit | over-engineered | scripts/test-scope:45 | low | Maintainer cost on fx itself, not user sessions |
| 43 check-all: 64 sequential gates | over-engineered | scripts/check-all:26 | low | Maintainer cost; no timing recorded |
| 47 Multi-harness build at 503K median context, 347M tokens | wrong | docs/plans/2026-09-23-lean-build/design.md:19 | medium | Historical evidence of the same cost shape |

## Lens findings

- `fx-lens-pipeline`: ran and returned. Its Unread line, as written, opens "Unread, with partial reads marked" and lists `docs/**`, `tests/**`, `references/**` subdirectories, `agents/**`, `codex/**`, `commands/**`, `scripts/**`, `tasks/**`, root files, most of `lib/`, and most `skills/` files. It names files in the file set, so the lens did not cover the whole set.
- Architecture pass: ran and returned, report at `docs/plans/2026-10-21-audit-fx/report-20261021-0222.html`, six candidates.

Pipeline lens findings (each line opened):

| Finding | Severity | File:line | Verdict |
|---|---|---|---|
| No bound on outstanding task reviews and lenses while implementers advance | Important | skills/fx-implement/SKILL.md:147 | wrong: line 147 lets the next task start while a review runs; the only brake (line 646) fires after the review returns |
| Re-dispatch after NEEDS_CONTEXT or BLOCKED has no attempt count | Important | skills/fx-implement/SKILL.md:494 | missing: no cap, unlike the missing-report case (one re-dispatch, line 415) |
| A resumed controller can re-dispatch committed work, since dispatch is not ledgered | Important | skills/fx-implement/SKILL.md:307 | missing: no rule to check the task's commits before dispatch |
| fx-audit Phase 1 fans out one explorer per area with no concurrency cap | Minor | skills/fx-audit/SKILL.md:150 | user-invoked, retry capped at one |
| Companion WebSocket reconnect backs off with no jitter | Minor | skills/fx-brainstorm/scripts/helper.js:112 | loopback only |

Architecture candidates (titles as the report names them):

1. Compile one brief per implementer dispatch
2. Move case histories out of the loaded lane text
3. Plan fewer, deeper tasks
4. Merge the brainstorm and plan gates into one design checkpoint
5. Let the branch pass review only what per-task review did not
6. Write a cost line to the ledger for every task

## Phase 3 gate choice

- Compile one brief per implementer dispatch
- Move case histories out of the loaded lane text
- Plan fewer, deeper tasks
- Merge the brainstorm and plan gates into one design checkpoint
- Let the branch pass review only what per-task review did not
- Write a cost line to the ledger for every task
