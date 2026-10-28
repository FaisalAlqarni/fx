# Task 12 review (c66b2e9..ad4dd8a)

### Spec Compliance
- ❌ Issues found: explicit `--archify` is overridden by a saved or given `cheap` (src/lib/sf-build.ts, the `archify` const).
- Ran nothing; read the diff and its tests. Rulings 16, 17, 18, 19 are met: finalize args carry `--receipt`, the theme test asserts `--text` equals `--ink` in light, dark media and dark, choices are saved after the stamps and only when flags were given, the fake fails `name` and `name-p`.
- Process calls use `spawn(process.execPath, args)` with no shell. Lookup order matches Global Constraints. `--archify` is never saved; the test asserts no absolute path in `.fx.json`.
- The Tests-line `themeCss` conflict is resolved by ruling 16 as the implementer did.

### Strengths
- Real tests for the order, the pool bound of 4, retry sizes, fallback receipts, idempotence and no persistence on a failed build.
- `runArchify` is small and has no shell.

### Issues
#### Critical (Must Fix)
None.
#### Important (Should Fix)
- sf-build.ts `const archify = prefer === 'cheap' ? undefined : opts.archify ?? ...`: Global Constraints say `--archify <dir>` when given, and only otherwise "unless prefer is cheap". The unprompted "cheap beats explicit --archify" decision contradicts that order. Make `opts.archify ?? (prefer === 'cheap' ? undefined : findArchify(...))`, and decide `svgReason` for cheap separately, or record the ruling.
#### Minor (Nice to Have)
- Stale `-pN` archify pages stay on disk when a retry succeeded and then fails on a later build, or fails after the retry (reported by the implementer); no cleanup.
- No retry when the limit is already 5 or less: reasonable, but the brief says a failed sequence gets one retry; undocumented outside the report.
- `runArchify` judges success by exit code and output file only; it never reads the receipt, and the brief says "reads the receipt". It also has no timeout, so a hung archify hangs the build.
- Fallback line names a receipt path from the expected location even when archify wrote none (`receipt` null is ignored).

### Assessment
**Task quality:** Needs fixes
**Reasoning:** Everything named in the risks holds except the cheap-over-explicit-`--archify` precedence, which breaks the stated lookup order.

## Ledger lines
Task 12: minor (deferred): stale -pN archify pages remain on disk after a failed retry or a later fallback.
Task 12: minor (deferred): no retry when the page limit is already 5 or less; behavior is undocumented outside the report.
Task 12: minor (deferred): runArchify never reads the receipt and has no timeout.
Task 12: minor (deferred): fallback line names an expected receipt path even when archify wrote none.
