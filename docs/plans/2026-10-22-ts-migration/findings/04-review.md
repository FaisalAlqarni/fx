# Task 04 review: plan state and preamble in TypeScript

Range 9b31c47..fc6ece4. Read from the diff and the brief; the suite was not re-run and the baselines were not regenerated.

### Spec Compliance

- src/lib/fx-json.ts: matches. Per-key validation, a bad key is left out of `value` and listed in `problems`, `ok: false` only for a non-object, reason strings exactly as the task gives them (`stacks must be an array of strings`, `.fx.json is not an object`). The four spec inputs are asserted with exact values in src/lib/fx-json.test.ts. Extra: `coverage_floor` and command-key cases, which the `FxJson` shape needs. Arrays count as objects, which keeps `[]` rendering as today.
- src/lib/plan-state.ts: matches the old logic line by line as far as read (scan, standingRulings, rulingsFor, names, describePlans). The unreadable state.md fallback is the same: still counted as a ledger, not complete. The `?? ''` and `?? n + 1` guards give the same results as the old unchecked indexing.
- src/lib/preamble.ts: keeps the extensionless `./plan-state` specifier, `render` and `HARNESSES` kept. The `.fx.json` fallbacks match the old code: JSON null still produces the "error" note, other non-object roots still mean no override.
- Fixtures under tests/gates/fixtures/plan-state/ do not use this repo's docs/plans. Matches.
- scripts/check-all runs `node lib/fx-json.test.js`. Matches.
- Missing: the baseline equivalence (eight renders, four describePlans outputs) is not in any committed test. See Important 1.
- ⚠️ Byte-identical renders: unverified from the repo. Only the report's own claim, from a scratch script outside the repo.

### Strengths

- The parser is small, has no cast and no import, and `value[key] = v` type-checks because the key union is a typed array. The replacement for `as const` (`COMMANDS: CommandKey[]`) is sound: the key type is explicit and `value[key]` stays checked.
- Preamble companions path reproduces the old error-class behaviour without leaking JSON.parse messages.
- The report is honest about concern 2.

### Issues

#### Critical

None.

#### Important

1. tests/gates/fixtures/plan-state/ (all of a to d) · No committed test reads these fixtures and no recorded expected output is committed. The acceptance criterion "the eight recorded preamble renders are identical" and the "describePlans equals recorded output" tests are satisfied only by a scratch script outside the repo (report concern 2). The existing tests build their own temp trees (lib/plan-state.test.js:19), so they do not use the fixtures either. The fixtures are dead files and the equivalence cannot be re-run or regressed. Fix: commit the recorded outputs (or a generated-from-baseline JSON) and a test, for example tests/gates/plan-state-equivalence.test.js (or a .ts source), that renders the eight cases and four describePlans outputs from the fixtures and compares byte for byte, wired into scripts/check-all.
2. tests/gates/fixtures/plan-state/d/docs/plans/demo/state.md:1 · Fixture (d) is a normal readable file in git; mode 000 is applied by nothing committed. Without the chmod, (d) is just a readable non-complete ledger and does not exercise the unreadable path. Fix: the equivalence test from Important 1 applies chmod 000 at run time on a copy in a temp dir (so the checkout is never left unreadable), restores it in a finally block, and skips when `process.getuid() === 0`, as the brief says.

#### Minor

1. src/lib/preamble.ts:131 · The `(_, name)` replace callback takes `name` as an implicit `any` from the lib signature; the no-escape gate does not see it. Fix: annotate `(_: string, name: string)`.
2. src/lib/preamble.ts:21-22 · Two blank lines after the imports (leftover). Fix: remove one.

### Assessment

Code port is faithful and the types are real. The task's main safety net, the recorded-baseline equivalence, exists only outside the repo, so the acceptance criteria are not proven by committed tests and fixtures (d) in particular tests nothing. Add the committed equivalence test and this is ready.

Spec: ⚠️ (1 unverifiable from the repo). Quality: changes requested.

## Ledger lines

Task 04: minor (deferred): preamble.ts replace callback `name` is an implicit any; annotate the parameters.
Task 04: minor (deferred): preamble.ts has a doubled blank line after the imports.
