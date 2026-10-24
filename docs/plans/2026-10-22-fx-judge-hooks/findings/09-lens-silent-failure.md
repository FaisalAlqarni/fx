Lens: silent-failure, 4 findings

The tripwire holds. Every failure path in the Stop check ends in "let the turn stop", and the only trace is a stderr line.

1. [Important] `/development/fx/.worktrees/fx-judge-hooks-b/src/lib/stop-check.ts` (the `catch` in `decideStop`, compiled at `lib/stop-check.js:419-423`), plus `src/hooks/fx-codex.ts:399-402` and `src/hooks/fx-turn.ts` (outer catch): a throw in the Stop check is logged to stderr only, and the turn ends unverified.
   - What throws into this path: a malformed `.fx.json` if `readRepoConfig` throws, a `checkHint` bug, a `loadJudge` bug, or a `require('../lib/stop-check')` load failure.
   - The caller then believes "nothing needed checking". Claude Code and Codex do not surface hook stderr on exit 0.
   - The check is dead for that repo or session, and nothing in `decisions.jsonl` shows it. A 3am reader cannot tell "no unverified edits" from "Stop check crashed".
   - Fail-open is the stated design and the header comment says so, so that part is not the finding.
   - The gap is that the guard path already writes a `source: 'guard-error'` line using builtins only (`shellGuardOff`, `fx-codex.ts:182-191` and `fx-pretooluse.ts:139-144`), and the Stop path does not. `guard-error` already exists in the `types.ts:261` union.
   - The load-failure and non-function branches have the same hole and no test covers them.
   - Fix: on any Stop-check catch, and on the hook-level load failure, write one decision-log line with `event: 'stop'`, `action: 'allow'`, an error source and a truncated message. Do it with builtins only, so a failure in `decision-log.js` itself does not defeat it.

2. [Minor] `lib/stop-check.js:412,416` (source `src/lib/stop-check.ts`): the return value of `appendEvent(key, stop-block)` is ignored.
   - `appendEvent` returns false on a write error and logs to stderr only.
   - When that happens, `decideStop` still returns the block and logs `action: 'block'`. The "once per turn" guarantee, which rests on the journal, is gone for that turn.
   - On Claude Code, `stop_hook_active` bounds the repeat. On Codex the `stop_hook_active` behaviour is "not confirmed" (`references/harnesses/codex.md`), so the repeat is unbounded there.
   - Narrow in practice: if the journal is unwritable, the edit events were probably lost too, so no block would fire at all.
   - Fix: check the boolean. If the write failed, either skip the block or add `journal: 'unwritten'` to the log line so a repeat can be seen.

3. [Minor] `src/hooks/fx-codex.ts:408-410,420`: Stop and SubagentStop can still exit 2.
   - The parser-load failure and "not a JSON object" branches call `deny`, which exits 2, before event routing. A Stop event reaching those branches gets exit 2.
   - The brief and the header comment both say a Stop hook that exits 2 fails the Codex run.
   - The `uncaughtException` handler is only installed inside `handlePreToolUse`, so the Stop route itself is safe.
   - This is the same shared pre-routing code as the already-reported finding 3 in the findings file, now with a worse outcome for Stop. I am noting it, not re-reporting it.
   - Fix: sniff `hook_event_name` for Stop and SubagentStop before the denying branches, or document the exception.

4. [Minor] `src/hooks/fx-turn.ts` and `src/hooks/fx-codex.ts:393` (`SubagentStop` with a missing or non-string `agent_id`), and `lib/stop-check.js:394` (`key === null`): a silent return with no log line.
   - If a harness payload drops `agent_id` on `SubagentStop` or `session_id`, every subagent turn escapes the check, and nothing shows it.
   - The brief accepts the behaviour. Live row 23 measures `agent_id` on a subagent's `PostToolUse`.
   - Fix: write one stderr or decision-log line on each of these branches, so a payload change is visible.

Checked and fine:
- A judge error, timeout or `unavailable` result never lifts. Only `result.ok`, a `noul` answer, `p <= OVERCLAIM_LIFT_MAX` and no escalation lift (`lib/stop-check.js:406-407`). An unavailable judge is logged with `unavailable: reason` and `latencyMs`.
- Every block and every lift writes a decision-log line.
- The Claude Code hook and the Codex `stopCheck` always exit 0. The `[fx] ` prefix on the block reason is ignored by both `UserPromptSubmit` handlers (`fx-turn.ts:60`, `fx-codex.ts:353`), so a continuation prompt does not start a new turn and reopen the block.
- A missing journal, or a journal read failure, reads as "no edits" and allows the stop. That is the path finding 1 of the earlier file already covers, so I did not re-report it.

Not checked: the process gate `tests/gates/stop-check.test.*` and `fx-context`. I read the diff from lines 1 to 902 of 1863, and the rest only through the sources above.
