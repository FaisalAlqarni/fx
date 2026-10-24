# 15: fx-tdd and fx-debug evidence rules

**Status:** ready-for-agent
**Blocked by:** 10, 11
**Phase:** 3: Lane improvements

**What to build:** tests prove what they claim, and reports name every failure seen (`research/compare-4-tdd-debug.md` T1, M1, M4, B1, B2, D2).

fx-tdd:
- "Other tests still pass" in Verify GREEN becomes: run `test_scope` once the change is done, even when the task named one test file; name every failure it shows in the report, including ones you did not cause; a red you saw and left out falsifies the report;
- the seam paragraph gains "Give each proposed seam one line: what it catches, what it misses.";
- after "the ideal number is one": never drive RED from a browser or system test (it is slow, and a missing feature looks like a broken test); drive the behaviour at the request or service seam and add the system test once it works;
- the regression proof in Bug fixes says how to undo the fix: copy the fixed file aside, undo the fix by hand, `diff` against the copy to prove the undo landed, run (MUST FAIL), copy it back, `diff` again, run (passes); never `git checkout`, `git restore` or `git stash` for this.

fx-debug:
- Phase 5 "Watch it fail" gains: forced the red by changing code or a fixture? `diff` against a clean copy first, to prove the change landed;
- Phase 6 gains the prevention question: after the fix is in, name what would have prevented this bug; a missing seam goes to `fx-architecture`, a process or lane gap to `/fx:fx-retro` (task 19 adds it); say it in the report and start neither;
- the Phase 5 "Apply `fx-implement`'s Iron Law" sentence becomes: before saying it is fixed, re-run the Phase 1 loop and the test command and read the output: evidence before claims (`../../references/vocab/verification.md`).

Expected sizes: fx-tdd about 19,400 bytes (18,675 plus about 30 from task 10 plus about 700); if it measures 19,800 or more, move the `## Coverage` section into `skills/fx-tdd/test-coverage.md` with a pointer at that step. fx-debug about 19,000 bytes.

**Design:** Phase 3: TDD and debug

**Files:**
- Modify: `skills/fx-tdd/SKILL.md`, `skills/fx-debug/SKILL.md`
- Modify: `skills/fx-tdd/COVERAGE.md`, `skills/fx-debug/COVERAGE.md` (one row each per adopted item, with its upstream source)

**Seam:** the text gates and the size gate. Good tests here check external behaviour; the wording of these rules is not asserted.

**Tests:**
- `grep -c "never drive RED from a browser or system test" skills/fx-tdd/SKILL.md`: 1.
- `node tests/gates/skill-size.test.js`: `skill-size: OK`; `wc -c skills/fx-tdd/SKILL.md` under 19,800; `wc -c skills/fx-debug/SKILL.md` under 19,500.
- `python3 -I scripts/check-paths`: exit 0 (the new `verification.md` citation resolves).
- `python3 -I scripts/check-prose skills/fx-tdd/SKILL.md skills/fx-debug/SKILL.md skills/fx-tdd/COVERAGE.md skills/fx-debug/COVERAGE.md`: OK line.
- `no-stories-in-loaded-lanes.test.js`: OK (no `Measured` story added to fx-tdd SKILL.md).

**Risks:** `/fx:fx-retro` does not exist until task 19; this line is a pointer the owner types, and no gate reads it. fx-tdd is the tightest lane in the plan; measure after each edit.

**Testing:** text and size gates, offline.

## Acceptance criteria
- [ ] fx-tdd says RED is never driven from a browser or system test, as the design states.
- [ ] fx-tdd's regression proof names the copy, hand undo and `diff` steps and forbids `git checkout`, `git restore` and `git stash` for it.
- [ ] fx-debug Phase 6 asks the prevention question and starts no other lane.
- [ ] Both SKILL.md files are under the gate with the stated headroom.

## Steps

- [ ] **1. Edit the two SKILL.md files and their COVERAGE rows**

- [ ] **2. Measure**

Run: `wc -c skills/fx-tdd/SKILL.md skills/fx-debug/SKILL.md`
Expected: fx-tdd under 19,800, fx-debug under 19,500; otherwise move the named section first.

- [ ] **3. Run the gates the Tests field names**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/skill-size.test.js`, `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env python3 -I scripts/check-paths`, `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env python3 -I scripts/check-prose skills/fx-tdd/SKILL.md skills/fx-debug/SKILL.md skills/fx-tdd/COVERAGE.md skills/fx-debug/COVERAGE.md`
Expected: each OK.

- [ ] **4. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-generated`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope skills/fx-tdd/SKILL.md skills/fx-debug/SKILL.md`

- [ ] **5. Commit by path**

```
git add skills/fx-tdd/SKILL.md skills/fx-debug/SKILL.md skills/fx-tdd/COVERAGE.md skills/fx-debug/COVERAGE.md
git commit -m "feat(fx-tdd, fx-debug): name every failure, note each seam, prove undo and forced red with diff"
```

Add `skills/fx-tdd/test-coverage.md` to the `git add` line only if step 2 forced the move.
