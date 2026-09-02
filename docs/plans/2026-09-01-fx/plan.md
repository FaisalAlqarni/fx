# fx: implementation plan (Plan 1 of 2: finish the build)

> **For agents:** implement task by task via `fx-implement`.
> Steps use `- [ ]` checkboxes.

**Design:** `./design.md`
**Goal:** turn the fx draft into a plugin that installs and runs on Claude Code and opencode.
**Architecture:** Restructure to the plugin layout first so every later file lands in its final home, then close the three review decisions, then add the missing agents and commands.
**Stack:** Markdown skills · Node (hooks, guard) · Claude Code plugin manifest · opencode plugin API.
**Complexity:** Medium
**Risks:**
- HIGH: 69 unanchored `references/…` paths break silently once installed: the lane keeps working, it just never loads the reference. Mitigated by task 01 anchoring them all and asserting zero bare paths remain.
- MEDIUM: `fx-lens-performance` is 455 upstream lines, possibly mostly React/bundle advice that does not apply. Mitigated by reading before adapting, with deletion an accepted outcome (task 06).
- MEDIUM: opencode's `experimental.chat.system.transform` may change. Mitigated by the documented `AGENTS.md` fallback; not re-litigated here.
- LOW: merging three references into one loses a distinction someone wanted. Mitigated by keeping every heading.

**Testing:** Unit: `lib/git-guard.test.js` (extended in 02). Integration: hook and plugin adapters exercised end to end. E2E: install on both runtimes (task 08). **Behavioural testing of the nine skills is Plan 2 and explicitly not here.**

## Global Constraints

- No attribution trailers anywhere: never `Co-Authored-By`, `Claude-Session`, or "Generated with".
- Commits only inside a git worktree. On the main checkout: no commit.
- Nothing leaves the machine unless the user initiates it.
- Every lane stays **under 500 lines**. Depth goes downward into `references/`, never sideways into a sibling skill.
- Every `description` is a **trigger list only**: never a workflow summary.
- **Exactly one claimant per intent.** No new skill may contest an existing lane.
- References are **leaves**: no reference may link to another reference.
- Ecosystem files carry no project facts: no repo names, ports, engines, or gem choices.
- Every agent file **pins its model explicitly**; an omitted model inherits the session's.
- Lens agents are read-only: `tools: Read, Grep, Glob, Bash`.

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | Plugin layout + anchored reference paths | none | fx installs; every `references/…` path resolves | MVP |
| 02 | `push` allowed from a worktree | 01 | D-A, with tests on both sides | MVP |
| 03 | Merge the reference cycle | 01 | D-C; leaf invariant true for the first time | MVP |
| 04 | Procedures: copy and wire | 01 | D-B; `prototype` actually called by `fx-brainstorm` | MVP |
| 05 | Four review lenses | 01 | database · security · a11y · silent-failure | MVP |
| 06 | Performance lens: read, then adapt or drop | 01 | a lens that applies to this stack, or a recorded decision not to ship one | MVP |
| 07 | Three commands | 01 | `/fx:critique` · `/fx:grill` · `/fx:level` | MVP |
| 08 | Install on both runtimes | 02,03,04,05,06,07 | verified working install, old plugins removed | MVP |

**Frontier:** 02 to 07 are independent of each other and all unblock together after
01. Only 08 waits on the rest.
