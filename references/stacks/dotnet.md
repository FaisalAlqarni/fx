# .NET

Ecosystem knowledge. True in any .NET repo: nothing here describes a
particular solution.

**This file never names a command, a project layout, a package feed or a
framework choice.** Those belong to `.fx.json` and `repo.md`.

Written against **.NET 8**, which is where LTS sits. Older-runtime differences
are marked.

---

## Which test framework

**Use the one the repo already uses.**

| Signal | Framework |
|---|---|
| `xunit` package reference, `[Fact]` / `[Theory]` | xUnit |
| `NUnit` package, `[Test]` / `[TestFixture]` | NUnit |
| `MSTest.TestFramework`, `[TestMethod]` | MSTest |

The runner is `dotnet test` almost everywhere, but the *filter* syntax differs
per framework and the solution may scope it to one project. Take the command
from `.fx.json`.

If `coverlet.collector` is referenced, coverage is collected by
`--collect:"XPlat Code Coverage"`: it does not run by default and produces no
threshold unless one is configured.

## The traps

### `async` all the way, or deadlock

```csharp
var result = SomethingAsync().Result;    // deadlocks under a sync context
SomethingAsync().Wait();                 // same
await SomethingAsync();                  // correct
```

ASP.NET Core has no synchronization context, so this often *appears* to work in
a web project and then deadlocks the moment the same code is called from a
desktop app, a test with a custom context, or a library consumer.

**`async void` is unrecoverable.** An exception thrown from `async void` cannot
be caught by the caller: it goes straight to the process. The only legitimate
use is an event handler. Everything else returns `Task`.

**Propagate `CancellationToken`.** A method that accepts one and does not pass
it to the calls it makes has an untestable, unhonoured cancellation contract.

**In library code, `ConfigureAwait(false)`.** In application code it is noise.

### Captive dependencies

Registering a **scoped** service into a **singleton** silently promotes it to
singleton lifetime for the life of the process:

```csharp
services.AddSingleton<Cache>();     // holds ↓
services.AddScoped<DbContext>();    // now effectively a singleton
```

`DbContext` is **not thread-safe**. This is how a solution gets intermittent
"A second operation started on this context" in production and never in tests.
`ValidateScopes` catches it in Development only: it is off in Production by
default.

### EF Core

- **Tracking is on by default.** Every read-only query should be
  `AsNoTracking()`; a large tracked result set is both slow and a memory
  problem.
- **Client-side evaluation was removed in EF Core 3.** A `Where` that cannot be
  translated now *throws* rather than silently pulling the table into memory.
  That is an improvement: do not "fix" it by inserting `.ToList()` before the
  filter, which restores the original bug.
- **`SaveChanges` in a loop** issues a round trip per iteration. Batch, then
  save once.
- **`Include` chains multiply rows.** Two collection `Include`s on one query
  produce a cartesian product. `AsSplitQuery()` is the fix.
- **Migrations are generated against the model, not the database.** A hand-edit
  to the database that the model does not know about will be reverted by the
  next migration.
- `DbContext` is a unit of work with a short lifetime. Scoped, never singleton.

### `IEnumerable` enumerated twice

```csharp
var items = source.Where(Expensive);   // nothing has run yet
if (items.Any()) return items.First(); // ran twice
```

Worse across the `IQueryable` boundary: the moment a LINQ chain is typed as
`IEnumerable`, every subsequent operator runs **in memory**, and the database
query silently becomes `SELECT *`. Materialize deliberately with `ToList()` and
know where the boundary is.

### Exceptions

```csharp
catch (Exception ex) { throw ex; }   // resets the stack trace
catch (Exception ex) { throw; }      // preserves it
```

Catching `Exception` to log and swallow converts a crash into corrupted state.
If it cannot be handled, do not catch it.

### `HttpClient`

`new HttpClient()` per call exhausts sockets under load: the connections sit
in `TIME_WAIT` and the failure appears as intermittent timeouts long after the
code that caused it. Use `IHttpClientFactory`, or one long-lived static
instance.

A `HttpClient` held forever does not observe DNS changes. The factory handles
that too.

### Dates

`DateTime.Now` reads the server's local zone. `DateTime.UtcNow` is unambiguous
but loses offset. `DateTimeOffset` keeps both and is the right default for
anything stored or transmitted.

A `DateTime` round-tripped through most serializers loses its `Kind`, so
`Utc` comes back as `Unspecified` and comparisons quietly shift.

.NET 8 adds `TimeProvider`: inject it rather than reading the clock directly,
and tests stop needing to sleep.

### Nullable reference types

`<Nullable>enable</Nullable>` is compile-time only. It does not validate
anything at a trust boundary: deserialized JSON, EF materialization and
reflection all produce `null` in non-nullable fields without a warning.
Validate input regardless of the annotation.

Suppressing with `!` asserts a fact the compiler cannot see. If it is not
provably true, it is a latent `NullReferenceException`.

### `record` and `struct` equality

`record` gives value equality; `class` gives reference equality. Changing one
to the other silently changes the behaviour of every `Equals`, dictionary key
and `Distinct()` in the codebase: with no compile error.

Mutable `struct` types are a bug generator: methods on a copy mutate the copy.

### Strings

`string.Equals(a, b)` is ordinal. `a.ToLower() == b.ToLower()` is
culture-sensitive and wrong in Turkish (`I`/`ı`). For anything
identifier-shaped use `StringComparison.Ordinal` or `OrdinalIgnoreCase`
explicitly.

## Writing tests

### The seam

| Test | When |
|---|---|
| plain unit | domain logic with no I/O: fastest and most of the suite |
| `WebApplicationFactory<T>` | the HTTP surface: routing, model binding, auth, status codes |
| database integration | query behaviour that a fake cannot represent |

**An in-memory database provider is not a database.** It has no relational
constraints, no transaction semantics and different LINQ translation, so it
passes queries that fail against the real server and vice versa. Use it for
speed on logic that does not depend on the store; use a real instance
(containerized) for anything that does.

### Mocking

Mock what you own and what has a real boundary: a port, a clock, an HTTP
client. Mocking a type you do not own couples the test to a third party's
internals, and it will pass while production fails.

A test with five mocks is describing a design problem, not testing behaviour.

### Architecture tests

If the solution references `NetArchTest` or a similar library, layering rules
are **executable**: dependency direction is enforced by a test, not by
convention. Read those tests before proposing a structural change: they will
tell you the intended direction faster than reading the projects will, and a
change that violates one fails the build.

## .NET 8 notes

- **Keyed services**: `AddKeyedScoped` / `[FromKeyedServices]`. Multiple
  implementations of one interface no longer need a factory.
- **Minimal APIs** are a full alternative to controllers; a solution may use
  either or both. Do not convert one to the other as a side effect.
- **Frozen collections** for read-heavy lookups built once.
- **`TimeProvider`** as above.
- Central package management (`Directory.Packages.props`) moves versions out of
  every `.csproj`. If present, a version in a `.csproj` is an override and
  probably a mistake.
