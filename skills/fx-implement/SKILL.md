---
name: fx-implement
description: >
  Use when docs/plans/<slug>/tasks/ exists and the work needs building, or on
  "implement this", "build the plan", "start the tasks", "go", "pick up where we
  left off". Requires an approved plan; if there is none, use fx-plan. Skip it
  and there is no worktree, no ledger and no per-task review, so a compacted
  session redoes work that was already finished.
---

# fx-implement

Announce once: "Using fx-implement to work through <N> tasks." Then work.

Execute the plan by dispatching a **fresh implementer subagent per task**, a
**task review** (spec compliance + code quality) after each, and a **broad
whole-branch review** at the end.

**Why subagents:** isolated, precisely-built context. They never inherit your
session's history, which also keeps your own context clean for coordination.

**When the task files look complete enough to just execute**: read [why-this-lane.md](./references/why-this-lane.md), every time.

**When the plan has a `tickets/` directory**: read [setup.md](./references/setup.md), every time.

**Narration:** the ledger is the record, the chat is not: every entry, ruling and completion line this skill
asks you to write belongs in the ledger. Writing it again in chat is the
progress summary the next section forbids. Chat text between tool calls says
what the user needs to follow along.

## Rulings, not stalls

**Stopping is not something you do: it's what happens when a message ends
with nothing queued behind it.** So the rule is positive: **the last tool call
of every message is the next task's dispatch or its review.** If you are about
to write a summary and no dispatch is in flight, you have already stopped: queue the next one instead of explaining why you paused. "Should I continue?"
prompts and progress summaries waste the user's time: they asked you to
execute the plan, so execute it.

A running plan does not wait on a human. Conflicts, ambiguities, task
defects, a cap you would have asked to exceed: **decide them.** The design is
the binding authority, the plan is its argument, and your judgment settles what
neither answers. Record every decision in the ledger:

```markdown
Ruling: <what you decided>. Why: <why>. Cost if wrong: <what it costs>,
        caught by <the checkpoint that would catch it, if one would>.
```

**Reason:** a wrong ruling costs rework the user can see and undo. A session
parked on a question costs their whole day and buys nothing.

**Before you rule or ledger a claim**: read [rulings.md](./references/rulings.md), every time.

**Four things stop you, and only these:**

1. An irreversible or destructive operation.
2. A security-sensitive action.
3. A side effect outside this repo: a push, a merge, a publish, anything that
   leaves the machine.
4. A task so broken that every path forward is a guess.

For those, stop and ask. Everything else: rule, ledger, continue.

**Before you end a turn while something runs**: read [waiting.md](./references/waiting.md), every time.

## When this skill applies

| Condition | Route |
|---|---|
| No written plan | `fx-plan`, or `fx-brainstorm` if there's no design either |
| Plan exists, tasks mostly independent | **this skill** |
| Plan exists, tasks tightly coupled throughout | this skill, but expect batching; if every task blocks every other, the plan needs re-cutting |

## Setup

**Before you create the workspace**: read [setup.md](./references/setup.md), every time.

### 4. The ledger

**Conversation memory does not survive compaction.** Controllers that lost
their place have re-dispatched entire completed task sequences: the single
most expensive failure observed. Track progress in a file, not only in todos.

The ledger is `docs/plans/<slug>/state.md`, first line
`# fx ledger: plan: docs/plans/<slug>/plan.md`.

**Standing rulings.** When you create the ledger, write a `## Standing rulings`
section after the first line and copy into it every `Ruling:` line from
`docs/plans/rulings.md`, if that file exists, then a `## Log` heading for the
first log line. The copy is a record: the session-start notice reads only
`docs/plans/rulings.md`, so a ruling edited or deleted there stops applying
at once. When the owner gives a ruling
mid-run, ask one question: this plan only, or every plan? For every plan,
append the `Ruling:` line to `docs/plans/rulings.md` as well and commit it with
the ledger. The session-start notice carries `docs/plans/rulings.md` after a compaction,
so those rulings hold without the owner repeating them.

