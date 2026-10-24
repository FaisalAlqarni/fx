# Compare 2: planning and triage

Area: superpowers `writing-plans` (v6.3.0 to v7.0.1), mattpocock `to-tickets`, `triage`, `wayfinder`, `ask-matt` (1.2.3 at 30204e6 to master 5beb35b), against fx `skills/fx-plan/`, `agents/fx-devils-advocate.md`, `references/design-template.md`, ADR 0035 and ADR 0043 (fx main at dd99986).

Release labels for mattpocock: "1.3.x" means released by v1.3.1; "master" means after v1.3.1 and not yet released. Commits after v1.3.1 in this area: `cffab50`, `9e2abf8` (to-tickets sub-issues), `954ee7f` (ask-matt reads SKILL.md first), `8295b8e` (wayfinder labels, real ids, no research PRs, resolve by type). Everything else in the 1.2.3..HEAD diff for these four skills is 1.3.x, and most of it is punctuation (em dashes to colons) plus the `CONTEXT.md` to `GLOSSARY.md` rename and "call the Skill tool" phrasing.

## 1. Files read

Upstream, superpowers:

| File | Lines | How |
|---|---:|---|
| `skills/writing-plans/SKILL.md` @ HEAD (v7.0.1) | 204 | full |
| `skills/writing-plans/SKILL.md` @ v6.3.0 | 171 | lines 1 to 60 in full, the rest through the full `git diff v6.3.0 HEAD` (every changed hunk with context) |
| `skills/writing-plans/plan-document-reviewer-prompt.md` @ v6.3.0 (deleted in v6.4.2) | 49 | full, via `git show` |
| `RELEASE-NOTES.md`, writing-plans entries for 5.x, 6.4.1, 6.4.2 | n/a | grep with context |
| `git log v6.3.0..HEAD -- skills/writing-plans` | 4 commits | subjects; 6.4.1 `5bf4e78`, 6.4.2 `8ca22db` are the substantive ones |
| `upstream/superpowers-since-6.3.0.md` (pre-written notes) | n/a | writing-plans and builder-check rows |

Upstream, mattpocock-skills:

| File | Lines | How |
|---|---:|---|
| `skills/engineering/to-tickets/SKILL.md` | 105 | full |
| `skills/engineering/to-tickets/agents/openai.yaml` | 5 | full |
| `skills/engineering/triage/SKILL.md` | 112 | full |
| `skills/engineering/triage/AGENT-BRIEF.md` | 207 | full |
| `skills/engineering/triage/OUT-OF-SCOPE.md` | 105 | full |
| `skills/engineering/triage/agents/openai.yaml` | 5 | full |
| `skills/engineering/setup-matt-pocock-skills/triage-labels.md` | 15 | full |
| `skills/engineering/wayfinder/SKILL.md` | 128 | full |
| `skills/engineering/wayfinder/agents/openai.yaml` | 5 | full |
| `skills/engineering/ask-matt/SKILL.md` | 97 | full |
| `skills/engineering/ask-matt/PHASE-BOUNDARIES.md` | 55 | full |
| `skills/engineering/ask-matt/agents/openai.yaml` | 5 | full |
| `.changeset/to-tickets-sub-issues.md`, `wayfinder-labels-refs-research-prs.md`, `ask-matt-read-skill-first.md` | 5 each | full |
| `git diff 30204e6 HEAD` over the four skill directories | 698 | full |

fx:

| File | Lines | Bytes | How |
|---|---:|---:|---|
| `skills/fx-plan/SKILL.md` | 446 | 19,289 | full |
| `skills/fx-plan/COVERAGE.md` | 158 | | full |
| `agents/fx-devils-advocate.md` | 196 | | full |
| `references/design-template.md` | 88 | | full |
| `docs/adr/0035-standing-rulings-live-in-one-repo-file.md` | 17 | | full |
| `docs/adr/0043-plan-tasks-state-behaviour-and-name-tests.md` | 24 | | full |
| `tests/gates/plan-template.test.js` | ~45 | | assertions read |
| `skills/fx-brainstorm/SKILL.md` lines 85 to 105 | | 17,542 | scope/decomposition section only |
| `commands/fx-handoff.md` | 92 | | full (for the phase-boundary comparison) |
| `docs/plans/2026-09-01-fx/design.md` lines 20 to 120 | | | one-claimant rule and tier table |

