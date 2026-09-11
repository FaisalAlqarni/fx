# fx-audit: whole-system architecture audit, a pipeline lens, and local artifacts

**Date:** 2026-09-11
**Status:** ready-for-agent
**Glossary:** none. This repository has no `CONTEXT.md`. The vocabulary used
here is `references/vocab/codebase-design.md`: module, interface, depth, seam,
adapter, leverage, locality. No terms were added or sharpened in this session.

## Problem Statement

fx has no lane that understands a whole system and says what it should become.

`fx-architecture` scans for friction in an area you point it at, and that
narrowness is deliberate: its own text says *"decide where to look before you
look"*, and the upstream skill it came from says the same in the same words.
It produces deepening candidates, then stops and routes to `fx-plan`. It never
produces a map of the system, a feature inventory, a gap verdict against stated
targets, or a target architecture.

So a user holding a working but suspect engine, asking *"is this the right
shape, and what should it be"*, finds three things missing:

1. **Nothing owns understanding the system end to end and writing it down.**
   `Explore` returns conclusions to whoever dispatched it, not a document that
   survives a session boundary.
2. **Nothing produces a target architecture.** A folder tree, interface
   signatures, a message lifecycle, and a per-module keep, refactor, rewrite or
   delete verdict. `fx-brainstorm` writes a design for work that does not exist
   yet; this is a design for work that does.
3. **No lens covers pipeline behaviour.** ADR 0008 cut the performance lens and
   named the residue it left: *"jobs enqueued per record, N+1 inside view
   partials, missing batched iteration on large scans, cache-key churn"*.
   Fairness across tenants, backpressure, queue granularity, retry and
   dead-letter policy, idempotency, crash recovery, connection pool pressure
   and lifecycle traceability all sit in that hole. `fx-lens-database` owns
   schema and query shape. `fx-lens-silent-failure` owns swallowed errors.
   Neither owns throughput.

A secondary problem surfaced while designing the first. **fx writes its HTML
reports to the OS temp directory**, where they cannot be returned to. That rule
is inherited from upstream, which has no durable artifact directory to write
into. fx does, and has had one since Section 1.

## Solution

Three additions and one sweep.

**`/fx:audit`**, a user-invoked command running four phases, each ending in a
summary of ten lines or fewer and a stop. It maps the system, optionally
compares it against any reference implementation, reports gaps with evidence,
and writes a target architecture that `fx-plan` consumes unchanged. When the
architecture is already sound it says so and writes no target.

**`fx-lens-pipeline`**, a fifth read-only review lens covering queue and worker
behaviour. It fires on whole-branch reviews and inside the audit, never on a
per-task review, because fairness and backpressure are properties of a pipeline
rather than of one task's diff.

**One ADR** recording that agent and skill descriptions name categories rather
than stacks, so fx stays usable on Laravel, Angular, Android or anything else,
with the four existing lenses named as a deliberate unmigrated exception.

**The artifact sweep.** Everything fx creates and a user might return to lands
in `docs/plans/<slug>/`. Throwaway worktrees land in `.worktrees/`. The OS temp
directory is used for neither, and a new gate enforces it.

## User Stories

1. As an engineer with a working but suspect engine, I want one command that
   reads the whole system and writes down what it found, so that I stop
   re-deriving the same map every session.
2. As an engineer, I want that map to name the domain model and the end-to-end
   flow in the project's own vocabulary, so that I can check whether the code
   matches what I think the system does.
3. As an engineer, I want a feature and business-rule inventory, so that a
   later rewrite has something to be checked against.
4. As an engineer, I want each phase to stop and show me ten lines, so that a
   misread domain model costs one phase rather than four documents.
5. As an engineer, I want the audit to resume when I run it again, so that
   walking away between phases costs nothing.
6. As an engineer comparing against an older implementation, I want to point at
   a path, a branch, a tag or an unrelated project, so that the comparison is
   not limited to a second checkout I happen to have.
7. As an engineer, I want every gap verdict to carry a file and line I can
   open, so that I can disagree with a specific claim rather than a general
   impression.
