# Coverage audit: design commitments vs task criteria vs what landed

Scope: design.md (19 stories, 6 decisions, Testing Decisions), plan.md, tasks 01-08, state.md Rulings, code at HEAD 0608500 (base 72f180c). Read-only.
Paths below are relative to /development/fx/.worktrees/lean-pipeline.

Result: 6 gaps (2 Important, 3 Moderate, 1 Low). The tracked `rulingsFor` lettered-ruling bug is confirmed and not re-counted.

## Gaps

### G1 (Important). The `fx-tdd 0/<i>` signal has no way to reach the task reviewer
Design/plan: plan.md Risks "HIGH: implementers skip fx-tdd ... a `0/i` line makes a report without a captured RED an Important finding". Story 15. Task 01 criterion: "fx-implement §3 says a cost line with `fx-tdd 0/<i>` ... is passed to the task reviewer".
- The only owner is controller prose: skills/fx-implement/SKILL.md:544 "pass that line to the task reviewer, and a report with no captured RED run is then an Important finding".
- The reviewer half has no owner. skills/fx-implement/task-reviewer-prompt.md has no placeholder for the line (placeholders at :297-307 are MODEL, BRIEF_FILE, FINDINGS_FILE, REPORT_FILE, BASE_SHA, HEAD_SHA, DIFF_FILE) and no sentence about it (grep "fx-tdd" in that file: 0 hits). Its only TDD rule, :123, is "Check the TDD evidence for a **valid RED** ... that is a finding", with no severity.
- The gate (tests/gates/ledger-lines.test.js, per task 01 step 9) asserts `impl.includes('fx-tdd 0/')` in SKILL.md only. It checks the phrase exists, not that it reaches the reviewer.
- Evidence it works only by controller improvisation: state.md:75 (task 03 ran 0/1) and :81 show the controller handled it with a hand-written ruling.
- Fix: add a `[CONTROLLER_NOTE]` slot (or a fixed sentence) to task-reviewer-prompt.md that states "if the controller line reads fx-tdd 0/i, a report with no captured RED is Important", and pin that in the template gate.

### G2 (Important). The re-dispatch cap and the resume rule do not meet
Story 16 and story 18. Task 01 criteria "resume rules" and "§2 caps ... at two per task, then appends the parked line".
- The cap is in skills/fx-implement/SKILL.md:497 "re-dispatch at most twice per task" and :503 `Task <NN>: parked: ...`. Nothing records the count. A dispatch line is the only per-attempt ledger line, and the SKILL never says each re-dispatch appends a new one.
- The resume rule (SKILL.md:296-305) handles only "dispatched, no complete". It has no case for a `parked` line. A controller resuming after compaction sees dispatched with no complete and no commits, and re-dispatches, which is exactly the loop the cap exists to stop.
- "take the next unblocked task" (:499) does not say what happens to tasks blocked by the parked one, or how the final report treats them. `Plan complete: ... <K> parked` (:850) counts parked findings, not parked tasks.
- Gate asserts only the phrases `at most twice` and `git log <BASE>..HEAD`.
- Fix: one resume bullet ("a task with a `parked` line is not re-dispatched; tasks it blocks are skipped and named") and "append a `dispatched` line per re-dispatch so the count is the number of such lines".

### G3 (Moderate). Rulings: design says filtered, delivered is unfiltered, and the size gate cannot see it
Story 8 ("the rulings that apply"), story 12, Decision 1 ("the `Ruling:` lines that name the task or the whole plan"), Core signature `rulingsFor(planDir, taskId)`; story 19 (gate pins the brief ceiling).
- Delivered: `rulingsFor(cwd, planDir)`, "No cap, no filter" (lib/plan-state.js:111-113 and docs/adr/0042 line 10). The deviation is documented in task 03 Interfaces ("No task filter: today the reviewer reads every ruling"). The documented reason holds for the reviewer, not for an implementer.
- Cost on this build: 17 rulings, 5,202 bytes (`node -e rulingsFor(...)` on docs/plans/2026-10-21-audit-fx), most naming one earlier task, in every later brief and every later review.
- The ceiling gate does not cover it: tests/gates/brief-size.test.js compiles a brief from tests/fixture-build/repo, which has no rulings, and asserts `<= 12000`. Template cap 11,000 B plus a 12,000 B brief with no rulings leaves no room, so the first real ledger breaks the saving silently.
- Fix: either filter by task number/plan-wide (as designed), or add rulings to the fixture so the ceiling is exercised.

### G4 (Moderate). A `**Design:**` or `**Stack:**` entry that matches nothing is silent, and the sliced path never ran on a real plan
Story 8 and story 6; Decision 1.
- skills/fx-implement/scripts/compile-brief:75 and :85 write `(missing: <entry>)` and exit 0. Nothing tells the controller to check for it: a grep for the missing marker in skills/, lib/, docs/adr returns only the script and its unit test. The implementer template and fx-plan self-review never mention it. A typo in a heading gives the implementer an empty excerpt with no alarm.
- fx-plan (skills/fx-plan/SKILL.md:292-296) tells the planner to write headings but has no step to verify they resolve in design.md.
- Never exercised end to end: tests/fixture-build/repo task files have 0 `Design:`/`Stack:` lines (grep count 0 on all six), and this plan's own tasks have none, so checkpoint B and every brief in this build used `None.` for the excerpt and whole stack files. plan.md "What the measurement can and cannot show" admits the fixture does not run fx-plan, but also leaves the slice path with only compile-brief.test.js.
- Fix: compile-brief exits non-zero, or the SKILL step greps the brief for the missing marker; fx-plan self-review resolves each Design line.

