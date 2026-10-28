# Visual check

Run this on every page an fx lane writes, before the lane says the page is done.

## What to open

Open each page four ways: light at 1440 px wide, dark at 1440, light at 390, dark at
390. Switch the theme with the page's own Theme button.

## What to check

- No console errors, with the console open from page load.
- The map reaches every level: from the root, open each node that says "opens" until
  no level is left, and read the evidence panel on one node and one edge per level.
- Text fits: no label cut off, no horizontal page scroll at 390 px (a wide figure
  scrolls inside its own box), no overlap.
- Both themes read: text, borders and the legend are visible in light and dark, and
  the chosen theme survives a reload.
- The evidence toggle opens and closes every evidence box.
- Labels and prose are English. Arabic appears only for real product strings and
  sample replies, wrapped as `<span lang="ar" dir="rtl">...</span>`. A page set to
  `dir="rtl"` mirrors without a broken layout, since the template uses logical
  properties.
- The page loads only `../_assets/` files; the network tab shows no outside request.

## archify diagrams

Use archify's own browser check for each diagram it rendered.
archify outputs are opened at 1440 and 390, light and dark, like every page; archify's own check still runs as well.

## No browser

When the runtime has no browser, do not claim the check ran. Write
`Visual check: not run: no browser` in the ledger and in the report, and name the
page.
