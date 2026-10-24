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

MEASURED 2026-10-24 on Claude Code 2.1.278: the `Agent` tool takes a `model` field per dispatch, and a hook's `updatedInput` that sets it changes the model the subagent runs on. Evidence: ADR 0031's live probe, three `claude -p` runs with the parent on `opus`: no model on a general dispatch ran `claude-sonnet-5-5`, `model: opus` with no reason line ran `claude-sonnet-5-5` after the hook, and `model: opus` with a `Capable because:` line ran `claude-opus-5-5`. ADR 0031 does not name the Claude Code version; 2.1.278 is the version this file is measured against, and the date is when this paragraph was recorded.

`hooks/fx-pretooluse.js` routes every `Agent` and `Task` call through `lib/dispatch-route.js`:
a general dispatch (`general-purpose`, `claude`, `Plan`, or no type at all,
which the Agent tool starts as general-purpose) with no `model` runs on
`sonnet`, and any `model` other than `sonnet` or `haiku` without a
`Capable because:` line in the prompt runs on `sonnet`. A fork (the explicit
type `fork`) keeps the parent's model, and an `fx:` agent with no `model` keeps its frontmatter pin, while one given a `model` other than `sonnet` or `haiku` without a `Capable because:` line runs on `sonnet`. It
never refuses a call. When routing itself fails, the hook prints a
`systemMessage` saying routing is off. Codex and opencode
have no equivalent yet (ADR-0031).

## Tool results in hooks

Source: the hooks reference at https://code.claude.com/docs/en/hooks (PostToolUse and PostToolUseFailure input), read 2026-10-23. No `claude -p` run was made, so this is the documented shape, not a recorded payload.

A `Bash` call that exits non-zero reaches hooks as `PostToolUseFailure`, not `PostToolUse`. Its payload carries `hook_event_name`, `tool_name`, `tool_input`, `tool_use_id`, `error` (a string whose first line is `Exit code N`, then stdout and stderr interleaved), `is_interrupt` and `duration_ms`. A shell that could not start gives a bare message with no `Exit code` line.

A successful `Bash` call reaches `PostToolUse` with `tool_response` keys `stdout`, `stderr`, `interrupted` and `isImage`. No exit-status field is documented there, so `PostToolUse` means success and `PostToolUseFailure` means failure; fx reads the outcome from the event name.

UNVERIFIED: the failing-`Bash` signal above is docs-sourced. If a non-zero exit arrived as `PostToolUse`, fx would read a failed check as a pass. Recording one `claude -p` run of a failing command settles it; that run is an owner item.

## Shell guard decisions

The shell guard never asks: a hard rule is a deny, and any other command runs.
