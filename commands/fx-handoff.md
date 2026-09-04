---
description: Compact this session into a handoff block you can paste into another session, on this machine or any other
---

# /fx:handoff

**Argument:** what the next session is for. No argument? Ask, in one line, then
write it. What the next session is *for* decides what to keep, and without it
you will summarise the whole conversation instead of the part that matters.

Adapted from `mattpocock-skills`' `handoff`, with one change that is the whole
point of it here: **the output is printed for copying, not saved to a file.**
A file helps a session that can read this filesystem. The reason to hand off by
hand is usually that the next one cannot.

## Ask first, unless the answer is obvious

**Where is this going?** It changes what survives the compaction, and it is the
one thing you cannot infer.

- **Another session on this machine, same repo.** Reference artifacts by path
  and keep the block short. `docs/plans/<slug>/state.md` and `plan.md` are
  already the record; restating them wastes the paste and goes stale the moment
  either changes.
- **Anywhere else**: another machine, another tool, a colleague, a web chat.
  **No path resolves there.** Inline the minimum that makes the work
  continuable, and say which artifacts exist that the reader cannot open.

If the argument already answers this, do not ask.

## What the block contains

Nothing that is already written down somewhere the reader can reach. In an fx
session that is most of it, which is why this stays short.

1. **The one-line goal**, from the argument.
2. **Where the work is**: branch, worktree path, and whether it is committed.
3. **State**: what is done, what is in flight, what is next. Two or three lines.
4. **Rulings that still bind**, from the ledger if there is one, each with what
   it costs if wrong. **These are the part most likely to be lost**, because
   they live in a file the next session may never open and were decisions made
   on the user's behalf.
5. **Lanes to invoke**, by addressable name: `fx:fx-implement`, `fx:fx-tdd`.
   A plugin skill resolves as `plugin:skill`, and a bare name may not resolve.
   Say which and why, not the whole routing table.
6. **What is not written down anywhere.** The thing you would say out loud if
   you were handing this over in person. If nothing, say so.
7. **Artifacts by path**, listed and not restated. Mark any the reader cannot
   open.

## Rules

- **Redact.** No keys, tokens, passwords, connection strings, customer data or
  personal information. Check before printing, not after.
- **Do not restate a file the reader can open.** Path only.
- **Do not summarise the conversation.** Summarise the work. A transcript of
  what was discussed is the failure mode this replaces.
- **Say what is unfinished and unverified**, including anything claimed but not
  run. A handoff that reports only the good state is how a false claim survives
  a session boundary, which is the one thing the receiving agent cannot check.

## Output

One fenced block, printed in the chat, nothing after it but a single line
offering to save a copy. The block is the deliverable and it must survive being
selected and pasted, so no interleaved commentary and no prose wrapped around
it.

```markdown
# Handoff: <one-line goal>

**Repo** <name> · **branch** <branch> · **worktree** <path or "none">
**Committed** <yes / no, N uncommitted files>
**Reader can open these paths** <yes / no>

## State
<done · in flight · next, in two or three lines>

## Rulings that still bind
- <what was decided>. Cost if wrong: <what it costs>.

## Invoke
- `fx:<lane>` <why>

## Not written down anywhere
<the thing you would say in person, or "nothing">

## Artifacts
- `<path>` <what it is> <"unreachable from there" if so>
```
