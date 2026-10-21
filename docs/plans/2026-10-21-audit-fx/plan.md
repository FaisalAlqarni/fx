# fx lean pipeline: implementation plan

> **Build this with `fx-implement`. Do not execute the tasks directly.**
>
> The tasks below are deliberately detailed. That makes them easy to follow and
> it is exactly why the lane gets skipped: nothing looks missing. What is
> missing is everything a task file cannot hold, and it is what `fx-implement`
> supplies: a worktree so the main checkout is never written to, a ledger that
> survives compaction, a fresh subagent per task, a review while each diff is
> still small, and lens dispatch on what the diff actually touched.
>
> Steps use `- [ ]` checkboxes.

**Design:** `./design.md`
**Goal:** cut what each fx agent reads, how many agents a build runs, and how many times the owner is stopped, while the review bench and lane-triggering results hold.
**Architecture:** Six changes land in the design's order: a measured cost line per task, rule-only lane text, a compiled brief per implementer, fewer and deeper plan tasks, a branch pass limited to what per-task review missed, and one design checkpoint. Two quality checkpoints sit in the sequence: one before the review side changes, one at the end with the cost measurement. Lane text changes are pinned by gate tests in `tests/gates/`, all listed in `scripts/check-all`; two library changes (`rulingsFor`, `route` for `fx:` agents), one hook change (transcript path) and two scripts (`build-cost --task`, `compile-brief`) carry the mechanical parts.
**Stack:** Node.js (CommonJS, no dependencies), Bash, Markdown lane files.
**Complexity:** Medium
**Risks:**
- HIGH: implementers skip fx-tdd once the template's TDD summary is gone: task 01's cost line counts fx-tdd calls per task (`fx-tdd k/i`) and a `0/i` line makes a report without a captured RED an Important finding; task 03 keeps the fx-tdd order first in the job list and the report's TDD evidence section, pinned by a gate.
- HIGH: a quality loss goes unnoticed until the end: task 05 runs the review bench and lane-triggering after the brief and the plan template land, before the review side changes; a failed bar stops the build (standing ruling below).
- MEDIUM: a gate test pins text being moved or rewritten: every task runs `test_scope`, which runs every gate on a `.md` change; the pinned assertion is updated in the same task, keeping what it protected.
- MEDIUM: the build runs in a worktree off the base branch: the owner commits the pending work in the main checkout before `fx-implement` starts.
**Testing:** Unit: `node` tests beside `lib/`, `scripts/` and `skills/fx-implement/scripts/` · Gates: `tests/gates/*.test.js` through `scripts/test-scope`, and all of them in `scripts/check-all` · Quality and cost: tasks 05 and 08 run the review bench, lane-triggering and the fixture build.

## Global Constraints

- No em dashes or en dashes in any lane text.
- Pre-production: no compatibility shims; edit in place and supersede ADRs.
- Every decision above gets an ADR, numbered from 0040 on.
- Review bench at least 23 of 24; lane-triggering 17 of 17; conformance 0 fail.
- Preamble stays under 3,000 characters.
- Model routing default stays the standard tier.

## Standing rulings for this build

- Ruling: a checkpoint task (05 or 08) that reports BLOCKED stops the build. The controller does not skip it or take the next task; it ledgers the numbers and reports to the owner.
- Ruling: tasks 05 and 08 spend live quota by design (review bench, lane-triggering, fixture builds); their long commands run as tracked background commands, and their result files are committed.

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | Cost, dispatch and cap lines in the ledger | none | Transcript path hook; `build-cost --task` with fx-tdd count; dispatch, cost and parked ledger lines; review and re-dispatch caps; ADR 0040 | MVP |
| 02 | Rules in the lane, stories in COVERAGE.md | 01 | No "Measured" stories in the five most-loaded lane files; gate; ADR 0041 | MVP |
| 03 | One compiled brief per implementer | 02 | `rulingsFor`, `compile-brief`, template keeps every contract and drops the TDD summary, reviewer reads the brief, review bench updated; size gates; ADR 0042 | MVP |
| 04 | Fewer, deeper plan tasks | 03 | Tests specified in prose, Design and Stack lines, consistent placeholder and red-flag lists, risk-only red-team trigger; gate; ADR 0043 | MVP |
| 05 | Quality checkpoint after the brief and the plan template | 04 | Review bench and lane-triggering results; stop on a failed bar | MVP |
| 06 | Branch pass limited to what per-task review missed | 05 | `route` covers `fx:` agents, sonnet pins with `Capable because:` at every top-tier call site, capped branch pass; gate; ADR 0044 superseding 0029 in part | MVP |
| 07 | One design checkpoint | 06 | Confidence and approaches in one message, one design.md review, `Approved:` line read by fx-plan; gate update; ADR 0045 superseding 0033 | MVP |
| 08 | Final quality and cost measurement | 07 | Bench, lane-triggering, fixture builds with early abort; Defeater verdict | MVP |

## What the measurement can and cannot show

The fixture build runs a pre-written six-task plan, so it measures the brief, the rule-only lanes, the branch pass and the cost lines (decisions 1, 2, 5, 6). It never runs fx-plan or fx-brainstorm, so fewer tasks and fewer owner stops (decisions 3, 4) are shown by the cost lines of the next real plan written with the new lanes. The design's Defeater is checked at task 08 on what the fixture can measure.
