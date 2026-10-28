# fx-docs keeps docs on evidence lines, and the docs step is offered

Status: Superseded by 0066 (replaced: decisions 2, 4; the rest carried forward)

## Context

Docs describe code and drift from it. A doc nobody can check reads as true until a reader acts on it. Phase C needed a lane that writes and checks system docs, a place for the facts that is not a second model of the system, and a way to run it after a build without breaking ADR 0006, which says a lane points at another and never invokes it.

## Decision

1. `fx-docs` is a model-selectable lane that writes, updates and checks system documentation. Its triggers are "document this", "update the docs", "are the docs current" and "document the system". How a screen looks stays with `fx-design`, prose tone with `fx-humanize`, decisions with `fx-adr`.
   Evidence: `skills/fx-docs/SKILL.md`
2. The Markdown is the source of truth, with no separate JSON model of the system. Every factual claim carries one evidence line directly under it: a path, optional lines and an optional symbol, or `owner, <date>` for a fact the owner confirmed. The line is one form that a reader and the parser in `src/lib/doc-evidence.ts` both accept. A claim with no evidence is an open question, never a fact.
   Evidence: `src/lib/doc-evidence.ts`
3. Each doc records the commit it was last verified at. An ADR, whose body is never edited, has that commit recorded in a tracked `.fx-verified` file beside it, one `<file name> <commit>` line per ADR, written by `docs-index verify`. The stale check has two passes: unchanged cited lines pass free, and every other claim is re-read against the code at HEAD. A stale claim is listed with old and new evidence, never silently rewritten, and a drifted ADR claim is reported for `fx-adr`.
   Evidence: `src/lib/doc-index.ts` `stalePassOne`
4. `fx-implement` offers the docs step in one line before the branch review and never invokes `fx-docs` itself, so ADR 0006 stands. On a yes, `fx-docs` runs in branch mode on the branch's diff and commits on the branch, so the branch review covers its commits. An offer the controller cannot put to the owner (the build runs in one turn with no point to ask) is ledgered `Docs: offer pending` and becomes option 4 of the completion menu, so the step is never skipped on a guess that the owner is away. The completion report also carries a required ADR candidates section, offered as option 5 (`ADR candidates: none` when there are none). In a repo where no doc carries an evidence line, `fx-implement` instead offers a first full documentation run once; a no is stored as `"docs_first_run": "declined"` in `.fx.json` and the offer stops.
   Evidence: `skills/fx-implement/references/final-review.md`
5. The lane writes into the repo's own docs structure and flavour: MkDocs Material features only in a MkDocs repo, GitHub callouts and Mermaid elsewhere. The repo's docs guide wins; with none the lane follows a default guide shipped beside it and does not write it into the repo.
   Evidence: `skills/fx-docs/docs-guide.md`

## Consequences

- A reader can open the code a claim cites, and a doc that drifts shows up in the stale check.
- Writing a doc costs an evidence line per claim.
- A branch gets doc updates only when the owner says yes, and an offer that could not be put during the build waits in the completion menu.

## Alternatives

- Keep a JSON model of the system and render docs from it. Rejected: a second source of truth that drifts from both the code and the prose.
- Have `fx-implement` invoke `fx-docs` after the exit gate. Rejected: it breaks ADR 0006 and spends the owner's time without asking.
