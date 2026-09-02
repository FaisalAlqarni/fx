# Codebase Design

Shared vocabulary for designing **deep modules**: a lot of behaviour behind a
small interface, placed at a clean seam, testable through that interface. The
aim is **leverage** for callers, **locality** for maintainers, and testability
for everyone.

This file is the whole topic: the vocabulary, how to **deepen** a cluster of
shallow modules given its dependencies, and how to **design it twice** when the
interface shape is still open.

Consulted by `fx-brainstorm` (unit boundaries), `fx-tdd` (where a seam goes),
`fx-review` (structure findings) and `fx-architecture` (its whole vocabulary).
**It is a reference to consult, not a session to run.**

## Glossary

Use these terms exactly. **Don't substitute "component", "service", "API", or
"boundary".** Consistent language is the whole point.

**Module**: anything with an interface and an implementation. Deliberately
scale-agnostic: a function, a class, a package, a tier-spanning slice.
*Avoid:* unit, component, service.

**Interface**: everything a caller must know to use the module correctly: the
type signature, but also **invariants, ordering constraints, error modes,
required configuration, and performance characteristics.**
*Avoid:* API, signature: too narrow, they refer only to the type-level surface.

**Implementation**: what's inside a module, its body of code. Distinct from
**adapter**: a thing can be a small adapter with a large implementation (a
Postgres repository) or a large adapter with a small implementation (an
in-memory fake). Reach for "adapter" when the seam is the topic;
"implementation" otherwise.

**Depth**: **leverage at the interface.** The amount of behaviour a caller (or
a test) can exercise per unit of interface they have to learn. A module is
**deep** when a large amount of behaviour sits behind a small interface,
**shallow** when the interface is nearly as complex as the implementation.

**Seam** *(Michael Feathers)*: a place where you can alter behaviour **without
editing in that place**; the *location* at which a module's interface lives.
Where to put the seam is its own design decision, distinct from what goes
behind it. *Avoid:* boundary: overloaded with DDD's bounded context.

