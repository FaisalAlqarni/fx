# No performance lens; the database lens owns query shape

`fx-review` dispatches four lenses. A fifth, `fx-lens-performance`, was drafted
from a 455-line upstream source, read in full, and **not shipped**.

Roughly 370 of those 455 lines are stack-irrelevant here: webpack, React hooks,
bundle budgets, Lighthouse, Chrome heap snapshots. Zero lines mention Rails,
ActiveRecord, Sidekiq, ClickHouse, .NET or EF Core. The usable residue is
generic query advice that `fx-lens-database` already covers, and its trigger row
fired on models and `db/migrate/`: **exactly `fx-lens-database`'s triggers.** Two
lenses, same diffs, same findings, two dispatches.

**Why not ship the 15% anyway:** a lens that fires on a Rails diff and returns
React findings teaches the user to skim lens output, and that habit then
degrades the four lenses that work.

## The gap this leaves, if it is ever revisited

App-layer performance that is not schema-shaped: jobs enqueued per record, N+1
inside view partials, missing batched iteration on large scans, cache-key churn,
EF Core `AsNoTracking` and client-side evaluation. **None of it comes from the
original source**, so it would be authored from scratch. Fold it into
`fx-lens-database`'s brief as an app-layer section rather than paying a second
dispatch for it.