Owner repo, for context only: `/development/advantage-backend/docs/agents/issue-tracker.md` and `triage-labels.md` (they still configure mattpocock's `.scratch/` tracker, triage roles and "Wayfinding operations").

## 2. Findings per upstream skill

Sizes: S = a few lines in one file; M = several files or a gate test; L = a new reference plus wiring.

### 2.0 A constraint that gates every proposal below

**C1. fx-plan has 711 bytes of headroom.** `skills/fx-plan/SKILL.md` is 19,289 bytes against the 20,000 byte cut on re-attach. Every addition proposed in this file overruns it. Superpowers hit the same wall and in v7.0.0 moved `subagent-driven-development` from 32,577 to 19,506 bytes by moving parts to `references/*.md` read at the step that needs them, and added `tests/skill-size/test-skill-size.sh` (fails at 20,000). fx has no size gate (grep for 20000 in `src/`, `scripts/`, `tests/` finds none), and three lanes are already over: `fx-authoring` 20,774, `fx-humanize` 31,745, `fx-implement` 49,175 (outside this area; flagged only).
- Verdict: fx gap.
- Change (M): move the "plan.md template" and "tasks/NN-<slug>.md template" sections (fx-plan:229 to 419, 7,391 bytes) into `skills/fx-plan/templates.md`, and make §5 say "Copy both templates from `templates.md` verbatim." Point `src/tests/gates/plan-template.test.ts` (lines that slice `## tasks/NN-<slug>.md template` out of SKILL.md) at the new file. Delete the duplicated prefactoring sentence (fx-plan:76 to 77 and 87 to 88 say the same thing). Add a size gate to `scripts/check-all` that fails any `skills/*/SKILL.md` at or above 20,000 bytes. Result: about 7,500 bytes free in fx-plan.

### 2.1 superpowers `writing-plans`

| # | Upstream says | fx says | Verdict | Why it matters | Proposed change |
|---|---|---|---|---|---|
| P1 | Reader is "an engineer who has not seen this codebase or this spec... will make a reasonable choice wherever the plan leaves one open. What they cannot know is what you decided: which files, which names and signatures, which values from the spec, which tests prove each task. Document those." (SKILL.md:10, v6.4.2). Replaced "zero context, questionable taste". Release notes: plans took a quarter of the time and a third of the tokens; 9/9 against planted-defect probes on Sonnet 5, same as full-code plans. | fx-plan:21 to 29 already dropped "questionable taste" (ADR 0043) but keeps "Document what they need... Write less and you are guessing on their behalf." | upstream better | fx's last sentence pushes toward more text, the opposite of the measured result. "What they cannot know is what you decided" is a sharper test for what goes in a task. | S. Replace fx-plan:26 to 29 with: "Assume they are a skilled developer who invokes `fx-tdd` for test design and makes a reasonable choice wherever the plan leaves one open. What they cannot know is what you decided: which files, which names and signatures, which values from the design, which tests prove each task. Write those." Byte-neutral. |
| P2 | v6.4.2 notes: some frontier models, "including Opus 5.5", tried to implement the whole project while writing the plan; the leaner skill made "the scratch builds go away". | fx-plan §4 (line 75): "Explore the codebase first", no limit on what exploring may do. | fx gap | fx sessions run on Opus 5.5. A plan session that builds scratch code burns the budget and pre-decides what `fx-tdd` should drive. | S. Add to §4 after "Explore the codebase first": "Read, do not build: no scratch implementation and no trial runs. A question only running code can settle goes to `prototype`." |
| P3 | **Review Focus** (SKILL.md:77 to 87, self-review item 4 at :173): up to five input classes or failure modes the spec implies but no task tests, most likely first, each with the behaviour a reasonable person expects; "the spec is a vision document... its silence on an input is not permission for that input to break the program"; each line gets a test added to the owning task; "an empty section means you checked and found none". Added in v6.4.1. | Absent. fx-plan §6 has four checks (coverage, placeholders, types, headings). `design-template.md` has no such section. The closest is devils-advocate design mode "What happens on error? On concurrency? On partial failure? On resume?" (fx-devils-advocate.md:69 to 71), which runs only when the red-team option is picked. | fx gap | The fx-plan incident record (COVERAGE.md:121 to 152) is four cases of exactly this: tests passed while a user could not reach the feature, or only refusals were tested. Coverage walks check what the design says; nothing checks what it is silent on. | M. (a) In the plan.md template, after Global Constraints, add `## Review Focus` with the upstream wording adapted: "Up to five inputs or conditions the design implies but no task's Tests cover, most likely to bite a user first. One line each: the input, the behaviour a reasonable user expects, the owning task. Each line also becomes a Tests entry in that task. Empty means checked and none found." (b) §6 check 5: "Review Focus: for each input or failure the design implies, name the task whose Tests cover it; the uncovered ones go in Review Focus and into the owning task." (c) `fx-implement`/`fx-review` hand Review Focus to the reviewer next to Global Constraints (cross-area; same mechanism). (d) Extend `plan-template.test` to pin the heading. Needs C1 first. |
| P4 | "What a Step Contains" (SKILL.md:140 to 161): "A step is done when the implementer can write exactly one reasonable thing from it... unambiguous, not complete." Test step = name + assertions; code step = exact signature, file, spec values; body only for an undetermined algorithm. | Tests field in prose with exact expected values (fx-plan:319 to 328, ADR 0043); Interfaces only when a neighbour consumes or produces (fx-plan:310 to 315); no test or implementation code (fx-plan:409 to 417). | equivalent; fx better on test code | fx's prose Tests field already does what upstream's "assertions as code" does, without code nobody ran (ADR 0043 context: implementers reported given tests did not run). Upstream's one-sentence criterion is a cleaner test than fx's list. | S, optional. Under "No placeholders" add the criterion as the heading sentence: "A field is done when the implementer can write exactly one reasonable thing from it." |
| P5 | Self-review item 5, Proportion (SKILL.md:175): a plan several times longer than the spec is a transcript; replace bodies with signatures. | No proportion check; ADR 0043 bans test and implementation code and `plan-template.test` asserts no fenced test code. | equivalent | fx removed the cause (code in tasks) instead of measuring the symptom. | None. |
| P6 | Step = "one action with a checkable result" (SKILL.md:45), was "2 to 5 minutes". | "Each step within a task is one action... Two actions in one step means the implementer can half-finish it and still tick the box." (fx-plan:110 to 112) | fx better | fx states the failure the rule prevents. | None. |
| P7 | Execution handoff (SKILL.md:179 to 204, v6.4.1): link the plan, ask the human to **review** it, offer Subagent-driven vs Native with a cost line each, and "For this plan I recommend X because <how much tasks depend on each other's interfaces, how many there are, what a shipped mistake would cost>". An already-chosen method is kept but the review still happens. | §8 four options (implement, red-team, keep discussing, save for later) with a reasoned red-team recommendation (fx-plan:171 to 227). One build path, `fx-implement` (COVERAGE row 119 to 127). | fx better overall; upstream better on the reasoned execution recommendation | The owner has decided to adopt the optional nested controller. Once `fx-implement` has two modes, the person choosing needs the same reasoned recommendation upstream gives, and fx-plan is where the facts (task count, Interfaces coupling, risk) are in hand. | M, after the nested-controller work lands. Option 1 becomes "Start implementing: `fx-implement`, <in-session controller \| nested controller> recommended because <task count, how many tasks carry Interfaces, highest risk>." Keep one lane; the mode is an argument, not a second path. |
| P8 | Header "Spec: path... the spec travels with it; executors read both" (SKILL.md:67). | `**Design:** ./design.md` plus per-task `**Design:**` lines that `compile-brief` copies into the brief (fx-plan:254, 295 to 297). | fx better | fx delivers the passage, not just the path. | None. |
| P9 | Global Constraints, Interfaces Consumes/Produces, Scope Check, File Structure, Task Right-Sizing (SKILL.md:19 to 41, 70 to 75, 102 to 106). | Kept (fx-plan:48 to 99, 264 to 273, 310 to 315), plus "tasks that edit the same files merge", "fewer, deeper tasks", no line ranges, reviewer gets Global Constraints as its lens. | fx better | | None. |
| P10 | Self-review is "a checklist you run yourself, not a subagent dispatch" (SKILL.md:165). | Same (fx-plan:155). | equivalent | | None. |
| P11 | **Deleted `plan-document-reviewer-prompt.md`.** What it was: a general-purpose subagent checking Completeness, Spec Alignment, Task Decomposition and **Buildability** ("Could an engineer follow this plan without getting stuck?"), calibrated to "only flag issues that would cause real problems during implementation", returning `Approved \| Issues Found` with **advisory Recommendations that do not block** (old file:20 to 46). Why removed: in 5.x the review loop was replaced by inline self-review ("3 to 5 real bugs per run in ~30s instead of ~25 min, with comparable defect rates"); in 6.4.2 the file was deleted because "nothing referenced it". v7.0.0 replaced the analogous spec reviewer with `builder-check-prompt.md`: a fresh subagent reads the design as the builder and lists only the questions it still needs answered. | `fx-devils-advocate` plan mode, opt-in and risk-gated (fx-plan §7), hostile posture, design-to-plan cross-reference (fx-devils-advocate.md:80 to 100). No buildability check from the implementer's seat. | fx better on gating (matches upstream's evidence that an always-on reviewer is not worth it); upstream had one check fx lacks | fx's implementer sees only its task plus the compiled brief (fx-plan:314). Faithfulness and quality-lens checks read the plan as a whole, so a task that is unambiguous in context but not alone passes. | S. Add to fx-devils-advocate plan mode: "**Buildability**: read each task as its implementer, who sees only that task and the design passages its `Design:` line names. Name any task where they would have to guess a name, a value, or which task owns the adjacent behaviour." |
| P12 | Old reviewer split **Issues (block)** from **Recommendations (advisory, do not block approval)** (old file:42 to 46). | Devils-advocate output is one severity-ordered list (fx-devils-advocate.md:153 to 162). Unattended: "feeds the findings into one bounded revision" (fx-devils-advocate.md:183 to 186, fx-plan:223 to 227). | upstream better for unattended runs | Unattended, every finding is folded in, including ones that only polish. That grows the plan and can introduce drift the red-team itself would flag. | S. Each finding line ends `[blocks]` or `[advisory]`. Unattended: the revision applies `[blocks]` findings and logs `[advisory]` ones to `state.md` without editing the plan. |

