---
name: fx-review
description: >
  Use when changed code needs checking: "review this", "review the branch",
  "review the PR", "check my changes", "look this over", "is this good",
  "review since X", "did I miss anything", or after finishing an
  implementation. For EXISTING code with no diff, use fx-architecture instead.
---

# fx-review

Announce: "Using fx-review (<task|branch> mode)."

**Review early, review often.**

## Two modes

- **task** — called by `fx-implement` after each task. Correctness + Spec,
  scoped to that task. Mid-tier model. Lenses off unless the task touches
  auth, payment, or a migration.
- **branch** — called at the end of a run, or by you on a branch or PR. All
  axes plus every triggered lens, most capable model.

**Mandatory:** after each task in `fx-implement` · after a major feature ·
before a merge.
**Valuable:** when stuck (fresh perspective) · before a refactor (baseline) ·
after fixing a complex bug.

**A constraints block narrows as well as focuses.** Every brief below names
what the reviewer should look for — that's what makes it a directed search
instead of a wander, and also exactly what makes it blind to anything the
brief didn't think to name. The controller wrote the task and the plan, so
its blind spots are the ones most likely to have produced the defect, and a
reviewer handed only the controller's list will not go looking for them.
Task mode's cost budget doesn't allow fixing this per task — see the unprimed
pass below instead.

## 1. Pin the fixed point — before spawning anything

Whatever the user named: a SHA, a branch, a tag, `main`, `HEAD~5`. Not named?
In a worktree, default to the merge-base with the base branch. Still unclear?
**Ask.**

```bash
git rev-parse <fixed-point>                  # must resolve
git diff <fixed-point>...HEAD --stat         # three-dot: against the merge-base
git log <fixed-point>..HEAD --oneline
```

**A bad ref or an empty diff fails HERE**, not inside five parallel subagents.

In **task mode** the fixed point is the BASE `fx-implement` recorded before
dispatching that task's implementer. In **branch mode** it is the merge-base.
**Never `HEAD~1`** — it silently drops all but the last commit of a
multi-commit task.

## 2. Decide which passes run — and say so in one line

**Always:**

- **Correctness** — run `/code-review` at an effort matched to the diff:
  small and mechanical → low–medium; wide, subtle, or security-touching →
  high–max. **`/code-review ultra` is user-triggered and billed — you cannot
  launch it.** If a change warrants it, say so and stop there.
- **Spec** — whenever a spec exists (step 3).

**Conditional:**

- **Standards** — when the diff exceeds ~3 files or ~150 lines. Below that the
  smell baseline has nothing to bite on.
- **Lenses** — by the trigger table below. Eight parallel passes on a
  three-line diff is indefensible; each dispatch costs a full subagent.
- **Unprimed adversarial pass** — **branch mode only**, once per branch, not
  per task. Dispatch `fx-devils-advocate` in code mode against the whole diff,
  given the task file but **no question list** — see step 5. Skip it in task
  mode: dispatching an unprimed reviewer alongside the primed one on every
  task doubles the per-task cost for findings that are mostly mechanical and
  already caught by Correctness and Standards. A branch's worth of changes is
  where an unprimed pass earns its cost — it's the one place structural blind
  spots have had room to accumulate.

| Lens | Fires when the diff touches |
|---|---|
| `fx-lens-database` | `db/migrate/`, `*.sql`, `structure.sql`, any model, ClickHouse queries, EF migrations |
| `fx-lens-security` | Devise / Pundit / JWT / session / auth paths, params handling, credentials, any new endpoint or route, `[Authorize]` |
| `fx-lens-a11y` | `.erb`, `.css`, view partials, Compose `.kt`, SwiftUI `.swift`, anything with user-facing strings |
| `fx-lens-silent-failure` | `rescue`, `catch`, `except`, Sidekiq workers, broker consumers, attribution code |

There is deliberately **no performance lens** — query-shape performance (N+1,
missing indexes, `SELECT *`, unbounded result sets) is `fx-lens-database`'s
job, and it fires on the same diffs. See `OPEN-DECISIONS.md` D5.

## 3. Find the spec

In order: the task file (task mode) → `docs/plans/<slug>/design.md` matching
the branch → a path the user passed → **ask.**

Nothing exists and the user says there is no spec → **skip the Spec axis and
report "no spec available".** Never invent one.

If the repo has no `docs/plans/` layout at all, say so and point at `/fx:setup`
rather than guessing where specs live.

## 4. Find the standards

Whatever the repo documents — `CONTRIBUTING.md`, `docs/DESIGN/*`,
`.rubocop.yml`, `.editorconfig` — **plus** the smell baseline in
`../../references/vocab/fowler-smells.md`, which applies even when a repo documents
nothing.

Two rules bind the baseline:

- **The repo overrides.** A documented repo standard always wins; where it
  endorses something the baseline would flag, suppress the smell.
