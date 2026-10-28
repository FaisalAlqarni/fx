# Task 15 re-review, fix round 1 (dc03b54..6132e9b)

### Finding verdicts

1. Spec issue and Important 1 (shared ids): ADDRESSED.
   - Order in SKILL.md: step 2 ends with "After approval, before any dispatch, write chapters.json and level0.json" (skills/fx-system-flow/SKILL.md:107 to :111); step 3 dispatch starts at :115. The old "While subagents run, the controller writes level0.json and chapters.json" is gone; :134 now says only rules.json is written while areas run, and :130 to :132 set `children` and chapter `diagrams` when an area returns.
   - planning.md and area-brief.md agree: planning.md:76 to :95 (Shared ids, "before any area is dispatched", sections without diagram refs, `level0`, `l0-<area id>`, `<area id>-l1`, `parent: "level0"`); area-brief.md:14 and :17 to :22 (slice carries section ids, `level0`, `<area id>-l1`; chapter must be a given section id). grep over skills/fx-system-flow/ finds no remaining sentence that places these two files after dispatch. fragment-guide.md:21 to :22 only says the controller owns them.
   - Check runs before dispatch: SKILL.md:109 to :110 runs `system-flow check --fragment <file>` on each until exit 0. It can pass at that point: sf-rules.ts:44 needs each level-0 node to have an edge (planning.md:88 to :90 requires one); `children` is unset, so the missing-diagram test at sf-rules.ts:40 to :43 does not fire; sections with no refs pass sf-rules.ts:72 to :76. Areas then find their `chapter` ids (sf-rules.ts:57, :60) and their `parent` matches (:43).
   - Commands exist: `check --fragment`, `estimate`, `detect`, `build` in src/scripts/system-flow.ts:12 (USAGE) and :27, :41.
2. Ledger "no record that fx-authoring was invoked": ADDRESSED as a record only. The report now states the Skill invocation (.fx/2026-10-28-system-flow/reports/15-fx-system-flow-lane-report.md:35) and owns the skipped pressure tests (:25, :32). A Skill call leaves no file I can inspect, so the claim itself is unverified.

Row 13 change: not needed for behavior. tests/conformance/rows/13-audit-lane-not-model-facing.sh:53 is a comment only ("20" to "23"); the assertions are unchanged. It corrects a stale count (skills/ holds 23), so it is harmless and closes the deferred Minor.

### New breakage in the fix diff

- Minor: planning.md:88 to :90 asks for an edge from each level-0 node "to another area, or to a context node such as the users", but gives no id for a level-0 context node; with a single area the writer must invent one. Low risk, the check still gates it.
- Minor: the new `<area id>-l1` and `l0-<area id>` ids are not mentioned in fragment-guide.md Ids (which says every node id starts with its area id and a dash); `l0-` nodes are controller-owned so no check fails, but the rule reads as broken.
- Out of scope, not from the fix: task 15 report names scripts/system-flow-archify.test.js:150 failing from task 17's uncommitted src/lib/sf-build.ts. Not re-run (uncommitted work ignored).

No Critical or Important breakage found.

## Ledger lines
Task 15: fix round 1/5 (2 addressed, 0 open: none; commits dc03b54..6132e9b)
Task 15: minor (deferred): planning.md Shared ids names no id for a level-0 context node, so a single-area plan has the writer invent one.
Task 15: minor (deferred): fragment-guide.md Ids says every node id starts with its area id, but level-0 nodes are `l0-<area id>`.
