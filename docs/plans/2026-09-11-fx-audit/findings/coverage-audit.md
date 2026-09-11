# Coverage audit: design commitments against task criteria and rulings

**Question:** is there any behaviour `design.md` commits to that no task's
acceptance criteria and no ledger ruling carries?

**Read:** `design.md` in full, `plan.md`, task files 01 to 09, and in
`state.md` every Ruling heading and bold Ruling line, plus the four named
sections. Task files and rulings were judged against the design, not against
the implementation. Four existing, untouched consumer files were opened only to
identify the second half of a two-place commitment:
`skills/fx-implement/SKILL.md:448-455`, `skills/fx-plan/SKILL.md:15-16`,
`skills/fx-authoring/SKILL.md:294-296` and `lib/plan-state.js:26,35`, plus the
frontmatter of the four existing commands and `skills/fx-architecture/HTML-REPORT.md:5,45,47`.

**Result:** 87 commitments checked. 10 uncarried items, covering 12 gaps. 2
reverse-direction items.

**Known and confirmed, not re-reported.** Stories 18 to 22 are recorded as
superseded by the measurement at `state.md:2490-2495`, with Ruling U at
`state.md:1591-1611`, and the ledger says the completion report states it. The
audit's queue-correctness gap is Ruling AA at `state.md:2188-2207`, parked for
the user.

## 1. Every commitment checked

AC means an acceptance criterion in the named task file.

### User stories

| # | Design line | Carried by |
|---|---|---|
| S1 | 69-71 one command reads the system and writes it down | 08 AC Phase 1 explorers; 08 Produces `01-current.md`; 08 step 4 |
| S2 | 72-74 domain model and flow in the project's own vocabulary | 07 AC heading only. **UNCARRIED in part**, item 10 |
| S3 | 75-76 feature and business-rule inventory | 07 AC skeleton heading; gap count anchored to it, `state.md:1199-1204` |
| S4 | 77-78 each phase stops with ten lines | 08 AC "ends with a summary of ten lines or fewer and a stop" |
| S5 | 79-80 re-running resumes | 08 AC resume at first missing document. **UNCARRIED in part**, item 2 |
| S6 | 81-83 path, branch, tag or unrelated project | 08 AC `--against` forms; path read in place |
| S7 | 84-86 every gap verdict has file and line | 07 AC; 08 AC line opened before claim |
| S8 | 87-88 gaps ranked by impact | 07 AC; 08 AC |
| S9 | 89-90 refactor or rewrite recommendation | 07 AC; 08 AC |
| S10 | 91-93 what would make the other option win | 07 AC; 08 AC |
| S11 | 94-96 folder tree and interface signatures | 07 Interfaces and AC headings |
| S12 | 96-97 message lifecycle diagram | 07 Interfaces and AC headings |
| S13 | 98-99 verdict per module | 07 AC row for every module; count device, `state.md:1199-1201` |
| S14 | 100-102 add-a-provider walkthrough with exact modules | 07 AC heading; the exact-modules clause rests on the heading alone |
| S15 | 103-104 target is the file fx-plan looks for | 08 AC writes `design.md`. **UNCARRIED in part**, item 9 |
| S16 | 105-106 sound architecture says so and stops | 08 AC sound outcome. Interplay with S5 is item 2 |
| S17 | 107-108 audit names areas it failed to cover | 07 AC Areas not covered; 08 AC empty explorer. **UNCARRIED in part**, item 10 |
| S18 to S22 | 109-120 lens behaviours | Superseded by Ruling U, recorded at `state.md:2490-2495` |
| S23 | 121-122 lens not firing per task | 05 AC Mode column. **UNCARRIED in the per-task dispatcher**, item 3 |
| S24 | 123-124 no duplication with database or silent-failure lenses | 05 AC ceding rules; Ruling Z removes the cession block. Boundary subset is item 5 |
| S25 | 125-127 lens written in categories | 05 AC description; Ruling Z point 2 for the body |
| S26 | 128-130 category rule recorded where an author finds it | 06 AC ADR 0013 exists. **UNCARRIED**, item 4 |
| S27 | 131-132 four unmigrated lenses named | 06 AC |
| S28 | 133-134 reports beside the plan | 03 AC path |
| S29 | 135-136 reports survive a fresh clone | 02 AC ADR records it. **UNCARRIED as behaviour**, item 6 |
| S30 | 137-138 mockups persist by default | 04 AC listing after stop; Ruling T |
| S31 | 139-140 nothing in the repository root | 03 AC no-plan directory; Ruling T fallback; task 04 fix round 1 finding 3 |
| S32 | 141-143 gate for temp artifact paths | 02 AC; 04 AC wires it into `check-all` |
| S33 | 144-145 throwaway worktrees under `.worktrees/` | 03 AC; 08 AC. **UNCARRIED for the review worktree's ignore and removal**, item 8 |
| S34 | 146-148 companion makes no third-party request | 04 AC; image guidance fix, `state.md:1715-1718,1769-1770` |

