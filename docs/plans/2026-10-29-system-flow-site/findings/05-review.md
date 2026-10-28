### Spec Compliance

- ✅ Spec compliant. Every Files entry has its hunk (model, layout, diagrams, build, page, fx-flow-2 rename, scripts/build, both tsconfigs, visual-assets.md, the five tests). Ruling C2 holds: the message is `figure seq-turn: step 0 names a missing row turn#9` (fx-flow-2.ts validateFigure, visual-kit test). I read the diff in passes (build/diagrams/layout, then fx-flow-2, then tests); its elided context lines were not needed.
- ⚠️ Cannot verify from diff: (a) the "leaving call" legend item (design Styles row) is not in this task's Files; the controller should confirm task 06 or 07 owns it. (b) `fx-flow-2` drawing (active arrow 2.8 px, bold label, look shapes) has no automated check; only the implementer's throwaway Playwright run backs it.

Departures the controller asked me to judge:
- Page 1 named `seq-turn.html`, not `seq-turn-p1.html`: the implementer is right. The brief says "one page per 8 messages as today", and its own Fallback step-list test names `diagrams/seq-turn.html` for the first page of a one-page sequence. Renaming would break existing links. The brief's `-p1` wording is the error; task 07 ("first page on disk") is unaffected. Not a finding.
- 860 rule skipped in `layoutAll` instead of `layoutChecked`: equivalent. `layoutChecked` (sf-build.ts) only maps `unfit`, and sequences never enter it (sf-layout.ts layoutAll sequence loop). Test pins a 9- and 12-participant build exiting 0. Accepted.
- Box heights unchanged: checked. `sized` gives h = 22 + 16 x lines + 18 (sf-layout.ts:121), so 56 for one label line and 72 for two. The text block in fx-flow-2 (labels at 15.5 px plus one 12 px sub line) is 31 or 46.5 px and fits. Accepted. A 26-character sub at 12 px is about 160 px in a 164 px node (tight, see Minor 2).
- "12 px" as font size: ambiguous, see Minor 1.

### Strengths

- `lifelines` is a pure function with the brief's constants named in one line (sf-layout.ts ROW0..LABEL_CW); width table, rows 72/112/168, height 232 and `scrolls` all asserted from the spec.
- `sequenceInput` deleted outright; sequences no longer reach ELK, so same-prefix ids and crossings cannot arise.
- `leaves` excludes replies (review-focus case) and is asserted on `turn` rows 4 and 5.
- `where` is split out of `caption` for all three figure kinds, and the fallback list strips `Step n:` and appends `<code>` through `escapeHtml`; the player builds `where` with `textContent`.
- Fallback rest colour via CSS variables so a leaving call returns to `--warn` after its keyframe; sha256 in visual-assets.md matches `git show 9a08ac8:references/visual/fx-flow-2.js` (26d7caa5...), version 0.9.0 matches plugin.json, no `fx-flow-1` left outside docs/plans, the template comment and new negative tests.
- RED evidence is real (missing `lanes`, missing `fx-flow-2.js`, `lifelines` 0), not setup noise.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

1. src/lib/sf-layout.ts:1460 (`label.y = y + ARROW_DY - 4 - LABEL_H`) and the `FigureRow` comment in sf-model.ts: the brief's geometry says "label 12 px above the arrow"; the implementer read 12 px as font size, so the label box sits 4 px above the arrow line. The design table's "12 px" is the font size, so the reading is defensible, but the brief's geometry line is a separate sentence and may mean the gap. Task 07 reads `label.y`; the controller should settle which before 07 relies on it. No test pins `label.y`.
2. src/references/visual/fx-flow-2.ts (box node `sub` text): a 26-character role at 12 px is about 160 px wide in a node 164 px wide (`sized`, sf-layout.ts:121), so it can touch the border. Node width was left unchanged. Check in the exit-gate visual pass; widen `nw` if it clips.
3. src/scripts and src/tests/gates: nothing exercises the `fx-flow-2` drawing (look shapes, active arrow 2.8 px, bold label, row geometry); the gate test loads it with no DOM and only calls `validateFigure`. The Playwright run in the report is not committed. Task 11 or the proof should cover it.
4. src/lib/sf-diagrams.ts boxSvg: the SVG fallback for box figures draws neither `sub` nor `look` (the brief asks the fallback only for sequences), so a fallback level page and its inline figure now differ. Note for the exit-gate proof.

### Assessment

**Task quality:** Approved
**Reasoning:** The lifeline geometry, spec shapes, steps, report line, fallback and `fx-flow-2` match the brief's tables and tests, with valid runtime RED evidence. The four departures are each defensible; the `-p1` naming is a brief error. Only minor items remain.

## Ledger lines

Task 05: minor (deferred): label.y puts the label box 4 px above the arrow; the brief's "12 px above" may mean the gap, settle before task 07 reads label.y
Task 05: minor (deferred): a 26-character box sub line at 12 px is about 160 px in a 164 px node; check for clipping at the exit gate
Task 05: minor (deferred): fx-flow-2 drawing (looks, active arrow, bold label) has no committed automated check; only validateFigure is tested
Task 05: minor (deferred): SVG fallback box pages draw neither sub nor look, so they differ from the inline box figures
