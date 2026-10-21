# Current system: 2026-10-21-audit-fx

**Date:** 2026-10-21
**Phase:** 1 of 4
**Sources:**
- runtime: PREAMBLE.md, lib/preamble.js, index.js, hooks.json, hooks/, plugins/, lib/{lane-check,dispatch-route,plan-state,agent-dialects,user-invoked-lanes}.js, .claude-plugin/, .codex-plugin/, .agents/, package.json, docs/adr titles
- brainstorm-design: skills/fx-brainstorm/, skills/fx-design/, skills/fx-grill/, skills/fx-critique/, commands/fx-grill.md, commands/fx-critique.md, agents/fx-devils-advocate.md, references/design-template.md, references/vocab/{grilling,domain-modeling,codebase-design}.md, references/stacks/web*.md
- plan: skills/fx-plan/, lib/plan-state.js, docs/plans/{2026-09-29-lean-review,2026-10-01-opencode-v2,2026-09-23-lean-build,2026-09-21-multi-harness}/
- implement: skills/fx-implement/, skills/fx-tdd/, references/vocab/{model-selection,worktree-setup,verification}.md, references/harnesses/, scripts/build-cost, ledgers and runs/ of lean-review, opencode-v2, lean-build
- review-roster: skills/fx-review/, agents/, codex/, skills/{fx-architecture,fx-debug,fx-authoring,fx-humanize,fx-audit,fx-handoff,fx-setup,prototype,research}/, commands/{fx-handoff,fx-setup}.md, references/ (all, sized)
- infra: lib/{git-guard,plant-roles,opencode-commands,opencode-v2-policies}.js and tests, scripts/, tests/, docs/, tasks/, README.md, INSTALL.md, SURFACE.md, AGENTS.md
- real-cost (outside the scope, read as evidence): 10 fx plan directories in /development/{advantage-backend,expenses,nov2026}/docs/plans/, their git history, and token/turn counts from ~/.claude/projects/*/*.jsonl (numbers only)
**Scope:** .
**Against:** none

## Domain model and glossary

No `CONTEXT.md` exists; terms are the code's own.

- **lane**: a skill the model must invoke through the Skill tool; "Invoking a lane is not optional" (PREAMBLE.md:12-22). 17 lanes under `skills/`.
- **preamble / bootstrap**: PREAMBLE.md rendered per harness by `render()` (lib/preamble.js:96) and injected on SessionStart and SubagentStart (hooks/hooks.json:3-27).
- **harness**: `claude-code`, `opencode`, `codex`, `opencode-v2` (lib/preamble.js:22).
- **user-invoked lanes**: fx-audit, fx-critique, fx-grill, fx-handoff, fx-setup, `disable-model-invocation: true` (lib/user-invoked-lanes.js:6).
- **path (spike / bounded / architectural)**: fx-brainstorm's size classes, announced before the first question (skills/fx-brainstorm/SKILL.md:24-47).
- **HARD-GATE**: no implementation before explicit approval (skills/fx-brainstorm/SKILL.md:17-22).
- **confidence check**: 95% bar message and stop before approaches (skills/fx-brainstorm/SKILL.md:163-174; docs/adr/0033).
- **design doc**: `docs/plans/YYYY-MM-DD-<slug>/design.md` from references/design-template.md (skills/fx-brainstorm/SKILL.md:300-309).
- **plan directory / task / tracer bullet**: `plan.md` plus `tasks/NN-*.md`, one vertical slice per task (skills/fx-plan/SKILL.md:74-76, 139-144).
- **ledger**: `docs/plans/<slug>/state.md`, append-only, written by fx-implement (skills/fx-implement/SKILL.md:287-319).
- **Ruling / standing rulings**: `Ruling:` lines, repo file `docs/plans/rulings.md` (lib/plan-state.js:81-95; ADR 0035).
- **controller / implementer / task reviewer / re-reviewer**: the fx-implement session and its per-task subagents (skills/fx-implement/SKILL.md:392; implementer-prompt.md:1; task-reviewer-prompt.md:1; re-review-prompt.md:1).
- **lens / tripwire**: read-only review agent; per-task lenses fire only on a tripwire match (skills/fx-review/SKILL.md:98-108; ADR 0029).
- **fix round / five-round cap / controller re-review**: skills/fx-implement/fix-loop.md:35-36, 90-112; ADR 0030.
- **exit gate**: `test_all` once at the end (skills/fx-implement/SKILL.md:238-244, 727-822).
- **test_one / test_scope / test_all / setup**: `.fx.json` command keys (.fx.json:3-6).
- **tier (cheapest / standard / most capable), `Capable because:`**: references/vocab/model-selection.md:9-36; enforced by `route()` (lib/dispatch-route.js:17-25; ADR 0031).
- **review package**: one diff file made by scripts/review-package (skills/fx-review/SKILL.md:54-61).
- **branch mode / task mode**: fx-review's two modes (skills/fx-review/SKILL.md:18-24).

## End-to-end flow

1. Session start: SessionStart and SubagentStart run hooks/fx-context.js, which injects the rendered preamble (about 3.2k chars) into the session and into every subagent; sessions also get the unfinished-plans block (hooks/hooks.json:3-27; lib/preamble.js:115-127).
2. Every tool call spawns `node hooks/fx-pretooluse.js` (matcher `*`): Bash goes to the git guard, code writes to laneCheck, Agent/Task to `route()`; other tools exit 0 (hooks/hooks.json:28-39; hooks/fx-pretooluse.js:56,70-113).
3. The "1% chance" rule makes the model load a lane's whole SKILL.md before any response (PREAMBLE.md:14-17).
4. fx-brainstorm (architectural path): classify, explore, interview rounds of 2 to 4 questions, confidence check and stop, 2 to 3 approaches and stop, design in five sections with approval after each, seams confirmation, write design.md, self-review, user review of the doc, hand off to fx-plan only (skills/fx-brainstorm/SKILL.md:24-49, 105-113, 163-174, 239-254, 290-340).
5. fx-plan: restate requirements and wait, map files, draft slices, write plan.md and one file per task (test code written out in full), self-review, red-team recommendation, four-way handoff question; optional fx-devils-advocate on opus with its own gate (skills/fx-plan/SKILL.md:33-41, 137-209, 409-421; agents/fx-devils-advocate.md:14).
6. fx-implement: worktree, ledger, pre-flight conflict scan; then per task, serially: implementer subagent (invokes fx-tdd), task reviewer plus 0 to 3 tripwire lenses, fix rounds with re-review up to five; then coverage audit, fx-review branch mode on the most capable model with every lens and the devil's advocate, one fix wave, exit gate `test_all` (skills/fx-implement/SKILL.md:201-351, 365-648, 661-822; fix-loop.md:35-56).

## Feature and business-rule inventory

Runtime
1. Preamble injected into every session and subagent, about 800 tokens, capped at 9,000 chars (hooks/hooks.json:16-27; hooks/fx-context.js:9-14).
2. "Invoke a lane at 1% chance, before any response" (PREAMBLE.md:14-17).
3. PreToolUse hook on every tool call, one Node spawn each, about 18 ms (hooks/hooks.json:28-39).
4. Model routing: unmarked dispatches forced to sonnet; `fx:` agents exempt (lib/dispatch-route.js:17-25).
5. laneCheck: denies the first code write with no design and the first test written after its implementation, once per repo (lib/lane-check.js:59-113).
6. Unfinished-plans block names up to 3 plans and 10 rulings (lib/plan-state.js:27,62-63,107).
7. Four harness front ends re-implement guard and lane routing (hooks/fx-pretooluse.js; hooks/fx-codex.js; plugins/fx-opencode-v1.js; plugins/fx-opencode-v2.js).
8. index.js spawns `opencode --version` on every load (index.js:25-37).

Brainstorm and design
9. HARD-GATE on every path (skills/fx-brainstorm/SKILL.md:17-22).
10. One task-tool item per checklist step, 10 for architectural (skills/fx-brainstorm/SKILL.md:49,67-78).
11. Interview rounds of 2 to 4 questions with an open-questions ledger restated each round (skills/fx-brainstorm/SKILL.md:110,124-141).
12. Confidence check as its own stopping message (skills/fx-brainstorm/SKILL.md:163-174).
13. Approaches, then design in five sections, approval after each (skills/fx-brainstorm/SKILL.md:239-254).
14. Seams confirmation (skills/fx-brainstorm/SKILL.md:290-298).
15. design.md with an "extremely extensive" user-story list (references/design-template.md:28-36).
16. Self-review with optional fx-humanize load, then user doc review (skills/fx-brainstorm/SKILL.md:313-337).
17. Brainstorm hands off only to fx-plan; no design skill after it (skills/fx-brainstorm/SKILL.md:80-83,340).
18. Visual companion offered just in time; loads 14.9 KB and runs a local server (skills/fx-brainstorm/SKILL.md:182-218; visual-companion.md).
19. fx-design: token plan, build, self-critique; no handoff to fx-plan (skills/fx-design/SKILL.md:41-58,183-191).

Plan
20. Restate requirements and wait (skills/fx-plan/SKILL.md:33-41).
21. Task template with 11 fields and 6 steps (skills/fx-plan/SKILL.md:285-391).
22. Test code written out in full in tasks; implementation not (skills/fx-plan/SKILL.md:409-421).
23. "Similar to task N: repeat it" no-placeholder rule (skills/fx-plan/SKILL.md:431).
24. Red-team recommended YES at 10+ tasks among other triggers (skills/fx-plan/SKILL.md:161-170).
25. Four-way handoff menu, "do not default to option 1" (skills/fx-plan/SKILL.md:172-186).
26. Phasing above 10 tasks (skills/fx-plan/SKILL.md:126-135).

Implement
27. Serial implementers unless `isolated_test_execution` (skills/fx-implement/SKILL.md:386-390).
28. Reviews may run beside the next implementer (skills/fx-implement/SKILL.md:145-153).
29. Implementer invokes fx-tdd, which loads good-tests.md (skills/fx-implement/implementer-prompt.md:47-50; skills/fx-tdd/SKILL.md:105,136).
30. Task review mandatory per task (skills/fx-implement/SKILL.md:516-519).
31. Tripwire lenses per task (skills/fx-implement/SKILL.md:532-543).
32. Task reviewer reads the whole ledger for `Ruling:` lines (skills/fx-implement/task-reviewer-prompt.md:29-31).
33. Fix loop capped at five rounds; rounds 4-5 on the most capable tier (skills/fx-implement/fix-loop.md:35-56).
34. Controller re-review for small fixes (skills/fx-implement/fix-loop.md:90-102).
35. Coverage audit agent, then branch review with all lenses and the devil's advocate, one fix wave (skills/fx-implement/SKILL.md:661-725).
36. `test_all` once at the exit gate; failing tests classified against the merge base in a second worktree (skills/fx-implement/SKILL.md:238-244,777-783).
37. Five-line reply contract for every subagent (skills/fx-implement/implementer-prompt.md:356; SKILL.md:392-424).

Review and roster
38. fx-review mandatory after every task and at the end (skills/fx-review/SKILL.md:26-27).
39. Branch pass: up to 10 parallel subagents, braked only by prose (skills/fx-review/SKILL.md:72-105,195-205).
40. fx-lens-security and fx-devils-advocate pinned to opus in frontmatter (agents/fx-lens-security.md:15; agents/fx-devils-advocate.md:14).
41. 17 skill descriptions (6,026 chars) and 6 agent descriptions (3,642 chars) listed every session (skills/*/SKILL.md, agents/*.md frontmatter).

Infra
42. `test_scope` in this repo runs every tests/gates/*.test.js on any .md change and falls back to check-all for deleted, git-guard or unclassified paths (scripts/test-scope:34-47,66).
43. check-all: 64 sequential gates including 4 installs (scripts/check-all:26-117).
44. scripts/build-cost measures a build from its transcript; nothing in the lanes calls it (scripts/build-cost:3-8).

Measured cost (evidence)
45. Six-task fixture builds: 33 to 56 min, 17.9M to 29M tokens; one implementer dispatch about 1.0M tokens (docs/plans/2026-09-23-lean-build/measurements.md:9,21; runs/*.json).
46. Real builds: implementer 57.5% of agent-minutes, fix rounds 13.3%, task review 8.6%, lenses 3.3% (docs/plans/2026-09-29-lean-review/design.md:20-28).
47. Multi-harness build: median context 503K, 347M tokens (docs/plans/2026-09-23-lean-build/design.md:19,295).
48. Across the user's six fx-lane sessions: 17.4G tokens, 99.4% cache reads; subagents 75% of tokens and 89% of turns; 1,823 subagents averaging 42.7 turns and 7.8M tokens each in the largest session (explore/01-real-cost.md, from ~/.claude/projects transcripts).
49. Ten recent plans: 102 tasks averaging 8.5 KB, design.md 17 to 48 KB; 5 to 13-task plans span 25 to 70 h of git time (/development/advantage-backend/docs/plans/2026-10-1*/; explore/01-real-cost.md tables A and C).
50. Fix-round mentions about 2 to 2.8 per task on the two largest builds (/development/advantage-backend/docs/plans/2026-10-12-engagement-dashboard-v2/state.md; 2026-10-12-db-load-program/state.md).

