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
| C1 | | | | | | | | |
| C2 | | | | | | | | |
| C3 | | | | | | | | |
| C4 | | | | | | | | |
| C5 | | | | | | | | |

## Lens arm

| Run | Paths clean | Findings | G1 | G2 | G3 | G4 | G5 | G6 |
|---|---|---|---|---|---|---|---|---|
| L1 | | | | | | | | |
| L2 | | | | | | | | |
| L3 | | | | | | | | |
| L4 | | | | | | | | |
| L5 | | | | | | | | |

## Per-group result

Decision rule, pre-registered: the lens keeps a group if the lens arm finds it
in at least 4 of 5 runs and the control arm finds it in at most 2 of 5. A group
the control finds in 3 or more runs is dropped.

| # | Control | Lens | Decision |
|---|---|---|---|
| 1 | /5 | /5 | |
| 2 | /5 | /5 | |
| 3 | /5 | /5 | |
| 4 | /5 | /5 | |
| 5 | /5 | /5 | |
| 6 | /5 | /5 | |

## Calls and their evidence

One line per scored cell as runs arrive: run, group, found or not, and the
finding number or quoted phrase it rests on.