- **Always a judgement call.** Each smell is a labelled heuristic ("possible
  Feature Envy"), **never a hard violation.** Documented-standard breaches can
  be hard; baseline smells cannot.

**Skip anything tooling already enforces** — rubocop, erb_lint, `dotnet
format`, ktlint, SwiftLint. Never spend a reviewer on what a linter catches.

## 5. Dispatch in parallel

Every pass is read-only and independent, so they run concurrently — **and in
separate subagents, so they don't pollute each other's context.** A Standards
reviewer that has read the Spec findings starts agreeing with them.

**Do not review the diff inline yourself.** You are the coordinator; reading a
large diff burns the context window you need to keep driving the work. Dispatch
a reviewer: the diff and the evaluation live in its context, and only the
findings come back.

**Hand each one precisely crafted context — never your session's history.**
That keeps the reviewer on the work product, not on your thought process.

**Standards brief** — the diff command and commit list · the standards files
you found · **the full smell baseline pasted in** (the subagent has no other
access to it) · the brief:

> "Report, per file/hunk where relevant: (a) every place the diff violates a
> documented standard — cite the standard, file and rule; (b) any baseline
> smell you spot — name it and quote the hunk. Distinguish hard violations from
> judgement calls: documented-standard breaches can be hard, baseline smells
> are always judgement calls, and a documented repo standard overrides the
> baseline. Skip anything tooling enforces. Under 400 words."

**Spec brief** — the diff command and commit list · the spec path or contents ·
the brief:

> "Report: (a) requirements the spec asked for that are missing or partial;
> (b) behaviour in the diff that wasn't asked for (scope creep);
> (c) requirements that look implemented but where the implementation looks
> wrong. Quote the spec line for each finding. Under 400 words."

**Lens briefs** — the `fx-lens-*` agents, each given the diff command and the
paths that triggered it. Read-only by construction.

**Branch mode also dispatches the broad reviewer** — [reviewer-prompt.md](./reviewer-prompt.md),
on the most capable available model, pointed at the ledger's deferred-minor and
parked lines so it can triage what must be fixed before merge.

**Branch mode also dispatches the unprimed adversarial pass** — `fx-devils-
advocate`, code mode, given the diff command and the task file, **with no
constraints block and no question list.** Its brief is one open-ended prompt,
not a checklist: "read this diff like you were told nothing about it —
anything else that would bite us?" If you have other passes' findings or the
plan's accepted-risks notes on hand, pass those along only so it can recognize
a settled decision and not re-report it as a discovery — never as a scope for
what to look at.

## 6. Aggregate — do NOT merge or rerank

Present each pass under its own heading, verbatim or lightly cleaned:

```
## Correctness
## Standards
## Spec
## Lens: database      (only those that fired)
## Lens: security
## Unprimed adversarial pass   (branch mode only)
```

**Never merge findings across axes. Never rank them against each other.**

A change can pass one axis and fail another: code that follows every standard
but implements the wrong thing is **Standards pass, Spec fail**; code that does
exactly what the spec asked but breaks the project's conventions is **Spec
pass, Standards fail.** Reporting them separately is what stops one axis from
masking the other. Merging them destroys the entire point.

End with: total findings **per axis**, and the worst issue **within each axis**.
**No single winner across axes** — that is the reranking the separation exists
to prevent.

Severity within an axis: **Critical** (bugs, security, data loss, broken
functionality) · **Important** (architecture problems, missing features, poor
error handling, test gaps) · **Minor** (style, optimization, doc polish).

## 7. Acting on findings

Read `../../references/vocab/receiving-review.md` before implementing anything. Short
form:

1. **READ** the complete feedback without reacting.
2. **UNDERSTAND** — restate the requirement in your own words, or ask.
3. **VERIFY** against the codebase. A finding is a claim, not a fact.
4. **EVALUATE** — is it technically sound for THIS codebase, stack and version?
5. **RESPOND** — technical acknowledgment or reasoned push-back.
6. **IMPLEMENT** one item at a time, testing each.

**If any item is unclear, STOP — do not implement anything yet.** Ask about the
unclear ones first. Items are often related; partial understanding produces the
wrong implementation.

**Order:** blocking (breaks, security) → simple (typos, imports) → complex
(refactors, logic). Test each fix individually, then verify no regressions.

**Fix Critical immediately. Fix Important before proceeding. Note Minor for
later** — record them where the final branch review will see them, rather than
letting them evaporate.

**If the reviewer is wrong:** push back with technical reasoning · **show the
code or tests that prove it works** · **request clarification** if the finding
is ambiguous.

**YAGNI check.** A finding says "implement this properly"? **Grep for actual
usage first.** Nothing calls it → propose deleting it instead.

**Push back when** the suggestion breaks existing functionality · the reviewer
lacks full context · it violates YAGNI · it is technically incorrect for this
stack · legacy or compatibility reasons exist · it conflicts with a decision in
an ADR or `design.md`. Push back with technical reasoning and evidence, never
defensiveness.

**Never:** skip review because "it's simple" · ignore a Critical · proceed with
an unfixed Important · argue with valid technical feedback.

**Never write** "You're absolutely right!", "Great point!", "Thanks for
catching that", or any gratitude expression. State the fix. The code shows you
heard it.

## 8. Flags

`--fix` applies findings to the working tree. Forward it when asked.

`--comment` posts findings as inline PR comments — **that publishes outward.**
Never offer it; use it only on an explicit request in that message.

## Red flags

- Skipping review because "it's simple"
- **Merging axes into one ranked list**
- Reviewing the diff inline instead of dispatching
- Handing a reviewer your session history
- Firing all four lenses on a three-line diff
- Implementing a finding you haven't verified
- Proceeding with an unfixed Critical
- Spending a reviewer on what the linter already catches
- Skipping the unprimed adversarial pass in branch mode, or handing it a question list
