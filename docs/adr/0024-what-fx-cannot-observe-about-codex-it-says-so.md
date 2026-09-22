# What fx cannot observe about Codex, it says out loud instead of guessing

`hooksTrusted()` in `lib/plant-roles.js` (line 155) is a three line function
that always returns `null`. A live `~/.codex/config.toml`, measured 2026-09-21
against Codex CLI 0.155.1, carries `[projects."<path>"] trust_level = "trusted"`,
which is workspace trust, whether a command in that directory runs without an
approval prompt, not plugin hook trust. No verified signal for Codex's hook
trust state exists anywhere fx can read. `commands/fx-setup.md` (around line
254) turns that `null` into one plain line: hook trust is unknown, and the fix
is to run `/hooks` inside Codex regardless of what the answer would have been.

The second instance sits in the same file. Codex reads a subagent's role
definitions once, when a session starts, before any hook runs. A role
`hooks/fx-codex.js` plants or repairs this session, at `SessionStart`, is
therefore dispatchable only from the next session, never this one. The hook
does not pretend otherwise: when `plantRoles()` reports anything written or
stale, it builds a one time restart notice (`hooks/fx-codex.js:220` to `227`)
and puts it in both `systemMessage` and the end of `additionalContext`. A
session that changed nothing stays silent.

Both read like unfinished work. A `hooksTrusted()` that always returns `null`
looks like a stub waiting for its real implementation, and a hook that tells
the user to restart looks like a workaround for something that should just
work. Both are deliberate: ADR 0010 names the failure this refuses to commit,
a measurement that is honest and thorough about a different thing than the
claim it stands in for. A guessed `true` for hook trust, or a role treated as
live the moment it is planted, would each be exactly that: a confident,
specific answer with nothing behind it, offered because the true answer is
inconvenient to not have.

## Consequences

- `hooksTrusted()` stays `null` until a real signal for Codex's hook trust
  storage is measured and documented, not until someone gets tired of seeing
  "unknown" in setup output.
- The restart notice fires exactly once per session that actually wrote or
  repaired a role, from `plantRoles()`'s own `written`/`stale` result, never
  from a separate flag that could drift from what was actually written.
- A future signal for either state gets a citation to where it was measured,
  the same way the workspace trust false lead is documented here, so the next
  reader does not have to rediscover that workspace trust is not hook trust.