### 2.2 mattpocock `to-tickets`

| # | Upstream says | fx says | Verdict | Why it matters | Proposed change |
|---|---|---|---|---|---|
| T1 | (master) On a real tracker, make each ticket a sub-issue of the source issue; omit `## Blocked by` when blockers are native edges (to-tickets:63, 101; changeset `to-tickets-sub-issues`). | Local files only; "nothing goes to GitHub" (COVERAGE row 174 to 178). | not applicable | Owner rule: nothing leaves the machine. | None. |
| T2 | (1.3.0) Titles use "the project's domain glossary vocabulary" (to-tickets:21); glossary file is now `GLOSSARY.md`. | fx-plan:90 "domain vocabulary from `CONTEXT.md`"; design-template.md:5 and :19 name `CONTEXT.md`. | fx gap (owner already decided the rename) | Stale filename after the rename lands. | S. Replace `CONTEXT.md` with `GLOSSARY.md` in fx-plan:90 and design-template.md:5, :19, as part of the repo-wide rename. |
| T3 | Quiz the user on granularity and edges, iterate until approved (to-tickets:42 to 56). | Cut by owner decision; §8 shows the task table once (COVERAGE row 160 to 167). | equivalent by decision | Upstream has not added new evidence for the second checkpoint. | None. |
| T4 | Avoid file paths and code snippets, "they go stale fast" (to-tickets:105); triage AGENT-BRIEF.md:9 to 17: "The issue may sit in `ready-for-agent` for days or weeks... Don't reference file paths." | Paths kept, line numbers banned (fx-plan:307 to 308, COVERAGE row 192). Plans are built soon after writing, except **Save for later** parks a plan with no expiry (fx-plan:215 to 221). | fx gap in one case | The upstream durability argument is wrong for a plan built the same day and right for a parked one. A plan resumed weeks later carries `Modify:` paths and `Consumes:` signatures nobody rechecked. | S. In §8 "Save for later" add: "On resume, before `fx-implement`, confirm every `Modify:` path exists and every `Consumes:` signature still resolves, then re-run §6.1 and §6.3. Fix the tasks first." |
| T5 | Vertical slices, prefactor first, blocking edges, wide refactor expand/migrate/contract with the integration-branch case (to-tickets:25 to 40). | Kept, plus "say so explicitly in each batch task" (fx-plan:73 to 131). | fx better | | None. |
| T6 | Local template: What to build, Blocked by, Status, criteria (to-tickets:69 to 82). | Kept and extended (Design, Stack, Files, Interfaces, Seam, Tests, Idempotency) (fx-plan:285 to 399). | fx better | | None. |

