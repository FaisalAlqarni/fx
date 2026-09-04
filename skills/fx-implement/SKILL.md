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

**If the task files look complete enough to just execute, read this.** They
usually are, and that is the trap. A good task file names the files, the seam
and the acceptance criteria, so an agent opening one has everything it needs to
start typing and nothing visibly missing to go looking for. Measured: a 13-task
plan handed to a capable agent produced a working, well-tested build with no
worktree, no ledger, no per-task review and no lens dispatch. What is absent
from a task file is exactly what this skill supplies:

- **A worktree**, so the main checkout is never written to.
- **A ledger** that survives compaction. Without it a long build restarts work
  it already finished, and the only record of a ruling is a chat message that
  is gone.
- **A fresh subagent per task**, so task 09 is not implemented by an agent
  carrying eight tasks of accumulated assumptions.
- **A review after each task**, while the diff is small enough to review.
- **Lens dispatch** on what the diff actually touches, which no task file knows
  in advance because it is written before the diff exists.

None of that is in the plan, and none of it can be. Detail in a task file is a
reason to trust the task, never a reason to skip the lane.

**Legacy plans:** older plans use `tickets/` where current ones use `tasks/`.
Treat the two names as the same thing everywhere below, and rename the
directory to `tasks/` on your first commit so the old name drains out.

**Narration:** at most one short line between tool calls. The ledger is the
record, the chat is not: every entry, ruling and completion line this skill
asks you to write belongs in the ledger. Writing it again in chat is the
progress summary the next section forbids.

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

**Name the checkpoint that would catch it.** A cost with no catcher is a
prediction; a cost with one is an assignment, and the reviewer who reads the
ledger inherits it. Measured on a twelve-task build: a task 02 ruling recorded
"a dead controller survives until 09, which the task review would catch". It
did survive, and **that review caught it, eight tasks later**, because the
ruling had told it to look. Rulings whose cost lands on a later task are the
ones worth this, and they are exactly the ones the session that made them will
not be around to check.

If nothing would catch it, say that. A ruling nobody downstream can verify is
one to raise with the user rather than bank.

**A reviewer's citation is a claim, not a check.** You already treat an
implementer's "I did X" as unverified. Apply the same rule to a review's "the
file says X at lines 40 to 48". Citing a line number is what verification looks
like, which is exactly why it slips through: the number does the work of
evidence without being evidence. **Before any ruling or ledger line repeats what
a review says a file contains, open the file at those lines and quote what is
there.**

**And your own claims are claims.** You are the only participant here with no
reviewer, and your ledger is the most durable artifact in the run, because every
later reviewer is told to check provenance against it. Three shapes account for
every controller error measured so far, and each is cheap to catch:

- **A grep generalised past its scope.** You searched a diff and stated the
  result about the codebase.
- **A citation repeated unopened.** Someone gave you a file and line numbers.
  Open them.
- **An inference across two files stated as a reading of one.** If you concluded
  it, say you concluded it, and name both files.

Before a ledger line asserts what a file contains, read that file. Before it
asserts what the codebase does, search the codebase and not the diff.

Measured: a controller verified about forty implementer claims by executing
something, several found wanting, and made four false claims of its own, every
one self-generated. It ran the forty expensive checks and skipped the cheap
ones on itself. Its own summary: "none of them went through the check I applied
to everyone else's work." Of five bad verification probes in the same run, the
probe was wrong every time and the code was right.

**Four things stop you, and only these:**

1. An irreversible or destructive operation.
2. A security-sensitive action.
3. A side effect outside this repo: a push, a merge, a publish, anything that
   leaves the machine.
4. A task so broken that every path forward is a guess.

For those, stop and ask. Everything else: rule, ledger, continue.

### Waiting on a child is not one of them

Dispatch is **non-blocking**, and this was measured with a two-level probe
rather than inferred. The Agent tool returns in about a second with an id and no
result. Roughly sixty seconds later, when the child finished, the runtime
re-invoked the parent on its own and delivered the result then, with no human
and no other session involved.

**Two consequences, and they pull in opposite directions.**

