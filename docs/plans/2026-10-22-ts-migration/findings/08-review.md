# Task 08 review: node scripts in TypeScript

Range 8fa500b..f9e5c22. I ran the old and new scripts on the same inputs in scratch copies of both commits.

### Spec Compliance

- All three outputs are extensionless and mode 100755 in the index (`git ls-files -s`). Line 1 is the shebang and line 2 is the generated header.
- test-scope: `--dry-run` and `--built-path` output is identical old and new on three path sets. The `src/` mapping is kept.
- compile-brief keeps its own `.fx.json` read and does not use parseFxJson. A `null` file and a syntax error give the same messages and exit 2 as before.
- build-cost matches on valid input. Three behaviour changes on malformed input are judged under Issues. The design says "each parser reproduces today's behaviour", so two of them miss the spec.
- No test file changed. I did not re-run the suite.
- Extra: none. Missing: none beyond the malformed-input fidelity below.

### Strengths

- Every `JSON.parse` goes through `parseJson`. There is no `as` cast and no `any` in the three sources.
- The shortcut in `isObj` is marked and states its limit.
- `src/lib/plan-state.js` is imported by the same relative path, with no bundling.
- compile-brief keeps its exact `null` TypeError text deliberately. That shows care for error fidelity.
- The report states the missing RED and the behaviour differences openly.

### Issues

#### Critical

None.

#### Important

- src/skills/fx-implement/scripts/compile-brief.ts:100-101 · A `.fx.json` whose `stacks` is not an array (`"abc"`, `{}`, `5`) now compiles a brief with `## Stack` = `None.` and exits 0. The old script crashed (`names.map is not a function`, exit 1). The report calls this "a TypeError reported as a parse error", which is wrong: `.map` ran outside the try, so it was an uncaught crash. fx-implement now ships implementers a brief with no stack guidance and no signal. This is a silent failure the old code did not have. · Fix: when `stacks` is present and not an array, `die` with a clear message (exit 2), or throw as before. Either one is loud. Record the choice. Absent `stacks` stays `[]`.
- src/scripts/build-cost.ts:282, 293, 298, 315, 354, 386 · `new Date(x.timestamp ?? NaN)` turns a `null` timestamp into NaN. The old `new Date(null)` was epoch 0. I ran a transcript with one `null` timestamp and one real one. Old `wallClockMs` was 1767225650000 and new is 0. The same change shifts the `--task` window and the cost line fx-implement writes to the ledger. · Fix: keep the old semantics without a cast, for example type `timestamp` as `string | number | null` and use `new Date(ts ?? 0)` for null only, or add one small `toMs(ts: unknown)` that maps null to 0 and strings and numbers to `new Date(ts).getTime()`. Pin it with a test in the migrated build-cost test.

#### Minor

- src/scripts/build-cost.ts:71 · A JSONL line holding a non-object (`5`, `null`) now fails with `malformed JSON: file:line`, exit 2. Before it was an uncaught TypeError, exit 1. This is an improvement, and under `--task` the CliError becomes a "cost unavailable" ledger line instead of a crash. I accept it, but the exit code and message change for a caller that matched on them, and no test pins it. · Fix: add a case in the migrated build-cost test.
- .fx/2026-10-22-ts-migration/reports/08-node-scripts-report.md (TDD evidence) · No RED was captured. For a pure port the existing tests are an acceptable oracle for valid input, but the plan asks for a recorded old-versus-new mismatch seen failing, and that comparison would have caught both Important items above. They are exactly the cases the existing tests do not cover. · Fix: run old and new on a malformed set (null timestamp, non-array stacks, non-object line) and keep it as a test when the tests migrate.
- src/scripts/build-cost.ts:57, 68, 303 and others · `catch (e)` with `e` unused. · Fix: use `catch {` as compile-brief does.

### Assessment

Valid-input behaviour is faithful, the mode, shebang and header are right, and the types are real. Two malformed-input changes break the "today's behaviour" requirement: the non-array `stacks` case becomes silent, and the null timestamp changes reported cost and wall-clock numbers. Fix both and pin them; the third change (non-object line) is acceptable.

Spec: ⚠️ (2 deviations). Quality: changes requested.

## Ledger lines

Task 08: minor (deferred): non-object JSONL line now exits 2 with a malformed-JSON message instead of crashing; no test pins it.
Task 08: minor (deferred): no RED captured for the port; add an old-versus-new malformed-input comparison when the tests migrate.
Task 08: minor (deferred): unused `catch (e)` bindings in build-cost.ts.
