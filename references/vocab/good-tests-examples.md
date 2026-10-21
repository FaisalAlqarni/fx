# Good tests: worked examples

**Load when:** a rule in the good-tests reference needs its full example or
the incident behind it. Each section is moved verbatim from there.

## Derive expectations independently

```ruby
# ❌ Mirror assertion: the same builder computes both sides: always true
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

## Verify through the interface, not around it

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

## Design for mockability at the boundary

```ruby
# Easy to mock
def process_payment(order, gateway) = gateway.charge(order.total)

# Hard to mock
def process_payment(order) = MyFatoorah::Client.new(ENV["KEY"]).charge(order.total)
```

## Testing non-deterministic behavior: the long form

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
# Hard to test: the seam is buried inside the method
def notify_subscribers(event)
  Thread.new { SubscriberMailer.broadcast(event) }
end

# Testable: the collaborator is a seam
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

## The mutation check: reverting and scope

### Never revert a mutation with the version control system

Mutating production code means editing a file you are probably also *working
in*. Undoing that edit with `git checkout <path>`, `git restore <path>` or a
hard reset discards **every unstaged change in that file**, not just the
mutation, and it does so without a word.

Measured: an implementer mid-way through a thirteen-item round mutated two
files, reverted them that way, and lost a new constant, a new method and a
deletion it had already made. It found out on an unrelated grep. Its own
account of why this is worse than an ordinary mistake: **"the suite is green"
would have been true at the moment the work was gone.** The mutation had been
undone, the tests passed, and the passing suite was measuring a file that had
quietly travelled back in time.

So: copy the file aside and copy it back, or mutate a throwaway export of the
commit rather than the tree you are editing. Then diff the restored file against
the copy and say you did. A restore you did not verify is a claim, and this is
the one place where the usual safety net, a failing test, cannot catch you.

### The mutation you used tells you what the test covers

Run the check in reverse and it reads the test's real scope back to you. **A
test proved by mutating a config file covers that config file. It does not cover
the code that reads it**, however its name reads.

Measured: an accessibility test was reported as covering two UI controls. Its
author proved it by breaking a translation string, and it duly failed. A
reviewer then wired one control's accessible name to the wrong key, a real
defect on the rendered page, and **the whole suite stayed green**. The test
compared two strings and never rendered the view. The author's own account of
it: a test proved by editing a locale file cannot be proving anything about the
markup.

So when you write down the mutation as evidence, read it once more and ask
whether it lives in the same layer as the thing you are claiming. If it does
not, the test is fine and the claim is not: narrow the name and say what it
pins. **A test whose description claims more than it does is worse than a
narrow one honestly labelled**, because the next person reads the claim and
stops looking.

## Quick reference (moved)

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
| Record a mutation as evidence | Check it lives in the same layer as your claim |
| Revert a mutation | Copy the file back; never `checkout`/`restore` the path |

## Quotes and framing (moved)

The user's correction, verbatim: **"Are we testing the behavior of a mock?"**

The user's question, verbatim: **"Do we need to be using a mock here?"**

Strict TDD produces both naturally: a test written first and watched failing
against real code has already proven it can fail, and only earns a mock when
the real dependency proves slow or external.

(The classic: asserting that your router invokes a
registered handler: that is Rails' test, not yours.)
