# Open decisions

Deliberately deferred. Each records the options as they stood when parked, so
picking one later doesn't need the analysis redone.

---

## D1 — The design lane · **deferred to after the plugin is built**

`impeccable` is **dropped entirely**, so nothing owns design in the interim.
The routing table's `.erb` / CSS / visual row has **no target** until this is
decided.

Three shapes were on the table:

**a. Lane + domain references** *(was the recommendation)*
One `fx-design` skill carrying the craft process — hierarchy, spacing, colour,
type, states, a11y, RTL — plus `references/design/*.md` holding the absorbed
corpus. Same lane+reference shape as every other fx lane; the corpus loads only
when designing.

**b. Lane + references + live browser loop**
As above, plus browser-driven iteration: drive the running app, screenshot,
critique, adjust. Would have meant absorbing impeccable's scripts and hook —
now moot unless rebuilt from scratch or via chrome-devtools MCP.

**c. Domain reference only, no lane**
Just `references/design/*.md`, read by `fx-review`'s a11y lens. Smallest
surface, but **nothing owns "make this screen better."**

**Three layers the decision has to place**, which "design" kept conflating:

1. **Craft process** — how to critique and iterate on a UI
2. **Domain knowledge** — palettes, type scales, motion curves, a11y rules,
   style vocabularies, chart forms
3. **Project context** — the CSS tokens, `_components.css` (1564 lines),
   `VIEW_DESIGN_GUIDE.md`, the shared-partial contract, Arabic RTL

Layer 3 has no upstream source and must be written from the repo either way.

---

## D2 — Absorbing the `ui-ux-pro-max` corpus · **undecided**

The plugin is 23MB, but the design knowledge is a much smaller subset, and it
splits cleanly on whether it depends on the rendering stack.

**Stack-agnostic — the part worth wanting:**

| File | Size | What |
|---|---|---|
| `styles.csv` | 148K | 79 style vocabularies |
| `ui-reasoning.csv` | 76K | reasoning profiles |
| `products.csv` | 76K | 192 product palettes |
| `typography.csv` | 52K | 74 font pairings |
| `colors.csv` | 40K | colour data |
| `ux-guidelines.csv` | 28K | 119 guidelines |
| `charts.csv` | 24K | 25 chart types |

**Stack-dependent — the reason it was killed the first time:**
`icons.csv` + `phosphor-icons-upstream.json` (868K, emits React/Phosphor
imports) · `google-fonts.csv` + licences (1.1M) · the 22 stack CSVs, **none of
which has a rails/erb row** — the closest is `html-tailwind`, and this project
uses plain postcss.

**Note:** `charts.csv` overlaps the built-in `dataviz` skill, which is newer and
already handles light/dark. Likely redundant.

**Correction on the record:** the original spec killed this plugin outright.
That was too blunt — it condemned the whole corpus for faults that only apply
to its icon, font and stack data. Colour theory and type pairing do not care
whether you render ERB or JSX.

---

## D3 — Motion · **out of scope for now**

ECC has 1,908 lines across four skills — `motion-foundations` (300),
`motion-patterns` (435), `motion-advanced` (597), `motion-ui` (576).

Parked because UI motion here is CSS transitions and Turbo transitions, while
`-patterns`, `-advanced` and `-ui` are aimed at React motion libraries
(Framer Motion, GSAP) that this stack doesn't use.

If motion comes back into scope, take **`motion-foundations` principles only** —
duration scales, easing curves, what to animate and what never to. Those are
library-agnostic. The other three are not.

---

## D4 — The 7 Android procedure skills · **removed from the inventory**

`agp-9-upgrade`, `android-cli`, `edge-to-edge`,
`migrate-xml-views-to-jetpack-compose`, `navigation-3`,
`play-billing-library-version-upgrade`, `r8-analyzer`.

Google's, self-contained, would be verbatim copies. Removed for now — either
add them later, or keep using them from the project folder where they already
live (`~/.claude/skills/`).

Nothing in fx references them, so removing them breaks nothing.

---

## D5 — The performance lens · **not shipped, decided 2026-09-01**

`fx-review`'s trigger table named a fifth lens, `fx-lens-performance`, sourced
from `ecc:performance-optimizer` (455 lines). It was read in full before this
was written. **It is not being shipped, and the row is removed.**

**How much of the source applies to Rails 7.2 / .NET 8: roughly 15%.**

Zero of its 455 lines mention Rails, ActiveRecord, Ruby, Sidekiq, ClickHouse,
.NET, EF Core, LINQ, xunit, RSpec, Turbo, Stimulus or ERB. 47 lines hit
React/webpack/npx/Lighthouse tokens directly. Section by section:

| Section | Lines | Applies here |
|---|---|---|
| Analysis commands (`npx bundle-analyzer`, `lighthouse`, `node --prof`) | 23 | none |
| Core Web Vitals targets table | 12 | not diff-reviewable |
| Algorithmic complexity table + TS example | 28 | the table, ~15 lines |
| React anti-patterns (`useMemo`, `useCallback`, `React.memo`, keys) | 44 | none |
| Bundle size (tree shaking, lodash, moment, code splitting) | 38 | none |
| **Database & query optimization** | **34** | **yes** |
| Network/API (`Promise.all`, debounce, TS caching) | 45 | concepts only |
| Memory leaks (`useEffect` cleanup, Chrome heap snapshots) | 69 | none |
| Performance testing (Lighthouse CI, `bundlesize`, `web-vitals`) | 41 | none |
| Report template (bundle + Web Vitals tables) | 52 | ~10 lines |
| When to run / red flags / success metrics | 28 | one row (query > 1s) |

**~370 of 455 lines are stack-irrelevant.** This stack has no webpack, no
React, no bundle budget, and one esbuild bundle owned by core.

**The residue is already owned.** The ~50 usable lines are generic query
advice — and `fx-lens-database`, adapted from `ecc:database-reviewer`, already
covers N+1 patterns, missing and composite indexes, foreign-key indexes,
`SELECT *`, `EXPLAIN ANALYZE` and pagination on large tables. The trigger row
as drafted (*queries inside loops, iteration over AR relations, `SELECT *`,
new indexes, large payload paths*) fires on models and `db/migrate/` — exactly
`fx-lens-database`'s triggers. Two lenses, same diffs, same findings, two
dispatches.

**Why not ship the 15% anyway:** a lens that fires on a Rails diff and returns
React findings costs a dispatch and teaches the user to skim lens output. Once
that habit forms it degrades the four lenses that do work. The Correctness axis
(`/code-review`) already catches a query inside a loop.

**The real gap, if this is ever revisited:** app-layer performance that is not
schema-shaped — Sidekiq jobs enqueued per record, N+1 inside ERB partials,
missing `find_each` on large scans, Russian-doll cache key churn, EF Core
`AsNoTracking` and client-side evaluation. **None of it comes from this
source** — it would be authored from scratch. Fold it into `fx-lens-database`'s
brief as an app-layer section rather than paying a second dispatch for it.

---

## Consequences of dropping impeccable now

- **The routing table's design row has no target.** It should say so plainly
  rather than point at a plugin that isn't installed.
- `fx-review`'s `fx-lens-a11y` still covers accessibility on a diff — that lens
  is ours, not impeccable's.
- The **two dead impeccable hooks** in `advantage-backend/.claude/settings.local.json`
  (pointing at `/root/.claude/...`, never once executed) should now simply be
  **deleted** rather than repaired.
- `PRODUCT.md`, `DESIGN.md` and `.impeccable/live/config.json` in
  advantage-backend become orphaned. They're the user's files — leave them; they
  cost nothing and D1 may want them back.
