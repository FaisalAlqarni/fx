# Task 05 fix round 5: scoped re-review of `85901b9..fca4cf9`

One reviewer, read-only, no subagents, no run against the fixture. Scope is the
single commit `fca4cf9` (parent `85901b9`), three files:
`agents/fx-lens-pipeline.md`, `tests/lens-pipeline/KEY.md`,
`tests/lens-pipeline/README.md`. Line numbers are at `fca4cf9`, which equals the
working tree for all three paths.

## Checks run

```
read   tasks/05-lens-pipeline.md, findings/05-lens-pipeline-findings.md
read   state.md Ruling Z (:2151-2192) and Ruling AB (:2425-2445)
read   report ## Round 5, the diff file, the three changed files in full
read   fixture/worker.js, fixture/schema.sql, briefs/lens.md
read   measurement-task05.md :1-8, :42-46 (scoring rule), :131-138 (disclosures)
read   state.md :1210-1235 (pre-registered protocol), docs/adr/0011
ran    git diff --quiet d496d1e fca4cf9 -- tests/lens-pipeline/fixture     exit 0
ran    git diff --quiet fca4cf9 -- tests/lens-pipeline/fixture             exit 0
ran    git diff --quiet fca4cf9 -- agents/fx-lens-pipeline.md tests/lens-pipeline   exit 0
ran    KEY.md rows, grep '^| ' | sha256sum:
         d496d1e   76ff72b9ba2f6141483f3ab30efa6b20f7528344524d79b70636f80929a9206f
         85901b9   76ff72b9ba2f6141483f3ab30efa6b20f7528344524d79b70636f80929a9206f
         fca4cf9   76ff72b9ba2f6141483f3ab30efa6b20f7528344524d79b70636f80929a9206f
         worktree  76ff72b9ba2f6141483f3ab30efa6b20f7528344524d79b70636f80929a9206f
ran    KEY.md rows 1 to 6 only, grep '^| [1-6] |': 6 rows, bdb0d7f1... at d496d1e,
         fca4cf9 and worktree, identical
ran    git show --stat fca4cf9: parent 85901b9, three files, 30+/26-
ran    trailer grep on the fca4cf9 message: 0
ran    python3 scripts/check-manifest                                      exit 0, ./agents/ 6 files, correctly undeclared
ran    python3 scripts/check-prose on the three changed files              exit 0
ran    grep U+2013/U+2014 on the three changed files                       exit 1, none
ran    grep -i rescue|re-raise|rethrow|raise|except|catch|sidekiq|ruby|node|javascript|python|cron
         on the lens: only cron, at :24, :54, :92
ran    grep Ceded|cession across agents, skills, references, commands, tests, docs/adr   exit 1
ran    same grep across docs/plans, excluding findings, state.md and the record          no lines
```

Not run: `scripts/check-all` (told not to). No agent dispatched.

## Finding verdicts

1. **Important 1, `KEY.md` cites the evidence without the provisional keep:
   ADDRESSED.** `tests/lens-pipeline/KEY.md:17-20`, "The keep is provisional:
   the control omitted the broad reviewer branch review also dispatches, which
   checks scalability, so row 6's result rests on an incomplete control." Same
   reason as `README.md:43-46` and disclosure 1 (`measurement-task05.md:133`).
2. **Important 2, the `Ceded:` block double-reports other passes: ADDRESSED.**
   Every site the review named is changed: scope `agents/fx-lens-pipeline.md:44-45`;
   the one-line-per-ceded-defect instruction deleted (Ceding rules now end at
   `:87`); `:106` "Findings only, worst first."; template `:108-114` has no
   `Ceded:` lines; `:129-130` has no omit sentence; red flag `:134` "Delete it.";
   `README.md:50-52`; `KEY.md:14-15` "it should not report them". No
   `Ceded`/`cession` string remains anywhere in the repo's skills, agents,
   references, tests or task docs. The smoke run (report, Round 5) returned 2
   findings and no ceded lines, against 13 in round 4.
3. **Minor 2, `rescue`/`re-raise` in the body: ADDRESSED.**
   `agents/fx-lens-pipeline.md:79-80`, "an error handler that neither passes the
   error on nor sends the work to a dead-letter path". Grep of the lens for
   error-handling keywords returns nothing.
