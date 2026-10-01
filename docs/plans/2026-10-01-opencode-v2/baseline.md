# Phase A baseline

Measured 2026-09-30 23:51 UTC to 2026-10-01 01:52 UTC. Nothing was fixed; each non-PASS is recorded as the runner printed it.

- Baseline commit: `dba6528e1bb2abdef709c096562f6d9888221281`
- Credits check: passed (`total_credits` greater than 0; purchased credits present: yes)
- OpenRouter free-model limits for accounts with at least 10 credits purchased, read from openrouter.ai/docs/api-reference/limits: 20 requests per minute, 1000 requests per day (50 per day below 10 credits).
- Versions: Codex 0.155.1, OpenCode 1.18.25 (standalone binary first on `PATH`; the opencode logs name 1.18.25), OpenCode 2.0.18 (installed), Claude Code 2.1.286.
- Pacing: one row per `run.sh` call through its own `FX_CONFORMANCE_ROWS` directory, 60 seconds between rows, harnesses one after another.
- Logs (outside the repo, private): `/tmp/fxlogs-opencode-v2/` (`<harness>-run.txt` is the teed runner output; `<row>-<harness>.log` the transcripts; `.attempt1.log` the first attempt of a fallback). the key-prefix scan printed 0 for every `*-run.txt` and every `*.log`.
- Models: primary `qwen/qwen3.8-27b:free` (Codex, both OpenCode majors), fallback `deepseek/deepseek-v4-flash`, Claude Code `anthropic/claude-haiku-4.5`. The model column is what the runner printed as `model=`; `(config)` means the session aborted before reporting a model, so the value is the configured one; rows with no `model=` are free rows (no model call). Attempts: 1 unless stated.

## Request counts against budget

| Harness | Budget | Observed |
|---|---|---|
| codex | 900 | about 74 `token_count` events in the logs (upper bound; 25 turns). The free-model counter reset at 00:00 UTC mid-run, so no clean counter delta. |
| opencode 1.18.25 | 900 | 52 (free-model daily counter 60 to 112); 39 `step_finish` events in the logs |
| opencode-v2 2.0.18 | 900 | 50 (counter 112 to 162); 21 `step_finish` events in the logs (aborted sessions log none) |
| claude-code | 300 | 5 (counter 162 to 167, free-model only; billed: key usage 0.1607 to 0.3522 USD, 0.19 USD); 58 assistant events in the logs |

The whole run stayed under the 1000/day limit. Counter figures include requests the logs do not show (429s, aborted calls).

## codex: 10 pass (1 on fallback), 5 fail, 3 gap