### 2.3 mattpocock `triage`

| # | Upstream says | fx says | Verdict | Why it matters | Proposed change |
|---|---|---|---|---|---|
| TR1 | A state machine for incoming issues and external PRs: two categories, five states, "Show what needs attention" buckets, quick override, needs-info template, resume (triage SKILL.md:24 to 112). | No triage lane. fx records state as `Status:` on plan files only. | not applicable as a lane | One engineer, requests relayed by the business side, nothing on GitHub, no external PRs. A lane would add a claimant for an intent that does not occur. **But** advantage-backend still configures mattpocock's `.scratch/` tracker and triage roles (`docs/agents/issue-tracker.md`, `triage-labels.md`, `CLAUDE.md` "Issue tracker"), while fx writes `docs/plans/`. Two trackers for one repo. | No fx change. Ask the owner: retire `.scratch/` and `docs/agents/` in advantage-backend in favour of `docs/plans/`, or keep `.scratch/` for incoming requests only? |
| TR2 | **Redundancy check**: "search for an existing implementation of the requested behavior by domain concept (not just the request's wording), and report where you looked. If found, it's an already-implemented `wontfix`." (triage SKILL.md:70) | fx-brainstorm §2 "Check the current state: files, docs, recent commits" (fx-brainstorm:88 to 89); no explicit already-built check. | fx gap | A request relayed from the business side (for example the business gap analysis follow-ups) may describe a feature that exists under a different name. Designing it again costs a whole brainstorm and plan. | S (fx-brainstorm, cross-area). Add to §2: "Before the first question, search for an existing implementation by domain concept, not the request's words, and say where you looked. If it exists, say so and stop." |
| TR3 | **Out-of-scope knowledge base**: one file per rejected concept with the reason and every prior request; checked by concept similarity on each new request; the maintainer confirms, reconsiders or disagrees; never written for "already implemented" (OUT-OF-SCOPE.md:1 to 105). | design.md "Out of Scope" is per effort (design-template.md:77 to 79); ADRs record decisions made; `rulings.md` holds build rulings (ADR 0035). Nothing records a rejected request so the next one meets it. | fx gap | Without a record, a rejected idea comes back through a different person and gets argued again. | M. No new directory: a rejected concept becomes an ADR titled "Not doing: <concept>" with Reason and Prior requests sections. fx-brainstorm §2 reads ADR titles starting "Not doing:" and surfaces a match with the upstream question ("We decided not to build this because <reason>. Still the case?"). |
| TR4 | Verify the claim before grilling: reproduce a bug from the reporter's steps (triage SKILL.md:74). | `fx-debug` owns "feedback loop first". | equivalent | | None. |
| TR5 | Agent brief: durable, behavioural not procedural, complete acceptance criteria, and **explicit scope boundaries**: "State what is out of scope. This prevents the agent from gold-plating or making assumptions about adjacent features." (AGENT-BRIEF.md:9 to 37, template :65 to 67) | Task has What to build and Acceptance criteria. No per-task out-of-scope line; scope creep is caught only at plan level by devils-advocate (fx-devils-advocate.md:95 to 96) and at review. | fx gap | Two failure modes in fx's own record: an implementer building the neighbour task's half, and the reverse, "No task's acceptance criteria carried the second half" (COVERAGE.md:121 to 129). A line naming which task owns the adjacent behaviour covers both. | S (in `templates.md` after C1). Optional task field: `**Not this task:** <adjacent behaviour> (task NN)`. Quality red flag: "A requirement split across tasks names the owner of each half in both tasks." |
| TR6 | Every posted comment starts with an AI disclaimer (triage SKILL.md:13 to 17). | n/a | not applicable | Nothing is posted. | None. |

