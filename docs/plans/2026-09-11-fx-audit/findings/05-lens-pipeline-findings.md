# Task 05 review: `fx-lens-pipeline`, path-scoped `7d39c0b..fe48167`

Reviewed in one pass by one reviewer, no subagents. Ruling B in force: the
fixture's seeded defects are input, not defects, and nothing below recommends
changing `fixture/` or the six rows of `KEY.md`.

## Checks run

```
python3 scripts/check-manifest                         exit 0, ./agents/ holds 6 files, correctly undeclared
python3 scripts/check-prose on the lens, KEY, README,
  and skills/fx-review/SKILL.md                         exit 0 on all four
grep for U+2013 and U+2014 across all six paths         exit 1, none
agents/fx-lens-pipeline.md at fe48167 vs working tree   identical
git diff --quiet d496d1e fe48167 -- fixture             exit 0, fixture unchanged since the scored commit
KEY.md table rows, d496d1e vs fe48167, sha256           76ff72b9... both, byte-identical
diff -r .fx/.../subject tests/lens-pipeline/fixture     exit 0, the smoke run read the scored fixture
trailer grep on the six commit messages                 0 on each
.fx/2026-09-11-fx-audit/briefs/lens.md                  read: it asks for the lens format and nothing about cessions
```

Not run: `scripts/check-all`, because a writer is live under `references/`. No
agent was dispatched. The diff adds no document containing commands, so there
was nothing to run in a scratch directory.

Named risks checked outside the diff, one focused check each: the four existing
lenses' Scope, Output and red flags (shape and ceding parity);
`skills/fx-review/SKILL.md` sections 5 to 7 (how lens output is aggregated);
`skills/fx-review/reviewer-prompt.md:88` (whether the omitted broad reviewer
checks scalability); `design.md:217-232` and `tasks/08-fx-audit-command.md:65-66`
(which passes run beside this lens in the audit); `references/audit-template.md:147-150`
(what the audit expects of lens output); `scripts/check-paths:18` (what counts
as a reference citation); a grep of `agents/`, `skills/`, `references/` for
existing backlog or backpressure guidance (none beyond an unrelated line in
`references/vocab/good-tests.md:234`).

## Spec Compliance

Issues found: one missing requirement, one extra.

- **Missing:** `tests/lens-pipeline/KEY.md:9-17` cites the measurement and does
  not say the keep is provisional, violating Ruling U. Important 1.
- **Extra:** the `Ceded:` output block, `agents/fx-lens-pipeline.md:87-88`,
  `:107`, `:116-117`, `:134`, `:138-139`. Unasked, and it reproduces the
  task's own named risk. Important 2.
