# Task 02 review

### Spec Compliance

Spec: compliant (0 gaps; 1 item not verified).

- Redacted journal: `appendEvent` redacts every string field (prompt text, agentType, tool command, edit path, deny and ask command) before the single `appendFileSync`. Prune is implemented and tested at 8 days and 6 days. Its caller is task 04 (SessionStart), so no wiring is missing here.
- Turn start: `UserPromptSubmit` records the root prompt; `SubagentStart` records `text: null` with `agentType` under `journalKey(session_id, agent_id)`. A prompt with an `agent_id` writes only the subagent journal; a `[fx] ` prompt writes nothing. The Codex shapes (`text: null`, `agent_id` key) are in place.
- `.fx.json` `hooks` key is read through `repoRoot` (git top level), and a test shows `sub/.fx.json` is ignored. `shell_guard` is ignored and bad members give the specified problems.
- `hooks/hooks.json` has the exact `UserPromptSubmit` entry; the process gate asserts it.
- Golden, transcript-path and dispatch-route tests were moved to scratch env with no fixture change in the diff.
- Judgment call (SubagentStart without `agent_id` records nothing): accepted. The brief's key would fall back to the root key and reset the root turn; the gate asserts "no ids, no journal".
- Not verified (per instruction, suite not re-run): the `ALL GREEN` claim.

### Strengths

- Typed `require` inside `try` with export checks in both hooks; a broken journal module cannot crash the context hook, and `fx-turn` has no path to exit 2.
- Journal write is one append of one line, file `0600`, directory `0700`; failure is one `[fx] journal:` line and exit 0, tested with a regular file as state home.
- The process gate checks stdout empty, root journal byte-unchanged on a dispatch prompt, and SubagentStart stdout byte-identical to the plain run.
- `parseJournalLine` has no casts and rejects each bad shape; `readJournal` skips garbage lines (tested).

### Issues

#### Critical

None.

#### Important

None.

#### Minor

- src/hooks/fx-turn.ts:25 and src/hooks/fx-context.ts:68 · `subagent` is true only for a non-empty string `agent_id`. A payload with `"agent_id":7` is recorded as a root user prompt with the parent's dispatch text, which resets the root turn (reproduced with a scratch state dir: the line `{"kind":"prompt","text":"parent dispatch text"}` landed in `s1.jsonl`). · The design says an event that carries an `agent_id` is never a user prompt. · Treat any present non-null `agent_id` as a subagent event (text `null`, skip the root journal when the key cannot be built), and add a case to the gate.
- src/hooks/fx-turn.ts:15 · The export check lists the functions but not `CAP_PROMPT`; a stub module without it would pass the check and call `redact(prompt, undefined)`. · Guarded loads should check every export used. · Add `typeof CAP_PROMPT !== 'number'` to the check. (Also, `appendEvent` already redacts prompt text with `CAP_PROMPT`, so the pre-redact at line 29 is redundant.)
- src/lib/journal.ts:78 · `statSync` then `rmSync` is not atomic: a hook appending between the two calls has its fresh line deleted along with a stale file. Only reachable for a journal idle exactly at the seven-day edge. · Prune "never deletes a live journal" holds in practice, not by construction. · Re-check mtime just before removal or accept and note it.
- src/lib/journal.test.ts · No test appends from two processes at once, though the brief names concurrency. The code is a single `O_APPEND` write, which is sound for lines under the 2 KB cap, but nothing proves it. · Claim untested. · Spawn two `fx-turn` runs in parallel on one session and assert two parseable lines.
- src/lib/journal.ts:15 · `journalKey` maps `s/1` and `s_1` to one key, and a session id `s1__a1` collides with subagent `a1` of `s1`. · Real harness ids are UUIDs, so this is theoretical; the brief fixes the mapping. · None needed now.

### Assessment

The task matches the brief. Every journal write goes through redaction, modes and fail-open behavior are right, and the repo switch reads the git top level. No blocking defects. The minor items are an out-of-contract `agent_id` type, a partial export check, and two untested properties (concurrency, prune race).

## Ledger lines

Task 02: minor (deferred): non-string agent_id on UserPromptSubmit or SubagentStart is recorded as a root user prompt; treat any non-null agent_id as a subagent event.
Task 02: minor (deferred): fx-turn export check omits CAP_PROMPT, and the pre-redact duplicates appendEvent's own redaction.
Task 02: minor (deferred): pruneJournals stat-then-rm can delete a journal appended to between the two calls.
Task 02: minor (deferred): no test appends from two hook processes at once.
Task 02: minor (deferred): journalKey sanitising can merge distinct ids (s/1 and s_1, s1__a1 as root); theoretical with UUID ids.