## Patterns and file structure

One text source rendered per harness (lib/preamble.js:100-107; ADR 0020). Each lane is one SKILL.md plus sibling reference files, loaded by path instruction in prose (skills/fx-brainstorm/SKILL.md:158,275); skills stand alone and repeat rather than share (ADR 0006). Dispatch prompts are templates the controller fills (skills/fx-implement/SKILL.md:470-476). Every subagent returns a file plus a five-line reply (skills/fx-implement/SKILL.md:392-424). Commands are the source of the user-invoked skills, generated by scripts/gen-command-skills; codex/agents/*.toml are generated from agents/*.md (ADR 0028). A new lane is a new `skills/<name>/SKILL.md` plus a lane-triggering prompt in tests/lane-triggering/prompts/.

**Modules:**
- `skills/`: 17 lanes, SKILL.md bodies about 262 KB in total; fx-implement 46 KB, fx-humanize 32 KB, fx-authoring 21 KB, fx-plan 20 KB, fx-tdd 19 KB, fx-debug 19 KB, fx-brainstorm 17 KB; 9 COVERAGE.md files (70 KB) not loaded.
- `agents/`: 6 review and red-team agents (44 KB), model pins in frontmatter.
- `codex/`: generated .toml copies of agents/ (46 KB).
- `commands/`: 4 user slash commands, sources of the user-invoked skills (22 KB).
- `references/`: vocab, stacks, harnesses, templates (about 160 KB of prose) and vendored Mermaid/Tailwind JS (3.98 MB, copied into reports, not read).
- `hooks/`: fx-context.js, fx-pretooluse.js, fx-codex.js, hooks.json.
- `lib/`: preamble, lane-check, dispatch-route, plan-state, git-guard, plant-roles, agent-dialects, opencode adapters, plus tests.
- `plugins/`: opencode v1 and v2 front ends.
- `scripts/`: check-all and 10 check-* gates, generators, test-scope, build-cost, installer.
- `tests/`: gates, conformance, install, fixture-build, review-bench, lane-triggering, lens-pipeline, companion.
- `docs/`: 39 ADRs, 8 plan directories (3.5 MB).
- `tasks/`: lessons.md, todo.md (maintainer notes, not loaded).
- root files: PREAMBLE.md, index.js, hooks.json, package.json, .fx.json, README.md, INSTALL.md, SURFACE.md, AGENTS.md, LICENSE; manifests in .claude-plugin/, .codex-plugin/, .agents/.

## What the system does well

- The always-on text is small and has a tested ceiling: about 800 tokens (hooks/fx-context.js:9-14), and the plans block is skipped for subagents (lib/preamble.js:118-121).
- Hooks are cheap: about 18 ms per PreToolUse call (explore/01-runtime.md, timed locally); fail open on advice, fail closed on the git guard (hooks/fx-pretooluse.js:15-18).
- Test scoping is real: `test_one` per cycle, `test_scope` before commit, `test_all` once; 6 full runs against about 3,300 scoped runs (skills/fx-implement/SKILL.md:238-244; docs/plans/2026-09-29-lean-review/design.md:35-36).
- Controller context stays small: file out, five lines back, diff passed as a file (skills/fx-implement/SKILL.md:392-424; scripts/review-package:3-6); growth 6 to 8K per task (docs/plans/2026-09-23-lean-build/measurements.md).
- Model routing is enforced by a hook, defaulting to the standard tier (lib/dispatch-route.js:17-25).
- Per-task lenses only on tripwire; unprimed pass once per branch (skills/fx-review/SKILL.md:89-108; ADR 0029).
- Changes are measured and honest about noise; an unproven speed-up (parallel tasks, 6% against a 15% bar) was dropped (docs/plans/2026-09-23-lean-build/measurements.md:27,36).
- Brainstorm scales its gates by path: a spike is one nod, bounded has no document (skills/fx-brainstorm/SKILL.md:29-56).

## What the system does badly

- **Subagents carry the cost.** 75% of tokens and 89% of turns are inside subagents; each implementer reads 55 to 70 KB before its task (template 18.6 KB, fx-tdd 18.9 KB, good-tests 16 KB, stack files) and costs about 1.0M tokens (skills/fx-implement/implementer-prompt.md; skills/fx-tdd/SKILL.md:105,136; explore/01-real-cost.md; docs/plans/2026-09-23-lean-build/runs/baseline-a-1.json).
- **TDD rules restated three times for the implementer**: summary in the template, the fx-tdd lane, the preamble (skills/fx-implement/implementer-prompt.md:47-50,86-109; PREAMBLE.md:31-35).
- **Incident prose loaded on every call**: about 30% of implementer-prompt.md (lines 170-283) and about 30% of fx-plan SKILL.md are "Measured:" case histories (skills/fx-implement/implementer-prompt.md:170-283; skills/fx-plan/SKILL.md:203-209,322-352,404-421).
- **Plans are large and many-tasked**: 11 to 28 tasks, 6.7 to 24 KB each, 41% test code in fences in one plan; every task becomes an implementer, a reviewer and often lenses and fix rounds (skills/fx-plan/SKILL.md:285-391,409-421; docs/plans/2026-09-29-lean-review/tasks/).
- **Red-team "optional" fires on every sampled plan** because "10+ tasks" is a trigger (skills/fx-plan/SKILL.md:166-168).
- **Brainstorm needs R+9 user stops before plan, plus 2 in plan**, and presents the design twice: in chat sections, then as design.md with an "extremely extensive" story list (skills/fx-brainstorm/SKILL.md:163-174,239-254,290-337; references/design-template.md:28-36; skills/fx-plan/SKILL.md:33-41).
- **Task reviewer reads the whole ledger** (20 to 100 KB) for a few `Ruling:` lines, which the controller is told never to do (skills/fx-implement/task-reviewer-prompt.md:29-31; skills/fx-implement/SKILL.md:397-398).
- **Serial chain per task**: implementer, review, fix, re-review; fix rounds about 2 to 2.8 per task on large builds (skills/fx-implement/SKILL.md:386-390; fix-loop.md:35; real ledgers).
- **Branch pass has no mechanical cap**: up to 10 agents, 3 on opus, re-reviewing code already reviewed per task (skills/fx-review/SKILL.md:72-105; agents/fx-lens-security.md:15).
- **Opus pins bypass the routing rule** (agents/fx-lens-security.md:15; agents/fx-devils-advocate.md:14; lib/dispatch-route.js:20).
- **No per-task cost record**: ledgers hold no tokens or durations and record about 1 in 12 dispatches; build-cost is never run by a lane (scripts/build-cost:3-8; explore/01-real-cost.md).
- **PreToolUse spawns Node on every tool call** including Read and Grep (hooks/hooks.json:28-39).
- **fx's own test_scope** runs all 20 gate tests on any .md edit, and check-all is 64 sequential gates (scripts/test-scope:45-47; scripts/check-all:26-117).
- **Version drift**: package.json 0.2.5 against manifests 0.2.6 (package.json:3; .claude-plugin/plugin.json:3).

## Areas not covered

- `.github/`: CI workflow, not assigned to an explorer; maintainer-only.
- `.vscode/`, `.repowise/`: editor and repowise tool files, not part of the plugin.
- `.claude/`: holds settings files the audit does not read and an empty CLAUDE.md stub.
- `.worktrees/`, `.fx/`: git-ignored working copies and scratch, not part of the scope's code.
- `LICENSE`: legal text, no behaviour.
- `/code-review` internals (a separate plugin called by fx-review): not in this repository.
- Per-task token attribution: transcripts mix plans and do not tag tasks; subagent-side fx-tdd invocations were not counted.
- Phase-by-phase cost of brainstorm, design and plan: no measurement exists in the repo or the ledgers.
