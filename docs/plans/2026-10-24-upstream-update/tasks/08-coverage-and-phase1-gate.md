# 08: COVERAGE files match fx as it is; Phase 1 gate

**Status:** ready-for-agent
**Blocked by:** 03, 04, 05, 06, 07
**Phase:** 1: Room and fixes

**What to build:** each COVERAGE file in the six lanes below says what fx actually carries after tasks 03 to 07, so an agent or maintainer reading it is not told a rule exists that does not. Then Phase 1 is closed: `scripts/check-all` passes on the branch as it stands. Corrections, each re-opened against the file before editing (line numbers from the research are at dd99986):
- `skills/fx-brainstorm/COVERAGE.md`: add a row for superpowers 6.3.0 `spec-document-reviewer-prompt.md` (unused by 6.3.0 SKILL.md; superseded upstream by the builder check) (`compare-1` B18); the row claiming the CONTEXT-FORMAT map format was kept says it was dropped (D2); record the literal-insertion fix from task 06 against the server row.
- `skills/fx-humanize/COVERAGE.md`: list the four local modifications that exist (name; the fx-authoring redirect in the description; "Precision is not accuracy"; the identifier rule plus the "every output" paragraph), not one (`compare-6` HZ8).
- `skills/fx-review/COVERAGE.md`: the spec-source row says only the `docs/plans` form was kept (C3); the "Under 400 words" rows say the cap was replaced by "Keep to findings the diff supports" in commit ac5a592 (C4); add a row for receiving-code-review "Real Examples": dropped (V2); section 7 now points at `receiving-review.md` (task 05).
- `skills/fx-plan/COVERAGE.md`: the rows claiming "zero context, questionable taste: restored", "doesn't know good test design: restored" and "test code yes" become S with "ADR 0043: reader is skilled and drives tests through fx-tdd; Tests field in prose" (X1); the templates live in `templates.md` (task 05).
- `skills/fx-tdd/COVERAGE.md`: the row claiming the good/bad annotations were kept becomes S, "examples superseded by prose plus good-tests-examples.md" (T3).
- `skills/fx-debug/COVERAGE.md`: the condition-based-waiting row says reviewed and rewritten stack-neutral (task 07), not "not yet reviewed" (D9); the example `.ts` row says dropped and deleted (D10); the "be aggressive, refuse to give up" row becomes S, superseded by the effort line and the explicit stop rule (B3).

**Design:** Phase 1: Fixes

**Files:**
- Modify: `skills/fx-brainstorm/COVERAGE.md`, `skills/fx-humanize/COVERAGE.md`, `skills/fx-review/COVERAGE.md`, `skills/fx-plan/COVERAGE.md`, `skills/fx-tdd/COVERAGE.md`, `skills/fx-debug/COVERAGE.md`

**Seam:** the text gates and the full gate run.

**Tests:**
- `python3 -I scripts/check-prose` on the five COVERAGE files outside `skills/fx-humanize/`: OK line.
- `no-stories-in-loaded-lanes.test.js`: OK (fx-plan and fx-tdd COVERAGE keep their `## Incident record` sections).
- `scripts/check-all`: ends with `ALL GREEN`.

**Testing:** text gates; then the full gate as the Phase 1 boundary.

## Acceptance criteria
- [ ] Every corrected row names the file and section where the rule now lives, or says it was dropped.
- [ ] `scripts/check-all` prints `ALL GREEN` on the branch with tasks 01 to 08 committed.

## Steps

- [ ] **1. Re-open each cited COVERAGE row and the lane text it describes; edit the rows**

- [ ] **2. Run the text gates**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env python3 -I scripts/check-prose skills/fx-brainstorm/COVERAGE.md skills/fx-review/COVERAGE.md skills/fx-plan/COVERAGE.md skills/fx-tdd/COVERAGE.md skills/fx-debug/COVERAGE.md`
Expected: OK line.

- [ ] **3. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-generated`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope skills/fx-brainstorm/COVERAGE.md skills/fx-humanize/COVERAGE.md skills/fx-review/COVERAGE.md skills/fx-plan/COVERAGE.md skills/fx-tdd/COVERAGE.md skills/fx-debug/COVERAGE.md`

- [ ] **4. Commit by path**

```
git add skills/fx-brainstorm/COVERAGE.md skills/fx-humanize/COVERAGE.md skills/fx-review/COVERAGE.md skills/fx-plan/COVERAGE.md skills/fx-tdd/COVERAGE.md skills/fx-debug/COVERAGE.md
git commit -m "docs(coverage): record what six lanes actually carry"
```

- [ ] **5. Phase 1 gate** (a plan-mandated phase gate, standing ruling S3: ledgered as `Task <NN>: ran test_all (plan-mandated phase gate)`)

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`
Expected: `ALL GREEN`. A failure here is fixed in the task that owns the failing file before Phase 2 starts.
