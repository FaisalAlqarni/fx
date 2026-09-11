# Task 06 findings: ADR 0013, ADR 0014, ADR 0008's added line

Base `eb4bd91`, head `cbfb8eb`. Single commit, no trailer, three files, 128
insertions, 0 deletions, confirmed with `git diff --numstat` directly against
the checkout (matches the report and the diff package exactly).

## Spec Compliance

- ✅ `docs/adr/0013-descriptions-name-categories-not-stacks.md` created; states the rule at 0013:8 to 15.
- ✅ 0013:3 to 6 cites ADR 0003 and ADR 0011 by file name, one clause each, restates no table or example.
- ✅ 0013:19 to 26 names `fx-lens-database`, `fx-lens-security`, `fx-lens-a11y`, `fx-lens-silent-failure` as exceptions and gives the per-lens-measurement reason and the bundling reason. All four agent files confirmed on disk under `agents/`.
- ✅ 0013:19 to 32 follows ADR 0012's shape (bold lead sentence naming the exclusion, then the reason), matching the pattern at `docs/adr/0012-what-fx-deliberately-does-not-cover.md:5,11,15,19`.
- ✅ 0013:28 to 32 states what a future author does, citing ADR 0010 (which exists on disk).
- ✅ 0013:36 to 45 records the stack-profile rule **as the four skill lines actually show it**, not as the task file's stronger, ledger-corrected wording. Verified against the checkout directly: `skills/fx-implement/SKILL.md:216` and `skills/fx-tdd/SKILL.md:26` both load "for each entry in `stacks`"; `skills/fx-design/SKILL.md:147` and `skills/fx-review/SKILL.md:123` both load `web.md` on their own conditions, with no reference to `stacks`. This satisfies the ledger's correction at state.md:2065 to 2071, not the task file's original wording at task:52.
- ✅ `docs/adr/0014-the-app-layer-gap-gets-its-own-lens.md` created.
- ✅ 0014:12 to 13 quotes ADR 0008's recommendation verbatim (checked against `0008-no-performance-lens.md:22 to 24` in the base tree).
- ✅ 0014:15 to 20 gives the overriding reason (schema-shaped triggers would not fire on a worker or queue configuration).
- ✅ 0014:72 to 74 records the second-dispatch cost and states branch mode only, confirmed against `skills/fx-review/SKILL.md:95` (the lens's row is the only one marked "branch" and not "task, branch").
- ✅ ADR 0014 records Ruling U's measurement, the pre-registered rule, the per-group result and the narrowing (0014:24 to 45), the provisional status and its reason (0014:47 to 53, quoting the omission of the broad reviewer that checks scalability, matching `skills/fx-review/reviewer-prompt.md:88`), all four of Ruling Z's qualifications (0014:57 to 68), and Ruling AA's audit gap (0014:75 to 82). Every one of these was checked against `state.md`'s Ruling U, Ruling Z and Ruling AA blocks and matches in substance.
- ✅ every number in ADR 0014 checked line by line against `measurement-task05.md` (see the numbers table below): all match.
- ✅ 0014 cites the measurement record and `tests/lens-pipeline/README.md` rather than reproducing any table (0014:35 to 37).
- ❌ **`docs/adr/0008-no-performance-lens.md:25`, the added line, is not an accurate description of what changed.** See Important 1 below.
- ✅ `docs/adr/0008-no-performance-lens.md` gains exactly one line, nothing removed: `git diff --numstat eb4bd91 cbfb8eb -- docs/adr/0008-no-performance-lens.md` reads `1  0`, run directly, not taken from the report.
- ✅ `python3 scripts/check-prose docs/adr/0013-...md docs/adr/0014-...md docs/adr/0008-...md` exits 0, run directly: "OK: no dashes, no stock vocabulary, parentheses balanced".
- ⚠️ `scripts/check-all` exits 0: the review brief forbids running it (a writer is live), so this is taken on the report's word only, unverified.

### Every number in ADR 0014, checked directly against `measurement-task05.md`

| ADR 0014 | Claim | Source line(s) | Match |
|---|---|---|---|
| 0014:3 | "fifth lens" | `skills/fx-review/SKILL.md:88-95`, `fx-lens-pipeline` is the fifth table row | exact |
| 0014:25 to 26 | five lens runs against five control runs | measurement-task05.md:14-22 (L1-L5, C1-C5) | exact |
| 0014:28 to 30 | keep at >= 4 of 5 lens, <= 2 of 5 control; drop at >= 3 of 5 control | measurement-task05.md:76-78 | verbatim |
| 0014:32 | all six groups in 5 of 5 lens runs | measurement-task05.md's lens-arm table, all six columns 5/5 | exact |
| 0014:32 to 34 | control: groups 1-4 5/5, group 5 "3/5 strict, 5/5 lenient", group 6 0/5 | measurement-task05.md's per-group result table | exact |
| 0014:34 | "five of six groups were dropped" | same table's Decision column, five "dropped", one "kept, provisionally" | exact |
| 0014:38 | "one fixture and five runs per arm" | measurement-task05.md's disclosure 6, "One fixture, five runs per arm" | exact |
| 0014:64 to 66 | group 1's drop weakest-backed, every control pass that found it cited a fixture comment | disclosure 2 | exact |
| 0014:67 to 68 | the key's claim held for row 6 alone, failed for rows 1 to 5 | disclosure 4 | exact |

No number in ADR 0014 was found to diverge from `measurement-task05.md`.

## Strengths

- The measurement content in ADR 0014 is accurate to the number, checked line by line against `measurement-task05.md`; nothing is rounded, reordered or softened.
- ADR 0013 correctly used the ledger's corrected stack-profile wording instead of the task file's stronger, wrong claim, and it holds up: re-checked directly against the four skill lines rather than taken from the report, and each of the two loading rules is stated exactly as the files show it.
- The implementer caught that the task's own RED command passes vacuously (`check-prose` on a nonexistent path exits 0), diagnosed the cause (`rglob` over a missing directory yields nothing), and built a substitute RED whose failure is directly caused by the missing ADR file (`test -f` fails first, before `check-prose` or the ADR 0008 grep ever runs). This is a valid RED: rerunning it confirms the failure traces to the missing file, not to an unrelated cause.
- ADR 0008's added line is proven additions-only with `git diff --numstat`, matching the task's own idempotency and non-destructive requirements.
- No trailer on the commit, confirmed directly with `git log -1 --format=%B | grep -i co-authored`.
- `check-prose` passes on all three files, confirmed directly, not taken from the report.

## Issues

### Critical

None.

### Important

1. **`docs/adr/0008-no-performance-lens.md:25` contradicts `docs/adr/0014-the-app-layer-gap-gets-its-own-lens.md:43 to 45`, and its own framing does not match its source.** Plan-mandated: named risk 2 in this review's brief asks exactly this question.

   The added line reads: "queue backpressure got its own lens, `fx-lens-pipeline`, instead of a section in `fx-lens-database`'s brief, and **the other items listed here stay uncovered**."

   That sentence only parses if "queue backpressure" is itself one of "the items listed here." But `0008-no-performance-lens.md:19` lists exactly six items: "jobs enqueued per record, N+1 inside view partials, missing batched iteration on large scans, cache-key churn, EF Core `AsNoTracking` and client-side evaluation." None of them is named "queue backpressure," and "unbounded enqueue outrunning consumers" (the lens's one surviving hunt group) is not a restatement of any of the six either.

   ADR 0014 itself is explicit that the shipped lens does not cover any of them: "The narrowed lens hunts none of the items `0008-no-performance-lens.md` listed by name: a job enqueued per record is an unbatched loop, which it cedes, and the rest stay where that record left them" (0014:43 to 45). The lens's own ceding rules in `agents/fx-lens-pipeline.md:87` confirm "an unbatched loop" is handed to the correctness and adversarial reviewers, not hunted.

   So read side by side: 0008's added line implies one named item (framed as "queue backpressure") now has coverage while "the other" named items stay uncovered, and 0014 says plainly that none of the named items have coverage. The two records disagree about what changed. "Superseded in part" is not, on this evidence, an accurate description of ADR 0008's recommendation: nothing 0008 actually enumerated was addressed; a related but distinct concern (backpressure) that 0008 never named got a lens instead, while every item 0008 did name is exactly as uncovered as before task 06.

   Fix: the line needs to stop implying "queue backpressure" was one of 0008's enumerated items, and say plainly that all six of 0008's named items remain uncovered, e.g. "queue backpressure, a concern this record did not name, got its own lens ... and every item this record does name stays uncovered." That also brings it into agreement with 0014:43 to 45.

### Minor

1. **`docs/adr/0008-no-performance-lens.md:25` is a single unwrapped line of 229 characters**, against every other line in the file wrapping at 47 to 81 characters (checked directly, `awk '{print NR": "length}'`). No gate enforces wrap width (`scripts/check-prose` has no line-length check), so this has no functional consequence; it is a readability and convention break in a file that otherwise wraps consistently. By consequence alone this does not block anything, so Minor rather than Important.

## Observations outside this task

- **`scripts/check-prose` passes vacuously on a path that does not exist**, which is what made the task's own step 1 and step 2 not a real RED. This is the gate's own fail-open behaviour, not a defect in task 06's three files, and the report already surfaces it as a concern for the controller. The ledger independently reproduced the same finding and is carrying it to the completion report.

## Cannot verify from diff

- ⚠️ `scripts/check-all` exit 0, per the report only; the review brief forbids running it while a writer is live elsewhere in the checkout.
- ⚠️ ADR 0014's Phase 3 claims (0014:75 to 82, that Phase 3 dispatches only this lens and `fx-architecture`, and that neither runs the correctness or adversarial passes) describe behaviour task 08 has not yet built. Every clause traces to something already on disk, either the approved design (`docs/plans/2026-09-11-fx-audit/design.md:187-189, 216-220`) or Ruling AA in the ledger, so nothing here is invented. It still cannot be checked against code, because task 08's command does not exist yet in this diff.
- ⚠️ ADR 0014's claim that "`/code-review` ... a dispatched agent cannot invoke" (0014:57 to 59) is sourced, not asserted from nothing: `state.md:1219-1220`'s pre-registered protocol says "real branch mode runs the built-in `/code-review`, and a subagent cannot invoke a slash command," and `tests/lens-pipeline/README.md:35-36` carries the same disclosure forward. Named as a risk to judge rather than answer in advance; recorded here as sourced, confirmed by direct read of both files.

## Assessment

**Task quality:** Needs fixes
**Reasoning:** One Important, plan-mandated defect: ADR 0008's added line misdescribes what task 06 actually shipped, and directly disagrees with ADR 0014's own honest statement that the narrowed lens covers none of ADR 0008's named items. Everything else checked, every number in ADR 0014, the stack-profile rule against all four skill lines, the citation shape, the RED substitution and the commit hygiene, holds up under direct verification against the checkout.
