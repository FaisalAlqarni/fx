# Codex

Harness knowledge. ADR 0016. True of the runtime executing the session, in
any repository. Measured against Codex CLI 0.155.1.

Nothing here is load-bearing before a lane is invoked: ADR 0020.

## Tool vocabulary

No `Read`, `Grep` or `Glob` tool exists. Everything goes through the shell.
Edits go through `apply_patch`.

A shell call arrives at a hook as `tool_name: "Bash"`, with the command at
`tool_input.command`.

## Subagent dispatch

Dispatch is `spawn_agent`, then `wait_agent`; `send_input` talks to a running
child. `task_name` is a free label. The spawn message is encrypted in transit
to hooks.

Dispatch an fx review role with `agent_type` set to the role's name, such as
`fx-lens-security`. Always pass it. A spawn copies the parent's whole history
by default, and in that mode a role applies only when `agent_type` names it,
so a spawn without it runs as a copy of the parent with none of the role's
instructions. The `agent_type` parameter itself exists only while at least one
user-defined role is installed.

Codex reads roles once, when a session starts, before any hook runs. Roles
planted or repaired during a session, by fx's SessionStart hook or by
`fx-setup`, are dispatchable only after Codex restarts. fx says so when it
writes one.

Nesting depth, read from the 0.155.1 source. On a model whose catalog entry
selects MultiAgentV2 (5 of the 9 models in the 0.155.1 bundled catalog), there is no depth
limit: a child keeps `spawn_agent`, and only concurrency is capped, at 4
threads per session including the root by default
(`[agents] max_concurrent_threads_per_session`). On a model that selects V1,
the default depth is 1: a child cannot spawn. The user-level key
`[agents] max_depth` in `$CODEX_HOME/config.toml` raises it. It is ignored
under V2, and nothing a plugin ships can set it.
