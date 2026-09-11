# Task 05 measurement record

Scores for the ten blind runs the user chose under Ruling Q. The protocol is the
one pre-registered in `state.md`, with the two amendments recorded there before
any data: every arm reads a neutrally named copy of the fixture, and scoring uses
the key at the hygiene commit from Ruling R.

**Key commit:** `d496d1e`, checked row by row against the code by the controller before any run.
**Subject copy:** `.fx/2026-09-11-fx-audit/subject/`, rebuilt from that commit.
**Briefs:** `.fx/2026-09-11-fx-audit/briefs/`, identical for every run of an arm.

## Run mapping, fixed at dispatch

| Run labels | Arm | Brief |
|---|---|---|
| 01 to 05 | lens, runs L1 to L5 | `lens.md` |
| 06 to 10 | control correctness pass, runs C1 to C5 | `correctness.md` |
| 11 to 15 | control standards pass, runs C1 to C5 | `standards.md` |
| 16 to 20 | control adversarial pass, runs C1 to C5 | `adversarial.md`, as `fx-devils-advocate` |

Labels 06, 11 and 16 together form control run C1; 07, 12 and 17 form C2; and
so on through C5.

A finding naming two overlapping cron runs both enqueueing one campaign does not
count as group 6, because that race is unscored issue 7 in the key with a
different mechanism.

## Hunt groups scored

Fixed by Ruling R. The hygiene round may not change them.

| # | Group |
|---|---|
| 1 | Fairness and head-of-line blocking |
| 2 | Delivery semantics and idempotency |
| 3 | Poison messages |
| 4 | Visibility timeout shorter than processing time |
| 5 | Retry storms with no jitter |
| 6 | Unbounded enqueue outrunning consumers |

## Scoring rule

A group is found in a run when any finding in that run names the group's keyed
mechanism at or near its keyed line. A finding at the right line naming a
different mechanism does not count. Every call below cites the finding it rests
on, or says none.

A run whose path list touches anything outside its brief, the lens file where
applicable, and the subject directory is void and re-run.

## Control arm

Each run is three separate passes, findings unioned: correctness, standards,
adversarial.

| Run | Paths clean | Findings | G1 | G2 | G3 | G4 | G5 | G6 |
|---|---|---|---|---|---|---|---|---|
| C1 | yes | 36 | found | found | found | found | found | no |
| C2 | yes | 38 | found | found | found | found | no, lenient found | no |
| C3 | yes | 37 | found | found | found | found | found | no |
| C4 | yes | 40 | found | found | found | found | found | no |
| C5 | yes | 35 | found | found | found | found | no, lenient found | no |

## Lens arm

| Run | Paths clean | Findings | G1 | G2 | G3 | G4 | G5 | G6 |
|---|---|---|---|---|---|---|---|---|
| L1 | yes | 8 | found | found | found | found | found | found |
| L2 | yes | 7 | found | found | found | found | found | found |
| L3 | yes | 7 | found | found | found | found | found | found |
| L4 | yes | 7 | found | found | found | found | found | found |
| L5 | yes | 7 | found | found | found | found | found | found |

## Per-group result

Decision rule, pre-registered: the lens keeps a group if the lens arm finds it
in at least 4 of 5 runs and the control arm finds it in at most 2 of 5. A group
the control finds in 3 or more runs is dropped.

| # | Control | Lens | Decision |
|---|---|---|---|
| 1 | 5/5 | 5/5 | dropped |
| 2 | 5/5 | 5/5 | dropped |
| 3 | 5/5 | 5/5 | dropped |
| 4 | 5/5 | 5/5 | dropped |
| 5 | 3/5 strict, 5/5 lenient | 5/5 | dropped under both readings |
| 6 | 0/5 | 5/5 | kept, provisionally, see disclosure 1 |

## Calls and their evidence

One line per scored cell as runs arrive: run, group, found or not, and the
finding number or quoted phrase it rests on.

### Lens arm, runs 01 to 05

Every path list clean: brief, lens file, subject listing, the two subject files.

- L1, run 01: G1 found, findings 5 and 6. G2 found, finding 2. G3 found, finding 4. G4 found, finding 1. G5 found, finding 7. G6 found, finding 8. Finding 3 is the overlapping-run race, not G6.
- L2, run 02: G1 found, finding 5. G2 found, finding 2. G3 found, finding 4. G4 found, finding 1. G5 found, finding 6. G6 found, finding 7. Finding 3 is the race, not G6.
- L3, run 03: G1 found, finding 5. G2 found, finding 2. G3 found, finding 4. G4 found, finding 1. G5 found, finding 6. G6 found, finding 7. Finding 3 is the race, not G6.
- L4, run 04: G1 found, finding 5. G2 found, finding 2. G3 found, finding 3. G4 found, finding 1. G5 found, finding 6. G6 found, finding 7. Finding 4 is the race, not G6.
- L5, run 05: G1 found, finding 5. G2 found, finding 2. G3 found, finding 3. G4 found, finding 1. G5 found, finding 6. G6 found, finding 7. Finding 4 is the race, not G6.

### Control passes received so far

Every path list clean: brief, subject listing, the two subject files.

