---
description: Stress-test a decision that is not heading for code: the grilling interview standalone, no classification, no design doc, no gate
---

# /fx:grill

**Argument:** the topic: a plan, a decision, an idea, a position to be talked
out of. No argument given? Ask what to grill.

Run the interview technique in `../references/vocab/grilling.md` and **stop.**

---

## The boundary: read this before anything else

`fx-brainstorm` owns *"let's build X."* It already uses grilling internally, on
its way to a classification, a design and an approval gate. **This command is
not a second door into that pipeline.**

`/fx:grill` is for the decisions that are **not heading for code**: which vendor,
whether to take the contract, how to structure the team, is this idea worth
doing at all. It is also the tool for the one that is heading for code but is
not ready to be: where the question is *should we*, not *how*.

**The moment the topic turns out to be work that will touch this repo's code,
say so and hand over to `fx-brainstorm`. Do not carry on and produce the design
yourself.** One claimant per intent is the entire point of this plugin; a
`/fx:grill` that quietly grows a classification step and a design document
becomes the second claimant, and the problem fx exists to end is back.

So, explicitly, this command **never**:

- classifies the topic as spike / bounded / architectural
- writes a `design.md`, a `plan.md`, a task or any other artifact
- runs an approval gate, because there is nothing to approve: no work follows
- hands off to `fx-plan`, `fx-implement` or `fx-tdd`
- writes or edits code

It runs the interview. It reports. It stops.

## Running it

`../references/vocab/grilling.md` is the technique and it is authoritative: the design tree, the frontier, rounds of 2 to 4 related questions on one topic, a
recommended answer with a one-line reason on every question, and the written
`## Open questions` ledger maintained from round one.

Two things carry over unchanged and matter most here:

- **Facts are your job; decisions are theirs.** Never ask for something you can
  look up. Dispatch a read-only agent for it and keep asking the rest of the
  frontier while it runs.
- **The ledger only grows from the user's tangents.** A tangent adds open
  questions; it never silently removes one.

Done is the frontier empty: every branch visited, nothing left silently
assumed. State how many questions remain open at the end of every round.

## Report

The settled decisions and the reasoning that produced them, plus anything still
open. **A conclusion, not a work order.** If the session surfaced work that
should be built, name it and point at `fx-brainstorm`: that is where it goes,
in a separate, explicit invocation by the human.