4. **Minor 3, enqueue inside a transaction has no named owner: ADDRESSED.**
   `agents/fx-lens-pipeline.md:77-78`, "Work enqueued inside a transaction that
   can roll back belongs to `fx-lens-database`", matching
   `agents/fx-lens-database.md:78-79`. "An open transaction" stays at `:87` as
   the separate defect.
5. **Minor 4, README and KEY disagree on `schema.sql`: ADDRESSED.**
   `README.md:50-52` "reports anything about `schema.sql`" and `KEY.md:40-41`
   "reports nothing about this file" now say the same thing. The one wording
   they share still has two readings on the smoke run's line; that is new
   Minor 1 below, not this finding reopened.
6. **Minor 5, README overstates the control and the dispatch: ADDRESSED.**
   `README.md:35-37`: the correctness pass stood in for `/code-review`, and no
   lens run dispatched `fx-lens-pipeline` by name. Both match the protocol at
   `state.md:1218-1220` and `:1229-1231`; `measurement-task05.md:3-4` names that
   protocol, so "the protocol that record follows" resolves.
7. **Minor 6, disclosures 2 and 4 absent from README: ADDRESSED.**
   `README.md:38-41` carries both, matching `measurement-task05.md:134` (every
   control pass that found fairness cited line 22) and `:136` (the column held
   for group 6, failed for groups 1 to 5). The quoted column name matches the
   `KEY.md` header.
8. **Minor 7, fixture-shaped red flag: ADDRESSED.**
   `agents/fx-lens-pipeline.md:135`, "You reported on a file that adds no work
   to a queue." Its reach is judged under Named risk 4.
9. **Ruling Z item 5, the `schema.sql` criterion binds and the key is aligned:
   ADDRESSED.** `KEY.md:40-41` and `README.md:50-52` state it; the lens has no
   channel left for a cession. The smoke run's one line naming the file is
   judged under Named risk 1.

## New breakage in the fix diff

**Minor 1. `tests/lens-pipeline/README.md:50-52` and `KEY.md:40-41`: the oracle
still has two readings, now within one wording.** The smoke run printed
"`schema.sql` adds no work to a queue, so there are no findings for it." Read
literally, "reports anything about `schema.sql`" counts that as a regression.
Read by purpose, it passes. Ruling AB (`state.md:2425-2441`) picks the second
reading, but it is in the ledger, and the next person using the fixture reads
README. The regression clause for rows 1 to 5 has the same gap. Smoke finding 2
cites `worker.js:24`, one of row 1's lines. Only the scoring rule at
`measurement-task05.md:44-46` says a finding on the right line with a different
mechanism does not count, and the regression paragraph does not point to that
rule. Consequence: one run of a provisional lens can be scored differently by
two scorers. No production effect, no effect on the measurement recorded at
`d496d1e`, and Ruling AB settles the current run. That makes it Minor. Fix, one
clause in the regression paragraph: a finding, a cession, or any claim about
what `schema.sql` contains is a regression; a line saying it adds no work to a
queue is not. A row counts by the record's scoring rule, mechanism and not
line alone.

No Critical or Important breakage.

## Named risks

1. **The smoke run's `schema.sql` line: the ruling holds on outcome. Its stated
   reason overreaches, and the oracle has two readings (Minor 1 above).** The
   task gives the control one purpose: prove the lens cedes and "stays silent on
   a schema-only" file (task 05 Risks; `README.md:9-10`). The line names no
   defect and no owner, and it says nothing about indexes, constraints or
   columns, so that proof holds. The reason Ruling AB gives is weaker than it
   says. `agents/fx-lens-pipeline.md:129-130` asks for a one-line statement
   only when nothing in the whole diff or file set adds work to a queue. This
   file set contains `worker.js`, so the instruction did not apply, and the run
   extended it to a single file on its own. Also, "adds no work to a queue" is a
   claim about what the file does, so Ruling AB's own boundary ("any claim
   about what the file contains is still a regression") has the same two
   readings. Severity by consequence: Minor, as above. It is one scoring line
   on one fixture, and a misread in either direction is visible and cheap to
   correct. It is not Important, so it does not send the task to the user.