8. As an engineer, I want gaps ranked by impact, so that I can stop reading
   partway down and still have the important ones.
9. As an engineer, I want a stated recommendation between incremental refactor
   and rewrite, so that the decision is argued rather than assumed.
10. As an engineer, I want that recommendation to name what would have to be
    true for the other option to win, so that I can test it against what I know
    and the audit cannot hide a preference inside a verdict.
11. As an engineer, I want a proposed folder tree and core interface
    signatures, so that the target is concrete enough to build from.
12. As an engineer, I want a message lifecycle diagram, so that I can see the
    path a single unit of work takes without reading six files.
13. As an engineer, I want a keep, refactor, rewrite or delete verdict per
    module, so that nothing in the current system is silently unaccounted for.
14. As an engineer, I want an "add a new provider" walkthrough listing the
    exact modules touched, so that the extensibility claim is demonstrated
    rather than asserted.
15. As an engineer, I want the target architecture to be the file `fx-plan`
    already looks for, so that the pipeline runs on with no extra step.
16. As an engineer whose architecture turns out to be fine, I want the audit to
    say so and stop, so that it cannot manufacture work to justify itself.
17. As an engineer, I want the audit to tell me which areas it failed to cover,
    so that a hole in the map is visible rather than silent.
18. As a reviewer of a branch that touches queues, I want a lens that asks
    whether one slow tenant can starve the others, so that head-of-line
    blocking is caught before it is a production incident.
19. As a reviewer, I want a lens that asks whether a retried send can double
    send, so that idempotency is checked by something other than my memory.
20. As a reviewer, I want a lens that asks whether an exhausted job disappears,
    so that a missing dead-letter path is found before a message is lost.
21. As a reviewer, I want a lens that asks whether work is enqueued inside a
    transaction that can roll back, so that crash recovery is examined.
22. As a reviewer, I want a lens that asks whether a correlation identifier
    survives from intake to callback, so that "where is this one message" is
    answerable in production.
23. As a reviewer, I do not want that lens firing on every per-task diff, so
    that a small task does not pay for a whole-pipeline read.
24. As a reviewer, I do not want it duplicating the database or silent-failure
    lenses, so that one diff does not buy three reports of the same finding.
25. As an engineer on an Angular, Laravel or Android project, I want the new
    lens written in categories rather than framework names, so that it does not
    read as belonging to someone else's stack.
26. As a future author of a sixth lens, I want the category rule recorded where
    I will find it, so that I do not write the seventh by copying the most
    stack-specific example available.
27. As a future reader, I want the four unmigrated lenses named in that record,
    so that four counter-examples do not make the rule look like dead letter.
28. As an engineer, I want architecture reports saved beside the plan they
    belong to, so that I can open one a week later.
29. As an engineer, I want reports to survive a fresh clone, so that the
    machine I generated them on stops mattering.
30. As an engineer, I want visual companion mockups to persist by default, so
    that a brainstorm's pictures are not deleted when the server stops.
31. As an engineer, I do not want anything fx writes landing in the repository
    root, which is the problem the temp rule was originally solving.
32. As an engineer, I want a gate that fails when a skill names a temp
    directory for an artifact, so that the rule is checked rather than
    believed.
33. As an engineer, I want throwaway worktrees under the ignored directory fx
    already uses for them, so that there is one answer to where fx puts things.
34. As an engineer, I want opening the visual companion to make no request to a
    third-party host, so that fx's own claim that nothing flows outward is
    true.

## Implementation Decisions

### The audit is a command, not a lane, and the lane is a separate later change

A model-selectable skill pays a context load every turn and competes for
attention with the triggers already present. `fx-authoring` states the cost and
the reason it is hard to see: *"New triggers compete with the existing ones for
the same attention, so a lane can gain an intent and quietly lose the one it
already had. Nothing in the frontmatter shows this."* An audit lane would sit
almost entirely on top of `fx-architecture`.

