### Spec Compliance

- ✅ Spec compliant. All five acceptance criteria have a matching hunk: arrowStyle, fitAt1440, panelEscape in page-check.ts; conventions note in page and Markdown tests; goodSet gains meta.conventions (no word-count change).
- ⚠️ Cannot verify from diff: the three checks the implementer did not break (fitAt1440, panelEscape, "Shown in" link) were judged by reading only; I did not run a mutation (read-only). The 898 px clientWidth and the Escape handler live in unchanged template code.

### Strengths

- arrowStyle has a real RED per part (reply dash, leaving warn, active 2.8, cap line), matching the "each part fails alone" criterion.
- Guards against vacuous passes: `small.length > 0` in fitAt1440, `before.length === 5` in arrowStyle, `opened` in panelEscape.
- No production code changed; the report says so and the diff agrees.

### Can each new check fail? (read of the check code)

- fitAt1440 (page-check.ts, new block 2): yes. It compares `.fig` scrollWidth to clientWidth for every card whose SVG is at most 860 px. Added card or `.fig` padding that narrows `.fig` below the SVG width makes sw > cw and fails. A figure that grows past 860 drops out of the filter instead of failing, which is correct per the rule. Slack: report shows widest 856 in 898, so only a padding regression of more than 42 px trips it (Minor 1).
- panelEscape (block 3): yes. It requires the panel open first, presses Escape on a menu link (focus moved off the summary by the press target), then asserts `details.open === false` and `activeElement` is the summary. A missing close or missing focus return fails either clause. Not satisfied by the initial click focus, because the key press targets a link.
- "Shown in" link (page test): yes. The regex is tied to the `<td>sql</td>` row (tempered start stops at `</tr>`, lazy end stops at the same row's `</tr>`), then requires `<a href="#ch-05-s1">Links</a>` inside it. Dropping the link, or linking the wrong chapter, fails. A link in a different row would not satisfy it.
- arrowStyle: yes, RED shown for all four parts. The leaving check pairs the `var(--warn)` attribute with a computed-stroke difference from a plain call, so a CSS override that flattens the colour also fails.
- Conventions note: yes, RED shown in both tests; exact-string `p.note` and `- ` line.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

- page-check.ts fitAt1440 block: the check passes with 42 px of slack (856 in 898), so the card padding regression the audit names (G2) is caught only when it is large. Fix if wanted: also assert `cw >= svg` per figure with a smaller bound, or compare `.fig` clientWidth to the 870 px design value.
- page-check.ts arrowStyle caps query (`g > path[stroke-width="1.2"]` in #fig-level-system): the constant 1.2 is copied from the drawing code and the selector does not tie the path to a store node, so another 1.2 px path inside a `g` would satisfy it. RED shown (0 cap lines) so it can fail, but not alone for the store-specific rule.
- Report: no mutation run for fitAt1440, panelEscape or the "Shown in" assertion (report states this). Reading shows each can fail; a one-line local break of each (e.g. add 60 px padding to `.fig`, remove the Escape handler, drop the Shown in link) would confirm it.

### Assessment

**Task quality:** Approved
**Reasoning:** Every new check has a path to failure that matches the audited regression, with RED captured for arrowStyle and the conventions note and a sound read for the other three; remaining points are tightness, not correctness.

## Ledger lines

Task 14: minor (deferred): fitAt1440 passes with 42 px slack (856 in 898), so only a large card-padding regression fails it.
Task 14: minor (deferred): arrowStyle cap query matches any g > path with stroke-width 1.2, not specifically a store node.
Task 14: minor (deferred): no mutation RED run for fitAt1440, panelEscape or the Shown in link assertion.
