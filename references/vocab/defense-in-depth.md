# Defense-in-Depth Validation

When you fix a bug caused by invalid data, adding validation in **one** place
feels sufficient. But that single check can be bypassed by a different code
path, by a refactor, or by a mock.

**Core principle: validate at EVERY layer the data passes through. Make the bug
structurally impossible.**

Single validation says *"we fixed the bug."*
Multiple layers say *"we made the bug impossible."*

Different layers catch different cases:

- **Entry validation** catches most bugs
- **Business logic** catches edge cases
- **Environment guards** prevent context-specific dangers
- **Debug logging** helps when the other layers fail

Apply this **after** the root cause is found, not instead of finding it.

## The four layers

### Layer 1 — Entry-point validation

Reject obviously invalid input at the API boundary.

```ruby
def self.create(name:, account:)
  raise ArgumentError, "account is required" if account.nil?
  raise ArgumentError, "account #{account.id} is archived" if account.archived?
  # ...
end
```

### Layer 2 — Business-logic validation

Ensure the data makes sense for **this** operation.

```ruby
def deliver(campaign:, account:)
  raise ArgumentError, "campaign must belong to account" unless campaign.account_id == account.id
  # ...
end
```

### Layer 3 — Environment guards

Prevent dangerous operations in specific contexts. This is the layer people
skip, and it's the one that catches the truly expensive mistakes.

```ruby
def truncate_events!
  if Rails.env.production?
    raise "Refusing to truncate events in production"
  end
  # ...
end
```

```csharp
if (_env.IsProduction() && _options.AllowDestructiveMigration)
    throw new InvalidOperationException(
        "Destructive migration is not permitted in production");
```

### Layer 4 — Debug instrumentation

Capture context for forensics, before the operation.

```ruby
Rails.logger.debug do
  "about to dispatch: campaign=#{campaign.id} account=#{account.id} " \
  "tenant=#{Current.account&.id} caller=#{caller.first(5)}"
end
```

## Applying the pattern

1. **Trace the data flow** — where does the bad value originate, and where is
   it used?
2. **Map all checkpoints** — list every point the data passes through
3. **Add validation at each layer** — entry, business, environment, debug
4. **Test each layer** — try to bypass layer 1, and verify layer 2 catches it

## Worked example

**Bug:** a `nil` account reached the dispatcher and delivered a campaign to the
wrong tenant.

**Data flow:** spec setup → `nil` → `Campaign.schedule!` →
`CampaignScheduler#run` → `CampaignDispatcher#deliver` → `Delivery.create!`

**Four layers added:**

- **Layer 1** — `Campaign.schedule!` validates the account is present and not
  archived
- **Layer 2** — `CampaignDispatcher` validates the campaign belongs to the
  account
- **Layer 3** — the dispatcher refuses to run when `Current.account` is unset
- **Layer 4** — tagged logging of tenant and caller before dispatch

## The key insight

**All four layers were necessary.** During testing, each caught bugs the others
missed:

- different code paths bypassed the entry validation
- mocks bypassed the business-logic checks
- edge cases needed the environment guard
- the debug logging identified structural misuse nobody had predicted

**Don't stop at one validation point.**

## Interaction with the ladder

The always-on preamble says never to add speculative layers. This is not that:
these layers are added **after a real bug proved the path is reachable**, and
each one guards a checkpoint the bad value actually passed through. That's
evidence, not speculation. Adding all four *before* any bug exists would be the
over-building the ladder forbids.