### Implementation decisions

| # | Design line | Carried by |
|---|---|---|
| D1 | 152-168 command first, lane later and measured | 08 creates the command; lane is Out of Scope |
| D2 | 165 the command costs nothing per turn | **UNCARRIED**, item 1 |
| D3 | 172-175 documents are the state | 08 AC resume and Idempotency. Sound outcome leaves no state, item 2 |
| D4 | 177-181 explorers write to `.fx/`, return path and summary | 08 AC |
| D5 | 183-185 Phase 2 path in place, worktree removed at gate | 08 AC, plus never guessing and ignore check |
| D6 | 187-188 verdict per feature and per stated target | 07 AC; Ruling V gives targets a source and task 08 the capture |
| D7 | 188-189 Phase 3 dispatches the lens and fx-architecture | 08 AC; bounded skill invocation, `state.md:2496-2512` |
| D8 | 191 local HTML rendering of the target | 08 AC report into slug directory |
| D9 | 193-203 Phase 4 writes `design.md`; four documents in slug | 08 AC and Produces |
| D10 | 205-212 the command composes both templates | 07 AC no `design-template`; 08 Interfaces and AC |
| D11 | 214-220 only two agents inside the audit | 08 AC "and no other lens"; Ruling AA |
| D12 | 224-227 lens trigger set, not schema, query or rescue | 05 AC; Ruling U narrows triggers, `state.md:1820`; Ruling Z point 4 |
| D13 | 229-234 boundary rules between the three lenses | 05 AC as written, reversed in part by Ruling Z. **UNCARRIED**, item 5 |
| D14 | 236-239 eight hunt groups | 05 AC; superseded by Ruling U, recorded |
| D15 | 241-242 top model tier | 05 AC `model: opus` |
| D16 | 243 branch mode and audit, never per task | 05 AC Mode column; 08 AC. Per-task dispatcher is item 3 |
| D17 | 245-261 ADR on categories, exception, stack profiles | 06 AC; loading-rule correction, `state.md:2065-2071` |
| D18 | 263-270 ADR 0014 and the ADR 0008 line | 06 AC; measurement added, `state.md:2060-2064,2473-2478` |
| D19 | 272-283 ADR on artifact location | 02 AC |
| D20 | 285 reports are committed | 02 AC records it only. **UNCARRIED as behaviour**, item 6 |
| D21 | 285-287 report libraries load from CDNs | **Contradicts G13 with no ruling**, item 7 |
| D22 | 291 reports move in fx-architecture and the command | 03 AC; 08 AC |
| D23 | 292-294 companion directory, retire old name, guard unchanged | 04 AC; Rulings T and W |
| D24 | 296-298 review worktrees move to `.worktrees/`, setup ignores it | 03 AC path only. Item 8 |
| D25 | 300-302 gate over skills, agents and commands | 02 AC |
| D26 | 306-310 remote logo inlined or dropped | 04 AC |

### Testing decisions

