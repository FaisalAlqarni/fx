### Spec Compliance (✅ / ❌ with file:line; ⚠️ cannot verify)

**src/lib/tool-events.ts**
- ✅ `classifyTool` matches the brief's tool lists and the five named cases (tool-events.ts:21-27, test lines 8-24). The `HAS` table at tool-events.ts:10-15 is extra and duplicates `EDIT`, `READ` and `SHELL`; see Minor 6.
- ✅ `toolOutcomeAndOutput` follows the brief for Codex: numeric `exit_code` or `exitCode`, a `^Exit code: (\d+)` line, else `unknown`. The output is cut to the last 4 KB (tool-events.ts:36-48).
- ⚠️ Claude branch (tool-events.ts:37-40): the event name alone decides `fail` or `ok`. This rests on the docs, not a recorded payload (see the Claude section below).
- ✅ `editedPaths` covers `file_path`, `notebook_path`, `filePath` and `apply_patch` via `extractPatchPaths` (tool-events.ts:50-56).

**src/lib/evidence.ts**
- ✅ `hasPassSummary` is true and false on every case the brief lists (evidence.ts:38-51, test lines 12-21). A count of 0 is false.
- ✅ `countsAsVerification` passes all ten brief cases (evidence.ts:63-67).
- ✅ `checkHint` is exact (evidence.ts:69-72).
- ✅ The first production caller of `isCheckCommand` is evidence.ts:65. It goes through `isRepoCommand` and `matchRepoCommand`, which require a word boundary, so task 03's rule is used.
- ❌ The "nothing but arguments follows" test is a regex on the whole command, not on the part after the match (evidence.ts:65). See Minor 4.
- ❌ The pass-summary branch ignores `outcome` (evidence.ts:66). The brief is silent on this and the code follows it literally. See Minor 3.

**src/lib/loop-tracker.ts**
- ✅ The three signals and their thresholds come from task 01 constants (`REPEAT_FAILURES`, `PASSIVE_READS`, `UNVERIFIED_EDITS`, loop-tracker.ts:4).
- ✅ Signal order is repeat-failure, unverified-writes, passive-stall (loop-tracker.ts:34-38).
- ✅ Once per signal per turn comes from `fired()`. The 80-character cut and the exact lines match the brief.
- ✅ `loop_nudge` off still records (loop-tracker.ts:75-76 returns after the append).
- ✅ The read-only exemption uses the first `prompt` event's `agentType` and `READ_ONLY_AGENTS` (loop-tracker.ts:78-80). A subagent skips `passive-stall` (loop-tracker.ts:82). The nudge is appended and logged on a signal.
- ❌ Failed edits are recorded as edits (loop-tracker.ts:74). See Important 1.
- ❌ The result of the `nudge` append is ignored (loop-tracker.ts:91). See Minor 1.
- ✅ `checkSignals` has an extra optional `skip` parameter. This is compatible with the brief's "skipped when agentId is non-null".

**Registration**
- ✅ hooks/hooks.json gets `PostToolUse` and `PostToolUseFailure` with matcher `*`, `fx-turn.js` and timeout 5.
- ✅ Root hooks.json gets a `PostToolUse` group for `fx-codex.js` and the description is updated.
- ✅ Nothing exits 2 on these events: fx-turn.ts:17-26 and `emit(…, '', 0)` at fx-codex.ts:~410.

**Output and hook-input**
- ✅ Claude and Codex print `{hookSpecificOutput:{hookEventName,additionalContext}}`. The Claude event name is the real one (`PostToolUse` or `PostToolUseFailure`).
- ✅ The Codex gate asserts only the allowed top and inner keys (codex-hook-output.test.ts, new PostToolUse block).
- ✅ `tool_response` and `error` are added to hook-input and its test. `laneAddress` is exported.

**extractPatchPaths move**
- ✅ The function is moved byte-for-byte into src/lib/patch-paths.ts with its own test.
- ✅ The fx-state refusal is kept and, per the controller ruling, fails closed. `checkPatchPaths` denies when the module is missing or throws (fx-codex.ts:200-206). The new test block covers both load failure and a throw, for a direct and a shell `apply_patch`. It also checks that `ls` and a PostToolUse stay at exit 0.
- ✅ PostToolUse recording fails open (try/catch in `recordToolCall`).

**Claude failure signal**
- ⚠️ references/harnesses/claude-code.md says a failing `Bash` call arrives as `PostToolUseFailure` with an `error` string, and a success arrives as `PostToolUse` with no exit field. The section is sourced from the docs ("read 2026-10-23"), not a recorded payload. The brief allows the docs only "with no credentials", and the report does not say that was the case. Nothing in the diff proves the page was read or that the shape is real. The test payload `"error": "exit 1"` does not exercise the documented `Exit code N` first line.

