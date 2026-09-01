# Grilling — the interview technique

A relentless interview until you reach a **shared understanding**. Used by
`fx-brainstorm` (designing) and `fx-architecture` (working a candidate), and
available on its own via `/fx:grill` to stress-test a plan, a decision, or an
idea.

## The design tree

Map the subject as a **tree**: every decision branches into the decisions that
hang off it.

The **frontier** is every decision whose prerequisites are already settled —
the questions you can ask *now* without guessing at answers you haven't heard
yet.

Work the tree in **rounds**. Each round's answers reshape it: settled decisions
push the frontier outward and unblock questions that depended on them.
Recompute the frontier and ask the next round.

**A question whose answer depends on another question still open in this round
belongs to a later round, not this one.**

## Round size

**2–4 related questions per round — one topic per round.**

- One question at a time loses the tree: when an answer opens a new branch, the
  branches you hadn't reached yet vanish silently.
- The whole frontier at once is a scattergun, and it exceeds what a person will
  answer carefully.

Give **your recommended answer on every question**, with the reason in one
line. The user can then accept a whole round with a word, and disagreement
becomes a signal rather than a chore.

## How to ask

Use the host's interactive question tool — `AskUserQuestion` in Claude Code
(max 4 questions × 4 options; put your recommendation first, labeled
"(Recommended)"; `multiSelect` where the choices aren't mutually exclusive).

No such tool available → numbered text, one recommendation per question.

Prefer multiple choice where it fits. Open-ended is fine when it doesn't.

## The ledger

Keep a written `## Open questions` block from round one:

```markdown
- [x] <settled> → <the decision>
- [ ] <still open>        ← raised R2
- [ ] <newly raised>      ← raised R4, by the user's answer
```

Every round: mark what closed, append what the user's answer newly raised, and
**state how many remain open.**

The user's tangents **add** to this list. They never silently remove from it.
This is the difference between a design that covers its ground and one that
ships with an unexplored area nobody noticed.

## Facts are your job; decisions are theirs

**Never ask the user for anything you could look up yourself.** When a frontier
question needs a fact from the environment — the filesystem, the code, a
config, a tool's behavior — dispatch a read-only agent to find it.

**Don't block on it.** A running exploration is an unsettled prerequisite, so
only the questions downstream of it wait for the result. Ask the rest of the
frontier now.

The **decisions** are the user's. Put each to them and wait.

## Done

The session is done when the **frontier is empty**: every branch of the tree
visited, nothing left silently assumed.

**Do not act on the outcome until the user confirms you have reached a shared
understanding.**