- Run 10, correctness, C5: G1 found, finding 9, receipts wait behind a large campaign on one queue. G2 found, finding 2, never checks whether the recipient was already sent to and resends on redelivery. G3 found, finding 7, every failure requeued forever with no limit and no dead letter. G4 found, finding 1, a 30s lease against a 60s provider call. G5 not found: finding 7's "no backoff" is about requeue delay, not about a fixed retry delay lacking jitter. G6 not found: finding 4 is the overlapping-run race and finding 12 is memory and unbatched pushes.
- Run 11, standards, C1: G4 found under Ruling S, named without a line as a skipped correctness issue. No other group.
- Run 12, standards, C2: G4 found under Ruling S, named with its two values as outside its lane. "runScheduledCampaigns also has no idempotency" is the overlapping-run race, not scored. No other group.
- Run 13, standards, C3: no group.
- Run 14, standards, C4: G4 found under Ruling S, named in its outside-lane note. No other group.
- Run 15, standards, C5: no group.
- Run 16, adversarial, C1: G1 found, finding 8, receipts share one FIFO queue with bulk campaigns. G2 found, finding 3, no idempotency key or sent check before sending, so a requeued success resends. G3 found, finding 2, requeued with no counter, delay or dead letter, looping forever. G4 found, finding 1, the lock runs out mid-send. G5 found, finding 11, a fixed 2s wait with no backoff or jitter so workers retry in lockstep. G6 not found: finding 6 is the overlapping-run race.

- Run 06, correctness, C1: G1 found, finding 8, a large campaign sits ahead of every receipt on the shared queue. G2 found, finding 2, no dedupe key and nothing records already sent, so a requeue resends. G3 found, finding 5, every failure requeued forever with no dead letter or delivery count. G4 found, finding 1. G5 strict no, lenient found: finding 13 names a fixed 2 s delay that ignores Retry-After, but neither jitter nor retries in lockstep. G6 no: finding 4 is the overlapping-run race.
- Run 07, correctness, C2: G1 found, finding 9. G2 found, finding 2. G3 found, finding 5. G4 found, finding 1. G5 strict no, lenient found, finding 12. G6 no: finding 3 is the race.
- Run 08, correctness, C3: G1 found, finding 9. G2 found, finding 4. G3 found, finding 5. G4 found, finding 1. G5 strict no, lenient found, finding 14. G6 no: finding 2 is the race and finding 11 is memory and push speed.
- Run 09, correctness, C4: G1 found, finding 9. G2 found, finding 2. G3 found, finding 6. G4 found, finding 1. G5 strict no, lenient found, finding 13. G6 no: finding 3 is the race and finding 16 is memory and push speed.
- Run 17, adversarial, C2: G1 found, finding 10. G2 found, finding 2. G3 found, finding 5. G4 found, finding 1. G5 no under either reading: finding 5 says requeue has no backoff, and no finding criticises the fixed retry delay. G6 no: finding 7 is the race and finding 9 is memory and push speed.
- Run 18, adversarial, C3: G1 found, finding 9. G2 found, findings 1 and 3, no idempotency key plus a resend after a failed write. G3 found, finding 2. G4 found, finding 1. G5 strict found, finding 12, no jitter and workers in lockstep. G6 no: finding 8 is the race and finding 14 is memory and push speed.
- Run 19, adversarial, C4: G1 found, finding 9. G2 found, finding 2. G3 found, finding 3. G4 found, finding 1. G5 strict found, finding 10 names the missing jitter. G6 no: finding 6 is the race and finding 11 is memory and push speed.
- Run 20, adversarial, C5: G1 found, finding 8. G2 found, finding 2. G3 found, finding 7. G4 found, finding 1. G5 strict no, lenient found, finding 7 names the fixed 2 s delay. G6 no: finding 5 is the race and finding 12 is enqueue speed.

Every path list in all twenty runs is clean. No run is void.

## Readings of group 5

**Strict:** a finding names jitter, randomisation, or workers retrying in lockstep. **Lenient:** a finding also counts if it only criticises the fixed retry delay. The line was drawn while scoring, not before. The group is dropped under both, so the reading decides nothing.

## Disclosures

1. **The control omitted a pass that real branch review runs.** `fx-review` in branch mode also dispatches the broad reviewer from `reviewer-prompt.md`, on the top tier, and the pre-registered control did not include it. Groups 1 to 5 survive this, because the control found them without that pass. **Group 6's keep verdict is provisional**: that reviewer checks scalability explicitly and was never run.
2. **Group 1 was made visible by the fixture's own context.** Every control pass that found fairness cited the comment on line 22, "A single transactional email, sent right after checkout." The key claimed a queue-naive reader would miss group 1. With that comment present, the claim is falsified. Round 1's single control missed fairness on a fixture with no such comment.
3. **Ruling S decided nothing.** Correctness and adversarial passes found group 4 in all five runs, so the standards passes' unlined mentions did not change any verdict.
4. **The key's falsifiable column.** For each group it claimed a reader without queue knowledge would plausibly miss the defect. That held for group 6 and failed for groups 1 to 5.
5. **Noise.** The lens returned 7 or 8 findings per run. The control returned 35 to 40 per run across its three passes; standards passes use bullets, so their share of that is approximate.
6. **Scope.** One fixture, five runs per arm. Nothing here generalises past this fixture without more of both.
