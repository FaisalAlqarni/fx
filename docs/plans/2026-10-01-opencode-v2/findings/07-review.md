### Spec Compliance

- ✅ Spec compliant for everything the diff can show. Every listed file has its hunk (run.sh, live.sh, events.js, README, check-all, rows 03/05/09/11/12/13/14/15/18). jail.sh and expected-gaps are untouched: jail.sh:61 binds `opencode` by command name, so v1 and v2 are bound alike; no gap is needed. Not a Missing finding.
- Acceptance 1 (`run.sh opencode-v2 --free` green) fails on the committed tree only at row 14, known and routed to task 04 fix round 2. Not counted.
- ⚠️ Rows 15 and 18 dispatch `build` as a subagent target (row 15 both levels; row 18 control). probe-findings 9 shows `build` only as a dispatcher; `build` is `mode: primary` (probe-findings.md:203). Whether the v2 `subagent` tool accepts a primary agent is unproven. Controller: task 10 must confirm; if refused, rows 15/18 need another nestable agent.
- ⚠️ Row 15 v2 says a PASS proves the installer's `experimental.subagent_depth: 2` (row 15 hunk). On `FX_OPENCODE_ROUTE=plugin` nothing sets that key (plugin route writes only `skills`), so row 15 would fail there for a config reason, not a plugin one. Task 10 should run row 15 on the installer route only, or state it.
- ⚠️ Row 14 v2 lists the five commands (command.list) but never reaches `fx-audit` through one; task Acceptance 4 says "reaches fx-audit through the registered command". Listing is what a model-free row can do; invoking needs a model (row comment says task 10). Controller: confirm task 10 covers the invoke.
- Deviation, plugin route (`plugins/fx.js` link plus `skills`, not a `file://` `plugins` entry): accepted. It matches Global Constraints (installed link is `plugins/fx.js`), adds no permissions, command or agent files, and the README and live.sh say why (2.0.18 refuses a bare .js: "configured plugin path must be a directory"). design §4 and probe Q1 still say `file://`; they should be amended (Minor).
- Deviation, build agent for rows 15/18: reasoned correctly from probe 9 (`general`/`explore` carry `subagent * deny`); see the ⚠ above.
- Files outside the task list: `lib/opencode-v2.sh` is justified (five free rows share install, port, poll; without it the setup would be copied five times). `events.test.js` is the existing test of `events.js`; editing it is the required test for the parser. Neither is scope creep.

### Strengths

- Each v2 case asserts the v1 guarantee in v2 terms and on the real binary, not the converter: row 11 checks both the dialect output and the registry (`opencode debug agents`); row 13 checks every agent's skill denies and `build`'s visible list (skill.list minus build's denies, per probe 7 that skill.list is unfiltered), and on the plugin route requires that skill.list holds the five lanes so the hiding has something to hide (13 hunk, `ROUTE === "plugin"` check). Row 13 also rejects a deny rule on any non-lane skill. Real mutation run reported (fx-setup dropped from HIDDEN makes row 13 FAIL).
- Row 09 v2 separates routes: installer must not link the five lanes, plugin route must list all 17.
- Row 03 runs the plugin's own `context` hook (plugins/fx-opencode-v2.js:171-180 pushes `{type:'text', text}`; stub reads `ev.system.map(p => p.text)`), so a raw PREAMBLE.md path fails it.
- Free setup is isolated: scratch XDG dirs, free port, `service stop` on EXIT, stdin closed, and a major-version check that fails a 1.x machine instead of measuring it.
- `--free` rows make no model call; run.sh keeps its strict arg parse.
- events.js v2 parser matches the probe run shape: `{type, sessionID, part}` with `tool_use.part.tool`/`state`; subagent dispatch from `state.input.{agent,prompt}` and child id from `state.metadata.metadata.sessionID` with the `<subagent sessionID=...>` fallback (probe 10); export parts `{type:'tool', name, state}`; only `completed` dispatches with a child id count toward depth, so the depth-limit error is depth 0 (test at events.test.js v2Refused); denied skill calls land in `skill_attempts` but not `skills`. Same kinds as the other parsers.
- v1 path untouched in live.sh: v1 branches keep their command line (`--major 1` via `$OC_MAJOR`).

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

1. tests/conformance/lib/live.sh plugin-route block duplicates `oc2_setup`'s plugin branch in lib/opencode-v2.sh (link plugin to `plugins/fx.js`, add `$FX/skills`): two implementations of one route. They differ only by merge-into-existing vs write-new config; a rule change (say the plugin path) must be made twice.
2. tests/conformance/events.test.js v2 fixture is synthetic, built from the probe's shape by the same author as the parser, and the report admits the parser had no watched RED. It is not a real captured run; task 10's first live log should be checked against it. Also `events.js` with no sessionID line leaves `root` null and files parts under `"null"` (harmless, no crash).
3. tests/conformance/lib/live.sh v2 plugin branch ignores `FX_OPENCODE_PLUGIN_ENTRY`, which the v1 branch honours; README lists no such knob for v2, so harmless but inconsistent.
4. design.md section 4 and probe-findings Q1 still describe a `file://` plugin entry; the 2.0.18 finding (plugins entry must be a directory) is only in README and code comments. Amend the design so task 10 and docs do not repeat it.
5. `scripts/check-all` runs only the installer route; the plugin route's rows 13 and 14 (Acceptance 4) are a manual run (`FX_OPENCODE_ROUTE=plugin`). Row 13 on the plugin route has a mutation proof in the report, row 14 cannot pass until task 04 fix round 2; re-run both after it.

### Assessment

**Task quality:** Approved
**Reasoning:** Rows test the same guarantees as their v1 cases on the real 2.0.18 binary, and the events parser matches probe 10. The remaining gaps are unverified live behaviour (build as a subagent target, invoking fx-audit) that tasks 10 and the task 04 fix own; none is a defect in this diff.

Checks run: read the full diff (no changed file re-read; no cut-off hunks). Checked jail.sh:61 for binary binding, live.sh:129 for the existing v1 version check, plugin hook shape at fx-opencode-v2.js:171-180, `toOpencodeV2Agent` signature (lib/agent-dialects.js:84) against row 11's call. Did not re-run the suite. No runnable document in the diff beyond test scripts.

## Ledger lines

Task 07: minor (deferred): live.sh plugin-route setup duplicates oc2_setup's plugin branch in lib/opencode-v2.sh.
Task 07: minor (deferred): events.js v2 parser fixture is synthetic with no watched RED; check it against task 10's first real log.
Task 07: minor (deferred): live.sh v2 plugin route ignores FX_OPENCODE_PLUGIN_ENTRY that the v1 route honours.
Task 07: minor (deferred): design section 4 and probe Q1 still say `file://` plugin entry; 2.0.18 needs a plugins/ link.
Task 07: minor (deferred): check-all runs only the installer route; re-run rows 13 and 14 with FX_OPENCODE_ROUTE=plugin after task 04 fix round 2.
