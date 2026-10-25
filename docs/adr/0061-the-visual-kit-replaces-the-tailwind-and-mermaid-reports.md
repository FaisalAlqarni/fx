# The visual kit replaces the Tailwind and Mermaid reports

Status: accepted, 2026-10-25.

Supersedes: 0015 (decision: "A report vendors what it needs instead of reaching for a CDN at render time: `references/report-assets.md` is where that copy lives.")

## Context

ADR 0015 made reports committed files that render offline, and named `references/report-assets.md` as the place that holds the vendored Tailwind and Mermaid copies. Each lane that wrote a page then carried its own scaffold, and a reader met a different layout in each report. The visual kit in `references/visual/` gives every page one layout, one token set and one list of loadable files, and its diagrams are SVG or archify files, so no page needs Tailwind or Mermaid.

## Decision

1. The visual kit in `references/visual/` replaces the Tailwind and Mermaid reports. `fx-architecture` and the `fx-audit` Phase 4 report are written on the kit page template; `references/report-assets.md` and the Tailwind and Mermaid copies in `references/vendor/` are removed. A repo's existing `docs/plans/_assets/` copies are never deleted, so old reports keep opening.
   Evidence: references/visual/page-template.html
2. An HTML page loads only files that `references/visual/visual-assets.md` lists, copied into its output root's `_assets/` folder, and names no host. `tests/gates/visual-kit.test.js` checks the table's checksums and every page it covers.
   Evidence: src/tests/gates/visual-kit.test.ts
3. Mermaid stays in Markdown. A Mermaid diagram in `design.md` is drawn in the HTML report with the static SVG recipe; an HTML page never loads Mermaid.
   Evidence: references/visual/svg-static.md

## Still in force

Decisions of ADR 0015 that hold, restated as decisions of this ADR:

4. Nothing fx tells an agent to write lands in the OS temp directory. A report a user returns to lives in `docs/plans/<slug>/`, a throwaway worktree in `.worktrees/`, and a regenerable working file in the ephemeral workspace under `.fx/`. `scripts/check-artifacts` fails on any line of a file under `skills/`, `agents/` or `commands/` that names `/tmp`, `$TMPDIR`, `${TMPDIR`, `%TEMP%`, `os.tmpdir` or `tmpdir`, unless that line carries the exception marker `artifact-gate: ok`.
   Evidence: scripts/check-artifacts
5. This reverses the decision `fx-architecture` inherited, "Write to the OS temp directory so nothing lands in the repo". The reason it gave, that two runs left files in `/development`, is about the repository root. A plan directory is not the root, and fx has a durable home for what a user returns to.
6. Reports are committed files. An architecture report, an audit's phase documents and the visual companion's saved mockups land under version control in `docs/plans/<slug>/`. This is intended.
7. The ephemeral workspace under `.fx/` stays git ignored and is still deleted on a clean run. Only artifacts a user is meant to return to move into the repository.
8. An artifact in the repository renders without a network. `scripts/check-artifacts` fails on any `skills/`, `agents/`, `commands/` or `references/` file that loads a script or stylesheet from an `http:`, `https:` or protocol-relative URL, except `references/vendor/`, which holds pinned upstream library code rather than an instruction to an agent. A report vendors what it needs and never reaches for a CDN at render time; decisions 1 and 2 name where that copy lives.
   Evidence: scripts/check-artifacts

## Consequences

- The owner learns one page layout for reports, and a diagram is SVG or archify instead of Mermaid.
- The plugin shrinks by the Tailwind and Mermaid bundles. Old reports that load them keep working from their own `_assets/` folder.
- `scripts/handwritten-js-allowlist.txt` keeps the `docs/plans/_assets/` lines for those old reports.

## Alternatives

- Keep Tailwind and Mermaid beside the kit. Rejected: two layouts and two sets of vendored files for one report type.
- Delete the old `_assets/` copies in repos. Rejected: old reports would stop opening.
