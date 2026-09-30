Lens: security, 2 findings

The rules in `toOpencodeV2Agent` cannot grant more than read access under v2's evaluation. I checked them against `evaluate` (last match wins, `permission.ts:87-97`) and `Wildcard.match`. Five things confirm it:

- **Edit is denied.** The `write`, `patch` and `edit` tools all ask the `edit` action (`tool/plugin/write.ts:59`, `patch.ts:81`, `edit.ts:123`). The `edit` deny sits after every allow (`/development/fx/.worktrees/opencode-v2/lib/agent-dialects.js:92`).
- **Shell, subagent, skill, webfetch, question, MCP and code-mode `execute` are denied.** None of them has a later allow, so only the leading `* * deny` matches them. The subagent tool asserts action `subagent` (`tool/plugin/subagent.ts:138-150`), which is denied.
- **External directories stop at fx's references.** `FileAccess.resolve` runs `path.resolve` before building the `external_directory` resource (`file-access.ts:100,125`), so `references/../..` is normalized and cannot match `<refs>/*`. No other external path is allowed.
- **Saved "always" grants cannot undo a deny.** `denied()` runs on the agent and session rules before the saved rules are appended (`permission.ts:175-176`).
- **Autoaccept cannot undo a deny.** TUI autoaccept only answers `ask` requests.

1. [Important] `/tmp/claude-1000/-development/54399d8a-e6c5-4c6a-8e74-50861f05bc7c/scratchpad/oc2/oc/packages/core/src/permission.ts:162` and `.../packages/core/src/session.ts:276`: v2 evaluates `merge(agent.permissions, session.permissions)`, so session rules come after the agent's rules and win. A child session inherits its parent's `permissions`. The fx converter assumes its own list is the last word (`lib/agent-dialects.js:88-94`), and here it is not.
   - **What it takes:** a host or SDK client sets session permissions on the top-level session, through `session.create` with `permissions` or `setPermissions` (`packages/server/src/handlers/session.ts:135,275`). An example is `shell * allow` or `edit * allow`.
   - **What an attacker gets:** every fx review agent dispatched from that session inherits the grant and can run a shell or edit files, even though its own list says deny.
   - Stock `opencode run` and the TUI do not set session permissions, so this needs that extra condition. I did not confirm whether any fx harness path sets them.

2. [Minor] `/development/fx/.worktrees/opencode-v2/lib/agent-dialects.js:90`: The list replaces v2's defaults (probe Q6), so v2's `read *.env ask` and `read *.env.* ask` rules are gone. `read * allow` then lets the review agents read project `.env` files without a prompt. This is still read-only access, so it is not a privilege escalation. It does remove a secrets prompt that v2 applies by default. The v1 converter behaves the same way, so this is parity with v1, not a new regression.
