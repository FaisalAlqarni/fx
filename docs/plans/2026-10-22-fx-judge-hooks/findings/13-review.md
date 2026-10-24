### Spec Compliance (✅ / ❌ with file:line; ⚠️ cannot verify)

Adversarial review (code mode), diff c2da440..7d70dbd. Findings are checked against the brief, the audit, and the shipped files at their cited lines.

- **Gap 1, Codex PostToolUse shape: partly closed.**
  - ✅ The shape is recorded with its source, the Codex 0.164.0 binary path, read-only (references/harnesses/codex.md:94-126).
  - ✅ The parser matches both text forms (src/lib/tool-events.ts:50).
  - ✅ The new cases are at src/lib/tool-events.test.ts:48-52. The change is additive: every earlier tool-events assertion is unchanged in the diff.
  - ❌ The doc records the still-running `exec_command` form (codex.md:113-121). The final exit code for that call arrives later through `write_stdin`, which fx classifies as `other` on Codex (tool-events.ts:14). Long checks still never verify; see Important 2.
- **Gap 2, Claude failing-Bash payload: owner item by ruling.** ✅ It is marked docs-sourced and UNVERIFIED (references/harnesses/claude-code.md:52).
- **Gap 3, calibration state: closed.**
  - ✅ There is one builder, `judgeState` (src/lib/shell-guard.ts:58). `decide` uses it (shell-guard.ts:125), and guard-calibrate uses it for the warm-up and for every request (src/scripts/guard-calibrate.ts:75, 90). It is the same function, not a copy.
  - ✅ The ADR state sentence (docs/adr/0047-the-judge-is-optional-and-fails-open.md:32) matches what the function sends.
  - ✅ The table (ADR:36-40) matches the reported raw output (report:34-43).
  - ✅ The per-label breakdown is consistent with the table: 16+13+5 = 34 matches; the unrelated half goes from 8/10/3 to 9/10/2 after the two flips.
  - ⚠️ I could not rerun the live calibration.
- **Gap 4, ADR and design stale rulings: closed for the scope the brief named.**
  - ✅ ADR:21 has no stamp on either opencode major, with the reason and the reference files.
  - ✅ ADR:24 covers the opencode 1.x text, opencode 2.x code rules only with `judge-unsupported`, and headless ask.
  - ✅ The design notes are dated 2026-10-23 and point at the named rulings (design.md:37 under story 8; design.md:89 before the stamp paragraph).
  - Story 10 (design.md:39) is still stale; see Minor 3.
- **Gap 5, opencode prune: closed.**
  - ✅ It runs once per construction: v1 at src/plugins/fx-opencode-v1.ts:342 (export pick at :168), v2 in `setup` at src/plugins/fx-opencode-v2.ts:286.
  - ✅ `pruneJournals` touches only `sessions/*.jsonl` (src/lib/journal.ts:91-99).
  - ✅ The tests are at src/tests/gates/opencode-turn.test.ts:112-118, with a RED per major in the report.
- **Gap 6, fx-state refusal: closed.** ✅ ADR:11 and INSTALL.md:364-368. One overstatement; see Minor 2.
- **Gap 7, headless ask: closed.** ✅ claude-code.md:54-56, INSTALL.md:370-372, ADR:24.
- **Gap 8, positive judge path: closed.**
  - ✅ The Claude Code run and ask cases already existed (src/tests/gates/shell-guard-claude.test.ts:128-144 and :200-207).
  - ✅ New: write then a grey `fx-pretooluse` call, asserting exactly one request carrying `decision` (src/tests/gates/judge-cli.test.ts:167-173). It can fail if the guard does not load the written judge.
- **Gap 9, Codex SubagentStop and read-only: closed.**
  - ✅ SubagentStop blocks once and the root stays silent (src/tests/gates/stop-check.test.ts:231-241).
  - ✅ The lens subagent is silent and a general-purpose control in the same turn gets the line (src/tests/gates/loop-nudge.test.ts:127-140). Both can fail.