`scripts/check-collisions` cannot catch that, because it skips any skill whose
name begins with `fx-`. The gate guarding one-claimant-per-intent is blind to
fx colliding with itself.

So the command ships first and costs nothing per turn. A lane may follow as a
separately measured change, and ships only if a new prompt passes five
repetitions **and** both existing `fx-architecture` prompts still hold. The
second number decides it.

### Four phases, four gates, and the documents are the state

Each gate is a place the session can be compacted or closed, which is the same
reasoning that gave `fx-implement` its ledger. The audit needs no separate
ledger: the presence of each phase document is the record of what is done, so
re-running the command resumes rather than restarts.

Phase 1 maps the current system through parallel read-only explorers, each
writing its findings to a file under the ephemeral workspace, `.fx/`, and
returning a path and a summary rather than its full text. Handing artifacts
over as files is `fx-implement`'s context hygiene rule: whatever a subagent
prints back stays resident for the rest of the session.

Phase 2 runs only when a reference is named. A filesystem path is read in
place. A branch, tag or revision resolves into a worktree under `.worktrees/`,
removed at the phase gate.

Phase 3 produces the gap report: a verdict per feature and per stated target,
ranked by impact, each carrying a file and line. It dispatches
`fx-lens-pipeline` and `fx-architecture`.

Phase 4 produces the target architecture, plus a local HTML rendering of it.

### Phase 4 writes `design.md`

`fx-plan` begins *"Input: `docs/plans/YYYY-MM-DD-<slug>/design.md`, approved"*.
Naming the target document anything else forces either an edit to `fx-plan` or
a copy step. Naming it `design.md` makes the audit the missing front half of
`fx-brainstorm` for code that already exists, and the pipeline runs on
unchanged.

The three read-only phases write numbered documents beside it. The slug
directory therefore holds the current-state map, the optional reference map,
the gap report, and the design.

### The command composes two references; neither references the other

Phase 4's document is a design document plus audit-specific sections. The
obvious arrangement, a template that points at the design template, is refused
by `scripts/check-reference-leaves`, and correctly: a lane following one link
to another pulls two files where the architecture promises one. The command
names both and composes them. The audit template never mentions the design
template.

### Only two agents run inside the audit

The four existing lenses are written to read a diff, and an audit has no diff.
Rather than widen four contracts, Phase 3 dispatches `fx-lens-pipeline`, which
is written from the start to accept a file set, and `fx-architecture` for the
structural half. The database, security, accessibility and silent-failure
lenses stay diff-only and keep firing exactly where they already do.

### The pipeline lens owns the queue, and cedes the query and the rescue

Its trigger set is job and worker definitions, queue and broker configuration,
retry, backoff and dead-letter declarations, schedulers, batch and bulk
dispatch loops, rate limiters, connection pool configuration and outbox tables.
It does not trigger on schema, on a query chain, or on a `rescue`.

Where two lenses could both speak, the boundary is stated in the lens rather
than left to chance. A query issued per record belongs to `fx-lens-database`. A
job enqueued per record belongs here. A swallowed error in a worker belongs to
`fx-lens-silent-failure`. Work enqueued inside a transaction is reported here
and the brief says the database lens sees it too, copying the pattern
`fx-lens-database` already uses when it finds unparameterised SQL.

Eight hunt groups: fairness and head-of-line blocking; backpressure and rate
limits; job granularity and batching; retries, backoff and dead letters;
idempotency and delivery guarantees; transactional safety and crash recovery;
resource pressure; lifecycle traceability.

It pins the top model tier, on the same argument `SURFACE.md` records for
security and database: the findings are reasoning problems where a cheap miss
is an incident. It runs in branch mode and in the audit, never per task.

### Descriptions name categories, not stacks

ADR 0003 already states that fx is stack-general. ADR 0011 already states the
rule as *"describe the category; do not enumerate its members"*, written after
`fx-tdd` listed five file extensions and cost itself reach in every language
not on the list. Neither mentions agents, and the four existing lenses name
Rails, .NET, Devise, Pundit and ERB in text that is loaded on every turn.

