### Spec Compliance (✅ / ❌ with file:line; ⚠️ cannot verify)

- ✅ Turn-end order. `src/plugins/fx-opencode-v1.ts:477-486` and `src/plugins/fx-opencode-v2.ts:421-428` run `decideStop` before `appendEvent(prompt)`. Both gates would fail if the order were swapped (`opencode-turn.test.ts`, the "edit then prompt again" cases).
- ✅ `decideStop` is called with `mode 'reminder'`, `stopHookActive false`, `lastMessage null`, `agentId null`, as the brief specifies.
- ✅ Reuse. `recordToolResult` and `decideStop` are imported from tasks 08 and 09, not copied. Each is loaded in its own `try` through a typed `require`.
- ✅ Queue. One `Map<string, string[]>` per plugin instance. It is pushed after the preamble and health line, then deleted, for that session only. A missing session id keeps the queue (`fx-opencode-v1.ts` transform, `fx-opencode-v2.ts` context). Tests cover once-only delivery, the no-session-id call keeping the queue, and separate sessions.
- ✅ Harness values are `opencode` and `opencode-v2`. Nudge text names `fx-debug`. No stamp wording is added.
- ✅ `outcomeOf` returns `ok` for exit 0, `fail` for other numbers, and `unknown` otherwise (`src/lib/opencode-input.ts:41`). 2.x `status: "error"` gives `fail` (`opencode-input.ts:62-68`).
- ✅ Edit events only on non-failed outcomes, and `unknown` is never a failure. Both come from task 08's tracker and are not changed here.
- ✅ Header comments record the 1.x shape (measured) and mark the 2.x shape as not measured.
- ❌ Interrupted calls are not carried through. `opencode-input.ts:41-46` and `fx-opencode-v1.ts:452-460` turn a null `metadata.exit` into `unknown` and never pass `interrupted: true`. See Important 2.
- ❌ Design 8 (read-only agents exempt, passive-stall root only) is not satisfied on opencode. See Important 3.
- ⚠️ The 2.x event shape (output, input, exit) is unmeasured, and no 2.x binary is available. The 2.x conformance run is deferred, so I do not re-open it.
- ⚠️ I cannot verify the `test_scope` output or the RED/GREEN lines in the report. I have no shell and the report is an unverified claim.
- ⚠️ I cannot verify that the 2.x runtime awaits an async `prompt` callback.
- ⚠️ Scope. The report says `docs/plans/2026-10-22-fx-judge-hooks/state.md` was staged "as it was" and the diff includes it. It is the controller's file and is not in the brief's `git add` list. See Minor 2.
- ⚠️ I did not check how `turnNeedsEvidence` treats an `edit` event with no extracted paths (relevant to Important 1). The grep of `evidence.ts` returned nothing.

### Strengths
- The change is small and reuses task 08 and 09 code. The only new parsing is two functions behind the `*-input.ts` trust boundary.
- All new work fails open. Each warning goes through `warnOnce`.
- The plugin gate drives whole turns in-process under a scratch environment. The edit-then-prompt cases fail if the order is swapped, which is the sequencing risk the brief named.
- The queue is keyed per session, and a missing session id is covered on both majors.
- The 2.x command fallback from `execute.before` (`fx-opencode-v2.ts:388-399`) is a reasonable defence against the unmeasured `input` field. It is also read before the "forget command" step.

### Issues

#### Critical
None.

#### Important

1. 2.x repeat-failure is silently disabled, and passing check runs can produce a false reminder, with no trace.
   - Where: `src/lib/opencode-input.ts:62-68`, `src/plugins/fx-opencode-v2.ts:388-405`.
   - What is wrong: a completed call with no `metadata.exit` or `exit` gives `unknown`. `loop-tracker.ts:20` counts only `fail` toward repeat-failure, and `loop-tracker.test.ts:27` asserts "unknown is never a failure". Unless the unmeasured event carries an exit status, 2.x repeat-failure fires only for refused calls with `status: "error"`.
   - The same gap hurts the reminder. A passing `make test` after an edit is `unknown`. A check command verifies on success, and the pass-summary path needs `output`, which is also unmeasured and defaults to `''`. So on 2.x, a turn that edits and then passes its tests is likely to get a false "no check passed" reminder at the next prompt. That reminder reaches the model unchanged, in the system text.
   - Trace: nothing records the unknown outcome. `warnOnce` fires only on throws. A reader of stderr or the decision log cannot tell why 2.x never nudges.
   - Fix: emit one `warnOnce` stderr line per instance the first time a completed `shell` call arrives with no exit status and no output text. Add a plugin-level case for "completed, no exit, no output".
   - The implementer's self-review mentions only the nudge. The false-reminder side is not mentioned.

