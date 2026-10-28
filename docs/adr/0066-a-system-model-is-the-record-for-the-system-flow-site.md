# A system model is the record for the system-flow site; its Markdown is generated

Status: accepted, 2026-10-28.

Supersedes: 0062 (decisions 2, 4)

## Context

ADR 0062 made the Markdown the source of truth and ruled out a JSON model of the system. The system-flow lane now builds a site (diagrams, deep diagrams, generated Markdown) from a model of fragments that a CLI checks, and fx-docs has to keep that model current in branch mode. Two decisions of 0062 no longer fit: the Markdown cannot be the record for files that are generated, and the first full run is no longer an fx-docs procedure.

## Decision

1. In a repo with a system model, the model's fragments are the record, and the Markdown under the site's sections is generated from them. Hand-written docs elsewhere keep evidence lines as the record (decision 9). This replaces the first sentence of decision 2 of 0062; the rest of it holds as decision 9.
   Evidence: `src/lib/sf-markdown.ts`
2. The first full documentation run is `/fx:fx-system-flow`, the ninth user-invoked lane, which the owner types. `fx-implement`'s first-run offer names it and never runs it (ADR 0055); `fx-docs` says so in one line on "document the system" and `skills/fx-docs/full-run.md` is removed. This replaces the first-run offer in decision 4 of 0062; the rest of that decision holds as decision 10.
   Evidence: `skills/fx-implement/references/final-review.md`
3. The `system-flow` CLI is the one place for deterministic steps: `check`, `build`, `detect`, `query`, `stale` and `verify`. Evidence is verified on a path, a line range and a symbol, and an evidence path may take the `@<root>` form to name another root of a multi-root model. The site page draws its own diagrams: inline SVG figures, animated SVG step players and the React Flow map. Every archify diagram is a separate page under `diagrams/` that the site links to and never embeds, and with no archify that link goes to an SVG page instead, so the site never depends on archify.
   Evidence: `src/scripts/system-flow.ts`
4. In a repo with a model, `fx-docs` branch mode runs a model path first (`query --diff`, inventory entries for new engines, jobs and integrations, `verify`, `build --only`, `stale`) and then the Markdown path over hand-written docs. The Markdown path skips every file that carries the generated marker `<!-- fx-system-flow generated`, and the marker alone decides. A repo without a model keeps the old branch mode, HTML pages included.
   Evidence: `skills/fx-docs/SKILL.md`
5. Generated Markdown lives in `<docs_dir>/system/`, or in `<docs_dir>/system-generated/` when `system/` holds hand-written docs, and never in a section folder that holds hand-written docs. This departs from the design's first output rule, which put the Markdown in the existing section folder, because rewriting a folder of hand-written docs is out of scope.
   Evidence: `src/lib/sf-detect.ts`

## Still in force

Decisions of ADR 0062 that hold, restated as decisions of this ADR:

6. `fx-docs` is a model-selectable lane that writes, updates and checks system documentation. Its triggers are "document this", "update the docs", "are the docs current" and "document the system". How a screen looks stays with `fx-design`, prose tone with `fx-humanize`, decisions with `fx-adr`.
   Evidence: `skills/fx-docs/SKILL.md`
7. Each doc records the commit it was last verified at. An ADR, whose body is never edited, has that commit recorded in a tracked `.fx-verified` file beside it, one `<file name> <commit>` line per ADR, written by `docs-index verify`. The stale check has two passes: unchanged cited lines pass free, and every other claim is re-read against the code at HEAD. A stale claim is listed with old and new evidence, never silently rewritten, and a drifted ADR claim is reported for `fx-adr`.
   Evidence: `src/lib/doc-index.ts` `stalePassOne`
8. The lane writes into the repo's own docs structure and flavour: MkDocs Material features only in a MkDocs repo, GitHub callouts and Mermaid elsewhere. The repo's docs guide wins; with none the lane follows a default guide shipped beside it and does not write it into the repo.
   Evidence: `skills/fx-docs/docs-guide.md`
9. In hand-written docs, every factual claim carries one evidence line directly under it: a path, optional lines and an optional symbol, or `owner, <date>` for a fact the owner confirmed. The line is one form that a reader and the parser in `src/lib/doc-evidence.ts` both accept. A claim with no evidence is an open question, never a fact.
   Evidence: `src/lib/doc-evidence.ts`
10. `fx-implement` offers the docs step in one line before the branch review and never invokes `fx-docs` itself, so ADR 0006 stands. On a yes, `fx-docs` runs in branch mode on the branch's diff and commits on the branch, so the branch review covers its commits. An offer the controller cannot put to the owner (the build runs in one turn with no point to ask) is ledgered `Docs: offer pending` and becomes option 4 of the completion menu, so the step is never skipped on a guess that the owner is away. The completion report also carries a required ADR candidates section, offered as option 5 (`ADR candidates: none` when there are none). In a repo where no doc carries an evidence line, a no to the first-run offer of decision 2 is stored as `"docs_first_run": "declined"` in `.fx.json` and the offer stops.
   Evidence: `skills/fx-implement/references/final-review.md`

## Consequences

- A model item's fact is edited once, in a fragment, and a rebuild updates the Markdown and the figures.
- A generated file that loses its marker is read as hand-written by the Markdown path, so the two paths can then both touch it.
- This reverses the Out of Scope line of `docs/plans/2026-10-24-docs-and-adr-lanes/design.md`: "A JSON system model or a page build script in the system-flow style."

## Alternatives

- Keep the Markdown as the record and generate nothing. Rejected: the site's figures and chapters would then have no checked source.
- Generate into the existing section folder. Rejected: it overwrites or mixes with hand-written docs.
