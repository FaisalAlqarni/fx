## Coverage audit

Plan mode, read-only. Sources: design.md (decisions 1 to 14, Global Constraints, stories 1 to 28), plan.md, tasks 01 to 12 and state.md through line 418. Where a doc claim mattered, I checked the shipped files: ADR 0047, the harness references, README, INSTALL, `src/lib/shell-guard.ts`, `src/scripts/guard-calibrate.ts` and `src/lib/tool-events.ts`.

### Gaps

1. **Codex PostToolUse result shape was never read from the source.** Severity: Important.
   - **Design:** Further Notes lists "the Codex PostToolUse `tool_response` shape" as unverified and "settled by its task". Decision 7 says Codex reads an exit code from `tool_response`. Decision 8 builds repeat-failure on that outcome.
   - **What no task carries:** task 09 reads the Codex source for the Stop input only. Task 08's Tests field tells it to settle the Claude failure payload, but never the Codex `tool_response`. `src/lib/tool-events.ts:48-52` matches an assumed `Exit code: N` string or an `exit_code` field, and `references/harnesses/codex.md` records no PostToolUse shape at all.
   - **Effect if the guess is wrong:** every Codex result reads as `unknown`. Repeat-failure never fires on Codex, and a passing `make test` never verifies, so every Codex turn with an edit gets blocked.
   - **Why the live row will not catch it:** row 22 asserts only that a block fires, and a block fires either way.
   - **Closest tasks:** 08, 09.
   - **Smallest fix:** a follow-up that records the PostToolUse `tool_response` from the same Codex 0.164.0 schemas task 09 read, written into `codex.md`. Also add a leg to sub-project 4's row 22: a check passes after the edit, and Stop does not block.

2. **The Claude failing-Bash signal comes from docs, not a recorded payload.** Severity: Important.
   - **Design:** decision 7 says "task 08 settles from a recorded payload whether a failing `Bash` call arrives as `PostToolUseFailure` or as `PostToolUse` with an exit status".
   - **What no task carries:** task 08 allowed a docs fallback, and the implementer used it (`claude-code.md:46`: "not a recorded payload"). No ruling accepts the drift.
   - **Effect if the docs are wrong:** if a non-zero `Bash` exit arrives as `PostToolUse`, fx reads the outcome from the event name. A failed `make test` would then count as verified, and the Stop check would pass unverified work. That is stories 16 and 18 on the main harness.
   - **Why the live row will not catch it:** row 22 has no failing-check leg.
   - **Closest tasks:** 08, 09.
   - **Smallest fix:** add a leg to sub-project 4's row 22 (failing check, then Stop still blocks), or make the one `claude -p "Run the shell command: false"` recording an owner item in the completion report.

3. **The calibration in ADR 0047 measured a state the guard never sends.** Severity: Important.
   - **Design:** decision 13 says the ADR records rates "under the starting thresholds". The ledger ruling at line 15 accepts the new wording only if at most 2 of 11 deny-labelled commands run.
   - **What no task carries:**
     - `guard-calibrate.ts:88` sends `{ tool: 'Bash', command, user_request? }`.
     - `guardShell` (`shell-guard.ts:117`) sends `{ command, cwd, harness, user_request? }`.
     - ADR 0047 says "The state sent is `{ tool: "Bash", command }`", which is false for production.
     - The "0 of 11" result that cleared the ruling's gate was measured on a different input.
   - **Closest tasks:** 01 (calibration, ADR), 03 (state builder).
   - **Smallest fix:** amend task 01's ADR criterion to read "measured with the state `guardShell` sends". Then re-run the calibration through the guard's own state builder, or make the guard send the calibrated shape, and correct the ADR sentence.