- **Gap 10, opencode passive-stall: closed.** ✅ references/harnesses/opencode.md:37 and opencode-v2.md:55.
- **Gap 11, task 12 criterion: closed.** ✅ docs/plans/2026-10-22-fx-judge-hooks/tasks/12-no-rm-in-shell-c-strings.md:40. The runtime observation is an owner item by ruling.
- **Gap 12, exported-symbols table: closed.**
  - ✅ docs/plans/2026-10-22-fx-judge-hooks/plan.md:120-160.
  - Spot-checked against the shipped exports: `ToolResultInput` (loop-tracker.ts:49-61), `GuardInput` (shell-guard.ts:25), `redact` (redact.ts:211), `appendPrompt` (journal.ts:54), `checkAnswer` (judge-input.ts:92), the `opencode-queue` constants (:8-9) and `healthFailed` (health-failure.ts:12). All match.
- ⚠️ test_scope ALL GREEN with exit 0, and check-prose on the touched Markdown, are reported only (report:81-96). I have no shell to rerun them.
- **The unrelated-prompt concern: yes, it is a weakness the ADR must state.** ADR:17 says only user prompts soften, meaning a request for this command. The measured effect is the opposite: a prompt that asks for the command changed nothing, and an unrelated one moved `git clean -fdx` from deny to ask (ADR:42). Two facts make this matter:
  - On Codex, ask becomes warn and the command runs (ADR:24). So an unrelated user prompt turns a judged deny into an executed command there.
  - A real root session almost always has a prompt, so production runs look like the two prompt rows (21 commands each, 0 of 6 and 0 of 5 deny-labelled let run). The no-prompt row the ruling gates on is the rare case.

  The ADR records the flips but draws no conclusion, and its preceding sentence contradicts them (Important 1).

### Strengths

- `judgeState` is a real extraction: `decide` and the calibration both call it. The gate case at shell-guard-claude.test.ts:145-169 compares the calibration's request state with the hook's own for the same command. Its RED (report:58-59) shows the old `tool` key, so it was a real check.
- The prune is the existing `pruneJournals`, reused, with no new code path. v2 runs it inside the existing `attempt` wrapper.
- Every new test has a control or a positive assertion: the general-purpose sibling, the root Stop, and the one-request count.
- The Codex section separates what the binary proves (schema and text forms) from what it does not (which value fills `tool_response`).

### Issues

#### Critical

None.

#### Important

1. **ADR 0047 contradicts its own calibration data on prompt softening.**
   - **Where:** docs/adr/0047-the-judge-is-optional-and-fails-open.md:42 (also :17).
   - **What is wrong:** ":42 says the user's request does not yet soften anything under this wording. The next sentence reports that an unrelated prompt moved one command from ask to run and `git clean -fdx` from deny to ask. The old text said this was the safe direction; that claim is gone, and nothing replaces it.
   - **Why it matters:** The ADR goes to the final review with the calibration table. As written, it tells that review the softening is content-blind without saying so. It also hides that on Codex the deny-to-ask flip means the command runs with a warning (ADR:24).
   - **Fix:**
     - Replace the sentence: the user's request did not soften the matched commands, and an unrelated prompt did soften two.
     - Add a Consequences bullet: the prompt shifts answers regardless of content; on Codex such a flip runs the command; the realistic case is the prompt rows, measured on only 11 deny-labelled commands across two halves.
     - No code change: thresholds are carried to the final review by ruling.

2. **A still-running Codex `exec_command` never gets its exit code.**
   - **Where:** references/harnesses/codex.md:113-121; src/lib/tool-events.ts:14 and :50.
   - **What is wrong:** The doc records that `exec_command` returns `Process running with session ID N` while the process runs. In unified exec, the final exit is reported later through `write_stdin`. Codex has no other shell tool in recent versions (docs/plans/2026-09-21-multi-harness/research/codex-local-model.md:34, 45). fx classifies `write_stdin` as `other` and never reads its result (tool-events.ts:14).
   - **Why it matters:** Audit gap 1's effect, a passing check that never verifies and a Stop block on every Codex turn with an edit, survives for any check that outlasts the `exec_command` yield window. That is most real test suites. "The parser matches it" holds only for short commands. This rests on my reading of unified exec's yield behaviour, which nothing in this run measured.
   - **Fix:** At minimum, state the limit in codex.md and add it to the owner item: a recorded payload for a long check, plus whether `write_stdin` reaches PostToolUse at all. If it does, a later task reads the exit line from `write_stdin` output.

#### Minor

1. **The exit-code match is not limited to the header.**
   - **Where:** src/lib/tool-events.ts:50.
   - **Problem:** The multiline match scans the whole response. For the running form, which has no exit line in the header, an output line that begins with either exit phrase is read as the outcome. A still-running check can then count as ok.
   - **Fix:** Match only the lines before the `Output:` line, and add a test for a running response whose output carries an exit line.