**Adapter**: a concrete thing that satisfies an interface at a seam. Describes
**role** (what slot it fills), not substance (what's inside).

**Leverage**: what callers get from depth. More capability per unit of
interface they learn. One implementation pays back across N call sites and M
tests.

**Locality**: what maintainers get from depth. Change, bugs, knowledge and
verification **concentrate in one place** rather than spreading across callers.
Fix once, fixed everywhere.

## Deep vs shallow

**Deep** = small interface + lots of implementation:

```
┌─────────────────────┐
│   Small Interface   │  ← few methods, simple params
├─────────────────────┤
│                     │
│  Deep Implementation│  ← complex logic hidden
│                     │
└─────────────────────┘
```

**Shallow** = large interface + little implementation (avoid):

```
┌─────────────────────────────────┐
│       Large Interface           │  ← many methods, complex params
├─────────────────────────────────┤
│  Thin Implementation            │  ← just passes through
└─────────────────────────────────┘
```

When designing an interface, ask: can I reduce the number of methods? Can I
simplify the parameters? Can I hide more complexity inside?

## Principles

- **Depth is a property of the interface, not the implementation.** A deep
  module can be internally composed of small, mockable, swappable parts; they
  just aren't part of the interface. A module can have **internal seams**
  (private to its implementation, used by its own tests) as well as the
  **external seam** at its interface.
- **The deletion test.** Imagine deleting the module. If complexity **vanishes**,
  it was a pass-through. If complexity **reappears across N callers**, it was
  earning its keep.
- **The interface is the test surface.** Callers and tests cross the same seam.
  If you want to test *past* the interface, the module is probably the wrong
  shape.
- **One adapter means a hypothetical seam. Two adapters means a real one.**
  Don't introduce a seam unless something actually varies across it.

## Designing for testability

**1. Accept dependencies, don't create them.**

```ruby
# Testable
def process_order(order, gateway) = gateway.charge(order.total)

# Hard to test
def process_order(order) = StripeGateway.new.charge(order.total)
```

**2. Return results, don't produce side effects.**

```ruby
# Testable
def calculate_discount(cart) = Discount.new(...)

# Hard to test
def apply_discount!(cart) = cart.total -= discount
```

**3. Small surface area.** Fewer methods = fewer tests needed. Fewer params =
simpler test setup.

## Relationships

- A **Module** has exactly one **Interface**: the surface it presents to
  callers and tests.
- **Depth** is a property of a **Module**, measured against its **Interface**.
- A **Seam** is where a **Module**'s **Interface** lives.
- An **Adapter** sits at a **Seam** and satisfies the **Interface**.
- **Depth** produces **Leverage** for callers and **Locality** for maintainers.

## Rejected framings

- **Depth as a ratio of implementation-lines to interface-lines** (Ousterhout)
 : rewards padding the implementation. Use depth-as-leverage instead.
- **"Interface" as the language's `interface` keyword, or a class's public
  methods**: too narrow. Interface here includes *every fact a caller must
  know*.
- **"Boundary"**: overloaded with DDD's bounded context. Say **seam** or
  **interface**.

## Deepening

How to deepen a cluster of shallow modules safely, **given its dependencies.**
Uses the vocabulary above: module · interface · seam · adapter.

### Dependency categories

When assessing a candidate, classify its dependencies. **The category
determines how the deepened module is tested across its seam.**

#### 1. In-process

Pure computation, in-memory state, no I/O.

**Always deepenable:** merge the modules and test through the new interface
directly. No adapter needed.

#### 2. Local-substitutable

Dependencies with local test stand-ins: a real Postgres in Docker, an
in-memory filesystem, a test ClickHouse.

**Deepenable if the stand-in exists.** The deepened module is tested with the
stand-in running in the suite. **The seam is internal; no port at the module's
external interface.**

#### 3. Remote but owned: ports & adapters

Your own services across a network boundary: another engine over gRPC, an
internal API, a queue consumer.

Define a **port** (interface) at the seam. **The deep module owns the logic;
the transport is injected as an adapter.** Tests use an in-memory adapter;
production uses an HTTP/gRPC/queue adapter.

Recommendation shape: *"Define a port at the seam, implement an HTTP adapter
for production and an in-memory adapter for testing, so the logic sits in one
deep module even though it's deployed across a network."*

#### 4. True external: mock

Third-party services you don't control: a payment gateway, an SMS provider, a
push service.

The deepened module takes the external dependency as an **injected port**;
tests provide a mock adapter.

### Seam discipline

- **One adapter means a hypothetical seam. Two adapters means a real one.**
  Don't introduce a port unless at least two adapters are justified: typically
  production plus test. **A single-adapter seam is just indirection.**
- **Internal seams vs external seams.** A deep module can have internal seams,
  private to its implementation and used by its own tests, as well as the
  external seam at its interface. **Don't expose internal seams through the
  interface just because tests use them.**

### Testing strategy: replace, don't layer

- Old unit tests on the shallow modules **become waste** once tests at the
  deepened module's interface exist. **Delete them.**
- Write new tests **at the deepened module's interface**. The interface is the
  test surface.
- Assert on **observable outcomes through the interface**, never internal state.
- Tests should survive internal refactors, since they describe behaviour rather
  than implementation. **If a test has to change when the implementation
  changes, it is testing past the interface.**

## Design It Twice

For exploring alternative interfaces for a chosen deepening candidate, using
parallel sub-agents. After Ousterhout: **your first idea is unlikely to be the
best.**

Vocabulary: the Glossary above: module · interface · seam · adapter ·
leverage.

### 1. Frame the problem space

Before spawning anything, write a **user-facing** explanation of the problem
space for the chosen candidate:

- The **constraints** any new interface would need to satisfy
- The **dependencies** it relies on, and which category they fall into
  (see *Dependency categories* above)
- A rough **illustrative code sketch** to ground the constraints: not a
  proposal, just a way to make the constraints concrete

Show this to the user, then **immediately proceed to step 2.** The user reads
and thinks while the sub-agents work in parallel.

### 2. Spawn sub-agents

Spawn **3 or more in parallel.** Each must produce a **radically different**
interface for the deepened module.

Prompt each with a **separate technical brief**: file paths, coupling details,
the dependency category from *Dependency categories* above, what sits behind
the seam. **The brief is independent of the user-facing explanation from step
1.**

Give each a different design constraint:

- **Agent 1**: "Minimize the interface: aim for 1 to 3 entry points max. Maximise
  leverage per entry point."
- **Agent 2**: "Maximise flexibility: support many use cases and extension."
- **Agent 3**: "Optimise for the most common caller: make the default case
  trivial."
- **Agent 4** *(if applicable)*: "Design around ports & adapters for
  cross-seam dependencies."

**Include both this file's vocabulary and the project's `CONTEXT.md`
vocabulary in every brief**, so each sub-agent names things consistently with
the architecture language *and* the domain language.

Each sub-agent outputs:

1. **Interface**: types, methods, params, plus **invariants, ordering, error
   modes**
2. **Usage example** showing how callers use it
3. **What the implementation hides** behind the seam
4. **Dependency strategy and adapters** (see *Dependency categories* above)
5. **Trade-offs**: where leverage is high, where it's thin

### 3. Present and compare

Present the designs **sequentially**, so the user can absorb each one, then
compare them in prose.

Contrast by **depth** (leverage at the interface), **locality** (where change
concentrates), and **seam placement**.

Then give **your own recommendation**: which design is strongest and why. If
elements from different designs would combine well, propose a hybrid.

**Be opinionated: the user wants a strong read, not a menu.**

## Companion references

None. Deepening and design-it-twice used to be peer files and are now sections
of this one: a lane pulls this single file and has the whole topic. References
are leaves: no reference links to another reference, because nested references
get partially read.
