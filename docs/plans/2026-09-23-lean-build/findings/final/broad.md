# Final branch review, broad: lean build

Range 649da01..31214e4, 51 commits, 109 files outside docs/plans. Read-only.
`scripts/check-all` run at HEAD in this worktree: ALL GREEN, exit 0 (50 sections).
`scripts/build-cost` run on the kept transcripts in /tmp/fx-keep-c (combined-a-1, combined-b-1).

### Strengths

- The behaviour change for users on other repos is small and well contained. `lib/plan-state.js:47-51` hides a plan only on a line that starts with exactly `Plan complete:`, keeps an unreadable ledger listed and still described as a ledger, and has tests for each case, including a sibling plan beside an unreadable one.
- `render({ subagent })` in `lib/preamble.js:59-89` removes text and adds none. Both hooks pass the flag from `hook_event_name`, and `lib/preamble.test.js:231-249` proves the subagent render equals the no-plans render on every harness. ADR 0021 holds.
- The parallel revert is clean where it matters. `skills/fx-plan`, `skills/fx-setup`, `commands/` and `tests/gates/parallel-*` show no diff against the base, the "Relax only if" rule is back as it was, and `.fx.json` has no `isolated_test_execution`.
- The return contract is consistent across the four dispatch templates, and `tests/gates/return-contract.test.js` pins each field, the `## Ledger lines` shape, Ruling R, and the G1 commit.
- G1 in 9a7b1a6 is correct and minimal: the plan-complete line is committed by path, in the build worktree, before the completion report, so it reaches the base branch with the merge.
- `build-cost` reading `toolUseResult.bashEditDiff` is a sound fix for ledger writes that carry no ledger text in the command. I confirmed the field exists in both kept transcripts (18 state.md diffs in combined-b) and that both now read tasksCompleted 6 and fixRounds 2.
- Live tooling respects the home constraint: credential copy lives in one function (`tests/conformance/lib/scratch-home.sh`), the triggering suite runs jailed with a checked `mktemp` scratch, and cleanup is guarded by a path case.
- The single version bump to 0.2.3 is consistent across all three manifests, and the release-version gate passes.

### Issues

#### Critical

None.

#### Important

1. `scripts/test-scope:32-36` · The sibling rule runs `node lib/git-guard.test.js` with no arguments. That test, and `lib/heredoc.test.js` and `lib/base-branch.test.js`, exit 2 with a usage error unless given `<main> <worktree>` (see `lib/git-guard.test.js:9-10`; `scripts/check-all` passes `"$MAIN" "$WT"`). Verified: `scripts/test-scope --dry-run lib/git-guard.js` prints `node lib/git-guard.test.js`, and running that exits 2. The same path also misses `heredoc.test.js` and `base-branch.test.js`, which both test `lib/git-guard.js`. · Why: this repo's `.fx.json` now routes every per-task gate through `test-scope`. Any task that touches the git guard, or one of those three tests, gets a false red that no fix can clear, and the two sibling suites never run per task. · Fix: route `lib/git-guard.js`, `lib/git-guard.test.js`, `lib/heredoc.test.js` and `lib/base-branch.test.js` to `scripts/check-all` (it builds the fixtures), and add one dry-run case to `scripts/test-scope.test.js`.

2. `scripts/build-cost:211-225` (9a7b1a6, G2) · `classify()` still misattributes dispatches on the transcripts it was fixed for. In combined-b, the final-review fixer opens "You are the implementer for the final-review fix wave"; it matches no implementer pattern, falls through to the lens regex on the word "silent-failure", and reports `lens: 1 dispatches, 3172478 tokens`. The real lens dispatches ("Review the diff at ...") land in `other`. The commit message says the dispatch shapes are fixed, and the tests only pin the six phrasings seen in two runs. The coverage audit's second half of G2 (a skill rule that dispatches open with the template's first line) was not done either. · Why: design story 5 and the step 3 verdict ("verified on the next real long build ... after build-cost is fixed") depend on per-type numbers. Pattern-matching the controller's free prose will drift again on the next build. · Fix: classify from the sibling `agent-<id>.meta.json`, which Claude Code writes beside each subagent transcript with `agentType` (`fx:fx-lens-*` names a lens outright) and the dispatch `description`; keep the text rules only as a fallback, and add a test with a lens meta file and a fix-wave implementer.

#### Minor