You are safe. Ending a turn with a child outstanding does not strand you: its
completion wakes you. So do not poll, do not sleep, and do not invent a bounded
wait.

You are also idle. The wake comes when the child finishes, which means every
minute it runs is a minute you spent doing nothing, and a thirteen-task plan run
one child at a time is thirteen serial waits. That is the real cost, and it is
not a safety problem, it is a throughput one.

So while a child is outstanding, prefer to have your last tool call be one of:

1. **The next task on the frontier.** Reviews and independent tasks may run
   while an implementer works. The frontier usually has something.
2. **A read of a report file that has already landed.** The report file is the
   return channel, not a message from the child. Check for it.
3. **Ledger work**: the ruling you just made, the review package for the task in
   flight, the next dispatch prompt.

When the frontier is genuinely empty and every remaining task blocks on the
outstanding child, ending the turn is correct and safe. Write one ledger line
naming what you are blocked on, so that a later reader can tell a deliberate
wait from a stall. **The ledger line is the whole difference between the two**,
because from the outside they look identical.

The stall this section guards against is the other one: ending a turn with
**nothing outstanding at all**. Nothing will wake you then, because nothing is
running. That is what "Rulings, not stalls" above is about, and it is the case
where a plan quietly stops at task 2 of 13.

## When this skill applies

| Condition | Route |
|---|---|
| No written plan | `fx-plan`, or `fx-brainstorm` if there's no design either |
| Plan exists, tasks mostly independent | **this skill** |
| Plan exists, tasks tightly coupled throughout | this skill, but expect batching; if every task blocks every other, the plan needs re-cutting |

## Setup

### 1. Workspace

Detect existing isolation first (the submodule guard matters), prefer the
harness's native worktree tool over raw `git worktree add`, verify the
directory is git-ignored before creating anything, and never start on
main/master without explicit consent.

Full procedure and its rationalizations: `../../references/vocab/worktree-setup.md`.

**You create the worktree. You do not enter it.** Isolation is for the work,
not for the coordination. A native worktree tool typically **pins the whole
session**, and a pinned controller cannot reach any other repository, cannot
run compound commands, and reads every refusal as a guard catching a mistake
when the mistake was its own location. Pass the absolute worktree path to each
implementer, which is what the dispatch template already does, and reach it
yourself with `git -C <path>` or `cd <path> && …`.

The "#1 mistake" warning above is written for an implementer. For a controller
it inverts: entering is the mistake.

**An uncommitted plan is not a blocker.** `git worktree add` works fine
against a dirty tree. The only real consequence: a worktree checked out from a
commit won't contain files that were never committed, so an uncommitted
`docs/plans/<slug>/` opens with no tasks in it. **Fix:** copy
`docs/plans/<slug>/` into the worktree once it exists, so the branch's first
commit carries it, and the ledger travels with the work. Warn; do not gate.

**Detached HEAD: do not commit.** Those commits become unreachable the moment
HEAD moves. Create a branch first.

### 2. Project setup and clean baseline

Run the `setup` and `test_all` commands from **`.fx.json`**: never guess them.
Rails is not `npm install`; .NET is not `pytest`.

No `.fx.json`, or the command is `null`? **Ask**: with one greenfield
exception: no `.fx.json` **and** no test suite means the baseline is 0 tests
by definition. Proceed; task 01 establishes both the app and `.fx.json`.
Asking here would turn every new project into a stall. Ask only when
`.fx.json` is missing from a repo that plainly already has tests.

Then load `../../references/stacks/<name>.md` for each entry in `stacks`. These carry
ecosystem traps only. **A name with no file is not an error**: it means no
traps file exists for that stack yet, and nothing else changes.

Run the baseline suite **before task 01**: greenfield excepted, where 0 tests
*is* the baseline and there is nothing yet to run. A dirty baseline makes
every later failure ambiguous. Failures → report them and ask whether to
proceed or investigate; that call is the user's.

Report:

```
Worktree ready at <full-path> on <branch>
Baseline: <N> tests, 0 failures
Ready to implement <feature>
```