2. **ADR:11 overstates the fail-closed apply_patch path.**
   - **Problem:** It says an `apply_patch` whose paths the patch parser cannot read is refused. src/hooks/fx-codex.ts:201-206 refuses only when `patch-paths` fails to load or throws. A patch that yields zero paths passes with a stderr line (fx-codex.ts:216-217).
   - **Fix:** Reword to "an `apply_patch` when the patch parser fails to load or throws".
3. **Story 10 still describes stamp behaviour that rulings removed on opencode.**
   - **Where:** design.md:39.
   - **Problem:** It still says the stamp gives a warning where the harness has no ask, which reads as covering opencode 1.x. Audit gap 4's design line names stories 8 and 10; only story 8 got a note.
   - **Fix:** Add the same dated note under story 10.
4. **`judgeState` gives the same state only for the command, cwd and harness.**
   - **Problem:** `user_request` is passed in by the caller. The guard passes the journal's redacted, capped prompt (shell-guard.ts:125). The calibration passes the raw string (guard-calibrate.ts:90). They agree on today's set only because no command in it holds anything to redact.
   - **Fix:** Redact and cap `userRequest` inside `judgeState`, or state the limit in the ADR.
5. **One assertion in the calibration gate can pass vacuously.**
   - **Where:** src/tests/gates/shell-guard-claude.test.ts:163, 168.
   - **Problem:** `guardAsked` is never asserted to exist. If both the guard and the calibration stopped sending `user_request`, "a matching prompt" would pass comparing nothing with nothing.
   - **Fix:** Add `assert.ok(guardAsked !== undefined)`.
6. **The ADR does not record the cwd value the run sent.**
   - **Problem:** The run sent the base name `fx-judge-hooks` (report:30). ADR:32-34 says only "the working directory's base name" and "from the repository root". A rerun from another checkout sends a different state, and a directory name about guards may bias the model.
   - **Fix:** Name the value in ADR:34.
7. **A prune failure leaves no trace.**
   - **Where:** src/lib/journal.ts:92-99 (pre-existing).
   - **Problem:** `pruneJournals` swallows every error, so the v2 `attempt` wrapper (fx-opencode-v2.ts:286) can never report one. Design decision 3 says a journal failure goes to stderr.
   - **Fix:** Print a stderr line in `pruneJournals`'s outer catch, except when the directory is missing.

### Assessment

**Task quality: Needs fixes.**

**Reasoning:** Eleven of twelve gaps are closed and the code changes are small and correct. The calibration really uses the guard's builder, prune reaches both majors and only the sessions directory, and the new tests can fail. Two things stand in the way:

- ADR 0047, the record the final review triages from, contradicts its own data. It leaves out that an unrelated prompt can turn a judged deny into an executed command on Codex.
- The Codex outcome fix covers short commands only. A check that outlasts the `exec_command` yield never verifies, so audit gap 1's stated effect persists for real test suites, and codex.md does not say so.

Both fixes are mainly prose plus one owner-item line. Not checked: the live calibration, test_scope and check-prose reruns (no shell), and whether `write_stdin` reaches Codex hooks at all.

## Ledger lines

Task 13: minor (deferred): tool-events.ts:50 scans the whole Codex response, so a still-running exec_command whose output has an exit line reads as ok; limit the match to the header.
Task 13: minor (deferred): ADR 0047:11 says an apply_patch with unreadable paths is refused, but fx-codex.ts:216-217 lets a zero-path patch through with a stderr line.
Task 13: minor (deferred): design.md:39 story 10 still implies a stamp warning on opencode 1.x and has no amended-by-ruling note.
Task 13: minor (deferred): judgeState takes user_request from the caller, so the guard sends a redacted journal prompt while guard-calibrate sends the raw string.
Task 13: minor (deferred): shell-guard-claude.test.ts:163 never asserts guardAsked exists, so the matching-prompt comparison can pass on two undefined values.
Task 13: minor (deferred): ADR 0047:34 does not name the cwd base name the calibration sent (fx-judge-hooks).
Task 13: minor (deferred): pruneJournals swallows every error, so the v2 attempt wrapper never reports a failed prune and design 3's stderr line never appears.
