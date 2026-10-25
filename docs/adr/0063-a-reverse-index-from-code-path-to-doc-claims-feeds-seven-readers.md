# A reverse index from code path to doc claims feeds seven readers

Status: accepted, 2026-10-25.

## Context

A lane that decides something about an area should know what the docs and ADRs claim about it. Reading every doc costs too much, and a lane left to grep for them would do it differently each time. The evidence lines of ADR 0062 name the paths each claim covers, so one index can answer "what do the docs say about these paths".

## Decision

1. One reverse index maps a code path to the doc claims and ADR decisions citing it. A TypeScript module builds it from the evidence lines, `scripts/docs-index` writes it to `.fx/docs-index.json` and rebuilds it when a doc is newer than the index. The stale check and the lanes use the same index. A doc is read as an ADR only under a folder named `adr` or `decisions`, and a whole ADR leaves the lookups only when its status opens with Superseded, Deprecated or Ignored; "Partly superseded" keeps its decisions current.
   Evidence: `src/lib/doc-index.ts` `loadIndex`
2. Seven readers look up the paths they touch before deciding and read what comes back: `fx-brainstorm`, `fx-plan`, the implementer brief `fx-implement` compiles, `fx-review`, `fx-debug`, `fx-architecture` and `/fx:fx-retro`. Each holds one pointer line to `references/docs-lookup.md`, which says how to query and what to do with the result.
   Evidence: `references/docs-lookup.md`
3. The implementer brief gains a `## Docs and ADRs` section after the design excerpt: the first line says the code wins, then at most 20 claims citing the task's files, then a `+<n> more` line. The 20-claim cap lives once, in `docs-index query --limit`; `compile-brief` calls it and does not cap again.
   Evidence: `src/skills/fx-implement/scripts/compile-brief.ts`
4. Docs are claims and the code wins. A lane that finds a claim wrong neither follows nor fixes it. It writes `Docs claim wrong: <doc>:<line>: <what the code does>`. Inside a build the controller ledgers that line and the docs step handles it; outside a build the lane tells the owner and points at `fx-docs`.
   Evidence: `skills/fx-implement/references/handling-reports.md`
5. A repo whose `docs/` holds no Markdown with evidence lines outside `docs/plans/` skips every lookup, writes no index file and behaves as before.
   Evidence: `src/lib/doc-index.ts` `writeIndex`

## Consequences

- Every reader sees the same claims for the same paths, and a stale cache cannot survive a doc edit.
- A brief grows by at most 20 short lines.
- A repo with no evidence lines sees no change.

## Alternatives

- Each lane greps `docs/` for the paths it touches. Rejected: seven different searches, none sharing the stale check.
- Put the whole doc set in every brief. Rejected: it spends the implementer's context on docs the task never touches.
