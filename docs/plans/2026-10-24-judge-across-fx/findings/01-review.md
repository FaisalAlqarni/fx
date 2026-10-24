### Spec Compliance

- ✅ Spec compliant for every file in the task's Files list (each has a hunk) and for rulings C1, C2, C6, C14, "task 01 concern 1/2/3" and the mock noul-form note. Checked against the diff: question wording, option order, `KIND_LANES`, state builders, verdict functions, `FEATURE_BARS` (edit-rules `minConfident: 25` per ruling C2), all-`log-only` gate, empty `REFUSING_RULES`, `sequential`, scoring formulas and row formats, `scoreConcurrency` rule, `scratch-env` body (no `rm`, no `trap`, six variables plus USERPROFILE), TMPDIR in `scratchHookEnv` and `applyScratchEnv`, `test-scope` rule, `check-all` lines, exit codes 1 and 2.
- Ruling C6 holds: the opencode-v2 "Shell guard" paragraph reads "execute.before is awaited before `permission.evaluate` runs" and `src/tests/gates/harness-facts.test.ts:2516` gates the phrase.
- Ruling "fact 4 stays MEASURED from the bundled code, probe not run" holds: the report says the probe was not run and the paragraph says it is a reading of bundled code.
- ⚠️ Cannot verify from diff: `parseLabelledSet` field order and enum sets (`src/lib/judge-set-input.ts`, `SHAPES`) against task 02's shape list, which lives in the task 02 brief. The controller should check them when task 02 writes the sets.
- ⚠️ Cannot verify from diff: `references/harnesses/opencode-v2.md` Shell guard. The paragraph it replaced said probe Q4 on 2.0.18 "contradicted another reading of the same lines". The new paragraph does not mention that contradiction. I re-checked two of its needles read-only in `~/.opencode/bin/opencode` with `strings`: the execute.before adapter that wraps the callback in a try and catch and the trigger call for the permission evaluate event are both present. Ordering of the before hook and the shell tool's permission call (points 3 and 4 of the paragraph) was not re-checked. Task 05 and the task 08 process tests are the check that would catch a wrong reading.
- ⚠️ Cannot verify from diff: report deviation 7 says `codex --version` was run once against the real home, which the brief's "never run a binary against the real home" does not allow. The controller may want to confirm nothing under `~/.codex` changed.

### Strengths

- All pure modules match the brief's wording and formulas line for line (`lib/judge-questions.js:281-408`, `lib/judge-score.js:572-620`); the tests assert the brief's numbers (88%, 0.15, 28/30, 0.8, the `concurrencyRow` string).
- `askPaired` groups by identical state and scope, so a pair never mixes edits, and the fake-server gate asserts the real request shapes `[['r0','r1'],['r0']]` and the 2-question cap (`src/tests/gates/judge-calibrate.test.ts:2640-2641`).
- Valid RED for the new modules (missing module, runtime) and a compile-time RED for the `decision-log` event names; the report discloses the cases written after the code and shows one mutation proving the dispatch-sizing case can fail.
- The scratch-env gate checks all six variables are inside the named directory, differ from the caller's HOME and exist (`scratch-env.test.ts:2679-2684`).
- Fact paragraphs carry the needle and what it showed; the harness-facts gate checks heading, date, version and the C6 phrase, and the Shell guard paragraph names no OpenRouter.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

- `src/scripts/judge-calibrate.ts:2390-2399` · the unbudgeted warm-up `fetch` (comment, `baseUrl !== 'mock'` guard, `/v1/systemone` URL, `redirect: 'error'`, 120 s timeout, `.then((r) => r.text(), () => '')`) is a second copy of `src/scripts/guard-calibrate.ts:68-78`; the "no usable judge" line at `judge-calibrate.ts:2379` is a copy of `guard-calibrate.ts:64`. A third calibrate script (task 02 and later) would copy it again, and a change to the warm-up (a header, a timeout) would have to land in each. Fix: export one `warmUp(config)` from `src/lib/judge.ts` (the module that already builds the same URL at `judge.ts:97`) and call it from both scripts.

#### Minor (Nice to Have)

- `src/tests/gates/judge-calibrate.test.ts:2573-2588` · the lane-hint process case only exercises `kind: change`. The second-request path (`build`, `review`, `writing` then `{ lane: laneQuestion(kind) }`, latency summed across both requests, `askLanes` at `judge-calibrate.ts:2293-2299`) and the `other` plus `research` path have no process test, so a break in the scorer for the most common lane kinds would pass `check-all`. Add a mock with `kind: build` and a `lane` answer.
- `src/scripts/judge-calibrate.ts:2360` · sequential latencies are pushed whether or not the request succeeded, while failed concurrent requests are dropped from the latencies. A judge that fails fast one at a time lowers the sequential median that `scoreConcurrency` compares against. Count failed sequential requests separately or stop the run.
- `references/harnesses/claude-code.md` (new MEASURED paragraph) · it is dated and versioned "Claude Code 2.1.278", but the paragraph itself says ADR 0031 records no version, so the version is the file's, not the probe's. The gate regex accepts it. Say UNVERIFIED for the version or cite the date of ADR 0031's runs.
- Process: report deviation 7 ran `codex --version` outside the brief's read-only rule (the version is also in the install path, so the run was not needed). Disclosed; no fix to the code.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** The task is built to spec and the TDD evidence is sound, but `judge-calibrate.ts` copies the guard-calibrate warm-up and "no usable judge" block instead of sharing one helper, which the review rubric treats as Important. The four Minor items are small.

## Ledger lines

Task 01: minor (deferred): lane-hint process test covers only kind change, not the second-request or research paths of askLanes
Task 01: minor (deferred): concurrency mode counts failed sequential requests as latencies, which can lower the sequential median
Task 01: minor (deferred): claude-code.md Agent model fact is versioned 2.1.278 though ADR 0031 records no version
Task 01: minor (deferred): codex --version was run outside the brief's read-only rule (disclosed in the report)
