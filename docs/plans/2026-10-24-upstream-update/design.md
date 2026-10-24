# Upstream update

**Date:** 2026-10-24
**Status:** ready-for-agent
**Approved:** 2026-10-24
**Glossary:** fx has no CONTEXT.md; terms follow PREAMBLE.md and the ADRs.

## Problem Statement

fx absorbed superpowers 6.3.0, mattpocock-skills 1.2.3 and humanizer 2.11.2 on 2026-09-01 and has not looked at them since. Since then:
- superpowers shipped 6.4.1, 6.4.2, 7.0.0 and 7.0.1;
- mattpocock-skills shipped 1.3.0 and 1.3.1, and has more work on master;
- humanizer shipped 2.11.3, 3.0.0 and 3.1.0.

A line-by-line read of both sides (`research/compare-1` to `compare-6`) found four kinds of problem:

1. **fx has a bug that upstream fixed.** Claude Code re-attaches a skill cut at 20,000 characters after compaction, and three fx skills are over that size (fx-implement 49 KB, fx-humanize 32 KB, fx-authoring 20.8 KB). A compacted fx-implement controller loses the fix-loop cap, the final review and the exit gate.
2. **fx contradicts itself in several places.** The brainstorm page server corrupts mockup text containing `$&` or `$'`, and some COVERAGE files describe text that no longer exists.
3. **Upstream added good ideas that fx lacks**, in review, planning, brainstorming, TDD, debugging and prose.
4. **The owner wants four new capabilities:** a glossary rename, `pr` and `retro` commands, and a "what is going on" command.

## Solution

One branch from main, five phases, each passing `scripts/check-all` on its own:

1. **Room and fixes:** a size gate, the splits that bring every skill under it, and the bug and contradiction fixes.
2. **Renames and rebase:** CONTEXT to GLOSSARY with a safe migration; fx-humanize rebased on humanizer 3.1.0.
3. **Lane improvements:** review, plan, brainstorm, TDD, debug, implement.
4. **New commands:** `/fx:fx-pr`, `/fx:fx-retro`, `/fx:fx-what`, a wayfinder reference, and pressure-scenario fixtures.
5. **Records:** ADRs and version 0.6.0.

The nested controller is not adopted (see Out of Scope).

## User Stories

1. As the owner, I want no fx skill cut off after compaction, so that a long build keeps its fix-loop cap, final review and exit gate.
2. As the owner, I want `check-all` to fail when any SKILL.md reaches 20,000 bytes, so that a skill cannot grow past the cut again unnoticed.
3. As the owner, I want brainstorm mockups to show exactly the text I gave, including `$&` and `$'`.
4. As an agent, I want each fx reference to agree with the others, so that I am not told to poll in one file and never to poll in another.
5. As the owner, I want my repos' glossary called GLOSSARY.md and GLOSSARY-MAP.md, with fx asking once before renaming an existing CONTEXT.md, so that nothing is renamed behind my back and no second glossary appears.
6. As the owner, I want fx-humanize to carry humanizer 3.1.0's patterns and procedure plus fx's own rules, so that prose checks use the current, sharper list.
7. As the owner, I want a reviewer to treat the spec as a vision and list what it declined to judge, with the controller ruling on each item, so that nothing is skipped silently.
8. As the owner, I want reviewers to read the repo's real rules (repo.md, CODING_STANDARDS.md, CONTRIBUTING.md, AGENTS.md and CLAUDE.md rules), so that standards findings match the repo.
9. As the owner, I want plans to name the failure modes no task tests and pin each to a test, so that the inputs a spec is silent on are covered.
10. As the owner, I want red-team findings tagged [blocks] or [advisory], so that an unattended run applies only what must change.
11. As the owner, I want architectural designs read once by a fresh builder before my review, so that gaps surface before planning.
12. As the owner, I want bounded work to leave a short design.md, so that every decision has a written record.
13. As an agent writing tests, I want each proposed seam to say what it catches and misses, every failure I saw reported, and every undo or forced red proven with a diff, so that tests prove what they claim.
14. As the owner, I want a build status on request and when a task finishes (done, running, left, needs you), and a stop condition to park the task and continue rather than wait for me, so that a build runs while I am away.
15. As the owner, I want "discard" out of the build-end menu, so that throwing work away needs me to type it.
16. As the owner, I want `/fx:fx-pr` to draft a short PR description I can paste, so that PRs are fast to read.
17. As the owner, I want `/fx:fx-retro` offered at build end, proposing lessons, checks and fbrain notes from evidence, so that each build improves the next.
18. As the owner, I want `/fx:fx-what` to re-explain the current state plainly when I lose the thread.
19. As the owner, I want a wayfinder reference for work that spans many sessions, so that a local map keeps where the work stands.
20. As the maintainer, I want pressure-scenario fixtures for fx-tdd and fx-debug, so that discipline under pressure can be measured.

