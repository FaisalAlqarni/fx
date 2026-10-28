---
name: fx-docs
description: >
  Use when system documentation should be written, updated or checked: "document
  this", "update the docs", "are the docs current", "document the system", or
  after a change that docs describe. Keeps Markdown docs where every factual
  claim carries an evidence line. How a screen looks is fx-design, prose tone
  is fx-humanize, a decision is fx-adr. Skip it and the docs keep describing
  code that has moved, and the next reader trusts a claim nobody checked.
---

# fx-docs

Announce: "Using fx-docs."

Write, update and check the docs that describe a codebase. Every factual claim
carries evidence a reader can open and a parser can read. The code wins over any
doc, and a doc you cannot back with evidence is an open question, not a fact.

## 1. Source of truth: the Markdown

The Markdown docs are the record. There is no separate JSON model of the system.
Directly under every factual claim (a paragraph or a list item) write one
evidence line:

```
Evidence: `<path>:<lines>` `<symbol>`; `<path>`; owner, YYYY-MM-DD
```

Items are separated by `; `. A path item is a backticked path, optional `:start`
or `:start-end` lines, and an optional backticked symbol. A fact the owner
confirmed cites `owner, <date>` in place of a path. One example, as it sits in a
doc:

```
A short link expires 30 days after its last click.
Evidence: `engines/shortlink/app/models/link.rb:12-20` `Link#expired?`
```

A claim you cannot back with a path or an owner date is written as an open
question in the repo's callout form, never as a fact. Each doc ends with one
marker, `<!-- fx-docs verified: <40-character commit> -->`. Rewrite it to HEAD
after you have verified every claim in that doc, and only then.

Before you commit a doc you wrote or changed, invoke the fx-humanize lane in file
mode on it. It changes prose only, so evidence lines and the marker stay.

## 2. Layout and flavour

Docs live in `docs/<area>/*.md`, with Mermaid for flows. In a repo that already
has a docs structure, write into it and restructure only when told to.

- `mkdocs.yml` with the Material theme: use admonitions, cards and tabs.
- Anything else: GitHub callouts (`> [!NOTE]`) and Mermaid. Never write MkDocs
  admonitions in a repo that is not on MkDocs.
- On the first run in a MkDocs repo, propose adding `html/`, `issues/` and
  `plans/` to `exclude_docs`, so they stay out of the built site. Add them on a yes.

## 3. The docs guide

The repo's own docs guide wins. With none, follow [docs-guide.md](./docs-guide.md)
and never write it into the repo unless the owner asks.

## 4. Branch mode

fx-implement offers this lane after the build and before the branch review. On a
yes you get the worktree, the changed paths from
`git diff --no-renames <merge-base>...HEAD --name-only`, and any `Docs claim wrong:` lines. Work in
the worktree and commit on the branch:

1. Find every claim citing the changed paths (`--limit 0` lifts the default cap of 20):
   `node <skill base directory>/../../scripts/docs-index --root <worktree> query --limit 0 <changed paths>`.
2. Update the docs those claims live in, verify every claim in them (section 5),
   and handle each `Docs claim wrong:` line the controller passed: the code wins,
   so fix the claim, never the code.
3. List the docs elsewhere that the change made stale: run
   `node <skill base directory>/../../scripts/docs-index --root <worktree> stale`
   and list every `recheck` claim in a doc outside the step 2 set, with the HTML
   pages of each area whose Markdown changed ([html-pages.md](./html-pages.md)).
   Do not rewrite them.
4. Write a new doc when the change adds an engine, subsystem, public flow,
   command or integration that no doc covers. Ask the owner only what the code
   cannot answer, each with a recommended answer; leave the rest as open questions.
5. Commit the doc changes on the branch.

Report `Docs: <n> updated, <n> written, <n> listed stale, <n> HTML pages out of date`.

## 5. Stale check

Each doc records the commit it was last verified at. Pass one is
`node <skill base directory>/../../scripts/docs-index --root <repo> stale`: a
claim whose cited lines did not change since that commit passes free. Pass two
re-reads every claim marked `recheck` against the code at HEAD:

- Find where the symbol or behaviour lives now with semble, its `repo` set to
  the worktree, never the main checkout. When semble is missing or finds nothing,
  use repowise, then grep. Never install a tool: a missing one means the next.
- Confirm every hit by reading the file at HEAD.
- A claim nothing finds is listed as `stale: evidence not found`, never dropped.
- List every stale claim with its old and new evidence, and re-verify it. Nothing
  is rewritten without being listed.
- A drifted ADR claim is reported for `fx-adr`. This lane never edits an ADR.
  An ADR's verified commit lives in `.fx-verified` beside it, one
  `<file name> <commit>` line per ADR. After verifying every claim of an ADR,
  record it with
  `node <skill base directory>/../../scripts/docs-index --root <repo> verify <adr path>`
  and commit that file with the docs.

## 6. Full run

Run it only when the owner asks for it ("document the system") or says yes to
fx-implement's first-run offer. Steps, the doc set and the interview are in
[full-run.md](./full-run.md).

"Update the docs" in a repo where no doc carries an evidence line is not a full
run: annotate only the docs this change touches (evidence lines and the verified
marker) and leave every other doc as it is.

## 7. HTML pages

Markdown is always written. HTML pages in `docs/html/<area>/` are optional, on
the visual kit. Steps are in [html-pages.md](./html-pages.md). Pages default to
`lang="en" dir="ltr"`.

## 8. Language and fbrain

Prose and labels are English. Arabic appears only for real product strings and
sample replies. Repo docs stay in the repo. Cross-project decisions, status and
lessons go to fbrain through `fbrain propose`, never as copies of docs.
