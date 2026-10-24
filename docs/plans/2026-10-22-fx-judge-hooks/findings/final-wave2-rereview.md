### Finding verdicts

Paths are under /development/fx/.worktrees/fx-judge-hooks/src at HEAD 957e020.

1. **Journal line cap, command cap, size cap and tail reads: ADDRESSED.**
   - The limits are at lib/judge-thresholds.ts:28-31.
   - Commands are stored in the 500-character form at lib/journal.ts:24 and :30-33.
   - The 2 KB line cut is at lib/journal.ts:42-49, the trim at :58-68, its trigger at :80, and the tail read at :92-104 and :124.
   - The guard compares commands in the stored form at lib/shell-guard.ts:107, :132 and :137.
2. **Judge circuit breaker: ADDRESSED.**
   - The breaker check is at lib/shell-guard.ts:69-74, the skip at :157, and the failure and recovery events at :160-162.
   - The new event type is at lib/types.ts:271, its parser at lib/session-input.ts:38, and the ADR text at docs/adr/0047 line 9.
   - The open state returns allow and is logged. The breaker never denies.
3. **Decision-log rotation race: ADDRESSED.** The lock and the size re-check are at lib/decision-log.ts:30-56, called from :65.
4. **Queue events under their own name: ADDRESSED.** See lib/opencode-queue.ts:13-14 and lib/decision-log.ts:15.
5. **Stop counts only edits inside the repository: ADDRESSED.** See lib/stop-check.ts:25-36 and :64. Edit paths reach it already absolute (lib/tool-events.ts:70-80).
6. **Dead parameters removed: ADDRESSED.** The input type is at lib/shell-guard.ts:25. The callers are hooks/fx-pretooluse.ts:194, hooks/fx-codex.ts:319 and plugins/fx-opencode-v1.ts:367.
7. **One agent_id helper: ADDRESSED.** The helper is at lib/hook-input.ts:24. It is used at hooks/fx-turn.ts:38-40, :51, :78 and :110, hooks/fx-context.ts:66-69, and hooks/fx-codex.ts:107-117, :336 and :507. The one raw read left is fx-codex.ts:246, the plant-roles check, which the fixer named and left alone.
8. **Codex judge-deny text: ADDRESSED.** See lib/shell-guard.ts:118 and :175. The text is pinned at tests/gates/shell-guard-codex.test.ts:20.
9. **Test linking the Stop sentence to the prompt handlers: ADDRESSED.** The shared builder is lib/stop-check.ts:41-45 and :67. Both gates build the Stop text from it: tests/gates/turn-journal.test.ts:78-82 and tests/gates/shell-guard-codex.test.ts:180.
10. **Codex loop-guard text after an over-long deny: ADDRESSED.** See lib/shell-guard.ts:140. It is pinned at lib/shell-guard.test.ts:320-329 and tests/gates/shell-guard-codex.test.ts:21.

**Named risk: commands match on their first 500 characters.**

Commands from 501 to 2,000 characters still go to the judge (CAP_COMMAND is 2000, lib/redact.ts:10), but refusals are now matched on 500 characters. Call two such commands that share their first 500 characters A and B.

- **Loop guard, A refused, then a different B with no stamp.** B matches the deny of A at shell-guard.ts:137, so the judge never sees B.
  - On Codex and opencode, B gets the loop-guard deny. That is stricter, but the text "this command was denied" is false for B. It also happens in normal use: an agent that shortens an over-long A by trimming its tail, keeping the prefix, is refused for 10 minutes. That is the natural recovery from the over-long deny at :152.
  - On Claude Code the loop guard answers ask (:139). A B the judge would deny with confidence now gets an ask instead, with no user prompt in between.
- **Stamp, A refused, a user prompt, then a stamped B.** The refusal match at :132 finds A, so the stamp counts at :135 for a command that was never refused.
  - On Claude Code a judge deny of B is softened to an ask at :183-189.
  - On Codex the result is unchanged: a deny stays a deny (:183), an ask becomes a warn either way (:192), and an allow stays an allow. Codex never gets a softer answer.
- **Rating: Minor.** It affects Claude Code only, needs a shared 500-character prefix, and always ends on a native ask the user answers, never an allow. It does break ADR 0047's rule that only user prompts soften. It also contradicts the fixer's concern 3, which says the 500-character match is "stricter, not looser". The fix is to also journal a hash of the full normalized command and compare on that.

**Trim and breaker checks.**

- **Prompt boundary:** kept. The newest prompt is moved to the head when it falls outside the kept half (journal.ts:63-66), and journal.test.ts:97-108 pins it.
- **Deny and ask events in the 10-minute loop-guard window:** not guaranteed. The trim cuts by size, not by time, so a deny is lost once more than about 128 KB of newer lines arrive within 10 minutes. That is roughly 200 to 800 tool lines. Losing it loosens the loop guard for that command. Rare in one root session; no test covers it.
- **Breaker fail-open:** logged as judge-down with circuit-open (:157; test at shell-guard.test.ts:366-367).
- **Breaker reset:** after the cooldown one call goes through. A success after a failure writes an ok event (:162), which closes the breaker. A failure reopens it (test :369-370). The test covers a success between failures, not a success right after the breaker was open, but both run through the same line.

