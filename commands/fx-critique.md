---
description: Red-team a design or plan — dispatches fx-devils-advocate at the file and reports its findings
---

# /fx:critique

**Argument:** a path to a design or plan document — typically
`docs/plans/<slug>/design.md` or `docs/plans/<slug>/plan.md`.

No path given? Ask for one. **Do not guess** which document was meant.

---

## What this does

Dispatches `../agents/fx-devils-advocate.md` at that file. That is the whole
command. The agent owns the review — the lens, the modes, the output format and
the all/some/continue gate all live there, and this command must not restate or
second-guess any of it.

**Pick the mode from the artifact, and say which:**

| Artifact | Mode |
|---|---|
| a design, architecture or spec document | **design** |
| an implementation plan (`plan.md`, a task set) | **plan** |

In **plan mode**, pass the design document's path too when one exists beside
the plan — the design↔plan cross-reference is half of that mode, and without
the design the agent has to flag the missing cross-reference as a limitation of
the review.

## What this does not do

- **No classification, no design work, no planning.** `/fx:critique` reviews an
  artifact that already exists.
- **No edits.** The agent is read-only and so is this command. Findings are
  reported; fixing them is a separate, explicit decision by the human.
- **No resolving findings before the human picks.** The agent stops at its
  three-option gate. Relay the numbered findings and the gate as written, and
  wait.

## Report

The agent's findings verbatim, then its three-option question. Nothing added,
nothing softened, no summary that blunts a finding.
