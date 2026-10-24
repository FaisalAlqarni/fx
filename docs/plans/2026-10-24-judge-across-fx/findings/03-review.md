### Spec Compliance

- ✅ Spec compliant. Every file in the task list has its hunk except `lib/types.js` (types-only change, compiles to identical output, reported) and `src/lib/shell-guard.test.ts` (no edit needed, ruling C8 hands it to task 04). Rulings checked: C11 holds (one `STOP_SENTENCE` at src/lib/stop-check.ts:42 used by `skipsLaneHint` in src/lib/lane-hint.ts, src/hooks/fx-codex.ts and src/hooks/fx-turn.ts; no other copy of the regex in src, hooks or plugins; one pure `breakerOpen` at src/lib/judge-call.ts:22 used by both journal breakers, and the old copy is gone from shell-guard.ts). C12 is a wording ruling, no code. F5 holds (separate `judge` / `feature-judge` kinds, cross-tests at judge-call.test.ts and lane-hint gate cases 11 and 12). The "task 03 concern 1" ruling covers session-input.ts, stop-check.ts and test-scope.test.ts; all three hunks are minimal and needed (session-input.ts:38 parses `feature-judge`, without which the features' breaker never reads its events back).
- Shell guard behaviour: the circuit-open log line keeps its shape (no `latencyMs`, shell-guard.ts hunk at "An open breaker sent no request"); other result lines unchanged. Callers checked: `shellGuard` is the only user of the removed `breakerOpen`/`appendEvent` path in shell-guard.ts; `grep` over src shows no other `kind === 'judge'` reader.
- ⚠️ Cannot verify from diff: Codex's own hook timeout for `UserPromptSubmit`. hooks/hooks.json sets `timeout: 5` for Claude Code only; no Codex hook config appears in the diff or my checks. The 2,500 ms bound is safe under 5 s on Claude Code. The controller should confirm Codex's default is not shorter than about 3 s.
- ⚠️ Cannot verify from diff: `scripts/check-all` printing `ALL GREEN` (acceptance criterion 7); the report claims it. I did not re-run it.

### Strengths

- Breaker move is faithful: `askJudgeWithBreaker` (src/lib/judge-call.ts:30-42) reproduces the old rule line for line (open check only for a ready handle and non-null key; append on `down` or on any result after a failure) and the 3-vs-3 cross tests in judge-call.test.ts pin both directions.
- `decideLaneHint` follows the spec order exactly and logs one line on every judged path; the `deciding` answer selection (lane-hint.ts, `choiceVerdict(kindAnswer) === 'other' ? research : kind`) is correct for case 3 (`low-top` escalate) and cases 4, 4a, 4b.
- The deadline rule is computed from `start` taken just before the first request and compared against `JUDGE_BUDGET_MS` (lane-hint.ts:1762), giving the `deadline` reason with only one request, as case 10a needs.
- Hook output is always the JSON form, after the prompt is journaled (fx-turn.ts: `appendPrompt` precedes `decideLaneHint`); subagent path returns before any judge call.
- Valid RED for each piece: compile-time RED for judge-call and lane-hint (module missing), runtime RED for fx-json, repo-config, featureMode and the gate; the codex-hook-output test was written after code but the report shows it bites against the old `fx-codex.js`.
- Tests use real process seams and the fake server, not mocks of the code under test; the two-breaker independence is tested both ways at unit and process level.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

1. src/tests/gates/lane-hint.test.ts (case 10b, the `delayMs: 600` first answer) and src/lib/lane-hint.ts:1762 · Flakiness of 10b: not flaky on an idle machine, fragile under load. The run is deterministic (a 600 ms server delay plus the judge's 1,500 ms abort timer, judge.ts:93, so about 2,100 ms), plus the measured `ms` includes node start, module requires, a `git` call in `readRepoConfig`, the journal write and the log write (hook-env.ts:75-83 times from spawn to close). That leaves roughly 200 to 350 ms of margin against `r.ms < 2500`; a CPU stall of that size on WSL2 (parallel build, antivirus, cold disk cache) fails the case with no code defect. The same arithmetic shows the product bound is nominal: a first answer at 999 ms still sends the second, so a hint can run to 2,500 ms plus start-up, above the "never longer than 2,500 ms" wording. Fix: lower 10b's first delay to 300 ms (the case only needs it under 1,000 ms) to buy about 300 ms more margin, and say in the brief or code that 2,500 ms bounds the judge time, not the process. A stricter fix is to give the second request only the remaining budget, which needs an `askJudge` timeout parameter.
2. src/hooks/fx-turn.ts (`require('../lib/stop-check')` before `appendPrompt`) and src/hooks/fx-codex.ts `recordPrompt` · The Stop-sentence test used to be a regex literal with no module dependency; it now needs `lib/stop-check` to load before the prompt is journaled, so a broken stop-check module costs the journal record as well as the Stop feature. Fails open and was reported, but the journal is the judge's context for the shell guard. Fix: require inside a nested try, or export the regex from a tiny module with no imports.
3. src/hooks/fx-turn.ts (`input.cwd ?? process.cwd()`) vs src/hooks/fx-codex.ts (`input.cwd || process.cwd()`) · The two entry points disagree on an empty-string `cwd`: Claude Code passes `''` to `featureMode`/`readRepoConfig`, Codex falls back to the process directory. Use one form (`||`).

## Ledger lines

Task 03: minor (deferred): case 10b has about 200 to 350 ms of margin under its 2,500 ms limit (600 ms first delay plus 1,500 ms timer plus process start-up); lower the first delay to 300 ms, and note that 2,500 ms bounds judge time, since a 999 ms first answer still sends the second request.
Task 03: minor (deferred): fx-turn.ts and fx-codex.ts now load lib/stop-check before journaling the prompt, so a broken stop-check module loses the journal record; load it in its own try or from an import-free module.
Task 03: minor (deferred): fx-turn.ts uses `input.cwd ?? process.cwd()` while fx-codex.ts uses `||`; an empty cwd behaves differently on the two harnesses.

### Assessment

**Task quality:** Approved
**Reasoning:** The breaker move, the two-breaker separation, the deadline rule, the five log shapes and both hook outputs match the brief and the rulings, with valid RED evidence and process-level tests. Case 10b is the thinnest margin and can fail under heavy load, but the cause is test timing headroom, not a logic defect.
