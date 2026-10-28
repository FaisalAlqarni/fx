# HTML Report Format

The architectural review renders as a **single self-contained HTML file inside
the plan directory**, not loose at the repository root: opened in a local
browser. It is written on the visual kit in `../../references/visual/`, so the
owner learns one page layout. Diagrams are inline SVG, or archify files when
the owner sets `detailed`. **Mix the patterns below: variety is part of the
point.**

The file is local and stays local. **Never publish it.** It opens and renders
with no internet connection: nothing about the repo leaves the machine.

**Supply chain.** The only files the page loads are the kit's vendored,
pinned files, served from `docs/plans/_assets/`: no CDN, no third-party host.
`../../references/visual/visual-assets.md` holds the versions, the checksums
and the copy, missing-file and mismatch rules.

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

Before writing the report file, follow the copy rule in
`../../references/visual/visual-assets.md` for the files this page loads
(`fx-tokens-1.css` only, since the report has no map): create
`docs/plans/_assets/` if it is missing and copy each file there when none of
that name exists. That file also holds the missing-file and mismatch rules.

## Scaffold

Start from `../../references/visual/page-template.html`: its tokens, theme
switch, header, legend and evidence toggle stay. Remove the map section, the
map data block and the four library scripts, and keep the
`fx-tokens-1.css` link. HTML-escape `&`, `<`, `>` and `"` in every string
taken from the repository (module names, paths, symbols, titles, legend labels)
before it goes into the page. Add this small layer to its `<style>` for the
diagrams:

```html
<style>
  .seam { stroke-dasharray: 4 4; }
  .leak { stroke: var(--alert); }
  .deep { fill: var(--ink); }
  article.card { border: 1px solid var(--rule); border-radius: 12px; background: var(--panel); padding: 20px; margin-block-end: 40px; }
  .ba { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
  .svgbox { overflow-x: auto; margin: 0; }
</style>
<main>
  <header>...</header>
  <section id="candidates">...</section>
  <section id="top-recommendation">...</section>
</main>
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
- **Badge row**: recommendation strength (`Strong` accent · `Worth exploring`
  alert · `Speculative` muted), plus a tag for the dependency category
  (`in-process`, `local-substitutable`, `ports & adapters`, `mock`)
- **Files**: monospaced list, `<code>`
- **Before / After diagram**: the centrepiece. Two columns, side by side,
  **custom-drawn, illustrating the shallowness and the deepening.** Static SVG
  by default (`../../references/visual/svg-static.md`), animated SVG for a
  collapse that needs motion (`svg-animated.md`), archify when the owner sets
  `detailed` (`archify-adapter.md`). State the pick and reason in one line
- **Problem**: one sentence. What hurts
- **Solution**: one sentence. What changes
- **Wins**: bullets, ≤6 words each: *"Tests hit one interface"*, *"Pricing
  logic stops leaking"*, *"Delete 4 shallow wrappers"*
- **ADR callout** (if applicable): one line in an alert-tinted box

**No paragraphs of explanation. If the diagram needs a paragraph to be
understood, redraw the diagram.**

## Diagram patterns

Pick the pattern that fits the candidate. **Mix them. Don't make every diagram
look the same: variety is part of the point.**

### Boxes and arrows: the workhorse for dependencies and call flow

For "X calls Y calls Z, and look at the mess." Draw it as the static SVG
recipe does: `<rect>` modules, `<path>` arrows with a `marker-end`. Class
leakage arrows `.leak` (alert colour) and seams `.seam` (dashed). For "before:
6 round-trips; after: 1", use the animated recipe's stepped token.

### Deep module: when the "after" should feel heavy

Draw the "after" as one thick-bordered `<rect>` (`.deep`) with its former
neighbours drawn greyed inside it. Thickness carries the weight; no
gradient is needed.

### Cross-section: for layered shallowness

Stack horizontal bands (`<rect>`, 48px tall, thick left stroke) showing the layers a call passes
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

- **Lean editorial, not corporate-dashboard.** Generous whitespace; the
  template's serif headings stay.
- **Colour sparingly:** the kit's accent, plus the alert token for leakage.
  Every colour is a page token, never a hard-coded value, so light and dark both
  read.
- Keep diagrams **~320px tall**, so before/after sits side by side without
  scrolling. A wide figure scrolls inside its own box at phone width.
- Uppercase small labels inside diagrams, so they read as schematic rather
  than as UI.
- **The only files the page loads are the kit's own**, per the shared
  reference above. Scripts are the template's theme switch and, for animated
  SVG, the recipe's few lines. No Mermaid, no Tailwind.
- Labels and prose are English. Run the check in
  `../../references/visual/visual-check.md`; with no browser, write
  `Visual check: not run: no browser` and name the page.

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

No hedging, no throat-clearing, no "it's worth noting that…". **If a sentence (prose-gate: quoting)
could be a bullet, make it a bullet. If a bullet could be cut, cut it. If a
term isn't in the glossary, reach for one that is before inventing a new one.**
