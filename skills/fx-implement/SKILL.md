---
name: fx-implement
description: >
  Use when docs/plans/<slug>/tickets/ exists and the work needs building, or on
  "implement this", "build the plan", "start the tickets", "work through the
  queue", "go", "run the plan", "pick up where we left off". Requires an
  approved plan — if there is none, use fx-plan.
---

# fx-implement

Announce once: "Using fx-implement to work through <N> tickets." Then work.

Execute the plan by dispatching a **fresh implementer subagent per ticket**, a
**task review** (spec compliance + code quality) after each, and a **broad
whole-branch review** at the end.

**Why subagents:** isolated context, precisely constructed. They **never
inherit your session's history** — you build exactly what they need, which also
preserves your own context for coordination.

**Narration:** at most one short line between tool calls. The ledger and the
tool results carry the record.

## Rulings, not stalls

**Do not pause to check in between tickets.** Execute every ticket without
stopping. "Should I continue?" prompts and progress summaries waste the user's
time — they asked you to execute the plan, so execute it.

A running plan does not wait on a human. Conflicts, ambiguities, ticket
defects, a cap you would have asked to exceed — **decide them.** The design is
the binding authority, the plan is its argument, and your judgment settles what
neither answers. Record every decision in the ledger:

```
Ruling: <what you decided> — <why> — <what it costs if wrong>
```

**Reason:** a wrong ruling costs rework the user can see and undo. A session
parked on a question costs their whole day and buys nothing.

**Four things stop you, and only these:**

1. An irreversible or destructive operation.
2. A security-sensitive action.
3. A side effect outside this repo — a push, a merge, a publish, anything that
   leaves the machine.
4. A ticket so broken that every path forward is a guess.

For those, stop and ask. Everything else: rule, ledger, continue.

## When this skill applies

| Condition | Route |
|---|---|
| No written plan | `fx-plan` — or `fx-brainstorm` if there's no design either |
| Plan exists, tickets mostly independent | **this skill** |
| Plan exists, tickets tightly coupled throughout | this skill, but expect batching; if every ticket blocks every other, the plan needs re-cutting |

## Setup

### 1. Workspace

Detect existing isolation first (the submodule guard matters), prefer the
harness's native worktree tool over raw `git worktree add`, verify the
directory is git-ignored before creating anything, and never start on
main/master without explicit consent.

Full procedure and its rationalizations: `../../references/vocab/worktree-setup.md`.

**Detached HEAD: do not commit.** Those commits become unreachable the moment
HEAD moves. Create a branch first.

### 2. Project setup and clean baseline

Run the `setup` and `test_all` commands from **`.fx.json`** — never guess them.
Rails is not `npm install`; .NET is not `pytest`.

No `.fx.json`, or the command is `null`? **Ask.** Do not infer a command from
the file tree and run it.

Then load `../../references/stacks/<name>.md` for each entry in `stacks`. These carry
ecosystem traps only. **A name with no file is not an error** — it means no
traps file exists for that stack yet, and nothing else changes.

Run the baseline suite **before ticket 01**. A dirty baseline makes every later
failure ambiguous. Failures → report them and ask whether to proceed or
investigate; that call is the user's.

Report:

```
Worktree ready at <full-path> on <branch>
Baseline: <N> tests, 0 failures
Ready to implement <feature>
```

### 3. Two workspaces, split by lifetime

**Durable — `docs/plans/<slug>/`, committed:**
`design.md` · `plan.md` · `tickets/NN-*.md` · `state.md` (the ledger).
This is the record of what was decided and what happened. **Never delete it.**

**Ephemeral — `.fx/<slug>/`, git-ignored:**
`reports/NN-*-report.md` (implementer reports) · `review/*.diff` (review
packages).
These are working artifacts: verbose, and regenerable from git. **Verify
`.fx/` is git-ignored before writing to it** (`git check-ignore -q .fx`); if it
isn't, add it to `.gitignore` first — the same rule that protects `.worktrees/`.

Another slug's directory is never yours to read or write.

### 4. The ledger