2. A killed 1.x process still counts for verification.
   - Where: `src/lib/opencode-input.ts:41-46`, `src/plugins/fx-opencode-v1.ts:452-460`.
   - What is wrong: the new header comment says `metadata.exit` is "null when the process was killed". The parser maps that to `unknown`, and the result type has no `interrupted` field. `recordToolResult` accepts `interrupted?: boolean` (`loop-tracker.ts:60`) so that partial output never verifies, but the plugin never sets it.
   - Effect: a killed `make test` whose partial output contains "Tests: 3 passed" is journaled `verified`. That suppresses the reminder for work that was never verified.
   - Binding ruling quoted: "interrupted is unknown". The outcome is `unknown`, but the 08 behaviour "never verified" is lost.
   - Fix: add `interrupted: true` to `OpencodeToolResult` when `metadata.exit === null` (1.x), pass it through, and add a unit case.

3. Read-only agents and subagents are not exempted on opencode, so review and exploration child sessions get nudged.
   - Where: `fx-opencode-v1.ts:481` (the prompt event is `{kind:'prompt', text:null}` with no `agentType`), `fx-opencode-v2.ts:428`; `loop-tracker.ts:98-100`.
   - What is wrong: the read-only exemption keys on `first.agentType` of the turn's prompt event. Claude Code and Codex record it (`fx-context.ts:71`, `fx-codex.ts:339`). Opencode records none, and the tracker is called with `agentId: null`. That treats every child session as a root session, and `passive-stall` is excluded only when `agentId` is non-null.
   - Design 8 says: "No signal fires in the journal of a read-only review agent" and passive-stall applies to "a root session only". On opencode the plugins register the same read-only review agents, and their child sessions read many files in a row. The transform then pushes "invoke fx-debug" into that child's system text.
   - Fix: record `agentType` from the 1.x `chat.message` `input.agent` (measured in task 06). On 2.x record it if the prompt event has it, and otherwise say so in the header. Add a test with a read-only agent name and twelve reads that expects no nudge.

#### Minor

1. `src/tests/gates/opencode-turn.test.ts:1141-1150` (and the report). The 2.x cases have no separate RED. The report admits the gate stops at its first failure. The 2.x parser unit cases are not in that gate's RED either. The 2.x `completed` plus `exit 1` and `completed` with no exit paths are tested only at the parser level, and no 2.x plugin case drives them. Nothing tests a 1.x null exit through the plugin.
2. Report "Files changed" lists `state.md`, which the brief's commit list excludes (`git add` by path). It is the controller's ledger, so stage it separately or drop it.
3. `fx-opencode-v1.ts:440-447`, `fx-opencode-v2.ts:358-363`. The queue is unbounded across session lifetimes. A child session that never makes another request leaves its entry in memory for the plugin's life. Bounded in practice by once-per-turn nudges, so low severity.
4. `fx-opencode-v2.ts:416`. The `prompt` callback went from sync to `async` while the header still says it is unverified whether 2.0.18 awaits hook promises. In reminder mode the `await decideStop` does no real I/O wait, so the enqueue lands in a microtask, but the code leans on that. Write the reason in a comment, or note the risk.
5. `opencode-turn.test.ts:1193,1205,1258`. "After the preamble" is asserted only as `indexOf > 0`. No case has a health line, so "after the health line" is untested.
6. `fx-opencode-v2.ts:388-405`. On 2.x, `args` comes from `ev.input`. If `input` is absent on `execute.after`, an `edit` call has `{}` and no paths for `editedPaths`. The command fallback covers only `shell`. Record the file path from `execute.before` for edit tools too, or state in the header that edit paths are lost.

### Assessment
**Task quality: Needs fixes**

Reasoning: the main mechanics are correct and well tested for the cases the brief lists: ordering, once-only delivery, per-session queues, and the no-session-id rule. Three integrity gaps remain.
- 2.x can silently stop nudging and can send false reminders, and it leaves no trace of why.
- A killed 1.x run can count as verification.
- The read-only and subagent exemptions of design 8 do not apply on opencode, so review agents get nudged.

All three have small fixes. The 2.x conformance run and the 2.x event shape stay deferred, as the rulings say.

## Ledger lines
Task 10: minor (deferred): the 2.x turn-gate cases and the 1.x null-exit and 2.x no-exit paths have no plugin-level RED or case; only the parser units cover them.
Task 10: minor (deferred): state.md (the controller's ledger) was staged with the task, outside the brief's path list.
Task 10: minor (deferred): the per-session queue is never pruned for sessions that make no further request.
Task 10: minor (deferred): the 2.x prompt callback is now async while the header says whether 2.0.18 awaits hook promises is unverified.
Task 10: minor (deferred): "after the health line" is untested; the gate asserts only indexOf above 0.
Task 10: minor (deferred): on 2.x, edit paths are lost when execute.after carries no input, since only shell commands are recovered from execute.before.