**Tests**
- ✅ The brief's process tests are present and use real hook processes: three failures, twelve reads plus a new turn, the check-reset scenario, `loop_nudge` false, no session id, read-only subagent versus `general-purpose`, and Codex known and unknown outcomes.
- ✅ The expected strings are written out literally, not imported from constants.
- ✅ The two edits outside the file list are justified:
  - codex-manifest.test.ts asserts the exact Codex event key list, so adding `PostToolUse` to hooks.json forces the edit.
  - test-scope.test.ts asserts the hooks-rule command list, so adding `loop-nudge` to the rule forces the edit.
  - Neither weakens an assertion. Neither asserts the new `PostToolUse` group's matcher or command; see Minor 8.
- ⚠️ "`scripts/check-all` prints `ALL GREEN`": the report says check-all was not run on its own. The `ALL GREEN` it quotes comes from the first scope run, before the pre-review fix commit. The fix run's final lines show no `ALL GREEN`.
- ✅ The RED evidence is real, except that hook-input RED was produced afterwards by stashing the implementation. The report says so.

### Strengths
- The loop-nudge gate runs the real hooks as processes under the scratch environment, and the expected lines are literals, not copies of the constants.
- `repeatedCommand` resets its counters on an edit, which keeps the fx-tdd red-green loop from being flagged. The test covers it.
- The fail-closed fix for `checkPatchPaths` has a test that stubs the module both ways (load error and throw) and also proves PostToolUse stays open.
- `recordToolResult` is wrapped so it never throws. Journal appends are redacted by `redactEvent`.

### Issues

#### Critical
None.

#### Important

1. **A failed edit is recorded as an edit** (src/lib/loop-tracker.ts:74; plan-mandated by "then one `edit` event per edited path"). `editedPaths` runs on `PostToolUseFailure` and on a Codex `fail` outcome, so a rejected `Edit` ("string not found", "file not read yet") appends an `edit` event for a file that did not change.
   - Effects:
     - `repeat-failure` is reset by the phantom edit (loop-tracker.ts:20-22), which defeats the loop detector. A test fails, a blocked `Edit` follows, and the count restarts, so a real retry loop never reaches three.
     - `passive-stall` is masked.
     - `unverified-writes` is inflated.
     - Task 09's Stop check will treat a failed edit as "edits in the turn" and block for a change that never happened.
   - Fix: append `edit` events only when `input.outcome !== 'fail'`. Add a unit case, a failed `Edit` followed by a repeated failure, to `loop-tracker.test.ts`.

#### Minor

1. src/lib/loop-tracker.ts:91 ignores the return value of `appendEvent` for the `nudge`. If the append fails (full disk, read-only file), the line prints on every later tool call. Print only when the append returned true. Also, two parallel PostToolUse hook processes (Claude runs parallel tool calls) can both pass the read-then-append check and print the same line twice. The "once per turn" guarantee is best effort; note it.
2. Claude interrupts and timeouts (claude-code.md:48, tool-events.ts:37-40): `is_interrupt` and `interrupted` are documented but ignored. An interrupted `make test` that lands as `PostToolUse` is recorded `ok` and can count as a verified check. An interrupted call on `PostToolUseFailure` counts toward `repeat-failure`. Treat `interrupted === true` or `is_interrupt` as `unknown`. It follows the ⚠️ above.
3. src/lib/evidence.ts:66: a pass summary verifies even when `outcome` is `fail`. For example, pytest's `4 passed, 1 error` with exit 1 matches the second pattern and has no `N failed`. Cargo's `test result: ok.` for an earlier binary can sit beside a `FAILED` one. The brief's rule is silent on `fail`; fix by returning false when `outcome === 'fail'`. Task 09 reads `verified` as evidence, so this matters there.
4. src/lib/evidence.ts:65 tests the whole command for `|`, `;` and newline, not the part after the matched text. `make test ARGS="a;b"` is wrongly unverified (the implementer notes this). A trailing `&` (background run) is wrongly verified. Slice the tail from `matchRepoCommand` and test that.
5. Claude and Codex disagree on when `command` is set. fx-turn.ts:17 takes `tool_input.command` for any tool, so an MCP tool with a `command` argument is recorded with a command and can trip `repeat-failure`. Codex sets `command` only for `Bash` (hook-input). The same applies to `cwd`: fx-turn.ts:22 uses `??` and fx-codex.ts:376 uses `||`, so an empty `cwd` is handled differently. Gate `command` on the tool being a shell tool, for example `classifyTool(...) !== 'other'`, and use the same fallback in both.
6. src/lib/tool-events.ts:10-15: `HAS` duplicates `EDIT`, `READ` and `SHELL`. Per-harness name sets would remove the second table that must be kept in step.
7. src/lib/loop-tracker.ts:11 imports `normalizeCommand` from `shell-guard.js`, which loads the judge client and the whole guard graph (shell-guard.ts:6-17) into every PostToolUse process. The brief says this hook must stay light and "never call the judge". `classifyShell` already comes from `shell-rules`. Move `normalizeCommand` to shell-rules or a small module. Also, patch-paths load failure takes down the entire tracker, not just edit counting: tool-events.ts imports it at the top, so with the module broken every call logs a stderr line and nothing is recorded. This is still fail-open, but wider than the ruling's "edit counting only".
8. Registration is not asserted. Nothing checks the `PostToolUse` and `PostToolUseFailure` groups in hooks/hooks.json (matcher, timeout 5). codex-manifest.test.ts:~65 checks only the Codex key list. Also no process test covers a Codex `apply_patch` PostToolUse producing `edit` events, or the Codex read-only subagent exemption.
9. Stale comments: src/lib/patch-paths.ts:11-12 still says parse failure "must fail open exactly like a laneCheck throw does". The caller now fails closed, so the sentence misleads. The comment above `checkPatchPaths` in fx-codex.ts is one very long run-on line.
10. Performance: every tool call spawns `git rev-parse` through `readRepoConfig` (repo-config.ts:14, 2 s timeout) and re-reads and parses the whole session journal (loop-tracker.ts:77). That is fine today under the 5 s limit, but it grows with session length.
11. `checkHint` returns the template literally, for example `` `scripts/test-scope {paths}` `` (evidence.ts:69-72). The line then tells the model to run a command with an unfilled placeholder. Plan-mandated by the brief's exact test; recheck at calibration.

