# Domain Modeling

Actively build and sharpen the project's domain model **as you design**.

This is the *active* discipline: challenging terms, inventing edge-case
scenarios, and writing the glossary and decisions down **the moment they
crystallise.** Merely *reading* `CONTEXT.md` for vocabulary is not this — that's
a one-line habit any skill can do. This is for when you are **changing** the
model, not just consuming it.

## File structure

Most repos have a single context:

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

If a **`CONTEXT-MAP.md`** exists at the root, the repo has multiple contexts
and the map points to where each lives:

```
/
├── CONTEXT-MAP.md
├── docs/adr/                     ← system-wide decisions
└── engines/
    ├── engagement/
    │   ├── CONTEXT.md
    │   └── docs/adr/             ← context-specific decisions
    └── measurement/
        ├── CONTEXT.md
        └── docs/adr/
```

**Create files lazily** — only when you have something to write. No
`CONTEXT.md`? Create it when the first term resolves. No `docs/adr/`? Create it
when the first ADR is needed.

## During the session

**Challenge against the glossary.** When a term conflicts with the existing
language in `CONTEXT.md`, call it out immediately: *"Your glossary defines
'cancellation' as X, but you seem to mean Y. Which is it?"*

**Sharpen fuzzy language.** When a term is vague or overloaded, propose a
precise canonical one: *"You're saying 'account' — do you mean the Customer or
the User? Those are different things."*

**Discuss concrete scenarios.** Stress-test relationships with specific cases.
Invent scenarios that probe edge cases and force precision about the boundaries
between concepts.

**Cross-reference with code.** When the user states how something works, check
whether the code agrees. Contradiction → surface it: *"Your code cancels entire
Orders, but you just said partial cancellation is possible. Which is right?"*

**Update `CONTEXT.md` inline.** The moment a term resolves, write it down.
**Don't batch these** — capture them as they happen.

`CONTEXT.md` is **a glossary and nothing else.** It must be totally devoid of
implementation details. Never treat it as a spec, a scratch pad, or a home for
implementation decisions.

## CONTEXT.md format

```markdown
# <Context name>

<One or two sentences: what this context is and why it exists.>

## Language

**Order**:
A one-or-two-sentence description of the term.
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request
```

Rules:

- **Be opinionated.** When several words exist for one concept, pick the best
  and list the others under `_Avoid_`.
- **Keep definitions tight.** One or two sentences. Define what it **is**, not
  what it does.
- **Only terms specific to this project's context.** General programming
  concepts — timeouts, error types, utility patterns — don't belong even if the
  project uses them heavily. Ask: is this unique to this context, or a general
  programming concept? Only the former belongs.
- **Group under subheadings** when natural clusters emerge; a flat list is fine
  for a single cohesive area.

## ADRs — offer sparingly

Only offer one when **all three** are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful.
2. **Surprising without context** — a future reader will look at the code and
   wonder *"why on earth did they do it this way?"*
3. **The result of a real trade-off** — there were genuine alternatives and one
   was picked for specific reasons.

Missing any one → skip it. Easy to reverse, and you'll just reverse it. Not
surprising, and nobody will wonder. No real alternative, and there is nothing
to record beyond "we did the obvious thing."

### What qualifies

- **Architectural shape** — "we're using a monorepo"; "the write model is
  event-sourced, the read model projected into Postgres."
- **Integration patterns between contexts** — "Engagement and Measurement
  communicate via domain events, not synchronous HTTP."
- **Technology choices that carry lock-in** — database, message bus, auth
  provider, deployment target. Not every library: the ones that would take a
  quarter to swap out.
- **Boundary and scope decisions** — "Customer data is owned by the Customer
  context; other contexts reference it by ID only." **The explicit no's are as
  valuable as the yes's.**
- **Deliberate deviations from the obvious path** — "we use manual SQL instead
  of the ORM here because X." Anything a reasonable reader would assume the
  opposite of. **These stop the next engineer from "fixing" something that was
  deliberate.**
- **Constraints not visible in the code** — "we can't use AWS because of
  compliance"; "responses must be under 200 ms because of the partner API
  contract."
- **Rejected alternatives when the rejection is non-obvious** — considered
  GraphQL and picked REST for subtle reasons? Record it, or someone suggests
  GraphQL again in six months.

### ADR format

`docs/adr/NNNN-slug.md`, sequential. Scan the directory for the highest number
and increment.

```markdown
# <Short title of the decision>

<1–3 sentences: what's the context, what did we decide, and why.>
```

**That's it.** An ADR can be a single paragraph. The value is in recording
*that* a decision was made and *why*, not in filling out sections.

Optional, only when they add genuine value — most ADRs need none:

- **Status** frontmatter (`proposed | accepted | deprecated | superseded by
  ADR-NNNN`) — useful when decisions get revisited
- **Considered Options** — only when the rejected alternatives are worth
  remembering
- **Consequences** — only when non-obvious downstream effects need calling out

## Where this is used

`fx-brainstorm` (terms resolving mid-interview) · `fx-architecture` (naming a
deepened module, recording a rejection so future reviews don't re-suggest it) ·
`fx-plan` (ticket titles use the glossary's vocabulary).

An ADR in the area you're touching **records a decision not to re-litigate.**