### 3. Two workspaces, split by lifetime

**Durable: `docs/plans/<slug>/`, committed:** `design.md` · `plan.md` ·
`tasks/NN-*.md` · `state.md` (the ledger).
This is the record of what was decided and what happened. **Never delete it.**

**Ephemeral: `.fx/<slug>/`, git-ignored:** `reports/NN-*-report.md`
(implementer reports) · `review/*.diff` (review packages).
These are working artifacts: verbose, and regenerable from git. **Create the
directory, then verify it is ignored** (`git check-ignore -q .fx`): a `.fx/`
pattern matches directories only, so checking before it exists always fails;
that's the wrong moment, not "not ignored". If it fails once created, add
`.fx/` and `.worktrees/` to the ignore file.

**On a repo with no application yet**, put those entries in
`.git/info/exclude` instead of `.gitignore`. Most generators, `rails new`
included, only append their own line onto an *existing* `.gitignore` instead
of writing their full default block: a pre-existing `.gitignore` at
generation time silently commits database files and logs. `.git/info/exclude`
has the same effect, is invisible to the generator, and leaves the project's
own ignore file for the project to write.

Another slug's directory is never yours to read or write.

### 4. The ledger

**Conversation memory does not survive compaction.** Controllers that lost
their place have re-dispatched entire completed task sequences: the single
most expensive failure observed. Track progress in a file, not only in todos.

The ledger is `docs/plans/<slug>/state.md`, first line
`# fx ledger: plan: docs/plans/<slug>/plan.md`.

- If it exists and its first line names **this** plan: tasks with a
  `Task <NN>: complete` line are DONE. **Do not re-dispatch them.** Resume at
  the first task without one.
- A task whose last line is a fix round is mid-loop: resume at the next
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
`design.md` too: **the design is the authority the plan argues from, and
conflicts inside the plan resolve against it.** A plan with no reachable design
gets a ledger note saying so; rulings made without one are provisional.

Create a todo per task.

### 6. Pre-flight conflict scan

Before dispatching task 01, scan the whole task set, **writing down what
you checked as you check it**. Look for:

- tasks that contradict each other or the plan's Global Constraints;
- anything a task explicitly mandates that the review rubric treats as a
  defect (a test that asserts nothing, verbatim duplication of a logic block).

**The scan's output is a table, not a verdict.**

- One row for **every pair** of tasks sharing a file or interface: the two
  tasks, what one Produces against what the other Consumes, what you found.
- One row for **every task**: whether its own text agrees with itself: tests
  specified against code specified, files created against files later touched.

**"The scan is clean" without those rows is not a scan you ran.**

Write the table to the ledger. Rule on everything it surfaces *before*
execution begins, record each ruling beside its row, then dispatch task 01.
If the scan really is clean, proceed without comment. The review loop remains
the net for conflicts that only emerge from implementation.

## Model selection

Always specify the model explicitly when dispatching: an omitted model
inherits the session's, usually the most capable and most expensive.

Tier table, the turn-count-beats-token-price rule, and the complexity signals:
`../../references/vocab/model-selection.md`.

## The task loop

**Batch same-shape work.** When several tasks are each a small independent
edit of the same kind (the same one-line fix, constant change, or field
addition repeated across files) do **not** dispatch one subagent per task.
Compose ONE brief listing every file and its change, send the batch to a single
subagent, review its diff as one unit. Reserve one-dispatch-per-task for work
that needs its own judgment, its own tests, or its own review surface.

**Context hygiene.** Everything you paste into a dispatch prompt, and
everything a subagent prints back: stays resident in your context for the rest
of the session and is re-read on every later turn. **Hand artifacts over as
files.**

**Waiting on dispatched subagents.** Never poll with short timeouts. While local
work remains (ledger updates, the next review package, reading reports) keep
working; results arrive on their own. There is no bounded-wait option: see
"Waiting on a child is not one of them" above. Dispatch is asynchronous, so a
message that ends with nothing queued ends your turn until something external
wakes you, and a controller that believed it was waiting has in fact stopped.

