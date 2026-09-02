# Writing Good Tests

**Load when:** writing or changing tests, adding mocks, or adding
cleanup/helper methods for tests.

Two principles govern everything here:

```
1. Every test names the break it catches
2. Every test exercises the real thing
```

Strict TDD produces both naturally: a test written first and watched failing
against real code has already proven it can fail, and only earns a mock when
the real dependency proves slow or external.

---

## Principle 1: Name the break

Before writing the test body, answer: **what production change should make this
test fail, and is that change a bug or a decision?** A test earns its place by
catching a wrong branch, a missing side effect, a wrong argument, a boundary
case, or a broken contract.

### Derive expectations independently

Use literals and hand-checked fixtures. Table-driven tests with literal
expected values are the preferred shape. An expectation computed by the code
under test, or its helpers: passes no matter what that code does.

```ruby
# ❌ Mirror assertion: the same builder computes both sides — always true
expected = build_search_query(tag: "urgent")
expect(build_search_query(tag: "urgent")).to eq(expected)

# ✅ Hand-derived literal
expect(build_search_query(tag: "urgent")).to eq('tag:"urgent"')
```

```ruby
# ❌ Tautological: the expected value is recomputed the way the code computes it
items = [{ price: 10 }, { price: 5 }]
expected = items.sum { |i| i[:price] }
expect(calculate_total(items)).to eq(expected)

# ✅ Independent, known literal
expect(calculate_total([{ price: 10 }, { price: 5 }])).to eq(15)
```

### No change detectors

If only intentional decisions can fail a test (a constant's value, exact
message wording, private structure) it fires on redesign and sleeps through
bugs. Test the behavior that depends on the decision: not
`expect(MAX_RETRIES).to eq(5)` but *"a failing call is retried 5 times and the
6th attempt never happens."*

### Behavior, not text

Asserting that a script, skill, or config **contains** an exact line proves only
that the source is the source. Run scripts against controlled inputs and assert
outputs, side effects, or exit codes. Documents that instruct agents are tested
by the consuming agent's behavior; prose for humans earns no test at all.

### Your code, not the framework

Test the contract your code makes at its boundaries: the route you register,
the query you emit, the payload you produce. Upstream mechanics are their
maintainers' tests to write. (The classic: asserting that your router invokes a
registered handler: that is Rails' test, not yours.)

When upstream behavior genuinely surprised you, write **one** narrow
characterization test naming the assumption.

The same boundary applies inside your code: constructors, getters, constants
and trivial forwarding earn tests only when they **validate, normalize,
default, derive, enforce, or cause side effects**. Otherwise assert the first
consumer-visible result that depends on them.

### Gate function

```
BEFORE writing the test body:
  Name the production change that would make this test fail.

  Cannot name one            → redesign around an observable behavior
  "The source text changed"  → run the artifact and assert its effects
  Only intentional decisions → change detector; test the behavior
                               that depends on the decision

  Confirm the expected value is derived WITHOUT the code under test.
  IF it reuses the code's logic or helpers:
    Replace it with a literal or hand-checked fixture
```

---

## Principle 2: Exercise the real thing

### The mock earns no assertions

A mock assertion passes when the mock is present and fails when it is absent: it says nothing about the component. Assert the real component's behavior; if
the mock is what you're checking, unmock it or delete the assertion.

The user's correction, verbatim: **"Are we testing the behavior of a mock?"**

### Verify through the interface, not around it

```ruby
# ❌ Bypasses the interface to verify
it "creates a user" do
  create_user(name: "Alice")
  expect(ActiveRecord::Base.connection.select_one("SELECT * FROM users WHERE name='Alice'")).to be_present
end

# ✅ Verifies through the interface
it "makes the user retrievable" do
  user = create_user(name: "Alice")
  expect(get_user(user.id).name).to eq("Alice")
end
```

### Mock at system boundaries only

**Mock:** external APIs (payment, email, SMS) · time and randomness · the file
system (sometimes) · databases (sometimes: prefer a real test DB).

**Never mock:** your own classes and modules · internal collaborators ·
anything you control.

### Mock at the right level

Learn **every side effect** of the real method before replacing it. Mock the
slow or external operation and keep what the test depends on **real**. When
unsure, run the test against the real implementation first and observe what
actually needs to happen.

A mock that swallows a write some other part of the test depends on turns a
green test into a lie.

### Design for mockability at the boundary

**Inject dependencies rather than constructing them.**

```ruby
# Easy to mock
def process_payment(order, gateway) = gateway.charge(order.total)

# Hard to mock
def process_payment(order) = MyFatoorah::Client.new(ENV["KEY"]).charge(order.total)
```

**Prefer SDK-style interfaces over one generic fetcher.** A specific method per
external operation means each mock returns one shape, with no conditional logic
inside the mock, and it's visible which endpoints a test exercises.

### Make doubles specific

When arguments, call counts, or ordering are part of the contract, assert them: a fake that accepts anything verifies nothing. Give each branch (success,
error, malformed) its own fixture or spy, so the wrong branch cannot satisfy
the expectation.

### Mirror real data completely

Mock the **complete** structure as it exists in reality (every documented
field) not just the ones your test reads. **Partial mocks fail silently when
downstream code reads an omitted field: the test passes while integration
breaks.**

### Production classes carry production methods only

Cleanup that only tests need lives in test utilities, never as a `destroy!` on
the production class. Ask: is this method called only from tests? Does this
class own this resource's lifecycle? Wrong answers → test utility.

### Prefer real components over complex mocks

When mock setup outgrows the test logic, when mocks miss methods the real
components have, or when tests break because the mock changed: switch to an
integration test with real components.

The user's question, verbatim: **"Do we need to be using a mock here?"**

