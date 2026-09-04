# Every skill stands alone; no lane requires another

Nine of eleven skills work with no pipeline, no plan and no prior artifact. The
two exceptions are genuine prerequisites rather than coupling: `fx-plan` needs a
design to plan from, `fx-implement` needs tasks to implement.

A mandatory `fx-humanize` call inside `fx-brainstorm` was proposed and declined.
`fx-humanize` fires on its own, and a required sub-skill call would couple two
independent lanes, which is the opposite of the goal that prompted the request.
It became a pointer in the existing self-review, not a gate.

## Consequences

- Cross-references between skills are pointers, never invocations.
- A skill invoked directly by a user must behave correctly with no pipeline
  state around it, which is the common case rather than the exception.
