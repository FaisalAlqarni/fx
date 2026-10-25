# fx-adr writes, supersedes and indexes ADRs

Status: accepted, 2026-10-25.

## Context

fx told lanes to offer an ADR but had no lane that wrote one. A repo's ADRs also drift: a later decision replaces part of an earlier one, and the earlier ADR keeps reading as current. A status of "partly superseded" leaves the reader to work out which half still holds. The repos fx works in use different ADR formats (bullet status lines, `## Status` sections, no index), so the lane must copy the repo's own shape.

## Decision

1. `fx-adr` is a model-selectable lane that writes, supersedes and indexes ADRs. Whether a decision deserves one is still decided by the three tests in `references/vocab/domain-modeling.md`; other lanes point at `fx-adr` and never invoke it (ADR 0006).
   Evidence: skills/fx-adr/SKILL.md
2. The lane reads the repo's existing ADRs first and copies their folder, naming, heading and status form. Only a repo with no ADRs gets `references/templates/adr-template.md`.
3. Every ADR the lane writes numbers each decision in its Decision section, so a later ADR can name "decisions 2 and 4". An older ADR without numbers is named by quoting each replaced decision's lead phrase.
4. A superseding ADR restates every still-in-force decision of the old one in a `## Still in force` section, numbered on from the Decision section, and carries a `Supersedes: NNNN (decisions 2, 4)` line. Each decision then has exactly one live copy and the newest ADR alone tells the current story.
5. The old ADR's status becomes `Superseded by NNNN (replaced: decisions 2, 4; the rest carried forward)`. It is never "Partly superseded".
6. An existing ADR is edited only in its status line. An ADR with no status line may get exactly one, added under its title. Nothing else in an accepted ADR changes.
7. The lane keeps `index.md` in the ADR folder, one row per ADR with number, title, date and status. Rows are built mechanically from the status line, a later ADR's `Supersedes:` line and `git log --diff-filter=A`, never from memory. Statuses are `current`, `superseded by NNNN`, or the repo's own words.

## Consequences

- A reader of the newest ADR in a chain does not open the older ones to learn what holds.
- Superseding costs the author a restatement of the surviving decisions.
- fx's own `docs/adr/` gets its first index.

## Alternatives

- Mark the old ADR "partly superseded" and leave the surviving decisions in place. Rejected: the reader cannot tell which decisions survive without comparing both ADRs.
- Edit the old ADR to delete the replaced decisions. Rejected: an accepted ADR is a record, and its history is the point.
