### Spec Compliance (✅ / ❌ with file:line; ⚠️ cannot verify)

**src/lib/stop-check.ts**
- ✅ `DOC_EXTENSIONS` and `turnNeedsEvidence` (:1069-1082) match the brief, including the doc-edit and later-check cases.
- ✅ `decideStop` null conditions (:1096-1101): no key, `stopHookActive`, `stopCheck` off, a `stop-block` in the turn, or no need for evidence.
- ✅ I11 (:1111): `null` or `""` takes the no-message path with no judge call.
- ✅ `OVERCLAIM_LIFT_MAX` (:1115): lift needs `p <= max` and `!escalate`. Per the self-review, exactly 0.3 lifts.
- ✅ The block text and the reminder text match the brief verbatim (:1105-1106).
- ❌ Fail-open catch (:1129-1131): a throw writes to stderr only. The brief says "every block ... a decision-log line" and the global constraints say the Stop check fails open. A fail-open path with no log line is invisible (Issue 2).
- ❌ `appendEvent` returns a boolean (`src/lib/journal.ts:36-46`) that `decideStop` ignores (:1122, :1126). "Never blocks twice ... not when fx's own journal shows a block" silently depends on the write succeeding (Issue 1).

**src/hooks/fx-turn.ts (:818-848)**
- ✅ `Stop` and `SubagentStop` are routed. The `agent_id` is used only for `SubagentStop`. Output is only `{decision, reason}`, exit 0.
- ✅ A `SubagentStop` with no `agent_id` is skipped rather than run against the root journal. That prevents a stray root block.
- ✅ The `require` sits inside the outer `try` through `return await`.

**src/hooks/fx-codex.ts (:731-775)**
- ✅ A separate `stopCheck` branch, beside and not inside the PostToolUse code. It prints nothing or exactly the block JSON, and the `catch` returns `''`, so no exit 2.
- ✅ The Codex subagent journal gets its prompt event from SubagentStart (`fx-codex.ts:336-339`), so `currentTurn` works for subagents.

**src/lib/hook-input.ts / hook-input.test.ts**
- ✅ `stop_hook_active` is true only for boolean `true`. A missing or non-string `last_assistant_message` is `null`. Both are tested on both parsers.
- ✅ `agent_id` was already carried.

**hooks/hooks.json and hooks.json**
- ✅ Claude gets `Stop` and `SubagentStop` on `fx-turn.js` with timeout 5. Codex gets both on `fx-codex.js` with no timeout, and the description is updated.

**src/tests/gates/codex-hook-output.test.ts**
- ❌ Brief: "Stop and SubagentStop allowed top-level keys: `decision`, `reason`". The allowed-key sets (`:31-34`, `TOP`, `TOP_SESSION`, `TOP_PRE`, `INNER`) were not touched, so there is no Stop set. The new block (:1267-1281) checks inline `deepStrictEqual(keys, ['decision','reason'])`. That is stricter for this case, but the gate's declared list is incomplete.

**references/harnesses/codex.md**
- ❌ The brief asks for each field with "the file and line" in the Codex source. The diff has none. It cites binary-embedded schemas (:577-606).
- ❌ The brief asks whether the continuation fires `UserPromptSubmit`. The answer is "Not confirmed".
- Both gaps are stated in the file, so they are honest. This is the ⚠️ the controller flagged. The schema is from 0.164.0, the plan was written against 0.155.1, and I cannot verify the schema claims from the diff.

**src/scripts/test-scope.ts, scripts/check-all**
- ✅ The `hooks/` rule gains `node tests/gates/stop-check.test.js`. Two lines are added to `check-all` as new lines, unreordered.

**The two gates edited outside the file list**
- `src/tests/gates/codex-manifest.test.ts` (event-name list) and `src/scripts/test-scope.test.ts` (rule pin) are required by gates that pin registered events and the scope rule. This is justified extra, not creep.

**Rulings**
- ✅ "Non-failed edits", "verified only" and "interrupted is unknown" are inherited through `edit` events and `tool.verified`. `turnNeedsEvidence` adds no policy of its own.
- ⚠️ The process gates drive only successful calls. A failed edit, a failed check or an interrupted call is not exercised end to end here.
- ⚠️ A Codex shell `apply_patch` counting is task 08's fix round. It is not tested here.

**⚠️ Claude `agent_id` on a subagent's `PostToolUse`**
- Gate case 17 (`stop-check.test.ts:1494-1497`) injects `agent_id` itself, so it proves routing only. It does not prove Claude sends the field.
- Nothing is recorded in `references/harnesses/claude-code.md`, which the brief says to do only if a payload shows the field missing. Not verifiable from the diff.

**⚠️ Claude `Stop` payload fields**
- Nothing in the diff cites a source for `stop_hook_active` or `last_assistant_message` on Claude Code. If Claude omits `last_assistant_message`, the judge lift can never fire, silently.

### Strengths
- `turnNeedsEvidence` is a pure function of the journal. The unit test builds events directly, so it does not depend on the recorder's classification.
- Block-once uses two independent guards, the harness flag and the journal event, which is the "block once" design.
- A subagent with a missing `agent_id` is skipped, which avoids both a false block and a block against the wrong journal.
- The tests are real behavior. Each gate case spawns a fresh scratch environment. The final message is checked for redaction on the wire (:1486-1488). The log is checked not to contain the message (unit :1042). The 3 s judge delay is asserted under 2.5 s.
- The RED evidence is real and varied (a runtime assert, a module-not-found, and a JSON parse failure), and the two test bugs fixed on the way to green are reported.
- The Codex branch is kept apart from task 08's PostToolUse branch, as asked.

### Issues

#### Critical
None.

#### Important