**Conversation memory does not survive compaction.** In real sessions,
controllers that lost their place have re-dispatched entire completed ticket
sequences — the single most expensive failure observed. Track progress in a
file, not only in todos.

The ledger is `docs/plans/<slug>/state.md`, first line
`# fx ledger — plan: docs/plans/<slug>/plan.md`.

- If it exists and its first line names **this** plan: tickets with a
  `Ticket <NN>: complete` line are DONE. **Do not re-dispatch them.** Resume at
  the first ticket without one.
- A ticket whose last line is a fix round is mid-loop — resume at the next
  round.
- A ledger whose first line names a **different** plan is another plan's
  progress. Leave it alone and start your own.
- **After compaction, trust the ledger and `git log` over your own
  recollection.** The commits it names exist in git even when your context no
  longer remembers creating them.

The ledger is committed with the work. It is not scratch, and it is the record
of what happened while the user was away.

### 5. Read the plan, once

Read `plan.md` once. Note its **Global Constraints** and the design path. Read
`design.md` too — **the design is the authority the plan argues from, and
conflicts inside the plan resolve against it.** A plan with no reachable design
gets a ledger note saying so; rulings made without one are provisional.

Create a todo per ticket.

### 6. Pre-flight conflict scan

Before dispatching ticket 01, scan the whole ticket set, **writing down what
you checked as you check it**. Look for:

- tickets that contradict each other or the plan's Global Constraints;
- anything a ticket explicitly mandates that the review rubric treats as a
  defect (a test that asserts nothing, verbatim duplication of a logic block).

**The scan's output is a table, not a verdict.**

- One row for **every pair** of tickets sharing a file or an interface: the two
  tickets, what one Produces against what the other Consumes, what you found.
- One row for **every ticket**: whether its own text agrees with itself — the
  tests it specifies against the code it specifies, the files it creates
  against the files it later touches.

**"The scan is clean" without those rows is not a scan you ran.**

Write the table to the ledger. Rule on everything it surfaces *before*
execution begins, record each ruling beside its row, then dispatch ticket 01.
If the scan really is clean, proceed without comment. The review loop remains
the net for conflicts that only emerge from implementation.

## Model selection

Always specify the model explicitly when dispatching — an omitted model
inherits the session's, usually the most capable and most expensive.

Tier table, the turn-count-beats-token-price rule, and the complexity signals:
`../../references/vocab/model-selection.md`.

## The ticket loop

**Batch same-shape work.** When several tickets are each a small independent
edit of the same kind — the same one-line fix, constant change, or field
addition repeated across files — do **not** dispatch one subagent per ticket.
Compose ONE brief listing every file and its change, send the batch to a single
subagent, review its diff as one unit. Reserve one-dispatch-per-ticket for work
that needs its own judgment, its own tests, or its own review surface.

**Context hygiene.** Everything you paste into a dispatch prompt — and
everything a subagent prints back — stays resident in your context for the rest
of the session and is re-read on every later turn. **Hand artifacts over as
files.**

**Waiting on dispatched subagents.** Never poll a wait interface with short
timeouts, and never sit in one silent open-ended wait either. While you have
local work — ledger updates, packaging the next review, reading reports — keep
working; child results arrive on their own. When genuinely idle, wait in
bounded stretches (five to ten minutes where the platform allows); between
stretches post one line of status and reconcile your live children: list them,
and chase any that finished without reporting. **A bounded stretch keeps nearly
all of a long wait's efficiency while guaranteeing a stuck or lost child is
noticed within minutes, not at the end of the session.**

**Serial implementers.** Never dispatch implementation subagents in parallel.
The reason is the **shared test environment** — one Postgres, one ClickHouse,
one Redis, one broker set. A worktree is a second checkout, not a second
database. Concurrent test runs produce false RED and false GREEN, which poisons
every verification downstream. Relax only if `.fx.json` sets
`isolated_test_execution: true`. Parallelism belongs to reviews
(read-only) and to batched same-shape work.

### 1. Dispatch the implementer

Record `BASE=$(git rev-parse HEAD)` **before** dispatching — the review package
and every fix-round diff need it.

**The ticket file is the brief.** Pass its path. Never make a subagent read the
whole plan file.

