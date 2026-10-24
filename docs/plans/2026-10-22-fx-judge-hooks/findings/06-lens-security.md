Lens: security, 5 findings

1. [Important] `/development/fx/.worktrees/fx-judge-hooks/src/lib/shell-guard.ts:86-87` (with `src/plugins/fx-opencode-v1.ts` `chat.message`): on opencode, any `chat.message` in a session counts as a user prompt, so the stamp rule can be satisfied without the user. This lets the agent turn a judge deny into a run, not only an ask.
   - `refused` matches both `deny` and `ask` events.
   - At lines 126-132, a honoured stamp turns a judge `deny` into `warn` on opencode 1.x. Warn lets the call run, and it also skips the loop guard at line 89.
   - Attack: a command is judge-denied, for example `cat .env` at p=0.91. Then any new message arrives in that same session, and the agent retries with `# fx-ok: x`. The command runs.
   - The task brief's own example case, where a parent agent messages a child session, qualifies. `chat.message` fires for that message and nothing marks it as non-user.
   - It is also plausible, but unmeasured, that harness-made user messages fire `chat.message` too. I could not read opencode 1.18.25 to check. Examples are slash-command expansion and compaction continue messages.
   - Impact: the user-gate from red team C2 is void on opencode 1.x for any session an agent can message. The deny text and the ask text both advertise the stamp.
   - Fix: on opencode, do not let a stamp soften a judged deny. Let it soften an ask only. Better still, honour no stamp on opencode 1.x until a user message can be told from an agent message. Or record `chat.message` only for sessions with no parent, which means looking up the session's parent id. Also say plainly in the `references/harnesses/opencode.md` text that the stamp is advisory on this harness.

2. [Important] `src/plugins/fx-opencode-v1.ts:415-416`: a bash call whose `command` is not a string skips the shell guard entirely, including the hard rules.
   - The `return` at line 415 happens after the git guard. Line 401 (`!command`) also returns for any falsy value.
   - Whether the git guard's `inspect` fails closed on an array or object is not shown in this diff. I did not verify it, and I could not confirm what opencode's bash schema does with a non-string value.
   - If opencode coerces the value (a `String(array)` or a similar join) before running it, the call reaches the shell with no hard-rule check.
   - Task 05's fix round dealt with the same defect on Codex, and the brief's ruling treats it as Important there.
   - Fix: when `tool === 'bash'` and `command` is present but not a string, throw. Do the same for an empty string only if opencode runs one.

3. [Minor] `src/plugins/fx-opencode-v1.ts:416` (with `src/lib/shell-guard.ts:82-83`): a missing `sessionID` makes the journal key null, so the loop guard and the stamp both go inert.
   - A judged deny can then be retried indefinitely. Each retry is judged afresh, and a probabilistic judge can eventually answer `run`.
   - The stamp can never be honoured either, so the ask text sends the agent down a path that always fails.
   - This is a closed failure for the stamp, but the loop guard is lost.
   - Fix: when there is no session id on a `bash` call, key the journal on a per-plugin-instance fallback id, or deny with a clear reason.

4. [Minor] `src/plugins/fx-opencode-v1.ts:257-282`, the `shellGuard` order. I found no way around the hard rules here.
   - The rules load fail-closed, and a hard deny wins over every `guardShell` outcome, including a crash. That part is sound.
   - Two small gaps remain.
     - `d.action` is not checked against the four known values. An unexpected value falls through as an allow with no log.
     - `guardShell` is awaited before a known hard deny is thrown. The hard deny itself is final, but the wait could be skipped.
   - On Windows, posix false reads both shells, as the reference file says. That is correct. Because it is unsourced, record it as a known limit.
   - Fix: throw on any `d.action` outside `allow`, `warn`, `ask` and `deny`. Throw the hard deny before calling `guardShell`.

5. [Minor] `src/plugins/fx-opencode-v1.ts:223-235` (`shellGuardOff`): the full error message goes to stderr and to `decisions.jsonl` with no redaction. The comment says the command is left out, but `messageOf(e)` can still carry text the thrown module put in it, such as paths or the command. The `session` value is also written raw.
   - Fix: pass the message through `redact` where it can be loaded. If it cannot be loaded, keep only the error name.

**Checked, not findings**
- The health line prints `baseUrl`. `src/lib/judge-input.ts:82` rejects a user name or password in `base_url`, so no credential reaches the system text or stderr.
- `journalKey` strips path characters, so there is no traversal through a hostile `sessionID`.
- `chat.message` writes `text: null`, and the judge request on opencode carries no prompt.
- `chat.message` with no readable `sessionID` writes nothing and does not refuse, so a wrong input shape costs the turn boundary only.
- Separately, the mismatch between a deny in the log and the `ask` text on opencode is a usability issue, not a security one.
