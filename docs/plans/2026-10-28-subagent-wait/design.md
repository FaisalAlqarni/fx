# Subagent controller wait

## Problem

`skills/fx-implement/references/waiting.md` told every controller that ending a
turn with an agent child outstanding is safe because the child's completion
wakes it. That was measured with the controller as the main session.

On 2026-10-28 an fx-implement controller ran as a background subagent of the
main session. It dispatched its task 01 implementer, ledgered "Waiting on it;
frontier empty (every task blocks on 01)." and ended its turn. The implementer
finished, its completion notice went to the main session, and the controller
never woke. A second controller that waited on tracked background Bash
commands woke normally each time.

## Rule

- A controller first tells which it is, from an observable fact: the user's own
  session (main controller), or launched by an Agent tool call with its final
  message going to a parent session (subagent controller).
- Main controller: unchanged. The child's completion wakes it.
- Subagent controller: before ending a turn with a child outstanding, it
  launches a tracked background command that exits when the dispatch's report
  file lands, and ends the turn on it:
  `until [ -s <report> ]; do sleep 30; done; echo REPORT_LANDED`.
  This is the same shape as the existing docker log follower in the file.

The edit is a positive recipe keyed to an observable predicate, per
fx-authoring. Only `waiting.md` carried the claim; `SKILL.md` points at it and
does not repeat it, so `SKILL.md` is unchanged (19,066 bytes).

## Other harnesses

`references/harnesses/codex.md`, `opencode.md` and `opencode-v2.md` record
nothing about where a nested child's completion is delivered, so the edit
makes no claim for them.
