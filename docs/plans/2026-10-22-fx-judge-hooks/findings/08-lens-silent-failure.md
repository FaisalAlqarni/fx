Lens: silent-failure, 5 findings

1. [Important] `/development/fx/.worktrees/fx-judge-hooks-b/src/hooks/fx-codex.ts:379-381`, `src/lib/loop-tracker.ts:69,74,94-97` and `src/hooks/fx-turn.ts` (outer catch): the tracker can stop recording and leave only one stderr line on an exit-0 PostToolUse. Nobody sees that line.
   - Three paths fail this way:
     - A tracker or tool-events load failure.
     - Any throw inside `recordToolResult`.
     - A journal write error. `appendEvent` returns false (journal.ts:36-47) and `recordToolResult` discards the result at lines 69 and 74.
   - The consequence:
     - No nudge ever fires in that session.
     - The journal has gaps with no marker.
     - Task 09's Stop check reads this same journal. An empty or short journal means "no edits this turn", so Stop will not block unverified work.
   - The fail-open design is fine. The gap is that `shellGuardOff` (fx-codex.ts:182-191) writes a `guard-error` line to `decisions.jsonl` with builtins only, and this path does not. A 3am reader of the decision log cannot tell "no loop" from "tracker dead".
   - Your report says only PostToolUse edit counting fails open on a `lib/patch-paths` load failure. That understates it. `src/lib/tool-events.ts:4` imports `./patch-paths.js` at the top. So the same load failure makes `require('../lib/tool-events')` throw inside `recordToolCall`, and all recording stops: reads, failures and verification as well as edits.
   - Fix:
     - On a tracker load failure or throw, write one `source: 'tracker-error'` decision-log line with builtins only, as `shellGuardOff` does.
     - Check the boolean from `appendEvent` in `recordToolResult` and log when it is false.
     - Either import `extractPatchPaths` inside `editedPaths` so only edit counting degrades, or fix the comment at fx-codex.ts:72-75.

2. [Important] `src/lib/tool-events.ts` (claude-code branch of `toolOutcomeAndOutput`; compiled at `lib/tool-events.js:61-64`): a failure can be read as success.
   - A `PostToolUse` call is always `ok`. The reference doc lists `interrupted` among the `tool_response` keys, and the code never reads it.
   - An interrupted `make test` that arrives as `PostToolUse` with `interrupted: true` is recorded `ok`. `countsAsVerification` then returns true for a check command, which resets the unverified-writes count and satisfies the Stop check.
   - The same holds with a partial pass summary in the output.
   - In the other direction, a `PostToolUseFailure` with `is_interrupt` counts toward repeat-failure. The model did not retry; the user stopped it.
   - Fix: when `tool_response.interrupted === true`, return `unknown` and never verified. Treat `is_interrupt` failures as `unknown` too.

3. [Minor] `src/hooks/fx-codex.ts:388-390,400` and `:239`: a PostToolUse can still exit 2.
   - Event routing happens after parsing. A parser load failure, or a payload that is not an object, calls `deny`, which exits 2.
   - The global `crashed` handler at line 239 also does this for any uncaught throw before the line-309 swap, so PostToolUse is covered too.
   - `recordToolCall` is sync and wrapped in `try`, so its own code cannot reach exit 2. The risk is the shared pre-routing code. The brief says `fx-codex` never exits 2 on these events.
   - The plugin is broken either way, so this is accepted by design. If it is not, fix it by sniffing `hook_event_name` from the raw text before the parser load deny, or by documenting the exception in the header comment.

4. [Minor] `src/hooks/fx-turn.ts:38` (`if (!parsed.ok) return;`) and `fx-codex.ts:372` (`typeof input.tool_name !== 'string'` returns `''`): a malformed PostToolUse is dropped with no stderr line.
   - The `no session id` case in `recordToolResult` (`key === null`) is silent too. That one is by design per the brief.
   - A harness payload change then looks like "no loop". Write one stderr line on each branch.

5. [Minor] `src/lib/tool-events.ts` (codex branch, `lib/tool-events.js:65-74`): an `unknown` Codex outcome leaves no trace.
   - If Codex's `tool_response` shape differs from the guess, every call is `unknown`, repeat-failure never fires, and nothing records that. The brief accepts the weakening, but nothing shows the tracker is blind.
   - Fix: write a decision-log line the first time a session records `unknown` for a shell tool, or include `outcome` in the existing `nudge`/record logging, so a log reader can see the share of `unknown`.

Checked and fine:
- The fail-closed patch-paths refusal is reached on both routes.
  - The direct `apply_patch` tool runs `checkPatchPaths` at fx-codex.ts:326.
  - The shell route runs it at line 300, after the git guard, and only when `SHELL_APPLY_PATCH` matches. That is correct, because a non-patch shell call has no paths to read.
  - The `deny` call is inside the `catch`, so a thrown `extractPatchPaths` is covered as well as a failed load.
- `emit(recordToolCall(input), '', 0)` and the Claude path never exit 2.
- Nudge output is fixed JSON.
- `logDecision` swallows its own errors, so a log failure cannot discard an appended nudge.
- The earlier non-string-command and missing-`session_id` findings (05 lens #2, #4, #5) still apply unchanged. I did not re-report them.

Not checked: whether `readRepoConfig` throws on a malformed `.fx.json`. If it does, `recordToolResult` loses the whole record via the same stderr-only catch as finding 1. I also did not read the process gate tests or the remaining 1,880 diff lines (tests and generated files).