### Testing non-deterministic behavior

When behavior is genuinely non-deterministic (a background thread, a job
queue, a timer, a race between two writers) **the seam is not optional.**
Inject the collaborator that decides timing and assert on it directly, rather
than asserting on the outcome through the race it creates.

**Polling with a deadline is not the fix.** A test that fires the async work,
then polls until a row appears or a deadline expires, looks like it handles
the non-determinism: it works around it instead. It **passes for the wrong
implementation**: code that writes synchronously on the calling thread
satisfies the same poll, so the test cannot tell "runs in the background" from
"runs immediately." And it **hangs or flakes for the right one**: real async
work has real tail latency (GC pause, pool contention, a slow runner), so a
deadline short enough to keep the suite fast is too short for the slow tail,
and one long enough to survive it slows every run. Neither failure is about
your code: both are about testing a race instead of the decision that
produces it.

**Inject the collaborator.** Give the code the thing that runs the async
work (an executor, a job class, a scheduler) as an argument, not a
hardcoded `Thread.new`. The test substitutes one it controls and asserts the
work was scheduled, with no polling and no deadline:

```ruby
# Hard to test — the seam is buried inside the method
def notify_subscribers(event)
  Thread.new { SubscriberMailer.broadcast(event) }
end

# Testable — the collaborator is a seam
def notify_subscribers(event, executor: Concurrent::SingleThreadExecutor.new)
  executor.post { SubscriberMailer.broadcast(event) }
end
```

**A returned handle is a legitimate seam.** If the work must run elsewhere,
return something the caller, and the test: can join: a `Thread`, a
`Future`, a job ID to wait on directly instead of inferring completion from a
side effect. `result = notify_subscribers(event); result.join; assert …`
exercises the same path production uses and fails deterministically instead
of flakily.

**A test-only synchronous path is a real trade, not a shortcut.** Running
inline under test and async in production (`inline: true`, `Rails.env.test?`)
is a legitimate seam with one real cost: production runs code the tests never
exercise: the actual thread, the actual queue, the actual race. That trade is
correct when the async wrapper is thin and already trustworthy (a job
library, a pool from a gem) and what you're protecting is the logic *inside*
the block. It stops being correct once the async mechanics themselves (retry, ordering, backpressure) are what you're building; that needs its own
test that runs for real.

**A spawned thread in Rails needs its own connection.** ActiveRecord checks a
connection out of the pool per thread; a thread you spawn does not inherit
the request's connection or transaction and must check out its own
(`ActiveRecord::Base.connection_pool.with_connection { … }`), or it blocks
waiting for a connection a transactional test fixture is holding. This is
also why a spawned thread can appear not to see data a test just wrote: a
request spec rolls back its transaction at the end, and a thread on a
different connection sees only what committed outside it. **That behavior is
a property of the test harness, not of the code under test**: decide it
deliberately rather than debugging it as a feature bug.

### Gate function

```
BEFORE adding a mock or test helper:
  List the real method's side effects; keep the ones the test
  depends on real — mock the slow/external level below them.

  Mock responses mirror the complete real structure.

  A method only tests call lives in test utilities, not production.

  About to assert on the mock itself?
    Unmock it or delete the assertion.
```

---

## What a good test looks like

```ruby
# ✅ Integration-style: through the real interface
it "lets a user check out with a valid cart" do
  cart = create_cart
  cart.add(product)
  expect(checkout(cart, payment_method).status).to eq("confirmed")
end
```

- Tests behavior callers care about
- Public API only
- Survives internal refactors
- Describes **what**, not **how**
- One logical assertion

```ruby
# ❌ Implementation-detail test
it "calls PaymentService#process" do
  expect(payment_service).to receive(:process).with(cart.total)
  checkout(cart, payment)
end
```

Red flags: mocking internal collaborators · testing private methods · asserting
call counts or ordering · breaks on refactor without behavior change · a name
describing HOW not WHAT · verifying through a side channel.

---

## Tests ship with the implementation

The TDD cycle (failing test, minimal implementation, refactor) is what
"complete" means. Ship the tests the behavior needs and **only** those: trivial
code and human prose earn none, and a test written to satisfy process costs
maintenance forever.

## The mutation check

Before finishing, mentally mutate the production code. At least one test should
fail for each realistic mutation:

- Wrong constant or argument
- Wrong branch handler
- Missing state change or side effect
- Empty or default return
- Missing validation for zero, empty, nil, unauthorized, or malformed input

**A mutation nothing catches marks the behavior as unprotected, or the test as
tautological.**

## Quick reference

| When you… | Do |
|---|---|
| Write any test | Name the break it catches: a bug, not a decision |
| Build an expected value | Derive it by hand; never with the code under test |
| Test a script or document | Run it and assert effects; never grep its text |
| Reach for a dependency test | Test your boundary contract, not their mechanics |
| Want to assert on a mocked element | Test the real component, or unmock it |
| Are about to mock a method | Learn its side effects; mock the slow/external level |
| Build a mock response | Mirror the real structure completely |
| Need cleanup only tests use | Put it in test utilities |
| Watch mock setup balloon | Switch to an integration test with real components |
| Finish a test file | Run the mutation check |

## Warning signs

- Setup and assertion share the same object, guaranteeing equality
- The test can fail only through a crash or a missing selector
- It fails on every intentional change, never on accidental breakage
- Expected values are hidden behind loops, builders, or helpers
- It greps source text, or asserts a removed symbol stays removed
- It would still matter if only the framework remained
- It exists for coverage, checking no side effect or outcome
- An assertion checks a `*-mock` identifier, or fails if you remove the mock
- A method is called only from test files
- Mock setup is more than half the test, or you can't explain why the mock is needed
- Mocking "just to be safe"