4. **ADR 0047 and design decision 5 still describe stamp and judge behaviour that rulings removed.** Severity: Important.
   - **Design:** decision 5 (an honoured stamp gives a warned run on opencode 1.x and ask on 2.x; the 1.x ask tells the agent to re-run with the stamp), stories 8 and 10, and decision 13 (ADR records "the stamp ... amendments, ask maps per harness").
   - **Rulings:** lines 216 and 220 (no stamp on either opencode major), line 278 (the opencode texts say fx cannot take the user's agreement), and task 07's code-only branch (no judge on 2.x).
   - **Where they are recorded:** `references/harnesses/opencode.md:32`, `opencode-v2.md:49`, README:178-181 and INSTALL:355-359.
   - **What is still stale:**
     - ADR 0047:19 says a stamp becomes "warn where the harness has no ask".
     - ADR 0047:22 says opencode 1.x "throws with a reason that tells the agent to confirm with the user", and implies a judge ask on 2.x.
     - design.md decision 5 and story 8 are unannotated, even though ruling 216 says it "amends design 5". Decision 14 was folded into design.md by ruling, but these rulings were not.
   - **Closest tasks:** 01 owns the ADR. No task after it touches the ADR.
   - **Smallest fix:** two edits to ADR 0047's Decision section (no stamp on opencode; 2.x runs code rules only, with the reason and the reference file). Add a dated "amended by ledger ruling" note on design decision 5 and story 8.

5. **Journals are never pruned on opencode.** Severity: Important.
   - **Design:** decision 3: "At SessionStart, journal files not modified for seven days are deleted." Story 2 and the Solution put every hook on all four harnesses.
   - **What no task carries:** task 04 prunes in `fx-context` and `fx-codex` only. Tasks 06, 07 and 10 never call `pruneJournals`. Grep confirms it appears only in those two hooks and `journal.ts`.
   - **Effect:** an opencode-only user's `sessions/*.jsonl` files grow without limit. They hold commands whose redaction the ledger calls best-effort (two leaks parked at the cap, ruling line 57), and seven-day retention was their only bound.
   - **Closest tasks:** 04, 06, 07, 10.
   - **Smallest fix:** a follow-up that prunes once per plugin construction on both majors, with one test per major (an 8-day-old file is gone, a 1-day-old file stays).

6. **A fail-closed fx-state write refusal ships that no decision, ADR or doc records.** Severity: Important.
   - **Reverse shape:** the tasks built a rule the design never states.
   - **What was built:**
     - Task 03's lens I8 fix refuses `Write`, `Edit`, `MultiEdit`, `NotebookEdit` and shell commands that name fx's state directory.
     - Task 05 mirrors it for Codex `apply_patch`.
     - Ruling 222 keeps the `apply_patch` refusal fail-closed on a load failure.
     - Ledger 92: a `shell-rules` load failure denies every Write and Edit.
   - **Conflicts:** this contradicts the Global Constraint "the judge, shell guard, Stop check and tracker fail open". It also extends the guard to non-shell tools, which Out of Scope excludes for the judge.
   - **Where it is recorded:** grep finds it in no ADR, no harness reference, and neither README nor INSTALL. Users will hit this refusal with no documented reason. The MCP-write gap (ruling 149) also depends on this undocumented rule.
   - **Closest tasks:** 03, 05, 08.
   - **Smallest fix:** one ADR 0047 paragraph naming the refusal, its fail-closed choice and why it is the second fail-closed guard, plus one line in INSTALL's judge section.

7. **The headless ask-as-deny behaviour is never written down.** Severity: Minor.
   - **Design:** decision 5: "On Claude Code in headless mode (`claude -p`) an ask resolves like a deny; this is the harness's behaviour and is documented". Task 03 Risks: "ADR 0047 records that."
   - **What no task carries:** task 01's ADR criterion omits it. Grep finds it in no ADR, reference, README or INSTALL. This matters for the owner's unattended runs.
   - **Closest tasks:** 01, 03, 11.
   - **Smallest fix:** one line in `references/harnesses/claude-code.md` and INSTALL's judge section.

8. **No acceptance criterion states the positive judge path.** Severity: Minor.
   - **Design:** stories 4, 6, 12 and 25 (a grey command judged run, ask or deny; ask reaches the user as the harness prompt; a down judge fails open; setup writes a judge the user can see used).
   - **What no task carries:**
     - Task 03's criteria are all refusals, the allowlist, the stamp and fail-open on a crash. Judged allow and native ask live only in its Tests field (cases 6 to 12), and are held only indirectly by "ALL GREEN".
     - Task 11's positive criterion stops at "written ... and checked". No criterion says a guard call after `write` reaches that judge.
   - **Closest tasks:** 03, 11.
   - **Smallest fix:** add one criterion to task 03 ("with a judge configured, a grey command is allowed on `run` and gets Claude Code's ask prompt on `ask`"). Add one test to task 11 (`write` against the fake server, then a `fx-pretooluse` grey call records one request).

9. **The Codex half of SubagentStop and of the read-only nudge exemption is untested.** Severity: Minor.
   - **Design:** decision 7 (SubagentStop on Claude Code and Codex), decision 8 (read-only agents never nudged), decision 12 (Codex registers SubagentStop).
   - **What no task carries:** task 09 tests SubagentStop on Claude only. Task 08 tests the read-only exemption on Claude only. Ledger lines 241 and 287 defer both, and no criterion names Codex for either.
   - **Closest tasks:** 08, 09.
   - **Smallest fix:** two Codex process cases: SubagentStop with `agent_id` after an `apply_patch` blocks once, and an `fx-lens-security` subagent with three failures prints nothing.

10. **Passive-stall is not root-only on opencode, and nothing outside the ledger and a plugin comment says so.** Severity: Minor.
    - **Design:** decision 8: passive-stall fires "in a root session only".
    - **What no task carries:** ledger 383 and 385 list this as a known limit, and the v2 plugin header carries a caveat. There is no ruling, and neither `references/harnesses/opencode.md` nor `opencode-v2.md` records it (grep finds no match). Ledger 378: the v1 header also lacks it.
    - **Closest task:** 10.
    - **Smallest fix:** one GAP line in each opencode harness reference.

11. **Task 12's "no permission prompt" criterion is satisfied by a text gate, not the runtime.** Severity: Minor.
    - **Design:** decision 14 (a `-c` string running `rm` stops the session for a prompt; the fix removes them).
    - **What no task carries:** task 12's criterion "Running a single test through `test_one` raises no Claude Code permission prompt" is backed only by a regex over `.fx.json`. Ledger 401 says that regex misses `-lc`, `--rm` and nested strings. Nothing observes Claude Code.
    - **Closest task:** 12.
    - **Smallest fix:** reword the criterion to what is proven ("`.fx.json` holds no `-c` string, checked by the gate"), and list a one-time owner observation in the completion report.

12. **The plan's exported-symbols table has drifted from the code sub-project 3 will consume.** Severity: Minor.
    - **Plan, not design:** plan.md says "Sub-project 3 consumes these; a change here is a change to its plan too."
    - **What changed and is not in the table:**
      - `normalizeCommand` and the guard input gained a `posix` parameter.
      - `classifyShell`, `stripComments` and `overrideReason` now live in `shell-rules.ts`.
      - `health-failure.ts` and `opencode-queue.ts` are new.
      - `health-check-failed` is a new health reason.
    - **Closest tasks:** 03, 04, 07, 10.
    - **Smallest fix:** add one exit-gate step that updates the plan.md table from the shipped exports before sub-project 3 plans against it.

### Cleared

- Two-harness and four-harness stories:
  - The hard rules land on all four harnesses (tasks 03, 05, 06, 07).
  - The health line lands on all four (tasks 04, 06, 07). `health-check-failed` is an addition by ruling (line 138) and is recorded in `opencode-v2.md`.
  - The Stop reminder lands on both opencode majors (task 10).
  - Prompt recording with the C3 subagent rule is on Claude Code and Codex (tasks 02, 05; numeric `agent_id` by ruling line 29).
- The repo switch is defined in decision 10, built in task 02, tested in task 03, and documented in the fx-setup table and INSTALL (task 11).
- Redaction is best-effort, with a local judge recommended: in the docs per ruling line 57 (README:175, INSTALL:322, fx-setup.md:294). The two leaks parked at the cap are owned by the final review fix wave.
- `THIRD_PARTY_NOTICES.md`: task 01, completed under ruling line 16. No later ruling changes what it credits.
- The calibration table exists in ADR 0047 with its backend named. Its input mismatch is gap 3.
- The `GUARD_QUESTION` wording and option order changed by ruling (line 15), and ADR 0047 records both measurements.
- The preamble budget of 3,400 is recorded in ADR 0021:57 per ruling line 396, and the stale 3,000 quotes were fixed in task 12's round.
- Task 12 and decision 14 compile against each other (ruling lines 77 and 83). The new `scripts/test-one {file}` still matches the repo-command allowlist's two-word or slash prefix rule.
- opencode 2.x code-only, with no judge and no stamp, is covered by ruling, the `opencode-v2.md` reference and README:180-181. The ADR side is gap 4. The unproven 2.x prompt hook is an owner item by ruling line 281, and row 22's 2.x reminder exercises it.
- The Codex re-trust step is in the health line (task 04) and INSTALL (task 11).
- Live rows 21 to 23 and the opencode subagent GAP belong to sub-project 4's task 14 by design (Testing Decisions, Out of Scope).
- The judge-cli key never reaches argv, the file is written 0600 atomically, and a remote write carries its warning (task 11, two fix rounds).
- Decision-log rotation and 0600 are tested in task 01. The journal mode has a test in `journal.test.ts`.
- The opencode 1.x `chat.message` signature was read from the installed binary under ruling line 217. The Codex Stop contract was read from the 0.164.0 schemas (ledger 273), with the missing line cite deferred at ledger 292.

### Verdict

Most design commitments have an owner. Three integrity holes do not:

- The two harness-payload facts the Stop check and tracker rest on were never measured: the Codex `tool_response` and Claude's failing-Bash event. The planned live row cannot catch either, because it asserts only that a block fires.
- The calibration that cleared the judge wording measured a different state from the one the guard sends.

Separately, ADR 0047 now contradicts three opencode rulings and omits the fail-closed fx-state refusal, and opencode never prunes journals. All six Important gaps need a criterion or a follow-up before the final branch review closes. The Minors are doc lines or single test cases.

I did not read the findings files or the source beyond the lines cited. The judgment that the Claude docs may be wrong about `PostToolUseFailure` is a risk to rule out, not an observed failure.

Gaps: 12; tasks affected: 01, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12
