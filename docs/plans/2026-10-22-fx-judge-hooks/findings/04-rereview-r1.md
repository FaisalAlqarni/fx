### Finding verdicts

**Item 1 [Important]: ADDRESSED.**

- **Failed `require`:**
  - The hook catch in `src/hooks/fx-context.ts` now calls `failedHealth`, which lazily requires `../lib/health-failure` and calls `healthFailed`.
  - In `src/hooks/fx-codex.ts` the catch does the same inline.
  - `healthFailed` (`src/lib/health-failure.ts:365-380`) writes stderr. If `judge.json` exists, it then calls `logDecision` with `event: 'health'`, `action: 'error'` and `unavailable: 'health-check-failed'`, and returns a visible line.
  - `health-failure` imports only `fs`, `fx-paths` and `decision-log`. It still loads when `judge-health` or `judge` is the broken module.
  - Test "claude: a judge-health module that fails to load…" and its Codex twin cover this path.
- **Throwing export check:** It runs inside the same hook `try`, so it reaches the same catch and the same `healthFailed`. No test makes the export check itself throw, but it shares the path the load-failure tests cover.
- **Throw inside `judgeHealth`:**
  - The catch at `src/lib/judge-health.ts` (diff line 420) now returns `healthFailed(input, e)`.
  - The test stubs `askJudge` to throw. It asserts `systemMessage` equals the failed line, the preamble is kept via `startsWith(goldenText.trimEnd())`, and the log has exactly one entry that `isHealthError` matches.
- **Fail-open:**
  - The preamble and the existing output are assembled outside the health `try`, and the diff does not touch that code.
  - The failure path is wrapped twice: `healthFailed` has its own try/catch for everything after the stderr write, and `failedHealth` and the Codex inline catch wrap the call.
  - The line text is returned to the same slot the old `judgeHealth` result used.
- **No config, output byte-identical:** `healthFailed` returns null when `existsSync(judgeConfig)` is false, so only stderr is written. Test "a broken health module with no judge.json leaves the golden output" asserts stdout equals the golden fixture, for Claude only.

### New breakage in the fix diff

1. **[Minor, needs a controller ruling] `health-check-failed` is outside the design's contract.**
   - The brief fixes two line texts: `judge config <path> is invalid (<reason>)` and `judge at <base_url> is unavailable (<reason>)`. It defines `<reason>` as the `UnavailableReason` set.
   - `src/lib/health-failure.ts:371` emits a third form, `judge config <path> is unavailable (health-check-failed)`, with a reason outside that set.
   - The same string goes into the log's `unavailable` field, so any reader that groups on `UnavailableReason` meets a value it does not know. I could not check the field's type, because `types.ts` is not in this diff and the build is reported green.
   - The deviation is defensible, since the finding required a visible line and no `base_url` is available when the probe never ran. Record it as a ruling so the final review does not treat it as drift.
2. **[Minor] The failure path can still throw in an extreme case.**
   - `String(error)` throws for a null-prototype object or a throwing `toString`, and `process.stderr.write` sits outside `healthFailed`'s inner try.
   - If `healthFailed` throws inside `judgeHealth`'s catch, the promise rejects, which breaks the "never rejects" contract.
   - The hook's `failedHealth` then retries and its fallback runs the same `String(e)` unguarded. That can drop the preamble, but only for a pathological thrown value. The old code had the same exposure.
3. **[Minor] One silent hole remains.** If `machinePaths()` is what threw, `healthFailed` returns null with no log entry and no line, so the user sees nothing again. This is lens Minor 5's scenario and is still reachable.
4. **[Minor] Codex has no covering test for the no-`judge.json` broken-module case.** Only Claude asserts byte-identical output there.
5. **[Minor] `health-failure.ts` has no unit test.**
   - It is covered only through process gates.
   - Nothing exercises the "existing judge.json but `logDecision` fails" or "`machinePaths` throws" branches.
6. **[Minor] The failure-path logic is now triplicated.** It lives in `failedHealth` in `fx-context.ts`, in the inline catch in `fx-codex.ts`, and in the `judgeHealth` catch. The hooks keep a lazy require plus a stderr fallback each. This is a duplication cost that adds to the already-deferred prune-then-probe duplication.

### Tests evidence

- **Covering tests:** four new cases exist. They cover a throw inside `judgeHealth` on Claude, a `judge-health` load failure on Claude and on Codex, and the no-config golden case on Claude. They assert the visible line, the log entry fields, and the preamble kept. Not covered: a throwing export guard, the Codex no-config case, and the `machinePaths` throw.
- **Command and output:**
  - The report names `node tests/gates/judge-health.test.js` for RED and GREEN, and a `test_scope` run over the five touched paths.
  - It gives only the last lines of the `test_scope` output. "ALL GREEN printed earlier in the same run" is a claim I cannot confirm from the report, though it does state an exit 0.
  - The report shows no `test-one.sh` invocation. The controller's SAFETY ruling asks for single tests to run through `test-one.sh`. I cannot tell whether the `HOME` and `TMPDIR` exports were applied.
- **RED:**
  - It is valid for the first case. The line is `undefined` because the behaviour is missing at runtime, and the assertion that failed is the one that matters.
  - Only the first failing case is shown, so I cannot confirm the other three failed pre-fix. They should, since they would see no line.
  - The report admits the fix was written before the test and then deleted and redone. That is acknowledged process drift, and the RED itself still holds.

## Ledger lines

Task 04: fix round 1/5 (1 addressed, 0 open: lens Important 1 closed, a visible line and a `health` error log entry on require failure, export-check throw and `judgeHealth` throw; commits fd1204e..0710cb9)
Task 04: minor (deferred): `health-check-failed` is a new reason and a third line form outside the brief's `UnavailableReason` and two fixed texts; record a ruling.
Task 04: minor (deferred): `healthFailed` can still throw on `String(error)` or the stderr write, rejecting `judgeHealth` and, in the hook fallback, risking the preamble.
Task 04: minor (deferred): when `machinePaths()` is what throws, `healthFailed` returns null with no log or line.
Task 04: minor (deferred): no Codex test for a broken health module with no `judge.json` (byte-identical output), and none for a throwing export guard.
Task 04: minor (deferred): `health-failure.ts` has no unit test; its `logDecision` failure and `machinePaths` throw branches are untested.
Task 04: minor (deferred): the failure handling is duplicated across `failedHealth`, the Codex inline catch and the `judgeHealth` catch.
Task 04: minor (deferred): the report does not show a `test-one.sh` run, and "ALL GREEN" is asserted rather than shown; the RED shows only the first failing case.

Fixed ledger number: 7
