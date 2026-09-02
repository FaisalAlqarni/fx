# Rails

Ecosystem knowledge. True in any Rails repo: nothing here describes a
particular project.

**This file never names a command, a port, a directory layout or a gem
choice.** Those belong to `.fx.json` and `repo.md`. If something here is only
true of one codebase, it is in the wrong file.

Written against **Rails 7.x:8.x**. Where the two differ, both are marked.

---

## Which test framework

**Use the one the repo already uses.** Never introduce a second.

| Signal | Framework |
|---|---|
| `.rspec` file, or `spec/` with `rails_helper.rb` | RSpec |
| `test/` with `test_helper.rb` | Minitest |
| both present | the one with more recent files, then say so and ask |

The exact command comes from `.fx.json`, never from guessing. Rails does not
have one runner; `rails test`, `bundle exec rspec`, and a `docker compose exec`
wrapper are all normal, and only the repo knows which.

## The traps

Ranked by how often they are gotten wrong, not by severity.

### Time

`Time.now` and `Date.today` read the **system** zone. Rails apps run on
`Time.zone`. Mixing them produces bugs that only appear for users in another
zone, or only after a deploy to a differently-configured host.

```ruby
Time.now       # system zone — wrong
Time.current   # Time.zone — right
Date.today     # system zone — wrong
Date.current   # right
1.hour.ago     # right, zone-aware
```

In tests, freeze rather than compute: `travel_to(Time.zone.local(2026, 1, 1))`.

### Jobs enqueued inside a transaction

```ruby
after_save    :notify   # job may run BEFORE the row is committed
after_commit  :notify   # correct
```

An `after_save` enqueue can be picked up by a worker in another process before
the transaction commits: the worker queries for a row that is not visible yet
and fails intermittently. This is the single most common source of "works
locally, flakes in production" in Rails.

Rails 7.2+ `enqueue_after_transaction_commit` fixes it for Active Job. Set it,
and still prefer `after_commit` for clarity.

**Job arguments must be primitives or GlobalID.** Passing a model instance
serializes a snapshot that is stale by the time the job runs. Pass the id.

**Jobs must be idempotent.** Every backend retries. A job that sends an email
without a guard will send it twice.

### Bulk operations skip everything

```ruby
Post.update_all(status: "archived")   # no validations, no callbacks, no timestamps
Post.delete_all                       # no dependent: :destroy — orphans children
post.touch                            # no validations
```

All four are correct when you *want* that, and silent data corruption when you
do not. Say which you meant.

### `includes` vs `preload` vs `eager_load`

`includes` chooses for you, and its choice changes when a `where` references
the association: silently switching from two queries to a `LEFT JOIN` with
different `DISTINCT` semantics.

- `preload`: always separate queries. Cannot filter on the association.
- `eager_load`: always one `LEFT JOIN`. Can filter.
- `includes`: picks one. Use it only when you do not care which.

Filtering on an included association without `references` raises in Rails 7+.

### `find_each`, not `each`

`Post.all.each` loads every row into memory. `find_each` batches at 1000.
Nothing warns you until the table is large enough to matter in production and
not in development.

Caveat: `find_each` ignores your `order`: it forces primary-key order.

### Migrations

- **`change` must be reversible.** Anything with data manipulation, raw SQL, or
  a removed column needs explicit `up`/`down`, or `reversible`.
- **Removing a column needs two deploys.** Add the column name to
  `self.ignored_columns` and deploy that first, or every running instance still
  selecting `*` breaks the moment the migration lands.
- **Adding a `NOT NULL` column with a default** rewrites the whole table on
  Postgres < 11. On 11+ it is metadata-only. Know which server you target.
- **Adding an index locks the table.** `algorithm: :concurrently` plus
  `disable_ddl_transaction!` avoids it. They must be used together.
- **Never edit a migration that has run anywhere but your machine.** Write a
  new one.

### Schema format

`config.active_record.schema_format` is `:ruby` or `:sql`. If a repo uses
`:sql`, running a migration regenerates `structure.sql`, and a stray
`db/schema.rb` in a diff means the setting was overridden or the wrong task
ran. Check before committing schema changes; the file that changes tells you
which mode you are in.

