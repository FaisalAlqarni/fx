### Spec Compliance

- ❌ Issues found: all 13 families produce the spec spans and the reviewUnits cases pass by reading, but the Ruby and Python body rules misread common real code (Important 1 and 2 below). Interfaces, `languageOf` table, `check-all` single line (scripts/check-all diff, after judge-score.test.js), generated files and the C16 5,000 ms bound (src/lib/function-split.test.ts:681) all match the brief.
- ⚠️ Cannot verify from diff: the cherry-pick of the one `scripts/check-all` line onto judge-across-fx (task 02 touches the same file); controller checks after the pick. Ruling C10 (13-family count check) belongs to task 11, not checked here.

Probes below were run as `scripts/scratch-env node -e` against the committed `lib/function-split.js` (no files written); I did not re-run the suite.

### Strengths

- One linear pass per file: strings, char literals and comments masked once (src/lib/function-split.ts:723-767), braces paired by a single stack (:846-852), line lookup by binary search (:858-866). `reviewUnits` sweeps changed lines against the unit list with a stack, no per-line rescans (:1000-1015).
- `splitFunctions` and `reviewUnits` wrap everything in try/catch and return `[]`, matching "never throws". `reviewUnits` drops out-of-range and non-integer lines and de-duplicates.
- Unclosed `{` yields no unit rather than a bogus one; changed lines then fall to hunk units, which is the right failure direction.
- Valid RED: `MODULE_NOT_FOUND` for `./function-split.js` before the module existed; GREEN and `ALL GREEN` reported. Tests use the spec's literal sources, so expected values come from the spec, not the code.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)

1. src/lib/function-split.ts:937 · Ruby: `/(?:=|\breturn|\|\||&&)\s*(?:if|unless|...)/` counts the modifier guard `return if x` / `return unless x` as a block opener, but it has no `end`. Every such guard leaves a stray frame, so later `end`s pop the wrong frame and spans shift. Probe: `class A / def one(x) / return if x / 1 / end / (blank) / def two / 2 / end / end` gives `one 2..10` (true 2..5). `return unless`/`return if` is the most common Ruby guard, so Ruby units become wrong across a whole file, and a changed line in the overshoot reaches a lens under the wrong unit. Fix: drop `\breturn` from the alternation (a `return if ... end` block form is rare); add a test with a guard clause. The `x = 1 unless y` modifier form is handled correctly (probe: `one 2..5`).

2. src/lib/function-split.ts:887-895 (`indentEnd`), used by python (:981) and fsharp (:982) · a signature wrapped over several lines (Black style with trailing comma, a closing parenthesis and colon back at the def's indent) ends the unit at the last parameter line, because a closing parenthesis and colon is not deeper than the signature, so the loop breaks before the body. Probe: `def f` and an open parenthesis / `    a,` / `    b,` / a closing parenthesis and colon / `    x = 1` / `    return x` gives `f 1..3`; the body is outside every unit. This follows the brief's literal rule ("lines indented deeper than the signature"), so it is **plan-mandated**, but it is the normal shape of long Python signatures and shrinks the unit to the parameters. Body changes still become hunk units, so no line is lost, but the lens loses the function. Fix: skip lines until the paren depth returns to 0 (or a line ending in `:`) before applying the indent rule; amend the brief.

#### Minor (Nice to Have)

1. src/lib/function-split.ts:781-786 (rule 4) with :831-840 · a statement-start call without `;` followed within 4 lines by a `{` is read as a definition. Probe: `render(x)` / `const y = {` / `  a: 1,` / `}` gives `render 1..4`. Semicolon-less TS/JS and `promise(x)` / `.then(() => {` chains give bogus innermost units named after the call. Fix: require the `)` to be followed on the same line by `{`, `:` or an arrow for the plain-call rule.
2. src/lib/function-split.ts:836-839 · a return type holding `=>` (`function m(): () => void {`) hits the `=>` branch and returns ONE_LINE; probe gives `m 1..1`. The report lists this as a known miss, but it yields a wrong short unit, not a hunk fallback. The same applies to a body-less signature followed by a braced one (Kotlin `fun a()` then `fun b() {` gives `a 2..4`; interfaces and Swift protocols).
3. src/lib/function-split.ts:1009 · hunk grouping measures the gap to the previous orphan line, not "the previous changed line" as the brief says; `[2, 4(in a function), 6]` gives two hunks where the literal brief gives one. The chosen reading is arguably better, but it differs from the text; confirm with the controller or note it in task 11.
4. src/lib/function-split.test.ts:679-682 · the size test feeds `'{'.repeat(200000)`, which has no signature line, so it only exercises `mask` and the brace stack, not `bodyEnd`/`matchParen` on a large file with many signatures. It cannot catch a quadratic regression in the part most likely to have one.
5. src/lib/function-split.test.ts · only the spec sources are covered (report concedes this). No test for the guard clause, wrapped signatures, C# expression bodies over several lines, or nested Ruby blocks, which is where Important 1 and 2 hide.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** The 13 spec fixtures pass and the engine is linear and fail-safe, but the Ruby guard-clause rule (`return if x`) corrupts spans file-wide on ordinary Ruby, and the Python wrapped-signature case drops the body from the unit.

## Ledger lines

Task 10: minor (deferred): plain-call rule (rule 4) reads a semicolon-less call followed by a `{` within 4 lines as a definition (`render(x)` / `const y = {` gives `render 1..4`)
Task 10: minor (deferred): `=>` in a return type gives a one-line unit, and a body-less signature followed by a braced one swallows the next function (Kotlin interface, Swift protocol)
Task 10: minor (deferred): hunk grouping gap is measured from the previous orphan line, not the previous changed line as the brief words it
Task 10: minor (deferred): the 200 KB size test has no signature lines, so it does not bound `bodyEnd`/`matchParen` on a large real file
Task 10: minor (deferred): tests cover only the spec sources; no guard clause, wrapped signature or multi-line expression-body cases
