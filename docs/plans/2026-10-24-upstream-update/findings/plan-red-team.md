Red-teaming this plan.

Adversarial review (plan mode) `/development/fx/docs/plans/2026-10-24-upstream-update/plan.md` + `tasks/01` to `23`, against `design.md`

**Integrity and design↔plan faithfulness**

1. **[blocks] Design↔plan drift: task 03 moves the ledger resume rules out of SKILL.md.** design.md line 66 says the dispatch loop, stop conditions and ledger rules stay inline. `tasks/03-split-fx-implement.md` moves "the resume bullets and standing rulings of section 4" to `references/resuming.md`. That moves the exact rules a compacted controller needs: complete means do not re-dispatch, `git log <BASE>..HEAD` before any re-dispatch, and a parked task is never re-dispatched. This follows `compare-3` §5 and overrides the approved design. Fix: keep §4 inline in task 03 and remove `resuming.md` from its Files list.

2. **[blocks] Task 03 cannot reach 18,500 bytes with pure moves.** `compare-3-implement.md` §5 reaches "about 18,800" only by condensing text that task 03 forbids changing ("the only new SKILL.md text is pointers", checked with `--color-moved`):
   - intro: 2,429 to 1,500 bytes
   - step 1: 3,072 to 2,300 bytes
   - reading rules: rewritten as "four one-line rules"
   - rationalizations: rows that restate an inline rule deleted beyond F27's four rows (2,788 to 1,700)

   That total also counts 600 bytes for the nested controller, which is out of scope. Undo the condensations and the estimate is about 20,300 bytes, before item 1 adds back about 1,900 and tasks 12 and 17 add about 1,300. Fix: before dispatch, choose a pure-move set and measure it with `wc -c`. Moving "Common rationalizations" whole (about 2,100 after F27) and the "If the task files look complete" block are candidates. Put the measured number in task 03. Have task 17's status and park text live in a reference behind a one-line pointer.

3. **[blocks] Task 03 hits assertions that span two files, and "never weaken" plus "one file per assertion" leaves no legal fix.**
   - `fix-loop-shape.test.ts:40-43` asserts Classify comes after the CI step and before `## Write the plan-complete line`. Task 03 puts those in `exit-gate.md` and `final-review.md`.
   - `return-contract.test.ts:73-79` asserts `### Controller reading rules` sits before `### 1. Dispatch` and takes a 3,500-character slice of SKILL.md.
   - `tripwire-table.test.ts:30-31` ends its span at "The reviewer gets four paths", which stays in SKILL.md.
   - `ledger-lines.test.ts:19-25,33,43` slices `### 3`/`### 5` of SKILL.md for cost text that moves to `cost.md`.

   `final-review.md` also groups steps that run on both sides of the exit gate: final review comes before it, and the plan-complete line, report and menu come after. Fix:
   - Split into `final-review.md` (before the gate) and `completion.md` (after it), and retarget tasks 12, 13, 17 and 19.
   - Rewrite each ordering assertion as the order of the pointers in SKILL.md.
   - List the per-assertion rewrite in task 03.
   - Name the four inline reading rules with their exact text. `fix-loop-shape` pins `**Never read a diff yourself**, except`.

4. **[blocks] Task 12 breaks the controller's ledger count check.** The reviewer now writes `Task <NN>: declined:` lines under `## Ledger lines`. The rule at SKILL.md:419-424 (moving to `references/reading-rules.md`) says the `grep '^Task '` count must equal the Minor count. Any reply with `declined: 1` or more will mismatch, every time. Task 12's Risks knows about this, but its Files list never touches the file that holds the rule. Fix: add `reading-rules.md` to task 12 (count = Minor + declined) and add a `ledger-lines` assertion for it.

5. **[blocks] Task 02's reachability check is undefined, and its "repository exits 0" test depends on that.**
   - `skills/fx-implement/re-review-prompt.md` is named only by `COVERAGE.md`; grep confirms no link from SKILL.md or fix-loop.md. Either COVERAGE.md counts as a namer, which makes the check useless (task 03 adds every moved file to COVERAGE), or a second orphan exists that the task does not list.
   - The task does not say whether the check looks in subdirectories, so `skills/<lane>/references/*.md` may never be checked.
   - It does not say how "named" is matched. If it is a substring match, `references/setup.md` counts as named by the existing `worktree-setup.md` mention.

   Fix: exclude COVERAGE.md as a namer. Resolve link targets instead of matching text. Search subdirectories. Add `re-review-prompt.md` to `PENDING_ORPHANS` for task 16, which wires it in. Add a test fixture for a nested orphan.

6. **[blocks] Task 10's migration is unspecified and untested for a multi-context repo, which is the owner's own case.** advantage-backend has a root `CONTEXT-MAP.md` that links one `CONTEXT.md` per engine. `findGlossary` (task 09) looks only at the root. Task 10 says "rewrites the map's links" but never says to find and `git mv` the per-engine files the map links. A yes would rename the map and leave its children under the old name. No test covers any of this, and it is the one operation that moves owner files. Fix:
   - Specify that the migration follows the map's links, renames each linked `CONTEXT.md` in place, and prints a dry-run list first.
   - Preferably make it a small script with a scratch-repo test (map + `engines/a/CONTEXT.md`).
   - Say a dispatched subagent never asks and writes to the old-named file. An "ask once" inside an unattended implementer stalls the build.

7. **[blocks] Design↔plan drift in task 15.** design.md line 132 says fx-tdd "never drives red from a browser or system spec". Task 15 says it is "rarely the right RED". Fix: use "never", as the design says, or record a ruling.

**Build mechanics and owner rules**

