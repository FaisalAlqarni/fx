---
name: fx-plan
description: >
  Use when an approved design exists and the work needs breaking down, or on
  "break this down", "make tasks", "write the plan", "what are the steps",
  "sequence this work". Requires an approved design; if there is none, use
  fx-brainstorm. Skip it and the design gets built from memory, which a
  compacted session does not have.
---

# fx-plan

Announce: "Using fx-plan to break this into tasks."

Input: `docs/plans/YYYY-MM-DD-<slug>/design.md`, approved.
No approved design → stop and route to `fx-brainstorm`. Do not plan from a
conversation alone.

## Who you are writing for

Write the plan assuming the implementer has **no context for this codebase**.
Document what they need: which files to touch, the interfaces involved, the
behaviour to build, the tests to write, the docs to check, how to verify.
Give them the whole plan as **seam-sized tasks**.

Assume they are a **skilled developer** who knows **almost nothing about our
toolset or problem domain**, and who **invokes `fx-tdd` for test design**. That
assumption sets the detail level for everything below. Write less and you are
guessing on their behalf. What they cannot know is what you decided: which
files, which names and signatures, which values from the design, which tests
prove each task. Write those.

DRY. YAGNI. TDD.

## 1. Restate the requirements: before writing anything

When design.md carries an `**Approved:**` line followed by a real date, such as
`**Approved:** 2026-10-21`, skip the restate and say so in one line; the line
survives compaction. A placeholder (`YYYY-MM-DD`) or a missing date means
restate and wait:

**Requirements as I understand them:**
- <requirement, in your own words>
- <requirement>
- <assumption you are making>

**Wait for confirmation.** Misunderstandings caught here save hours of wasted
implementation. This is the cheapest gate in the whole pipeline.

## 2. Scope check

If the design covers multiple independent subsystems it should have been split
during brainstorming. If it wasn't, say so and suggest separate plans: one per
subsystem. **Each plan must produce working, testable software on its own.**

## 3. Map the file structure

Before defining tasks, map which files will be created or modified and what
each is responsible for. **This is where decomposition decisions get locked in.**

- Design units with clear boundaries and well-defined interfaces. One clear
  responsibility per file.
- You reason best about code you can hold in context at once, and your edits
  are more reliable when files are focused. Prefer smaller, focused files over
  large ones that do too much.
- **Files that change together live together.** Split by responsibility, not by
  technical layer.
- In existing codebases, follow established patterns. If the codebase uses
  large files, do not unilaterally restructure, but if a file you are
  modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition. Each task produces
self-contained changes that make sense independently.

## 4. Draft vertical slices

Look up the doc claims and ADR decisions citing the paths you touch: `../../references/docs-lookup.md`.

**Explore the codebase first** if you haven't already: you cannot size a
task against code you haven't read. Read, do not build: no scratch implementation and no trial runs while
planning. A question only running code can settle goes to `prototype`. Look
specifically for **prefactoring
opportunities** that would make the implementation easier.

Each task is a **tracer bullet**: a narrow but COMPLETE path through every
layer: schema, domain, controller/endpoint, view/API, tests. **Vertical, never
a horizontal slice of one layer.**

- Demoable or verifiable on its own
- **Sized to fit one fresh context window**
- Prefactoring first: *"make the change easy, then make the easy change"*

Look for prefactoring opportunities that make the implementation easier, and
sequence them first.

Task titles and descriptions use the domain vocabulary from `GLOSSARY.md` (old name: see domain-modeling), and
respect the ADRs in the area you are touching.

**Right-sizing.** A task is **one seam**: the smallest unit that carries its
own test cycle and is worth a fresh reviewer's gate. Docs, ADR, rename and
config work fold into the task that needs them. Tasks that edit the same files
merge. Split only where a reviewer could meaningfully reject one task while
approving its neighbor. Every task ends with an independently testable
deliverable. Fewer, deeper tasks beat many shallow ones: every task costs a
fresh implementer and a fresh reviewer.

**Blocking edges.** Give each task the tasks that must complete before it
can start. A task with no blockers can start immediately. Number from `01` in
dependency order, blockers first.

These edges define the **frontier** `fx-implement` works: any task whose
blockers are all done. For a purely linear chain that means top to bottom. Get
them right: an edge that isn't a real dependency serialises work for nothing,
and a missing one lets a task start against code that doesn't exist yet.

**Each step within a task is one action**: invoke `fx-tdd`, write the tests,
run them, implement, run them, run the scope, commit. Two actions in one step means the
implementer can half-finish it and still tick the box.

### Wide refactors are the exception

A **wide refactor** is one mechanical change (rename a column, retype a shared
symbol) whose **blast radius** fans across the whole codebase, so a single
edit breaks thousands of call sites at once and **no vertical slice can land
green.** Do not force it into a tracer bullet. Sequence it **expand:contract**:

1. **Expand**: add the new form beside the old, so nothing breaks.
2. **Migrate**: move call sites over in batches sized by blast radius (per
   engine, per directory). Each batch is its own task, blocked by the expand.
   Each stays green **because the old form still exists.**
3. **Contract**: delete the old form once no caller remains, in a task
   blocked by every migrate batch.

**When even the batches cannot stay green alone**, keep the sequence but let
them share an integration branch that all block a final integrate-and-verify
task. **Green is promised only at that final task**: say so explicitly in
each batch task, or the implementer will chase a green that cannot exist.

### Phasing

More than 10 tasks → phase into independently shippable slices:

- **MVP**: the smallest slice that provides value
- **Core**: the complete happy path
- **Hardening**: edge cases, error handling
- **Polish**: optimization, monitoring

