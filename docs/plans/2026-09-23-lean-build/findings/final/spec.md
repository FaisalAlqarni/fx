# Final review, spec pass (649da01..31214e4)

Step 4's removal is expected (measurements.md), not a gap.

## (a) Missing or partial

1. **Important.** Spec: "the clean control draws no more false positives than at baseline" (Global Constraints). This ship condition was never evaluated. measurements.md calls the control count "Not usable", because `tests/review-bench/score.js` counts dash bullets only (deferred Minor M4). Steps 2 and 3 shipped with this gate unchecked; the scorer is unfixed.
2. **Minor.** Spec: "Target: controller context growth per task at least three times smaller than baseline" and "Not built: a forced mid-build session handoff. Added only if the target is missed." Measured growth is 17 percent lower, so the target was missed. The owner shipped step 3 anyway, but nothing records the handoff follow-up as deferred.
3. **Minor.** Spec: "on `SubagentStart` the plans block is left out." `plugins/fx.js:204` still renders with no `subagent` flag, so opencode subagents still get the plan list. Task 06 allowed this; nothing records the gap.
4. **Minor.** Spec (story 15): "when a subagent breaks the return contract or writes no report, I want to re-dispatch once". In `skills/fx-implement/SKILL.md` (Controller reading rules), only a missing report triggers a re-dispatch. An over-long reply is only ignored.

## (b) Not asked for

5. **Minor.** `tests/fixture-build/rows/01-fixture-build.sh:36-42` still has `FX_FIXTURE_PARALLEL=1`, which sets `isolated_test_execution: true` in the fixture. With task 11 reverted, this now turns on the old unguarded relax rule. The design says "if parallel is dropped, the old unguarded relax rule returns, and the key must not be on then." A step 4 leftover.

## (c) Implemented but looks wrong

6. **Important.** Spec: "a missing measurement never counts as a pass" (build-cost), and story 6 makes triggering fire rates a ship gate. `tests/lane-triggering/run-test.sh:36-37,71` exits 0 on `[SKIP]`, and `run-all.sh` counts that as PASS, so with no CLI or credential the run reads 17 of 17. Ruling J flagged this and it is unfixed.
7. **Minor.** Spec: "It exits non-zero when it finds no transcripts or cannot deduplicate." `scripts/build-cost:46` falls back to `uuid`, which is unique per record. A transcript with no `requestId` or `message.id` is then counted once per content block, not failed.
8. **Minor.** Spec: "caught at the end (hidden test green on the finished branch)". Ruling N's parked hole in `tests/fixture-build/hidden/traps.test.js` means path-escape can score green for a store that writes an absolute name to a third location outside NOTES_DIR.
