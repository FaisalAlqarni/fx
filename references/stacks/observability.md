# Observability

Wide events (canonical log lines), plus this project's tracing topology.

Absorbed from `advantage-backend/.claude/logging-best-practices/` — a skill
that sat in the wrong directory and **never loaded once** between Feb and Sep
2026. Its examples used checkout/cart domains with a note apologising for them;
they are rewritten here in the real domain.

Sources: [Stripe — Canonical Log Lines](https://stripe.com/blog/canonical-log-lines) ·
[Observability Wide Events 101](https://boristane.com/blog/observability-wide-events-101/) ·
[loggingsucks.com](https://loggingsucks.com)

---

## The core rule

**Emit one context-rich event per request per service.** Not ten scattered log
lines — one wide event, built up through the request, emitted once at
completion.

Scattered lines cannot answer *"show me every campaign send that failed for
trial organisations last Tuesday."* A wide event can, without redeploying.

## The Rails pattern

One concern, included in `ApplicationController`. **The concern owns timing,
status, environment and emission. Actions add business context only.**

```ruby
# app/controllers/concerns/wide_event_logging.rb
module WideEventLogging
  extend ActiveSupport::Concern

  included { around_action :log_wide_event }

  # Captured once at boot, merged into every event
  ENV_CONTEXT = {
    service:     ENV['SERVICE_NAME'] || 'app',
    commit_hash: ENV['GIT_COMMIT'],
    version:     ENV['APP_VERSION'],
    rails_env:   Rails.env,
    instance_id: ENV['HOSTNAME']
  }.freeze

  private

  def log_wide_event
    started = Time.current
    event = {
      request_id: request.request_id,
      timestamp:  Time.current.iso8601,
      method:     request.method,
      path:       request.path,
      controller: controller_name,
      action:     action_name,
      locale:     I18n.locale
    }.merge(ENV_CONTEXT)

    Current.wide_event = event

    begin
      yield
      event[:status_code] = response.status
      event[:outcome]     = response.status < 400 ? 'success' : 'error'
    rescue => e
      event[:status_code] = 500
      event[:outcome]     = 'error'
      event[:error] = { type: e.class.name, message: e.message,
                        backtrace: e.backtrace&.first(3) }
      raise
    ensure
      event[:duration_ms] = ((Time.current - started) * 1000).round(2)
      Rails.logger.info(event.to_json)
    end
  end
end
```

**Emit in `ensure`.** It runs on success, on error, and on early return. An
event emitted anywhere else is an event you lose exactly when you need it.

The action then adds only what the concern cannot know:

```ruby
def create
  event = Current.wide_event

  event[:organization] = {
    id:           current_organization.id,
    subscription: current_organization.subscription_tier,
    trial:        current_organization.trial_account?,
    age_days:     (Date.today - current_organization.created_at.to_date).to_i
  }

  campaign = Campaign.create!(campaign_params)
  event[:campaign] = { id: campaign.id, channel: campaign.channel,
                       audience_size: campaign.audience.count }

  render json: { campaign: campaign }, status: :created
end
```

## Sidekiq

Workers have no request, so they need their own concern — same shape:

```ruby
module SidekiqWideEventLogging
  extend ActiveSupport::Concern
  included { around_perform :log_wide_event }

  private

  def log_wide_event
    started = Time.current
    event = { job_class: self.class.name, job_id: jid, queue: queue_name,
              timestamp: Time.current.iso8601 }
    Current.wide_event = event
    begin
      yield
      event[:outcome] = 'success'
    rescue => e
      event[:outcome] = 'error'
      event[:error] = { type: e.class.name, message: e.message }
      raise
    ensure
      event[:duration_ms] = ((Time.current - started) * 1000).round(2)
      Rails.logger.info(event.to_json)
    end
  end
end
```

## Correlating across engines

Any split into separate processes — services, mounted engines, workers — means
one user action produces events in several places. **Without a propagated
request ID they cannot be joined.**

```ruby
# Calling another engine — pass it along
Faraday.post("#{engagement_url}/api/campaigns/trigger") do |req|
  req.headers['X-Request-Id'] = request.request_id
  req.body = { campaign_id: campaign.id }.to_json
end

# Receiving engine — adopt it rather than generating a new one
before_action do
  request.request_id = request.headers['X-Request-Id'] if request.headers['X-Request-Id'].present?
end
```

Now `WHERE request_id = 'req_abc'` returns the whole flow across engines.

## What goes in an event

**High cardinality** — fields with millions of distinct values: `request_id`,
`user.id`, `organization.id`. Without them you cannot debug *one* customer.

**High dimensionality** — many fields, 20–100+. Every extra dimension is
another question answerable without a deploy.

**Business context, always.** Not just technical fields:

```ruby
organization: { id:, subscription: 'enterprise', age_days: 1247 },
campaign:     { audience_size: 48_500, channel: 'sms' },
feature_flags:{ new_dispatch_pipeline: true },
error:        { type: 'DeliveryError', message: 'gateway_timeout' }
```

That turns *"something broke"* into *"an enterprise organisation's 48,500-recipient
SMS campaign failed with the new dispatch pipeline enabled."* One of those you
can prioritise.

**Environment characteristics, always** — `commit_hash`, `version`, `engine`,
`rails_env`, `instance_id`. This is how you correlate a spike with a deploy, or
find that only one engine is affected. Capture once at boot (`ENV_CONTEXT`
above), never per-request.

**Locale, if the app is localized.** Include the request's active locale.
Locale-specific bugs — formatting, direction, translation fallbacks — are
invisible without it, and they are invisible *to you* if your own locale is the
one that works.

## Structure

- **One logger.** `Rails.logger`, configured once. Never `Logger.new(STDOUT)`
  in a file, never `puts`, never `p`.
- **JSON, one line per event.**
- **One schema across every service.** `user_id` in one and `userId` in another
  makes querying painful for the life of the system.
- **Two levels only: `info` and `error`.** debug/trace/warn/notice/critical
  create argument without adding signal. Wanting a debug line means wanting a
  field on the wide event.
- **Never log an unstructured string.** Tempted to write
  `Rails.logger.info('something happened')`? Ask what fields would make it
  queryable, and add those instead.

## Tracing topology

An async job started by a request can either nest **inside** that request's
trace as a child span, or start its own **root** trace linked back to it.

Both are defensible: nesting shows the full user-initiated causal chain in one
view; a separate root keeps request traces short and makes job latency its own
first-class signal. What is not defensible is being inconsistent, or changing it
casually — every saved query and dashboard depends on the choice.

**Whichever a project picks is a decision, not a default. Check `repo.md`
before changing it.**

## Anti-patterns

| Anti-pattern | Why it hurts |
|---|---|
| Several log lines per request | Noise, and no single row to query |
| A separate logger per engine | Formats drift; cross-engine queries break |
| No `commit_hash` / deploy info | Cannot correlate an incident with a release |
| Technical fields only | You learn *that* it broke, never *who for* |
| Unstructured strings | Not queryable, so not useful at scale |
| Field names differing per engine | Every future query pays for it |
| Logging only anticipated failures | Production bugs are the ones you did not predict — that is the whole case for wide events |

## The unknown-unknowns test

Before shipping a change, ask: **if this breaks in a way I have not imagined,
does the event carry enough context to find out who is affected and what they
have in common?**

If the answer is no, add the dimension now. Adding it after the incident means
waiting for the incident to happen twice.
