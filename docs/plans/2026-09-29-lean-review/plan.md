# Lean review: implementation plan

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
**Goal:** cut per-task agents and fix-round cost in fx-implement, and make its defaults hold without the owner repeating them.
**Architecture:** Mostly prose changes to skills, prompt templates and lens agents, each pinned by a small node gate test in the style of `tests/gates/return-contract.test.js`. Three code changes: a pure `lib/dispatch-route.js` called from `hooks/fx-pretooluse.js`, standing rulings in `lib/plan-state.js`, and a companions line in `lib/preamble.js`.
**Stack:** Node (plain `node:assert` scripts, no framework), Markdown skills and agents, Python generator `scripts/gen-codex-agents`, bash `scripts/check-all`.
**Complexity:** Medium
**Risks:**
- HIGH: the routing hook runs on every `Agent` call in every session with fx installed: it must never refuse, must pass the call unchanged on any error (task 03 tests a throwing and an unloadable module), and must leave forks and fx's own pinned agents alone. Whether Claude Code applies `updatedInput` without `permissionDecision` is settled by a live probe inside task 03, before later tasks build on it.
- MEDIUM: preamble size budgets (bootstrap under 3,000, worst case under 9,000 characters) with the companions line and standing rulings added: tasks 04 and 05 extend the worst-case fixture to prove it.
- MEDIUM: prose edits break text gates (`return-contract.test.js`, `check-prose`, `no-runtime-addressing`): every task runs them before committing.
- MEDIUM: OpenCode live rows need the local model server on `127.0.0.1:8899` and a standalone binary the conformance jail can see; task 10 records them as pending if the server is down, and nothing else waits on task 10.
- MEDIUM: the exit-gate classification must not let a new failing test pass as pre-existing: task 02 treats a test absent on the merge base as introduced and runs `setup` in the merge-base worktree.
**Testing:** Unit: `lib/dispatch-route`, `lib/plan-state`, `lib/preamble` · Gate: one text gate per prose task, added to `scripts/check-all` · Integration: the hook run as a process with JSON on stdin · Live: one Claude Code routing probe (task 03), OpenCode live conformance on 1.18.25 and 2.0.18 (task 10, non-blocking).

## Global Constraints

- Prose: no em or en dashes, no stock vocabulary; `scripts/check-prose <file>` passes on every edited Markdown file.
- No attribution trailers in any commit. Stage by path, never `git add -A` or `.`.
- Skill, agent and prompt-template edits go through the `fx-authoring` lane.
- A paragraph in a skill or agent never carries a runtime-addressed lane name (`fx:<lane>` or `$<lane>`): `tests/gates/no-runtime-addressing.test.js`.
- Keep every anchor `tests/gates/return-contract.test.js` requires: `**Lens dispatch.**` through `The reviewer gets three paths` (with `your Write tool`, no heredoc), `one coverage audit`, `confirmed ⚠️:`, `Reply with at most five lines:`, `## Ledger lines`, `findings file(s) as a whole`.
- Any edit to `agents/*.md` is followed by `scripts/gen-codex-agents` and a commit of the changed `codex/agents/*.toml`; `scripts/check-generated` passes.
- A new test file gets its own `run <name> <cmd>` line in `scripts/check-all`; nothing is globbed.
- Preamble budgets: bootstrap alone under 3,000 characters, worst-case render under 9,000, per runtime.
- Tripwire, fix-loop, routing and companions wording is copied verbatim from `design.md` §1, §3, §5a and §5c where the task quotes it.
- Model routing is Claude Code only. Codex and OpenCode routing is deferred (ADR-0031).
- ADR format: `docs/adr/NNNN-kebab-title.md`, an H1 that states the decision as a sentence, then prose. Numbers 0029 to 0034 are reserved for this plan.
- Locale: Arabic is the default locale, with RTL support throughout.
- `scripts/check-all` (the `test_all`) runs once, in task 11. Tasks run only the gates and tests they touch.

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | Per-task tripwires in the lens table | none | security, database, silent-failure fire per task only on a tripwire; a11y and pipeline at the end | MVP |
| 02 | Fix-loop controller re-review and one full test run | 01 | small fixes re-reviewed by the controller; no baseline `test_all`; exit-gate failure classification | MVP |
| 03 | Model routing hook on Claude Code | 02 | general dispatches default to Sonnet; Opus only with `Capable because:`; live probe | Core |
| 04 | Standing rulings survive plans and compaction | 03 | `docs/plans/rulings.md`, ledger copy, rulings in the session block | Core |
| 05 | Companion tools line in the preamble | 04 | conditional repowise, ponytail, caveman, fx-humanize line; `.fx.json` override | Core |
| 06 | Confidence check in fx-brainstorm | none | 95% check and 2-line plan before approaches | Core |
| 07 | Review prompt content | 03 | caller and variant sweep, fact re-read, test-constant drift, doc drift | Polish |
| 08 | Security lens checks | 03 | 8 per-diff checks, 2 branch-only checks, lens mode in fx-review's brief | Polish |
| 09 | Design polish reference and a11y lines | 07, 08 | `web-polish.md`, a11y lines, fx-design clause, ADR-0034, ADR-0012 amended | Polish |
| 10 | OpenCode checked on 1.18.25 and 2.0.18 | 05 | install and free rows once, live rows per version (pending if no server), `INSTALL.md` | Verify |
| 11 | README and the full gate | 01 to 09 | README cost section, diagram and routing evidence, `check-all` green | Verify |

Phases: MVP (01, 02) changes review shape and ships alone. Core (03 to 06) adds the mechanisms. Polish (07 to 09) absorbs external content. Verify (10, 11) measures and documents. Implementers run serially, so edges exist only where two tasks edit the same file or one consumes another's output.
