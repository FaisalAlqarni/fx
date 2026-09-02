# Coverage: fx-tdd

Sources:
- `superpowers:test-driven-development` @ 6.3.0: claims 1 to 101
  (+ its `writing-good-tests.md` sidecar, read in full)
- `mattpocock:tdd` @ 1.2.3: claims 102 to 128 (+ `tests.md`, `mocking.md`)
- `soe:test-driven-development` (your fork): claims 129 to 195

Verdicts: **K** kept inline · **R** kept in `../../references/vocab/good-tests.md` ·
**C** kept in `../../references/vocab/codebase-design.md` · **S** superseded ·
**D** dropped. A claim with no verdict is a build error.

---

## superpowers:test-driven-development (1 to 101)

| Claims | Verdict | Note |
|---|---|---|
| 1 to 2 | S | Frontmatter rewritten; triggers name the file extensions and verbs for this stack set |
| 3 to 7 | K | Write first / watch it fail / minimal code · the core principle · letter-vs-spirit |
| 8 to 11 | K | **When to Use: Always** (features, bug fixes, refactoring, behavior changes). Restored |
| 12 to 14 | K | **Exceptions: ask first** (throwaway prototypes, generated code, config files). Restored |
| 15 | K | "skip TDD just this once" is rationalization |
| 16 to 22 | K | Iron Law; delete it; all four no-exceptions clauses; implement fresh |
| 23 | S | DOT cycle diagram → prose RED → verify → GREEN → verify → REFACTOR, every edge covered |
| 24 to 29 | K | Write one minimal test; the good/bad annotations; one behavior, clear name, real code |
| 30 to 35 | K | Verify RED MANDATORY; all three confirmations; passes → fix the test; errors → fix and re-run |
| 36 to 39 | K | GREEN minimal; both annotations; don't add features / refactor / improve beyond the test |
| 40 to 45 | K | Verify GREEN MANDATORY; all three confirmations; fix code not test; fix other failures now |
| 46 to 50 | K | Refactor after green only, all three actions, stay green, no new behavior, repeat |
| 51 to 53 | K | **Good Tests table: Minimal / Clear / Shows intent, with both examples.** Restored |
| 54 | K | Sidecar pointer → `../../references/vocab/good-tests.md` |
| 55 | K | **Name the production change that would make the test fail: before writing it.** Inline *and* in the reference |
| 56 to 58 | R | Assert on real behavior not mock behavior · test-only code in test utilities · understand a dependency's side effects before mocking |
| 59 to 69 | K | **All 11 rationalization rows**, full reality text |
| 70 to 82 | K | **All 13 red flags.** 7 were missing from the draft |
| 83 | K | "All of these mean: delete the code, start over" |
| 84 to 91 | K | All 8 checklist items, **including "edge cases and errors covered"** which the draft dropped |
| 92 | K | "Can't check every box? You skipped TDD." |
| 93 to 96 | K | All 4 when-stuck rows |
| 97 to 98 | K | Debugging integration; never fix a bug without a test |
| 99 to 101 | K | Final rule, both lines, and "no exceptions without permission" |
|: | K | **Added from `verification-before-completion`:** the regression red-green proof (write → pass → revert the fix → MUST FAIL → restore → pass) |

### writing-good-tests.md sidecar → `../../references/vocab/good-tests.md`

| Content | Verdict |
|---|---|
| Two governing principles; the TDD-produces-both reason | R |
| Name the break; derive expectations independently; mirror-assertion example | R |
| No change detectors (`MAX_RETRIES` example) | R |
| Behavior not text; documents tested via consumer behavior | R |
| Your code not the framework; the one-characterization-test allowance; the validate/normalize/default/derive/enforce list | R |
| Principle-1 gate function | R |
| The mock earns no assertions; "Are we testing the behavior of a mock?" | R |
| Mock at the right level; the swallowed-write example | R |
| Make doubles specific; per-branch fixtures | R |
| Mirror real data completely; the silent-failure reason | R |
| Production classes carry production methods only; the two questions | R |
| Prefer real components; "Do we need to be using a mock here?" | R |
| Principle-2 gate function | R |
| Tests ship with the implementation | R |
| **The mutation check** and all five mutation classes | R |
| Quick-reference table (10 rows) | R |
| Warning signs (11 items) | R |
| TypeScript examples | S → rewritten in Ruby; the stack profile carries per-stack idioms |

## mattpocock:tdd (102 to 128)

