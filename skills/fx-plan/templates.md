## plan.md template

The block at the top is not decoration. Whoever builds this plan is very likely
a **different session** from the one that wrote it, opening a repo of finished
artifacts with no memory of how they got there. The bootstrap they see is
generic and is read before they have looked at the repo. This file is the one
thing guaranteed to be read by anyone about to act on it, so the handoff lives
here or nowhere. Copy it verbatim.

```markdown
# <Feature>: implementation plan

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
**Goal:** one sentence describing what this builds.
**Architecture:** 2 to 3 sentences on the approach.
**Stack:** key technologies.
**Complexity:** High | Medium | Low
**Risks:**
- HIGH: <risk>: <mitigation>
- MEDIUM: <risk>: <mitigation>
**Testing:** Unit: <what> · Integration: <what> · E2E: <if applicable>

## Global Constraints

<The design's project-wide requirements: version floors, dependency limits,
naming and copy rules, platform requirements, locale/RTL rules. One line each,
**exact values copied verbatim from the design.** Every task's requirements
implicitly include this section, and it is what the reviewer is handed as its
attention lens.>

- Locale: Arabic is the default locale, with RTL support throughout. Keep this
  line unless the design names another default locale.

## Review Focus

<Up to five lines, each: the input or condition the design implies and no task
tests, the behaviour a reasonable user expects, and the owning task. Every
reviewer receives this list beside Global Constraints. Empty means checked and
none found.>

- <Empty tenant list>: <shows the empty state> (task 01).

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | … | none | … | MVP |
| 02 | … | 01 | … | MVP |
```

## tasks/NN-<slug>.md template

````markdown
# 03: <title>

**Status:** ready-for-agent
**Blocked by:** 01, 02   (or "None: can start immediately")
**Phase:** MVP

**What to build:** the end-to-end behavior this makes work, from the user's
perspective. Not a layer-by-layer implementation list.

**Design:** Data model; Request flow > 2   (headings of `design.md`, `Heading`
or `Heading > N`, separated by `;`. `compile-brief` copies these passages into
the implementer's brief.)

**Stack:** rails/Testing; rails/Migrations   (`stack/Heading`, separated by
`;`. Omit the line to give the implementer every stack file.)

**Files:**
- Create: `engines/core/app/domain/foo.rb`
- Modify: `engines/core/app/models/bar.rb`
- Test:   `engines/core/spec/domain/foo_spec.rb`

  No line-number ranges: they rot within a day. File paths are stable enough
  to be worth naming; `existing.rb:123-145` is not.

**Interfaces:** (required when a neighbour task consumes or produces a symbol)
- Consumes: `Bar#baz(id:) -> Baz`  (from task 01)
- Produces: `Foo.call(bar:, at:) -> Result<Foo, Error>`

  The implementer sees only its own task. **This block is how it learns the
  names and types its neighbours use.** Exact signatures, or it is useless.

**Not this task:** <adjacent behaviour> (task NN)   (optional; omit if none)

**Seam:** <the confirmed seam this is tested at, from design.md>

**Tests:**
- `Foo.call` on an archived bar: input `bar: archived_bar, at: now`; returns a
  failure whose error is `:bar_archived`.
- `Foo.call` on an active bar: input `bar: active_bar, at: now`; returns a
  success holding a `Foo` with `bar_id` equal to the bar's id.

  One entry per test: its name, its input, and the **exact expected value or
  error contract** (exact message, key or status). No test code: the
  implementer writes each test through `fx-tdd` against real code. An entry
  with no exact expected value is a placeholder.

**Risks:** <what could go wrong here and how to avoid it: omit if none>

**Idempotency:** <why re-running this is safe: existence guards,
`IF NOT EXISTS`, upserts. **Required for any task that mutates state outside
git** (a database, a file outside the repository, an external service),
because a resumed run re-executes tasks and a non-idempotent one corrupts
state or double-writes. Omit for a text edit.>

**Testing:** <how this deliverable is verified: unit / integration / system>

## Acceptance criteria
- [ ] …
- [ ] …

<!--
Two rules for writing these, both learned by watching criteria pass over a
broken feature.

**A criterion that says a thing exists is satisfied by a test that asks for it
directly, and that does not prove anyone can get to it.** Per-record tests fetch
the record's path, which is right for testing the page and silently assumes a
route in that nothing checks. When a story depends on someone
arriving somewhere, say so in the criterion and assert it by **following the
link**, not by fetching the path.

**Reachability has two halves, and following the link only proves the first.**
Getting to the control is one; the control pointing at the right thing is the
other. Assert against what
the page actually contains, the form's own `action` and `method`, not against
the route you believe it uses.

**Write criteria for the successful path, not only its guards.** Refusals are
easy to state and easy to test, so a task drifts into a list of them. The refusals are the fence; the story is the field.
-->


## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names**

- [ ] **3. Run them: verify RED**

Run: `docker compose exec shared bundle exec rspec engines/core/spec/domain/foo_spec.rb`
Expected: each test fails because the behavior is missing, not because of a
typo. (Compile-time RED is equally valid on C#/Kotlin/Swift.)

- [ ] **4. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing tests.

- [ ] **5. Run them: verify GREEN**

Run: same command. Expected: PASS, output pristine.

- [ ] **6. Run the scope**

Run: `make test-core`

- [ ] **7. Commit by path**

```
git add engines/core/app/domain/foo.rb engines/core/spec/domain/foo_spec.rb
git commit -m "feat(core): add Foo"
```

No attribution trailers. Then continue to the next task: never stop and
wait.
````

**Stage by path, never `-A` or `.`, and write the paths into the task.** The
example above does this and it is a rule, not a style. The working tree during a
task holds things the task did not write: the controller's ledger edits land
there continuously, and a second writer's half-finished work lands there if two
tasks ever overlap. `-A` sweeps all of it into the task's commit, which is how a
task diff stops being the thing its review was scoped to.
The **Files** section already lists exactly what to stage.

**Tests are specified in the Tests field and written by the implementer
through `fx-tdd` against real code.** Neither test code nor implementation code
goes in the task: code nobody has run goes stale and wrong, and the implementer
sees the real code you cannot. The Tests field's exact-expected-value rule is
what keeps a prose spec as precise as code.

**Exception:** a snippet that encodes a decision more precisely than prose can
(a schema, a state machine, a type shape) may still be inlined in the relevant
task, trimmed to the decision-rich part. Note its source, such as a prototype.
