# Read-only is three mechanisms and one guarantee

`SURFACE.md` states the lens guarantee plainly: tool restriction is enforced by
the harness, so a lens physically cannot write to the repo. That sentence is
true on Claude Code because `tools:` is a hard allowlist. It is true on a third
runtime only if something enforces it there, and the mechanism is different on
each.

| Runtime | Mechanism | Strength |
|---|---|---|
| Claude Code | `tools: Read, Grep, Glob, Bash` | hard; `disallowedTools` applies first |
| opencode | `permission: { edit: deny, bash: allow }` | hard; `write` and `patch` collapse onto `edit` |
| Codex | `sandbox_mode` in the role file **and** a `PreToolUse` deny keyed on `agent_type` | belt and braces |

Codex needs both halves. Its documentation says a role file may set
`sandbox_mode = "read-only"`, and its own worked examples do. But it also says
the parent turn's live runtime overrides are reapplied when a child is spawned,
even if the role file sets different defaults. A role file is therefore a
default, not a boundary. The docs say as much about the other half too: treat
tool hooks as a useful guardrail, not a complete enforcement boundary.

Corroboration that neither half is sufficient alone: OpenAI's own read-only
reviewer ships as a **skill** whose read-only property is prose, and the
built-in `explorer` role is a zero-byte TOML file.

## What made the hook half possible

Measured 2026-09-21, Codex 0.155.1, `codex exec` spawning a subagent:

```
PreToolUse   tool='collaborationspawn_agent'  agent_id=None  agent_type=None
SubagentStart                                 agent_id='01a0…'  agent_type='default'
PreToolUse   tool='Bash'                      agent_id='01a0…'  agent_type='default'
```

A subagent's tool calls carry `agent_id` and `agent_type`; the controller's do
not. That is the discriminator a hook needs, and it is undocumented: the
published field table lists those two fields only for the subagent lifecycle
events.

The same probe settled something worth more than the lens question: Codex
serialises a shell call as `tool_name: "Bash"` with the command at
`tool_input.command`, which is Claude Code's shape exactly. `lib/git-guard.js`
stays one implementation across both.

## Consequences

- **The guarantee is stated per runtime, never once.** A claim that a lens
  cannot write is a claim about a mechanism; naming the mechanism is what keeps
  it honest when a fourth runtime arrives.
- **Prose is the floor, not the mechanism.** A lens still says it must not write.
  That covers the gap the docs admit to, and it is the only protection on a
  runtime fx has not yet measured.
- An undocumented field that a guarantee rests on gets a test, because the next
  release may remove it and nothing will announce that.
