---
name: fx-plan
description: >
  Use when an approved design exists and the work needs breaking down, or on
  "break this down", "make tasks", "write the plan", "how do we build this",
  "what are the steps", "plan this out", "sequence this work". Requires an
  approved design — if there is none, use fx-brainstorm.
---

# fx-plan

Announce: "Using fx-plan to break this into tasks."

Input: `docs/plans/YYYY-MM-DD-<slug>/design.md`, approved.
No approved design → stop and route to `fx-brainstorm`. Do not plan from a
conversation alone.

## Who you are writing for

Write the plan assuming the implementer has **zero context for this codebase
and questionable taste**. Document what they need: which files to touch, the
code and interfaces involved, the tests, the docs to check, how to verify.
Give them the whole plan as **bite-sized tasks**.

Assume they are a **skilled developer** who knows **almost nothing about our
toolset or problem domain**, and **does not know good test design well**. That
assumption sets the detail level for everything below. Write less and you are
guessing on their behalf.

DRY. YAGNI. TDD.

## 1. Restate the requirements — before writing anything

**Requirements as I understand them:**
- <requirement, in your own words>
- <requirement>
- <assumption you are making>

**Wait for confirmation.** Misunderstandings caught here save hours of wasted
implementation. This is the cheapest gate in the whole pipeline.

## 2. Scope check

If the design covers multiple independent subsystems it should have been split
during brainstorming. If it wasn't, say so and suggest separate plans — one per
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
  large files, do not unilaterally restructure — but if a file you are
  modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition. Each task produces
self-contained changes that make sense independently.

## 4. Draft vertical slices

**Explore the codebase first** if you haven't already — you cannot size a
task against code you haven't read. Look specifically for **prefactoring
opportunities** that would make the implementation easier.

Each task is a **tracer bullet**: a narrow but COMPLETE path through every
layer — schema, domain, controller/endpoint, view/API, tests. **Vertical, never
a horizontal slice of one layer.**

- Demoable or verifiable on its own
- **Sized to fit one fresh context window**
- Prefactoring first — *"make the change easy, then make the easy change"*

Look for prefactoring opportunities that make the implementation easier, and
sequence them first.

Task titles and descriptions use the domain vocabulary from `CONTEXT.md`, and
respect the ADRs in the area you are touching.

**Right-sizing.** A task is the smallest unit that carries its own test cycle
and is worth a fresh reviewer's gate. Fold setup, configuration, scaffolding
and documentation into the task whose deliverable needs them. Split only
where a reviewer could meaningfully reject one task while approving its
neighbor. Every task ends with an independently testable deliverable.

**Blocking edges.** Give each task the tasks that must complete before it
can start. A task with no blockers can start immediately. Number from `01` in
dependency order, blockers first.

These edges define the **frontier** `fx-implement` works: any task whose
blockers are all done. For a purely linear chain that means top to bottom. Get
them right — an edge that isn't a real dependency serialises work for nothing,
and a missing one lets a task start against code that doesn't exist yet.

**Each step within a task is one action** — write the failing test, run it,
implement, run it, run the suite, commit. Two actions in one step means the
implementer can half-finish it and still tick the box.

### Wide refactors are the exception

A **wide refactor** is one mechanical change — rename a column, retype a shared
symbol — whose **blast radius** fans across the whole codebase, so a single
edit breaks thousands of call sites at once and **no vertical slice can land
green.** Do not force it into a tracer bullet. Sequence it **expand–contract**:

1. **Expand** — add the new form beside the old, so nothing breaks.
2. **Migrate** — move call sites over in batches sized by blast radius (per
   engine, per directory). Each batch is its own task, blocked by the expand.
   Each stays green **because the old form still exists.**
3. **Contract** — delete the old form once no caller remains, in a task
   blocked by every migrate batch.

**When even the batches cannot stay green alone**, keep the sequence but let
them share an integration branch that all block a final integrate-and-verify
task. **Green is promised only at that final task** — say so explicitly in
each batch task, or the implementer will chase a green that cannot exist.

### Phasing

More than 10 tasks → phase into independently shippable slices:

- **MVP** — the smallest slice that provides value
- **Core** — the complete happy path
- **Hardening** — edge cases, error handling
- **Polish** — optimization, monitoring

**Each phase must be mergeable on its own.**

## 5. Write plan.md and the tasks

```
docs/plans/YYYY-MM-DD-<slug>/
  design.md        (already exists — never edit it from here)
  plan.md
  tasks/01-<slug>.md …
```

One task per file. **Never a single combined tasks file.**

## 6. Self-review — you run this, not a subagent

Fresh eyes on the design, then check the plan against it.

1. **Spec coverage.** Walk each requirement in `design.md`. Can you point to a
   task that implements it? List the gaps — and **add a task for each.**
2. **Placeholder scan.** Every pattern in "No placeholders" below. Fix them.
3. **Type consistency.** Do the signatures and property names used in later
   tasks match what earlier tasks declared? `clearLayers()` in task 03
   and `clearFullLayers()` in task 07 is a bug.

Fix inline. No need to re-review — fix and move on.

## 7. Offer the red-team — do not run it unprompted

`fx-devils-advocate` costs a full subagent pass. **Offer it with a
recommendation** so it can be waved through.

**Recommend YES when any of:** `Complexity: High` · any `HIGH` risk in the
header · a wide refactor · a data migration or anything irreversible · 10+
tasks · auth, payment, or security-critical paths.

**Recommend SKIP otherwise.** Most plans do not need it.