1. `tests/fixture-build/rows/01-fixture-build.sh:36-43,110-123`, `tests/fixture-build/README.md:17-19`, fixture tasks 04 to 06 line 5 · Parallel remnants survive the revert. `FX_FIXTURE_PARALLEL=1` still sets `isolated_test_execution: true`, which under the restored skill text turns on the old unguarded relax rule. The README still says it "lets fx-implement run tasks 04 and 05 in parallel", and `mergeDefects` greps for a `parallel with` ledger line that the reverted skill never writes, so it now reads 0 whatever happens. The seed tasks still carry a `Parallel with:` field that fx-plan no longer defines. · Fix: delete the `FX_FIXTURE_PARALLEL` branch, the mergeDefects step and the README sentence, or mark them dead until parallel returns.
2. `scripts/test-scope:51-55` · A change to `.claude-plugin/plugin.json` runs only `scripts/check-manifest`, not `tests/gates/codex-manifest.test.js`, which is the gate that cross-checks the Claude manifest's version against the Codex manifest and marketplace. A deleted skill or agent file runs only release-version (plan-mandated by task 12), so check-generated and check-paths do not see a deletion. · Fix: add `codex-manifest.test.js` for `.claude-plugin/`; treat a missing path under `skills/`, `agents/` or `commands/` like an existing one.
3. `skills/fx-implement/implementer-prompt.md:344-351` · The reply lost its "instruction you did not follow as written" line. Deviations now live only in the report, which the controller reads only on a non-zero Concerns count, so a deviation the implementer does not also call a concern reaches the reviewer but not the controller. · Fix: say that Concerns counts every item under "Anything you did not do as instructed".
4. `skills/fx-review/reviewer-prompt.md:183-195` · The broad reviewer must write `Task <NN>` ledger lines and "name the task each finding belongs to". Standalone fx-review branch mode (any repo, no plan) has no tasks or ledger. · Fix: one clause, "inside an fx-implement build; otherwise omit the section".
5. `skills/fx-implement/SKILL.md:702` · "ONE fix subagent with the complete findings list" sits against the new rule of handing over paths, not pasted findings, and the spec, standards and adversarial passes return replies that no rule records to a file. G13 adjacent. · Fix: name `implementer-prompt.md` for the fix wave and record each pass's reply to a findings file the same way as a lens reply.
6. `skills/fx-implement/SKILL.md:536-538` · The lens heredoc ends at a line reading `EOF`; a lens reply that quotes such a line truncates the record silently. · Fix: use a less common delimiter such as `FX_LENS_REPLY_END`.
7. `scripts/build-cost:94` · `stateMdAddedLines` takes the first diffed file whose path ends in `state.md`, so a command that touches two ledgers, or another plan's ledger, counts the wrong one. · Fix: collect every matching file, or match `docs/plans/*/state.md`.
8. `lib/preamble.test.js:245` · `fs.mkdtempSync(... 'fx-empty-')` runs once per harness and is never removed; each check-all run leaks three temp directories. · Fix: create it once in the block and remove it in the `finally`.
9. `docs/plans/2026-09-23-lean-build/measurements.md:31` · Still says build-cost's per-type and per-task numbers for the combined runs are unreliable, while the paragraph above reports them re-scored with 9a7b1a6. Per task is now sound; per type is not (Important 2). · Fix: reword to match.
10. `docs/plans/2026-09-23-lean-build/design.md:142` · "Order" still says each step lands with its own measurement. Ruling Q (one combined measurement) and the step 3 outcome (3x target missed, shipped by owner decision) are recorded only in state.md and measurements.md. Residual of audit G3. · Fix: one amendment note under Order.

### Spec compliance

- ✅ Steps 1 and 2 match the design: build-cost, the widened triggering suite in a scratch home and jail, the fixture with hidden traps, the review bench, the `Plan complete:` line with the three backfills (2026-09-01 line 385, 2026-09-11 line 3788, 2026-09-12 line 786), and the subagent render without the plans block on Claude Code and Codex.
- ✅ Step 3 matches stories 12 to 15, with Ruling R's lens exception recorded in both skills and the gate. The 3x growth target was missed (7.3K to 6.1K median) and shipping was the owner's decision, recorded in measurements.md.
- ✅ Step 4 was dropped by the design's own exit rule (about 6 percent against a 15 percent bar). Tasks 10 and 11 are reverted, the key stays off, task 12 is kept as the plan's drop path says.
- ✅ Global constraints: per-task review, the five-round loop, trigger-gated lenses, the coverage audit and the branch review are intact (lens Critical and Important still enter the loop; Minor is ledgered, as before). No dash or attribution in the files I read, check-prose green, one version bump.
- ⚠️ Cannot verify from diff: whether the fix loop hand-off rewritten by task 08 keeps quality (audit G4). No run scored a fixer plus re-review. The controller should get an explicit owner ruling that the loop ships unmeasured, or add a two-step bench case.
- ⚠️ Cannot verify from diff: opencode subagents still get the plans block (audit G7); the design's story 9 says every subagent. Record it as a known limit.

### Carried findings triage