- If it exists and its first line names **this** plan: tasks with a
  `Task <NN>: complete` line are DONE. **Do not re-dispatch them.** Resume at
  the first task without one.
- A task whose last line is a fix round is mid-loop: resume at the next
  round.
- A task with a `Task <NN>: dispatched` line and no `complete` line may have
  finished while you were gone. Run `git log <BASE>..HEAD`, with `<BASE>` the
  commit on the dispatch line, **before any re-dispatch**. Commits there mean
  the work was done: it goes to review, not to a new implementer. A second
  implementer on committed work repeats the task at full price.
- A task with a `Task <NN>: parked:` line is never re-dispatched, and the
  tasks it blocks are skipped and named in the completion report. A parked
  task has dispatched with no `complete` line, and re-dispatching it is the
  loop the cap exists to stop.
- A ledger whose first line names a **different** plan is another plan's
  progress. Leave it alone and start your own.
- **After compaction, trust the ledger and `git log` over your own
  recollection.** The commits it names exist in git even when your context no
  longer remembers creating them.

The ledger is committed with the work. It is not scratch, and it is the record
of what happened while the user was away.

### 5. Read the plan, once

Read `plan.md` once. Note its **Global Constraints** and the design path. Read
`design.md` too: **the design is the authority the plan argues from, and
conflicts inside the plan resolve against it.** A plan with no reachable design
gets a ledger note saying so; rulings made without one are provisional.

Create a todo per task.

### 6. Pre-flight conflict scan

**Before dispatching task 01**: read [preflight.md](./references/preflight.md), every time.

## Model selection

Always specify the model explicitly when dispatching: an omitted model
inherits the session's, usually the most capable and most expensive.

**Default: standard tier.** The most capable tier needs a one-line reason,
written as the dispatch prompt's `Capable because:` line and in the ledger.

The default, the most-capable qualifying list, the cheapest-tier safety rule,
the babysitter rule, and the complexity signals:
`../../references/vocab/model-selection.md`.

## The task loop

**When several tasks are the same small edit**: read [batching.md](./references/batching.md), every time.

**Context hygiene.** Everything you paste into a dispatch prompt, and
everything a subagent prints back: stays resident in your context for the rest
of the session and is re-read on every later turn. **Hand artifacts over as
files.**

**While dispatched subagents run**: read [waiting.md](./references/waiting.md), every time.

**Serial implementers.** Never dispatch implementation subagents in parallel: the **shared test environment** (one Postgres, one ClickHouse, one Redis,
one broker set) means a worktree is a second checkout, not a second database.
Concurrent test runs produce false RED and false GREEN, poisoning every
verification downstream. Relax only if `.fx.json` sets
`isolated_test_execution: true`. Parallelism belongs to reviews and batched work.

**At most one task review is outstanding while the next implementer runs.** The
next dispatch waits for it: a second review in flight would hold another diff
and another report in your context, and a fix round for the first would collide
with the next implementer's commits.

### Controller reading rules

Every subagent above replies in five lines, not a pasted report. That only
shrinks your context if you read the rest the same way.

- **Append to the ledger, never rewrite it.** `>> state.md`, always. Never
  read it whole: `tail -n 40 state.md` or `grep` for the line you need.
- **Git output stays one line per fact.** `git log --oneline -n N`,
  `git diff --stat`. Never a full `git diff` or `git log -p` into your own
  context.
- **Never read a diff yourself**, except a small fix round's controller re-review ([fix-loop.md](./fix-loop.md)), capped at 20 production lines. `review-package` writes it for the
  reviewer; that diff is the reviewer's context, not yours.