> "Plan written: N tasks. Red-team it before we start?
> Recommended: <yes|skip> — <one-line reason>."

On approval — or on `/fx:critique plan <file>` at any time — dispatch
`fx-devils-advocate` in **plan mode** against `plan.md`.
Present its numbered findings, then ask: discuss all / discuss some / continue.
**Do not start resolving until the user picks.**

**Unattended runs:** when there is no human to pick, do not stall. Feed the
findings into **one** bounded plan revision, log each finding and its
disposition to `state.md`, and carry on. The methodology is identical; only the
"who decides" step changes.

## 8. Handoff

"Plan and N tasks written to `docs/plans/<slug>/`. Review and tell me when to
start." **Wait.**

Approved → `fx-implement`. Never begin implementing from here.

---

## plan.md template

```markdown
# <Feature> — implementation plan

> **For agents:** implement task by task via `fx-implement`.
> Steps use `- [ ]` checkboxes.

**Design:** `./design.md`
**Goal:** one sentence describing what this builds.
**Architecture:** 2–3 sentences on the approach.
**Stack:** key technologies.
**Complexity:** High | Medium | Low
**Risks:**
- HIGH: <risk> — <mitigation>
- MEDIUM: <risk> — <mitigation>
**Testing:** Unit: <what> · Integration: <what> · E2E: <if applicable>

## Global Constraints

<The design's project-wide requirements — version floors, dependency limits,
naming and copy rules, platform requirements, locale/RTL rules. One line each,
**exact values copied verbatim from the design.** Every task's requirements
implicitly include this section, and it is what the reviewer is handed as its
attention lens.>

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | … | none | … | MVP |
| 02 | … | 01 | … | MVP |
```

## tasks/NN-<slug>.md template

````markdown
# 03 — <title>

**Status:** ready-for-agent
**Blocked by:** 01, 02   (or "None — can start immediately")
**Phase:** MVP

**What to build:** the end-to-end behavior this makes work, from the user's
perspective. Not a layer-by-layer implementation list.

**Files:**
- Create: `engines/core/app/domain/foo.rb`
- Modify: `engines/core/app/models/bar.rb`
- Test:   `engines/core/spec/domain/foo_spec.rb`

  No line-number ranges — they rot within a day. File paths are stable enough
  to be worth naming; `existing.rb:123-145` is not.

**Interfaces:**
- Consumes: `Bar#baz(id:) -> Baz`  (from task 01)
- Produces: `Foo.call(bar:, at:) -> Result<Foo, Error>`

  The implementer sees only its own task. **This block is how it learns the
  names and types its neighbours use.** Exact signatures, or it is useless.

**Seam:** <the confirmed seam this is tested at, from design.md>

**Risks:** <what could go wrong here and how to avoid it — omit if none>

**Idempotency:** <why re-running this is safe — existence guards,
`IF NOT EXISTS`, upserts, commit-only-if-dirty. **Required for any task that
mutates state or commits**, because a resumed run re-executes tasks and a
non-idempotent one corrupts state or double-writes.>

**Testing:** <how this deliverable is verified — unit / integration / system>

## Acceptance criteria
- [ ] …
- [ ] …

## Steps

- [ ] **1. Write the failing test**

```ruby
RSpec.describe Foo do
  it "returns a failure when bar is archived" do
    expect(Foo.call(bar: archived_bar, at: now)).to be_failure
  end
end
```

- [ ] **2. Run it — verify RED**

Run: `docker compose exec shared bundle exec rspec engines/core/spec/domain/foo_spec.rb`
Expected: FAIL — `uninitialized constant Foo`
(Compile-time RED is equally valid on C#/Kotlin/Swift.)

- [ ] **3. Implement the minimum that passes**

No code here — `fx-tdd` drives it from the failing test. Pre-writing the
implementation defeats TDD and goes stale.

- [ ] **4. Run it — verify GREEN**

Run: same command. Expected: PASS, output pristine.

- [ ] **5. Run the engine suite**

Run: `make test-core`

- [ ] **6. Commit**

```
git add engines/core/app/domain/foo.rb engines/core/spec/domain/foo_spec.rb
git commit -m "feat(core): add Foo"
```

No attribution trailers. Then continue to the next task — never stop and
wait.
````

**Test code is written out; implementation code is not.** The test is the
behavioral spec and it makes verify-RED possible. The implementation is
`fx-tdd`'s job, doubles the plan's size, and is the part most likely to rot.

**Exception:** a snippet that encodes a decision more precisely than prose can
— a state machine, a schema, a type shape — is inlined in the relevant task,
trimmed to the decision-rich part. Note that it came from a prototype.

---

## No placeholders — these are plan failures

Every step contains the actual content the implementer needs. Never write:

- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" — without the actual test code
- "Similar to task N" — repeat it; tasks get read out of order
- A step describing *what* to do without showing *how*
- References to types, functions or methods that no task defines

## Quality red flags — check before presenting

- [ ] Every task names its files (no line-number ranges)
- [ ] Every task has `Interfaces: Consumes / Produces` with exact signatures
- [ ] Blocking edges are real dependencies, not just ordering preferences
- [ ] Every mutating or committing task declares its idempotency
- [ ] Testing strategy present at both header and task level
- [ ] Each phase ships independently (10+ tasks)
- [ ] No step says "add validation"
- [ ] No step instructs a push, a merge, or an attribution trailer
- [ ] A wide refactor is sequenced expand–contract, not forced into a slice
