# archify adapter

archify draws detailed, interactive diagrams. Use it only when it is installed.

## Choose the diagram per diagram

- **archify:** detailed, interactive or many-level diagrams.
- **Animated SVG:** a small flow that needs motion.
- **Static SVG:** the cheapest sketch.

State the pick and the reason in one line before drawing, for example: "Using static
SVG: five boxes, no motion needed." The owner may set `cheap`, `fast` or `detailed`
for the run: `cheap` prefers static SVG, `fast` prefers the lowest rendering effort,
`detailed` prefers archify. Ask first only when a run would render many archify
diagrams. With no archify installed, every diagram is SVG. Mermaid belongs in
Markdown only; an HTML page never loads it.

## Render a spec with archify

1. Write the spec: the nodes, edges and groups of the diagram, with a short label and
   one line of role for each node. Take them from the evidence you already hold; a
   node with no evidence does not go in.
2. Invoke the archify skill with the spec and name the output folder, for example
   the folder of the page that will embed the diagram. archify writes a standalone
   HTML file there.
3. Link the file from the page with a relative link (`<a href="diagram.html">`) or
   embed it in an `<iframe src="diagram.html" title="...">`. The file stays in that
   folder and loads nothing from a host.
4. Check the file with archify's own browser check, and also open it like every page:
   at 1440 and 390 px wide, light and dark. A file that overflows
   or cuts a label at 390 gets one retry with a sequence page limit of 5 messages per
   page (`--page-limit <name>=5`); still failing, that diagram goes to SVG
   (`--svg <name>`).
5. If archify fails or renders an empty file, say so and fall back to static SVG for
   that diagram.

## Rules for a system-flow site

`system-flow build` runs archify itself; the lane does not write archify files by hand.

- **Finding archify.** `--archify <dir>` when given; a folder without
  `bin/archify.mjs` stops the build with an error naming it. Otherwise, unless the
  saved preference is `cheap`, the first folder holding `bin/archify.mjs` among
  `$CLAUDE_CONFIG_DIR/skills/archify` and `$HOME/.claude/skills/archify`. A path in
  the repo is never run, so `.fx.json` cannot name one: check reports a
  `system_flow.diagrams.archify` key as an error. `system-flow detect` prints the
  pick; the lane passes it as `--archify`.
- **Sources come from evidence.** Every primary element of a spec gets `sources`
  filled from its evidence, at most 3 ranges. Evidence from another root goes to the
  steps card, never to `sources`.
- **The single-root rule.** A spec describes one repository: the root most of
  its evidence cites. `meta.repository` is that root's remote and HEAD with
  `link_mode: "local-only"`, and `--repo-root` is that root's folder. archify takes
  only a remote address as the url and checks `sources` through it, so a root with no
  remote gets neither `meta.repository` nor `sources`; its evidence goes to the steps
  card.
- **Labels fit archify's measure.** archify draws node text on one line and rejects a
  component label, component sublabel or participant label wider than its box. The
  build cuts such a label in the spec to fit, ending it in `...`, and names each cut
  in the diagram's reason (`shortened: api sublabel`).
- **One finalize at a time.** archify locks the output folder during a delivery, so
  the build runs its `finalize` calls one after another.
- **The theme block.** After archify finishes, the build writes the page palette into
  the output between `/* fx-theme:begin */` and `/* fx-theme:end */`, mapped onto
  archify's own variable names, and replaces the block on every build. Never edit
  inside it.
- **The fixed retry.** A sequence or store flow that archify fails is rendered again
  at 5 messages per page. Still failing, or a failed architecture diagram, it falls
  back to SVG and the receipt path is reported. No agent edits the spec between
  attempts. The retry's receipts are named `<name>.retry.receipt.json`, so the first
  attempt's receipts survive it, and the build removes its own pages and specs of
  that diagram that the fallback does not use.
- **Sequence canvases.** archify gives an authored sequence viewBox no reader fit and
  fails delivery on a canvas narrower than 1.55 times its height
  (`composition/viewport-height`), so every sequence and flow canvas is at least
  that wide.
- **Loads, not links.** A page that loads a file from outside the site (`src`,
  `srcset`, a `<link>` href, CSS `url()` or `@import`, or a `../` above the site)
  falls back to SVG. An anchor href, such as archify's credit link, is a link and
  stays.
- **The 390 check.** An archify page that fails the 390 px check is retried once with
  5 messages per page, then SVG.
- **Saved choices.** `--page-limit <name>=<n>`, `--svg <name>` and `--prefer` are
  saved in `.fx.json` `system_flow.diagrams`, so a later build with no flags renders
  every diagram the same way. `--archify` is never saved.