### 2.4 mattpocock `wayfinder`

| # | Upstream says | fx says | Verdict | Why it matters | Proposed change |
|---|---|---|---|---|---|
| W1 | For "a huge chunk of work (more than one agent session can hold)", chart a **map** (Destination, Notes, Decisions so far, Not yet specified, Out of scope) with **decision tickets** (research / prototype / grilling / task), blocking edges, a frontier, claim-before-work, "never resolve more than one ticket per session" except research, "decisions, not deliverables", the map "is an index, not a store", "Fog or ticket? The test is whether you can state the question precisely now", out-of-scope tickets closed and noted, and when the map clears, hand off to `to-spec`, never straight to implement (wayfinder SKILL.md:7 to 128; ask-matt:52 to 54). | fx-brainstorm §2: "Too large for one design? Help decompose into sub-projects... Each sub-project gets its own design → plan → implementation cycle." (fx-brainstorm:96 to 99). The decomposition lives in chat; nothing persists the order, the open questions or the decisions between sessions. | fx gap | The owner has used wayfinder on advantage-backend (`docs/agents/issue-tracker.md` has a full "Wayfinding operations" section mapped to `.scratch/<effort>/map.md`). Current work (launch readiness, business gap follow-ups) is that shape. Without a persisted map, the second sub-project starts from whatever survived compaction. | L. New reference `references/wayfinder.md` (reference tier, not a lane, so no new claimant), loaded by fx-brainstorm §2 when the effort is too big for one design **and** its pieces cannot yet be named precisely. Artifacts: `docs/plans/YYYY-MM-DD-<effort>/map.md` with the five upstream sections, and `decisions/NN-<slug>.md` each with `**Question:**`, `**Type:**` (research / prototype / grilling / task), `**Blocked by:**`, `**Status:** open / claimed / resolved`, and `## Answer`. Keep: decisions not deliverables, the fog-or-ticket test, one ticket per session except research, HITL tickets are never answered by the agent, refer by title not number, map is an index. Exit: when the map clears, fx-brainstorm writes one `design.md` per sub-project from the linked decisions. |
| W2 | (master) Research tickets: findings on a throwaway `research/<name>` branch, "Push the branch but open no PR" (wayfinder:115). | `research` procedure exists. | conflicts with owner rule | Pushing breaks "nothing leaves the machine". | Inside W1: research writes `docs/plans/<effort>/research/<slug>.md` locally; no branch, no push. |
| W3 | (master) Resolve a ticket "as the type its `wayfinder:<type>` label names. Read the label, not just the body" (wayfinder:124); no triage label on map tickets (wayfinder:65). | n/a | adopt within W1 | Same failure locally: a session reads the question and grills when the ticket was research. | Inside W1: `**Type:**` is required and the session acts by it; decision files never carry `ready-for-agent`. |
| W4 | (master) Write cross-references in the wiring pass "with real ids: a placeholder `#<n>` auto-links to an unrelated issue" (wayfinder:114). | n/a | not applicable locally | Files are numbered before wiring. | None. |