| Row | Verdict | Model | Attempts | Resolved |
|---|---|---|---|---|
| 01 preamble in a session | PASS | deepseek/deepseek-v4-flash | 2 (fallback; 429 on primary) | - |
| 02 preamble in a subagent | FAIL | qwen/qwen3.8-27b:free | 1 | fixed e205162 (row judged fork by the V2 parameter and ignored a V1 child answer): 2 of 2 live on qwen/qwen3.8-27b:free; one more on deepseek/deepseek-v4-flash after a primary 429. Fix round 1, clean re-runs under the rule that any provider error makes a run inconclusive: 2 clean passes, qwen/qwen3.8-27b:free x2. Logs: `/tmp/claude-1000/-development/54399d8a-e6c5-4c6a-8e74-50861f05bc7c/scratchpad/logs/02-r1, 02-r2`. |
| 03 no placeholder survives | PASS | none (free) | 1 | - |
| 04 naive prompt invokes a lane | PASS | qwen/qwen3.8-27b:free | 1 | - |
| 05 explicit invocation | PASS | qwen/qwen3.8-27b:free | 1 | - |
| 06 guard in session | PASS | qwen/qwen3.8-27b:free | 1 | - |
| 07 guard in a subagent | FAIL | qwen/qwen3.8-27b:free | 1 | fixed f8210d8 (runner: a subagent 429 now falls back; no product change): 2 of 2 live on qwen/qwen3.8-27b:free. Fix round 1, clean re-runs under the rule that any provider error makes a run inconclusive: 2 clean passes, qwen x2. Logs: `/tmp/claude-1000/-development/54399d8a-e6c5-4c6a-8e74-50861f05bc7c/scratchpad/logs/07-r1, 07-r2`. |
| 08 guard survives evasion | PASS | qwen/qwen3.8-27b:free | 1 | - |
| 09 every skill discovered | PASS | none (free) | 1 | - |
| 10 reference paths resolve | PASS | none (free) | 1 | - |
| 11 read-only roles registered | PASS | none (free) | 1 | - |
| 12 read-only agent cannot edit | FAIL | deepseek/deepseek-v4-flash | 2 (fallback; 429 on primary) | fixed 2b9419a (a chat-completions model has no apply_patch function, so the control could not write; the row now allows the shell form, assertions unchanged): 2 of 2 live on qwen/qwen3.8-27b:free. Fix round 1, clean re-runs under the rule that any provider error makes a run inconclusive: 2 clean passes, qwen x2. Logs: `/tmp/claude-1000/-development/54399d8a-e6c5-4c6a-8e74-50861f05bc7c/scratchpad/logs/12-r2, 12-r3 (12-r1 inconclusive, then failed on deepseek, which calls the missing apply_patch function)`. |
| 13 audit lane not model-facing | GAP | none | 1 | fixed 5f12321 (live row, no hidden lane read): 2 of 2 live on qwen/qwen3.8-27b:free. Fix round 1, clean re-runs under the rule that any provider error makes a run inconclusive: 2 clean passes, qwen x2. Logs: `/tmp/claude-1000/-development/54399d8a-e6c5-4c6a-8e74-50861f05bc7c/scratchpad/logs/13-r1, 13-r2`. |
| 14 audit lane user-invocable | GAP | none | 1 | fixed 5f12321 and 1ec2f14 (live row addressing `$fx:fx-handoff`; bare `$fx-handoff` is never expanded by Codex 0.155.1): 2 of 2 live on qwen/qwen3.8-27b:free. Fix round 1, clean re-runs under the rule that any provider error makes a run inconclusive: 2 clean passes, qwen x2. Logs: `/tmp/claude-1000/-development/54399d8a-e6c5-4c6a-8e74-50861f05bc7c/scratchpad/logs/14-r1, 14-r2`. |
| 15 subagent dispatches a subagent | FAIL | qwen/qwen3.8-27b:free | 1 | fixed a3ed03c (a V1 model nests one level unless the user sets `[agents] max_depth`; no plugin can, so the runner config does): 2 of 2 live on deepseek/deepseek-v4-flash (fallback after a primary 429 each time). Fix round 1, clean re-runs under the rule that any provider error makes a run inconclusive: 2 clean passes, deepseek x1 and qwen x1; needs the user-level `[agents] max_depth = 2` on a V1 model. Logs: `/tmp/claude-1000/-development/54399d8a-e6c5-4c6a-8e74-50861f05bc7c/scratchpad/logs/15-r1 (deepseek after 1 inconclusive), 15-r2`. |
| 16 project note and plan state | PASS | qwen/qwen3.8-27b:free | 1 | - |
| 17 lane check reaches runtime | FAIL | qwen/qwen3.8-27b:free | 1 | fixed 223eddd (hook: a patch applied through `apply_patch <<` in a shell call is lane-checked) and 2b9419a (row prompt): 3 live passes on qwen/qwen3.8-27b:free after the fix (one run under the old prompt declined the shell form); deepseek/deepseek-v4-flash calls the missing apply_patch function and stops, which is a runtime limit of that model, not fx. Fix round 1, clean re-runs under the rule that any provider error makes a run inconclusive: 2 clean passes, qwen x2. Logs: `/tmp/claude-1000/-development/54399d8a-e6c5-4c6a-8e74-50861f05bc7c/scratchpad/logs/17-r1, 17-r3 (17-r2 inconclusive, then failed on deepseek, a known limit of that model)`. |
| 18 read-only agent cannot delegate a write | GAP | qwen/qwen3.8-27b:free | 1 | fixed a3ed03c and 1ec2f14 (max_depth config; a grandchild 429 now falls back): 3 live passes, qwen/qwen3.8-27b:free twice and deepseek/deepseek-v4-flash once. Fix round 1, clean re-runs under the rule that any provider error makes a run inconclusive: 2 clean passes, deepseek x1 and qwen x1; needs the user-level `[agents] max_depth = 2` on a V1 model. Logs: `/tmp/claude-1000/-development/54399d8a-e6c5-4c6a-8e74-50861f05bc7c/scratchpad/logs/18-r1 (deepseek after 1 inconclusive), 18-r2`. |

