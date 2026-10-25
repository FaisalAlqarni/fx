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
4. Check the file with archify's own browser check, not the page-level check.
5. If archify fails or renders an empty file, say so and fall back to static SVG for
   that diagram.