### 2.5 mattpocock `ask-matt` (planning parts)

| # | Upstream says | fx says | Verdict | Why it matters | Proposed change |
|---|---|---|---|---|---|
| A1 | A router over every skill (ask-matt SKILL.md:1 to 97). | No router; lane descriptions are trigger lists and lanes route to each other (`fx-plan` "No approved design → fx-brainstorm"); one claimant per intent (design.md §1). | fx better | A router is a second claimant for every intent. | None. |
| A2 | (master) "Before stating what a skill does or recommending a step be skipped, read that skill's SKILL.md" (ask-matt:11). | PREAMBLE: invoke a lane, never `Read` its SKILL.md instead. | equivalent | Both stop acting from a summary. | None. |
| A3 | **Context hygiene**: keep grill, spec and tickets "in one unbroken context window (don't compact or clear until after `/to-tickets`)"; PHASE-BOUNDARIES:21: continue when "the next phase needs this phase as a primary source". Smart zone about 150k tokens. | fx-plan relies on `design.md` and the `**Approved:**` line surviving compaction (fx-plan:35 to 38); says nothing about planning in the same session. | upstream better (minor) | The brainstorm conversation holds the rejected alternatives and the reasons, which design.md summarises. A plan written from design.md alone loses them, and that is where drift starts. | S. fx-plan §1, one line: "Plan in the session that wrote the design while it has room; design.md is the fallback after compaction, not the preference." |
| A4 | Phase-boundary tree: continue, `/clear`, `/handoff` (only for a new harness, directory or colleague), subagent, `/compact` last (PHASE-BOUNDARIES:17 to 40). | `/fx:fx-handoff` asks where the work is going, not whether a handoff is needed (fx-handoff.md:18 to 31). | upstream better (cross-area) | A handoff inside the same repo and harness replaces a primary source with a lossy summary for nothing. | S (cross-area, `commands/fx-handoff.md`): before "Ask first", add: "Same repo, same harness, and the next phase needs this one: continue or compact instead. Hand off only when the work leaves this machine, harness or person." |
| A5 | (1.3.x) `/retro` closes the main flow, run in the session it looks back on (ask-matt:34, 38). | No retro yet; owner has decided to adopt it. | already decided | | Cross-area: the retro work should hook the `fx-implement` completion report; fx-plan needs no change. |