| Claims | Verdict | Note |
|---|---|---|
| 102 to 103 | S | Frontmatter merged |
| 104 to 106 | K | The loop; this is the reference that makes it produce tests worth keeping; every section applies every cycle |
| 107 | K | Read `CONTEXT.md` so test names match the domain language; respect ADRs |
| 108 to 110 | K | **Behavior through public interfaces · "code can change entirely, tests shouldn't" · "a good test reads like a specification"**: all three restored |
| 111 | R | `tests.md` + `mocking.md` → folded into `good-tests.md`, examples rewritten in Ruby |
| 112 to 113 | K | Seam definition; tests live at seams, never against internals |
| 114 to 117 | K | Test only at pre-agreed seams; write them down and confirm; **no test at an unconfirmed seam**; the can't-test-everything reason |
| 118 | K | The question to ask |
| 119 to 120 | C | Interface shape in question → `codebase-design.md`; "a reference to consult, not a session to run" |
| 121 | K | Implementation-coupled anti-pattern + the refactor tell |
| 122 to 123 | K | Tautological anti-pattern, all three examples, and the independent-source-of-truth rule |
| 124 to 125 | K | Horizontal slicing; vertical slices; tracer bullets responding to the last cycle |
| 126 to 127 | K | Red before green, no speculation; one seam, one test, one implementation per cycle |
| 128 | S | **"Refactoring is not part of the loop"** → refactor kept, **bounded to code this task wrote**. Wider restructuring goes to `fx-review`/`fx-architecture`. mattpocock is arguing against module-scale refactors creeping in, which the bound prevents |

## soe:test-driven-development (129 to 195)

| Claims | Verdict | Note |
|---|---|---|
| 129 to 130 | S | Frontmatter merged |
| 131 | S | `Gate type: verification` per `soe:gate-classification`: soe's mode system is not absorbed |
| 132 to 141 | K | Duplicates of superpowers 3 to 15, already kept |
| 142 | S | DOT diagram → prose, Step 0 included |
| 143 to 147 | K | **Step 0: user story + not-implemented stubs, the right-reason rationale, skip for bug fixes.** Stub syntax extended to Ruby/C#/Kotlin/Swift/TS |
| 148 to 150 | K | Duplicates of RED / verify RED |
| 151 | K | **Detect the test runner: don't assume `npm test`** → the stack profile carries it |
| 152 | K | Run the new test and confirm a valid RED |
| 153 to 156 | K | **Runtime RED vs compile-time RED, the not-caused-by-unrelated-errors constraint, and "a test never compiled and executed does not count as RED".** The single most important restoration in this skill: without it the loop rejects correct RED on C#, Kotlin and Swift |
| 157 to 165 | K | Duplicates of the RED/GREEN/REFACTOR rules |
| 166 to 167 | S | **80% / 100% coverage thresholds** → no fixed gate. advantage-backend has no SimpleCov, so it is unenforceable; replaced by "every new public method has a test at a confirmed seam", plus a stack-profile `coverage_command`/`coverage_floor` when one exists |
| 168 | K | **"Coverage is a guide, not a goal: high coverage + poor tests = false confidence"** |
| 169 | S | `reference.md` → split between `good-tests.md` and the stack profiles |
| 170 to 172 | K | Debugging integration; the test proves the fix and prevents regression; never fix a bug without a test |
| 173 to 183 | K | Red flags: subset of superpowers' 13, already kept |
| 184 to 190 | K | Checklist: merged with superpowers'; **"valid RED"** wording taken from here |
| 191 to 193 | K | Final rule |
| 194 | S | `reference.md` contents, incl. **the TDD evidence report format** → the guarantee row appended to `state.md`; no separate evidence file |
| 195 | R | `testing-anti-patterns.md`: testing mock behavior, test-only methods on production classes, mocking without understanding dependencies → all three in `good-tests.md` |

---

## Summary

| | Count |
|---|---:|
| Kept inline in `fx-tdd` | 118 |
| Kept in `../../references/vocab/good-tests.md` | 41 |
| Kept in `../../references/vocab/codebase-design.md` | 2 |
| Superseded by an explicit decision | 34 |
| Dropped | 0 |
| **Unaccounted** | **0** |

## The one that would have shipped as a bug

Claims 153 to 156. My draft carried superpowers' *"the test **fails**, and does not
**error**"* verbatim. On C#, Kotlin and Swift a missing method is a **compile
error**, so the draft would have told the implementer its correct RED was
invalid and sent it looping. Your soe fork already had the fix; the draft
dropped it.
