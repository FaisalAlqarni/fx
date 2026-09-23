# Coverage audit: lean build

Audited tree: `/development/fx/.worktrees/lean-b` at f2c1d24 (all code merged), read-only.
Inputs: design.md (with its 2026-09-23 amendments), plan.md, tasks 01 to 13 and 03b,
state.md through Ruling S and the combined measurement, the shipped code, and the
kept fixture transcripts in `/tmp/fx-keep-c/combined-b-1` (read only).

Question: is there any behaviour the design commits to that no task's acceptance
criteria carry, or that the shipped code does not do?

Totals: 0 Critical, 5 Important, 9 Minor. Everything else below is covered.

## Gaps

### G1 (Important): the `Plan complete:` line is written but never committed

- Design: story 10, Step 2 ("fx-implement's completion step writes it"), story 8.
- Writer: `skills/fx-implement/SKILL.md:840-848` appends the line after the exit
  gate. Nothing after it commits the ledger. The general rule at SKILL.md:312
  ("The ledger is committed with the work") has no commit point after the exit
  gate, which is the last commit the build makes.
- Reader: `lib/plan-state.js:47-51` reads `docs/plans/<slug>/state.md` in the
  session's cwd, which after integration is the base branch. An uncommitted line
  in the build worktree never reaches it, so the finished plan stays listed.
  The last plan that got this right did it by hand
  (`6aad237 docs(plan): record the exit gate and plan completion`).
- Task 05 criteria test only the reader and the wording, not that the line lands
  where the reader looks.
- Suggested owner: task 05 follow-up. One sentence in SKILL.md "Write the
  plan-complete line": commit `state.md` with that line before the completion report.

### G2 (Important): build-cost misreads builds made with tasks 08 and 11

The instrument (story 5) keys on the controller's command text. Tasks 08 and 11
changed that text, and no task carries the other half.

- `fixRounds`: `scripts/build-cost:102-103` matches `Task NN: fix round R/5` in a
  ledger-write command. After task 08 the round line is copied from the
  re-reviewer's findings file by a sed and grep copy, per `fix-loop.md:71-79`,
  so the literal never appears in the command. combined-b ran fix round 1
  on tasks 01 and 02 (fixer and re-review dispatches in its transcript) and reports `fixRounds: 0`. The ledger line
  "baseline-b had 3 fix rounds, combined runs none" is therefore wrong.
- Ledger writes: `build-cost:89` needs `>>`; the combined-b controller copied
  ledger lines with `tee -a`.
- `tasksCompleted` and `ctxGrowthPerTask`: combined-b wrote the parallel
  completion lines inside a shell loop, with `$t` in place of the task number, so
  the regex sees 4 of 6 tasks and the growth figure (9.9K) is computed over the
  wrong calls.
- Subagent classes: build-cost:173-175 classifies by the template's opening line
  (Ruling A kept those lines). The combined-b controller dispatched reviewers and
  re-reviewers as "Your operating rules are the task reviewer template at
  <path>", so it reports no `reviewer` and no `re-review` subagents at all
  (`other: 15`). No skill text requires a dispatch to begin with the template's
  opening line; Ruling A protected the template, not the dispatch. The review
  bench (task 03b) pastes the filled template, a dispatch shape the live
  controller does not always use.
- Suggested owner: task 01 follow-up (count copied ledger lines by reading the
  final `state.md`, or parse `tee -a` and the copy command), plus one line in
  fx-implement requiring the literal completion form and dispatches that open
  with the template text. Re-score combined-a and combined-b afterwards.

### G3 (Important): Ruling Q folded tasks 07 and 09 into 13, but no task carries their rules

- Design "Order": steps land in order, each with its own measurement. Stories 3,
  25, 26. Ruling Q (state.md:199) replaced this with one combined measurement.
