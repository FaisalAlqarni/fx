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
Task 03: dispatched faf7822 2026-10-21T07:35:59Z (implementer, sonnet)
Task 03: implemented faf7822..fd56761 (DONE). Template 10,909 B; good-tests 8,996 B; review-bench row uses compile-brief, not run live (task 05 runs it).
Task 03: pre-review cost: 8311841 tokens, 7 min, 2 dispatches, fx-tdd 0/1. The implementer made no fx-tdd Skill call; passed to the reviewer per the §3 rule.
Task 03: minor (deferred): rulingsFor skips lettered rulings (`Ruling A:`), so Ruling A/B never reach a brief.
Task 03: minor (deferred): SKILL.md "Verify a constraint before you copy it" paragraph is stale now that compile-brief copies the constraints.
Task 03: minor (deferred): good-tests-examples.md carries 3 em dashes moved verbatim; no gate covers references/.
Task 03: minor (deferred): compile-brief.test.js lacks cases for a missing `Heading > N` paragraph and a stack name with no file.
Task 03: review 0/1/4 (findings/03-review.md), spec ✅; ⚠️ (bench row not run live) owned by task 05.
Ruling: task 03's missing TDD evidence is fixed by capturing real RED output now: the implementer runs the three new tests against faf7822's implementation files in a throwaway worktree and pastes command and output, and the report states plainly that fx-tdd was not invoked. Why: the tests cannot be re-driven after the fact; a captured failure against the old code proves they bite, and saying so keeps the record honest. Cost if wrong: tests that never drove the code; caught by the task 05 review bench and the branch review.
Task 03: fix round 1/5 dispatched (resume implementer). FIX_BASE=fd56761.
Task 03: fix round 1 result: no commits; real RED captured against faf7822 for all three new tests (runtime failures: rulingsFor null, MODULE_NOT_FOUND, template 16,313 B > 11,000), report states fx-tdd was not invoked. Controller re-review of the report's TDD evidence section: passes, Important resolved.
Task 03: cost 13055754 tokens, 283 min, 3 dispatches, fx-tdd 0/1
Task 03: complete
Task 04: dispatched 5ee58e6 2026-10-21T12:19:35Z (implementer, sonnet)
Task 04: waiting on the implementer; task 05 is blocked by 04, so the frontier is empty.
Task 04: implemented 5ee58e6..568a2fe (DONE, concerns 0, Tripwires: none). Task 04: cost 4074019 tokens, 4 min, 2 dispatches, fx-tdd 1/1 (pre-review).
Task 04: review dispatched (sonnet). Waiting on it; task 05 is blocked by 04.
Task 04: review approved, C/I/M 0/0/3; minors deferred to the branch review (COVERAGE.md old wording, gate pins fewer lines, Stack field means two things).
Ruling: keep both unrequested additions. Why: the Tests red flag enforces the task's own Risks mitigation; 'more than 10 tasks' matches the Phasing section body, which already says 'More than 10 tasks'. Cost if wrong: an 11-task boundary one off; caught by the branch review.
Task 04: cost 5490508 tokens, 5 min, 3 dispatches, fx-tdd 1/1
Task 04: complete
Ruling: the controller runs task 05's two harnesses itself as tracked background commands, in parallel, instead of dispatching an implementer. Why: the task is two harness runs and a results file, no code; each harness uses its own scratch HOME, so they do not share state. Cost if wrong: a contended run errors, which the task treats as BLOCKED with the error, not a failed bar. Task 05: started 2026-10-21T12:25:14Z at 90ee21f.
Task 05: lane-triggering 17 passed, 0 failed, 0 skipped (bar 17/17: holds). Waiting on the review bench.
Task 05: review bench caught 20/24 (bar 23/24: fails); misses path-dotdot-only 1/3, readme-binary 1/3. Lane-triggering 17/17 holds.
Task 05: BLOCKED. By the standing ruling the build stops here; tasks 06 to 08 are not dispatched. Reported to the owner.
Owner chose option 1: diagnose the checkpoint A bench drop before any re-run. Per-rep findings were not kept (FX_BENCH_KEEP unset), so the diagnosis is static: the four review-side files changed since 72f180c against the two missed cases. Dispatched (opus). Capable because: root-cause judgment across prompt wording and case design, no code to write.
Owner approved (2026-10-21) the three-step response to checkpoint A: (1) widen the path-dotdot-only and readme-binary match regexes with score.test.js rows; (2) bench with FX_BENCH_KEEP at base 72f180c and at HEAD, both re-scored with the widened regexes; (3) the bar becomes the base run's score instead of 23/24.
Ruling: checkpoint A's 23/24 bar is replaced by 'HEAD catches at least what base 72f180c catches, same widened regexes, 3 reps'. Why: every earlier bench run predates 1f749e2, which hid the answer keys and the case name from the reviewer; the old bar was set on leaked runs. Owner approved. Cost if wrong: a real drop hidden inside run noise; caught by checkpoint B and by the kept findings, which are now read.
Ruling: the regex fix runs as task 05a (implementer, sonnet), reviewed like any task, before the two bench runs.
Task 05a: dispatched aece9db 2026-10-21T18:12:45Z (implementer, sonnet)
Task 05: base bench launched at 72f180c in .worktrees/bench-base, FX_BENCH_KEEP=.fx/2026-10-21-audit-fx/keep-base, in parallel with 05a (no shared state: the bench runs in a scratch HOME and only reads its own worktree).
Task 05a: implemented aece9db..a65335f (DONE, concerns 0). Controller review in place of a reviewer dispatch: 2 one-line data files and 40 test lines; read in full. Regexes add absolute name, leading slash, /etc/passwd, resolves outside; and no installed/package binary, never installed, command does not exist. One positive and one negative block per case, exact expected values. Approved. Noted: only the first new positive was watched failing (assert stops at first failure).
Task 05a: complete
Task 05: head bench launched at a65335f, FX_BENCH_KEEP=.fx/2026-10-21-audit-fx/keep-head.
Task 05: base bench (72f180c, old regexes) caught 20/24: path-dotdot-only 1/3, readme-binary 1/3, the rest 3/3. Same as checkpoint A at 90ee21f.
Task 05: base re-scored with the widened regexes: path-dotdot-only 3/3, readme-binary 2/3, total 23/24. Bar for HEAD: at least 23/24 re-scored the same way. Spot check: readme-binary-1 names the missing binary only in its spec-compliance and Minor lines, and score.js counts only Critical and Important sections, so it is a correct miss by the bench's rule. path-dotdot-only-2 catch reads 'An absolute name such as /etc/passwd ... writes outside NOTES_DIR': a real catch. Waiting on the head bench.
Task 05: head bench (f3f4227, widened regexes) caught 22/24: readme-binary 1/3, the rest 3/3.
Correction to my spot check above: base readme-binary-1 DOES name the defect in its Important list ('README.md:6-7 · the example calls a nonexistent `notes` binary'); I misread it as Minor-only. All three head readme-binary reps also name it in Important ('nonexistent `notes` binary', 'non-existent `notes` command'). The widened regex still misses the word 'nonexistent'. Hand count: base 24/24, head 24/24.
Ruling: one more widening of readme-binary/match for 'non-?existent' before binary/command, with a score.test.js positive row, as a 05a fix round (resume the 05a implementer); then re-score both kept sets with score.js. Why: within the owner-approved widening; a hand count is a judgment, the bar needs the deterministic scorer. Cost if wrong: the regex overfits to these runs; caught by the negative rows and checkpoint B on a fresh run.
Task 05a: fix round 1/5 dispatched (resume implementer). FIX_BASE=f3f4227.
Task 05a: fix round 1 result fb51756 (non-?existent binary|command). Controller review: one alternative appended, two positive rows from real findings, negative row still false. Approved. Task 05a: complete
Task 05: final re-score with the fb51756 regexes: base 24/24, head 24/24; false positives base 17, head 16. Bar holds. Checkpoint A recorded in checkpoints.md.
Task 05: complete
Ruling: task 08 keeps the 23/24 bench bar, scored with the fb51756 regexes. Why: the branch base scores 24/24 under that scorer, so 23/24 allows one miss of noise. Cost if wrong: a one-miss drop passes; caught by the kept findings, which task 08 also reads.
Task 06: dispatched b0a1544 2026-10-21T18:26:51Z (implementer, sonnet)
Task 06: waiting on the implementer; 07 is blocked by 06.
Task 06: implemented b0a1544..e025d68 (DONE, concerns 0). Task 06: cost 1321379 tokens, 3 min, 1 dispatches, fx-tdd 1/1 (pre-review)
Task 06: review dispatched (sonnet).
Task 06: review C/I/M 0/3/1 (plan-mandated 1). Citations opened: fx-review/SKILL.md:24 'axes plus every triggered lens, most capable model.'; fx-implement/SKILL.md:565 'where every lens runs on its broad trigger.'; references/harnesses/claude-code.md:39 'and any `fx:` agent is left alone'; 72f180c already had 'Capable because:' in fx-review (1) and fx-implement (3), so the gate's file-level check is vacuous there.
Ruling: fix all three Important and the Minor; the gate asserts each call site's own line, overriding the task's file-level test. Why: the task's Risks says the gate must catch a lost line, and a file-level check cannot. references/harnesses/claude-code.md joins the files. Cost if wrong: a stricter gate pins wording; caught by none needed.
Task 06: fix round 1/5 dispatched (resume implementer). FIX_BASE=e025d68.
Task 06: fix round 1 result e025d68..6d70572. Controller re-review (15 lines, read in full): both stale sentences reworded to the limited rule; harness doc now says an fx: agent with no model keeps its frontmatter pin and an unexplained top tier runs on sonnet, which matches lib/dispatch-route.js:21-25; the gate asserts each site's own 'Capable because:' line; RED shown with the fx-plan line deleted. Minor added. Approved.
Task 06: cost 3885259 tokens, 5 min, 2 dispatches, fx-tdd 1/1
Task 06: complete
Task 07: dispatched b4a11ca 2026-10-21T18:32:16Z (implementer, sonnet)
Task 07: implemented b4a11ca..8067824 (DONE, concerns 0; also edited README.md and fx-brainstorm COVERAGE.md for stale old-flow text). Task 07: cost 1127193 tokens, 2 min, 1 dispatches, fx-tdd 1/1 (pre-review)
Task 07: review dispatched (sonnet).
Task 07: review C/I/M 0/1/2. Citation opened: references/design-template.md:17 '**Approved:** YYYY-MM-DD' sits inside the template block, and fx-plan/SKILL.md:35 skips the restate when design.md 'carries an **Approved:** line'. SURFACE.md:30 '→ sectioned design →' confirmed.
Ruling: fix the Important by removing the line from the template block and having fx-plan skip only on an **Approved:** line followed by a real date; fix both Minors. Why: a draft that copies the template must not pass as approved. Cost if wrong: none found.
Task 07: fix round 1/5 dispatched (resume implementer). FIX_BASE=8067824.
Task 07: fix round 1 result 8067824..78a85c3. Controller re-review (12 lines, read in full): template block no longer holds the Approved line; fx-plan skips only on a real date, placeholder means restate; SURFACE row updated; gate pins all three, each deletion shown failing. Approved.
Task 07: cost 3346560 tokens, 4 min, 2 dispatches, fx-tdd 1/1
Task 07: complete
Ruling: the controller runs task 08's harnesses itself, as for task 05. Bench (FX_BENCH_KEEP set) and lane-triggering run in parallel; fixture run 1 runs alone afterwards, so its wall-clock number is not inflated by concurrent sessions. Cost if wrong: a slower total; none on the numbers.
Task 08: started 2026-10-21T18:36:47Z at 78a85c3.
Task 08: lane-triggering at d98ad7d: 17 passed, 0 failed, 0 skipped (holds). Waiting on the bench.
Task 08: bench audit-b at d98ad7d: 24/24 (bar 23/24: holds), false positives 15 (base 17). Fixture run 1 launched 2026-10-21T18:46:45Z, alone.
Task 08: fixture run 1 at d98ad7d: 6/6 tasks, caughtAtEnd 6/6, fix rounds 0, tokens 7,817,049 (baseline median 23.3M: -66%), wall 16.0 min (baseline median 41.5: -61%), controller calls 53. Early-abort rule allows runs 2 and 3; launched 2026-10-21T19:03:16Z as run.sh 2 audit-final-more.
Task 08: fixture run 2 (audit-final-more-1): tokens 11,722,352 (-50%), wall 23.9 min (-42%), caughtAtEnd 6/6, fix rounds 1, tasksCompleted 7 on a six-task fixture (to check before Checkpoint B). Run 3 running.
Task 08: fixture run 3 (audit-final-more-2): tokens 11,278,813, wall 18.7 min, 6/6, fix rounds 0. Medians 11,278,813 tokens (-52%) and 18.7 min (-55%) against 23.3M and 41.5 min. Defeater not triggered. Checkpoint B recorded.
Task 08: complete
Coverage audit dispatched (sonnet, read-only, writes findings/coverage-audit.md).
Coverage audit: 6 gaps (G1, G2 Important; G3 to G5 Moderate; G6 Low) plus the known lettered-rulings bug, confirmed (19 Ruling lines, rulingsFor returns 17). Citations opened: task-reviewer-prompt.md has 0 'fx-tdd' hits; SKILL.md:296-305 resume rules have no parked case; SKILL.md:497 cap with no per-attempt count; compile-brief:75 'return got || `(missing: ${e})`'; good-tests-examples.md has 3 em dashes.
Ruling: all seven go to one fix subagent before the branch review (task 09, sonnet). G3: rulingsFor keeps a ruling that names this task or names no task, and drops one that names only other tasks, as the design says; the brief-size fixture gains rulings so the ceiling is exercised. G4: compile-brief exits non-zero on any (missing:) entry. G5: security-on-auth counts inside the four-lens cap; devil's advocate is always dispatched, auth only changes its model; the gate counts the cap rule once. Why: the coverage audit runs first so its findings are cheaper than branch-review findings. Cost if wrong: a filtered ruling that applied is dropped; caught by the branch review reading the ledger.
Task 09: dispatched 0608500 2026-10-21T19:51:32Z (implementer, sonnet)
Task 09: implemented 0608500..00857b2 (DONE_WITH_CONCERNS, 1: findings/coverage-audit.md failed check-prose; controller reworded two lines, check-prose OK). [COST_LINE] filled with 'unavailable' when no line exists. Task 09: cost 4751331 tokens, 5 min, 1 dispatches, fx-tdd 1/1 (pre-review)
Task 09: review dispatched (sonnet).
Task 09: review C/I/M 0/2/4. I1: SKILL gives no step when compile-brief exits non-zero. I2: rulingsFor list forms ('tasks 03 and 05', 'tasks 03, 04, 05') read only the first number; a bold '**Ruling A:**' after another ruling is joined to it. Reviewer reproduced both on a scratch rulings.md. Only caller is compile-brief (whole-repo check).
Ruling: fix both Important and M2, M3; M1 and M4 deferred to the branch review. Why: M1 and M4 are gate strength on behaviour now covered by count and template assertions. Cost if wrong: a later edit weakens a gate unseen; caught by the branch review.
Task 09: fix round 1/5 dispatched (resume implementer). FIX_BASE=00857b2.
Task 09: fix round 1 result 00857b2..7839221. Controller re-review (plan-state.js 18 lines, read in full): ENTRY_RE starts a new entry on a bold lettered ruling; TASK_REF takes a run of numbers joined by comma, and, to or dash; names() matches a listed number or a range; SKILL step for a compile-brief failure and the 'unavailable' rule pinned in ledger-lines; fx-plan Design-heading step pinned. Approved. M1, M4 deferred.
Task 09: cost 7786272 tokens, 9 min, 2 dispatches, fx-tdd 1/1
Task 09: complete
Final review: dispatched (opus) on branch.diff 72f180c..d30cdc9. Capable because: final branch review.
Final review: C/I/M 0/5/8; lenses run: broad, silent-failure, devil's advocate (opus); database, security, a11y, pipeline not triggered. Must-fix I1 to I5 plus the compile-brief test gap (state.md deferred minor, folded into I1); 7 deferred minors already fixed at HEAD; the rest left. Citations opened: compile-brief:56 'read(...plan.md) || ""'; plan-state.js:101 ENTRY_RE; SKILL.md:680-682 'not counted twice'; fx-context.js:29 one transcript-path per directory.
Ruling: one fix subagent for I1 to I5 (final-fix, sonnet), then one scoped re-review. I2: a ruling is dropped only when every task reference in it is a plain list or closed range and none covers the task; any open-range wording (on, onward, later, after, from) keeps it. I3: no wrapping in state.md; wrapping stays for docs/plans/rulings.md. I5: window ends at the task's complete write, or at the next task's dispatch write, for controller and subagents. Why: a wrong exclusion loses a binding ruling, a wrong inclusion costs bytes. Cost if wrong: residuals go to the owner in the completion report; no second wave.
Final review fix: dispatched d30cdc9 2026-10-21T20:08:37Z (implementer, sonnet)
Final review fix: d30cdc9..87f7b85 (DONE, check-all exit 0 per implementer). Scoped re-review r1 dispatched (sonnet).
Final review re-review r1: I1 to I5 all addressed, no open findings. Two Minor residuals, parked for the owner (no second wave): 'tasks 03 and 04 on' is not read as an open range; a subagent still running at the window end loses its tail tokens.
Exit gate at 87f7b85: scripts/check-all exit 0, ALL GREEN; tests/conformance/run.sh --free: claude-code 4 pass 0 fail 0 gap, codex 4 pass 0 fail 0 gap, opencode SKIP (opencode 2.0.18 on PATH is not this harness's major).
Plan complete: tasks 01 to 09 complete, 2 parked, final review fixed