- Task 01 controllerActiveMs has no assertion: confirmed deferred; dev metric, not a ship gate.
- Task 01 median and p90 methods not pinned: confirmed deferred; both sides use the same code.
- Task 01 ctxGrowthPerTask in ledger order: confirmed deferred; add the comment when build-cost is next touched.
- Task 02 duplicated scratch-home block in run-test.sh and run-reps.sh: confirmed deferred; the credential copy itself is shared.
- Task 02 check-all alignment: confirmed deferred; cosmetic.
- Task 02 log directories keep default umask: confirmed deferred; logs sit under a per-run mktemp path and hold no credential.
- Task 02 scratch_home_claude trusts its directory argument: confirmed deferred; every caller passes a mktemp-derived path. Worth a guard before a third caller appears.
- Task 01 chmod 0o000 tests vacuous as root: confirmed deferred; environment-only.
- Task 02 jail-isolation dynamic check vacuous: confirmed deferred; the static grep carries the proof.
- Task 03 head SHA predating lib/ fails the run: confirmed deferred; a loud failure, not a wrong score.
- Task 03 second worktree entry (owner task 11): superseded; with parallel reverted fx-implement makes one worktree, and the picker left with the revert.
- Task 03 mergeDefects on a missing branch (owner task 11): superseded; the step now never finds a line to act on (Minor 1).
- Task 03 hidden tests readable through $FX/.git once merged: confirmed deferred, but it becomes live on merge; add one README line that owner runs start from a worktree, or tmpfs `$FX/.git` in the row.
- Task 03 export-order reads clean, no false case (owner task 04): confirmed deferred; trap difficulty, recorded by the sensitivity finding.
- Task 03 process.exit in model code ends traps.test.js with no JSON: confirmed deferred; fails loud.
- Task 03 report cites an optional step: resolved by the controller.
- Task 03 readme-example relies on a `cli.js add` line: confirmed deferred; false negatives only.
- Task 03 firstReply with injected user messages: confirmed deferred.
- Task 03 repo copy inside the trap's try: confirmed deferred; stderr names it.
- Ruling N, parked path-escape hole: confirmed deferred. The realistic leaks are scored and every run scored 6 of 6, so no verdict rests on the gap.
- Task 03 complete line: record, no action.
- Task 03b score.js counts dash bullets only (review M4): confirmed deferred, but the control false-positive metric is unusable until fixed; fix before the bench gates another step.
- Task 03b GLOBAL_CONSTRAINTS label: confirmed deferred.
- Task 05 unreadable state.md renders as no ledger: resolved by 0abf558; `lib/plan-state.test.js` asserts "ledger exists".
- Task 08 reviewer-prompt.md plan-mandated count undefined: confirmed deferred; the reading rules define it by grep.
- Task 08 re-review-prompt.md no slot for quoted confirmed warnings: confirmed deferred; the text says the controller quotes them below, which a model can follow.
- Task 12 marketplace.json routing note and .test.sh plus skills overlap: confirmed deferred; see Minor 2 for the manifest gap that does matter.
- Task 08 fix-loop.md "below" and the SKILL.md sentence: confirmed deferred; wording.
- Task 11 picker needs an exact absolute path: superseded by the revert.
- Task 11 resume with commits but no report: superseded by the revert.
- Task 03b dash bullets (repeat line): same as above.

Coverage audit remainder: G3 partly closed by the verdict lines in measurements.md, the design note is open (Minor 10). G4 open, needs an owner ruling. G5, G8, G10, G11 and G12 are superseded by the drop. G6 (skip counted as pass) and G9 (serial frontier wording) stay open as deferred Minors. G7 open, record as a known limit. G13 open (Minor 5). G14 closed by measurements.md.

### Recommendations

- Fix Important 1 before merge: it breaks this repo's own per-task gate the first time a task touches the git guard.
- Fix Important 2 before relying on build-cost's per-type numbers for the step 3 check on the next long build; totals, wall clock, controller tokens and per-task numbers are sound now.
- Clear the fixture's parallel remnants (Minor 1) in the same pass, so a later measurement does not run the unguarded relax rule by accident.
- Get the owner's ruling on G4 into state.md, since the Global Constraint says the fix loop is not weakened and nothing measures it.

### Assessment

**Ready to merge?** With fixes
**Reasoning:** The shipped behaviour (plan-state, subagent render, return contract, plan-complete commit) is correct, tested and green, and the parallel revert left the skills clean. The test-scope routing breaks this repo's per-task gate for the git guard files, and 9a7b1a6 fixed build-cost's ledger reading but not its dispatch classification; both are small fixes.

## Ledger lines

Task 03: minor (deferred): the fixture's FX_FIXTURE_PARALLEL branch, README sentence, mergeDefects step and seed Parallel with lines outlive the revert; the switch now enables the unguarded relax rule and mergeDefects always reads 0.
Task 12: minor (deferred): test-scope skips codex-manifest.test.js for .claude-plugin/ changes and runs no gate for a deleted skill, agent or command file.
Task 08: minor (deferred): the implementer reply dropped its deviations line; Concerns should count every item under Anything you did not do as instructed.
Task 08: minor (deferred): the broad reviewer's Ledger lines section asks for task numbers that standalone fx-review branch mode does not have.
Task 08: minor (deferred): SKILL.md:702 hands the final-review fixer the complete findings list while the new rules pass paths, and non-lens pass replies have no findings file.
Task 08: minor (deferred): the lens heredoc delimiter EOF truncates a reply that quotes a line reading EOF.
Task 01: minor (deferred): stateMdAddedLines reads only the first diffed file ending in state.md.
Task 06: minor (deferred): preamble.test.js leaks one fx-empty- temp directory per harness per run.
Task 04: minor (deferred): measurements.md:31 still calls per-task numbers unreliable after the 9a7b1a6 re-score.
Task 04: minor (deferred): design.md Order is not amended for Ruling Q and the missed 3x target.
