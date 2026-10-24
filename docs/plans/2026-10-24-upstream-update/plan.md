# Upstream update: implementation plan

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
**Goal:** bring fx up to superpowers 7.0.1, mattpocock-skills 1.3.1 plus master, and humanizer 3.1.0: every SKILL.md under the 20,000-byte compaction cut, the known contradictions fixed, the glossary renamed, the lanes improved and three new user-invoked commands, in five phases that each pass `scripts/check-all`.
**Architecture:** Phase 1 adds the size gate and moves whole sections out of the oversized skills into files beside them, so later phases have room to add text. Code changes (compile-brief, the brainstorm server, review-package, the glossary reader) are TypeScript under `src/` or bash scripts, each with a test in the existing gate suites; everything else is markdown the existing text gates check. New commands are `commands/*.md` turned into hidden skills by `scripts/gen-command-skills`.
**Stack:** Markdown skills and references; TypeScript under `src/` built by `scripts/build` (esbuild) into committed JavaScript; Python and bash gate scripts; node assert-based tests.
**Complexity:** High
**Risks:**
- HIGH: the installed fx (0.2.9) `compile-brief` matches only `## ` headings, so a Design line naming a `### Phase N: ...` heading dies with `Design entry resolves to nothing`: task 01 names only `##` sections and teaches compile-brief `###` headings; from task 02 on, briefs come from a pinned copy of that fixed binary (standing ruling S2).
- HIGH: this build runs under the bug it fixes: the installed fx-implement SKILL.md is about 49 KB, and a 23-task build compacts and loses the fix-loop cap, final review and exit gate: standing ruling S1.
- HIGH: a split silently drops or rewords a rule, and a compacted controller loses it: task 03 is a measured pure-move set (17,836 bytes in a scratch build), every gate assertion that read a moved sentence is listed with its new file, and the reviewer checks the moves with `git diff --color-moved=zebra`.
- MEDIUM: `tests/gates/release-version.test.js` runs last in every `test_scope` and in `check-all`, and fails any branch that changes shipped files without a version above main's 0.5.0: the 0.6.0 bump lands in task 01, not in Phase 5; task 23 only confirms it.
- MEDIUM: fx-humanize stays over 20,000 bytes until task 11: the size gate carries a pending list that names it, and the gate fails the moment a listed file is under the limit, so the entry cannot outlive its fix.
- MEDIUM: the glossary migration moves owner files: task 10 ships it as a script with a dry-run list and a scratch-repo test, follows the map's links, and never runs from a dispatched subagent.
- MEDIUM: the upstream clones are not in the building session's scratchpad: tasks that copy upstream text clone the pinned commit into `<SCRATCH>/upstream` (superpowers 2ce8aa1, mattpocock-skills 5beb35b, humanizer tag v3.1.0).
- MEDIUM: byte headroom is thin in fx-tdd (about 19,400 after task 15), fx-brainstorm (about 19,050 after task 20) and fx-implement (about 18,650 after task 17): each task states its expected size and names the section to move out if the measured size reaches its limit.
- LOW: task 15 points fx-debug at `/fx:fx-retro`, which task 19 creates: the line names a command and breaks no gate; Phase 3 ships with that forward pointer.
**Testing:** Unit: node assert tests beside the code (`compile-brief.test`, `brainstorm-server.test`, `review-package.test`, `glossary.test`, `glossary-migrate.test`) · Integration: the `check-all` gate suite (size, paths, prose, reference leaves, manifest, return contracts, ledger lines, preamble and hook fixtures) · E2E: the live lane-triggering bench and the pressure fixtures, run only on request, never in `check-all`.

## Global Constraints

- No em or en dashes in any file, commit message or chat output.
- Plain prose: lead with the point, say who acts, one term for one thing, the common word.
- Every SKILL.md under 20,000 bytes, except those on the skill-size PENDING list until their task removes them.
- One claimant per intent: new behaviour goes into an existing lane or reference; the three new entry points are user-invoked commands.
- Never push, merge, open a PR or move the base branch; no attribution trailers; stage by path.
- Edit `src/**/*.ts`, then `scripts/build`; never hand-edit generated JavaScript.
- Tests run with TMPDIR in the session scratchpad and through `scripts/scratch-env`; nothing is written or deleted under the owner's home.
- Locale: Arabic is the default locale, with RTL support throughout, wherever fx produces user-facing product guidance or pages (mockups, design templates, fx-design and web references). Kept per the plan template rule: no other default locale is named.

`<SCRATCH>` means the building session's own scratchpad directory. The controller fills it in once, as a standing ruling, before task 01.