### Assessment
**Task quality: Needs fixes**

**Reasoning:** The structure matches the brief. The signal rules, thresholds, nudge lines, never-block behaviour, registration, `extractPatchPaths` move and fail-closed refusal are all faithful, and the process tests are real. The one defect that makes the record untrustworthy is Important 1. A failed edit is journaled as an edit, which resets the repeat-failure counter, masks the stall signal, and will feed false "edits" to task 09's Stop check. The Claude failure shape is also unverified from the diff (docs only, no recorded payload), so Minor 2 stays open until a real payload is captured. Neither the `ALL GREEN` acceptance line nor the Claude failure shape can be confirmed from this diff.

## Ledger lines
Task 08: minor (deferred): nudge append result ignored (loop-tracker.ts:91); parallel hook processes can print a nudge twice.
Task 08: minor (deferred): Claude `is_interrupt` and `interrupted` ignored; an interrupted check can count as verified or as a failure.
Task 08: minor (deferred): `countsAsVerification` pass-summary branch ignores `outcome === 'fail'` (evidence.ts:66); matters for task 09.
Task 08: minor (deferred): "nothing but arguments follows" is tested on the whole command (evidence.ts:65), wrong for `;` inside quotes and for a trailing `&`.
Task 08: minor (deferred): Claude sets `command` for any tool and uses `cwd ?? ...`; Codex sets it for `Bash` only and uses `cwd || ...`.
Task 08: minor (deferred): `HAS` duplicates the `EDIT`, `READ` and `SHELL` sets in tool-events.ts.
Task 08: minor (deferred): loop-tracker imports `normalizeCommand` from shell-guard, loading the judge graph into every PostToolUse; a patch-paths load failure drops all tracking.
Task 08: minor (deferred): no test for the hooks/hooks.json PostToolUse and PostToolUseFailure groups, a Codex `apply_patch` PostToolUse, or a Codex read-only subagent.
Task 08: minor (deferred): stale fail-open comment in patch-paths.ts:11-12 and a run-on comment above `checkPatchPaths`.
Task 08: minor (deferred): `git rev-parse` plus a full journal re-read on every tool call.
Task 08: minor (deferred): `checkHint` emits a literal `{paths}` template (plan-mandated).

Files reviewed:
- /development/fx/.worktrees/fx-judge-hooks-b/.fx/08/review/3c1f763..5655d0b.diff
- /development/fx/.worktrees/fx-judge-hooks-b/src/lib/loop-tracker.ts
- /development/fx/.worktrees/fx-judge-hooks-b/src/lib/evidence.ts
- /development/fx/.worktrees/fx-judge-hooks-b/src/lib/tool-events.ts
- /development/fx/.worktrees/fx-judge-hooks-b/src/lib/journal.ts
- /development/fx/.worktrees/fx-judge-hooks-b/src/hooks/fx-turn.ts
- /development/fx/.worktrees/fx-judge-hooks-b/src/hooks/fx-codex.ts
- /development/fx/.worktrees/fx-judge-hooks-b/references/harnesses/claude-code.md

Not checked: I did not run any test or build. Everything above comes from reading the diff and the source files. This is an adversarial code-mode pass over a brief that includes accepted-risk rulings. None of the deferred items were re-opened. Important 1 is my own finding, not a restatement of a ruling.
