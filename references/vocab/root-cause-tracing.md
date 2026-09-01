# Root Cause Tracing

Bugs often manifest **deep in the call stack** — a file created in the wrong
location, a database opened with the wrong path, a job enqueued to the wrong
queue. Your instinct is to fix where the error appears. **That is treating a
symptom.**

**Core principle: trace backward through the call chain until you find the
original trigger, then fix at the source.**

## When to use

- The error happens deep in execution, not at the entry point
- The stack trace shows a long call chain
- It's unclear where the invalid data originated
- You need to find which test or code path triggers the problem

Can't trace backwards — genuine dead end? Then fix at the symptom point, and
say that's what you're doing and why.

## The tracing process

**1. Observe the symptom**

```
ActiveRecord::RecordInvalid: Validation failed: Account can't be blank
  in Engagement::CampaignDispatcher#deliver
```

**2. Find the immediate cause.** What code directly causes this?

```ruby
Delivery.create!(account: account, campaign: campaign)
```

**3. Ask what called this.**

```
CampaignDispatcher#deliver
  ← called by CampaignScheduler#run
  ← called by ScheduleCampaignJob#perform
  ← called by the spec at Campaign#schedule!
```

**4. Keep tracing up.** What value was passed?

- `account = nil`
- `nil` was accepted because the scheduler read it from a memoized lookup
- The memo was populated before the tenant was switched

**5. Find the original trigger.** Where did the `nil` come from?

```ruby
let(:account) { Current.account }   # read before the around-hook set it
```

**Root cause:** a top-level binding read a value before it was initialized.
**Fix at the source** — make the accessor raise when read too early — not at
`Delivery.create!`.

## Adding stack traces when you can't trace manually

Instrument **before** the dangerous operation, not after it fails:

```ruby
def deliver(account:, campaign:)
  Rails.logger.error(
    "[DEBUG-a4f2] deliver: account=#{account.inspect} " \
    "tenant=#{Current.account&.id.inspect} caller=#{caller.first(8).inspect}"
  )
  # ...
end
```

- **Use the loudest channel available.** In specs, a suppressed logger hides
  everything — `warn`/`$stderr` survives where `Rails.logger` may not.
- **Include context:** the value, the ambient state it should match, relevant
  environment variables, timestamps.
- **Capture the call chain** — `caller` in Ruby, `Environment.StackTrace` in
  C#, `Thread.currentThread().stackTrace` in Kotlin.
- **Tag it** with a unique prefix (`[DEBUG-a4f2]`) so cleanup is one grep, per
  `fx-debug` Phase 4.

Then run and capture:

```bash
docker compose exec shared bundle exec rspec path/to/spec.rb 2>&1 | grep 'DEBUG-a4f2'
```

**Analysing the traces:** look for the test or entry-point file name · find the
line number triggering the call · identify the pattern — same caller? same
parameter? same tenant?

## Finding which test causes pollution

Something appears during a suite run but you don't know which test caused it?
**Bisect the suite:** run tests one at a time (or halve repeatedly) until the
first polluter shows up. `rspec --seed` plus a narrowing file list does this.

## Key principle

```
found the immediate cause
  → can you trace one level up?
      no  → NEVER fix just the symptom. Say why you stopped.
      yes → trace backwards
              → is this the source?
                  no  → keep tracing
                  yes → fix at the source
                          → optionally add validation at each layer
                              → the bug becomes impossible
```

**Never fix just where the error appears.** Trace back to the original trigger.

After fixing at the source, validating at every layer the bad value passed
through turns "we fixed it" into "it can't happen". `fx-debug` links that
technique directly.
