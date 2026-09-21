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

Dispatch is `spawn_agent`, `wait_agent`, `send_input`. `agent_type` names a
role; `task_name` is a free label. The spawn message is encrypted in transit
to hooks.