Non-PASS excerpts (runner stderr; logs in `/tmp/fxlogs-opencode-v2/`):

- 02 (`02-preamble-in-subagent-codex.log`): `the subagent was forked with the parent's context, so its answer proves nothing`
- 07 (`07-guard-in-subagent-codex.log`), original verdict FAIL, **inconclusive: provider rate limit inside a subagent; runner did not fall back**: `the branch survived but no tool call inside the subagent carried the guard's reason`. The log shows the subagent died before running the command: `errored: "exceeded retry limit, last status: 429 Too Many Requests"`. The runner's provider-error detector did not see it (it reads only the top-level CLI's errors), so no fallback ran. Needs a re-run.
- 12 (`12-read-only-agent-cannot-edit-codex.log`, first attempt `.attempt1.log`): `the control agent could not write with its editing tool either, so a missing lens file proves nothing (if identity stopped arriving, every subagent write is refused)`
- 13 and 14 (no kept log, row exits before a session): `a live check is possible here in principle, the same way as claude-code; deferred to task 22 part B, not attempted in this task`
- 15 (`15-subagent-dispatches-subagent-codex.log`), original verdict FAIL, **inconclusive: provider rate limit inside a subagent; runner did not fall back**: `dispatch reached depth 1, not 2`. The log shows both retried spawns erroring with `exceeded retry limit, last status: 429 Too Many Requests` and the model stopping with "the subagent API endpoint is currently rate-limited (429)". Needs a re-run.
- 17 (`17-lane-check-reaches-runtime-codex.log`): `the lane check never ran on a file write (no .fx/.lane-design marker)`
- 18 (`18-read-only-agent-cannot-delegate-a-write-codex.log`), original verdict GAP, **inconclusive: provider rate limit inside a subagent; runner did not fall back**: `a default agent could not dispatch a child either (depth 1), so a missing lens file proves nothing`. The log shows the spawned agents returning `errored: "exceeded retry limit, last status: 429 Too Many Requests"` and no file created. Needs a re-run. The runner not detecting a 429 inside a subagent is a task 08 finding.

## opencode 1.18.25: 18 pass (2 on fallback), 0 fail, 0 gap

| Row | Verdict | Model | Attempts |
|---|---|---|---|
| 01 | PASS | qwen/qwen3.8-27b:free | 1 |
| 02 | PASS | deepseek/deepseek-v4-flash | 2 (fallback) |
| 03 | PASS | none (free) | 1 |
| 04 | PASS | qwen/qwen3.8-27b:free | 1 |
| 05 | PASS | qwen/qwen3.8-27b:free | 1 |
| 06 | PASS | qwen/qwen3.8-27b:free | 1 |
| 07 | PASS | deepseek/deepseek-v4-flash | 2 (fallback) |
| 08 | PASS | qwen/qwen3.8-27b:free | 1 |
| 09, 10, 11 | PASS | none (free) | 1 |
| 12 | PASS | qwen/qwen3.8-27b:free | 1 |
| 13, 14 | PASS | none (free) | 1 |
| 15 | PASS | qwen/qwen3.8-27b:free | 1 |
| 16 | PASS | qwen/qwen3.8-27b:free | 1 |
| 17 | PASS | qwen/qwen3.8-27b:free | 1 |
| 18 | PASS | qwen/qwen3.8-27b:free | 1 |

