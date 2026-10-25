---
name: fx-adr
description: >
  Use when a decision should be recorded or an ADR changed: "record this
  decision", "write an ADR", "supersede ADR", "is this ADR still current".
  Skip it and the decision lives only in a chat, a replaced ADR keeps reading
  as current, and the next engineer reverses a choice that was deliberate.
---

# fx-adr

Announce: "Using fx-adr."

Write, supersede and index architecture decision records in the repo's own
format. Whether a decision deserves an ADR is decided by the three tests in
`../../references/vocab/domain-modeling.md` ("ADRs: offer sparingly"). Missing
one: say so and write nothing.

## 1. Read the repo's format first

Before writing, read the existing ADRs and note:

- **The folder:** `docs/adr/`, `docs/decisions/`, or the folder `mkdocs.yml`
  lists in its nav.
- **The naming:** `NNNN-slug.md`, `ADR-NNN-slug.md`, or the repo's own.
- **The heading form,** the **status form** (a `Status:` line, a `## Status`
  section, a `- **Status:**` bullet) and the **sections in use.**

Copy that shape and take the next number (highest existing plus one). A repo
with no ADRs gets `../../references/templates/adr-template.md` in `docs/adr/`.
With several ADR folders (one per context), write in the folder of the area the
decision touches.

## 2. Number the decisions

Every ADR this lane writes numbers each decision in its Decision section, so a
later ADR can name "decisions 2 and 4". An older ADR without numbers is named
by quoting each replaced decision's lead phrase.

A numbered decision may carry an indented `Evidence:` line naming the code it
governs, in the form the docs index parses: each item in backticks, as in
``Evidence: `src/lib/x.ts:40-58` `parse`; `config/plans.yml` ``. `:40-58` and the
symbol are optional, `; ` separates items, and a bare path does not parse. The
docs stale check reads these lines.

## 3. Supersede

Never edit an existing ADR beyond its status line. An ADR with no status line
gets exactly one, added under its title; that and changing that line are the
only edits ever allowed.

The new ADR carries:

- a `Supersedes: NNNN (decisions 2, 4)` line under its status;
- a `## Still in force` section restating every decision of the old ADR that
  still holds, numbered on from the Decision section, so each is a decision of
  the new ADR and the newest ADR alone is the current story.

The old ADR's status becomes `Superseded by NNNN (replaced: decisions 2, 4; the
rest carried forward)`, written in the repo's status form. Never "Partly
superseded".

## 4. Keep the index

Keep `index.md` or `README.md` in the ADR folder, and create `index.md` when
none exists. One row per ADR: number, title, date, status. Status is `current`,
`superseded by NNNN`, or the repo's own words when its index already uses them.

Build rows mechanically, never from memory:

- **Status:** the ADR's status line; else a later ADR's `Supersedes:` line
  naming it; else current.
- **Date:** the status line; else
  `git log --diff-filter=A --format=%as -- <file>`.

When `mkdocs.yml` lists ADRs in its nav, add the new one there.

## 5. fbrain

When the `fbrain` CLI or its MCP `propose` tool exists and the decision spans
projects, make one `fbrain propose` with a short note that links the ADR. Never
copy the ADR into the brain. Never approve or review proposals.

## 6. Commits

Invoked standalone: write the files and stage nothing. Inside `fx-implement`:
commit the ADR with the task that made the decision.

## 7. "Is this ADR still current?"

Report, and edit nothing: its status line, which ADR supersedes it and which
decisions, and, once evidence lines are checked, any drift the docs stale check
reported.
