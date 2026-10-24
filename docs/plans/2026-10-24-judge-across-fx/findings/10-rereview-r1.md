### Finding verdicts

- **Important 1, Ruby `return if x` / `return unless x` counted as a block opener**: ADDRESSED. `\breturn` is gone from the opener alternation (src/lib/function-split.ts, diff hunk at the Ruby splitter; lib/function-split.js mirrors it). The new test `ruby guard clauses` (src/lib/function-split.test.ts) covers `return if`, `y = 1 unless x` and `z += 1 while z < 3` and expects `one 2..7`, `two 9..11`. Probe against lib/function-split.js with `return unless x` plus a real `x = if x ... else ... end` block: `one 2..9`, `two 11..12`, both correct (the assignment block form still opens and closes).
- **Important 2, Python/F# wrapped signature ends the unit at the last parameter line**: ADDRESSED. `indentEnd` now starts after `headerEnd` (first line where brackets balance, scan capped at 50 lines) and compares indent against the def line. Probes: `def f` and an open parenthesis / `    a,` / `    b,` / a closing parenthesis and colon / body gives `f 1..6`; `def f` opening on `a,` / `b` then the closing parenthesis, the return type and the colon / body gives `f 1..3`; a wrapped signature after an unwrapped function gives the right neighbour spans (`f 1..2`, `g 3..6`); a method with a an open parenthesis character string default still gives `m 2..4`; F# `let g` opening on `a: int,` / `b: int` then the closing parenthesis and `=` / body gives `g 3..5`, and the following `let h = 1` is not a unit. Consistent with the controller ruling in state.md (body starts after the line closing the signature, indent measured from the def line). Tests `python wrapped signature` and `fsharp wrapped signature` added.

### New breakage in the fix diff

None. Checked: a one-line `def g(): pass` stays `8..8`; an unclosed bracket costs at most 50 lines per definition (bounded, no quadratic scan); the F# regex alternative `[^=\n]*\([^)=\n]*$` only adds first lines with an open paren and no `=`, and `let h = 1` still fails the parameter lookahead. The report is honest that the Python RED was not observed separately; the Python probe above shows the fix works, so I do not rate that.

### Out-of-scope observations

None.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ledger lines

Task 10: fix round 1/5 (2 addressed, 0 open: none; commits 9f89547..eca039c)
