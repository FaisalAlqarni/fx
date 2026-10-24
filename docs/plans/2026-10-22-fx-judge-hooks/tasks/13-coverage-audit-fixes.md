# 13: Coverage audit fixes

**Status:** ready-for-agent
**Blocked by:** 12
**Phase:** Polish

**What to build:** the pre-final-review coverage audit (`findings/coverage-audit.md`) found design commitments no task carried and records that went stale after later rulings. This task closes the ones that can be closed on this machine without a live model session: measure the Codex PostToolUse result shape from the installed Codex schemas, run the calibration with the state the guard really sends, bring ADR 0047, the design and the harness references in line with the rulings, prune journals on opencode, document the fail-closed fx-state refusal and the headless ask behaviour, add the missing positive and Codex test cases, and refresh the plan's exported-symbols table. The Claude failing-Bash payload needs a live `claude -p` run and stays an owner item.

**Design:** Implementation Decisions > 3; Implementation Decisions > 5; Implementation Decisions > 7; Implementation Decisions > 8; Implementation Decisions > 13

**Files:**
- Modify: `references/harnesses/codex.md` (PostToolUse `tool_response` shape, read read-only from the installed Codex 0.164.0 schemas, the same source task 09 used; say where it was read)
- Modify: `src/lib/tool-events.ts` and its test, only if the measured Codex shape differs from what it parses
- Modify: `src/scripts/guard-calibrate.ts` (send the state `guardShell` builds: `command`, `cwd`, `harness`, optional `user_request`, through the same builder, not a copy)
- Modify: `docs/adr/0047-*.md` (the state sentence; the recalibrated table; no stamp on opencode 1.x or 2.x and why; opencode 2.x code rules only; the fail-closed fx-state write refusal and why it is the second fail-closed guard; headless `claude -p` resolves an ask like a deny)
- Modify: `docs/plans/2026-10-22-fx-judge-hooks/design.md` (a dated "amended by ledger ruling" note on decision 5 and story 8)
- Modify: `references/harnesses/claude-code.md` (headless ask line; the failing-Bash signal stays marked as docs-sourced), `references/harnesses/opencode.md` and `references/harnesses/opencode-v2.md` (passive-stall is not root-only on opencode)
- Modify: `INSTALL.md` (one line each: the fx-state refusal; headless ask)
- Modify: `src/plugins/fx-opencode-v1.ts`, `src/plugins/fx-opencode-v2.ts` (prune journals once per plugin construction)
- Modify: tests: opencode prune per major; Codex SubagentStop block; Codex read-only subagent gets no nudge; a judged grey command on Claude Code allowed on run and asked on ask (task 03 gate); `judge-cli write` then a `fx-pretooluse` grey call reaches the written judge (task 11 gate)
- Modify: `docs/plans/2026-10-22-fx-judge-hooks/tasks/12-no-rm-in-shell-c-strings.md` (reword its permission-prompt criterion to what the gate proves)
- Modify: `docs/plans/2026-10-22-fx-judge-hooks/plan.md` (exported-symbols table from the shipped exports)

**Seam:** harness references and ADR as text; plugins and hooks as processes; the calibration script against the local judge.

**Tests:**
- opencode 1.x and 2.x: construct the plugin with an 8-day-old and a 1-day-old journal under the scratch state dir; the old one is gone, the new one stays.
- Codex: SubagentStop with `agent_id` after an `apply_patch` edit and no check blocks once; an `fx-lens-security` subagent with three failures prints nothing.
- Claude Code: with a fake judge answering run, a grey command is allowed with one request; answering ask, the output is Claude Code's ask form.
- judge-cli: `write` against the fake server, then one `fx-pretooluse` grey call; the fake records one request.
- Calibration: run `guard-calibrate` against the local judge at `http://127.0.0.1:11434` with `nimble:9b` if it answers, else the mock backend, and say which; the ADR table and its state sentence match that run. Deny-labelled commands let run with no prompt must stay at most 2 of 11 (ruling); if not, stop and report BLOCKED with the numbers.
- Existing gates and `scripts/check-prose` on every touched Markdown file pass.

**Risks:** the calibration sends only the calibration set's command strings to a loopback judge; nothing leaves the machine and nothing is executed. Reading the Codex schemas is read-only under the owner's home; never write, copy into, execute or delete there. A Codex shape that differs from today's parser changes task 08's outcomes; keep every existing tool-events test passing or explain each change.

## Acceptance criteria
- [ ] `references/harnesses/codex.md` records the PostToolUse `tool_response` shape with its source, and the parser matches it.
- [ ] ADR 0047's calibration was measured with the state `guardShell` sends, and the ADR states every ruling it was missing.
- [ ] Journals older than seven days are pruned on both opencode majors.
- [ ] The fx-state refusal, the headless ask behaviour and the opencode passive-stall limit are written down where users and maintainers look.
- [ ] The positive judge path and the Codex SubagentStop and read-only cases each have a test.
- [ ] `scripts/check-all` prints `ALL GREEN` through test_scope.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Measure the Codex shape; write the failing tests; run them (RED)**
- [ ] **3. Implement, recalibrate, update the docs**
- [ ] **4. Run the tests and gates (GREEN)**
- [ ] **5. Commit**