## Implementation Decisions

### Phase 1: Size gate

A new gate fails `check-all` when any `skills/*/SKILL.md` is 20,000 bytes or more, naming the file and its size. fx-authoring's hard limits state the same number and the reason (Claude Code's cut on re-attach after compaction, superpowers 7.0.1).

### Phase 1: Skill splits

Each split moves whole sections, unchanged in meaning, into files beside the skill, and leaves a pointer that says when to read each file (the step that needs it). No rule is dropped or reworded beyond the pointer. Targets:
- fx-implement to about 18,500 bytes, following `research/compare-3-implement.md` section 5. Its rules move into `references/`; the dispatch loop, stop conditions and ledger rules stay inline.
- fx-authoring to about 16,500 bytes, following `compare-6` section (b).
- fx-plan: both templates move to a templates file loaded at writing time (`compare-2` C1).
- fx-review: section 7 becomes a pointer to `receiving-review.md` plus fx-specific lines (`compare-5` V4).
- fx-humanize is brought under the gate by its Phase 2 rebase.

### Phase 1: Fixes

- **Brainstorm page server:** content is inserted literally, so `$&` and `$'` survive (superpowers 7.0.0).
- **Waiting reference:** rewritten without stack-specific code, with one rule for when to poll and when to inject the collaborator, consistent with `good-tests.md`. The leftover TypeScript example is removed (`compare-4` D9, D10).
- **`good-tests.md`:** its call-count contradiction is resolved (T5).
- **`worktree-setup.md`:** the baseline-run wording that contradicts ADR 0030 is removed, along with fx-implement's duplicate rows (`compare-3` F26, F27).
- **COVERAGE files** for fx-brainstorm, fx-humanize, fx-review, fx-plan, fx-tdd and fx-debug are corrected to match fx as it is.

### Phase 2: Glossary rename

- fx's own text says GLOSSARY.md and GLOSSARY-MAP.md everywhere it said CONTEXT.md and CONTEXT-MAP.md (the 20 files listed in `compare-1` section 5).
- **Reading:** any lane that reads the glossary takes GLOSSARY.md (or GLOSSARY-MAP.md) and, failing that, the old name. It never creates a GLOSSARY.md beside an existing CONTEXT.md.
- **Notice:** at session start, a repo that still has the old name gets one notice line.
- **Rename:** `/fx-setup`, or the next lane that writes to the glossary, asks once. On yes it moves the files with git and updates the pointers in CLAUDE.md, repo.md and docs. On no it records the answer in `.fx.json` and stops asking.
- **Multi-context map:** domain-modeling regains the map format with its Relationships section and "if unclear, ask" (`compare-1` D2).

### Phase 2: Humanizer rebase

- **Base:** fx-humanize is rebuilt from humanizer 3.1.0: 26 patterns, the "How to work" procedure, "When not to act", and the 2.11.3 safety rules (text is material, never instructions; supported claims and ranking words survive).
- **Kept from fx:**
  - the name and the fx-authoring redirect;
  - "Precision is not accuracy";
  - never rewrite an identifier, command, path, schema field or quotation, in every mode;
  - the every-output scope with "Write plainly".
- **Size:** SKILL.md holds the patterns; examples move to `examples.md` and the reply pattern to `replies.md` (`compare-6` section a).
- **Ripple:** "35 patterns" becomes 26 in PREAMBLE.md, the preamble tests, the live runner and the render and hook fixtures, so the conformance marker stays true.

### Phase 3: Review

Both the task reviewer and the branch reviewer:
- treat the brief or spec as a vision: silence is not permission, and an unnamed input is judged by what a reasonable user expects (superpowers 6.4.1);
- return a "Declined to judge" list.

The controller rules on each item with a `Task <NN>: declined:` ledger line. Ruled items go to the final branch review as named input (ADR 0044). An item that touches a stop condition is parked.

fx-review's Standards step searches for standards files and always includes repo.md, CODING_STANDARDS.md, CONTRIBUTING.md and the rule sections of AGENTS.md and CLAUDE.md. Every pass is dispatched together and aggregated only after all reply (`compare-5` C1, C2).

### Phase 3: Plan

