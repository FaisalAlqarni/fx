# Docs Authoring Guide

The default guide when a repo has none. It is not written into the repo unless the
owner asks.

## Structure

- Open every page with one short lead sentence that says what the page covers,
  then structure, then detail. Prefer a lead sentence and callouts over long prose.
- Use callouts for structure, not bold paragraphs: a summary or definition at the
  top of a long page, a takeaway, a caveat or limit, an aside, an open question.
  Use the callout form the repo's flavour supports (MkDocs admonitions, or GitHub
  `> [!NOTE]` callouts).
- Use tables to compare things or list a complex structure. Use Mermaid fenced
  blocks for flows and sequences.
- Collapse long detail (schemas, long field lists) where the flavour allows it.

## Accuracy

- Cite real numbers and sources (counts, file names), not estimates. Pull them from
  the actual data before writing.
- Mark unbuilt or deferred things as such. Do not describe a stub as if it ships.

## Linking

- Link to pages the docs site serves. For files it does not serve (prompts,
  scripts), use inline code for the path, not a link, so the build stays clean.

## Style

- Use title case for titles and section headers, and keep them short.
- Do not hard-wrap paragraphs. Readers' windows differ; let the editor wrap.
- Keep it plain: lead with the point, name who acts, use one term for one thing.

## Verify

Build the docs the way the repo does and confirm the build is clean, with no
broken-link warnings.
