# Lean build: fewer tokens, less wall-clock, same review

**Date:** 2026-09-23
**Status:** ready-for-agent
**Glossary:** no `CONTEXT.md` in this repo. Terms used as the skills use them:
lane, controller, ledger, frontier, task review, lens, fixture.

## Problem Statement

An fx build is slow and expensive. The last measured build (multi-harness, tasks
11 to 13 plus the final review) ran 38 hours of wall-clock and about 350M
controller tokens alone. The owner wants builds that consume less and finish
sooner, with output quality the same or better.

Measurement this session showed where the cost is, and it is not the always-on
text:

- The controller's context is the largest cost. 709 controller API calls ran at
  a median context of 503K tokens (p90 872K), so every call re-read half a
  million tokens. The controller was active only 3.5 of the 38 hours.
- Wall-clock is spent waiting on subagents, which run one implementer at a
  time, and each implementer runs the full `check-all` suite because this
  repo's `.fx.json` has no `test_scope`.
- The `security-guidance` plugin runs an Opus security review on every
  `SubagentStop` and every commit, duplicating fx's security lens and waking the
  controller with its findings. About 96 sessions and 57M tokens in one build.
- The plan-state notice lists finished plans as unfinished, and it is injected
  into every session and every subagent. In this repo it tells each subagent
  that three builds are underway when two are done.
- Skill descriptions cost about 192 tokens per turn. Model routing was fixed on
  2026-09-22 (commit eb83ede) and the fix held for implementers and reviewers.
  Neither is a lever here.

What must not be lost, measured from five build ledgers: per-task review found
at least one finding on 50 to 90 percent of tasks and an Important or worse on
40 to 75 percent. Tasks filed as docs-only still carried Important findings.
Three builds show a defect caught late after later tasks had built on it.
Per-task lenses found something real every time they fired, including a
Critical. Deferring or thinning per-task review would lose quality, so this
design keeps it whole.

## Solution

Measure first, then remove overhead around the checks, one change at a time,
each shipped only if a seeded fixture build shows no quality loss:

0. Turn off the duplicate `security-guidance` reviewer in repos where fx builds.
1. Build the instrument: a seeded fixture plan, a build-cost report, a wider
   lane-triggering suite, and a size gate for the bootstrap. Take a baseline.
2. Fix the plan-state notice so it skips finished plans and never reaches
   subagents.
3. Cap controller context: subagents return a verdict of at most five lines and
   a path, and the controller never pulls reports, diffs or the whole ledger
   into its context.
4. Let two frontier tasks run at once, only when the plan declares them
   independent, their files are disjoint, and the repo's tests are isolated.
   Every guard fails toward serial.

Per-task review, the fix loop, trigger-gated lenses, and the branch-end review
stay exactly as they are.

## User Stories

1. As the fx owner, I want a build to cost fewer tokens, so that a plan does not
   consume most of a week's limit.
2. As the fx owner, I want a build to finish in less wall-clock, so that I get
   reviewed work back sooner.
3. As the fx owner, I want every cut measured against a seeded fixture, so that
   a quality loss is caught before it ships and not after.
4. As the fx owner, I want the fixture to contain traps that per-task review is
   meant to catch, so that "same quality" has an answer key.
5. As the fx owner, I want a report that reads a build's transcripts and gives
   deduplicated API calls, tokens by dispatch type, controller context growth
   per task, wall-clock, fix rounds and traps caught, so that before and after
   are compared on numbers.
6. As the fx owner, I want the lane-triggering suite to cover every model-facing lane and
   include prompts that must not fire a lane, so that a routing regression
   smaller than row 04 can see is still caught.
7. As the fx owner, I want the 3,000 and 9,000 character bootstrap limits
   asserted by a gate, so that the bootstrap cannot grow past Claude Code's
   10,000 character hook limit unnoticed.
8. As a session in a repo with finished plans, I want the plan-state notice to
   stay silent about them, so that I am not routed into `fx-implement` for work
   that is done.
9. As a dispatched subagent, I want my context to carry the bootstrap and my
   task, and not a list of the repo's plans, so that I am not pulled toward work
   that is not mine.
10. As `fx-implement`, I want to write a canonical `Plan complete:` line when a
    build finishes, so that the plan-state notice can tell a finished plan from
    an unfinished one without guessing.
11. As the fx owner, I want the three existing ledgers backfilled with that line
    where the build is done, so that this repo's notice is correct from day one.
12. As a controller, I want every implementer, reviewer and fixer to return at
    most five lines (status, report path, commit range, open count), so that my
    context grows by a line per dispatch and not by a report.
13. As a controller, I want to append to the ledger without reading it back, and
    read it only with `tail` or `grep`, so that the ledger's length never enters
    my context.
14. As a controller, I want to read a report or findings file only when a
    verdict is disputed, and only the disputed section, so that reading stays
    the exception.
15. As a controller, when a subagent breaks the return contract or writes no
    report, I want to re-dispatch once with the contract restated and then flag
    the task, so that one bad return does not stall the build.
