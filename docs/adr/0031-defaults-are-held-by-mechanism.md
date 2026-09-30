# Defaults are held by mechanism, not prose

## Model routing

### Context

On advantage-backend, 720+ subagents ran in one build. About half of the implementers, fixes and reviews ran on the most capable tier by explicit choice, although `model-selection.md` says the default is the standard tier. The owner asked for routing more than once. A prose rule did not hold the default.

### Decision

`hooks/fx-pretooluse.js` routes every `Agent` (and older `Task`) call through `route()` in `lib/dispatch-route.js`.

- A general dispatch (`general-purpose`, `claude`, `Plan`) with no `model` is rewritten to `model: "sonnet"`.
- `model: "opus"` with no prompt line starting `Capable because:` is rewritten to `sonnet`. With the line, it passes.
- A dispatch that names `sonnet` or `haiku` passes untouched.

The hook rewrites and never refuses. It cannot tell fx's dispatches from the user's own, so a refusal would block the user. Any load failure or throw in the routing module passes the call unchanged: exit 0, no output.

This narrows the design: only the three general types are defaulted. A call with no `subagent_type` can be a fork, which must inherit the parent's model. `fx:` agents pin their own tier in frontmatter. Other plugins' agents keep their own pins, so an unpinned third-party agent still inherits the session's model. An explicit `model: opus` on any non-`fx:` typed agent still needs the reason line.

### Probe result

Live probe, parent session on `opus`, three `claude -p` runs with `--plugin-dir` at this repo:

- no model on a general dispatch: subagent ran on `claude-sonnet-5-5`
- `model: opus`, no reason line: `claude-sonnet-5-5`
- `model: opus`, with `Capable because:` line: `claude-opus-5-5`

The hook therefore omits `permissionDecision`. Claude Code applied `updatedInput` without it, so the normal permission flow still decides whether the call runs. Adding `allow` would skip that flow for no gain.

## Codex and OpenCode deferred

Neither runtime takes a model per dispatch. A Codex role's `model` overrides the `spawn_agent` argument (`multi_agents_v2/spawn.rs:128-143` at `rust-v0.155.1`). OpenCode's `task` tool has no model argument, and a subagent inherits the parent's (`tool/task.ts:43-60,181-184` at `v1.18.25`). Routing there needs tier-pinned roles per runtime. Most OpenCode setups run one hosted model, so the gain is small. Deferred.

## Standing rulings

Added by task 04.