### `default_scope`

It applies to `new` and `create` too, it is nearly impossible to remove at a
call site (`unscoped` drops *everything*, including joins you wanted), and it
silently changes the meaning of every association pointing at the model. Use an
explicit named scope.

### Callbacks

Callbacks that touch other models, enqueue work, or call external services turn
every `save` into an unpredictable transaction. The symptom is a test suite
that cannot create a fixture without hitting the network.

Validation and normalization of the model's *own* attributes are fine.
Everything else belongs in the calling code or a service object.

### `redirect_to` refuses other hosts

Since Rails 7, `redirect_to` defaults to `allow_other_host: false` and raises
`ActionController::Redirecting::UnsafeRedirectError` on any external URL. The
failure is a 500 in a path that reads as obviously correct, and the exception
name does not mention the option you need.

```ruby
redirect_to params[:url]                          # raises on any external host
redirect_to url, allow_other_host: true           # deliberate, and now auditable
```

**The flag is not a workaround: it is the security decision made explicit.**
Open redirect is a real vulnerability: an attacker supplies a URL on your
domain that bounces the victim somewhere else, and the phishing link carries
your hostname. Rails made you opt in so the decision appears in review.

If external redirects are the product (a link shortener, an OAuth callback),
set it and validate the target. If they are not, the exception found a bug.

### Strong parameters

`permit!` and `params.to_unsafe_h` disable the protection entirely. Mass
assignment of a `role` or `admin` column is a privilege-escalation bug, not a
style issue.

## Writing tests

### The seam

Prefer the level that has a real boundary:

| Test | When |
|---|---|
| model / plain object | logic that does not need a request |
| **request spec** | anything HTTP: routing, params, auth, status, response |
| controller spec | avoid; deprecated since Rails 5, does not exercise the middleware stack |
| system / feature | only when the behaviour genuinely needs a browser: slowest by an order of magnitude |

Test through the public interface. A test that calls `send(:private_method)` is
asserting the implementation, and it will break on every refactor while
catching nothing.

### Factories

- `build_stubbed` > `build` > `create`. Only `create` touches the database, and
  it is the reason slow suites are slow.
- Factories define the **minimum valid** object. Traits add the rest. A factory
  that creates six associations makes every test that uses it slow and coupled.
- `let` is lazy, `let!` runs before each example. `let!` for a record the
  subject must find; `let` for everything else.

### What not to assert

Do not assert on log output, on `updated_at`, on the exact wording of a
validation message (assert the attribute and the error key), or on the order of
an unordered query.

### Time in tests

Freeze it. `travel_to` / `freeze_time`, with `travel_back` in an `after` hook
or the block form. A test that computes an expectation from `Time.current`
passes at 23:59:59 and fails at 00:00:00.

## Background jobs

The queue backend is a repo choice. What is universal:

- Every backend **retries**, so every job must be idempotent.
- A job that runs for minutes will be killed by a deploy. Make it resumable, or
  make it short.
- Errors inside jobs do not surface in a request. Without explicit reporting
  they fail silently. Report them explicitly.

## Engines

Only relevant if the repo has them, and `repo.md` says how they are arranged.
Two facts hold everywhere:

- An engine's routes, locales and initializers are **per engine**. A route
  added to the host app is not visible inside a mounted engine. Anything
  registered once at the host level and needed everywhere has to be repeated
  per engine or moved to a shared concern.
- Engine table names and model namespaces collide with the host's unless
  `isolate_namespace` is used. If it is, `Engine::Model` and `Model` are
  different classes and the error message will not make that obvious.

## Rails 8 differences

- **Solid Queue / Solid Cache / Solid Cable** are the defaults: database-backed
  rather than Redis. A Rails 8 app may have no Redis at all.
- **Kamal** ships as the default deploy path.
- **Propshaft** replaces Sprockets. Asset helpers behave differently and
  Sprockets-era manifests do not apply.
- Authentication generator ships in core: a repo may have hand-rolled auth
  where you would expect Devise.