**Serial implementers.** Never dispatch implementation subagents in parallel: the **shared test environment** (one Postgres, one ClickHouse, one Redis,
one broker set) means a worktree is a second checkout, not a second database.
Concurrent test runs produce false RED and false GREEN, poisoning every
verification downstream. Relax only if `.fx.json` sets
`isolated_test_execution: true`. Parallelism belongs to reviews and batched work.

### 1. Dispatch the implementer

Record `BASE=$(git rev-parse HEAD)` **before** dispatching: the review package
and every fix-round diff need it.

**The task file is the brief.** Pass its path. Never make a subagent read the
whole plan file.

The dispatch contains exactly five things:

1. One line on where this task fits in the project.
2. The task path, introduced as *"read this first: it is your requirements,
   with the exact values to use verbatim."*
3. Interfaces and decisions from earlier tasks that the task file cannot
   know.
4. Your resolution of any ambiguity you noticed in the task.
5. The report-file path and the report contract.

**Exact values (numbers, magic strings, signatures, test cases) appear only
in the task file**, never restated in the dispatch, so there is one source of
truth.

**A dispatch describes one task, not the session's history.** Do not paste
accumulated prior-task summaries: *a real session's dispatch hit 42k
characters, 99% of it pasted history.* A fresh subagent needs its task, the
interfaces it touches, and the Global Constraints. Nothing else.

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

**Fill the template rather than composing from memory.** Measured over one
twelve-task build: 26 of 26 dispatches were written in the tool call, and each
dropped whichever clause was not in mind that minute. `fx:fx-tdd` was never
invoked once across 111 subagents. Tailoring is still wanted, and the briefs
carrying ledger rulings and named risks are why several defects were caught.
Reconstruction is the part that fails: open the template, fill it, then add the
task's own context.

### 2. Handle the report

Implementers report one of four statuses.

**DONE**: generate the review package, dispatch the task reviewer.

**DONE_WITH_CONCERNS**: the work is complete but the implementer flagged
doubts. Read them before proceeding. Concerns about **correctness or scope**:
address them before review. Observations ("this file is getting large"): note
them and proceed.

**NEEDS_CONTEXT**: provide the missing context and re-dispatch.

**BLOCKED**: assess the blocker:
1. Context problem → more context, re-dispatch, same model.
2. Needs more reasoning → re-dispatch on a more capable model.
3. Task too large → break it into smaller pieces.
4. **The plan itself is wrong** → rule on it, ledger it, re-dispatch with the ruling carried.
5. Genuinely unblockable → **skip it, ledger why, take the next unblocked task.** Never stop the queue for one task.

**Never ignore an escalation, and never force the same model to retry without
changing something.** If the implementer says it is stuck, something has to
change.

**If the implementer asks questions** (before starting or mid-task) answer
clearly and completely, provide extra context if needed, and do not rush it
into implementation.

### 3. Review the task

Per-task reviews are **task-scoped gates**. The broad review happens once,
at the end.

- **Never skip the task review.**
- **Never accept a report missing either verdict**: spec compliance AND task
  quality are both required.
- **Implementer self-review never replaces the task review.** Both are needed.

**Hand the reviewer its diff as a file.** Run
`scripts/review-package <TASK> <BASE> <HEAD>`; pass the reviewer the path it
prints. Without bash: `git log --oneline`, `git diff --stat`, and
`git diff -U10` over the range, redirected to one uniquely named file. **The
output never enters your own context**, and the reviewer sees commit list, stat
summary and full diff in a single Read.

Use the **BASE you recorded before dispatching**: never `HEAD~1`, which
silently drops all but the last commit of a multi-commit task.
**Never dispatch a task reviewer without a diff file.**

**Lens dispatch.** After packaging the diff, check the task's changed file
paths against the lens trigger patterns in `../fx-review/SKILL.md` (§2's
table) and dispatch any lens whose triggers match (`fx-lens-database`,
`-security`, `-a11y`, `-silent-failure`) alongside the task reviewer, same
diff file. This is the only door those agents have below the final review;
skip it and an auth path or a migration ships with nobody having looked.
Reference the table, don't copy it: fire on matching diffs, not on every
task. A lens finding enters the fix loop below like any other.