Standing rulings (the controller copies these into the ledger's `## Standing rulings` before task 01):

- **S1, compaction.** After any compaction, the controller re-invokes `fx:fx-implement` with the Skill tool before its next dispatch, as the plan-state notice says. Before tasks 21, 22 and 23, it reads the installed fx-implement SKILL.md's "Final review", "Exit gate: the Iron Law" and "Completion report" sections explicitly.
- **S2, the brief tool.** After task 01 is committed, the controller creates a detached worktree pinned at that commit, `git worktree add --detach <SCRATCH>/fx-brief-tool <task 01 commit>`, and compiles every later brief with `node <SCRATCH>/fx-brief-tool/skills/fx-implement/scripts/compile-brief --worktree <build worktree> ...`. It never compiles a brief from the build worktree, which task 13 rewrites.
- **S3, phase gates.** The `scripts/check-all` runs in tasks 08, 11, 17, 21 and 23 are plan-mandated phase gates. The controller ledgers each as `Task <NN>: ran test_all (plan-mandated phase gate)`, never as a breach of the one-run rule, and does not repeat that rule to the next implementer.
- **S4, the size line.** The Global Constraint on SKILL.md size is true as written: the PENDING list in `src/tests/gates/skill-size.test.ts` names every skill still over the limit, and the gate fails when an entry outlives its fix.

Owner safety rules (bind the planner, the controller and every implementer):

- Every command runs with `TMPDIR=<SCRATCH>/fx-tests/tmp`, and every test runs through `scripts/scratch-env`. The prefix used in every task is `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env`. Create the directory once per session with `mkdir -p <SCRATCH>/fx-tests/tmp`.
- Never write or delete anything under `/home/faisal`.
- Never type `rm`, `trap` or `bash -c`. Leave scratch files in TMPDIR.
- Run Python only as `python3 -I`, for example `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env python3 -I scripts/check-prose <files>`.
- No push, no merge, no attribution trailers. Stage by path, never `git add -A` or `git add .`.
- No em or en dashes anywhere, chat included.

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | compile-brief resolves subsection headings; version 0.6.0 | none | Design lines can name `### Phase` headings; release gate green | 1: Room and fixes |
| 02 | Skill size gate and pointer gates | 01 | `check-all` fails a SKILL.md at 20,000 bytes and a split pointer that resolves to nothing | 1: Room and fixes |
| 03 | Split fx-implement under the gate | 02 | fx-implement SKILL.md at 17,836 bytes (measured), rules in `references/` | 1: Room and fixes |
| 04 | Split fx-authoring under the gate | 02 | fx-authoring SKILL.md about 16,500 bytes; the limit stated | 1: Room and fixes |
| 05 | Move fx-plan templates and fx-review section 7 out | 02 | fx-plan about 11,900 bytes, fx-review about 15,200 | 1: Room and fixes |
| 06 | Brainstorm page server inserts content literally | 01 | `$&` and `$'` survive in mockups | 1: Room and fixes |
| 07 | Waiting reference and good-tests call counts | 01 | one rule for polling versus injecting; call counts reconciled | 1: Room and fixes |
| 08 | COVERAGE files match fx as it is; Phase 1 gate | 03, 04, 05, 06, 07 | six COVERAGE files corrected; `check-all` green | 1: Room and fixes |
| 09 | Glossary reader, session notice and decline key | 01, 08 | GLOSSARY.md read first, old name second, one notice line, `.fx.json` remembers no | 2: Renames and rebase |
| 10 | Glossary rename in fx text and the migration script | 08, 09 | every lane says GLOSSARY.md; map format back; a tested dry-run-first migration | 2: Renames and rebase |
| 11 | fx-humanize rebased on humanizer 3.1.0; Phase 2 gate | 08, 10 | 26 patterns, under the gate, marker updated everywhere | 2: Renames and rebase |
| 12 | Reviewers judge the spec as a vision and list what they declined | 03, 05, 11 | declined list, controller rulings, standards search, wait for every pass | 3: Lane improvements |
| 13 | Plan Review Focus, framing and red-team tags | 01, 12 | Review Focus reaches every reviewer; [blocks]/[advisory] | 3: Lane improvements |
| 14 | Brainstorm builder check, Approaches and the bounded design.md | 10, 11 | fresh-reader questions before review; short design.md on bounded work | 3: Lane improvements |
| 15 | fx-tdd and fx-debug evidence rules | 10, 11 | failures named, seam notes, undo proven by diff, prevention question | 3: Lane improvements |
| 16 | review-package range guard and the re-reviewer brief | 03, 12 | non-ancestor range refused; re-reviewer reads the brief | 3: Lane improvements |
| 17 | Controller status, park-and-continue, completion menu; Phase 3 gate | 13, 14, 15, 16 | build runs while the owner is away; discard only when typed | 3: Lane improvements |
| 18 | `/fx:fx-pr` and `/fx:fx-what` commands | 17 | two user-invoked commands registered on every runtime | 4: New commands |
| 19 | `/fx:fx-retro` command, offered at build end | 18 | evidence-cited lessons, checks proposed as text | 4: New commands |
| 20 | Wayfinder reference | 14, 17 | a local map for work that spans sessions | 4: New commands |
| 21 | Pressure-scenario fixtures for fx-tdd and fx-debug; Phase 4 gate | 19, 20 | rerunnable compliance fixtures with pass criteria | 4: New commands |
| 22 | ADRs for this update | 21 | five ADRs, 0053 to 0057 | 5: Records |
| 23 | README, INSTALL and SURFACE; release check; Phase 5 gate | 22 | docs name the new commands and the migration; 0.6.0 confirmed | 5: Records |
