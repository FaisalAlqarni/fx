# Multi-harness fx: implementation plan

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
**Goal:** Ship fx to Claude Code, opencode and Codex through each runtime's own
marketplace or plugin loader, with every guarantee proven on every runtime.
**Architecture:** One source in this repository. One preamble rendered per
runtime by a shared function with three injectors. One git guard shared
verbatim. Lens roles authored in the Claude Code dialect, generated into the
Codex dialect, converted at runtime for opencode. Provisioning has one
implementation and three callers: hook, setup lane, installer script.
**Stack:** node (no dependencies), bash, JSON, TOML, markdown.
**Complexity:** High
**Risks:**
- HIGH: Codex read-only enforcement rests on agent identity. Mitigation: the
  hook records identity at `SubagentStart`, where the field is documented, and
  refuses any subagent it cannot classify. It fails closed, so a runtime change
  breaks loudly rather than silently downgrading to prose.
- HIGH: Codex skips plugin hooks until trusted, so a fresh install has no
  preamble and no guard. Mitigation: `fx-setup` plants and reports; install
  docs state the trust step; conformance row settles whether trust is needed.
- MEDIUM: opencode's agent-registration surface is partly experimental.
  Mitigation: `scripts/fx-opencode-install` is kept as the fallback path.
- MEDIUM: Codex drops symlinks on install. Mitigation: gate forbids symlinks in
  shipped paths; this repo has none today.
- MEDIUM: fx's lane check may or may not have been running. Mitigation: task 03
  measures it before anything depends on it.

**Testing:** Unit: the preamble renderer and the role planter, at the existing
`lib/*.test.js` seam. Integration: install artifact shape, extended from the
existing opencode install test, free to run. E2E: `tests/conformance/run.sh`,
seventeen guarantees on three real CLIs. Its free rows run in `check-all`; its
behavioural rows spend quota and never do.

## Global Constraints

- Claude Code 2.1.278 or later; opencode 1.18.25 or later; Codex CLI 0.155.1 or
  later. Every claim was measured against these.
- No new runtime dependencies. fx ships node and shell only.
- `lib/git-guard.js` is not modified by this work, except the heredoc fix in amendment A7.
- Nothing is added above the opening imperative of `PREAMBLE.md`. The
  imperative section, from its heading through the paragraph binding
  subagents, stays whole, concrete and inline; only names are substituted per
  runtime. Outside it, the routing table and the non-negotiables stay inline.
  Other detail may move to a lane file only when the lane that needs it loads
  that file at the moment the detail applies, and the rendered preamble with
  its appended blocks stays one Claude Code part under 9,000 characters.
- Skills name actions, never tools. A skill body naming a runtime's tool is a
  defect.
- No symlinks inside anything shipped to a runtime that copies plugin trees.
- Every script invocation in a skill names its interpreter.
- **Superseded by amendment A1.** The Codex manifest declares `"hooks": "./hooks.json"`. Formerly: the Codex manifest declares no `hooks` key; hooks ship as a file at the
  plugin root.
- Manifest versions and marketplace entry versions stay identical.
- Derived artifacts carry a generated-file header naming their source, and a
  gate fails on drift.
- An install finding fx already present in a second skills pool warns and names
  the remediation. It never refuses: a working install keeps working.
- Behavioural conformance never runs inside the free gate.
- A guarantee resting on an undocumented field carries a conformance row.
- Measure against the installed plugin, or point the run at the working tree.
- Writes into a user's runtime home are confined to names fx generates, listed
  explicitly rather than matched by prefix, and are idempotent.
- Provisioning has one implementation; the hook, the setup lane and the
  installer are callers of it, never reimplementations.