8. **[advisory] This build runs under the bug it fixes.** The installed `fx/0.2.9/skills/fx-implement/SKILL.md` is 948 lines, about 49 KB. A 23-task build will compact, and the controller loses the fix-loop cap, final review and exit gate exactly as the design describes. The plan has no mitigation. Fix: in plan.md Risks, add a standing ruling that after any compaction the controller re-invokes fx-implement with the Skill tool (plan-state already says so). Before tasks 21 to 23, it reads the final review and exit gate sections explicitly.

9. **[advisory] compile-brief is run live from the worktree while task 13 rewrites and rebuilds it.**
   - Task 13's reviewer brief is produced by the code under review.
   - With one review allowed to run alongside the next implementer, a brief for task 12's re-review can be compiled from task 13's half-built binary.

   Fix: compile briefs from a separate detached worktree pinned at task 01's commit. Record that as a ruling in plan.md Risks.

10. **[advisory] Five tasks (08, 11, 17, 21, 23) run `scripts/check-all`, which is fx's `test_all`.** fx-implement treats that as breaking the one-full-run rule (`Task <NN>: ran test_all (rule)`) and repeats the rule to the next implementer. Fix: add a Global Constraint saying phase-gate `check-all` runs are plan-mandated, or let the controller run the phase gates itself.

11. **[advisory] Two Global Constraints are wrong for this build's session.**
    - "Every SKILL.md under 20,000 bytes" is false until task 11, because fx-humanize stays at 31,745 bytes. It is copied into every brief, and SKILL.md:599-605 says to verify a constraint before copying it.
    - Every task hard-codes this advantage-backend session's scratchpad (`/tmp/claude-1000/-development-advantage-backend/41c30690-.../scratchpad`) for TMPDIR and the upstream clones. The build will run in a different session with its own scratchpad.

    Fix: change the first to "except those on the skill-size PENDING list". Replace the path with a `<SCRATCH>` placeholder the controller fills as a standing ruling.

12. **[advisory] Task 09 is Phase 2 but is blocked only by 01.** It can run before the Phase 1 gate (task 08), so that gate tests Phase 2 code and the design's "each phase passes check-all on its own" no longer holds. It also edits `scripts/check-all` on the same frontier as task 02. Fix: make task 09 blocked by 08.

**Byte budgets**

13. **[advisory] Byte budgets chain with no fallback in later tasks.**
    - Task 03 allows 18,500 bytes. +350 (task 12) +about 950 (task 17) = about 19,800, which fails task 17's "under 19,500" test, and task 17 names nothing to move out.
    - Task 14 allows fx-brainstorm up to 19,499. Task 20 adds about 250 and requires under 19,500, also with no fallback.

    Fix: cap task 03 at 18,000, or name a section to move out in tasks 17 and 20.

**Ripples the tasks miss**

14. **[advisory] The humanizer rebase misses one file.** `tests/conformance/rows/16-project-note-and-plan-state.sh:27` checks tool output with `grep -qwE "111|35|$SLUG"` to prove the answer came from context. After task 11 it looks for 35, not 26, so the check stops catching anything. Task 11's verification grep (`35 patterns\|P=35`) cannot see this line. Fix: add the row to task 11's Files and widen the grep.

15. **[advisory] Task 13's Review focus reaches the brief but no reader is told to use it.**
    - `task-reviewer-prompt.md` and `fx-review/reviewer-prompt.md` are not edited.
    - SKILL.md still says only Global Constraints are "the reviewer's attention lens".

    The design says Review Focus is "handed to reviewers with Global Constraints". Fix: add one line to each reviewer template and to `review-inputs.md`.

16. **[advisory] Task 03 leaves stale or unchecked pointers.**
    - `skills/fx-review/SKILL.md:208` ("see `fx-implement` §3's Lens dispatch").
    - SKILL.md:377 ("see 'Waiting on a child...' above").
    - The `**Rule:** ... (skills/fx-implement/SKILL.md)` lines in COVERAGE.md's Incident record, which are not table rows.
    - The backticked `../fx-review/SKILL.md` inside the moved lens-dispatch text resolves wrongly from `references/`, and no gate checks backticked `../` paths.
    - New reference files over 100 lines (final-review, setup, exit-gate) need a `## Contents` block under fx-authoring's hard limit.

    Fix: list all of these in task 03.

17. **[advisory] Smaller mismatches.**
    - Task 16's "prints one path" does not match the script's real output, `wrote <path>: N commit(s), M bytes`. The script also has a second em dash at review-package:49, in a runtime warning.
    - Task 17 says tasks 18 and 19 add a line to `final-review.md`, but task 18 edits `finishing.md`.
    - Task 07 leaves `SURFACE.md:236` naming the deleted `.ts` file, and task 23 does not list it.
    - `INSTALL.md:142` pins `#v0.5.0`.
    - Task 21's `.txt` prompt files are not checked by `check-prose`, which reads only `*.md`.

**Tests and scope**

18. **[advisory] Some tests have no exact expected value, and two items are scope creep.**
    - No exact value: task 14's "a step naming design.md", task 17's "discard only inside the typed-request procedure", task 10's judgement grep, and task 22's `2026-` prefix. Give each an exact string.
    - Scope creep: task 18's `.github/pull_request_template.md` handling and task 05's deletion of the duplicate prefactoring sentence (X2). The design asks for neither, and the design says no rule is reworded beyond the pointer. Drop both or ledger them as rulings.

1. Discuss all: walk every finding one by one.
2. Discuss some: you pick which findings to dig into.
3. Continue: proceed as the reviewer sees fit (I'll resolve/fold in the rest).

Which?

Not checked: I did not measure any file sizes, so the byte figures in items 2 and 13 are estimates from the `compare-3` table. I read only the headings of the research files, not their full text. Risk: items 1 to 3 change task 03's file list, and tasks 12, 13, 17 and 19 name those files, so fix them together before dispatch.