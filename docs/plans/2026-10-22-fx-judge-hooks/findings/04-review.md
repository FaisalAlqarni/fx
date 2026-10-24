### Spec Compliance (✅ / ❌ with file:line; ⚠️ cannot verify)

- ✅ `judgeHealth` contract, `src/lib/judge-health.ts:683-713`:
  - `none` returns null with no request.
  - `invalid` and unavailable lines match the spec text. The reason is the `UnavailableReason`, and `machinePaths().judgeConfig` supplies the path.
  - The probe is the same `noul` `probe` question as `judge-cli check`. I did not diff it against the `judge-cli` source.
  - Every non-null result is logged once with `event: 'health'`.
  - A catch-all makes it never reject.
- ✅ Claude SessionStart, `src/hooks/fx-context.ts:579-588`:
  - With a line, `additionalContext` is `trimEnd()`, a blank line, the line and `\n`, plus top-level `systemMessage`.
  - Without one, `text` is passed through untouched, so the output has the same shape as before. The gate compares stdout to the golden file (`src/tests/gates/judge-health.test.ts:1009-1012`, `:1036-1046`).
- ✅ SubagentStart never probes: the call is gated on `hook_event_name === 'SessionStart'` (`fx-context.ts:579`, `fx-codex.ts:493`). The gate case uses a server returning 500 and asserts 0 requests (`judge-health.test.ts:1048-1056`).
- ✅ Codex, `src/hooks/fx-codex.ts:490-525`:
  - The trust sentence is appended with a leading space (`:501`).
  - The order is notice then health line in `additionalContext`, and `systemMessage` is the lines joined with `\n`.
  - With neither line, output is unchanged: `notice` is `string | null` (`:265`), so the filter cannot let an empty string through.
- ✅ Journal prune at start: both hooks call `pruneJournals(Date.now())` on SessionStart. `journal.ts:72-81` deletes only `*.jsonl` in `sessions/` and never throws. The gate checks that 8-day-old `old.jsonl` is removed and 1-day-old `new.jsonl` stays (`judge-health.test.ts:1058-1071`).
- ✅ Typed requires inside `try`: a failed load skips the prune and the line, never the preamble (`fx-context.ts:546-557`, `fx-codex.ts:494-502`).
- ✅ `test-scope.ts` hooks rule, `test-scope.test.ts` and `scripts/check-all` are updated. Codex tests run under `scratchHookEnv()`, with the `garbage` spawn in `codex-manifest` now given an env.
- The three additions beyond the file list:
  - ✅ `session_id` on `CodexHookInput` and `parseCodexHookInput` (`src/lib/hook-input.ts:+41`, `src/lib/types.ts`): needed for the log's session field, and it parses a string or undefined as the other fields do.
  - ✅ `ClaudeContextOutput.systemMessage?`: required.
  - ✅ `src/scripts/test-scope.test.ts`: it asserts the rule that was changed, so it has to move with it.
- ⚠️ `docs/plans/2026-10-22-fx-judge-hooks/state.md` is in the diff but not in the file list. The diff shows only controller bookkeeping lines (`Task 04: dispatched`). I cannot tell from the diff alone whether the implementer or the controller wrote them.
- ⚠️ "`scripts/check-all` prints ALL GREEN": the report claims it through `scripts/test-scope`, and I have no shell to confirm it.
- ⚠️ "Process finishes under 2,500 ms with a 3,000 ms server": the test asserts it (`judge-health.test.ts:1029`). I could not run it.
- ⚠️ The Claude 5 s hook budget with a dead judge: one probe at 1.5 s plus a sync prune fits the budget, but I could not measure it.

### Strengths

- The pass-through branch keeps the exact old expression (`: text`), so byte-identity holds by construction and is asserted against the golden fixture.
- The SubagentStart test uses a live server that answers 500 and asserts zero requests. That proves "never probes" better than the spec's closed port, which would also fail if a probe were made.
- The Codex gate exercises the real notice-then-line ordering on a fresh `CODEX_HOME` and derives the notice by slicing the output. It does not copy the notice constant from the implementation.
- `judge-health.test.ts` builds expected lines from `path.join` and the `TAIL` literal, so there is no tautology against the implementation.
- The prune runs before the probe, and `pruneJournals` never throws, so a prune failure cannot cost the health line.

### Issues

#### Critical
None.

#### Important
None.

#### Minor

- `src/tests/gates/judge-health.test.ts:1076-1092`: the Codex process gate covers only no-config and invalid-config. A dead or healthy judge on Codex, the Codex-only `await judgeHealth` path and `session_id` parsing have no test, so a regression in the Codex probe would pass. `src/lib/hook-input.test.ts` also has no assertion for the new Codex `session_id` field (`:57` still tests only `tool_name`, `agent_id` and `agent_type`). Fix: add one Codex case with a 500 server expecting the trust hint, and one `session_id` assertion.
- `src/tests/gates/judge-health.test.ts:1029`: `r.ms < 2500` is wall-clock on a loaded CI box with a process spawn plus a 1,500 ms budget, so it may flake. This is the spec's own number, so it is minor.
- `src/hooks/fx-context.ts:546-557` and `src/hooks/fx-codex.ts:490-503`: the same prune-then-probe block appears in both hooks. This follows the plan's "typed require inside try" rule, so it is not a defect, but a future change to the order or a catch must be made twice.
- `src/hooks/fx-context.ts:552` and `src/hooks/fx-codex.ts:499`: `input.session_id ?? null` keeps an empty string, which would be logged as session `""`. The design says a payload with no session id gets no journal. Fix: `|| null`.
- `src/lib/judge-health.test.ts:632-635`: the unit test sets `XDG_CONFIG_HOME='/c'` and the state variables process-wide at module load and never restores them. That is harmless in a single-purpose test process, and `HOME` is not set (Linux path resolution uses XDG).

Tripwires the report's `Tripwires:` line missed: none beyond the silent-failure line it already names. I checked the unredacted line shown to the user and model: `parseJudgeConfig` rejects userinfo, query and fragment (`src/lib/judge-input.ts:82-84`), so the displayed `base_url` cannot carry a secret. The log write is redacted (`decision-log.ts:42`).

### Assessment

**Task quality: Approved**

Reasoning: every spec item I could verify from the diff is met, and the default path keeps today's output byte for byte. The main residual risk is thin Codex coverage of the dead-judge path, which is Minor. The ⚠️ items are runtime claims (ALL GREEN, timings) that the controller's own run must confirm.

I did not rerun any test and did not read the elided generated-JS context beyond the shown hunks.

## Ledger lines
Task 04: minor (deferred): no Codex process test for a dead or healthy judge, and no `session_id` assertion for `parseCodexHookInput`.
Task 04: minor (deferred): 2,500 ms wall-clock assertion in the slow-judge gate may flake on a loaded machine.
Task 04: minor (deferred): the prune-then-probe block is duplicated in `fx-context.ts` and `fx-codex.ts`.
Task 04: minor (deferred): `session_id ?? null` lets an empty string through as the logged session; use `|| null`.
Task 04: minor (deferred): `judge-health.test.ts` (unit) sets XDG env vars process-wide and never restores them.
