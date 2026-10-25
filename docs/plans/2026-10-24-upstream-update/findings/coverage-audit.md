# Coverage audit: design.md against tasks 01 to 23 and state.md

Question: does the design commit to any behaviour that no task's acceptance criteria (AC) or ledger ruling carries? A ruling that assigns a requirement to a task counts as that task carrying it. "Carried" below means an AC, a named test, or a ruling reaches it. "Body only" means the task's What to build text states it but no AC and no test checks it.

Result: every story and every Implementation Decisions bullet has an owning task. Seven places are carried by body text only, or by a check that proves less than the design commits to. No design behaviour is wholly unowned.

## Stories

| # | Owner | Carried by |
|---|---|---|
| 1 | 03, 04, 11 | 03 AC1 and AC2, 04 AC1, 11 AC1 (size); pointers re-read every time |
| 2 | 02 | AC2, fixture tests at 20000 and 19999 bytes |
| 3 | 06 | AC1, real HTTP test |
| 4 | 07 | AC1 to AC3 |
| 5 | 09, 10 | 09 AC1, 10 AC1 and AC2 (see gap 4 for the uncarried halves) |
| 6 | 11 | AC1 to AC3 (see gap 7) |
| 7 | 12 | AC1 carries the declined list only (see gap 1) |
| 8 | 12 | AC3 |
| 9 | 13 | AC1 |
| 10 | 13 | AC2 |
| 11 | 14 | AC1 |
| 12 | 14 | AC2; ADR 0058 by ruling to 22 |
| 13 | 15 | AC1 and AC2 only (see gap 2) |
| 14 | 17 (and 12 for the parked declined shape, ruling 28) | AC1 and AC2 |
| 15 | 17 | AC3 |
| 16 | 18 | AC1 (see gap 6) |
| 17 | 19 | AC1 to AC3 (see gap 6) |
| 18 | 18 | AC2 (see gap 6) |
| 19 | 20 | AC1 and AC2 |
| 20 | 21 | AC1 and AC2 |

## Implementation Decisions

| Bullet | Owner |
|---|---|
| Size gate, fx-authoring limit line | 02, 04 |
| Splits: implement, authoring, plan templates, review section 7, humanize | 03, 04, 05, 05, 11 |
| Fix: brainstorm server literal | 06 |
| Fix: waiting reference, TS example removed | 07 |
| Fix: good-tests call count | 07 |
| Fix: worktree-setup baseline wording, duplicate rows | 03 |
| Fix: six COVERAGE files | 08 (humanize moved to 11 by ruling 24) |
| Glossary: text rename in 20 files | 10 |
| Glossary: reading order, never create | 09 (code), 10 (lane text) |
| Glossary: session notice | 09 |
| Glossary: ask once, git mv, pointers, decline key | 10 (key parsed by 09) |
| Glossary: map format regained | 10 (body only, gap 4) |
| Humanizer base, kept items, size, ripple | 11 |
| Review: vision rule | 12 (body only, gap 1) |
| Review: Declined to judge, ruling line, branch input, stop-condition parking | 12, 17 (ruling 28) |
| Review: Standards files, passes dispatched together | 12 |
| Plan: Review Focus, handed to reviewers | 13 |
| Plan: self-review checks, proportion, reader framing, scratch ban | 13 (body only, gap 5) |
| Plan: Not this task line, split-requirement red flag | 13 (tested) |
| Plan: [blocks] / [advisory] | 13 |
| Brainstorm: builder check, template, bounded design.md | 14 |
| TDD: four rules | 15 (two body only, gap 2) |
| Debug: Phase 5 diff, Phase 6 question, verification.md pointer | 15 (Phase 6 only has an AC, gap 2) |
| Implement: status summary, park | 17 |
| Implement: re-reviewer brief, range guard | 16 |
| Implement: completion menu | 17 |
| Implement: finishing reference, parallel procedure | 17 (reachability only, gap 3) |
| /fx:fx-pr, /fx:fx-what | 18 (Not run line by ruling 174 to 23) |
| /fx:fx-retro | 19 |
| Wayfinder reference | 20 |
| Pressure fixtures | 21 |
| ADRs | 22 (sixth ADR 0058 by ruling 143) |
| Version 0.6.0 | 01 sets, 23 confirms |
| README / INSTALL | 23 |
| Testing: size fixture, server, review-package, glossary tests, preamble fixtures | 02, 06, 16, 09, 11 |
| Testing: text gates extended for reachability and split pointers | 02 |
| Testing: lane-triggering bench for the new commands (live, on request) | 18 Risks line only (gap 6) |
| Global Constraints: dashes, prose, size, one claimant, no push | check-prose, skill-size, reviewers via Global constraints |
| Global Constraint: Arabic default locale and RTL | no task, no AC (see reverse list) |

## Gaps

