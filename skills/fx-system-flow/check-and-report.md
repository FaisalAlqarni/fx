# Check and report

Step 6, after the final build exits 0. The visual check follows
`../../references/visual/visual-check.md`; the archify rules follow
`../../references/visual/archify-adapter.md`.

## Visual check

Open `<site>/index.html` and every page under `<site>/diagrams/`, archify
outputs included, four ways: light at 1440, dark at 1440, light at 390, dark
at 390. Check each against the visual check reference. Fix a failure at its
source (a fragment, a layout hint) and run the build again, never by editing a
generated page.

**An archify page that fails at 390:** one retry, by running the build with
`--page-limit <name>=5` for a sequence or store flow. Still failing, or an
architecture diagram, run the build with `--svg <name>`. `build` saves both in
`.fx.json` `system_flow.diagrams`, so later runs render that diagram the same
way. Report each such diagram.

**No browser:** write `Visual check: not run: no browser` and name every page
and diagram that was not opened. Never claim the check ran.

## Unfit figure

`build` exits 1 when a figure cannot meet 1 crossing and 860 px, naming the
figure and its best layout line. At most 2 rounds:

1. Split the diagram: move a group of nodes to a child level, with a node in
   the parent whose `children` names the new diagram. Or add level-0 layout
   hints.
2. Run the build.

Still failing after round 2: report the figure to the owner with its crossings
and width, and stop for their decision. Nothing is built for that figure until
they decide.

## Report

Write the report in chat, from the last `BuildResult` and the run's record:

- **Counts:** items by kind, diagrams by level, sequences, store flows, rules,
  evidence entries, files cited.
- **Depth:** a table from `BuildResult.depth.areas`, one row per area, planned
  against built:

  | Area | Levels planned | Levels built | Diagrams planned | Diagrams built | Sequences planned | Sequences built | Store flows planned | Store flows built |
  |---|---|---|---|---|---|---|---|---|

  Under it, each shortfall with the reason its subagent gave. Then the totals
  from `depth.total`: primary nodes, context nodes, edges, messages, store rows,
  chapters.
- **Diagrams:** each `diagrams[]` entry with its renderer and `reason`. When
  archify was not found, say once that every deep diagram is SVG.
- **Layout:** the layout report summary from `layout`: figures, crossings,
  widths, any dropped arrows.
- **Coverage:** `coverage` counts per kind, covered of total, and each entry
  not covered.
- **Theme:** the theme source, and each slot that fell back to fx's value.
- **Stale:** the entries `system-flow stale` lists, or none.
- **Questions:** answered, skipped, and the open ones by id.
- **Unconfirmed items:** by handle, with the reason.
- **Visual check:** passed, the failures fixed, or
  `Visual check: not run: no browser` naming every page.
- **Cost:** tokens and minutes against the `estimate` totals, measured with
  `node <skill base directory>/../../scripts/build-cost` run from the host
  root. It reads this session's transcript and prints the controller's tokens
  and the subagents' tokens; report their sum and the wall clock it prints. When it
  prints `no transcript recorded`, report the subagent tokens you have and
  write `controller tokens not included`.
- **Next:** the files written, for the owner to review and commit. The lane
  committed nothing.