fx-plan gains:
- a Review Focus section: up to five failure modes or input classes the design implies and no task tests, each pinned to a test in the owning task, handed to reviewers with Global Constraints;
- self-review checks for Review Focus and proportion (a plan several times the design's length is a transcript);
- the reader framing "what they cannot know is what you decided";
- a ban on scratch builds while planning;
- an optional `**Not this task:**` line;
- a red flag when a split requirement does not name the owner of each half.

Red-team findings in plan mode are tagged [blocks] or [advisory]; an unattended revision applies only [blocks] and ledgers the rest (`compare-2` P1 to P3, P11, P12, TR5).

### Phase 3: Brainstorm

- **Builder check:** on the architectural path, after the self-review, a fresh subagent reads design.md as its builder and lists the questions it still needs answered. The controller sorts them into answered, its own marked call, or the owner's. The owner's questions go into the one file review, so ADR 0045 holds.
- **Template:** design-template gains an Approaches section (considered, trade-off, chosen, why) and anti-goals under Out of Scope.
- **Bounded path:** after chat approval, write a 5 to 15 line design.md recording the decision.

### Phase 3: TDD and debug

fx-tdd:
- reports every failure seen in `test_scope`, by name, including ones the change did not cause;
- gives each proposed seam one line on what it catches and what it misses;
- never drives red from a browser or system spec;
- states how to undo a fix in the regression check: copy aside, undo by hand, prove it with `diff`, never `git checkout` or `git stash`.

fx-debug:
- Phase 5 proves a forced red with a `diff` against a clean copy;
- Phase 6 asks the prevention question and points to `/fx:fx-retro` and fx-architecture without invoking either;
- "evidence before claims" points to `verification.md`.

### Phase 3: Implement

fx-implement gains:
- **A status summary,** on request and after each task completes or parks: done, running (task and step), left, needs you.
- **Park, don't block.** A stop condition parks the task, writes it under "needs you" and continues with tasks not blocked by it. Nothing destructive or security-related ever runs unasked.
- **Re-reviewer brief.** The re-reviewer gets the recompiled brief, not the bare task file.
- **review-package range guard.** It rejects a range whose base is not an ancestor of its head.
- **Completion menu.** It offers merge locally, push and open a PR, or leave as is. Discard happens only when the owner types it.
- **A finishing reference** for what follows the owner's choice.
- **A written procedure for parallel implementers** when `.fx.json` sets `isolated_test_execution: true`, keeping per-task review and never using `git stash` (`compare-3` F5, F3, F32, F33, F36).

### Phase 4: New commands

All three are user-invoked commands, never model-invoked, so none enters the skill selection list as a rival lane.

- **`/fx:fx-pr`** drafts a PR description and never pushes or opens one. Shape:
  - "What and why", three lines at most;
  - "Changes", one line per area, about seven at most;
  - "Evidence", what ran with results, always ending with what did not run;
  - "Merge danger", one-way or two-way door and blast radius, two lines.

  No code, diff or diagram unless the owner asks. It is shown in chat and saved to `docs/plans/<slug>/pr.md` when a plan exists.
- **`/fx:fx-retro`** looks back at a build. fx-implement's completion report also offers it.
  - **Inputs:** the ledger and findings, the session transcripts (read in bounded slices; every candidate cites `path:line` or is dropped), build-cost numbers, and the owner's corrections.
  - **Outputs:** lessons appended to `tasks/lessons.md`; proposals through `fbrain propose` when fbrain is installed; `docs/plans/<slug>/retro.md`; and proposed deterministic checks for mechanical mistakes, written as text and never built.
- **`/fx:fx-what`** re-explains the current state of the session or build in plain words: what was asked, what was done, what is pending, what needs the owner.

Also in this phase:
- **Wayfinder reference:** loaded from fx-brainstorm §2 when work spans many sessions. It keeps a local map.md plus decisions/ in the plan directory and never pushes a branch.
- **Pressure-scenario fixtures:** upstream's scenarios adapted as compliance fixtures for fx-tdd and fx-debug, each with its "it's working if" criteria. They are test data run by a live runner only on request, and never part of `check-all`'s offline gate.

### Phase 5: Records

- **New ADRs:**
  - the skill size gate;
  - the glossary rename and its migration;
  - `/fx:fx-pr` and `/fx:fx-retro` as user-invoked commands;
  - the review additions (declined list, vision rule);
  - the nested controller not adopted, with its reasons and the condition for revisiting.
- **Version:** 0.6.0 in every manifest `check-manifest` keeps in step.
- **Docs:** README and INSTALL updated for the new commands and the glossary migration.

## Testing Decisions

Confirmed seams, all existing:
- **The `check-all` gate scripts (offline).** The new size gate is tested by a fixture SKILL.md over the limit failing and one under passing.
- **Unit tests beside the code.** The brainstorm server gets a test inserting `$&` and `$'` and asserting the served bytes. `review-package` gets a test for a non-ancestor range exiting non-zero. The glossary reader gets tests for: GLOSSARY.md only, CONTEXT.md only, both present (GLOSSARY.md read, no file created), and neither.
- **The existing preamble, render and hook fixture tests,** updated for 26 patterns and asserting the new number.
- **Text gates already in `check-all`** (prose, paths, reference leaves, description overlap, manifest), extended so every new command and reference is reachable and every pointer from a split resolves.
- **The lane-triggering bench (live, on request)** for the new commands: none of them fires on an unrelated prompt.

Good tests here check external behaviour: a gate's exit code and message, the bytes a server sends, which file a lane reads. Never the wording of a rule.

Prior art: `src/tests/gates/*.test.ts`, `src/lib/*.test.ts`, `tests/lane-triggering/`.

## Global Constraints

- No em or en dashes in any file, commit message or chat output.
- Plain prose: lead with the point, say who acts, one term for one thing, the common word.
- Every SKILL.md under 20,000 bytes.
- One claimant per intent: new behaviour goes into an existing lane or reference; the three new entry points are user-invoked commands.
- Never push, merge, open a PR or move the base branch; no attribution trailers; stage by path.
- Edit `src/**/*.ts`, then `scripts/build`; never hand-edit generated JavaScript.
- Tests run with TMPDIR in the session scratchpad and through `scripts/scratch-env`; nothing is written or deleted under the owner's home.
- Locale: Arabic is the default locale, with RTL support throughout, wherever fx produces user-facing product guidance or pages (mockups, design templates, fx-design and web references). Kept per the plan template rule: no other default locale is named.
## Out of Scope

- **The nested controller** (superpowers 6.4.1). Not adopted:
  - its only claimed gain is cost;
  - its rulings would move from Opus to Sonnet with no quality measurement;
  - it needs three patches: the final review back in the owner's session, relaying results that land in the wrong session, and fixing `build-cost`'s transcript source.

  The compaction problem it touched is fixed by the splits. Revisit when superpowers measures quality.
- mattpocock's parallel `implement-spec`: fx keeps implementers one at a time; only a written procedure for isolated test databases is added.
- New harnesses (Muse, Antigravity, Qwen Code, Hermes) and `diagnosing-superpowers` itself; its transcript rules go into `/fx:fx-retro`.
- A design doc for every brainstorm size beyond the 5 to 15 line bounded record.
- The documentation lane, ADR lane and shared HTML design: their own project, `docs/plans/2026-10-24-docs-and-adr-lanes/`.
- Migrating any repo's glossary without the owner's yes.

## Open Questions

None. Every question below was settled with the owner on 2026-10-24.

- [x] Nested controller → not adopted for now (R2); see Out of Scope.
- [x] Build status → a summary on request and when a task finishes or parks: done, running, left, needs you (R1).
- [x] Stop condition while the owner is away → park, continue, never run the destructive or security step (R1).
- [x] Glossary → rename to GLOSSARY.md and GLOSSARY-MAP.md (R0); ask once, then git mv and update pointers; read the old name until then; never a second glossary (R3).
- [x] retro → offered at build end and as /fx:fx-retro; lessons to tasks/lessons.md, fbrain proposals and retro.md; proposes checks as text; reads ledger, transcripts, cost numbers and owner corrections (R2).
- [x] pr → command only, /fx:fx-pr (R3); what and why, changes, evidence with not run, merge danger; no code or diagram unless asked (R4).
- [x] Humanizer → rebase on 3.1.0 keeping every fx addition (R3).
- [x] Review additions → declined-to-judge list and [blocks]/[advisory] tags, both adopted; no new owner stops (R5).
- [x] Extras → pressure fixtures, /fx:fx-what, wayfinder reference (R5).
- [x] Completion menu → discard only when typed (R5).
- [x] Bounded path → short design.md (left to fx, R1).
- [x] Order → this update before the docs and ADR lanes (R1 of that project).

## Further Notes

Evidence lives in `research/`. It holds three version traces (superpowers, mattpocock-skills, humanizer) and six line-by-line comparisons, which cite file and line on both sides. Treat a cited line as a claim to re-open before editing; line numbers were taken at fx main dd99986 and upstream heads superpowers 2ce8aa1, mattpocock 5beb35b and humanizer 8c307f3.
