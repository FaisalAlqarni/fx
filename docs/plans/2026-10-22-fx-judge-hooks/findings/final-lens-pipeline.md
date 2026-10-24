Lens: pipeline, 4 findings

1. [Important] `/development/fx/.worktrees/fx-judge-hooks/src/lib/journal.ts:36` (append), `:65` (`readJournal`), `:91` (`pruneJournals`): the session journal has no size or event cap, and every hook re-reads the whole file.
   - **Growth:** `recordToolResult` (`src/lib/loop-tracker.ts:78`) appends one `tool` event per tool call plus one `edit` event per edited path. The shell guard appends `deny` and `ask` events (`src/lib/shell-guard.ts:149`). Nothing trims a live journal.
   - **Pruning:** `pruneJournals` runs only at session start, from `fx-context.ts:85`, `fx-codex.ts:515`, `fx-opencode-v1.ts:342` and `fx-opencode-v2.ts:286`. It deletes by file mtime older than 7 days. A journal that is still being written never ages out, and the sessions directory has no total cap.
   - **Readers:** `loop-tracker.ts:95`, `shell-guard.ts:110` and `shell-guard.ts:125` (via `lastUserPrompt`), and `stop-check.ts:45` each read and JSON-parse the whole file on the hot path. A guarded shell command reads it twice.
   - **Consequence:** in a long or looping session, per-call hook latency grows with every call (quadratic in total). The 1,500 ms budget covers only the judge call, not these reads. Disk use grows until the 7-day prune, and subagent journals (`journalKey` with `__agent_id`) multiply the file count.
   - **Fix:** cap events per journal (rotate or truncate at a size) and read only the tail.

2. [Important] `/development/fx/.worktrees/fx-judge-hooks/src/lib/shell-guard.ts:130`: the judge client sends one request per guarded command, and nothing reads how it is performing.
   - **What is missing:** there is no per-turn or per-session cap, no cache for a repeated identical command, and no open-circuit state after timeouts. The session-start probe result (`fx-opencode-v1.ts:395`, `fx-opencode-v2.ts:472`) is only shown to the user and never reaches the guard.
   - **Consequence:** with a slow or hanging judge, such as a throttled model on a local server, every non-read-only, non-repo command waits the full 1.5 s before failing open. A 100-command turn adds about 150 s of serial latency. Parallel subagents also stack requests onto the same single judge.
   - **Fix:** after N consecutive `timeout` or `network` results, skip the judge for a cooldown period, and cache verdicts by normalized command.

3. [Minor] `/development/fx/.worktrees/fx-judge-hooks/src/lib/decision-log.ts:39-40`: rotation keeps the log bounded, but the check-then-rename is racy.
   - **Bound:** the size is checked before the write and one old generation is kept, so total size is about 2 × `LOG_ROTATE_BYTES` (5 MB each). That is bounded.
   - **Race:** two hooks that run at once, such as parallel tool calls or subagents, can both see `size > limit`. The second `renameSync` then moves the fresh, near-empty `decisions.jsonl` over `decisions.1.jsonl`, and the full 5 MB generation is lost.
   - **Retention:** every guard decision and every queue push or drop is logged, so the window kept can be short on a busy machine. Nudge events are the evidence a user would look for after a missing push.
   - **Fix:** use an atomic rotation guard, or skip rotating when the file is already small.

4. [Minor] `/development/fx/.worktrees/fx-judge-hooks/src/lib/opencode-queue.ts:17-29`: bounded; no unbounded-producer finding.
   - **Bound:** `MAX_LINES_PER_SESSION` (5) and `MAX_SESSIONS` (50) cap memory. `startTurn` and `drain` clear a session. Nudges are one per signal per turn (`checkSignals` `fired` check, `loop-tracker.ts:40`), and the Stop reminder is once per turn (`stop-check.ts:46`). Producers are therefore slower than the cap.
   - **Residual gap:** every dropped line (`:29`) and every eviction (`:21`) writes a synchronous decision-log line. A session that never drains keeps producing those log writes, so the cost is bounded only by log rotation.

Not findings:
- Health probes are bounded. `judgeHealth` runs once per plugin instance (`fx-opencode-v1.ts:395-397`, `fx-opencode-v2.ts:472-474`) and once per session start in `fx-context.ts:86` and `fx-codex.ts:516`.
- The Stop check judges at most once per turn, because `stop-block` is journaled.

Unread: the body of `askJudge` (`src/lib/judge.ts:72` is elided in the file as the tool returned it). I could not confirm that a timeout aborts the in-flight request, which matters for finding 2.

Skipped: broker-side limits and the opencode host's own request rate. Risk: finding 1's quadratic cost is estimated from the read pattern, not measured.
