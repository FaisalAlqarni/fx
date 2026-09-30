### Finding verdicts

- **F1 empty or missing subagent_type is general, fork left alone**: ADDRESSED. lib/dispatch-route.js:15-16 defaults the type to `general-purpose` and returns null for `fork` and `fx:`. tests/gates/dispatch-route.test.js:18-22 covers no type, empty type, no type with opus, and fork with and without a model.
- **F2 reason rule covers every model other than sonnet and haiku**: ADDRESSED. lib/dispatch-route.js:12,18 (`CHEAP` set). dispatch-route.test.js:23-28 covers `fable`, `claude-opus-4-1` and `claude-fable-5`, with and without the reason line.
- **F3 exit only after stdout drains, with a large-prompt test**: ADDRESSED. hooks/fx-pretooluse.js:110-112 uses `process.stdout.write(payload, () => process.exit(0))` and then returns. dispatch-route.test.js:104-112 sends a 300 KB prompt and checks it arrives intact. The report says this test passes on Linux with or without the fix, so it guards against regressions but never showed RED.
- **F4 routing-off shown as systemMessage, non-Error throw handled**: ADDRESSED. hooks/fx-pretooluse.js:40-47 (`routingOff` uses `String((e && e.message) || e)` and keeps the stderr line), used in both catches (:52, :98), and :106-108 print the systemMessage only when there is no rewrite. dispatch-route.test.js:86-99 checks status 0, a parseable systemMessage, no hookSpecificOutput, and a thrown plain string.
- **F5 per-task lens dispatch sends mode: task plus tripwire text; lenses scope to the tripwire class**: ADDRESSED. skills/fx-implement/SKILL.md Lens dispatch paragraph (diff hunk @@ -518) and skills/fx-review/SKILL.md:186 send `mode: task` with the tripwire cell. The same paragraph is in agents/fx-lens-{security,database,silent-failure}.md and their codex/agents/*.toml mirrors. lens-content.test.js:28-35 and tripwire-table.test.js:34-35 pin it. The span still ends at "The reviewer gets three paths" and the return-contract text below it is unchanged.
- **F6 Tripwires: report line, controller greps it, reviewer flags misses**: ADDRESSED. implementer-prompt.md:340-348, SKILL.md Lens dispatch (`grep -n '^Tripwires:' <report>`), task-reviewer-prompt.md:206-208. tripwire-table.test.js:34-37 pins all three.
- **F7 security tripwire adds request-parameter fetch and tenant or ownership scope**: ADDRESSED. skills/fx-review/SKILL.md:101 table row, mirrored in implementer-prompt.md:342-343. lens-content.test.js:35 pins it.
- **F8 production count excludes docs/**, README*, CHANGELOG* and not all *.md; condition 5 added**: ADDRESSED. skills/fx-implement/fix-loop.md:92-106. ADR-0030:20 matches. fix-loop-shape.test.js:29-34 pins it.
- **F9 fail-fast test_all and order-dependent blocking**: ADDRESSED. SKILL.md exit gate paragraph "A `test_all` that stops at its first failure" (hunk @@ -779), pinned by fix-loop-shape.test.js:35-36.
- **F10 greenfield wording and COVERAGE.md baseline row**: ADDRESSED. SKILL.md hunk @@ -237 drops "the baseline is 0 tests". skills/fx-implement/COVERAGE.md:102 is remapped to S with ADR-0030 cited. fix-loop-shape.test.js:37 pins the wording. The summary table was not recounted: see New breakage.
- **F11 rulings.md is the only source; SKILL.md §4 writes a ## Log heading**: ADDRESSED. lib/plan-state.js:78-94 reads only docs/plans/rulings.md, and the ledger section regex is gone. The SKILL.md Standing rulings paragraph adds `## Log`. plan-state.test.js tests a ledger-only ruling (no effect), an addition and an emptying (both take effect at once), and the cap-overflow text. fix-loop-shape.test.js:38 pins the Log heading.
- **F12 repo-content heading and owner-yields closing line**: ADDRESSED. lib/plan-state.js:130,135, asserted in plan-state.test.js:141-142.
- **F13 thrown rulings error leaves a note line**: ADDRESSED. lib/plan-state.js:117-120, asserted in plan-state.test.js:201 (`boom`).
- **F14 worst-case fixture asserts the rulings render**: ADDRESSED. lib/preamble.test.js:96-97 moves the rulings to docs/plans/rulings.md, and :105-106 assert 10 rendered rulings and the heading while the text stays under 9,000.
- **F15 custom companions framed as repo content, capped at 300**: ADDRESSED. lib/preamble.js:66-70 (`slice(0, 299)` plus the ellipsis makes 300). preamble.test.js:113-118 checks the worst case with a 400-character value capped, still under 9,000. :281-284 check the exact 300-character length.
- **F16 parse failure reports the error class only**: ADDRESSED. lib/preamble.js:75-77 prints `not valid JSON` for SyntaxError, or `err.code`, or `error`. preamble.test.js:293-298 checks that `hunter2` never appears, and the EISDIR case.
- **F17 split ADR-0031, add 0035, fix "no output on failure" and "every session start"**: NOT ADDRESSED. The split, the new title, the systemMessage wording (docs/adr/0031-model-routing-is-held-by-a-hook.md:13) and the new 0035 are done. The "every session start" overclaim (coverage G3) moved into the new ADR unchanged: docs/adr/0035-standing-rulings-live-in-one-repo-file.md:1 (H1 "read at every session start") and :11 ("at every session start, compaction included"). F17 asked for "while an unfinished plan exists; Claude Code re-reads on compaction, OpenCode at startup", and that wording appears nowhere in the ADR. lib/plan-state.js:104-105 returns null with no plans, so the ADR still claims behavior the code does not have.
- **F18 ADR-0032: ADR-0006 paragraph, repo-content framing, H1 matches filename**: ADDRESSED. docs/adr/0032-the-preamble-carries-a-companion-tools-line.md:1, :15, :19.
- **F19 ADR-0032 to 0034 use ## headings; 0034 drops "this task" and hashes**: ADDRESSED. The heading changes are throughout 0032, 0033 and 0034. 0034:13-17 no longer contains "task 07/08", commit hashes or "(this task)".
- **F20 fx-review red flag reworded; harness doc covers Agent and Task and fork's model**: ADDRESSED. skills/fx-review/SKILL.md:292 and references/harnesses/claude-code.md:37-44.
- **F21 INSTALL.md stale "waits for free memory" sentence**: ADDRESSED. INSTALL.md:400-402.
- **F22 README pipeline diagram names devil's advocate**: ADDRESSED (already satisfied before this wave). README.md:58 reads "plus fx-devils-advocate (code mode), unprimed, once per branch". No change was needed.
- **F23 version bump 0.2.3 to 0.2.4**: ADDRESSED. .claude-plugin/plugin.json:3, .codex-plugin/plugin.json:3 and .agents/plugins/marketplace.json:9 are at 0.2.4. A grep outside docs/plans finds no other 0.2.3. tests/gates/release-version.test.js:27 names only the Claude manifest. The controller's check-all run confirms the test.

### New breakage in the fix diff

- Minor: skills/fx-implement/COVERAGE.md:102 moved W118:W121 from K to S, but the Summary table (:114-116, "Kept inline 203", "Superseded 71") was not recounted. No gate checks it.
- Minor: lib/preamble.test.js:286 is a dead write: it restores `Use tool X.` and :287 overwrites it at once. lib/preamble.js:61 is an unwrapped long comment line.

### Out-of-scope observations

None.

### Verdict

**Fix round:** Findings remain open: F17 (ADR-0035 still claims rulings load "at every session start"; the code injects them only while an unfinished plan exists, and the ADR does not state the Claude Code compaction and OpenCode startup split).

## Ledger lines

Task final: fix round 1/1 (22 addressed, 1 open: F17 ADR-0035 keeps the "every session start" overclaim; commits fc85ce2..a2c0f56)
Task final: minor (deferred): COVERAGE.md summary counts not recounted after W118:W121 moved from K to S
Task final: minor (deferred): preamble.test.js:286 dead .fx.json write and preamble.js:61 unwrapped comment line
