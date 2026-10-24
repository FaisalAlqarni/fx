# Task 03 review: git guard in TypeScript

Base 0943f94, head ea70b87. Reviewed against briefs/03.md and the implementer report.

### Spec Compliance

- `src/lib/git-guard.ts` exists and exports `inspect`, `splitSegments`, `stripHeredocs`, `parseGit` and `expandShellC`. The generated `lib/git-guard.js` carries the generated header, `"use strict"`, and the esbuild annotation that lets the two ESM opencode plugins import the names.
- Every regular expression is byte-identical to `0943f94:lib/git-guard.js`. I compared each one line by line: base branch, attribution list, heredoc opener, here-string, the list-operator split in `fedToShell`, the redirection strips, the env-assignment test, the `-c` shell match, the token match in `parseGit`, the quote strip, and the flag tests in `alwaysBlocked`.
- `splitSegments` keeps the same quote-blind split (bare `||`, `&&`, semicolon, newline, pipe, ampersand), as `lib/plant-roles.js:275` documents.
- `GuardVerdict` is in `src/lib/types.ts:14`, with the same union the old JSDoc gave. `lib/types.js` is unchanged because the type emits nothing, so the brief's "modify lib/types.js" correctly results in no change.
- The test files are untouched (the diff names only the three source files).
- One runtime difference from the port, found by my own differential and missed by the report's 93,058-case run: see Important 1.
- ⚠️ Export shape: `module.exports` now holds getter properties (esbuild `__export`) in alphabetical key order instead of plain data properties. Every caller destructures `inspect` and no test assigns to the exports, so nothing breaks. This is the same pattern tasks 01 and 02 accepted, so it is not a finding.
- ⚠️ I did not rerun `scripts/build` or `check-all` (read-only checkout, per the dispatch), so the reproducibility and ALL GREEN claims rest on the report.

### Strengths

- A faithful port. Control flow, branch order, messages and comments match the original, and the `ponytail:` shortcut note on `fedToShell` is kept word for word.
- Every non-null assertion is justified and carries a short comment: each one follows a bounds check, sits on a `split` result, or reads a group that cannot be absent.
- `h[1] ?? h[2] ?? h[3] ?? ''` is genuinely neutral. Before, an all-undefined result pushed `undefined`, and `join` renders that as an empty string too. The comment says so.
- `terminator` typed as possibly undefined keeps the `!== null` check identical, rather than tightening it into a different branch.
- The report includes an old-against-new differential, which is the right oracle for a literal port.

### Issues

#### Critical

None.

#### Important

1. `src/lib/git-guard.ts:235` and `src/lib/git-guard.ts:248` · `inspect` now coerces with `String(command)` where the old code passed `command` straight to the regex `test`. `String()` converts a Symbol without throwing, and the regex's internal coercion threw a TypeError. Old: `inspect(Symbol('git push -f'))` threw, and every caller (`hooks/fx-pretooluse.js:74`, `hooks/fx-codex.js:184`, `plugins/fx-opencode-v1.js:250`, `plugins/fx-opencode-v2.js:133`) turns a throw into a deny. New: it returns `{ allow: true }`. I confirmed this by running both builds in a scratch directory. The dispatch names this tripwire directly: a typing change that turns a throw into a pass, in security code. A Symbol cannot come out of a JSON hook payload, so I found no live exploit, but the guard's fail-closed contract no longer holds for every input the old guard refused, and the report says "no runtime change". · Fix: coerce with a template literal (backtick, dollar, brace, `command`, brace, backtick) at both places. It applies the same ToString the regex used, so it throws on a Symbol and on a throwing `toString`. tsc strict accepts `unknown` in a template literal. Add a Symbol case to the differential before calling the port literal.

#### Minor

1. Report "TDD evidence" · RED replaced the whole module with stubs that throw. The brief asked for "a deliberately broken branch in the source, seen failing, then reverted". A throwing stub proves only that the tests load the module; it does not show that the fixtures catch one wrong rule. The differential partly makes up for it. · Fix: for later guard work, break one rule (for example, drop the `-D` check) and record the fixture failure.
2. `src/lib/types.ts:12` · the comment says `lib/git-guard.ts`; the file is `src/lib/git-guard.ts`. · Fix: correct the path.

### Assessment

The port is careful and almost exact. The one behaviour change is small and unreachable from JSON, but it is precisely the class of change this task promised not to make, in code whose job is to fail closed. The change set needs fixes: a one-line change at two sites, then a rerun of the differential with a Symbol input added.

## Ledger lines

Task 03: minor (deferred): RED used throwing stubs, not one broken rule as the brief asked.
Task 03: minor (deferred): src/lib/types.ts GuardVerdict comment names lib/git-guard.ts instead of src/lib/git-guard.ts.
