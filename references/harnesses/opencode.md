# opencode

Harness knowledge. ADR 0016. True of the runtime executing the session, in
any repository. Measured against opencode 1.18.25.

Nothing here is load-bearing before a lane is invoked: ADR 0020.

## Tool vocabulary

`bash`, `read`, `glob`, `grep`, `edit`, `write`, `apply_patch`, `task`,
`skill`, `todowrite`, `webfetch`, `websearch`.

On GPT-family models, `apply_patch` replaces `edit` and `write`.

## Permissions

`permission:` governs access to tools. `write` and `patch` collapse onto
`edit` for permission purposes.

## Subagent dispatch

Dispatch goes through the `task` tool. `subagent_depth` defaults to 1.
