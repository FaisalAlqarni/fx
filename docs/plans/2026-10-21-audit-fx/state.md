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
Task 01: dispatched d6881a3 2026-10-21T07:19:06Z (implementer, sonnet). Blocked: tasks 02-08 all depend on 01; waiting on its implementer.
Task 01: implemented d6881a3..ffd5ce2 (DONE_WITH_CONCERNS, 3 deviations).
Ruling: task 01's subagent attribution regex is /\btask:? <NN>\b/i, not /\btask <NN>\b/i. Why: the reviewer dispatch text reads "task: 03" and the task's own test expects it counted. Cost if wrong: a dispatch text naming another task by "task: NN" is miscounted, caught by the task 08 checkpoint numbers.
Ruling: Ruling B's ignore check runs on `.fx/transcript-path`, not `.fx`. Why: a directory-only `.fx/` pattern does not match a path that does not exist yet. Cost if wrong: none found; caught by the task 01 review.
Ruling: all four version fields are 0.2.7 (package.json was 0.2.5 on main). Why: the release check needs one patch above main's manifest. Cost if wrong: release-version gate, which passed.
Task 01: review dispatched (task reviewer sonnet + fx-lens-silent-failure, report named a documented swallow). Waiting: task 02 edits the same SKILL.md, so it waits for this review.
Task 01: lens silent-failure 0/2/1 (findings/01-lens-silent-failure.md). Controller opened scripts/build-cost:268-278 and hooks/fx-context.js:18-32: both Important findings hold (readdirSync and unreadable subagent files skipped silently; stale transcript-path never cleared).
Task 01: minor (deferred): fx-context.js reads check-ignore only through status; a spawn error or timeout takes the same quiet return as "not ignored".
Task 01: review 0/1/3 (findings/01-review.md), spec ✅. Minors:
Task 01: minor (deferred): hook runs git synchronously (2 s timeout) before the preamble; consider an fs-only .git check.
Task 01: minor (deferred): taskLine prints a nonsense minutes value when the controller file has no timestamps; invalid --since exits 2.
Task 01: minor (deferred): ledger-lines gate pins wording by substring, not section placement.
Task 01: ⚠️ cleared by controller: preamble untouched by the diff; release-version ran inside the implementer's test_scope (report); bench, lane-triggering and conformance are measured in tasks 05 and 08.
Ruling: §3 runs `build-cost --task <NN> --since <dispatch time>` before dispatching the task reviewer and passes a `fx-tdd 0/<i>` line to it; §5 runs it again at completion for the ledger cost line. Why: the plan read the signal in §3 but produced it in §5, so the rule could never fire (plan-mandated finding). Cost if wrong: one extra build-cost run per task (milliseconds), caught by none needed.
Task 01: fix round 1/5 dispatched (resume implementer): review I1 (ordering, per the ruling above), lens I1 (silent subagent skips), lens I2 (stale transcript-path, undistinguished reasons).
Task 01: fix round 1 FIX_BASE=ffd5ce2. Waiting on the resumed implementer; task 02 blocked on 01.
Task 01: fix round 1 implemented ffd5ce2..294c4cc (DONE_WITH_CONCERNS, 2).
Ruling: the hook leaves an existing .fx/transcript-path alone in a git tree where .fx is not ignored. Why: the hook may not touch a tree it would dirty; the file can only be there if an ignore rule was removed after it was written. Cost if wrong: one stale cost line in that rare repo, caught by its implausible numbers in the ledger.
Ruling: on a git spawn failure or timeout the hook removes the file it wrote earlier. Why: a stale path is worse than none; the hook wrote that file itself. Cost if wrong: none found.
Task 01: re-review r1 dispatched (sonnet). Task 02 waits: a round 2 would edit the same SKILL.md.
Task 01: fix round 1/5 (3 addressed, 0 open: none; commits ffd5ce2..294c4cc)
Task 01: minor (deferred): build-cost --task spreads all controller timestamps into Math.max; a very large transcript throws RangeError, breaking the one-line exit-0 contract.
Task 01: cost unavailable (no transcript recorded)
Task 01: complete (commits d6881a3..294c4cc, review clean after fix round 1). Files: hooks/fx-context.js, scripts/build-cost(+test), skills/fx-implement/SKILL.md, tests/gates/{ledger-lines,transcript-path}.test.js, scripts/check-all, ADR 0040, four version fields.
Task 01: cost 13455046 tokens, 8 min, 4 dispatches, fx-tdd 1/1 (transcript passed explicitly: installed fx 0.2.5 hook does not record it)
Task 02: dispatched 3462150 2026-10-21T07:27:35Z (implementer, sonnet)
Task 02: implemented 3462150..55751ed (DONE_WITH_CONCERNS, 1: re-review-prompt.md still carries one story).
Ruling: skills/fx-implement/re-review-prompt.md joins task 02's loaded set and its gate list. Why: it loads on every scoped re-review, the same reason the five files were chosen. Cost if wrong: one more file in the gate; none.
Task 02: follow-up 55751ed..63f67d0 (DONE): re-review-prompt.md story moved, gate covers six files.
Task 02: minor (deferred): stray `**` after "arrived too late." at skills/fx-implement/implementer-prompt.md:247
Task 02: minor (deferred): moved stories in fx-implement/COVERAGE.md have inconsistent indentation, so not strictly word for word
Task 02: minor (deferred): gate misses lower-case "measured" stories (fx-implement/SKILL.md:592, 857, 889; fx-tdd/SKILL.md:94) and does not check a story was filed
Task 02: review 0/0/3, spec ✅. ⚠️ cleared: controller ran test_scope over the task's paths, exit 0.
Task 02: cost 6753235 tokens, 7 min, 2 dispatches, fx-tdd 1/1
Task 02: complete (commits 3462150..63f67d0, review clean). Files: six loaded lane files, three COVERAGE.md, gate, check-all, ADR 0041.