1. **src/lib/stop-check.ts:1122,1126: the `appendEvent` result is ignored, so block-once can fail open into block-always.**
   - What is wrong: `appendEvent` returns false when the write fails (`journal.ts:43-46`, swallowed, stderr only). `decideStop` still returns the block.
   - Why it matters: the brief says "never blocks twice: not when fx's own journal shows a block". With an unwritable state dir, the only guard left is the harness's `stop_hook_active`. The Codex field is unconfirmed beyond a binary schema, and the codex.md fallback is "relies on the journal". The same applies to a subagent, which is the "never block a subagent forever" case.
   - Fix: `if (!appendEvent(key, ...)) return { text: null }` after logging the failure. Do it on both block paths, and add a test with an unwritable sessions dir.

2. **src/lib/stop-check.ts:1129-1131 (and the matching catches in fx-codex.ts:745 and fx-turn.ts's outer catch): a throw leaves no decision-log line.**
   - What is wrong: a fail-open Stop check that errors is recorded only on stderr. Claude Code and Codex hide hook stderr unless the user looks.
   - Why it matters: "the Stop check never fired" cannot be told apart from "nothing to block", which breaks human-debuggability. There is also precedent: the Codex crash path logs `guard-error` (task 05). If `logDecision` throws after `appendEvent`, the turn is journaled as blocked but never blocked.
   - Fix: in the catch, best-effort `logDecision({event:'stop', action:'error', ...})` wrapped in its own try. Use the same reason for a missing or non-function `decideStop` in the hooks.

#### Minor
1. **src/tests/gates/codex-hook-output.test.ts:31-34,1267-1281:** the brief's Stop and SubagentStop allowed-key set was not added to the gate's declared sets. An inline key check stands in for it.
2. **src/tests/gates/stop-check.test.ts:1491-1498 and src/lib/stop-check.test.ts:1013-1018:** "never block a subagent forever" has no test. There is no second `SubagentStop` after a block, with the flag false and with it true. There is also no Codex `SubagentStop` block at all, only a no-edits case with agent `nobody`.
3. **src/lib/stop-check.test.ts:1022-1028:** the `!a.escalate` clause and the exact 0.30 boundary are untested. The tests use p of 0.1, 0.5 and 0.9 only, so deleting `!a.escalate` passes the suite.
4. **src/tests/gates/stop-check.test.ts:** no process case for a failed check or an interrupted Claude call. The ruling "only a verified check counts; interrupted is unknown" is covered only by the unit test's hand-built `check(false)`. No log assertion for 0.5 either (the brief says escalation `mid-noul`) or for the no-message source.
5. **src/lib/stop-check.ts:1111:** a whitespace-only message is sent to the judge. The brief says empty or missing only, but a trimmed check costs nothing.
6. **src/hooks/fx-turn.ts:826 vs src/hooks/fx-codex.ts:741:** `cwd` uses `??` in one and `||` in the other. An empty-string `cwd` on Claude reads `.fx.json` from `''`.
7. **references/harnesses/codex.md:577-606:** no source file or line, the continuation behavior is not confirmed, and the plan assumed 0.155.1 while the schema is 0.164.0. The report and file are honest, but the contract remains unconfirmed against the plan's version.
8. **src/lib/stop-check.ts:1115-1118:** a lift writes no journal event, so a repeated Stop in the same turn asks the judge again, and each ask costs up to 1.5 s. This is self-declared as deliberate.

### Assessment
**Task quality: Needs fixes.**

Reasoning: the Stop design matches the brief on every functional point: the null conditions, block-once through both guards, I11, the lift rule, the exact texts, the output keys and the exit codes. The tests drive real processes. Two integrity and debuggability gaps remain, both in the fail-open paths the controller asked about. A failed journal write quietly drops one of the two block-once guards, and a thrown error leaves no decision-log line. Both are small fixes. The Minor items are test breadth and the unconfirmed Codex source, which the report flags honestly. The Claude `agent_id` and the Claude Stop payload fields stay ⚠️ until the live row measures them.

## Ledger lines
Task 09: minor (deferred): Codex gate has no declared Stop/SubagentStop allowed-key set; Stop keys checked inline only (codex-hook-output.test.ts:31-34, :1267).
Task 09: minor (deferred): no test of a second SubagentStop after a block or of a Codex SubagentStop block (stop-check.test.ts gate :1491, unit :1013).
Task 09: minor (deferred): `!a.escalate` clause and the 0.30 boundary of the overclaim lift are untested (stop-check.test.ts unit :1022).
Task 09: minor (deferred): no process case for a failed check or an interrupted Claude call at Stop; no log assertions for mid-noul or no-message (gate stop-check.test.ts).
Task 09: minor (deferred): whitespace-only final message is sent to the judge (stop-check.ts:1111).
Task 09: minor (deferred): cwd defaulting differs, `??` in fx-turn.ts:826 and `||` in fx-codex.ts:741.
Task 09: minor (deferred): codex.md Stop contract has no source line, continuation unconfirmed, schema 0.164.0 vs plan 0.155.1.
Task 09: minor (deferred): a judge lift writes no journal event, so repeat Stops re-ask the judge (stop-check.ts:1115).

Files: /development/fx/.worktrees/fx-judge-hooks-b/src/lib/stop-check.ts, /development/fx/.worktrees/fx-judge-hooks-b/src/lib/journal.ts, /development/fx/.worktrees/fx-judge-hooks-b/src/hooks/fx-codex.ts, /development/fx/.worktrees/fx-judge-hooks-b/src/hooks/fx-turn.ts, /development/fx/.worktrees/fx-judge-hooks-b/src/tests/gates/codex-hook-output.test.ts.

Not checked: I did not run any test, and I read the diff through its "elided context" markers, so I did not re-read the unchanged parts of the modified files beyond the lines cited above.
