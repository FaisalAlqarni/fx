# Templates live in one folder and .scratch is retired

Status: accepted, 2026-10-25.

## Context

Lane output formats (design, ADR, PR, retro) were spread across skills, and a fixed bug left no record. fx also named `.scratch/` as the place for issues and drafts, a folder that git often ignores, so issues were lost with the checkout. The owner's repos hold real `.scratch/` issue files (advantage-backend keeps its issues there).

## Decision

1. The text a lane copies to produce a document lives in `references/templates/`: `design-template.md`, `adr-template.md`, `pr-template.md`, `retro-template.md` and `bug-report-template.md`. Lanes point at a template by path and carry no inline copy. Templates are leaves and link no other reference.
   Evidence: `references/templates`
2. A fixed bug leaves `docs/issues/<YYYY-MM-DD>-<slug>.md`, written from the bug report template at the end of fx-debug's Phase 6 and committed with the fix. A session with no fix writes none. The prevention question is the report's last section.
   Evidence: `skills/fx-debug/SKILL.md`
3. Issues are committed under `docs/issues/`; throwaway material (drafts, test material, regenerated files) goes to `.fx/`. fx's own text no longer names `.scratch/`, except where it forbids writing designs there.
4. `/fx:fx-setup` finds a `.scratch/` with Markdown issues and runs `lib/scratch-migrate.js` as a dry run. It shows the moves, every pointer line it will change, the `.gitignore` line it will remove and the rollback, then asks once. Tracked entries move with `git mv --`, untracked or ignored ones with a filesystem move. A failed step undoes the finished ones. The script commits nothing; the owner runs `git add -- docs/issues`.
   Evidence: `src/lib/scratch-migrate.ts`
5. On no, setup writes `"scratch_migrate": "declined"` to `.fx.json` and never asks again. With no human to answer, it does nothing and writes nothing. The migration never runs from a dispatched subagent.
   Evidence: `src/lib/fx-json.ts`

## Consequences

- Issues survive a fresh checkout because they are committed.
- A repo that declines keeps its `.scratch/` and sees no further prompt.
- fx edits pointers in `CLAUDE.md`, `AGENTS.md`, `repo.md` and docs outside `docs/plans/`, `docs/adr/` and `docs/issues/`; the owner reviews the diff before committing.

## Alternatives

- Keep `.scratch/` and only document it. Rejected: it stays ignored in some repos and issues are lost.
- Migrate without asking. Rejected: it moves owner files, the same reason ADR 0054 asks before renaming the glossary.