16. As a plan author, I want an optional `Parallel with:` field on a task that
    names the other tasks and why neither needs the other's output, so that
    parallelism is a claim the owner approves and not an inference.
17. As the fx owner, I want to see every `Parallel with:` claim when I approve a
    plan, so that a wrong independence claim has a human checkpoint.
18. As a controller, I want to run two frontier tasks at once only when
    `isolated_test_execution` is true, both are declared parallel with each
    other, their `Files:` lists are disjoint, and neither touches a hot file, so
    that concurrent work cannot collide on a known conflict.
19. As a controller, I want each parallel implementer in its own task worktree,
    so that two implementers never share a git index.
20. As a controller, I want to compare each parallel task's actual changed files
    against its own list and the other task's files, and send any overlap or
    undeclared file back to serial, so that a wrong `Files:` list costs time and
    not correctness.
21. As a controller, I want to rebase a reviewed parallel task onto the build
    branch, run `test_scope`, and fast-forward, and on a conflict or red test
    send it back to serial with a re-review, so that merging never skips a check.
22. As a controller, I want a task to start only when its blockers are review
    clean, parallel or not, so that no task builds on unreviewed code.
23. As a repo owner running `fx-setup`, I want one question about whether my
    tests use shared services, so that `isolated_test_execution` is set
    correctly without my knowing the key.
24. As the fx owner, I want this repo's `.fx.json` to set `test_scope`, so that
    each task runs its own tests and gates and `check-all` runs once at the exit
    gate.
25. As the fx owner, I want each step to ship only if, pooled over 3 runs, no
    trap is caught at the end less often, or missed by review more often, than
    at baseline, row
    04 and triggering fire rates are unchanged or better, and tokens or
    wall-clock drop, so that no step trades quality for speed.
26. As the fx owner, I want parallel tasks dropped if the fixture shows any
    merge-caused defect or a wall-clock gain under 15 percent, so that the
    riskiest step has a stated exit.

## Implementation Decisions

**Order.** Steps 0 to 4 land in order, each a separate commit with its own
measurement. Step 1 comes before any change to behaviour, and nothing is cut
before the baseline exists.

**Step 0, duplicate reviewer.** A project-level `enabledPlugins` override turns
`security-guidance` off where fx builds. This is settings, not fx code.
`fx-setup` does not grow an option for it now.

**Step 1, instrument.**
- Fixture: a small repo and a six-task plan with planted traps. One spec
  ambiguity. One security hole in an early task that a later task builds on.
  One swallowed error. One interface two tasks share. One task filed as docs
  that carries a real defect. One truly independent pair declared
  `Parallel with:` (the pair step 4 can speed up), and one task declared
  parallel that quietly needs another's output (the pair a guard must send
  back to serial). Traps live in task prose, not in the design's Global
  Constraints, because `fx-implement` copies the constraints into every
  dispatch and an implementer who reads the answer never springs the trap.
