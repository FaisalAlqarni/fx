Lens: silent-failure, 5 findings

I read the whole diff, the brief and the plugin sources. The previous findings (06 to 09) are not repeated. The tripwire holds for the throw paths: the tracker and Stop catches warn once, and the tracker and `decideStop` write their own decision-log lines. The holes are in the paths that do not throw.

1. [Important] `src/plugins/fx-opencode-v2.ts:394-402` (v2 `execute.after` handler; the `if (r.sessionID !== undefined && r.tool !== undefined)` guard in the diff, around line 347 of the built `plugins/fx-opencode-v2.js`). The 2.x tracker can be disabled with no trace.
   - **What is swallowed:** the plugin header says the 2.x `execute.after` event's `input`, output text and exit status are NOT MEASURED. When the session id or tool name is absent, the handler returns silently. When the event has no exit status and `status` is "completed", the outcome is `unknown`, so a failing `npm test` is never counted as a failure. If `input` is missing, `command` comes from the `execute.before` map, and `callKey` or `parseEvent` returning undefined makes `command` null.
   - **What a human loses:** repeat-failure, the verified-after-edit check and the Stop reminder can all quietly never fire on 2.x. Nothing is logged because nothing threw. The 2.x conformance run cannot run here, so the first sign would be a user asking why no nudge ever appears.
   - **Fix:** `warnOnce` when a 2.x event has no session id or tool name. Also `warnOnce` the first time a `shell` event completes with outcome `unknown` or a null command, saying exit status or command is missing from the 2.x event. Do the same for the silent returns on v1 (`fx-opencode-v1.ts` `tool.execute.after`), where the cause is a changed event shape.

2. [Important] `src/plugins/fx-opencode-v1.ts:399-402,435-440` and `fx-opencode-v2.ts:377-380,463-477`. A nudge or reminder can be recorded as fired and then lost with no trace.
   - **What is swallowed:** `recordToolResult` appends the `nudge` event and the decision-log line before the text is enqueued. The once-per-turn guard is therefore already consumed when the line sits in the in-memory queue. If the plugin restarts, the session never makes another request, or the line is for a session whose transform never runs again, the line is gone. Nothing records that it was never pushed. The brief accepts the restart loss, but not the missing delivery record.
   - **What a human loses:** the decision log says a nudge or reminder was issued, but no system text ever carried it. A debugger reading the log cannot tell "delivered" from "lost".
   - **Fix:** write a decision-log line, or at least a debug line, when queued lines are pushed. That makes "queued but never pushed" visible by absence. Optionally, on instance dispose, warn once if the queue is non-empty.

3. [Important] `src/plugins/fx-opencode-v1.ts:399-402` and `fx-opencode-v2.ts:377-380`. The queue grows without bound and holds stale advice.
   - **What is swallowed:** `queue` entries are deleted only when a transform or `context` call arrives with that exact session id. Entries for a session that ends first (a subagent child session after its last call, a deleted session) stay for the life of the process. A line enqueued after a session's final request is delivered into an unrelated turn at that session's next request, or never.
   - **What a human loses:** growth is slow, so the cost is small, but a stale nudge may appear under a later user prompt with no hint that it is old. No cap, age or count is logged.
   - **Fix:** cap the lines per session and the number of sessions, and log or warn once when the cap drops a line. Optionally stamp each entry with its turn and drop entries from earlier turns, logging the drop.

4. [Minor] `src/plugins/fx-opencode-v1.ts:419-421,444-446` and the v2 equivalents. `warnOnce` hides a recurring fault.
   - **What is swallowed:** the message text `[fx] the loop tracker is off: ${msg}` is the dedupe key. The first throw prints once for the life of the plugin instance. A load failure (`turnLoadError`) writes no decision-log line, because only `recordToolResult` and `decideStop` write their own error lines once they run. The only trace of a load failure is one stderr line, which a TUI host may not show.
   - **What a human loses:** after the first warning, a fault that recurs on every call is invisible. For a load failure that is every tool call and every prompt.
   - **Fix:** on a load failure, also write one decision-log line at startup using builtins only, as the tracker-error path does. Keep stderr at once per message.

5. [Minor] `src/plugins/fx-opencode-v1.ts:441-446`. The "no session id" case is silent on 1.x.
   - **What is swallowed:** `decideStop` is called with `sessionId: session ?? null`, and a reminder is enqueued only when `session !== undefined`. If `sessionOf` returns undefined here, the check runs against a null session, with no warn on the v1 path before it. The v2 path warns earlier through `journalKey`.
   - **What a human loses:** a changed `chat.message` shape would disable the Stop reminder on 1.x without a line.
   - **Fix:** `warnOnce` when `session` is undefined at this point. Confirm that `decideStop` with a null session id writes a visible decision-log line rather than silently allowing.

Deliberate and correct, not findings:
- The kept queue when the 1.x transform has no `sessionID` (Agent.generate) is documented and tested, and stays silent by design.
- The queue lost on restart is accepted in the brief and the header comments.