- **The five-line reply decides the next move.** Read a findings or report
  file only to rule on a ⚠️ item, a plan-mandated finding (`C/I/M` names one:
  `grep -n plan-mandated <findings>`), or a non-zero **Concerns** count (read
  the report's Concerns section and its `## For the controller: outside this
  task` section), and then read only that part:
  `grep -n <term> <file>`, `sed -n '<a>,<b>p' <file>`.
- **Before acting on a long reply, a missing file or a ledger copy**: read [reading-rules.md](./references/reading-rules.md), every time.

### 1. Dispatch the implementer

Record `BASE=$(git rev-parse HEAD)` **before** dispatching: the review package
and every fix-round diff need it. Right after recording it, append the dispatch
line to the ledger, with the ISO-8601 time you will pass to `--since` in step 5:

```
`Task <NN>: dispatched <BASE7> <ISO-8601>`
```

(Write the line without the backticks.) The line is what a resumed controller
checks against `git log`, and what the cost step measures from.

**Compile one brief.** Write the controller's context for this task to a file
(`.fx/<slug>/context/<NN>.md`): one line on where the task fits, interfaces and
decisions from earlier tasks the task file cannot know, your resolution of any
ambiguity, and a pointer to any ledger entry where an earlier task parked a
finding in this area. Then run, from the controller's own directory,
`node <skill base directory>/scripts/compile-brief --worktree <worktree> --context <file> <SLUG> <TASK_FILE> <BRIEF_FILE>`
If `compile-brief` exits non-zero, do not dispatch: fix the task file's `**Design:**` or `**Stack:**` entry, or record a ruling, and run it again. Pass `<BRIEF_FILE>` (`.fx/<slug>/briefs/<NN>.md`). The brief holds the task
file, the plan's Global Constraints, your context, every live ruling, the
design passages the task's `**Design:**` line names and the stack text its
`**Stack:**` line names (the whole stack files `.fx.json` names when it has
none). Never make a subagent read the whole plan file.

The dispatch contains exactly three things: the brief path, introduced as
*"read this first: it is your requirements, with the exact values to use
verbatim"*; the report-file path and the report contract; and the worktree
path.

**Exact values (numbers, magic strings, signatures, test cases) appear only
in the task file**, never restated in the dispatch, so there is one source of
truth.

**A brief describes one task, not the session's history.** Do not paste
accumulated prior-task summaries into the context file. A fresh subagent needs
its task, the interfaces it touches, and the Global Constraints. Nothing else.

**Report file:** name it after the task (`tasks/03-foo.md` →
`.fx/<slug>/reports/03-foo-report.md`) and put the path in the dispatch. The implementer
writes its full report there and returns only: status, commits, a one-line test
summary, and concerns.

**Subagents inside a task.** The implementer may dispatch read-only agents
for lookup, never a reviewer and never another writer. The contract and both
reasons are in [implementer-prompt.md](./implementer-prompt.md).

If an earlier task parked a finding in the area this task touches, carry a
pointer to that ledger entry in the dispatch.

**Record the implementer's agent identity** from the dispatch result: fix
rounds 1 to 3 resume this agent.

Template: [implementer-prompt.md](./implementer-prompt.md)

**Fill the template rather than composing from memory.** A dispatch written from memory drops whichever clause was not in mind. Open the template, fill it, and put the task's own context in the context file.

### 2. Handle the report

Implementers report one of four statuses.

**DONE**: generate the review package, dispatch the task reviewer.

**For any other status, a `test_all` run or a question**: read [handling-reports.md](./references/handling-reports.md), every time.

### 3. Review the task

Per-task reviews are **task-scoped gates**. The broad review happens once,
at the end.

- **Never skip the task review.**
- **Never accept a report missing either verdict**: spec compliance AND task
  quality are both required.
- **Implementer self-review never replaces the task review.** Both are needed.

**Hand the reviewer its diff as a file.** Run
`bash scripts/review-package <TASK> <BASE> <HEAD>`; pass the reviewer the path it
prints. Without bash: `git log --oneline`, `git diff --stat`, and
`git diff -U10` over the range, redirected to one uniquely named file. **The
output never enters your own context**, and the reviewer sees commit list, stat
summary and full diff in a single Read.

**Before you dispatch the task reviewer**: read [cost.md](./references/cost.md), every time.

Use the **BASE you recorded before dispatching**: never `HEAD~1`, which
silently drops all but the last commit of a multi-commit task.
**Never dispatch a task reviewer without a diff file.**

**Recompile the brief before the reviewer dispatch**, with the same
`compile-brief --worktree <worktree> --context <file> <SLUG> <TASK_FILE> <BRIEF_FILE>`
command as step 1, so rulings made since dispatch are carried.

**Before the reviewer dispatch, to pick the lenses**: read [lens-dispatch.md](./references/lens-dispatch.md), every time.

The reviewer gets four paths: the brief, the report file, the review package
and the findings file. The brief carries the Global Constraints that bind the
task.

**Before you write the reviewer's context or rule on a ⚠️ item**: read [review-inputs.md](./references/review-inputs.md), every time.

**Pass the reviewer a findings path too.** It fills `[FINDINGS_FILE]`, and it
is the difference between a review you can act on and one you have to commission
twice. A review's findings exist in one message and nowhere else; put them on
disk before that message is spent. Beside the ledger, never under `.fx/`, which
is git-ignored.

**Pass the reviewer the brief path.** It fills `[BRIEF_FILE]`, and it is how a
ruling made many tasks ago gets checked: `compile-brief` carries every live
ruling, so you choose none and the reviewer reads the ledger no more.

Template: [task-reviewer-prompt.md](./task-reviewer-prompt.md)

### 4. The fix loop

Triggered by spec ❌, any Critical or Important finding, or a ⚠️ item you
confirmed as a real gap. **Minor findings never enter it**: ledger them as
`Task <NN>: minor (deferred): <one-liner>` for the final review to triage.

Five rounds maximum. Rounds 1 to 3 resume the original implementer; rounds 4 to 5 use
a fresh one on a more capable model (`Capable because: fix round <R>`). Every round ends with a **scoped**
re-review: a dispatched re-reviewer, or you reading the fix diff when it
qualifies as small ([fix-loop.md](./fix-loop.md)). **Never fix findings yourself in the controller session.**

At the cap, adjudicate, and **adjudicate only at the cap; adjudicating earlier
to end a loop is pre-judging with a different name.**

Full procedure, the three adjudication categories, and the round formats:
[fix-loop.md](./fix-loop.md).

### 5. Complete the task

When the review is clean, or every open finding is parked with a ruling at the
cap: run `build-cost --task <NN> --since <time from the dispatch line>` again
(the step 3 command), since fix rounds and the review itself have
added cost since then, and append the one line it prints, before the completion
line:

```
`Task <NN>: cost <tokens> tokens, <minutes> min, <dispatches> dispatches, fx-tdd <k>/<i>`
```

**Before you ledger the cost line**: read [cost.md](./references/cost.md), every time.

Then append the completion line in the same message as your other bookkeeping:

```
Task <NN>: complete (commits <base7>..<head7>, review clean)
Task <NN>: complete (commits <base7>..<head7>, <K> parked)
```

Plus: files touched · the guarantee row from `fx-tdd` · any rulings.

Mark the todo complete and move on. **Never move to the next task while the
review has open Critical/Important issues that are neither fixed nor
parked-with-a-ruling at the cap.**

## Commits

The implementer commits, one per task, inside the worktree branch. The rules
it must follow (**no attribution trailers, no push, no merge, no PR, never on
the base branch or a detached HEAD**) are carried in
[implementer-prompt.md](./implementer-prompt.md), because that is the agent
that runs them and it reads neither CLAUDE.md nor memory.

`fx-pretooluse` rejects violations at the hook level. **A rejected commit is a
defect in your dispatch, not a reason to retry.**

## Before the final review: one coverage audit

**Before the final review**: read [coverage-audit.md](./references/coverage-audit.md), every time.

## Final review

**Before the branch review**: read [final-review.md](./references/final-review.md), every time.

## Exit gate: the Iron Law

**Before any completion claim**: read [exit-gate.md](./references/exit-gate.md), every time.

**Once the exit gate has passed**: read [completion.md](./references/completion.md), every time.

## Common rationalizations

**When a thought argues for skipping a step**: read [rationalizations.md](./references/rationalizations.md), every time.
