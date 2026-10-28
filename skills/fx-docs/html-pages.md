# HTML pages

These steps run only in a repo without a system model; with one, the site replaces them.

HTML pages are optional. The Markdown is the record; a page presents the same
facts in its own way (chapters, a drill-down map, interactive diagrams), never a
copy of the Markdown prose.

## Where

- Pages live in `docs/html/<area>/`, mirroring the Markdown folders in `docs/`.
- Diagram specs live in `docs/html/<area>/src/`.
- Shared files live in `docs/html/_assets/`.

## How

1. Read `../../references/visual/visual-assets.md` and follow its copy rule into
   `docs/html/_assets/`. Copy `elkjs` only for a page that has a map.
2. Start from `../../references/visual/page-template.html`. Draw diagrams with
   `../../references/visual/svg-static.md` or `../../references/visual/svg-animated.md`.
3. Set `lang="en" dir="ltr"` on the page. Wrap Arabic product strings in
   `<span lang="ar" dir="rtl">`.
4. Each fact on a page carries the evidence its Markdown claim has.
   HTML-escape `&`, `<`, `>` and `"` in every string taken from the repository
   (facts, paths, symbols, titles, legend labels) before it goes into the page.
5. Run `../../references/visual/visual-check.md` before calling a page done.

## Out of date

When an area's Markdown changes, list that area's HTML pages as out of date
instead of rewriting them. Rebuild a page only when the owner asks.
