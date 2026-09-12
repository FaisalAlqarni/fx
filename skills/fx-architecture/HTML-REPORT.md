# HTML Report Format

The architectural review renders as a **single self-contained HTML file inside
the plan directory**, not loose at the repository root: opened in a local
browser. Tailwind and Mermaid load from files copied into the project.
Mermaid handles graph-shaped diagrams reliably; hand-built divs and inline SVG
handle the more editorial visuals. **Mix the two: don't lean on Mermaid for
everything, it starts to look generic.**

The file is local and stays local. **Never publish it.** It opens and renders
with no internet connection: nothing about the repo leaves the machine.

**Supply chain.** Both libraries are vendored, pinned, and served from the
project: no CDN, no Subresource Integrity question, no third-party host in
the loop. `../../references/report-assets.md` holds the exact versions, the
checksums, the copy rule, and the three script tags below.

## Path and opening

```
file = docs/plans/<slug>/report-<timestamp>.html
       (no plan directory yet: docs/plans/YYYY-MM-DD-architecture-review/report-<timestamp>.html)
```

A fresh file per run. Then open it, and **print the absolute path regardless**: a silent failure to open leaves the path as the fallback:

| Platform | Command |
|---|---|
| Windows | `start "" "<path>"` |
| macOS | `open "<path>"` |
| Linux | `xdg-open "<path>"` |
| WSL | `explorer.exe "$(wslpath -w <path>)"` |

## Copy the assets first

Before writing the report file, follow the shared reference cited above for
the copy rule: create `docs/plans/_assets/` if it is missing, and copy each
vendored file there when no file of that name already exists. That reference
also holds the missing-file rule and the mismatch rule for the two cases
where a plain copy is not the right move.

## Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Architecture review for {{repo name}}</title>
    <script src="../_assets/tailwindcss-play-3.4.17.js"></script>
    <script src="../_assets/mermaid-11.17.2.min.js"></script>
    <script>mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });</script>
    <style>
      /* small custom layer for what Tailwind doesn't cover cleanly:
         dashed seam lines, hand-drawn-feeling arrow heads, etc. */
      .seam { stroke-dasharray: 4 4; }
      .leak { stroke: #dc2626; }
      .deep { background: linear-gradient(135deg, #0f172a, #1e293b); }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header>...</header>
      <section id="candidates" class="space-y-10">...</section>
      <section id="top-recommendation">...</section>
    </main>
  </body>
</html>
```

## Header

Repo name, date, and a compact legend: solid box = module, dashed line = seam,
red arrow = leakage, thick dark box = deep module. **No introduction paragraph.
Straight into the candidates.**

## Candidate card

**The diagrams carry the weight.** Prose is sparse, plain, and uses the
glossary terms without ceremony.

Each candidate is one `<article>`:

- **Title**: short, names the deepening ("Collapse the Order intake pipeline")
- **Badge row**: recommendation strength (`Strong` emerald · `Worth exploring`
  amber · `Speculative` slate), plus a tag for the dependency category
  (`in-process`, `local-substitutable`, `ports & adapters`, `mock`)
- **Files**: monospaced list, `font-mono text-sm`
- **Before / After diagram**: the centrepiece. Two columns, side by side,
  **custom-drawn, illustrating the shallowness and the deepening.** Mermaid
  where the relationship is graph-shaped; hand-built divs/SVG for the editorial
  visuals: mass diagrams, cross-sections, **collapse animations**
- **Problem**: one sentence. What hurts
- **Solution**: one sentence. What changes
- **Wins**: bullets, ≤6 words each: *"Tests hit one interface"*, *"Pricing
  logic stops leaking"*, *"Delete 4 shallow wrappers"*
- **ADR callout** (if applicable): one line in an amber-tinted box

**No paragraphs of explanation. If the diagram needs a paragraph to be
understood, redraw the diagram.**

## Diagram patterns

Pick the pattern that fits the candidate. **Mix them. Don't make every diagram
look the same: variety is part of the point.**

### Mermaid graph: the workhorse for dependencies and call flow

For "X calls Y calls Z, and look at the mess." Wrap it in a Tailwind-styled
card so it doesn't feel parachuted in. Use `classDef` to colour leakage edges
red and the deep module dark. Sequence diagrams work well for "before: 6
round-trips; after: 1."

```html
<div class="rounded-lg border border-slate-200 bg-white p-4">
  <pre class="mermaid">
    flowchart LR
      A[OrderHandler] --> B[OrderValidator]
      B --> C[OrderRepo]
      C -.leak.-> D[PricingClient]
      classDef leak stroke:#dc2626,stroke-width:2px;
      class C,D leak
  </pre>
</div>
```

### Hand-built boxes-and-arrows: when Mermaid's layout fights you

Modules as `<div>`s with borders and labels; arrows as inline SVG `<line>` or
`<path>` positioned absolutely over a relative container. Reach for this when
the "after" diagram should feel like **one thick-bordered deep module with
greyed-out internals**: Mermaid won't render that with the right weight.

### Cross-section: for layered shallowness

Stack horizontal bands (`h-12 border-l-4`) showing the layers a call passes
through. Before: 6 thin layers each doing nothing. After: 1 thick band labelled
with the consolidated responsibility.

### Mass diagram: for "interface as wide as implementation"

Two rectangles per module: interface surface area, and implementation. Before:
the interface rectangle is nearly as tall as the implementation one (shallow).
After: short interface, tall implementation (deep).

### Call-graph collapse

Before: a tree of function calls as nested boxes. After: the same tree
collapsed into one box, the now-internal calls shown faded inside it.

## Style guidance

- **Lean editorial, not corporate-dashboard.** Generous whitespace. Serif
  optional for headings (`font-serif` works well with stone/slate).
- **Colour sparingly:** one accent (emerald or indigo), plus red for leakage
  and amber for warnings.
- Keep diagrams **~320px tall**, so before/after sits comfortably side by side
  without scrolling.
- `text-xs uppercase tracking-wider` for module labels inside diagrams, so they
  read as schematic rather than as UI.
- **The only scripts are the vendored Tailwind file and the vendored Mermaid
  file**, per the shared reference cited above. The report is otherwise
  static: no app code, no interactivity beyond Mermaid's own rendering.

## Top recommendation section

One larger card. Candidate name, one sentence on why, an anchor link to its
card. **That's it.**

## Tone

Plain English, concise, but the architectural nouns and verbs come **straight
from `codebase-design.md`. Concision is not an excuse to drift.**

**Use exactly:** module · interface · implementation · depth · deep · shallow ·
seam · adapter · leverage · locality.

**Never substitute:** component, service, unit (for *module*) · API, signature
(for *interface*) · boundary (for *seam*) · layer, wrapper (for *module*, when
you mean module).

**Phrasings that fit:**

- "Order intake module is shallow: interface nearly matches the implementation."
- "Pricing leaks across the seam."
- "Deepen: one interface, one place to test."
- "Two adapters justify the seam: HTTP in prod, in-memory in tests."

**Wins bullets name the gain in glossary terms:** *"locality: bugs concentrate
in one module"*, *"leverage: one interface, N call sites"*, *"interface
shrinks; implementation absorbs the wrappers"*. **Don't write "easier to
maintain" or "cleaner code"**: those aren't in the glossary and don't earn
their place.

No hedging, no throat-clearing, no "it's worth noting that…". **If a sentence
could be a bullet, make it a bullet. If a bullet could be cut, cut it. If a
term isn't in the glossary, reach for one that is before inventing a new one.**