### 2.6 fx-internal defects found while comparing

| # | Where | Problem | Change |
|---|---|---|---|
| X1 | `skills/fx-plan/COVERAGE.md` rows "4 to 5" and "16 to 18" | Claim "Audience: zero context, questionable taste: restored" and "doesn't know good test design: restored", but SKILL.md:21 to 29 dropped both and `plan-template.test.js:43` asserts "questionable taste" is absent (ADR 0043). COVERAGE row 83 to 84 and 96 also still say "test code yes", superseded by ADR 0043. | S. Mark those rows S with "ADR 0043: reader is skilled and drives tests through fx-tdd; Tests field in prose". Add a section for writing-plans v6.4.1/6.4.2 and mattpocock master deltas with the verdicts from this file. |
| X2 | fx-plan:76 to 77 and 87 to 88 | The prefactoring sentence appears twice in §4. | S. Delete the second (part of C1). |

## 3. Ideas fx has that upstream lacks (keep them)

- Restate-requirements gate, skipped only when design.md carries `**Approved:**` with a real date, so the skip survives compaction (fx-plan:33 to 46).
- `**Idempotency:**` required for any task that mutates state outside git, because a resumed run re-executes tasks (fx-plan:332 to 336).
- `**Design:**` and `**Stack:**` lines that `compile-brief` turns into the implementer's brief (fx-plan:295 to 300, ADR 0042/0043).
- Acceptance-criteria rules learned from incidents: reachability by following the link, the form's own action and method, criteria for the success path and not only guards (fx-plan:344 to 363, COVERAGE.md:131 to 152).
- Commit by explicit path, never `-A` (fx-plan:401 to 407).
- Red-team recommendation by risk (High complexity, HIGH risk, wide refactor, irreversible data, auth or payment), not by task count; plan mode adds the design-to-plan cross-reference for drift and scope creep; code mode is deliberately unprimed (fx-devils-advocate.md).
- After red-team findings, re-run the coverage walk over what changed and name the task that owns each half of a changed requirement (fx-plan:207 to 212).
- Four-way handoff with Keep discussing and Save for later (parked line in `state.md`).
- Phasing above 10 tasks into MVP / Core / Hardening / Polish, each mergeable alone.
- Error-contract and request-spec-type red flags; a gate test that pins the template (`tests/gates/plan-template.test.js`).
- Standing rulings in one repo file read at every session start (ADR 0035).

## 4. Top recommendations (ranked)

1. Move both templates out of `fx-plan/SKILL.md` into `skills/fx-plan/templates.md` and add a 20,000-byte gate to `scripts/check-all`; nothing else here fits until this lands (C1).
2. Add a Review Focus section to plan.md and self-review check 5, handed to reviewers with Global Constraints (P3).
3. Adopt upstream's reader framing ("what they cannot know is what you decided") and forbid scratch builds while planning (P1, P2).
4. Add `references/wayfinder.md`, loaded from fx-brainstorm §2, with a local `map.md` plus `decisions/` and no branch pushes (W1 to W3).
5. Give fx-devils-advocate plan mode a Buildability check from the implementer's seat (P11).
6. Tag red-team findings `[blocks]` or `[advisory]`; unattended revisions apply only `[blocks]` (P12).
7. Add an optional `**Not this task:**` line and a red flag that a split requirement names the owner of each half (TR5).
8. Recheck paths and signatures when a parked plan resumes (T4).
9. Add an already-built check to fx-brainstorm §2, and record rejected requests as "Not doing:" ADRs (TR2, TR3).
10. Fix stale text: `CONTEXT.md` to `GLOSSARY.md` in fx-plan and design-template, and COVERAGE rows that contradict ADR 0043 (T2, X1); after the nested controller lands, give §8 option 1 a reasoned mode recommendation (P7).

## Not checked

- v6.3.0 `writing-plans/SKILL.md` lines 61 to 171 were read through the full diff with context, not as a standalone file; unchanged lines match HEAD.
- No fx gate or test was run; byte counts come from `wc -c`.
- Whether `fx-implement` and `fx-review` can carry a Review Focus block without their own size changes was not measured (`fx-implement` is already 49,175 bytes).
- Open question for the owner (TR1): advantage-backend runs two trackers (`.scratch/` from mattpocock setup and `docs/plans/` from fx).
