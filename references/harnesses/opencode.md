# opencode

Harness knowledge. ADR 0016. True of the runtime executing the session, in
any repository. Measured against opencode 1.18.25.

Nothing here is load-bearing before a lane is invoked: ADR 0020.

## Tool vocabulary

`bash`, `read`, `glob`, `grep`, `edit`, `write`, `apply_patch`, `task`,
`skill`, `todowrite`, `webfetch`, `websearch`.

On GPT-family models, `apply_patch` replaces `edit` and `write`.

Which shell runs a `bash` call on Windows is not measured. On Windows, fx's
shell guard reads the command both the bash way and the PowerShell way, and
refuses when either reading meets a hard rule.

## Plugin events fx reads

`chat.message` gets `{sessionID, agent, model, messageID, variant}` and fires
for every message `SessionPrompt.prompt` creates: the user's prompt, a slash
command, and the task tool's prompt to a child session, including a child a
`task_id` resumes. Nothing in the event tells a user's message from a parent
agent's. Two synthetic user messages (the task tool's "Summarize the task tool
output above and continue with your task." and the shell's "The following tool
was executed by the user") are written without it.

fx marks the turn boundary here and runs the Stop reminder for the turn that
just ended.

`experimental.chat.system.transform` gets `{sessionID, model}` in a chat turn
and `{model}` alone when an agent is generated.

The edit rules (design decision 5) run in `tool.execute.before` for `edit`,
`write` and `apply_patch`, after the fx-state refusal and the lane check. A
built-in breach throws `[fx] rule <id>: <rule> (<file>)`, which refuses the
call as the git guard does. A failure to load the rules lets the edit
through, and is said once on stderr. The `.fx.json` change notice is queued the same way beside
the Stop reminder at the next `chat.message`, and also printed on stderr for the user; the plugin keeps the file as each
session's last Stop saw it in memory, so a restart starts the comparison again.

GAP: the passive-stall nudge (twelve reads in a row with no edit) is meant for
root sessions only (design decision 8). The plugin's inputs carry no signal
that a session is a child, so a child session that is not a read-only review
agent, such as `general` or `explore`, can be nudged too.

## Permissions

`permission:` governs access to tools. `write` and `patch` collapse onto
`edit` for permission purposes.

## Subagent dispatch

Dispatch goes through the `task` tool. `subagent_depth` defaults to 1.

MEASURED 2026-10-24 on opencode 1.19.4: the `task` tool takes no model field, so a dispatch cannot choose its model. Evidence: `strings` of `~/.opencode-v1/bin/opencode` (version string `"1.19.4"`), needle `subagent_type`: the parameter object is `description`, `prompt`, `subagent_type`, `task_id` and `command`, plus `background` in its background form, and none of them is a model. ADR 0031 found the same at `v1.18.25`.

fx does not change a dispatch's model here; model routing is Claude Code only (ADR 0031). The `task` tool has no model field, so a dispatch cannot be moved to another model.
