# Task 08 review: controller context cap (da91b73..940b6f8)

### Spec Compliance

- ✅ Six reply sites carry `Reply with at most five lines:` and the exact field names: implementer-prompt.md:345, task-reviewer-prompt.md:289, re-review-prompt.md:138, fx-review/reviewer-prompt.md:195, fx-review/SKILL.md:188, fx-implement/SKILL.md:643.
- ✅ re-review-prompt.md writes to [FINDINGS_FILE] (Output format), no longer says its final message is the report, and takes [PRIOR_FINDINGS_FILE] as a path (re-review-prompt.md:26, 153).
- ✅ fix-loop.md sends a path plus heading in rounds 1 to 3, 4 to 5 and the re-review (fix-loop.md:29, 53), and ledgers through the `## Ledger lines` copy (fix-loop.md:15, 62).
- ✅ All three reviewer templates tell the reviewer to write `## Ledger lines` (task-reviewer-prompt.md:279, reviewer-prompt.md:185, re-review-prompt.md:128).
- ✅ `under 15 lines` is gone from implementer-prompt.md.
- ✅ `### Controller reading rules` sits before `### 1. Dispatch the implementer` (SKILL.md:386) and covers both breach cases.
- ✅ Ruling A: opening lines unchanged (implementer-prompt.md:11, task-reviewer-prompt.md:14, re-review-prompt.md:15, reviewer-prompt.md:16); no hunk touches them.
- ✅ tests/review-bench/fill-template.js: the task-reviewer body names only the eight KEYS tokens (checked by extracting the body with the module), so no leftover placeholder.
- ⚠️ `scripts/check-generated` passing: taken from the report, not re-run per the dispatch.

### Strengths

- The edits keep every existing write-the-file-first instruction and only shrink the reply, as step 3 asked.
- The implementer caught that the re-reviewer needs its own round number and a prior-findings path distinct from its own output, and added [ROUND] and [PRIOR_FINDINGS_FILE] with placeholder entries.
- The branch reviewer gained a real Spec compliance section, so its `Spec` reply field is backed by something in the file.
- The implementer flagged the fx-implement §3 lens gap in its report instead of hiding it.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

