# Task 07 review: theme detector and theme.css (9005697..849d93f)

### Spec Compliance
- ✅ Spec compliant. Source order, pairs, fallback list, fonts, Material table, selectors (match fx-tokens-1.css), no import, font-face or url function, Tailwind read as text only.
- ⚠️ Cannot verify from diff: report's RED/GREEN runs (cost line unavailable; RED is described as a runtime failure on theme null, consistent with the brief's expected RED).

### Strengths
- Only strict 3 or 6 digit hex reaches CSS from docs CSS, app CSS, brand and JSON; font names pass `^[A-Za-z0-9 ]{1,64}$` before use; injection tests for both fonts and CSS values.
- Kit files and prior theme.css are excluded from detection by the `/* fx ` header; theme.css is only overwritten over our own file.
- Concerns judged: nullable `BuildResult.theme` is truthful on failed builds (same pattern as `pageBytes`), acceptable; the task 06 test change is the required consequence of filling `theme`; `docsDir` passed by the CLI avoids an import cycle and defaults to `docs`.

### Issues
#### Critical (Must Fix)
None.
#### Important (Should Fix)
None.
#### Minor (Nice to Have)
1. src/lib/sf-theme.ts:1041 `MATERIAL[name]` is a plain object lookup: `primary: constructor` yields a function, which becomes NaN in `contrast`. It is only caught because `--accent` is in a checked pair (falls back, listed with ratio NaN). Use `Object.hasOwn`.
2. src/lib/sf-theme.ts:1055 the Tailwind regex accepts 4 and 5 digit hex (`{3,6}`); on a slot outside the pairs (`border` to `--rule`) an invalid `#12345` reaches theme.css. Not injectable, but invalid CSS. Match 3 or 6 as `vars` does.
3. src/lib/sf-theme.ts:931,1115 `contrast` rounds before the threshold test, so 4.496 passes as 4.50. Compare the unrounded ratio, report the rounded one.
4. src/scripts/system-flow-theme.test.ts has no test that a Tailwind config is never executed (for example a config that would write a marker file if required), and none for `contrast` edge values.

### Assessment
**Task quality:** Approved
**Reasoning:** Every named risk holds: non-hex values and bad font names are dropped before output, pairs and fallbacks match the task's numbers, nothing fetched. Remaining items are hardening only.

## Ledger lines
Task 07: minor (deferred): Material colour lookup uses a plain object, so names like constructor give NaN; use Object.hasOwn.
Task 07: minor (deferred): Tailwind hex regex accepts 4 and 5 digit values that reach theme.css for slots outside the checked pairs.
Task 07: minor (deferred): contrast is rounded before the threshold test, so 4.496 passes as 4.5.
Task 07: minor (deferred): no test proves a Tailwind config is never executed, and no direct contrast edge tests.
