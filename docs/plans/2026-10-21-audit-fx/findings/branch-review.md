# Branch review: lean-pipeline (72f180c..HEAD)

Mode: branch, with-ledger limited pass (skills/fx-review/SKILL.md:113-123 on this branch).
Diff: .fx/2026-10-21-audit-fx/review/branch.diff, 76 files, +2742/-702.

Passes that ran:
- Broad pass (this file's author, most capable tier): plan alignment, cross-task seams, deferred-minor triage.
- fx-lens-silent-failure, branch mode: its branch trigger (`catch`) matches skills/fx-implement/scripts/compile-brief and lib/plan-state.js, outside task 01 where it fired.
- fx-devils-advocate, code mode, unprimed.

Lenses not run, because no branch trigger matches authored content: fx-lens-database (no SQL, model or migration), fx-lens-security (no auth, endpoint, credential or string-built shell; the hook's `git check-ignore` call has fixed arguments), fx-lens-a11y (no UI markup or user-facing strings), fx-lens-pipeline (no code that enqueues or schedules work).

Local evidence: `scripts/check-all` at HEAD prints ALL GREEN. Review bench, lane-triggering and fixture builds were not re-run; their results are in checkpoints.md (bench 24/24, lane-triggering 17/17, median tokens down 52%, wall clock down 55%).

## Strengths

- The ledger is honest and complete: every ruling has a reason and a cost, and every deferral is traceable. The checkpoint A bar change is recorded with the owner's approval and the evidence behind it.
- compile-brief now dies on an unresolved `**Design:**` or `**Stack:**` entry (compile-brief:75, :87), closing coverage-audit G4.
- `route()` stays pure and small (lib/dispatch-route.js:18-27), and the opus pins are gone from both agents.
- The hook clears a stale transcript path on every non-write branch (hooks/fx-context.js:30-37), and build-cost turns every failure into one `cost unavailable` line (scripts/build-cost:255-262).
- Gates pin each call site's own `Capable because:` line instead of a file-level match.

## Critical

None.

## Important

### I1. compile-brief writes a brief that looks complete when the plan cannot be read

skills/fx-implement/scripts/compile-brief:56 `const plan = read(path.join(planDir, 'plan.md')) || '';`
skills/fx-implement/scripts/compile-brief:69 `const design = read(path.join(planDir, 'design.md')) || '';`
skills/fx-implement/scripts/compile-brief:92 `try { names = JSON.parse(read(path.join(opt.worktree, '.fx.json')) || '{}').stacks || []; } catch { /* no stacks */ }`

- What: a mistyped `<SLUG>` or `--worktree` exits 0. Reproduced: `compile-brief --worktree tests/fixture-build/repo 2026-01-01-nots <task 02> out.md` printed the path, rc=0, and the brief reads `## Global constraints` then `None.`. Rulings are empty too, because `rulingsFor` treats a missing state.md as no rulings. A malformed `.fx.json`, or a stack name with no file (line 93 `.filter((s) => s !== null)`), gives `Stack: None.` with exit 0.
- Why: since task 03 the brief is the only channel for constraints and rulings to both the implementer and the task reviewer (task-reviewer-prompt.md:21-26). The controller checks only the exit code (fx-implement/SKILL.md:445), so a silent empty brief goes through review unseen. The explicit `**Stack:**` path already dies on the same mistake, so the two paths disagree. That contradicts the G4 ruling (state.md:146, "compile-brief exits non-zero on any (missing:) entry").
- Fix: `die` when plan.md cannot be read; `die` on a `.fx.json` parse error or on a named stack with no file. Add a test case for each in compile-brief.test.js. Both the lens and devil's advocate raised this independently.

### I2. The ruling filter drops rulings that do apply to the task

lib/plan-state.js:116 `const TASK_REF = /\btasks?:?\s*(\d+(?:\s*(?:,|and|to|-)\s*\d+)*)/gi;`
lib/plan-state.js:124-127 `return hits.length > 0 && !hits.some(Boolean);`

- What: reproduced with `rulingsFor` on a scratch ledger. `Ruling: tasks 05 or 08 stop the build.` reaches task 05 and is dropped for task 08, because `or` is not a separator. `Ruling: from task 03 on, use X.` is dropped for both 05 and 08, because an open range reads as "names only task 03".
- Why: the reviewer is now told to treat every ruling in the brief as an acceptance criterion (task-reviewer-prompt.md:35-40) and no longer gets the ledger. A dropped ruling is therefore never checked. The G3 ruling accepted this risk with "caught by the branch review reading the ledger"; this is that catch.
- Fix: add `or` to both separator lists (lines 116 and 120). Treat `task NN on`, `onward`, `and later` and `after task NN` as open ranges, or keep a ruling whenever its wording is not a plain list. A missed exclusion only costs a few hundred bytes, while a wrong exclusion loses a binding ruling.

### I3. A ledger ruling absorbs the free-form line after it

lib/plan-state.js:101 `const ENTRY_RE = /^(Task |Ruling( [A-Z])?:|\*\*Ruling( [A-Z])?:|- |\* |#)/;`
lib/plan-state.js:108 `while (i + 1 < lines.length && lines[i + 1].trim() && !ENTRY_RE.test(lines[i + 1].trim())) r += ...`

- What: the ledger has no blank lines between entries, and it carries lines that do not match ENTRY_RE ("Owner chose option 1", "Coverage audit dispatched", "Correction to my spot check above", state.md:98, :110, :144). Reproduced: `Ruling: every task keeps the old API.` followed by `Coverage audit: dispatched for task 03.` returns `[]` for task 05. The glued text's task number then sends the plan-wide ruling through the filter in I2. This ledger avoided the bug only because every ruling happens to be followed by a `Task ` or `Ruling` line.
- Why: a plan-wide ruling silently leaves every brief but one.
- Fix: in state.md a ruling is one line, so do not wrap there. Keep wrapping for docs/plans/rulings.md only, or only for indented continuation lines. Add the reproduced case to plan-state.test.js.

### I4. One transcript-path slot per directory: the last session to start wins

hooks/fx-context.js:29 `const file = path.join(cwd, '.fx', 'transcript-path');`
scripts/build-cost:269 `file = fs.readFileSync(path.join(process.cwd(), '.fx', 'transcript-path'), 'utf8').trim();`

- What: a second session started in the same directory overwrites the path. This machine runs concurrent sessions per repo, which is why the shared-stash warning exists. build-cost then reads the other session's transcript and prints a line that looks valid: few tokens, `0 dispatches, fx-tdd 0/0`.
- Why: `fx-tdd 0/0` disables the TDD signal (fx-implement/SKILL.md:550 fires only when `i` is above 0), and that signal is the mitigation for the plan's first HIGH risk (plan.md Risks). The failure looks like a clean result, not like "unavailable". The live path is also unexercised: task 01's cost line says the installed 0.2.5 hook does not record it (state.md:62).
- Fix: build-cost checks that the transcript it read contains this task's own `Task <NN>: dispatched <BASE7>` write, and prints `cost unavailable (transcript is another session's)` otherwise. That is one search over records the script already parses.

### I5. The per-task cost line is a time window, and the SKILL says it is not

scripts/build-cost:281 `let tokens = sum(dedupCalls(records, file).filter((c) => new Date(c.timestamp).getTime() >= sinceMs));`
scripts/build-cost:305 `const minutes = Math.round((Math.max(...stamps) - sinceMs) / 60000);`
skills/fx-implement/SKILL.md:680-682 "Subagents count toward a task by the task number in their dispatch text, so a review running beside the next implementer is not counted twice."

- What: controller tokens and minutes run from the dispatch time to the end of the transcript, so they include the next task's controller work and any owner wait. Evidence: state.md:84 "Task 03: cost 13055754 tokens, 283 min, 3 dispatches"; the task was dispatched at 07:35 and task 04 at 12:19. Subagents have no time filter at all, so a subagent from an earlier plan in the same session that names the same task number is counted too.
- Why: checkpoints.md:40 names "the cost lines of the next real plan" as the only measurement of decisions 3 and 4. Overlapping windows inflate exactly those numbers, and the SKILL sentence tells the reader they do not overlap.
- Fix: end the window at the `Task <NN>: complete` write, or at the first record after `since` that names the next task's dispatch line, and apply the same window to subagent files. At minimum, correct the SKILL sentence to say the controller part is a window.

## Minor

M1. skills/fx-implement/SKILL.md:759 "only if it never fired on any task, or its branch trigger matches files outside the tasks where it fired". This leaves out fx-review's precondition (skills/fx-review/SKILL.md:115 "A lens runs when its branch trigger matches the branch diff and it either ..."). Read alone, the controller text dispatches every lens that never fired, up to four, with nothing to review. Add "when its branch trigger matches the branch diff".

M2. lib/plan-state.js:76-78 asRuling: `**Ruling A:** keep it.` comes back as `Ruling A:** keep it.` (reproduced), because only the unlettered bold form is normalised. Near-miss forms (`ruling:`, `Ruling (K):`) are skipped with no note. Normalise `**Ruling X:**` the same way as `**Ruling:**`.

M3. docs/plans/2026-10-21-audit-fx/plan.md:35 "## Standing rulings for this build": `Ruling:` lines in plan.md never reach a brief, because compile-brief reads only docs/plans/rulings.md and state.md. This plan's two are controller-only, so nothing was lost here, but fx-plan gives no rule about where an implementer-binding plan ruling must go.

M4. scripts/build-cost:284 `const mine = new RegExp(`\\btask:? ${nn}\\b`, 'i');`: attribution needs a "task NN" token in the subagent's first message. The task reviewer gets one only through `[COST_LINE]` (task-reviewer-prompt.md:31), so it is uncounted when that line is `unavailable`. The re-review template (re-review-prompt.md:22 `Read it: [TASK_FILE]`) has none. Put `task [NN]` in each template's opening line.

M5. skills/fx-implement/SKILL.md:503-504 "Each re-dispatch appends its own `dispatched` line" against :548 "--since <time from the dispatch line>": with several dispatch lines, the text does not say which time to pass. Say "the first dispatch line".

M6. hooks/fx-context.js:34 treats exit 128 as outside git. `git check-ignore` also exits 128 inside a repo on fatal errors such as "detected dubious ownership", and then the hook writes `.fx/transcript-path` into a tree that may not ignore it, which Ruling B forbids. Check `git rev-parse --is-inside-work-tree` before treating 128 as outside git.

M7. lib/dispatch-route.js:23-24 rewrites an explicit top-tier `model` on an `fx:` agent to sonnet with no signal to the caller, so a ledger can record "(opus)" for a sonnet run. ADR 0044 decides the downgrade; only the missing notice is the finding.

M8. docs/plans/2026-10-21-audit-fx/checkpoints.md:41 "The count is a ledger-parse quirk and does not enter the token or wall-clock figures." The same parser fills the Fix rounds column in the Checkpoint B table, so that column is unverified until the `tasksCompleted 7` over-count has a cause.

Outside the diff, not counted: tests/conformance/lib/jail.sh:122-123 skips a hide path that does not exist; tests/review-bench/fill-template.js:24 runs to end of file when the closing fence is missing; lib/plan-state.js:36 and :142 cap plans at 20 and swallow scan errors. All three predate 72f180c.

## Spec compliance

- Plan aligned. All six decisions landed with ADRs 0040 to 0045. 0029 and 0033 carry supersede lines. Gates are wired into check-all.
- Deviations, all ruled in the ledger: the brief keeps the reply contract in the template and adds Global constraints and Context (ADR 0042); the approval marker is a dated `**Approved:**` line (state.md:131); the checkpoint bar is "head catches what base catches" (state.md:99-100).
- Plan-level issue: the design's add-a-provider walkthrough (design.md, "fx-implement's brief step: no change; it selects stack sections by the task's file list") is stale. The brief selects by the task's `**Stack:**` line. Design text only; harmless to the build.
- Cannot verify from the diff: decisions 3 and 4 have no measurement yet (checkpoints.md:40). I4 and I5 bear directly on that future measurement.

## Carried findings triage

| Ledger line | Verdict | Reason |
|---|---|---|
| state.md:45 T01 check-ignore spawn error or timeout looks like "not ignored" | leave (closed) | HEAD clears the file on a non-0, non-128 status (fx-context.js:34), per the ruling at state.md:56 |
| state.md:47 T01 hook runs git synchronously, 2 s timeout | leave | Bounded; check-ignore takes milliseconds |
| state.md:48 T01 nonsense minutes with no timestamps; invalid --since exits 2 | leave (closed) | build-cost:278-279 now fail to a `cost unavailable` line, exit 0 |
| state.md:49 T01 ledger-lines gate pins by substring | leave | Gate strength only |
| state.md:59 T01 Math.max spread RangeError | leave | Measured here: 100,000 args fine, 130,000 throw; the largest local transcript is 56,451 lines. A `reduce` is a one-line fix if a fix agent is already in build-cost for I5 |
| state.md:67 T02 stray `**` at implementer-prompt.md:247 | leave (closed) | Not present at HEAD (implementer-prompt.md:151) |
| state.md:68 T02 COVERAGE.md indentation | leave | COVERAGE.md is never loaded |
| state.md:69 T02 gate misses lower-case "measured" stories | leave | One-line remnants such as SKILL.md:604 "In one measured session"; no load cost worth a gate |
| state.md:76 T03 rulingsFor skips lettered rulings | leave (closed) | Fixed by task 09; the remaining stray `**` is M2 |
| state.md:77 T03 "Verify a constraint before you copy it" stale | leave | SKILL.md:599 still applies to the controller's context file; reword when next touched |
| state.md:78 T03 three em dashes in good-tests-examples.md | leave (closed) | 0 at HEAD, fixed by task 09 |
| state.md:79 T03 compile-brief tests lack missing-paragraph and missing-stack cases | must-fix-before-merge, inside I1 | The resolve-to-nothing case is now tested (compile-brief.test.js:44), but the `.fx.json` fallback that I1 changes has no test |
| state.md:90 T04 fx-plan COVERAGE.md rows describe superseded rules | leave | Provenance ledger, never loaded |
| state.md:90 T04 plan-template gate does not pin new Steps, "one seam", reader line | leave | Gate strength only |
| state.md:90 T04 header `**Stack:**` vs task `**Stack:**` (fx-plan/SKILL.md:257, :299) | leave | A header-style value in a task fails loudly in compile-brief (no `/`), so the mix-up cannot pass silently |
| state.md:124 T06 devil's advocate tier unstated in the with-ledger pass | leave (closed) | SKILL.md:765-766 now says it runs on the standard tier |
| state.md:151 T09 M1 brief-size ceiling does not bite unfiltered | leave | The ruling-count assertion is the real gate (brief-size.test.js:44) |
| state.md:151 T09 M4 `[COST_LINE]` gate matches any mention | leave | Low risk; the template-slot assertion at ledger-lines.test.js:31 covers the reader side |

There are no parked lines.

## Recommendations

- Send I1 to I5 to one fix subagent, with one scoped re-review, as fx-implement's Final review section says. I1, I2 and I3 are in two files (compile-brief, plan-state.js) and share one theme: the brief must never be quietly smaller than the ledger. I4 and I5 are both in build-cost's `taskCost`.
- M1 and M5 are a few words each in the same SKILL and can ride along.

## Assessment

**Ready to merge?** With fixes.
**Reasoning:** The pipeline changes are sound, measured and gated, and check-all is green. But the compiled brief is now the only channel for rulings and constraints, and three defects (I1 to I3) can shrink it silently, while the cost line meant to measure the next real plan can be wrong without saying so (I4, I5).

## Ledger lines

Task 03: minor (deferred): fx-implement SKILL Final review lens rule omits the "branch trigger matches the branch diff" precondition that fx-review states.
Task 09: minor (deferred): asRuling leaves a stray `**` on a bold lettered ruling and skips near-miss ruling forms with no note.
Task 03: minor (deferred): plan.md standing `Ruling:` lines never reach a brief; fx-plan says nowhere where an implementer-binding plan ruling goes.
Task 01: minor (deferred): build-cost attributes subagents by a "task NN" token that the reviewer prompt carries only via COST_LINE and the re-review prompt never carries.
Task 01: minor (deferred): with several dispatched lines per task, SKILL does not say which time to pass to --since.
Task 01: minor (deferred): hook treats git exit 128 as outside git, which also covers fatal errors inside a repo such as dubious ownership.
Task 06: minor (deferred): route() downgrades an fx: agent's explicit top tier with no notice to the caller.
Task 08: minor (deferred): tasksCompleted 7 over-count left without a cause, though the same parser fills the Fix rounds column.