1. **Lenses cannot follow the new contract, and fx-implement never asks them to.** fx-review/SKILL.md:180-194 tells each lens to write its findings to a path, but every `agents/fx-lens-*.md` declares `tools: Read, Grep, Glob` (for example agents/fx-lens-silent-failure.md:14): a lens has no Write tool. Separately, fx-implement/SKILL.md:510-518 (Lens dispatch, in task 08's file list) gives no findings path and no pointer to the Lens briefs paragraph. Result in a task review: the lens either replies with its full inline findings (the report the cap was meant to stop) or breaches the contract twice and gets recorded as `report contract breached` on every lens dispatch. Lens findings also have no findings file for the fixer's path hand-off (item 2) and no `## Ledger lines` for lens Minors. Fix: the controller (which can write) saves the lens reply to `findings/<NN>-lens-<name>.md`, as this build's ledger already does by hand, or the lens agents gain Write limited to that path; either way §3 must name the path. The task's Interfaces required a file-writing lens, so this is partly plan-mandated.

2. **The fixer and re-reviewer are pointed at a heading that does not hold all open findings.** fix-loop.md:29-31 and re-review-prompt.md:25-28 name `### Issues` (Critical and Important) as the open set. Three kinds of open finding are not there:
   - spec ❌ items and ⚠️ items live under `### Spec Compliance` (task-reviewer-prompt.md Output format), and which ⚠️ the controller confirmed is recorded nowhere in the file. re-review-prompt.md:25 says confirmed ⚠️ items are under `### Issues`, which is false;
   - from round 2 on, the prior findings file is the previous re-review's, whose sections are `### Finding verdicts` and `### New breakage in the fix diff`; it has no `### Issues` at all;
   - lens findings (item 1) are in no reviewer file.
   A resumed fixer given only the path and `### Issues` fixes the Important items and skips a spec ❌ that has no Important twin; the re-reviewer then verdicts the same short list and the loop can close with the spec gap open. Fix: the controller passes the list of open finding ids or one-liners (it already ledgers them in the round line) plus the path(s), or each findings file carries an `## Open findings` section the fixer reads, and the re-review file carries the same section for the next round.

3. **The re-review reply and ledger lines drop what the controller must route.** re-review-prompt.md:116-119 says the controller ledgers out-of-scope observations, and fix-loop.md:56 says they go to the ledger as deferred minors, but the re-review `## Ledger lines` (re-review-prompt.md:126-134) holds only the round line. New Minor breakage is also not given a ledger line. Under the reading rules the controller may not open the file for these, so they never reach the final review's deferred-minor list. The reply's `New breakage: yes | no` (re-review-prompt.md:144) does not say whether the breakage is Critical/Important (joins the loop, fix-loop.md:55) or Minor (ledgered), and it is not stated whether `Open` counts new breakage, so the controller cannot decide next round or complete from the five lines. Fix: the re-review writes `Task <NN>: minor (deferred): ...` lines for out-of-scope and Minor breakage, and `Open` is defined as unaddressed plus new Critical/Important breakage.

4. **Nothing in the reply tells the controller a plan-mandated finding exists.** fix-loop.md:18 routes a plan-mandated finding out of the loop for the controller's ruling before any fix is dispatched, and SKILL.md:398-400 allows reading a findings file for one, but the reviewer reply (task-reviewer-prompt.md:289-295) carries only C/I/M counts. The controller sees `C/I/M: 0/1/0` and dispatches a fixer against the plan with no recorded ruling. Fix: one reading rule line, `grep -n plan-mandated <findings>` whenever Important is non-zero.

5. **The reading rules forbid what §2 needs to handle a report.** implementer-prompt.md:353-354 still tells a BLOCKED or NEEDS_CONTEXT implementer to put the specifics in the final message for the controller to act on, while SKILL.md:401-403 says do not act on text past five lines. SKILL.md:467-470 says read DONE_WITH_CONCERNS concerns before proceeding, but the reply carries only a count and SKILL.md:398-400 allows reading a report only for a ⚠️ or plan-mandated finding. A controller following the rules either ignores a blocker's specifics or breaks its own rule. Fix: allow the extra lines for BLOCKED and NEEDS_CONTEXT, and allow reading the report's Concerns section when the count is non-zero.

6. **The ledger copy fails silently on the shapes the templates themselves show.** The templates show the section as `### Ledger lines` (task-reviewer-prompt.md:277, reviewer-prompt.md:183, re-review-prompt.md:126) and then ask for a `## Ledger lines` heading; a reviewer that writes the `###` form produces nothing for `sed -n '/^## Ledger lines/,/^## /p'`. The example lines are in backticks, and the re-review example wraps across two lines (re-review-prompt.md:131-132), so a reviewer copying the shape writes a backticked or bulleted or split line that `grep '^Task '` drops or truncates. No step compares what was appended with the reply, so Minors vanish before the branch-end review, which weakens that review. Fix: say "a plain line starting `Task `, no bullet, no backticks, one line", unwrap the example, and have the controller check the appended line count equals the reply's M (and one round line for a re-review).

#### Minor (Nice to Have)

1. fix-loop.md:50-62 never tells the controller to fill [ROUND] or to give each round a new [FINDINGS_FILE] (a reused path overwrites [PRIOR_FINDINGS_FILE]); no skill file links re-review-prompt.md at all, so the Placeholders list is the only place these are named.
2. SKILL.md:388 says "Every subagent above"; the subagents are dispatched in the steps below.
3. SKILL.md:666 "ONE fix subagent with the complete findings list" reads as pasting the list; say the branch findings path. The final re-review has no task number or round for its ledger line.
4. SKILL.md:641 gives the coverage audit "a findings file" with no path (the other sites name one), tells a "read-only agent" to write it, and SKILL.md:653 "Ledger everything it returns" now covers five lines only.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** The text meets every acceptance criterion, but walked end to end the fix loop no longer gets spec ❌, confirmed ⚠️, lens and round-2 findings to the fixer, loses out-of-scope and lens Minors before the final review, and asks lenses to write files they have no tool to write.

## Ledger lines

Task 08: minor (deferred): fix-loop.md never names [ROUND] or a per-round [FINDINGS_FILE] for the re-review dispatch
Task 08: minor (deferred): SKILL.md:388 says subagents "above", they are below
Task 08: minor (deferred): final review fixer brief says "complete findings list", should be the findings path
Task 08: minor (deferred): coverage audit gets no findings path and "ledger everything it returns" now covers five lines
