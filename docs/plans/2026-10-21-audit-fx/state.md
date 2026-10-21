# fx ledger: plan: docs/plans/2026-10-21-audit-fx/plan.md

## Standing rulings

(docs/plans/rulings.md does not exist. The plan's own standing rulings are in plan.md: a BLOCKED checkpoint (05, 08) stops the build; checkpoints spend live quota by design.)

## Log

Worktree: /development/fx/.worktrees/lean-pipeline on lean-pipeline from main 72f180c. Setup ran clean. .fx ignored.

Pre-flight conflict scan (pairs sharing a file or interface):
| Pair | Shared | Produces / consumes | Found |
|---|---|---|---|
| 01-02 | skills/fx-implement/SKILL.md, scripts/check-all | 01 adds ledger rules; 02 removes stories | 02 must keep 01's rules (02 Interfaces says so). OK |
| 01-03 | fx-implement SKILL §1/§3, check-all | 03's compile-brief runs after 01's dispatch line | Consistent. OK |
| 02-03 | implementer-prompt, task-reviewer-prompt, fx-tdd, COVERAGE | 02 gate forbids "Measured" in loaded files | 03 must not add the word "Measured". Ruling A |
| 02-04 | skills/fx-plan/SKILL.md | 02 removes stories; 04 rewrites template | 04 must not reintroduce "Measured". Ruling A |
| 02-07 | skills/fx-plan/SKILL.md | 07 edits §1 | Same as Ruling A |
| 03-04 | Design/Stack line formats | 03 produces, 04 consumes | Formats identical (Heading, Heading > N; stack/Heading). OK |
| 03-06 | fx-implement SKILL | 06 edits Final review only | OK |
| 04-06 | fx-plan SKILL | 06 edits §8 dispatch only | OK |
| 06-07 | fx-plan SKILL | 07 edits §1 only | OK |
| 05-08 | checkpoints.md | 05 creates, 08 appends | OK |
| 01-04,06 | scripts/check-all | each appends gate lines | Append-only. OK |
Per task:
| Task | Self-consistent? |
|---|---|
| 01 | Test values sum (150+50+300+200=700, 10 min). Hook writes .fx/ in any cwd: see Ruling B |
| 02 | Text move, gate pins absence of "Measured". OK |
| 03 | Fixture repo .fx.json stacks null, so Stack: None. OK. rulingsFor test uses check() before final rmSync. OK |
| 04 | Gate slices match current headings. OK |
| 05 | Harness commands exist (tests/review-bench/run.sh, tests/lane-triggering/run-all.sh). OK |
| 06 | agent-model test kept by sonnet pins. OK |
| 07 | Gate regexes against the new eight-step list. OK |
| 08 | Early-abort rule stated. OK |
Ruling A: no task after 02 adds the word "Measured" to a loaded lane file (02's gate would fail). Why: 02's gate pins it. Cost if wrong: a red gate in a later task, caught by that task's test_scope.
Ruling B: task 01's hook writes .fx/transcript-path only when the cwd is not inside a git work tree, or is one where .fx is git-ignored; otherwise it writes nothing and build-cost reports "no transcript recorded". Why: a SessionStart hook runs in every repo, and an unignored .fx/ would show up as untracked files in the owner's other projects. Cost if wrong: no cost line in a repo that does not ignore .fx, caught by the cost line's own unavailable reason in the ledger.