- No attribution trailers in commits.

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | Render the preamble per harness | none | One renderer, placeholders, Claude Code green | MVP |
| 02 | The harness knowledge layer | none | Three reference files; skills carry no tool names | MVP |
| 03 | Correct the gates and the false comment | none | check-manifest fixed, lane check measured, interpreter gate | MVP |
| 04 | Codex plugin, marketplace, preamble | 01 | fx installs on Codex; preamble in session and subagent | MVP |
| 05 | The git guard on Codex | 04 | Guard refuses on Codex, session and subagent | MVP |
| 06 | Read-only agents on Codex | 04, 05 | Roles generated, planted, enforced fail-closed | Core |
| 07 | Hide the audit lane; commands as skills | 02, 04 | Audit never auto-selected; commands reachable on Codex | Core |
| 08 | The opencode plugin, corrected | 01, 06 | Skills, agents, depth, lane check, plan-state, audit deny | Core |
| 09 | Installer and install-shape tests | 06, 07, 08 | Fallback path works; artifact shape gated free | Hardening |
| 10 | Setup reports what did not land | 06, 09 | fx-setup verifies roles, staleness and hook trust | Hardening |
| 11 | Conformance runner and the free rows | 03, 05, 06, 07, 08, 09, 10 | A runner that dispatches, and every free row green | Hardening |
| 12 | The behavioural conformance rows | 11 | 17 guarantees proven live on 3 runtimes | Hardening |
| 14 | Codex loads its own hooks, with output Codex accepts | none | Manifest hooks key; no fail-open output; no truncation; read-only agents cannot spawn or call MCP | Amendment |
| 15 | The preamble reaches Claude Code whole | none | Preamble split under the 10,000-char per-hook limit; handler 3 carries any overflow | Amendment |
| 16 | Codex roles are dispatchable | 14, 15 | Restart notice in systemMessage, fx-setup plants, agent_type wording in the preamble, roles planted before the first live session, row 18, Codex depth ruled | Amendment |
| 17 | Read-only agents cannot write, on every runtime | none | No shell on Claude Code and opencode; shell kept and classified on Codex; row 12 probes shell writes; reviewers get a diff file | Amendment |
| 18 | opencode subagents can dispatch a subagent | 17 | permission.task for general, denied to read-only; row 15 names general | Amendment |
| 19 | Three small defects the live rows found | none | Dead tests run; install test out of HOME; heredoc guard for any shell in the pipeline | Amendment |
| 20 | Nightly conformance against the real CLIs | none | Floor and latest CLIs, free rows, no secrets | Amendment |
| 21 | Live matrix on Claude Code and opencode | 14, 15, 16, 17, 18, 19 | Amended guarantees proven live on two runtimes; preamble part order measured | Amendment |
| 22 | Live matrix on Codex, the merge gate | 13, 14, 16, 17, 19 | Codex proven live after the 2026-10-21 quota reset, trust path included; docs carry the result | Amendment |
| 23 | opencode's plugin-only route works | none | Commands registered; config reaches sessions (PD1, PD2) | Amendment |
| 24 | The preamble fits one hook | 15 | One part under 9KB, per-harness filtering, detail on demand (PD3) | Amendment |
| 13 | Install and surface documentation | 12, 14, 15, 16, 17, 18, 19, 20, 21 | Three install paths documented and accurate | Polish |

**Amendment edges.** Tasks 14 to 22 come from the design amendment of
2026-09-21.
- 16 needs 14, because the notice travels through `fx-codex.js`, which only
  runs on Codex once 14 lands, and it extends 14's output contract and test.
- 16 needs 15, because both edit `lib/preamble.js`: 15 adds `renderParts`, 16
  adds the Codex dispatch placeholder to `ADDRESSING`.
- 18 needs 17, because both edit the opencode read-only agent permissions.
- 17 has no real dependency on 14, so it starts immediately. It pins its role
  shape checks in `lib/plant-roles.test.js`, not in 14's
  `tests/gates/codex-manifest.test.js`.
- 21 needs every product fix.
- 22 needs 14, 16, 17 and 19, the fixes its Codex rows exercise, and it is
  blocked by date as well. It does not wait for 21 directly, which covers the
  other two runtimes.
- 13 needs 21, because it documents measured results only.
- 22 needs 13, because both edit `INSTALL.md`, `SURFACE.md` and ADR 0019, and
  22's measured Codex result must be the last word there: run the other way,
  13 would rewrite it back to "pending".

**Merge gate.** The branch merges only when rows 01, 02, 12, 15, 16 and 18
PASS on Claude Code and opencode in task 21, and every live Codex row PASSes
or is a GAP a ledger ruling accepted in task 22. A product defect either task
measures opens a new numbered task.

Shared files with no edge between their editors: 14, 16, 19 and 20 each
append one line to `scripts/check-all`, each beside a named neighbour, so the
merges are trivial. 16 and 17 both edit conformance test files, but different
ones: 16 edits `tests/conformance/lib/live.sh` and creates row 18, 17 edits
row 12. 18 edits row 15's opencode prompt, and 16 edits its Codex branch only
if its depth research rules a GAP. 22 edits `live.sh` again for the trust
knob, after 16. Implementers run serially in any case.

**Edges are dependencies, not preferences.** 04 consumes the renderer from 01 and
nothing from 02. 08 consumes the renderer from 01 and the read-only agent set
from 06. 07 lands five new skills into the pool 02's gate
scans, so it waits for that gate. 09 rewrites `fx-setup`, which 07 creates. 11
appends to the `state.md` that 03 creates.
