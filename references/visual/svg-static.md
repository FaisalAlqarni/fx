# Static SVG recipe

The cheapest sketch: one inline `<svg>` in the page, no script. Use it for a
small diagram that needs no motion and no drill-down.

## Rules

- Inline the SVG in the HTML. Give it a `viewBox`, `role="img"` and an
  `aria-label` that says what the diagram shows.
- Colours come from the page tokens: `fill="var(--panel)"`, `stroke="var(--accent)"`,
  text `fill="var(--ink)"`. Never a hard-coded colour, so light and dark both read.
- Boxes are `<rect rx="10">`, one `<text>` per line, 14px labels, 12px sublabels.
  Arrows are `<path>` with a `marker-end` triangle. Keep every label inside its box.
- Width scales: `width: 100%; height: auto`, with a `min-width` near the viewBox width
  inside an `overflow-x: auto` wrapper, so a phone scrolls the figure instead of
  shrinking the text.
- Use logical alignment in captions (`text-align: start`). Labels are English.
- Below the figure, one sentence says what to see; the evidence for each box goes in
  the chapter's bullets.

## Skeleton

```html
<figure class="svgbox">
<svg viewBox="0 0 520 120" role="img" aria-label="Request flows from the API to the database">
<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--muted)"/></marker></defs>
<rect x="10" y="30" width="180" height="60" rx="10" fill="var(--panel)" stroke="var(--accent)" stroke-width="1.6"/>
<text x="100" y="65" text-anchor="middle" fill="var(--ink)" font-size="14">API</text>
<rect x="330" y="30" width="180" height="60" rx="10" fill="var(--panel)" stroke="var(--accent)" stroke-width="1.6"/>
<text x="420" y="65" text-anchor="middle" fill="var(--ink)" font-size="14">Database</text>
<path d="M190,60 L330,60" stroke="var(--muted)" stroke-width="1.5" fill="none" marker-end="url(#a)"/>
</svg>
<figcaption>The API writes every order to the database.</figcaption>
</figure>
```