| # | Design line | Carried by |
|---|---|---|
| T1 | 316-319 five existing gates cover the additions | 01 AC; Ruling A keeps `check-collisions` manual |
| T2 | 323-326 artifact gate red before, green after | 02, 03, 04 AC; Ruling C |
| T3 | 327-333 fixture, control, lens ships only on a difference | 05 AC; Rulings O, Q, R, S, U, Z; provisional keep recorded |
| T4 | 334-337 companion scripts run, with and without a project | 04 Seam, Testing, AC |
| T5 | 338-341 command stops after Phase 1 | 08 Seam and step 4 |
| T6 | 348-351 plugin directory flag, not the cache | 08 step 2; worktree path correction, `state.md:2350-2366` |

### Global constraints

| # | Design line | Carried by |
|---|---|---|
| G1 | 361 no dashes | `check-prose` in every task; its blind spots recorded, `state.md:237-249,1312-1341,2573-2577` |
| G2 | 362 no stock vocabulary | same |
| G3 | 363 prose fences tagged | same |
| G4 | 364-365 skill body size, reference leaves | 07 AC leaf gate |
| G5 | 366-367 anchored citations | 08 AC `check-paths` |
| G6 | 368-369 agents undeclared | 05 AC |
| G7 | 370 agents pin a model | 05 AC |
| G8 | 371 lenses read-only | 05 AC |
| G9 | 372 description carries triggers and stakes | 05 AC for the lens; the command's frontmatter is item 1 |
| G10 | 373 stakes clause names machinery | 05 AC |
| G11 | 374 nothing to the OS temp directory | 02 gate; 04 wiring |
| G12 | 375-377 durable, worktree and ephemeral locations | 03, 08 AC; Ruling T |
| G13 | 378-379 no request to a third-party host from anything fx renders | 04 AC for the companion only. **UNCARRIED for HTML reports**, item 7 |
| G14 | 380 no attribution trailers | every task's commit step; `state.md:982-992` |
| G15 | 381-383 measure against the working tree | 08 step 2; `state.md:2350-2366` |

### Out of scope

| # | Design line | Carried by |
|---|---|---|
| O1 | 387-388 no audit lane | no task, correct |
| O2 | 389-390 four lenses not generalised | 06 AC |
| O3 | 391-395 stale-document sweep | 09 Risks |
| O4 | 396-399 command resumes itself when typed | 08 AC resume. Locating the audit is item 2 |
| O5 | 400 no test of judgment quality | none, correct |
| O6 | 401-403 no vendoring | none, correct; bears on item 7 |

## 2. Uncarried items

### Item 1. The command's zero per-turn cost rests on a frontmatter line no criterion asks for

Design line 165: "So the command ships first and costs nothing per turn." The
whole decision at lines 152-168 depends on it: a model-selectable entry "pays a
context load every turn and competes for attention", and `check-collisions`
cannot see fx colliding with itself.

**Why nothing carries it.** Task 08's criteria cover arguments, phases, resume,
dispatch and gates. None names the command's frontmatter. `fx-authoring`
states the mechanism at `skills/fx-authoring/SKILL.md:294-296`: a human-only
entry carries `disable-model-invocation: true` and a one-line description with
triggers stripped. None of the four existing commands carries that flag, and
all four appear with their descriptions in the model's skill listing of this
very session, so the command convention task 08 copies is model-visible by
default.

**Owner:** task 08, one criterion: the frontmatter carries
`disable-model-invocation: true`, proven by the command being absent from a
session's model-facing skill listing.

**Cost if it ships.** `/fx:audit` loads every turn and competes with
`fx-architecture` for the same intents, which is the exact collision the
design chose a command to avoid, and no gate can see it. The later lane
measurement at line 166-168, "both existing `fx-architecture` prompts still
hold", would be taken against a baseline the command already disturbs.

### Item 2. Resume keys on documents, and two outcomes leave no document to key on

Design lines 172-175: "the presence of each phase document is the record of
what is done, so re-running the command resumes rather than restarts." Story 5:
"walking away between phases costs nothing." Story 16 and line 52: when sound,
the audit "says so and writes no target." Out of Scope line 398: "The command
resumes itself when typed."

**Why nothing carries it.** Two gaps in one mechanism.

1. *A sound verdict is not recorded.* Task 08's criterion says a sound
   architecture "writes no `design.md`", and its resume criterion resumes "at
   the first phase whose document is missing". No criterion in 07 or 08 writes
   the sound verdict into any document, and task 07's skeletons shape only the
   non-sound Phase 4. A re-run after a sound verdict therefore resumes at
   Phase 4 and judges again.
