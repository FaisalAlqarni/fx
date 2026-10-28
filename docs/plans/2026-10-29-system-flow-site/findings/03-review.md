### Spec Compliance

- ✅ Spec compliant. Every row of the message table has its exact text in src/lib/sf-prose.ts:317-405; whole-model rules are gated on `whole` and the shape rules (intro length, role twice, lead 2 to 4, bullets over 8, bullet length, captions, participants, glossary duplicates) run in both modes; `checkModel` passes `'fragment'` when `--fragment` is set (src/lib/sf-build.ts diff, line 2238); `BuildResult.prose` is set after layout succeeds (null before); scripts/check-all has the one line; the test file covers each bound named in the brief's Tests field.
- ⚠️ Cannot verify from diff: the 16-suite run and `ALL GREEN` are the implementer's claim. I did not re-run the suite (rules). The implementer ran check-all once through test-scope, against the controller's "exit gate only" ruling; it passed, so no harm, but note it.

### Strengths

- sf-prose.ts is small and reads as the design's table. Pointers use `fieldOrigin`/`originOf` as the brief says; no origin map is passed in.
- The prose test builds each variant from `goodSet()` with one field changed and matches `file:pointer: message` with an anchored regex, so a wrong pointer or a miscounted number fails. The sentence samples are padded to exactly 5, so a splitter miscount changes the printed number.
- Real RED recorded (runtime, 5-sentence lead passes before the floor exists).
- C4 respected in the spot checks I made: the removed assertions in build, check, estimate, layout, only, stale and coverage tests each have a replacement asserting the same mechanism with shifted values (section index 4, 5 fragments, `term:expires`). No assertion was dropped.
- goodSet() matches the brief: s1 lead is two 20-word sentences with `link` twice, 120 words, start-what 140, average 124.

### Judgement on the implementer's two concerns

1. `floor()` helper (src/tests/helpers/sf-fixture.ts:4386-4432): sound seam. 12 suites build their own thin models (own diagrams, own captions), so they cannot start from `goodSet()` without losing their point; one deterministic helper beats 12 hand paddings. It pads with `unconfirmed` items so it adds no stamps or stale items. It is not a hidden mock: it changes only the input, never an assertion. Weaknesses are Minor (below). Keep it.
2. Level-0 diagram drawn in start-parts: correct, not a loss. The floor rule (`parts` must list `levels.root`) makes this what every real model does, so tests that kept the old s1 placement would have tested a shape no real site has. The first-lists-draws, later-link mechanism is still asserted (page.test: start-parts holds the figure, s1 and s2 both link with "Drawn in chapter 02"). Only coverage.test loses a numbered-chapter owner case (Minor 1).

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

None.

#### Minor (Nice to Have)

1. src/scripts/system-flow-coverage.test.ts (diff line 3170 area) · the "folder entry covered through a section's diagram list" case now expects `start-parts`, so no test pins that an ordinary numbered chapter owns a diagram-covered entry. Fix: add one case with a second, non-root diagram listed by `s2`.
2. src/tests/helpers/sf-fixture.ts:4413-4431 · `floor()` writes `floor.json` once and is excluded from its own reads, so if a test adds its own request sequence or glossary after calling `floor()` and does not call it again, `floor.json` keeps a second `start-request` sequence and the request rule fails confusingly. The cited-root walk (4422-4426) also re-implements sf-prose.ts:2344 on raw JSON, a second copy of the rule. Fix: note "call floor() last" in its comment; drop `floor.json` content that the test now supplies.
3. src/scripts/system-flow-build.test.ts and system-flow-estimate.test.ts (hunks at diff lines 2525 and 3256) · the Depth constants `69` evidence and `53` path entries are arithmetic copied from the fixture's current contents; any later goodSet() edit breaks them with an opaque number. Fix: derive from the fixture's exported counts, or assert only `chapters: 5` and `filesCited: 3`.

### Assessment

**Task quality:** Approved
**Reasoning:** The floor, its pointers, both modes and `BuildResult.prose` match the brief's table and tests, existing assertions were adjusted by value only, and both flagged choices hold up on design. The three Minors are test-hygiene only.

## Ledger lines

Task 03: minor (deferred): coverage test no longer pins a numbered chapter owning a diagram-covered entry; add a non-root diagram case in system-flow-coverage.test.ts
Task 03: minor (deferred): floor() leaves a stale floor.json if a test adds its own request sequence or glossary afterwards, and re-implements the cited-root walk from sf-prose.ts
Task 03: minor (deferred): hard-coded Depth constants 69 and 53 in build and estimate tests copy the fixture's arithmetic and will break on any goodSet() edit