2. **Finding 2 at `worker.js:24`: it names depth, not blocking. The
   implementer's scoring is right.** The mechanism sentences are "also never
   reads queue depth" and "no producer onto `sends` checks the backlog, so no
   limit on any single producer would hold the queue". It never mentions a
   shared lane for unlike workloads, priority, or FIFO order. The consequence
   ("receipts join the backlog finding 1 builds, so a message meant to arrive
   right after checkout arrives after it stops mattering") is the lens's own
   late-arrival outcome from `agents/fx-lens-pipeline.md:67-68`, and it depends
   on backlog depth. Under `measurement-task05.md:44-46` it is not row 1. It
   leans on the line 22 comment (disclosure 2), which is a caveat and not a
   miss.
3. **The three departures: each does what its finding needed.**
   (a) Scope, `:44-45`: "Your output reports this hunt group alone" states the
   output target positively. Together with `:106` and the `:134` red flag, it
   removes the second report. The smoke run shows 0 ceded lines, down from 13.
   "The pass named under Ceding rules" still implies every other defect has a
   named owner, and auth and view markup (`:43-44`) do not. The same implication
   was in the pre-fix wording, and with no output channel it has no effect.
   (b) `:79-80`: no keyword, and the meaning is kept: the error is neither
   propagated nor dead-lettered. Avoiding "rethrow" was right, since that word
   is itself a keyword in several languages.
   (c) `README.md:35-41`: Ruling Z item 3 asked for one sentence per point and
   listed four points, so four sentences are compliance, not a departure. All
   four are accurate against their sources, as listed under verdicts 6 and 7.
4. **The new red flag `:135`: low risk of suppressing a scheduler or caller
   finding. No finding.** The lens's own wording counts schedulers and callers
   as adding work. `:91-92` names "scheduled and cron entry points" among the
   places "work enters a queue". `:52-53` puts the missing check "in the caller
   or scheduler that decides when it runs". `:96-97` sends the lens to every
   caller of the enqueue helper. The flag is only a problem under a literal
   reading in which "adds work" means containing an enqueue call. The likely
   case is a diff that changes only a schedule, such as a higher frequency,
   while the producer stays outside the diff. Even there, the probable effect is
   citing the producer's line, not dropping the finding. `:129-130` uses the
   same phrase and is not new. If tightening is wanted, "a file on no path that
   adds work to a queue" closes it. It was not exercised by this fixture.
5. **"cron" in the body: a generic scheduling term, not a stack. No finding, and
   outside the diff.** It appears at `:24`, `:54` and `:92`, none of them
   changed lines. Each time it sits beside "scheduled" as an example of time-based
   triggering, which cron expressions cover across operating systems, cloud
   schedulers and CI. It names no framework, language or file extension (task 05
   criterion; `docs/adr/0011`). It is not a closed list that leaves a reader off
   it.
6. **Record integrity: confirmed, ran.** The fixture is unchanged from
   `d496d1e` to `fca4cf9` and the worktree (both exit 0). The `KEY.md` table
   rows hash `76ff72b9...` at `d496d1e`, `85901b9`, `fca4cf9` and in the
   worktree. The six keyed rows alone hash identically at `d496d1e` and
   `fca4cf9`. The `fca4cf9` message has no trailer.

## Out-of-scope observations

- `agents/fx-lens-pipeline.md:76-78` cede per-record queries and enqueue inside
  a transaction to `fx-lens-database`. That lens's triggers
  (`agents/fx-lens-database.md:3-11`) fire on migrations, SQL files, models and
  query chains, not on a worker-only diff that opens a transaction. Now that the
  cession channel is gone, a worker-only diff drops that defect from this lens,
  and the named owner may not be dispatched. The first bullet had the same gap
  before this round, and Ruling Z item 2 chose the owner. It does not block;
  it belongs with Ruling AA's gap and the deferred Minor 8.
- Smoke finding 2 is tagged Important, but `:119-122` defines Important as "a
  bound exists but does not hold". In this fixture no producer checks depth.
  The severity tiers are untouched lines, and this fits the deferred Minor 9.

## Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage. One
new Minor: the README and key regression oracle has two readings on a
no-findings line and on a finding cited at a row's line.
