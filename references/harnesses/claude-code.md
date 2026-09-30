# Claude Code

Harness knowledge. ADR 0016. True of the runtime executing the session, in
any repository. Measured against Claude Code 2.1.278.

Nothing here is load-bearing before a lane is invoked: ADR 0020.

## Tool vocabulary

`Read`, `Grep`, `Glob`, `Bash`, `Write`, `Edit`.

## Subagent dispatch

Dispatch goes through the task tool.

## Frontmatter

`tools:` in agent frontmatter is a hard allowlist. `disallowedTools` is
applied first, ahead of the allowlist.

## Model tiers

fx's three generic tiers map to the Agent tool's `model` values:

| Tier | Agent tool `model` value |
|---|---|
| cheapest | `haiku` |
| standard | `sonnet` |
| most capable | `opus` |

This is the harness layer: naming a model here is allowed. A skill body or
generic reference never names Haiku, Sonnet or Opus; it names the tier.

`hooks/fx-pretooluse.js` routes every `Agent` and `Task` call through `lib/dispatch-route.js`:
a general dispatch (`general-purpose`, `claude`, `Plan`, or no type at all,
which the Agent tool starts as general-purpose) with no `model` runs on
`sonnet`, and any `model` other than `sonnet` or `haiku` without a
`Capable because:` line in the prompt runs on `sonnet`. A fork (the explicit
type `fork`) keeps the parent's model, and any `fx:` agent is left alone. It
never refuses a call. When routing itself fails, the hook prints a
`systemMessage` saying routing is off. Codex and opencode
have no equivalent yet (ADR-0031).
