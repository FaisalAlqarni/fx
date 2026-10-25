# Wayfinder

Read when the effort is too big for one design and its pieces cannot yet be
named. The agent keeps a local map of where the work stands. Everything stays in
the plan directory: no branch is pushed and no pull request is opened.

## Layout

```
docs/plans/YYYY-MM-DD-<effort>/
  map.md
  decisions/NN-<slug>.md
  research/<slug>.md
```

## map.md

The map is an index, not a store: it links to decisions and holds no answers of
its own. Sections:

- **Destination:** what the effort delivers, in the owner's words.
- **Notes:** facts every session needs.
- **Decisions so far:** one line per resolved decision, linking its file.
- **Not yet specified:** areas still in fog, named but not yet a question.
- **Out of scope:** what the effort will not do.

## decisions/NN-<slug>.md

One file per decision, with these fields:

```
**Question:** the question, stated precisely
**Type:** research | prototype | grilling | task
**Blocked by:** decision numbers, or none
**Status:** open | claimed | resolved

## Answer
```

## Rules

- **Decisions, not deliverables.** A decision file settles a question. Building
  the thing is a later plan.
- **Fog or ticket.** If you can state the question precisely now, it is a
  decision file. If not, it stays under "Not yet specified".
- **One decision per session**, except research, which may take several.
- **Act by the Type line.** Research reads sources and writes
  `research/<slug>.md`. Prototype builds a throwaway. Grilling interviews the owner.
  Task does the named work.
- **A question only the owner can answer is never answered by the agent.** Ask,
  record the owner's words under `## Answer`.
- Set Status to claimed when a session starts, resolved when the answer is
  written, then add the line to "Decisions so far".

## Exit

When no open decisions and no fog remain, `map.md` has cleared. Then
fx-brainstorm writes one `design.md` per sub-project from the linked decisions,
and each sub-project goes through its own design, plan and implementation cycle.
