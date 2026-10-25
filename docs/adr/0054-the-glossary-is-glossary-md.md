# The glossary is GLOSSARY.md

Status: accepted, 2026-10-25.

## Context

mattpocock-skills 1.3.0 renamed CONTEXT.md and CONTEXT-MAP.md to GLOSSARY.md and GLOSSARY-MAP.md. fx followed upstream, but the owner's repositories already hold CONTEXT.md files, and a rename done without asking would change files nobody expected to change. ADR 0016 describes the original CONTEXT.md design and stays as history.

## Decision

**The name.** fx's own text says GLOSSARY.md and GLOSSARY-MAP.md.

**The reading order.** A lane that reads the glossary takes GLOSSARY.md (or GLOSSARY-MAP.md) first and the old name second. It never creates a GLOSSARY.md beside an existing CONTEXT.md, so there is never a second glossary. The code is `src/lib/glossary.ts`, tested in `src/lib/glossary.test.ts` for four cases: new name only, old name only, both present (new one read, nothing created) and neither.

**One notice.** At session start a repository that still has the old name gets one notice line, once per session.

**Ask once, then migrate.** `/fx:fx-setup`, or the next lane that writes to the glossary, asks the owner once. On yes it runs `src/lib/glossary-migrate.ts`, which uses `git mv`, follows the root map's links, updates pointers in CLAUDE.md, repo.md and docs, overwrites nothing, commits nothing, and plans every move before making any (on a failed check it leaves the repository unchanged). On no it writes `"glossary_rename": "declined"` to `.fx.json` and stops asking. The key is parsed in `src/lib/fx-json.ts`. `src/lib/glossary-migrate.test.ts` covers the plan, the apply and the failure path.

**ADR 0016 is left as history.** An accepted ADR is not edited.

## Consequences

- An unmigrated repository keeps working and sees one line a session until the owner answers.
- Archived plans and ADRs under `docs/plans` and `docs/adr` keep the old name; the migration skips them.
- The owner decides each repository's rename; nothing is renamed behind their back.
