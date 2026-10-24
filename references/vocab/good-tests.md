# Writing Good Tests

**Load when:** writing or changing tests, adding mocks, or adding
cleanup/helper methods for tests.

Two principles govern everything here:

```
1. Every test names the break it catches
2. Every test exercises the real thing
```

---

## Principle 1: Name the break

Before the body, answer: **what production change should make this
test fail, and is it a bug or a decision?** A test earns its place by
catching a wrong branch, a missing side effect or argument, a boundary case or a broken contract.

### Derive expectations independently

Use literals and hand-checked fixtures; table-driven tests with literal
expected values are preferred. An expectation computed by the code
under test, or its helpers: passes no matter what that code does.

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
maintainers' tests to write.

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

### Verify through the interface, not around it

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

### Testing non-deterministic behavior

When behavior is genuinely non-deterministic (a background thread, a job
queue, a timer, a race between two writers) **the seam is not optional.**
Inject the collaborator that decides timing and assert on it directly, rather
than asserting on the outcome through the race it creates.

**Polling with a deadline is not the fix,** unless the test drives the system
from outside, where waiting on a condition is the tool. It passes for
synchronous code that should have been async, and flakes on a slow runner.
**Inject the collaborator** (executor, job class, scheduler) and assert the
work was scheduled. A returned handle (`Thread`, `Future`, job ID) is also a
legitimate seam. A test-only synchronous path is a trade: production runs the
thread, queue and race the tests never exercise, so retry, ordering and
backpressure code needs its own test that runs for real. A spawned Rails
thread needs its own connection and does not see an uncommitted test
transaction: that is the harness, not the code under test.

### Gate function

```markdown
BEFORE adding a mock or test helper:
  List the real method's side effects; keep the ones the test
  depends on real: mock the slow/external level below them.

  Mock responses mirror the complete real structure.

  A method only tests call lives in test utilities, not production.

  About to assert on the mock itself?
    Unmock it or delete the assertion.
```

---

## What a good test looks like

Test behavior callers care about, through the public API; one logical assertion.

Red flags: mocking internal collaborators · testing private methods · asserting
call counts or ordering on internal collaborators (not where it is the contract,
as in "SMS sent exactly once") · breaks on refactor without behavior change · a name
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

### Never revert a mutation with the version control system

`git checkout <path>`, `git restore <path>` or a hard reset discards every
unstaged change in the file, not only the mutation. Copy the file aside and
copy it back (or mutate a throwaway export of the commit), then diff the
restored file against the copy and say you did.

### The mutation you used tells you what the test covers

A test proved by mutating a config file covers that config file, not the code
that reads it. Check the mutation lives in the same layer as your claim; if it
does not, narrow the claim. A test whose description claims more than it does
is worse than a narrow one honestly labelled.

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