- Task 13's ship rule covers parallel only. Nothing now owns: the step 2 rule
  (rows 02 and 16 pass, subagent tokens or wall-clock lower,
  `07-owner-run-step-2.md:35-43`); the step 3 rule (controller tokens lower) and
  its exhaustive outcomes, including "shipped, target missed", which makes the
  forced handoff or workflow orchestration the next design
  (`09-owner-run-step-3.md:44-54`, design lines 207-211 and 281-282); the
  `Step 2:` and `Step 3:` verdict lines.
- Story 26 compares wall-clock against "the previous shipped step". Under Ruling
  Q no step 3 build exists, so the parallel gain cannot be separated from steps
  2 and 3.
- Measured so far: controller context growth per task 6.2K and 9.9K (the second
  is miscounted, G2) against 7.7K and 6.9K at baseline. The 3x target is missed
  by a wide margin, and no task records that outcome.
- design.md was not amended for Ruling Q, unlike Rulings K to P.
- Suggested owner: task 13 amendment. Carry the step 2 and step 3 rules and
  verdict lines. Name what isolates parallel: either a combined run with
  `FX_FIXTURE_PARALLEL` unset as the "previous step", or an explicit owner ruling
  that story 26 is judged against baseline. Note Ruling Q in design.md "Order".

### G4 (Important): the fix-loop hand-off that task 08 rewrote has no quality measurement

- Global Constraint: "the five-round fix loop ... not weakened by any step".
- Task 08 changed what the fix loop receives: findings by path, not verbatim;
  ledger lines by copy; lens findings recorded by heredoc and routed by severity
  (Ruling R).
- The quality rule measures only caught at end and the bench. The bench is one
  task-review pass per case (`03b-review-bench.md:13-20`). It has no fixer, no
  re-review, and no lens. In the fixture every trap has been `clean` at the
  implementer head in all seven builds, so no trap exercises the loop.
  combined-b ran two fix rounds, but nothing scored them.
- Suggested owner: task 03b follow-up (a two-step case: planted defect, the
  filled re-review template over a fixer's diff, scored on ADDRESSED), or an
  owner ruling that the loop is accepted unmeasured.

### G5 (Important): the parallel failure paths are written, but the one live run skipped two of them

- Design: stories 20 and 21, and "Every guard fails toward serial".
- Written: `skills/fx-implement/SKILL.md:387-463`, steps 5 and 6 and every
  back-to-serial branch. The gate `tests/gates/parallel-implement.test.js`
  checks the words only.
- combined-b's merge command for tasks 04 and 05 printed
  `git diff --name-only` without comparing it to either `Files:` list. It ran
  the union tests as `node --test ... | grep ... || true` under `set -e`, then
  `git merge --ff-only` without checking the result. A red `test_scope` would
  have merged. Both tasks were clean, so no defect resulted and
  `mergeDefects: 0` is true, but no run has shown that a guard fires.
- Task 13's ship rule checks only the ledger result (04 and 05 parallel, 06
  serial). Task 06 went serial only through the symmetry gate (see G10).
- Suggested owner: task 11 wording (the merge step stops on a non-zero
  `test_scope` exit, never `|| true`, and the file check compares lists, not only
  prints them). Task 13 records, per run, whether each merge's test exit code and
  file comparison were acted on.

### G6 (Minor): the triggering suite can count a skip as a pass

- Story 6, Global Constraints (triggering fire rates). Ruling J
  (state.md:167): `run-all.sh` counts a `run-test.sh` `[SKIP]` (no CLI, no
  credential, `run-test.sh:36,71`) as PASS. The controller mitigates this by hand
  (it checks for stream logs). No task owns the fix.
- Suggested owner: task 02 follow-up (count `[SKIP]` apart and fail
  `run-all.sh` when any prompt skipped).

### G7 (Minor): opencode subagents still receive the plans block

- Story 9 is written for every dispatched subagent. Shipped for Claude Code
  (`hooks/fx-context.js:28`) and Codex (`hooks/fx-codex.js:241`). opencode
  renders once at plugin construction (`plugins/fx.js:204`) with no subagent
  signal, so it is unchanged. Task 06's criteria allow this, and the 06 review
  confirmed it, but the design does not say so.
