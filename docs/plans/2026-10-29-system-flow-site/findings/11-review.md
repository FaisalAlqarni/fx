### Spec Compliance

- ❌ Issues found: one measurement defect in the autoplay check (page-check.ts:590-593) makes results.md's owner autoplay row and the compare "Autoplay 2 of 4" cell wrong. Everything else in the brief is present: `--measure owner|fx` with `--out-dir`, the `PROFILES` table with one comment per selector, `compare.ts`, results.md parts Baseline and Migration, the floorWords/readingWords split (results.md lines 9-14, ruling C7), null where a check is undefined (ruling C12), the singular "1 match" accepted (page-check.ts:737 regex `matches?`), and the `-0.1` difference to the research figure recorded.
- ⚠️ Not verifiable from the diff: the migration numbers (62 owed lines, 228 `look` keys, 10 hint lines) and "0 files newer than the stamp". I did not rerun them. Task 12 and 13 will inherit the autoplay defect below, so the controller should check it is fixed before the proof runs.

### Strengths

- The owner profile is honest about what the page lacks: no lead, question plus bullets only, 6 chapters without a question (results.md "How the owner's number is counted"). The 121.9 vs 122 difference is recorded as measured.
- Every behaviour check runs only where defined and reads `null` elsewhere (C12). `compare.ts` filters null and numeric entries, so a missing control never counts as a pass.
- The compare test has a valid runtime RED and covers both a passing and a failing site and the usage exit code. The check-all line is the one line the new test needs to run in the gate.
- No em or en dash in results.md or the .ts sources (grep of both found none).

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)

1. **page-check.ts:590-593 (`toMid`) · measurement defect, not owner behaviour · results.md "Autoplay at 1440" row and "Autoplay" row in the side-by-side table.**
   `toMid` scrolls so that the box's TOP sits at the window middle (`rect.top + scrollY - innerHeight/2`). The design says "its box reaching the middle of the window", which is the box centre. The owner's page observes the `.svgbox` with `threshold: .3` (index.html lines 507-512). At 900 px high, a box taller than 1500 px shows only 450 px (below 30%) when its top is at the middle, so the observer never fires. The six "missed" figures (1, 2, 3, 12, 16, 33) have box heights 1582, 1947, 1908, 1663, 1954 and 1662 px; the figure that passes (0) is 861 px.
   I checked this by running the owner page in Chromium at 1440 x 900, reduced motion off, and scrolling each of the six so the box centre was at the window middle. All six moved from `0 / n` to `1 / n` within 3 s. With the top-aligned scroll the same six stayed at `0 / n`.
   Consequences: results.md says "figures 1, 2, 3, 12, 16 and 33 stay at step 0 (cause not investigated)" and the compare table reads "Autoplay 2 of 4" for the owner. The first line reports a fact the measure produced but attributes it to the owner page; the second counts a failed check that is a script defect. The owner's real 1440 result is 44 of 44 under the design's wording. The same defect will false-fail any generated site (tasks 12 and 13) whose figure box is taller than the window divided by its threshold, and it makes the "pass line for both new sites" unreliable.
   Fix: centre the box (`top + height/2 - innerHeight/2`) in `toMid`, rerun the owner and fixture measures, rewrite the Autoplay rows of results.md, and drop "cause not investigated". If a figure is taller than the window, state in results.md what "reaching the middle" means for it.

#### Minor (Nice to Have)

1. results.md "Reduced motion: nothing plays on its own" and "Pauses when scrolled away: yes" are read from one figure only (`pick`, the figure with the fewest steps of at least 3; page-check.ts:832-872). State "on figure N" or run the check on every figure.
2. page-check.ts:633 detects a lifeline as `svg line[stroke-dasharray]` (an attribute), while results.md says "none has a dashed vertical line under a participant". The owner draws dashes through CSS classes (index.html lines 89-102), which this detector would not see. The 0 of 13 is still right: the owner's 13 `seq:` figures contain no lifeline (index.html has 0 occurrences of "lifeline") and the design's row is "drawn inline as lifelines". Name the detector in results.md rather than claiming a geometric check.

### Answers to the three points the implementer raised

- **Autoplay miss at 1440:** the measure's `toMid`, not the owner page (Important 1). results.md records it truthfully as "not investigated", but the number it reports is wrong for the owner.
- **"0 of 13 lifelines":** consistent with the design's Proof row ("Sequences drawn inline as lifelines | every model sequence"). The owner draws numbered box flows, so 0 is the design-defined answer; wording issue only (Minor 2).
- **Added compare test and check-all line:** justified, since compare.ts has pass rules and the repo's TDD rule wants a test first. Not a defect.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** The tooling, migration proof and C7/C12/C13 handling are sound, but `toMid` aligns the box top rather than its centre, so the owner's autoplay result in results.md and the compare table is wrong and the same script would mis-grade the new sites in tasks 12 and 13.

## Ledger lines

Task 11: minor (deferred): results.md "reduced motion" and "pauses when away" rest on one figure; name it or check all figures.
Task 11: minor (deferred): lifeline detector is `line[stroke-dasharray]` attribute only; results.md wording claims a dashed vertical line under a participant.
