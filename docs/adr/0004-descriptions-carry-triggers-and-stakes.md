# A skill description carries triggers and stakes, never a workflow summary

Three categories, and only two of them belong in a `description`:

- **Trigger** (*"use when `tasks/` exists"*) tells the agent whether the skill
  applies. Required.
- **Stakes** (*"skip it and there is no ledger, so a compacted session redoes
  finished work"*) tells the agent what breaks. Required, because a trigger list
  alone gives no reason to believe the skill holds anything the agent does not
  already know, and loading it then reads as pure cost.
- **Summary** (*"runs each task in a worktree, then reviews"*) is the procedure.
  **Banned.** A summarising description gets acted on *in place of* the skill: a
  measured case had an agent run one review where the body specified two.

**A stakes clause must name machinery, not quality.** `fx-design` first shipped
with *"the page converges on the defaults every model reaches for"* and fired
1/5. That is a claim about the reader, and a model reading it concludes it is
not the one that converges. Rewritten to *"you cannot check your own output
against a list you have not read"*, it fired 5/5 with the body untouched.

## Consequences

- Anything phrased as an outcome the model could argue it would have reached
  anyway is not a stakes clause.
- This matters most for a lane overlapping a native strength. Reviewing and
  designing are things the model already does constantly, so those descriptions
  have to displace an established behaviour rather than describe a workflow.