- **Files, against the task's list of five:** `agents/fx-lens-pipeline.md`
  created; `fixture/worker.js` and `fixture/schema.sql` created;
  `tests/lens-pipeline/README.md` created; `skills/fx-review/SKILL.md` modified
  in section 2 only. One file beyond the list, `tests/lens-pipeline/KEY.md`,
  which Ruling O requires (`state.md:960-962`, "The labels move to a key file
  outside the fixture").

### Cannot verify from the diff

1. **Named dispatch.** Every run so far, the twenty measured and the one smoke
   run, read the lens through a brief given to a general-purpose agent. The
   frontmatter was never exercised: not `tools: Read, Grep, Glob, Bash` as a
   restriction, not `model: opus` as a pin, not the description as a trigger.
   The global constraint names two routes, the plugin directory flag or a
   bumped version, and the measurement used neither. The controller should
   decide whether a plugin directory run was possible, and task 08 will meet
   the same wall (`state.md:978-980`).
2. **The audit has no owner for groups 1 to 5.** `agents/fx-lens-pipeline.md:79-80`
   cedes them to "the correctness and adversarial reviewers that branch review
   also runs". In the audit, Phase 3 dispatches only this lens and
   `fx-architecture` (`design.md:217-220`, `tasks/08-fx-audit-command.md:65-66`),
   so in file-set mode those passes do not exist. That is a consequence of
   Ruling U for task 08 and ADR 0014, not a wording defect this task can fix.
   The `Ceded:` block does not close it either: its lines carry no severity,
   and `references/audit-template.md:149-150` wants every lens finding to carry
   "the same file, line and verdict standard".
3. **`check-all` exit 0.** Claimed twice in the report (lines 880-887). The
   controller's verification table at `state.md:1968-1975` does not list it,
   and I could not run it here.
4. **The smoke run itself.** Its output exists only in the git-ignored report
   (lines 830-851). I confirmed the brief and subject it names are the scored
   ones; I could not confirm the output.
5. **Criterion "The lens run reports nothing about `schema.sql`".** No ruling
   replaced it. `KEY.md:37-38` loosened it to "at most, a one-line cession",
   and the controller accepted that at `state.md:1066` and `state.md:1979-1980`,
   which is an acceptance and not a ruling. The smoke run's `schema.sql:2`
   ceded line makes three separate claims about the file. The controller should
   say whether the original criterion still binds.

### Which acceptance criteria each ruling replaced

- Read-only tools: binds, unchanged. Met at `agents/fx-lens-pipeline.md:11`.
- `model: opus` pinned: binds, unchanged. Met at `:12`.
- Description as a trigger list naming queues, workers, retry and backoff, dead
  letters, schedulers, batch dispatch, rate limiters, pools and outbox tables:
  the list is replaced by Ruling U as carried by the round 4 dispatch
  (`state.md:1599-1602`, `state.md:1819-1820`, "narrow the hunt list and
  triggers to group 6"), which supersedes Ruling Q's "keeping ... its triggers"
  (`state.md:1128-1130`). "Names no framework, language or file extension"
  still binds and is met in the description, `:3-10`.
- Stakes clause naming machinery: binds. Met at `:7-10`.
- All eight hunt groups: replaced by Ruling Q (narrowed to six queue-knowledge
  groups, re-seeded at `27339eb`), then by Ruling U (one group,
  `state.md:1599`). Met at `:47-72`.
- Three ceding rules: the database and silent-failure rules bind and are met at
  `:76-78`. The third, work enqueued inside a transaction reported here and
  shared with the database lens, is replaced: transactional safety left the
  hunt under Ruling Q's re-seed. See Minor 3 for where that case now lands.
- Diff or file set, a file set treated as the change: binds. Met at `:32-38`.
- Red-flags section about its own output: binds. Met at `:136-149`; content
  judged in Important 2 and Minor 7.
- Mode column with this lens the only `branch` row: binds. Met at
  `skills/fx-review/SKILL.md:89-95`.
- Performance paragraph amended: binds, with "app-layer throughput belongs to
  this one" narrowed by Ruling U to unbounded enqueue. Met in form at
  `SKILL.md:97-102`; accuracy in Minor 1.
- `check-manifest` reports agents undeclared, not in `plugin.json`: binds. Met,
  run above.
- Control finds at most 2 of 8: replaced by Ruling O (strip and re-run,
  `state.md:956-972`), Ruling Q (five runs per arm, control as branch review's
  passes, `state.md:1131-1132`) and the pre-registered rule, control at most 2
  of 5 per group (`state.md:1244-1248`). Group 6 met at 0 of 5, provisional
  under Ruling U.
- Lens finds at least 6 of 8 by file and line: replaced by the pre-registered
  rule, lens at least 4 of 5 per group, then by Ruling U's single smoke run
  confirming group 6 (`state.md:1607-1609`). Reported met at `worker.js:28`;
  cannot be re-run here.
- Lens reports nothing about `schema.sql`: no ruling replaced it. Cannot-verify
  item 5.
- `check-all` exits 0: binds. Cannot-verify item 3.

Rulings B, O, P, Q, R, S and U otherwise hold: the fixture carries no comment
naming a defect (Ruling O); the key commit precedes the lens commit and the
fixture author did not measure (Ruling Q, `README.md:21-23`); the six rows and
the fixture are unchanged since `d496d1e` and every unkeyed issue carries a
decision (`KEY.md:72-129`, Ruling R); Ruling S affects only the record; Ruling
P was resolved by Q.

## Strengths

- The narrowing is clean. One hunt group, no residue of groups 1 to 5 in the
  hunt list, the severity tiers or the red flags. Every severity tier at
  `agents/fx-lens-pipeline.md:120-128` and red flags `:141-149` belong to
  unbounded enqueue.
- `:57-59`, "A run that marks its own work done so it is never picked up twice
  bounds duplicates, not depth", names exactly the confound Ruling R removed
  from the fixture (`state.md:1390-1395`), so the lens separates the two
  mechanisms instead of relying on the fixture to.
- The Method at `:92-100` traces backward to the caller and scheduler and
  across to every other producer onto the same queue. That is the reasoning a
  per-function read misses, and the red flag at `:144-145` checks it.
- The consequence paragraph at `:63-72` carries the failure chain into each
  finding rather than leaving "backlog grows" as the whole claim.
- The description names machinery only, no stack, and does not summarise the
  workflow. The body's vendor-neutral paragraph at `:23-26` holds with one
  exception, Minor 2.
- Shape matches the four existing lenses: frontmatter, announce line, Scope,
  Hunt list, Method, Output with a `markdown`-tagged template, severity
  tiers, "state the consequence, not the remedy", red flags about its own
  output. The Input and Ceding rules sections are the two departures, and both
  are task-mandated.
- `README.md:35-38` states the provisional status and the correct reason: the
  omitted pass is the broad reviewer, and `reviewer-prompt.md:88` does ask
  "Reasonable scalability and performance?".
- `README.md:27-32`'s numbers match `measurement-task05.md:80-87` exactly:
  rows 1 to 4 control 5 of 5, row 5 3 of 5 strict or 5 of 5 lenient, row 6
  0 of 5, lens 5 of 5 on all six.
- Record integrity was proven rather than asserted: row hash identical to
  `d496d1e`, fixture unchanged, subject copy identical.

## Issues

### Critical (Must Fix)

None.

### Important (Should Fix)

**1. `tests/lens-pipeline/KEY.md:9-17` cites the evidence without saying the keep is provisional.**

Ruling U, `state.md:1603-1604`, quoted:

```markdown
- **The keep is provisional**, and every place that cites the evidence says so:
  the control omitted the broad branch reviewer, which checks scalability.
```

The status section names the committed blind measurement, the scoring commit
and the path to `measurement-task05.md`, and says the lens "is expected to find
row 6 only". It never says the keep is provisional or why. `README.md:35-38`
does; `KEY.md` is the file a reader lands on to learn what the lens should
find, and it reads as a settled result. Of the four files in the diff, only
these two cite the measurement: the lens body and `SKILL.md` do not.

Fix: one sentence in the status section, for example "The keep is provisional:
the control omitted the broad reviewer branch review also dispatches, which
checks scalability, so row 6's result rests on an incomplete control."

**2. The `Ceded:` block turns the lens into a second full review with one-line output, which is the double report task 05's Risks names.**

Where: `agents/fx-lens-pipeline.md:44-45` ("Every other defect you notice goes
to the pass named under Ceding rules"), `:79-85` (ten defect kinds owned by the
correctness and adversarial passes), `:87-88` ("Each ceded defect gets one
line"), `:107`, `:116-117`, `:134`, `:138-139`.

What is wrong. Read together, those lines instruct the lens to report every
other defect it notices, one line each, in a fixed slot. The ceding list is not
a narrow boundary with one neighbouring lens: it hands over the whole scope of
two general passes. The task's Risks section says "a lens whose triggers
overlap an existing one buys two reports of one finding. The ceding rules go in
the body", meaning ceding exists to keep the second report out. This wording
puts it back in a different slot.

Evidence. The one smoke run (report lines 830-849) returned 2 findings and 13
ceded lines. Eleven of the 13 restate what the control's correctness and
adversarial passes reported in all five measured runs (`measurement-task05.md:108-123`)
or what `fx-lens-silent-failure` owns; one (`schema.sql:2`) makes three claims
about the negative control. The smoke brief asks for nothing about cessions
(`.fx/2026-09-11-fx-audit/briefs/lens.md`), so the volume comes from the lens
wording.

What a branch review shows. `skills/fx-review/SKILL.md:188` presents each pass
"under its own heading, verbatim or lightly cleaned", and `:199` says "Never
merge findings across axes". So those 13 items appear a second time under
`## Lens: pipeline`, the coordinator is forbidden from merging them with the
Correctness and adversarial copies, and `:207`'s "total findings per axis"
leaves open whether a ceded line counts. The silent-failure lens also fires on
worker diffs (`agents/fx-lens-silent-failure.md:9-10`), so its findings appear
twice as well. In the audit, where those owners never run, the lines name
passes that do not exist and carry no severity (cannot-verify item 2).

The existing lenses do not do this. `fx-lens-database.md:30-31` and
`fx-lens-security.md:32-33` allow a single-line mention of another lens's axis,
unslotted, and neither hands a general pass's scope to that channel.

Smallest correct wording:

- `:44-45`: "Every other defect you notice belongs to another pass: leave it
  out of your output."
- `:87-88`: delete.
- `:107`: "Findings only, worst first."
- `:116-117`: delete the `Ceded:` lines from the template.
- `:134`: delete "With nothing to cede, omit the `Ceded:` block."
- `:138-139`: "A numbered finding describes a defect listed under Ceding rules.
  Delete it."
- `README.md:43-45`: the regression becomes "when it reports any of rows 1 to
  5, or anything about `schema.sql`"; delete "A one-line cession of rows 1 to 5
  is the expected behaviour."
- `KEY.md:15-16`, outside the six rows: "it may name them as ceded to other
  passes, never as its own findings" becomes "it should not report them".

If parity with the database and security lenses is wanted, the most the wording
should allow is their form: one unslotted line for a defect owned by another
**lens**, never for the correctness and adversarial list. That also restores
the original `schema.sql` criterion without a ruling.

### Minor (Nice to Have)

**1. `skills/fx-review/SKILL.md:97-102` reads as an exhaustive coverage map, and after narrowing it is not one.** It assigns query shape to the database lens, unbounded enqueue to this lens, and calls only "bundle size and rendering performance" deliberately uncovered. The queue throughput concerns this lens gave up (head-of-line blocking, retry storms) and every other app-layer throughput problem now have no lens, and rest on the correctness and broad reviewers (`reviewer-prompt.md:88`). Fix: add a clause saying other app-layer throughput, including the queue concerns that lens no longer hunts, is left to the correctness and broad reviewers.

**2. `agents/fx-lens-pipeline.md:77`, "a rescue or catch with no re-raise", uses one language family's keywords.** `rescue` and `re-raise` read as Ruby, against `:25`'s "Nothing in this lens depends on ... which language" and the user's domain-plugin requirement for the body. Fix: "an error handler that swallows the error with no rethrow and no dead-letter path".

**3. `agents/fx-lens-pipeline.md:79-85` omits the one boundary case the design named.** `design.md:229-232` and the original criterion put work enqueued inside a transaction on the database boundary, and `fx-lens-database.md:78-80` hunts it ("a Sidekiq enqueue that races the commit"). The ceding list names "an open transaction", which `KEY.md:49` uses for a transaction left open, a different defect, so an enqueue that races its commit has no owner named. Fix: add "work enqueued inside a transaction that can roll back belongs to `fx-lens-database`" to the ceding rules.

**4. `README.md:42-45` and `KEY.md:37-38` disagree on `schema.sql`.** README says a run regresses "when it reports on `schema.sql`"; KEY permits "at most, a one-line cession". By README the smoke run regressed; by KEY it passed. A regression oracle with two readings cannot tell a lens regression from a pass. Important 2's fix resolves it in README; if that fix is not taken, align README to KEY.

**5. `README.md:27-28` overstates how close the control was to real branch review.** It calls each control run "the correctness, standards and adversarial passes branch review dispatches". The pre-registration disclosed the correctness pass as an approximation, a general-purpose reviewer standing in for `/code-review` (`state.md:1218-1220`), and the lens arm read the lens through a brief, not by name (`state.md:1229-1231`). Neither is in the README. Fix: one clause for each.

**6. Finding about the record: group 1's drop rests on a fixture hint, and neither `README.md:25-38` nor `KEY.md:9-17` says so.** `measurement-task05.md:134` (disclosure 2) records that every control pass finding fairness cited the comment at `worker.js:22`, and that round 1's single control missed fairness without it. So on this record, "head-of-line blocking belongs to the correctness and adversarial reviewers" (`agents/fx-lens-pipeline.md:79-81`) rests on the weakest evidence of the five dropped groups, and the key's "why a queue-naive reader misses it" column, which `KEY.md:19-24` still presents as the claim under test, failed for rows 1 to 5 (disclosure 4). This does not change the measurement's recorded verdicts and is not a reason to edit the fixture or the rows. It does mean the conclusion "branch review already catches group 1" is less established than groups 2 to 5. Fix: carry disclosures 2 and 4 into README's Measurement section in a sentence each.

**7. `agents/fx-lens-pipeline.md:140`, "You reported on a schema file instead of the producer that fills the queue", is shaped by the fixture rather than the hunt group.** It exists because the fixture has a `schema.sql` negative control, and it contradicts `:87-88`, under which the smoke run ceded a line about exactly that schema file. The general form is "You reported on a file that adds no work to a queue."

**8. The triggers miss the consumer half of the relationship the lens hunts.** `agents/fx-lens-pipeline.md:4-6` and `SKILL.md:95` fire on producers, schedulers, fan-out and code governing depth or admission, and stay quiet on consumer-only diffs, which is correct for group 6 and keeps clear of `fx-lens-silent-failure`'s consumer triggers (the hunts are disjoint and `:77-78` cedes the one overlap). But a diff that lowers consumer capacity (worker concurrency, pool size, a consumer rate limit, a slower handler) changes the balance an unchecked producer depends on, and nothing triggers on it. At the other edge, "schedules" and "fans out work" also match in-process timers and parallel request fan-out with no queue; `:133-134`'s one-line "nothing adds work to a queue" contains that at the cost of one branch-mode dispatch. Fix, if wanted: add "or code that reduces how fast a queue's consumers drain it".

**9. `agents/fx-lens-pipeline.md:120-123`'s Critical tier fits most scheduled producers by default.** Critical needs only an unattended producer with nothing reading the backlog; few scheduled jobs read their queue's depth. `SKILL.md:234` then says "Fix Critical immediately", while `SKILL.md:211-212` files architecture problems as Important, and `fx-lens-database.md:105-106` reserves Critical for data loss, corruption or a production-blocking lock. The Minor tier's carve-out for small fixed input helps, but nothing between them asks whether the load can outrun consumers. Fix, if wanted: Critical when the producer's load is unbounded or known to exceed consumer capacity under an ordinary slowdown; otherwise Important.

Checked and not a finding: the `docs/plans/...` paths at `KEY.md:17` and `README.md:33` are not reference citations under `scripts/check-paths:18`, which governs `references/` paths only. The `->` in the finding template differs from the existing lenses' arrow character, and matches the task's Interfaces line exactly.

## Assessment

**Task quality:** Needs fixes

**Reasoning:** The narrowing is correct and the record is intact, but `KEY.md:9-17` breaks Ruling U's provisional requirement, and the unasked `Ceded:` block (`agents/fx-lens-pipeline.md:44-45`, `:87-88`) makes the lens restate the other branch passes one line per defect under a heading `fx-review` forbids merging, the exact double report the task's Risks section exists to prevent.