1. **Task 12, story 7, vision half.** The design says treat the spec as a vision: silence is not permission, an unnamed input is judged by what a reasonable user expects. AC1 covers only the declined list and reply suffix. No test asserts the vision paragraph exists in either reviewer prompt. Ruling at state.md line 130 records the controller reading it once. Add an AC and an `includes` assertion on both templates.
2. **Task 15, story 13.** Four fx-tdd rules and three fx-debug rules are committed. ACs carry: RED never from a browser or system test; the undo proof; the Phase 6 prevention question; the size headroom. Not carried by an AC or a test: report every failure seen in `test_scope` including ones not caused; one line per seam on what it catches and misses; debug Phase 5 forced red proved by `diff`; "evidence before claims" pointing at `verification.md` (check-paths proves the link resolves, not that the sentence changed). Two of the four tdd rules are untested.
3. **Task 17, finishing.md and parallel.md.** Design commits to their content: no `git pull` or push unless the owner chose it, nothing removed with `--force`; parallel procedure keeps per-task review, serial merges, ledger written only by the controller, never `git stash`. ACs and tests check status.md, the menu text and the discard sentence. The two new files are covered only by check-paths reachability, which proves a file exists and is linked, not what it says.
4. **Task 10, story 5, the uncarried halves.** AC3 is all refusals ("never asks", "no second glossary"). The positive statements, that a dispatched subagent writes to the old-named file and that the next lane which writes to the glossary in the owner's session asks once (design: "`/fx-setup`, or the next lane"), are in domain-modeling.md prose only. AC2 covers `/fx:fx-setup` alone. The regained map format with Relationships and "if unclear, ask" has no AC and no test; the grep test only lists which files still name CONTEXT.md.
5. **Task 13, plan lane.** Reader framing ("what they cannot know is what you decided"), the ban on scratch builds, and self-review checks 5 (Review Focus) and 6 (proportion) are body text. Tests assert only the template headings, the `**Not this task:**` line, the red flag and the reviewer-prompt line. Story 9 depends on check 5 being in the self-review.
6. **Tasks 18 and 19, command behaviour.** ACs state outputs a user would see: four PR sections, no `git push` or `gh`, `pr.md` saved, every retro candidate cites `path:line`, lessons in the dated format, checks only as proposals. Tests check the hidden-lane list, generated body equality, size and prose. Nothing asserts the four headings the Interfaces block calls exact, the no-push rule, or the citation rule, so these ACs are satisfied by the command file existing. Related: the design's live lane-triggering bench for "the new commands" is owned only by a Risks line in task 18 naming pr and what; `fx-retro` (task 19) has none. The "Not run:" line in Evidence is carried by ruling 174 to the 22/23 batch, but task 23's Files and AC do not list `commands/fx-pr.md`, so only a ruling carries it.
7. **Tasks 08 and 11, humanize COVERAGE.** The design's Phase 1 fix list includes fx-humanize COVERAGE. Ruling 24 moves it to task 11, but task 08 still lists the file and a humanize bullet, and task 11's AC says nothing about COVERAGE accuracy (only its Files line). Also not in 11's AC: "How to work" and "When not to act" from humanizer 3.1.0, which the design lists in the base.

## Pattern checks

- **Story that must land in two places, one half owned.** None found unowned. Candidates checked and owned: declined lines (12 template and reading-rules, 17 status shape by ruling 28); Review Focus (13 compile-brief plus final-review.md plus both reviewer prompts); glossary notice (09) and rename (10); retro pointer in fx-debug (15) and the command (19, forward pointer, LOW risk in plan.md); fx-pr pointer in finishing.md (18). One weak half: ADR 0055 says it amends ADR 0025 but task 22 Files lists only creates and no ruling covers 0025's status line.
- **Criterion met by file existence.** Task 17 finishing.md and parallel.md (gap 3); task 18 and 19 command ACs (gap 6); task 20 AC1 (check-paths proves the link, not that the map and decision formats are present); task 21 AC1 (headings counted, live run on request by design); task 22 AC1 "naming the files and tests that enforce it" (the test checks headings only).
- **Refusal-only criteria.** Task 10 AC3 (gap 4). Task 16 AC1 ("produces no review package") has no positive AC, but its Tests do check an ancestor range still writes a package. Task 21 AC2 and task 20 AC2 are refusals beside positive ACs.
- **Weak carry on a stop-condition path.** Design: a stop condition parks the task. A stop condition reached outside a task (final review, exit gate, completion menu) has no task to park; task 17 says nothing about it. Low severity: the completion report lists needs-you items.

## Tasks assume, no story states

- Task 01: compile-brief resolves `###` headings, and the version bump to 0.6.0 lands in Phase 1 (design puts the version in Phase 5). Plan-driven, justified in plan.md Risks.
- Task 02: link check and reachability check in `scripts/check-paths`, `PENDING` and `PENDING_ORPHANS` lists.
- Task 10: a `glossary-migrate` script with `--apply`, dry run and conflict exit; excludes `docs/plans/` and `docs/adr/`; edits `AGENTS.md` too (design names CLAUDE.md, repo.md, docs).
- Task 12: `declined: <n>` reply suffix and the ledger-copy count rule.
- Task 13: a `## Review focus` section in every brief placed after Global constraints.
- Task 16: `re-review-prompt.md` made reachable, em dashes removed from review-package, placeholder `[BRIEF_FILE]`.
- Task 17: exact four-line status format; the key `isolated_test_execution` is read from `.fx.json` but no code in `src/lib` parses it (it is documented only in the 2026-09-23 lean-build plan), so the parallel pointer depends on a reader following prose.
- Task 18: edits `finishing.md` option 2 to point at `/fx:fx-pr`; conformance rows 09, 13, 14 and `user-invoked-lanes.ts` lists.
- Task 19: ruling 30 gates every write on the owner picking candidates, which narrows the design's output list ("lessons appended") and is not in the design.
- Task 22: a sixth ADR (0058) by ruling 143.
- Task 23: INSTALL pin `#v0.6.0`, SURFACE.md rows.
- Global Constraint on Arabic default locale and RTL: in design and plan, no story, no task AC, no task touches a page or mockup that would exercise it (task 14's design-template edit is the nearest). It is carried only by reviewers reading Global constraints. It looks inherited from the plan template, not from this update.

## Recommendation

Add one AC or one `includes` assertion per gap 1, 2, 3, 5 and 7 (cheap, text gates). For gap 4 add the subagent-writes-old-name line to AC3 and assert the map format heading. For gap 6 either accept live-only verification and say so in the ACs, or add heading and no-push assertions to the generated skills' tests, and add `fx-retro` to the on-request bench.