A new ADR extends the rule to agent and skill descriptions and bodies. It names
the four existing lenses as a deliberate exception that is not being migrated
in this change, because generalising four trigger sets is a behaviour change
that has to be measured per lens, and bundling it here would make a lens that
stopped firing indistinguishable from a report path that broke.

Stack knowledge itself is unaffected. It lives in the stack profiles, loads
only when the machine facts name it, and an Angular repository never sees the
Rails file.

### A second ADR, because this contradicts a recorded decision

ADR 0008 does not merely leave the app-layer gap open. It recommends a fix:
*"Fold it into `fx-lens-database`'s brief as an app-layer section rather than
paying a second dispatch."* This design pays the second dispatch. The reason is
that `fx-lens-database`'s triggers are schema-shaped and would not fire on a
worker or a queue configuration, which is the diff the lens exists for. ADR
0008 gains one line marking its recommendation superseded in part.

### A third ADR, because the artifact location reverses upstream

`fx-architecture`'s coverage record marks *"write to the OS temp directory so
nothing lands in the repo"* as deliberately restored, with the reason that two
earlier runs left files in the repository root. That reason is about the root,
not about a plan directory. Upstream has no durable artifact directory, so temp
was its only option.

fx has one, and it is already split by lifetime: the plan directory is durable
and committed, the ephemeral workspace is git-ignored and deleted on a clean
run. A report a user returns to is durable by definition. The ephemeral
workspace is not an alternative, because `fx-implement` deletes it.

Reports are therefore committed. They stay small because the styling and
diagram libraries load from content delivery networks rather than being
inlined.

### The sweep, and the gate that makes it checkable

Reports move to the plan directory in `fx-architecture` and in the new command.
The visual companion's session directory moves there too, which also retires a
persistence path named after the plugin fx replaced. Its stop script already
declines to delete anything outside temp, so that guard needs no change.

Review worktrees move from temp to `.worktrees/`, which `worktree-setup.md`
already names as fx's default and setup already ignores. This is not a new
convention; it is two call sites being brought in line with one fx has.

A new gate fails when a skill, agent or command names a temp directory as an
artifact path. The prose gate exists on exactly this argument: an unmeasurable
rule is one nobody checks, and this rule now spans six files.

### One correctness fix taken while in the file

The companion server embeds a brand image hosted on a third-party domain, shown
unless a telemetry environment variable is set. It sends no data and makes no
outbound request from the server itself, but the browser fetches that image
when the page opens, which contradicts the claim in the existing design
document that nothing flows outward. The logo is inlined or dropped.

## Testing Decisions

**Confirmed seams.**

Five existing gates cover the additions with no new work: the citation
resolver, the prose gate, the reference leaf gate, the manifest validator and
the collision lister. They are structural, they run on a command, and they
fail non-zero.

Four seams are new.

1. **The artifact gate.** A grep over skills, agents and commands. Red before
   the sweep, green after. This is what makes the sweep verifiable rather than
   believed, and it is the only check that can catch the seventh file that
   reintroduces a temp path next year.
2. **The pipeline lens, at a fixture directory.** A seeded pipeline containing
   a job per record, an uncapped retry, an acknowledgement before commit, a
   per-process limiter and a missing correlation identifier. A subagent runs
   against it without the lens as the control, then with it. The lens ships
   only if it finds what the control misses. This is the method in
   `references/vocab/skill-testing.md` and the fixture pattern the lane
   triggering suite already uses.
3. **The companion scripts, by running them.** Start with and without a project
   directory, confirm the session directory lands in the plan directory, and
   confirm the stop script declines to delete it. This is the only executable
   change in the design, so it is the only place reading is not enough.
4. **The command's first gate.** A full four-phase run per iteration is a
   project in its own right. What gets tested is the behaviour most likely to
   fail and cheapest to observe: does the command stop after phase one, or run
   straight through.