2. *Nothing says how the slug is chosen or found again.* Task 08 produces
   `docs/plans/YYYY-MM-DD-<slug>/`. No criterion and no ruling says where
   `<slug>` comes from, or how a re-run locates the earlier audit's directory
   rather than creating a new one under a new date, or tells it apart from an
   `fx-brainstorm` plan directory that also holds a `design.md`. Ruling T found
   this identical defect in task 04, at `state.md:1580-1585`, and fixed it there
   only. Task 08's step 5 re-runs in the same session on the same day, so it
   cannot observe either gap.

**Owner:** task 08 for locating the audit and resuming past a sound verdict;
task 07 for the shape of the sound-verdict record, on Ruling X's split, where
the template owns shape and the command owns filling it.

**Cost if it ships.** A user who walks away overnight gets a fresh audit, not
a resumed one. A user who re-types the command after a sound verdict gets a
second Phase 4 that may write the design the first declined, which is the
manufactured work story 16 exists to prevent.

### Item 3. "Never per task" lands in the review table, and the per-task dispatcher is elsewhere

Story 23, lines 121-122, and design line 243: "never per task". Task 05 adds a
Mode column to `fx-review` section 2 and marks this lens `branch`.

**Why nothing carries it.** The per-task lens dispatch is not in `fx-review`.
It is `skills/fx-implement/SKILL.md:448-455`: "check the task's changed file
paths against the lens trigger patterns in `../fx-review/SKILL.md` (§2's table)
and dispatch any lens whose triggers match". It reads the triggers, not a Mode
column, and no task edits it. The parenthesised list of the four existing
lenses beside that sentence is the only thing that might keep the new row out,
and it reads as examples as easily as an exhaustive list. Task 05's criterion
is satisfied by the column existing and asserts nobody reads it. The main
checkout also holds uncommitted user edits to that same file,
`state.md:17-21`.

**Owner:** task 05's scope, now closed, so a ruling for the final review: one
clause in `fx-implement` saying a lens fires per task only when its Mode
includes `task`, coordinated with the user's uncommitted edit.

**Cost if it ships.** The first per-task diff touching a worker or a scheduler
dispatches the pipeline lens per task, the cost story 23 refuses, and ADR 0014's
reason for accepting a second dispatch, "branch mode only", stops being true.

### Item 4. The category rule is recorded where no author is sent

Story 26, lines 128-130: "I want the category rule recorded where I will find
it, so that I do not write the seventh by copying the most stack-specific
example available."

**Why nothing carries it.** Task 06's criteria assert ADR 0013 exists and what
it says. None places a pointer where a lens author is working. The lane for
writing an agent definition is `fx-authoring`, and it cites no ADR at all. The
four exempt lens files, which are the stack-specific examples the story names,
carry no pointer either. This is the shape of a criterion met by an artifact
existing that never asserts anyone reaches it.

**Owner:** task 06, or a ruling adding one line to `fx-authoring` that names
the rule and cites ADR 0013.

**Cost if it ships.** The rule sits in `docs/adr/`, which the author's lane
never opens, and the sixth or seventh lens is copied from `fx-lens-security`,
the outcome story 26 was written to stop.

### Item 5. Two boundary rules lost their owner, and the ruling that moved one misquotes the design

Design lines 229-234: "A job enqueued per record belongs here." and "Work
enqueued inside a transaction is reported here and the brief says the database
lens sees it too". ADR 0008's named residue, quoted at design line 31 and at
`docs/adr/0008-no-performance-lens.md:19`, "jobs enqueued per record", is the
reason the lens exists.

**Why nothing carries it.** Task 05's criterion carried the transaction rule
as the design wrote it. Ruling Z point 2, `state.md:2160-2162`, reassigned it
to `fx-lens-database` "as `design.md` and that lens already say". The design
says the opposite, and line 268-269 says that lens's "triggers are
schema-shaped and would not fire on a worker". The ledger records the symptom
as a deferred Minor at `state.md:2543-2546`, that on a worker-only diff neither
lens reports it, without noting that the ruling's basis is a misreading. The
per-record job rule belonged to the granularity hunt group, which was dropped
before the measurement, and nothing cedes it. Task 06's review is asked whether
"superseded in part" is accurate, `state.md:2587-2588`, which is a question and
not a record. Neither rule appears beside stories 18 to 22 in the superseded
list.

**Owner:** the completion report's superseded list, beside stories 18 to 22;
ADR 0014 under task 06's review, which should say these two ADR 0008 residue
items now have no owner in branch review or in the audit.

**Cost if it ships.** The design's ownership boundary is false in two places,
the final review inherits Ruling Z's misquote as settled, and ADR 0014 marks
ADR 0008 superseded for exactly the items the shipped lens does not hunt.

### Item 6. Reports are committed in the ADR, and nobody commits them

Design line 285: "Reports are therefore committed." Story 29: "reports to
survive a fresh clone".

**Why nothing carries it.** Task 02's criterion requires ADR 0015 to record
that reports become committed files. Task 03 sets the path. Task 08 writes its
documents and report into the slug directory. No criterion says a report is
committed, or that the user is told it is untracked. The ledger shows the
general case at `state.md:451-454`: nothing in fx would ever have committed the
plan directory unless the controller did it by hand.

**Owner:** task 03, now closed, so a ruling for the final review; and task 08
for its own documents. Given the user's commit rules, the minimum is that each
names the file as untracked and meant to be committed.

**Cost if it ships.** A report in `docs/plans/YYYY-MM-DD-architecture-review/`
stays untracked, a fresh clone lacks it, and story 29 is unmet while ADR 0015
says it is met.

### Item 7. The report's CDN scripts break a Global Constraint, and no ruling reconciles them

Global Constraint, lines 378-379: "no request to a third-party host from
anything fx renders." Design lines 285-287: reports "stay small because the
styling and diagram libraries load from content delivery networks".
`skills/fx-architecture/HTML-REPORT.md:45,47` loads Tailwind and Mermaid from
two third-party hosts.

**Why nothing carries it.** Task 04 removed a logo and task 04's pre-review
fix removed image guidance on exactly this constraint. Task 03 keeps the report
"local and never published", which is about publishing, not fetching. Task 08
writes a second report of the same kind in Phase 4. Out of Scope line 401
defers vendoring. No ruling says which of the two design statements binds.
Ruling T's own precedent at `state.md:1569-1573` is that a Global Constraint
binds a task that contradicts it.

**Owner:** a ruling before task 08's review, carried into ADR 0015 or the
completion report: either the constraint's wording names the report
libraries as a stated exception, or the reports stop fetching.

**Cost if it ships.** fx states a guarantee two of its own renderers break the
moment a report opens, the same defect class this build called a correctness
fix for the companion.

### Item 8. The review worktree moved, and its ignore check and removal did not come with it

Design lines 296-298: review worktrees move to `.worktrees/`, "which setup
already ignores." Story 33.

**Why nothing carries it.** Task 03's criterion directs the worktree to
`.worktrees/review-<SHA>` and stops. Task 08 carries both halves for its own
worktree: "`.worktrees/` is confirmed git-ignored before anything is created
there" and "removed at the Phase 2 gate". Task 03 carries neither. The ledger's
own setup at `state.md:8-11` found `.worktrees/` reported unignored before the
directory existed, with the pattern present. A temp directory was reaped by the
system; `.worktrees/review-<SHA>` is not, and `fx-review` runs in repositories
where `/fx:setup` never ran.

**Owner:** task 03, now closed, so a ruling for the final review: the same two
clauses task 08 carries.

**Cost if it ships.** One untracked nested worktree and one `git worktree list`
entry per reviewed revision, in the checkout under review, and a bare
`git add -A` stages an embedded repository.

### Item 9. `design.md` has the right name, and nothing makes it the approved input fx-plan requires

Story 15, lines 103-104, "so that the pipeline runs on with no extra step", and
design line 195 quoting fx-plan's input.

**Why nothing carries it.** `skills/fx-plan/SKILL.md:15-16` reads "Input:
`docs/plans/YYYY-MM-DD-<slug>/design.md`, approved. No approved design, stop and
route to `fx-brainstorm`." Approval lives in `fx-brainstorm`'s gate. Task 08's
criterion asserts the filename only. No criterion says the Phase 4 gate is that
approval, or what Status line the composed `design.md` carries, given that
`references/design-template.md:14` carries `**Status:** ready-for-agent`.

**Owner:** task 08: the Phase 4 gate is the approval, and the Status line is
written only once the user approves there.

**Cost if it ships.** Either fx-plan routes the audit's target back to
`fx-brainstorm`, the extra step story 15 refuses, or a Status line copied from
the template marks an unreviewed target approved and skips the one gate fx-plan
relies on.

### Item 10. Two Phase 1 partials: the vocabulary's source, and holes the retry cannot see

Story 2, lines 72-74: the map names things "in the project's own vocabulary".
Story 17, lines 107-108: the audit tells me "which areas it failed to cover".

**Why nothing carries them.** Task 07 carries a "domain model and glossary"
heading; no criterion in 07 or 08 says the terms come from the repository's
`CONTEXT.md`, which `/fx:setup` writes, or from the code's own names, rather
than from the explorer. For story 17, task 08's only criterion is an explorer
that returns nothing twice. An area no explorer was assigned, and a Phase 3
dispatch that cannot run, such as the lens not resolving by name,
`state.md:974-980`, reach **Areas not covered** by no criterion.

**Owner:** task 08.

**Cost if it ships.** A glossary in the explorer's words cannot be checked
against what the engineer thinks the system does, and the silent hole story 17
names comes from how the system was divided, which no criterion covers.

## 3. Reverse direction: what the tasks assume and no story states

### R1. The sweep fills `docs/plans/` with directories that are not plans, and the plan scanner reads only the first 20

No story says `docs/plans/` holds anything but plans. After this build it also
holds one `YYYY-MM-DD-architecture-review/` per day of standalone
`fx-architecture` use (task 03), `_companion-unfiled/` (Ruling T), and every
audit slug before planning (task 08). `lib/plan-state.js:35` takes the first 20
directory entries, then filters for a `tasks/` directory. The ledger records
the cap only as a pre-existing deferred Minor at `state.md:1741-1742`, not
connected to the sweep. Cost: as reports accumulate, the session-start notice
stops seeing a real in-flight plan. Owner: final review, beside that Minor.

### R2. The companion now edits the project's git exclude file and refuses to start in some repositories

Rulings W and the task 04 fix round, `state.md:1723-1737,1941-1952,2209-2240`,
make the start script append to `.git/info/exclude`, refuse when git cannot
answer, refuse a skill directory as a project, and refuse when a re-include
rule defeats the exclude. These are load-bearing rules on the user's
repository that no story states; they live in rulings and in runtime messages.
No criterion asserts `visual-companion.md` tells the user the refusal cases in
advance. Owner: the completion report, as a stated behaviour change.

## 4. Cleared

- Stories 18 to 22 superseded and recorded; Ruling AA recorded and parked.
- Stated targets have a source and an owner under Ruling V.
- `fx-architecture` being an interactive skill inside Phase 3 is carried by the
  brief requirements at `state.md:2496-2512`.
- Two copies of fx loading, and the lens not resolving from the cache, are
  carried for task 08's probe at `state.md:2350-2366,974-980`.
- The artifact gate's `artifact-gate: ok` marker and its exemption of
  `scripts/` and `tests/` are stated in `plan.md:73-77` and task 02.
- The gate's patterns do not match `mktemp`, `tempfile` or `gettempdir`. A grep
  of `skills/`, `agents/` and `commands/` finds no such use today, so nothing
  escapes now; the design's claim that it catches "the seventh file" holds only
  for the six patterns.
- Task 04's "six gates" and task 09's gate count are reconciled at
  `state.md:1697-1704`.
- Task 09's inventory counts and the References section ruling,
  `state.md:2371-2408`.
- Task 06's quoted recommendation and stack-profile loading rule,
  `state.md:2056-2071`.