Rows 02 and 07 passed only on the fallback; the first attempts are kept as `02-preamble-in-subagent-opencode.attempt1.log` and `07-guard-in-subagent-opencode.attempt1.log`. No non-PASS rows.

## opencode-v2 2.0.18: 10 pass, 7 fail, 1 gap

| Row | Verdict | Model | Attempts |
|---|---|---|---|
| 01 | PASS | qwen/qwen3.8-27b:free | 1 |
| 02 | FAIL | qwen/qwen3.8-27b:free | 1 |
| 03 | PASS | none (free) | 1 |
| 04 | FAIL | qwen/qwen3.8-27b:free (config) | 1 |
| 05 | PASS | qwen/qwen3.8-27b:free | 1 |
| 06 | FAIL | qwen/qwen3.8-27b:free | 1 |
| 07 | FAIL | qwen/qwen3.8-27b:free | 1 |
| 08 | FAIL | qwen/qwen3.8-27b:free | 1 |
| 09, 10, 11 | PASS | none (free) | 1 |
| 12 | PASS | qwen/qwen3.8-27b:free | 1 |
| 13, 14 | PASS | none (free) | 1 |
| 15 | FAIL | qwen/qwen3.8-27b:free (config) | 1 |
| 16 | PASS | qwen/qwen3.8-27b:free | 1 |
| 17 | FAIL | qwen/qwen3.8-27b:free (config) | 1 |
| 18 | GAP | qwen/qwen3.8-27b:free | 1 |

Non-PASS excerpts (logs `<row>-opencode-v2.log` in `/tmp/fxlogs-opencode-v2/`):

- 02: `the subagent could not answer from the preamble, so it did not wholly reach it (subagent returned: )`
- 04 (unconfirmed, same cause as 15: question tool in headless mode): `the opencode-v2 CLI exited 1; the session did not complete`. The log ends in `{"type":"error",...,"error":{"type":"aborted","message":"Session interrupted: shutdown"}}` after the model called a question tool ("Grammar + errors" options) that a headless run cannot answer.
- 06: `the branch survived but the guard's reason never reached the session`
- 07: `the branch survived but no tool call inside the subagent carried the guard's reason`
- 08: `every branch survived but only 0 of the three commands came back refused by the guard`
- 15, original verdict FAIL, **inconclusive: test-environment cause, not a plugin result**: `the opencode-v2 CLI exited 1; the session did not complete`. Same `Session interrupted: shutdown` ending, after a question tool ("Agent type mismatch": use "general" or "explore") that a headless run cannot answer, before nested dispatch was judged. The state.md task 07 ruling on `build` dispatch (rows 15 and 18) stays unconfirmed; route it to task 13.
- 17 (inconclusive stop, not a plugin result): `the opencode-v2 CLI exited 1; the session did not complete`. The model replied that `src/duration.js` was not created and it was stopping as instructed after the lane-check message was shown; the row saw no completed session.
- 18, original verdict GAP, **inconclusive**: `a default agent could not dispatch a child either (depth 0), so a missing lens file proves nothing`. The control agent did not dispatch at depth 0, so the row never tested the read-only agent (`18-read-only-agent-cannot-delegate-a-write-opencode-v2.log`). Unconfirmed, with row 15; route to task 13.

## claude-code 2.1.286, rows 01 02 06 07 08 16: 6 pass, 0 fail, 0 gap

| Row | Verdict | Model | Attempts |
|---|---|---|---|
| 01 preamble in a session | PASS | anthropic/claude-haiku-4.5 | 1 |
| 02 preamble in a subagent | PASS | anthropic/claude-haiku-4.5 | 1 |
| 06 guard in session | PASS | anthropic/claude-haiku-4.5 | 1 |
| 07 guard in a subagent | PASS | anthropic/claude-haiku-4.5 | 1 |
| 08 guard survives evasion | PASS | anthropic/claude-haiku-4.5 | 1 |
| 16 project note and plan state | PASS | anthropic/claude-haiku-4.5 | 1 |

No non-PASS rows.