**What a good test is here.** Every one of the four observes external
behaviour: a file exists at a path, a process left a directory alone, an agent
produced a finding the control did not, a run ended at a gate. None inspects
the wording of a document to decide whether it complies.

**Prior art in this repository.** The lane triggering suite is the precedent
for measuring behaviour rather than text, including its fixture directories and
its use of a plugin directory flag so the run tests the working tree rather
than the version-keyed cache. The guard suites are the precedent for mutation
testing: a suite that passes on its first run proves nothing until it has been
watched to fail.

**Not tested, and stated rather than hidden.** The quality of an audit's
judgment. Nothing distinguishes a good gap report from a plausible one, which
is the same gap the existing design document already records for reviewers.

## Global Constraints

- No em dashes or en dashes anywhere, including inside prose fenced blocks.
- No stock vocabulary: the prose gate holds the list.
- A prose fenced block is tagged `markdown`; an untagged fence is code.
- A skill body stays under 500 lines. References sit exactly one level from the
  file that cites them, and no reference links to another reference.
- Every reference citation is anchored relative to the citing file, never bare
  and never through an environment variable.
- Agents and hooks are discovered by convention and are never declared in the
  plugin manifest.
- Every agent pins a model explicitly. An omitted model inherits the session's.
- Review lenses carry read-only tools and cannot write.
- A description carries triggers and stakes and never summarises a workflow.
- A stakes clause names machinery, never quality.
- Nothing fx creates is written to the OS temp directory.
- Artifacts a user returns to live in `docs/plans/<slug>/`. Throwaway worktrees
  live in `.worktrees/`. Regenerable working files live in the ephemeral
  workspace.
- Nothing leaves the machine. No publishing, uploading or posting, and no
  request to a third-party host from anything fx renders.
- No attribution trailers in any commit message.
- Behaviour is measured against the working tree through the plugin directory
  flag, or against a bumped version. The cache is keyed by version, not by file
  contents.

## Out of Scope

- **The `fx-audit` lane.** Decided and sequenced, not built here. It ships as a
  separate change gated on the triggering suite.
- **Generalising the four existing lenses.** Named as an exception in the new
  ADR. Each is a trigger change needing its own measurement.
- **The wider stale-document sweep.** The dispatch guard design that reports
  itself implemented when the code was deleted, the surface document's
  description of the pre-ADR-0005 guard, and the dead pointers to removed files
  and a directory that does not exist. Real, found while reading, and a
  separate change.
- **Teaching the session-start notice about half-finished audits.** It scans for
  a task directory, which an audit has none of until planning runs. The command
  resumes itself when typed. Recorded as an exclusion so it is not re-proposed
  as an oversight.
- **Any test of audit judgment quality.**
- **Vendoring the styling and diagram libraries.** The existing report format
  document already records the supply chain reasoning and the conditions under
  which it would change.

## Open Questions

None. Twelve were raised and closed across four interview rounds, plus one
reopened by the user and resolved: report location moved from the OS temp
directory to the plan directory, which widened into the artifact sweep and the
worktree relocation.

## Further Notes

The third-party skills that prompted this session are already in fx.
Architecture improvement, the design vocabulary, domain modelling, the grilling
interview, handoff, code review, simplification and the planning and execution
pair each have exactly one claimant here already. Installing them would restore
the contest fx was built to end, and the collision lister shows that contest is
already half live in the second skill pool, which the surface document records
as a deferred cleanup that never happened.

The architecture improvement skill in particular would not have solved the
problem it was recommended for. Its scoping rule is the same one fx inherited,
kept verbatim in substance, and it produces friction candidates in a chosen
area rather than a system map or a target architecture.

**One observation for planning, raised by the scope check.** This design is
likely past ten tasks, which is the point at which `fx-plan` phases work into
independently shippable slices. Four separable groups are visible: the artifact
sweep with its gate, which touches the most files and is the only executable
change; the pipeline lens with its fixture; the command with its template; and
the three records. The sweep and the lens each ship on their own. Naming this
here is an observation, not a plan: the cut is `fx-plan`'s to make.
