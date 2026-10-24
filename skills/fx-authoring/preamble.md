## PREAMBLE.md

fx injects `PREAMBLE.md` into every session and every dispatched subagent,
on every runtime, from that one file. It is a bootstrap, not a router
(`docs/adr/0021`): it makes the model invoke the lane that carries the rules.
Rules live in lanes, and routing lives in the skill descriptions. So:

- A new rule goes into the lane that is loaded at the moment it applies. It
  goes into the bootstrap only when it must hold with no lane loaded, and
  `docs/plans/2026-09-21-multi-harness/bootstrap-no-loss-audit.md` names each
  such rule and why.
- A new trigger goes into its lane's description. When another lane claims the
  same work, both descriptions name each other: the model reads the one it
  matched, so the redirect must be there. `tests/gates/description-overlap.test.js`
  holds the pairs.
- Write order into the descriptions too ("use fx-debug first"). The process
  lane decides how the work is approached, so invoking it second means redoing
  what the first one already produced.

Only the fixed intro sits above the opening imperative; nothing else is added
there (`docs/adr/0002`). The bootstrap alone stays under 3,400 characters, and
the render with its repo.md note and plan-state block under 9,000
(`lib/preamble.test.js`).

The imperative is not softened because a model seems capable. Measured: a model
reviewed a diff competently and invoked nothing. Doing the work from memory gets
what it thought to look for; the lane gets the rest.

It states the dash rule as an absolute, "none", because the softer version
("avoid em-dash-heavy rhythm") is unmeasurable, and an unmeasurable rule is
one nobody checks. `scripts/check-prose` greps for it.