**Each phase must be mergeable on its own.**

## 5. Write plan.md and the tasks

```markdown
docs/plans/YYYY-MM-DD-<slug>/
  design.md        (already exists: never edit it from here)
  plan.md
  tasks/01-<slug>.md …
```

One task per file. **Never a single combined tasks file.**

Copy both templates from [templates.md](./templates.md) verbatim when you write plan.md and the task files.

## 6. Self-review: you run this, not a subagent

Fresh eyes on the design, then check the plan against it.

1. **Spec coverage.** Walk each requirement in `design.md`. Can you point to a
   task that implements it? List the gaps, and **add a task for each.**
2. **Placeholder scan.** Every pattern in "No placeholders" below. Fix them.
3. **Type consistency.** Do the signatures and property names used in later
   tasks match what earlier tasks declared? `clearLayers()` in task 03
   and `clearFullLayers()` in task 07 is a bug.
4. **Design headings resolve.** Every heading a task's `**Design:**` line
   names exists in `design.md`, spelled the same. `compile-brief` fails on a
   heading it cannot find.

5. **Review Focus.** For each input or failure the design implies, name the
   task whose Tests cover it. The rest go into plan.md's Review Focus (up to
   five) and into the owning task's Tests.
6. **Proportion.** A plan several times the design's length is a transcript:
   cut it back to decisions.

Fix inline. No need to re-review: fix and move on.

## 7. Red-team recommendation

Decide the recommendation now; it is offered as one option in §8, not as a
separate prompt. `fx-devils-advocate` costs a full subagent pass.

**Recommend YES when any of:** `Complexity: High` · any `HIGH` risk in the
header · a wide refactor · a data migration or anything irreversible · auth,
payment, or security-critical paths.

**Recommend SKIP otherwise.** Most plans do not need it.

## 8. Handoff: four ways to leave a finished plan

A finished plan has **four** legitimate next steps, not one. Offer all four
through the host's interactive question tool, the way `fx-brainstorm` §3
already does: never a bare "tell me when to start."

> "Plan and N tasks written to `docs/plans/<slug>/`. What next?"
> 1. **Start implementing**: hand off to `fx-implement`
> 2. **Red-team it**: `fx-devils-advocate` in plan mode. Recommended:
>    <yes|skip>: <one-line reason from §7>
> 3. **Keep discussing**: a decision in the plan isn't actually settled;
>    back to the interview
> 4. **Save for later**: the plan is good, the work isn't for now

**Wait for the answer. Do not default to option 1.**

- **Start implementing** → hand off to `fx-implement`. Never begin
  implementing from here.
- **Red-team it** → dispatch `fx-devils-advocate` in **plan mode** against
  `plan.md` on the most capable available model, with `model` set and
  `Capable because: plan red-team` as the prompt's first line (also reachable any time via `/fx:fx-critique plan <file>`). Present
  its numbered findings, then ask: discuss all / discuss some / continue. Do
  not start resolving until the user picks. Once resolved, ask this same
  four-way question again: the plan changed.

  **Then re-run §6.1 over what the findings changed.** Only over that: a
  finding that alters a requirement lands after the coverage walk has already
  passed, so nothing checks it, and a requirement that grew a second half keeps
  the task that owned its first half. For each resolved finding, name the task
  that now owns the changed requirement, and if the change added a place the
  behaviour must appear, say which task owns **that** place.
- **Keep discussing** → return to §1. The plan document stays on disk; treat
  the unresolved point as an open question and re-run the interview around it.
- **Save for later** → **fx has no representation for this anywhere else.**
  There is no "parked" state in the ledger and nothing revisits this plan on
  its own: until that exists, do the manual equivalent: leave the plan
  directory as it is (already durable, already on disk), write one line to
  `docs/plans/<slug>/state.md`: `Parked <date>: <one-line reason>`, and
  stop. Nothing else. Resuming later means a human opens the plan and picks
  this same menu again by hand.

**Unattended runs:** no human to pick → do not stall. Apply the §7
recommendation (run the red-team pass if it said YES, feed the `[blocks]`
findings into **one** bounded plan revision, and ledger each `[advisory]`
finding to `state.md` without editing the plan; log each finding's disposition), then default to **start implementing**. The methodology is
identical to the interactive path; only the "who decides" step changes.

---

## No placeholders: these are plan failures

Every step contains the actual content the implementer needs. Never write:

- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- A Tests entry without an exact expected value
- A rule repeated in several tasks: state it once in plan.md's Global Constraints
- References to types, functions or methods that no task defines

## Quality red flags: check before presenting

- [ ] Every task names its files (no line-number ranges)
- [ ] `Interfaces: Consumes / Produces` with exact signatures is present when a neighbour task consumes or produces a symbol
- [ ] Every Tests entry names an input and an exact expected value
- [ ] Blocking edges are real dependencies, not just ordering preferences
- [ ] Every task that mutates state outside git declares its idempotency
- [ ] Testing strategy present at both header and task level
- [ ] Each phase ships independently (more than 10 tasks)
- [ ] No step says "add validation"
- [ ] No step instructs a push, a merge, or an attribution trailer
- [ ] A wide refactor is sequenced expand:contract, not forced into a slice
- [ ] Every request/integration spec declares its type (`type: :request`)
      unless the project infers it from file location
- [ ] A requirement split across tasks names the owner of each half in both
      tasks.
- [ ] Every assertion on an error body states the error contract (exact
      message, key, or status) rather than a pattern that happens to match it
