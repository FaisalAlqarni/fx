# The Fix Loop

Entered from `fx-implement` §3 when a task review reports **spec ❌**, any
**Critical or Important** finding, or a **⚠️ item you confirmed as a real
gap**. A task whose review comes back clean never reaches this file.

Triggers on: spec ❌, any Critical or Important finding, or a ⚠️ item you
confirmed as a real gap.

**Two routes leave the loop before it starts.**

- **Minor findings never enter the loop.** Record them as you go —
  `Task <NN>: minor (deferred): <one-liner>` — and point the final
  whole-branch review at that list so it can triage what must be fixed before
  merge. *A roll-up nobody reads is a silent discard.*
- **A plan-mandated finding is yours to rule on.** Weigh the finding against the
  task text, decide with the design as the binding authority, and ledger the
  ruling **before** acting. Do not dismiss the finding because the plan mandates
  it, and do not dispatch a fix that contradicts the plan without a recorded
  ruling.

Everything else enters the loop.

A **fix round** is one fix dispatch plus one scoped re-review. **Five rounds
maximum per task.**

- **Rounds 1–3:** resume the original implementer, sending the open findings
  verbatim. Its context is intact — it knows the task, the code, and its own
  choices. If the harness cannot message a live subagent, dispatch a fresh one
  with the task path, the report-file path and the findings; the report file
  is the persistent memory either way.
- **Rounds 4–5:** dispatch a **fresh** implementer on a **more capable model**,
  with the task path, the report-file path, the open findings, and this
  framing: *"A prior implementer attempted this task N times; you own it now.
  Read the report file for what was tried."* A loop surviving three resumes
  usually means the implementer cannot see its own problem — fresh eyes and a
  capability bump in one move.

**Every round:** the implementer fixes, re-runs the tests covering the amended
code, appends its fix report to the same report file, and returns the short
contract. **Name the covering test files in the fix message** — a one-line fix
does not need the whole suite.

**Before re-dispatching the reviewer, confirm the fix report contains the
covering tests, the command run, and the output.** All three, or no re-review.

**The re-review is scoped.** Run
`scripts/review-package <TASK> <FIX_BASE> <HEAD>` where `FIX_BASE` is the head
the previous review saw. The re-reviewer verdicts **each finding ADDRESSED or
NOT ADDRESSED** and flags new breakage **in the fix diff only**. New
Critical/Important breakage joins the open findings. Out-of-scope observations
go to the ledger as deferred minors — **they never extend the loop.**

Ledger each round:
`Task <NN>: fix round <R>/5 (<X> addressed, <Y> open — <one-liners>; commits <a7>..<b7>)`

**Never fix findings yourself in the controller session.** Your context stays
clean for coordination, and controller fixes skip review entirely.

**The breaker.** When round 5's re-review still leaves findings open, stop
dispatching and adjudicate each one yourself — you hold the plan and cross-task
context the reviewer lacks. Three categories:

1. **Reviewer is wrong, or the point is contestable** → park it:
   `Task <NN>: parked — <finding> — Ruling: <why the code stands>`.
   The final review sees both sides.
2. **Real, but nothing downstream builds on it** → park it the same way, with a
   ruling saying it is real and deferred.
3. **Real and load-bearing** — a later task builds on it, or it reveals a plan
   defect → rule on the **smallest change that unblocks the dependent work**,
   ledger it as `Task <NN>: Ruling: <finding> — <decision and why>`, and carry
   it into the next task's dispatch. *Parking a structural failure silently
   lets every dependent task build on it.*

**Adjudicate only at the cap. Adjudicating earlier to end a loop is pre-judging
with a different name.** Every adjudication is a ledger entry — **a silent
discard is forbidden.** Stop entirely only when the defect leaves every path
forward a guess.