- Suggested owner: none. Record it as a design note, or as a DEBT entry if
  opencode gains a subagent signal.

### G8 (Minor): the owner's view of `Parallel with` claims is partial

- Story 17. The plan.md Tasks table has the column (`skills/fx-plan/SKILL.md:283`)
  and the task template has the line (`:296`). The §8 handoff message does not
  show the claims. Unattended runs default to "start implementing" (`:229-233`),
  so no human sees them. §6 self-review does not check that the column matches
  the task files. fx-implement's gate reads "names the other under
  `Parallel with`" and does not say which of the two sources.
- Suggested owner: task 10 follow-up (§6 check that the column and the task
  lines agree; §8 lists the claims).

### G9 (Minor): the serial half of story 22 has no criterion

- Story 22: a task starts only when its blockers are review-clean, "parallel or
  not". The parallel gate says so (SKILL.md:397). For serial work the frontier is
  "any task whose blockers are all done" (`fx-plan/SKILL.md:98`), and
  SKILL.md:147 says "independent tasks may run while an implementer works". That
  sits against "Serial implementers" (SKILL.md:380) and does not require the
  blockers to be review-clean. SKILL.md:713 forbids moving on only while a review
  has open Critical or Important findings.
- In this build, Ruling G dispatched task 03 while its blocker 02 was still in
  re-review.
- Suggested owner: fx-implement wording follow-up. Define the frontier as
  blockers complete, meaning a `Task NN: complete` line, which implies
  review-clean or parked.

### G10 (Minor): the fixture's false parallel claim tests only the cheapest guard

- Design Step 1: "one task declared parallel that quietly needs another's output
  (the pair a guard must send back to serial)". In the fixture, task 06 names 05
  but 05 names only 04 (`tests/fixture-build/repo/.../tasks/04-export.md:5`,
  `05-search.md:5`, `06-cli-export-search.md:5`). The symmetry gate refuses 06
  before dispatch. The file check, the union test, the rebase paths and a
  symmetric but wrong claim are never exercised.
- The fixture also writes `05 (reason)` where the fx-plan template says
  `05: reason`, and its plan.md has no `Parallel with` column.
- Suggested owner: task 03 note, or accept it by ruling. The owner's approval
  (story 17) remains the real defence against a symmetric wrong claim.

### G11 (Minor): three parallel failure paths are not written

- An empty or missing `Files:` list passes "share no path" and "no hot file"
  vacuously (SKILL.md:396-400). Step 5 then sends the task back to serial, so
  the effect is lost time, not a skipped check.
- An implementer returning BLOCKED or NEEDS_CONTEXT in a parallel task, and a
  failed `git worktree add`, have no stated path.
- Suggested owner: task 11 follow-up. One line: an empty `Files:` fails the gate,
  and any of these cases sends the task back to serial.

### G12 (Minor): task 13's drop path would revert a fixture fix

- Task 13 "On drop": `git revert` of tasks 10 and 11's commits. Task 11's fix
  commit 528450f also carries `tests/fixture-build/hidden/pick-build-worktree.sh`,
  its test, and the row's step 4 change (review I1, owned by task 11 from task
  03's deferral). Reverting it breaks the fixture for every later measurement.
- Suggested owner: task 13. Revert only the SKILL.md, gate and check-all hunks
  of 528450f, or name the files to keep.

### G13 (Minor): two fixer dispatches have no named template or reply contract

- Story 12 covers fixers. Rounds 1 to 3 resume the implementer, which already
  holds the contract. Rounds 4 and 5 ("a fresh implementer", `fix-loop.md:42`)
  and the final-review fix wave ("ONE fix subagent", SKILL.md:780) name no
  template, so the five-line reply holds only if the controller happens to use
  `implementer-prompt.md`. combined-b's final-review fixer opened "You are the
  implementer for the final-review fix wave".
- Suggested owner: task 08 follow-up. Name `implementer-prompt.md` for both.

### G14 (Minor): task 04's record is stale and incomplete