### New breakage in the fix diff

1. **Minor: a different command gets the loop guard or a stamp.** This is the 500-character match described above (shell-guard.ts:107, :132, :137). On Claude Code it turns a would-be judge deny into an ask with no user prompt. On Codex it wrongly refuses an over-long command that was shortened by trimming its tail.
2. **Minor: the trim race drops lines.**
   - journal.ts:59-67 reads the file, writes a temp copy and renames it over the journal. A line another hook appends between that read and the rename is lost.
   - What a lost line costs:
     - A lost deny loosens the loop guard.
     - A lost stop-block makes the block-once Stop check block twice.
     - A lost prompt lets the judge read the previous prompt as the latest one, which is what the comment at journal.ts:106-110 promises never happens.
   - The fixer reported this as concern 2. Nothing in state.md rules on it.
3. **Minor: a failed trim leaves its temp file forever.** The temp file is named with the journal name plus the pid and a .tmp ending (journal.ts:65). pruneJournals only removes files ending in .jsonl (:152), so each failed rename leaves up to 128 KB behind, under a new pid each time.
4. **Minor: the halving line cut shortens non-Latin and code-heavy prompts.** At journal.ts:45-46, a 1,500-character prompt in Cyrillic or Arabic is over 2 KB, and so is one with many escaped characters. The cut halves to 1,024 and then 512 characters instead of cutting to fit. The judge then reads much less of the user's request, which only makes it stricter. A deny made of about 330 or more control characters gets cut below the 500-character stored form, so its later match fails. That only matters against a deliberate agent, and the loop guard is no boundary against one.
5. **Minor: a cwd reached through a symlink.** repoRoot returns the git top level as a real path (lib/repo-config.ts:13-17). An edit path written in the symlinked form then counts as outside the repository at stop-check.ts:27-28, so the Stop check passes when it should block. The fixer reported this as concern 4. It also adds a second git spawn on every Stop.
6. **Minor: the repeat-failure nudge merges long commands.** loop-tracker.ts:19-20 now counts two different failing commands that share their first 500 characters as one. This only affects advice.

### Tests evidence

I had no shell, so nothing here was rerun. What I could check:

- **The report's run:** it shows a final `scripts/check-generated && scripts/test-scope` run with EXIT 0, the per-file ok lines, and check-all printing ALL GREEN (log line 748). It explains that the earlier exit 1 was drift from editing during the run. I did not see that log.
- **RED stages the report quotes:** items 1, 3, 4, 5, 7 and 9 each have one.
- **No RED, by the fixer's own account:** the breaker, the two Codex text constants, and the item 1 long-command case each went in with a batch that failed earlier in the file, so none was seen failing on its own.
- **Tests I read at HEAD:**
  - Breaker edges: shell-guard.test.ts:336-384.
  - Codex over-long then stamped retry: :320-329.
  - Long-command loop guard: :330-335.
  - Lock held and stale lock: decision-log test, in the diff.
  - Trim keeps both prompts: journal.test.ts:97-108.
  - Stop-sentence gates: turn-journal.test.ts:78-82 and shell-guard-codex.test.ts:180.
- **Not tested:** a 500-character prefix collision, the concurrent-trim race, a deny trimmed out inside the 10-minute window, and the breaker closing after a success that follows an open breaker.

## Ledger lines

Final fix wave 2 re-review (10 addressed, 0 open: all 10 tracker and storage items addressed; commits beaab4c..957e020)
Final: minor (deferred): commands match on their first 500 characters (shell-guard.ts:107,132,137), so on Claude Code a command that shares a refused one's prefix gets the loop-guard ask or a stamp-softened ask instead of a judge deny, with no new user prompt; journal a full-command hash and match on it.
Final: minor (deferred): on Codex, an over-long command shortened by trimming its tail keeps its first 500 characters and is refused by the loop guard for 10 minutes as "denied" though never judged.
Final: minor (deferred): the journal trim (journal.ts:59-67) loses a line another hook appends between its read and its rename (a deny, a stop-block or a prompt), and its size-based cut can drop a deny still inside the 10-minute loop-guard window.
Final: minor (deferred): a failed trim rename leaves a pid-named .tmp file in the sessions directory that pruneJournals (journal.ts:152) never removes.
Final: minor (deferred): the halving line cut (journal.ts:45-46) cuts 1,500-character non-Latin or escape-heavy prompts to 1,024 or 512 characters, so the judge reads less of the user's request.
Final: minor (deferred): Stop's inside-repository test (stop-check.ts:27) compares edit paths with the real-path git top level, so edits made through a symlinked cwd are not counted and the Stop check passes; it also adds a second git spawn on every Stop.
Final: minor (deferred): the repeat-failure nudge (loop-tracker.ts:19-20) now counts two failing commands that share their first 500 characters as one.

Not checked: I did not rerun any test or read the opencode-turn and shell-guard-codex gates beyond the lines cited. The breaker and the two Codex text constants have never been seen failing on their own.