- Scoring (amended after the plan red-team, 2026-09-23). Each trap has a
  hidden test the build never sees. Two numbers per trap: **caught at the
  end** (hidden test green on the finished branch) and **caught by review**
  (red at the implementer's own commit, green at the end). Caught by review is
  the number that shows whether a change weakened review; caught at the end
  alone saturates when implementers get it right first time. A trap green
  at the implementer's commit is `clean`: nothing for review to catch, and
  not a review loss. A **merge
  defect** is a hidden test green on a task's own branch and red after the
  merge.
- Build-cost report: a script that reads a build's Claude Code transcripts,
  deduplicates records by request id (Claude Code writes one record per content
  block, and records from one call share usage), and reports the numbers in
  story 5. It exits non-zero when it finds no transcripts or cannot
  deduplicate; a missing measurement never counts as a pass.
- Triggering suite: a prompt for every model-facing lane that lacks one, and
  should-not-fire prompts, run with a scratch home directory. Model-facing
  means the lane can fire from a prompt: 12 of the 17 skills. The other 5 are
  user-invoked only (`disable-model-invocation: true`) and cannot fire, so
  they get no positive prompt (amended 2026-09-23; story 6 said 17).
- Size gate: already in place. `lib/preamble.test.js` asserts both limits and
  `scripts/check-all` runs it (found while planning; story 7 needs no work).
- Baseline: a one-run smoke build first, then three fixture builds on the
  current pipeline.

**Step 2, plan-state notice.** Finished means the ledger contains a line
starting `Plan complete:`. `fx-implement`'s completion step writes it. The hook
passes the event name to the renderer, and on `SubagentStart` the plans block is
left out. The bootstrap still reaches every subagent unchanged. Backfill:
`2026-09-11-fx-audit` and `2026-09-12-fx-audit-followups` are done;
`2026-09-01-fx` is marked done, because its remaining task 08 work is the
owner's live install and not a build step. A ledger that cannot be read keeps
the plan listed (fail open, as today).

**Step 3, controller context cap.**
- Every implementer, task reviewer, re-review and fixer dispatch template ends
  with the same return contract: at most five lines giving status, report path,
  commit range and open finding count. Everything else goes in the report file.
- `fx-implement` states the controller's reading rules: append to the ledger,
  never read it whole; git output in one-line forms; reports, diffs and
  findings are read only for a disputed verdict, and only the disputed part.
- Target: controller context growth per task at least three times smaller than
  baseline. A median alone misleads on a six-task fixture when real builds run
  9 to 31 tasks.
- Not built: a forced mid-build session handoff. Added only if the target is
  missed.

**Step 4, parallel tasks.**
- `fx-plan` gains the optional `Parallel with: NN, NN: reason` field (the reason
  names why neither task needs the other's output) and a hot-file list:
  manifests, `package.json`, version files, `check-all`, changelogs, registry
  and index files. A task touching a hot file is always serial.
- `fx-implement` runs at most two tasks at once, only when all four gates in
  story 18 hold. Each runs in its own task worktree branched from the build
  branch head. The post-implementation file check and the rebase, test and
  fast-forward merge follow stories 20 and 21. Every failure path returns the
  task to serial.
- The existing `isolated_test_execution` switch is the gate; no new switch.
- `fx-setup` asks whether tests use shared services and sets the switch.
- This repo's `.fx.json` sets `test_scope` in step 4. It sets
  `isolated_test_execution: true` only when step 4 ships and two suites are
  shown to run concurrently without interference: if parallel is dropped, the
  old unguarded relax rule returns, and the key must not be on then.
- Ship condition in story 26.

**ADR.** ADR 0021 stands: routing stays in the descriptions, the bootstrap
invokes, the lanes carry the rules. Nothing moves into the always-on text.
Step 2 removes text from subagent context; it adds none.

## Testing Decisions

Confirmed seams:
1. **Unit, existing seams.** The plan-state tests cover the `Plan complete:`
   line and the unreadable-ledger case. The preamble tests cover leaving the
   plans block out on `SubagentStart` and the two size limits. A new gate
   asserts every dispatch template carries the return contract and that the
   plan template documents `Parallel with:` and the hot-file list.
2. **Behaviour, existing live seam.** Row 04 plus the widened triggering suite
   through the conformance runner. Claude Code in full, opencode spot-checked.
3. **Build quality and cost, the one new seam.** The fixture build scored by the
   build-cost report, three runs per variant. Live and quota-bound, so it runs
   by hand and is not part of `check-all`.

Tests assert external behaviour: what text a session or subagent receives,
which plans are listed, what a template requires, what a build caught and what
it cost. Prior art: `lib/preamble.test.js`, the plan-state tests,
`tests/gates/description-overlap.test.js`, `tests/conformance/rows/04-*`,
`tests/lane-triggering/`.

## Global Constraints

- Per-task review, the five-round fix loop, trigger-gated lenses, the coverage
  audit and the branch-end review are not weakened by any step.
- A step ships only if, pooled over its 3 fixture runs, no trap is caught at
  the end fewer times than at baseline and no trap is missed by review more
  times than at baseline, and row 04 and triggering fire rates
  are unchanged or better. Cost and time compare on medians.
- Bootstrap alone under 3,000 characters; worst-case render under 9,000.
- Nothing moves into the always-on text (ADR 0021).
- Every parallel guard fails toward serial.
- Any shipped-file change bumps the plugin version (`release-version.test.js`).
- No em or en dashes, no attribution trailers, in any file or commit.

## Out of Scope

- Trimming skill descriptions, skill bodies or the bootstrap for cost. Measured
  at about 192 tokens per turn; touched only where the widened suite finds a
  routing error.
- Deferring per-task review to the branch end, or scaling it down by task kind.
  The ledgers show both lose quality.
- Moving per-task lenses to the branch end.
- An implementer turn or time budget (the owner left it out of scope).
- Workflow-script orchestration on Claude Code. Recorded as the next step if
  step 3 misses its target.
- The security lens's pinned Opus model. No evidence either way; left as is.
- Codex live matrix, task 22 part B of multi-harness, blocked until
  2026-10-21.

## Open Questions

None.

## Further Notes

Evidence behind the numbers, all gathered 2026-09-23:
- Controller: transcript `61606dd5`, 1,299 records deduplicated to 709 API
  calls, 347M tokens, median context 503K, active 3.5 hours of 38.
- Model split at eb83ede: after the fix, implementers, task reviewers and other
  dispatches ran on Sonnet; Opus remained on re-review and branch review (with
  stated reasons) and on the security lens (pinned in its agent file).
- The 96 security-review sessions have `entrypoint: sdk-py` and match the
  `security-guidance` plugin's `SubagentStop`, `Stop` and commit hooks, model
  default `claude-opus-4-7`.
- Review yield per build, lens yield, and late-defect cases are in the ledgers
  of 2026-09-01-fx, 2026-09-11-fx-audit, 2026-09-12-fx-audit-followups and
  2026-09-21-multi-harness.
- The usage reports from 2026-09-22 16:16 and 16:18 predate eb83ede and show 98
  to 100 percent of spend on Opus.
