---
name: fx-architecture
description: >
  Use when the structure of EXISTING code is the problem: "restructure this",
  "this is a mess", "what's shallow here", "where should the seam go", "this is
  hard to test", "too many small files", "audit the architecture", "find
  refactoring opportunities", "deepen this module", "design this interface
  twice". For a DIFF — changed code — use fx-review instead.
---

# fx-architecture

Announce: "Using fx-architecture to find deepening opportunities."

Surface architectural friction and propose **deepening opportunities**:
refactors that turn shallow modules into deep ones. The aim is **testability
and AI-navigability.**

This is informed by the project's domain model and built on a shared design
vocabulary:

- `../../references/vocab/codebase-design.md` — **module · interface ·
  implementation · depth · seam · adapter · leverage · locality**, plus the
  deletion test, "the interface is the test surface", and "one adapter = a
  hypothetical seam, two = a real one". **Use these terms exactly in every
  suggestion. Do not drift into "component", "service", "API", or "boundary".**
- **The domain language in `CONTEXT.md` gives names to good seams.** ADRs in
  `docs/adr/` record decisions **this command should not re-litigate.**

## 1. Explore — scope before you scan

**YAGNI.** Deepening a module pays off by making *future* changes to it easier,
so put extra weight on the parts of the codebase that have **recently changed.
Decide where to look before you look.**

- The user named a direction — a module, a subsystem, a pain point? **Take it,
  and skip the inference below.**
- Otherwise walk back a good stretch of `git log --oneline` to find the
  codebase's **hot spots**: the files and areas that keep coming up. Let those
  pull your attention first. **Scattered with no clear hot spot? Widen the
  net.**

Read the domain glossary (`CONTEXT.md`, or `CONTEXT-MAP.md` → the relevant
context) and any ADRs **in the area you're touching, first** — before the code.
On a multi-engine repo, that means the engine's own `CONTEXT.md`; the root map
points the way. Never scan every engine at once.

Then **spawn a sub-agent to walk the codebase.** Don't follow rigid heuristics;
explore organically and note where you experience friction:

- Where does understanding one concept require bouncing between many small
  modules?
- Where are modules **shallow** — the interface nearly as complex as the
  implementation?
- Where have pure functions been extracted **just for testability**, while the
  real bugs hide in how they're called (no **locality**)?
- Where do tightly-coupled modules **leak across their seams**?
- Which parts are untested, or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow: **would
deleting it concentrate complexity, or just move it?** A "yes, concentrates" is
the signal you want.

## 2. Present candidates as an HTML report

Write a **self-contained HTML file to the OS temp directory, so nothing lands
in the repo.** Resolve the temp dir: `$TMPDIR` → `%TEMP%` (Windows) → `/tmp`.
Write to `<tmpdir>/architecture-review-<timestamp>.html`, so each run gets a
fresh file.

Open it, and **print the absolute path regardless** — if the open call fails
silently, the path is the fallback:

| Platform | Command |
|---|---|
| Windows | `start "" "<path>"` |
| macOS | `open "<path>"` |
| Linux | `xdg-open "<path>"` |
| WSL | `explorer.exe "$(wslpath -w <path>)"` |

The report stays local. **Never publish it.**

Full scaffold, diagram patterns and styling: [HTML-REPORT.md](./HTML-REPORT.md).

Each candidate gets a card:

- **Title** — short, names the deepening ("Collapse the Order intake pipeline")
- **Badge row** — recommendation strength: `Strong` (emerald) ·
  `Worth exploring` (amber) · `Speculative` (slate) — plus the dependency
  category (`in-process`, `local-substitutable`, `ports & adapters`, `mock`)
- **Files** — which files and modules are involved, monospaced
- **Problem** — one sentence: why the current architecture causes friction
- **Solution** — one sentence: plain English, what would change
- **Wins** — bullets, ≤6 words each, **named in glossary terms: locality,
  leverage, and how tests would improve.** Never "cleaner code" or "easier to
  maintain"
- **Before / After diagram** — side by side, custom-drawn, **illustrating the
  shallowness and the deepening.** The centrepiece. Mermaid for graph-shaped
  relationships (call graphs, dependencies, sequences); hand-built divs/SVG for
  editorial visuals (mass diagrams, cross-sections, collapse animations)
- **ADR callout** — only if it contradicts one

**The diagrams carry the weight. Prose is sparse.** If a diagram needs a
paragraph to be understood, **redraw the diagram.**

**Use `CONTEXT.md` vocabulary for the domain and codebase-design vocabulary for
the architecture.** If `CONTEXT.md` defines "Campaign", write "the Campaign
intake module" — not "the FooBarHandler", and not "the Campaign service".

**ADR conflicts:** only surface a candidate that contradicts an existing ADR
when the friction is **real enough to warrant revisiting the ADR**, and mark it
clearly in the card — an amber callout: *"contradicts ADR-0007, but worth
reopening because…"*. **Don't list every theoretical refactor an ADR forbids.**

End with a **Top recommendation** section: which candidate you'd tackle first,
and why.

**Do NOT propose interfaces yet.** After the file is written, ask: *"Which of
these would you like to explore?"*

## 3. Grilling loop

Once the user picks a candidate, use `../../references/vocab/grilling.md` to walk the
decision tree with them — 2–4 related questions per round, a recommendation on
each, via the host's interactive question tool. Work through: **constraints ·
dependencies · the shape of the deepened module · what sits behind the seam ·
which tests survive.**

Classify the candidate's dependencies (*Deepening → Dependency categories* in
`../../references/vocab/codebase-design.md`) — in-process · local-substitutable
· ports-and-adapters · true-external — because **the category determines how
the deepened module is tested across its seam.**

Want to explore alternative interfaces? *Design It Twice* in
`../../references/vocab/codebase-design.md`
— parallel sub-agents each design a **radically different** interface under a
different constraint, then you compare on depth, locality and seam placement,
and give an opinionated recommendation.

**Side effects happen inline as decisions crystallize.** Use
`../../references/vocab/domain-modeling.md` to keep the model current as you go:

- **Naming a deepened module after a concept not in `CONTEXT.md`?** Add the
  term there. Create the file lazily if it doesn't exist.
- **Sharpening a fuzzy term during the conversation?** Update `CONTEXT.md`
  right there — never batched.
- **User rejects the candidate with a load-bearing reason?** Offer an ADR:
  *"Want me to record this so future architecture reviews don't re-suggest
  it?"* **Only offer when the reason would actually be needed by a future
  explorer.** Skip ephemeral reasons ("not worth it right now") and
  self-evident ones. An ADR passes all three tests — hard to reverse ·
  surprising without context · the result of a real trade-off — or it isn't
  written.

## 4. Handoff

A candidate that survives grilling is a **design, not an implementation.**
Route it to `fx-plan` — tickets, blocking edges, and **expand–contract if it is
a wide refactor.** Never start editing from here.

## Testing strategy for a deepening — replace, don't layer

When the deepening lands:

- Old unit tests on the shallow modules become waste once tests at the deepened
  module's interface exist. **Delete them.**
- Write new tests **at the deepened module's interface** — the interface is the
  test surface.
- Assert on **observable outcomes through the interface**, not internal state.
- Tests should survive internal refactors, because they describe behavior.
  **If a test has to change when the implementation changes, it is testing past
  the interface.**
