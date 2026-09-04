# Instruction before enforcement

fx tells agents what to do in prose and reaches for a hook only where a rule is
mechanical and irreversible. When lanes were not firing, the response was to
build a git guard, a lane check, three hooks and roughly 1,400 lines of
machinery. The actual cause was that **nothing had ever told the agent to invoke
a lane**: the imperative was dropped during consolidation. Restoring 48 lines of
prose fixed it, and the machinery was then deleted.

**Before building a mechanism to make agents comply, check whether anything has
instructed them.** Enforcement is what you reach for after instruction has
failed, and here instruction had never been tried.

## Consequences

- A red-flag table guards against self-deception, not against an informed
  override. An agent that correctly classifies a task and then decides the
  ceremony is not worth it is not caught by a rationalization row, and that is
  accepted rather than patched with a gate.
- Guards are reserved for actions that are irreversible, outward-facing, or
  both. Everything else is a judgment call and is written as one.