The dispatch contains exactly five things:

1. One line on where this ticket fits in the project.
2. The ticket path, introduced as *"read this first — it is your requirements,
   with the exact values to use verbatim."*
3. Interfaces and decisions from earlier tickets that the ticket file cannot
   know.
4. Your resolution of any ambiguity you noticed in the ticket.
5. The report-file path and the report contract.

**Exact values — numbers, magic strings, signatures, test cases — appear only
in the ticket file**, never restated in the dispatch, so there is one source of
truth.

**A dispatch describes one ticket, not the session's history.** Do not paste
accumulated prior-ticket summaries ("state after tickets 1–3"). *A real
session's dispatch hit 42k characters, 99% of it pasted history.* A fresh
subagent needs its ticket, the interfaces it touches, and the Global
Constraints. Nothing else.

**Report file:** name it after the ticket (`tickets/03-foo.md` →
`.fx/<slug>/reports/03-foo-report.md`) and put the path in the dispatch. The implementer
writes its full report there and returns only: status, commits, a one-line test
summary, and concerns.

**Subagents inside a ticket.** The implementer may dispatch read-only agents
for lookup, never a reviewer and never another writer. The contract and both
reasons are in [implementer-prompt.md](./implementer-prompt.md).

If an earlier ticket parked a finding in the area this ticket touches, carry a
pointer to that ledger entry in the dispatch.

**Record the implementer's agent identity** from the dispatch result — fix
rounds 1–3 resume this agent.

Template: [implementer-prompt.md](./implementer-prompt.md)

### 2. Handle the report

Implementers report one of four statuses.

**DONE** — generate the review package, dispatch the task reviewer.

**DONE_WITH_CONCERNS** — the work is complete but the implementer flagged
doubts. Read them before proceeding. Concerns about **correctness or scope**:
address them before review. Observations ("this file is getting large"): note
them and proceed.

**NEEDS_CONTEXT** — provide the missing context and re-dispatch.

**BLOCKED** — assess the blocker:
1. Context problem → more context, re-dispatch, same model.
2. Needs more reasoning → re-dispatch on a more capable model.
3. Ticket too large → break it into smaller pieces.
4. **The plan itself is wrong** → rule on the correction, ledger it, re-dispatch
   with the ruling carried in the dispatch.
5. Genuinely unblockable → **skip it, ledger why, take the next unblocked
   ticket.** Never stop the queue for one ticket.

**Never ignore an escalation, and never force the same model to retry without
changing something.** If the implementer says it is stuck, something has to
change.

**If the implementer asks questions** — before starting or mid-ticket — answer
clearly and completely, provide extra context if needed, and do not rush it
into implementation.

### 3. Review the ticket

Per-ticket reviews are **ticket-scoped gates**. The broad review happens once,
at the end.

- **Never skip the task review.**
- **Never accept a report missing either verdict** — spec compliance AND ticket
  quality are both required.
- **Implementer self-review never replaces the task review.** Both are needed.

**Hand the reviewer its diff as a file.** Run
`scripts/review-package <TICKET> <BASE> <HEAD>`; pass the reviewer the path it
prints. Without bash: `git log --oneline`, `git diff --stat`, and
`git diff -U10` over the range, redirected to one uniquely named file. **The
output never enters your own context**, and the reviewer sees commit list, stat
summary and full diff in a single Read.

Use the **BASE you recorded before dispatching** — never `HEAD~1`, which
silently drops all but the last commit of a multi-commit ticket.
**Never dispatch a task reviewer without a diff file.**

The reviewer gets three paths — the ticket file, the report file, the review
package — plus the Global Constraints that bind the ticket.

**The Global Constraints block is the reviewer's attention lens.** Copy the
binding requirements **verbatim** from the plan or design: exact values, exact
formats, and the stated relationships between components ("same layout as X",
"matches Y"). The reviewer's template already carries the process rules (YAGNI,
test hygiene, review method); the constraints block is for what THIS project's
design demands.

