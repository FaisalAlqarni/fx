# The user's own permission answer wins over fx's grant

`plugins/fx.js` adds `general.permission.task = 'allow'` only inside a guard:
`typeof general.permission === 'object' && !('task' in general.permission) &&
!('*' in general.permission)` (`plugins/fx.js:172` to `174`). The obvious
simplification, setting it unconditionally so fx's subagents can always
dispatch, was written once and caught in review before it shipped.

opencode gives a subagent the `task` tool only when its own permission block
has a rule keyed exactly `task`; a bare `"*": "allow"` does not grant it
(`subagent-permissions.ts`, `canTask`, cited in the surrounding comment at
`plugins/fx.js:158` to `169`). fx needs its `general` built-in subagent to
have that key, or an implementer can never dispatch a reviewer. But opencode
1.18.25 rewrites a bare `permission: "ask"` into `{"*": "ask"}` before this
config hook ever runs. So a wildcard the user wrote, or opencode wrote on
their behalf from a bare string, is the user's answer for `task` too, even
though the literal key `task` is absent. Setting `task` unconditionally would
overwrite that answer with fx's own, silently turning a user's "ask before any
subagent" into "always allow subagents," on a key the user never touched
directly.

The general rule this is one instance of: fx's config hook may add what the
user did not decide, and must never overwrite what they did decide, however
that decision is spelled in the config it reads. Absence of the literal key is
not the same fact as absence of a decision.

## Consequences

- Any future default fx's config hook adds gets the same two part check
  before it: is there already a key that governs this, and is there a
  wildcard that answers it too. Skipping either check regresses to the
  unconditional write this ADR exists to block.
- A user who wants fx's subagents to dispatch and has an `"ask"` or `{"*":
  "ask"}` block gets no default from fx: they see the prompt opencode already
  wired, not a silent override.
- Merge only, never replace: `general.permission` itself is built from
  `general.permission || {}` first, so an existing object gains the one key,
  it is never swapped out.