### G5 (Moderate). The branch-pass cap is pinned by a phrase, and one rule contradicts it
Story 13, 14; design Testing Decisions: "a gate fails ... if the branch pass names more agents than its cap".
- tests/gates/branch-pass.test.js (task 06 step 5) asserts `review.includes('at most four lenses')`. It never counts agents named. Cap in skills/fx-review/SKILL.md:115-121 is on lenses only, so the real agent total is broad + unprimed + 4 lenses = 6, which the design's "cap N on agents" never states.
- skills/fx-implement/SKILL.md:755-759: "When the branch touches authentication or authorization, dispatch `fx-lens-security` and `fx-devils-advocate`" regardless of whether security fired per task. That contradicts the limited rule at :751-753 ("only if it never fired on any task ...") and is outside the four-lens count. Neither the task nor the gate says which wins.
- Fix: state the total agent cap once, and say security-on-auth is an exception counted inside it (or not).

### G6 (Low). No-dash constraint missed in a loaded reference
Global Constraint "No em dashes or en dashes in any lane text".
- references/vocab/good-tests-examples.md (new in task 03, pointed at by skills/fx-tdd/SKILL.md) has three em dashes, e.g. "# ❌ Mirror assertion: the same builder computes both sides, always true" (dash replaced here). Ledgered as a deferred minor (state.md:79) and not fixed. No gate covers references/.

## Confirmed (known, not counted)
- `rulingsFor` skips lettered rulings: state.md has 19 lines starting `Ruling`, rulingsFor returns 17; "Ruling A:" (:36) and "Ruling B:" (:37) never reach a brief. Ruling A binds tasks 03-07 and was honoured only because the controller kept it in mind. Fix in lib/plan-state.js `asRuling` (accept `Ruling [A-Z]:`).

## Checked and cleared
- Stories 1-4, Decision 4: skills/fx-brainstorm/SKILL.md:75 has the eight-step list; :252 says write sections into design.md, do not present in chat; "task for each item" gone; `**Approved:**` read by skills/fx-plan/SKILL.md:35-36 only with a real date; template block does not carry the line (references/design-template.md:10-11). Gate covers all three after fix round.
- Story 5, 6, 7: skills/fx-plan/SKILL.md template has Tests/Design/Stack lines; red-team trigger has no task count (task 04 gate). Test code removed from the template.
- Story 9, 10, Decision 1: template has no `## TDD`, brief path first, fx-tdd first in job list (implementer-prompt.md:16, :35-38). Size 10,909 B reported at ledger (<= 11,000). Reply contract stays in the template by documented decision (ADR 0042).
- Story 11, Decision 2: Measured counts match exactly (SKILL 9, implementer 5, reviewer 4, re-review 1, fx-plan 5, fx-tdd 1 at base; all 0 at head; COVERAGE.md heads show 19/5/1). Surviving lower-case stories (skills/fx-implement/SKILL.md:225, :762) are one line each. The gate checks the heading, not that a story was filed (known minor, state.md:69).
- Story 12: task reviewer reads the brief (task-reviewer-prompt.md:22-35, 298-300), ledger path removed; recompile before review at SKILL.md:553. Review bench uses compile-brief (tests/review-bench/rows/01-review-bench.sh:56-66). Re-review prompt never took rulings at base either (72f180c has no ruling text), so no regression.
- Story 14: lib/dispatch-route.js:18-27 routes `fx:` agents and is called for Agent/Task in hooks/fx-pretooluse.js; both agents pinned sonnet; four call sites each carry their own `Capable because:` (fx-review:212,217; fx-implement:757; fx-plan:199; commands/fx-critique.md:20). Non-Claude harnesses do not run the hook, but the pins are sonnet, so the default holds.
- Story 15, 16, 17: cost line, dispatch line, one-review cap are in SKILL.md (:383, :667, :296-305) with unit tests for build-cost; ledger shows them produced for tasks 01-07.
- Story 19: brief-size, stop order (brainstorm-confidence), branch-pass gates exist and are in scripts/check-all per tasks.
- Decision 5 lens-fired evidence: fx-review SKILL.md:117-119 names `findings/<NN>-lens-<name>.md` as the record, and fx-implement SKILL.md:572 writes one per lens dispatch, so the half that reads it has a producer.
- Decision 6 ADR numbering: ADRs 0040-0045 exist, one per decision; 0029 and 0033 carry supersede lines.
- Quality bars: ledger shows lane-triggering 17/17 twice, bench 24/24 under the owner-approved scorer, Defeater not triggered (state.md:107-143). Owner-approved bar change (state.md:99-100) is recorded as a Ruling with a reason.
- Preamble 2,612 B (< 3,000).
- Success path: plan.md standing rulings (BLOCKED checkpoint stops build) are controller-only by design and need no brief; the one refusal-only area is G4 (`missing` is a mark, with no stated next step).

## What tasks assume that no design story states
- Brief gains `Global constraints` and `Context` sections and loses `Reply contract` (task 03 Interfaces; documented in ADR 0042). Design story 8 lists neither.
- Stack slice chosen by the planner's `**Stack:**` line, whole files when absent (task 03). The design's add-a-provider walkthrough (design.md:190-193) still says the brief compiler "selects stack sections by the task's file list". Stale text in the design, harmless to the build.
- Approval marker is a dated `**Approved:**` line (task 07 plus fix round), where the design says "the design's Status shows it was approved in this session". Owner ruling at state.md:131 covers it.
- Cost line format has units and the fx-tdd count (task 01); the design prints `cost <tokens> <minutes> <dispatches>`. ADR 0040 records it.
- Hook records `.fx/transcript-path` only where `.fx` is ignored or the cwd is not a git tree (Ruling B, state.md:37). Cost lines are "unavailable" elsewhere, and that is a design-visible limit of story 15.