The reviewer gets three paths (the task file, the report file, the review
package) plus the Global Constraints that bind the task.

**Verify a constraint before you copy it.** This block carries the authority
of a requirement into an agent with no context to doubt it, so a false belief
of yours becomes a false rule for them. **A constraint is a claim, and the exit
gate already demands evidence for claims**: this is the one place the skill
silently exempted them. Check anything empirical: a version, a line count, an
exit code, a routing behaviour. In one measured session four constraints were
false, and two agents refused to comply rather than obey them.

**An agent that pushes back on an impossible instruction is working
correctly.** Treat it as a signal about your dispatch, not as insubordination.

**The Global Constraints block is the reviewer's attention lens.** Copy the
binding requirements **verbatim** from the plan or design: exact values,
formats, and stated relationships between components ("same layout as X",
"matches Y"). The reviewer's template already carries process rules (YAGNI,
test hygiene, review method); this block is for what THIS project's design
demands.

- Do not add open-ended directives ("check all uses", "run race tests if
  useful") without a concrete, task-specific reason.
- Do not ask a reviewer to re-run tests the implementer already ran on the same
  code: the report carries the test evidence.
- **Do not pre-judge findings.** Never instruct a reviewer to ignore or not flag
  a specific issue. If you believe something would be a false positive, let the
  reviewer raise it and adjudicate it in the loop.
- **If the prompt you are writing contains "do not flag", "don't treat X as a
  defect", "at most Minor", or "the plan chose": stop. You are pre-judging,
  usually to spare yourself a review loop.**

**⚠️ Cannot-verify-from-diff items.** The reviewer may flag requirements living
in unchanged code or spanning tasks. These don't block the rest of the review,
but **you must resolve each one yourself before marking the task complete**: you hold context the reviewer lacks. Confirm one is a real gap and it enters
the fix loop like any other.

**Pass the reviewer a findings path too.** It fills `[FINDINGS_FILE]`, and it
is the difference between a review you can act on and one you have to commission
twice. A review's findings exist in one message and nowhere else; put them on
disk before that message is spent. Beside the ledger, never under `.fx/`, which
is git-ignored.

**Pass the reviewer the ledger path.** It fills `[LEDGER_FILE]`, and it is how
a ruling made many tasks ago gets checked: the implementer was never told about
it, because rulings are yours and a fresh subagent gets the task file only. Pass
the path, not an extract. Choosing which old rulings are relevant is the
review's job, and doing it for them looks like help and works like a filter.

Template: [task-reviewer-prompt.md](./task-reviewer-prompt.md)

### 4. The fix loop

Triggered by spec ❌, any Critical or Important finding, or a ⚠️ item you
confirmed as a real gap. **Minor findings never enter it**: ledger them as
`Task <NN>: minor (deferred): <one-liner>` for the final review to triage.

Five rounds maximum. Rounds 1 to 3 resume the original implementer; rounds 4 to 5 use
a fresh one on a more capable model. Every round ends with a **scoped**
re-review. **Never fix findings yourself in the controller session.**

At the cap, adjudicate, and **adjudicate only at the cap; adjudicating earlier
to end a loop is pre-judging with a different name.**

Full procedure, the three adjudication categories, and the round formats:
[fix-loop.md](./fix-loop.md).

### 5. Complete the task

When the review is clean, or every open finding is parked with a ruling at the
cap: append the completion line in the same message as your other bookkeeping:

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

Dispatch **one** read-only agent against `design.md`, every task file, and the
ledger, with one question: **is there any behaviour the design commits to that
no task's acceptance criteria carry?**

Every other check in this lane verifies work against its task file. Nothing
verifies the task files against the design, except the coverage walk in
`fx-plan` §6.1, which runs before the red team and never again. So a
requirement that changed after planning, or a story split across two places
where the plan picked up one, passes every gate in the build.

Tell it to look for these shapes, which is where the misses actually were:

- **A story that must land in two places** (a file *and* a screen, a model rule
  *and* its surfacing) where one half has an owner. Measured: a marker written
  to a CSV, tested at two seams, rendered in no view. Found nine tasks late, by
  an implementer working on something else.
- **A criterion satisfied by requesting a URL directly**, which never asserts
  anyone can reach the page. Measured: a rejected claim's reason and resubmit
  control, both tested, on a page nothing linked to.
- **Criteria that are all refusals.** The guards get stated and the story does
  not. Measured on a task caught *before* dispatch: every criterion refused
  something, none said the successful action happens through the screen.
- **The reverse direction:** what the tasks assume that no story states. That is
  where undocumented load-bearing rules live, and they are invisible to a review
  that reads the task file.

Run it before the final review, not after: a finding here is a task to add or a
criterion to amend, and both are cheaper than a finding in the merge review.
Ledger everything it returns, including what it clears.

## Final review

Package the whole branch: `scripts/review-package <PLAN> <MERGE_BASE> <HEAD>`
where `MERGE_BASE` is `git merge-base <base-branch> HEAD`. Include the printed
path in the dispatch, **so the final reviewer reads one file instead of
re-deriving the branch diff with git commands.**

Invoke `fx:fx-review` in branch mode on the **most capable available model**.
Point it at the ledger's **deferred-minor and parked lines** so it can triage
which must be fixed before merge.

If it returns findings: **ONE fix subagent with the complete findings list: not one fixer per finding.** *Per-finding fixers rebuild context and re-run
suites each time; a real session's final-review fix wave cost more than all
its tasks combined.* Then exactly **one** scoped re-review. Adjudicate
residuals as at the breaker: park with rulings, or rule and ledger the
load-bearing ones. **No second fix wave**: residuals surface to the user in
the completion report.

Only the four stop conditions stop you here.

## Exit gate: the Iron Law

```
NO COMPLETION CLAIM WITHOUT FRESH VERIFICATION EVIDENCE
```

If you have not run the command **in this message**, you cannot claim it passes.
**Violating the letter of this rule is violating its spirit.**

Before any claim or any expression of satisfaction:

1. **IDENTIFY**: what command proves this claim?
2. **RUN**: the full command, fresh and complete.
3. **READ**: the whole output; check the exit code; count the failures.
4. **VERIFY**: does the output actually confirm the claim? If not, state the
   real status with the evidence.
5. **ONLY THEN** make the claim, with the evidence attached.

**Skipping any step is lying, not verifying.**

Claim/requires/not-sufficient table, the rationalizations, and the
per-domain patterns: `../../references/vocab/verification.md`.

**Red flags: stop:** "should" / "probably" / "seems to" · "Great!" /
"Perfect!" / "Done!" before verification · about to commit without verification
· trusting an agent's success report · relying on a partial check · "just this
once" · tired and wanting the work over · **any wording implying success
without having run verification.**

**The rule applies to** exact phrases, paraphrases, synonyms, implications of
success, and any communication suggesting completion or correctness.

### Run what the repository's own gate runs

"The suite is green" is not "this merges". Before the completion report, open
the CI configuration and **run every command it runs**, reading each exit code.
A repository that gates on a linter and a security scanner has told you what
passing means there, and a suite that passes while two of four jobs fail is a
branch that cannot merge.

Measured: a twelve-task build ran its suite after every task and every fix
round, green each time. **Nobody opened `.github/workflows/ci.yml` once.** The
final review found the linter exiting 1 on four offences that had been reported
as pre-existing at task 09 and owned by nobody, and the scanner exiting 3. Both
had been red the entire build, and the item that made them visible was a
reviewer running the file rather than the tests.

The offences themselves were two spaces. The cost was that a branch reported
ready for twelve tasks was not.

## Completion report

You do not integrate the work. You report it, then **offer the choice and
wait**. Report:

- **Landed**: tasks complete, with per-task test evidence.
- **Deviations**: every step of this skill you skipped, compressed or
  reordered, each with the reason. Announcing only the deviations you are
  comfortable defending is the failure mode: a measured run disclosed a
  compressed interview and stayed silent about dropping the design doc, the
  plan and the todo file. **A deviation you did not announce is a decision made
  in secret**, and it is indistinguishable from not having noticed.
- **Rulings I made**: **every** ledger line containing `Ruling:`, in the
  order made, each with what it costs if wrong. **Exhaustive: if the ledger
  holds a ruling, the list holds it.** *It's the only place decisions made on
  the user's behalf reach them: a ruling that dies unreported was a decision
  made in secret.*
- **Parked**: deferred findings and why.
- **Skipped**: blocked tasks and what unblocks them.
- **Needs you**: anything that hit a stop condition, plus the branch name and
  worktree path so the user can review and merge.

### Then ask, and stop

Present exactly these, and wait for an answer. Do not recommend one, do not
explain them, and do not start any of them.

```markdown
The work is on `<branch>` in `<worktree path>`. What next?

1. Merge it into `<base branch>` locally
2. Push the branch and open a pull request
3. Leave it as it is, I will handle it
4. Discard it

Which?
```

**Why an offer rather than a rule.** A prohibition invites the reading that
found its way around it: a measured run treated "commit it" as the say-so that
made a base-branch commit fine, because the rule said "no exceptions" while the
user's own version had a carve-out. An offer has nothing to interpret. The base
branch moves when the user says which option, and not before.

Options 1 and 2 are theirs to choose and yours to then perform. Option 4 deletes
work: confirm the branch name back to them before doing it.

**Clean up the ephemeral half only.** When the final review is clean, delete
`.fx/<slug>/`: regenerable from git. **Never delete `docs/plans/<slug>/`**:
committed, durable, the record. Sibling directories belong to other work.

## Common rationalizations

| Thought | Reality |
|---|---|
| "Close enough on spec compliance" | The reviewer found spec gaps = not done. Fix, or hit the cap and adjudicate. Those are the only exits. |
| "I'll fix it myself, dispatching is overhead" | Controller fixes pollute your context and skip review. Resume the implementer. |
| "One more round will converge" | Past the cap, rounds don't converge: the failure is structural. Adjudicate and route. |
| "The reviewer will just find something new anyway" | Scoped re-reviews verify fixes; they cannot wander. New findings on untouched code go to the ledger, not the loop. |
| "This finding is obviously wrong, I'll drop it" | You adjudicate only at the cap, and every ruling is a ledger entry. Silent discards are forbidden. |
| "The fix was small, skip the re-review" | Unreviewed fixes are how regressions land. Every round ends with a scoped re-review. |
| "Reviews slow the loop down" | The loop without reviews is unverified churn. Reviews are its brakes and steering. |
| "Ledger bookkeeping is overhead" | The ledger is what survives compaction. Controllers without one have re-dispatched entire completed sequences. |
| "The implementer spawned its own reviewer: free extra assurance" | A duplicate seat on the same diff. The task review is the gate. A worker-spawned reviewer is a defect to flag, not rigor. |
| "I'll just ask whether this is right" | Rule it, ledger it, continue. |
| "A progress summary would be helpful" | They asked you to execute. The ledger is the record; write there, not here. |
| "I remember finishing that task" | Trust the ledger, not your memory. |
| "This task is blocked, I'll stop" | Skip it, ledger it, take the next unblocked one. |
| "I'll run these in parallel to save time" | Implementers never run in parallel: the test environment is shared. |
| "I'm obviously not in a worktree: no need to check" | Run the Step 0 detection. Harness-created isolation and submodules both fool eyeballing; the commands settle it. |
| "`git worktree add` is quicker than hunting for a native tool" | A native tool owns placement, branching and cleanup. Bypassing it is the #1 mistake: it creates phantom state the harness can't see or manage. |
| "The worktree directory is surely ignored already" | Run `git check-ignore`. An unignored worktree directory commits the whole tree into the repo. |
| "Any directory name works" | Explicit instructions beat an existing project-local directory, which beats the `.worktrees/` default. |
| "The workspace is fresh: baseline tests can wait" | A dirty baseline makes every later failure ambiguous. Run them now; proceeding past failures is the user's call. |