- No `measurements.md` exists in either worktree, and the ledger has no
  `Task 04: complete` line. Task 04's criteria still say "Three baseline result
  files" and "pooled /3". Ruling O made that two runs (baseline-a and baseline-b
  exist).
- Suggested owner: task 04. Write `measurements.md` from runs/ and state.md
  before the verdict, and amend the criteria for Ruling O.

## Covered

| Story or decision | Status | Where |
|---|---|---|
| 1, 2 (fewer tokens, less wall-clock) | Covered by steps 2 to 4. Outcome is pending the verdict | tasks 05, 06, 08, 11, 12, 13 |
| 3, 4 (fixture with traps, answer key) | Covered, amended by Rulings K to M, N parked | task 03; `tests/fixture-build/hidden/traps.test.js`; runs/*.json `caughtAtEnd`, `byReview` |
| 5 (build-cost numbers) | Covered: calls, tokens by type, context growth, wall-clock, fix rounds. Traps come from run.sh. Accuracy gap in G2 | task 01; `scripts/build-cost`; `tests/fixture-build/run.sh` |
| 6 (triggering covers 12 model-facing lanes plus none prompts, first lane wins) | Covered. Skip-as-pass in G6 | task 02; `tests/lane-triggering/verdict.js`; `verdict.test.js` lane check |
| 7 (3,000 and 9,000 limits) | Covered by an existing gate | `lib/preamble.test.js:100-102`, in check-all |
| 8 (finished plans silent) | Covered on the reader side. Writer commit in G1 | task 05; `lib/plan-state.js:47-51`; `lib/plan-state.test.js:93-105` |
| 9 (subagent gets no plans list) | Covered on Claude Code and Codex. opencode in G7 | task 06; `lib/preamble.js:78-87`; `hooks/fx-context.js:28`; `hooks/fx-codex.js:241` |
| 10 (fx-implement writes `Plan complete:`) | Covered, exact form. Commit in G1 | task 05; `skills/fx-implement/SKILL.md:840-848` |
| 11 (backfill three ledgers) | Covered. Checked: 2026-09-01 line 385, 2026-09-11 line 3788, 2026-09-12 line 786. The render here names only multi-harness (blocked until 2026-10-21) and lean-build | task 05 |
| 12 (five-line replies) | Covered for implementer, task reviewer, re-review, branch reviewer and coverage audit. Lens exempt by Ruling R. Fixers in G13 | task 08; implementer-prompt.md:345, task-reviewer-prompt.md:294, re-review-prompt.md:163, fx-review/reviewer-prompt.md:199, fx-implement/SKILL.md:758; `tests/gates/return-contract.test.js` |
| 13 (append only, tail or grep) | Covered | task 08; SKILL.md:470-472 |
| 14 (read only the disputed part) | Covered, including the BLOCKED and Concerns exceptions | task 08; SKILL.md:477-487 |
| 15 (re-dispatch once, then flag) | Covered | task 08; SKILL.md:488-491 |
| 16 (`Parallel with:` field with a reason) | Covered | task 10; `skills/fx-plan/SKILL.md:103-110,296`; `tests/gates/parallel-contract.test.js` |
| 17 (owner sees every claim) | Covered by the plan.md column. Handoff and unattended runs in G8 | task 10; fx-plan/SKILL.md:283 |
| 18 (four gates, at most two) | Covered | task 11; SKILL.md:391-401 |
| 19 (own task worktree) | Covered. The combined runs used `.worktrees/t04` and `t05` | task 11; SKILL.md:408-409 |
| 20 (file check, overlap back to serial) | Written, and rechecked after every fix round and before merge. Live enforcement in G5 | task 11; SKILL.md:413-432 |
| 21 (rebase, test_scope on union, ff, failures back to serial) | Written. Live enforcement in G5 | task 11; SKILL.md:425-443 |
| 22 (blockers review-clean) | Parallel half covered. Serial half in G9 | SKILL.md:397 |
| 23 (fx-setup shared-service question) | Covered, with the generated skill in sync | task 10; `commands/fx-setup.md:31,44,87-88`; `skills/fx-setup/SKILL.md:34,47,90-91` |
| 24 (this repo's `test_scope`) | Covered. Falls back to check-all for unmapped paths. check-all stays `test_all` | task 12; `.fx.json`; `scripts/test-scope`; `scripts/test-scope.test.js` |
| 25 (ship rule, as amended) | Carried by tasks 07, 09 and 13. Ownership after Ruling Q in G3 | tasks 07, 09, 13 |
| 26 (drop on merge defect or under 15 percent) | Carried by task 13. Baseline for "previous step" in G3, drop revert in G12 | task 13 |
| Step 0 (duplicate reviewer off) | Cleared. Done by the owner globally, not per project as the design says. No code expected | plan.md:28 |
| Step 1 bench (added) | Covered: 8 planted defects plus a control, working-tree template, Ruling P constraints, Ruling S test files. Loop coverage in G4 | task 03b; `tests/review-bench/` |
| Step 1 scoring (caught at end, by review, merge defect) | Covered | task 03; `tests/fixture-build/rows/01-fixture-build.sh:117-130` |
| Build-cost exits non-zero with no transcript or no usage | Covered | task 01 criteria; build-cost.test.js |
| Step 2 fails open (unreadable ledger keeps the plan listed) | Covered: `hasState` from existence, read failure keeps the plan listed, tested | task 05 fix round; `lib/plan-state.js:48-51`; plan-state.test.js |
| Step 2 bootstrap unchanged for subagents | Covered: the subagent render equals the no-plans render; conformance rows 02 and 16 pass (18 of 18, state.md:247) | task 06; `lib/preamble.test.js` |
| Step 3 reading rules and ledger copy check | Covered | task 08; SKILL.md:465-496; fix-loop.md:12-15,71-79 |
| Step 3 target (growth 3x smaller) | Recorded by task 09 only. Missed, unowned after Ruling Q (G3) | task 09 |
| Step 4 hot-file list | Covered | fx-plan/SKILL.md:106-109 |
| Step 4 `isolated_test_execution` only on ship | Covered. The key is absent from `.fx.json` now. The concurrency check passed (state.md:229) | tasks 12, 13 |
| Serial stays default, reason kept | Covered | SKILL.md:380-385; parallel-implement gate |
| Resume of parallel tasks | Covered: missing worktree, dead implementer, merging with or without ff | task 11 fix round; SKILL.md:445-463 |
| Cleanup without `rm -rf` or `branch -D` | Covered | SKILL.md:461-463 (step 8); gate |
| ADR 0021, nothing into always-on text | Covered. The preamble diff only removes the plans block for subagents | `git diff 649da01..HEAD -- lib/preamble.js` |
| Version bump on shipped-file change | Covered by Ruling D and the release-version gate in check-all | task 01 |
| Testing seam 1 (unit gates) | Covered: plan-state, preamble, return-contract, parallel-contract, parallel-implement all pass at f2c1d24 | check-all:38-89 |
| Testing seam 2 (row 04, triggering) | Covered: baseline and combined each 10/10 opencode, 18 of 18 claude-code, 17 of 17 triggering | state.md:166-168,239,247-248 |
| Testing seam 3 (two fixture runs per variant) | Covered by Ruling O | runs/baseline-*, combined-* |

## Assumptions the tasks make that no story states

- Dispatches open with the template's first line (build-cost classification,
  implementer-heads). No skill requires it (G2).
- Ledger lines appear literally in controller commands (build-cost). Task 08
  moved them into files (G2).
- The bench's pasted template is how reviewers are dispatched. The live
  controller sometimes points at a file instead (G2).
- The ledger reaches the base branch (plan-state). No commit point exists after
  the exit gate (G1).
- Implementers will sometimes get a trap wrong (the by-review metric). Three
  smoke builds disproved this, and the owner amended the design. The same
  assumption now leaves the fix loop unmeasured (G4).