- Do not add open-ended directives ("check all uses", "run race tests if
  useful") without a concrete, ticket-specific reason.
- Do not ask a reviewer to re-run tests the implementer already ran on the same
  code — the report carries the test evidence.
- **Do not pre-judge findings.** Never instruct a reviewer to ignore or not flag
  a specific issue. If you believe something would be a false positive, let the
  reviewer raise it and adjudicate it in the loop.
- **If the prompt you are writing contains "do not flag", "don't treat X as a
  defect", "at most Minor", or "the plan chose" — stop. You are pre-judging,
  usually to spare yourself a review loop.**

**⚠️ Cannot-verify-from-diff items.** The reviewer may flag requirements that
live in unchanged code or span tickets. These do not block the rest of the
review, but **you must resolve each one yourself before marking the ticket
complete** — you hold the plan and the cross-ticket context the reviewer lacks.
Confirm one is a real gap and it becomes a failed spec review: it enters the fix
loop with the others.

Template: [task-reviewer-prompt.md](./task-reviewer-prompt.md)

### 4. The fix loop

Triggered by spec ❌, any Critical or Important finding, or a ⚠️ item you
confirmed as a real gap. **Minor findings never enter it** — ledger them as
`Ticket <NN>: minor (deferred): <one-liner>` for the final review to triage.

Five rounds maximum. Rounds 1–3 resume the original implementer; rounds 4–5 use
a fresh one on a more capable model. Every round ends with a **scoped**
re-review. **Never fix findings yourself in the controller session.**

At the cap, adjudicate — and **adjudicate only at the cap; adjudicating earlier
to end a loop is pre-judging with a different name.**

Full procedure, the three adjudication categories, and the round formats:
[fix-loop.md](./fix-loop.md).

### 5. Complete the ticket

When the review is clean — or every open finding is parked with a ruling at the
cap — append the completion line in the same message as your other bookkeeping:

```
Ticket <NN>: complete (commits <base7>..<head7>, review clean)
Ticket <NN>: complete (commits <base7>..<head7>, <K> parked)
```

Plus: files touched · the guarantee row from `fx-tdd` · any rulings.

Mark the todo complete and move on. **Never move to the next ticket while the
review has open Critical/Important issues that are neither fixed nor
parked-with-a-ruling at the cap.**

## Commits

The implementer commits, one per ticket, inside the worktree branch. The rules
it must follow — **no attribution trailers, no push, no merge, no PR, never on
the base branch or a detached HEAD** — are carried in
[implementer-prompt.md](./implementer-prompt.md), because that is the agent
that runs them and it reads neither CLAUDE.md nor memory.

`fx-git-guard` rejects violations at the hook level. **A rejected commit is a
defect in your dispatch, not a reason to retry.**

## Final review

Package the whole branch:
`scripts/review-package <PLAN> <MERGE_BASE> <HEAD>` where `MERGE_BASE` is
`git merge-base <base-branch> HEAD`. Include the printed path in the dispatch,
**so the final reviewer reads one file instead of re-deriving the branch diff
with git commands.**

Dispatch `fx-review` in branch mode on the **most capable available model**.
Point it at the ledger's **deferred-minor and parked lines** so it can triage
which must be fixed before merge.

If it returns findings: **ONE fix subagent with the complete findings list — not
one fixer per finding.** *Per-finding fixers each rebuild context and re-run
suites; a real session's final-review fix wave cost more than all its tickets
combined.* Then exactly **one** scoped re-review of the fix wave. Adjudicate
residuals as at the breaker: park with rulings, or rule the load-bearing ones
and ledger the decision. **There is no second fix wave** — residual load-bearing
findings surface to the user in the completion report.

Only the four stop conditions stop you here.

## Exit gate — the Iron Law

```
NO COMPLETION CLAIM WITHOUT FRESH VERIFICATION EVIDENCE
```

If you have not run the command **in this message**, you cannot claim it passes.
**Violating the letter of this rule is violating its spirit.**

Before any claim or any expression of satisfaction:

1. **IDENTIFY** — what command proves this claim?
2. **RUN** — the full command, fresh and complete.
3. **READ** — the whole output; check the exit code; count the failures.
4. **VERIFY** — does the output actually confirm the claim? If not, state the
   real status with the evidence.
5. **ONLY THEN** make the claim, with the evidence attached.

**Skipping any step is lying, not verifying.**

Claim/requires/not-sufficient table, the rationalizations, and the
per-domain patterns: `../../references/vocab/verification.md`.

**Red flags — stop:** "should" / "probably" / "seems to" · "Great!" /
"Perfect!" / "Done!" before verification · about to commit without verification
· trusting an agent's success report · relying on a partial check · "just this
once" · tired and wanting the work over · **any wording implying success
without having run verification.**

**The rule applies to** exact phrases, paraphrases, synonyms, implications of
success, and any communication suggesting completion or correctness.

Full rationalization table and per-domain patterns:
`../../references/vocab/verification.md`.

## Completion report

No merge, no PR, no push. Report:

- **Landed** — tickets complete, with per-ticket test evidence.
- **Rulings I made** — **every** ledger line containing `Ruling:` — preflight
  rulings, parked findings, breaker adjudications, all of them — in the order
  you made them, each with what it costs if wrong. **The list is exhaustive: if
  the ledger holds a ruling, the list holds it.** *That list is the only place
  the decisions you took on the user's behalf reach them — they read it and
  rework whatever you got wrong. A ruling that dies unreported was a decision
  made in secret.*
- **Parked** — deferred findings and why.
- **Skipped** — blocked tickets and what unblocks them.
- **Needs you** — anything that hit a stop condition, plus the branch name and
  worktree path so the user can review and merge.

**Clean up the ephemeral half only.** When the final review is clean, delete
`.fx/<slug>/` — reports and review packages are regenerable from git. **Never
delete `docs/plans/<slug>/`**: it is committed and durable, and it is the
record. Sibling directories belong to other work; leave them alone.

## Common rationalizations

| Thought | Reality |
|---|---|
| "Close enough on spec compliance" | The reviewer found spec gaps = not done. Fix, or hit the cap and adjudicate. Those are the only exits. |
| "I'll fix it myself, dispatching is overhead" | Controller fixes pollute your context and skip review. Resume the implementer. |
| "One more round will converge" | Past the cap, rounds don't converge — the failure is structural. Adjudicate and route. |
| "The reviewer will just find something new anyway" | Scoped re-reviews verify fixes; they cannot wander. New findings on untouched code go to the ledger, not the loop. |
| "This finding is obviously wrong, I'll drop it" | You adjudicate only at the cap, and every ruling is a ledger entry. Silent discards are forbidden. |
| "The fix was small, skip the re-review" | Unreviewed fixes are how regressions land. Every round ends with a scoped re-review. |
| "Reviews slow the loop down" | The loop without reviews is unverified churn. Reviews are its brakes and steering. |
| "Ledger bookkeeping is overhead" | The ledger is what survives compaction. Controllers without one have re-dispatched entire completed sequences. |
| "The implementer spawned its own reviewer — free extra assurance" | A duplicate seat on the same diff. The task review is the gate. A worker-spawned reviewer is a defect to flag, not rigor. |
| "I'll just ask whether this is right" | Rule it, ledger it, continue. |
| "A progress summary would be helpful" | They asked you to execute. Execute. |
| "I remember finishing that ticket" | Trust the ledger, not your memory. |
| "This ticket is blocked, I'll stop" | Skip it, ledger it, take the next unblocked one. |
| "I'll run these in parallel to save time" | Implementers never run in parallel — the test environment is shared. |
| "I'm obviously not in a worktree — no need to check" | Run the Step 0 detection. Harness-created isolation and submodules both fool eyeballing; the commands settle it. |
| "`git worktree add` is quicker than hunting for a native tool" | A native tool owns placement, branching and cleanup. Bypassing it is the #1 mistake — it creates phantom state the harness can't see or manage. |
| "The worktree directory is surely ignored already" | Run `git check-ignore`. An unignored worktree directory commits the whole tree into the repo. |
| "Any directory name works" | Explicit instructions beat an existing project-local directory, which beats the `.worktrees/` default. |
| "The workspace is fresh — baseline tests can wait" | A dirty baseline makes every later failure ambiguous. Run them now; proceeding past failures is the user's call. |
