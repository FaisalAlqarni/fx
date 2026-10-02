# opencode-v2

Harness knowledge. ADR 0016. True of the runtime executing the session, in
any repository. Measured against OpenCode 2.0.18. Source tags: the 2.0.18
probe (probe-findings.md, cited as "probe Q<n>") and the v2 docs at
opencode.ai/v2/docs (plugins, agents, permissions).

Nothing here is load-bearing before a lane is invoked: ADR 0020.

## Tool vocabulary

`shell`, `read`, `glob`, `grep`, `edit`, `subagent`, `skill`. The shell tool
is `shell`, not `bash`, and dispatch is `subagent`, not `task` (probe Q3,
Q9, Q10: `tool_use.part.tool` is `shell`, `subagent`, `read`). A plugin
reaches a call through `ctx.tool.hook('execute.before' | 'execute.after')`
(probe Q3).

## Permissions

An agent holds `permissions`, a list of `{ action, resource, effect }` with
effect `allow`, `deny` or `ask`. The last matching rule wins, and a rule list
set by a plugin replaces the defaults instead of merging with them (probe
Q6). A new agent starts from `* * allow`, `external_directory * ask` and
three `.env` read rules (probe Q6).

An allowlist is therefore `* * deny` first, then the actions to allow back.
Reading a path outside the project needs an `external_directory` rule for
that path (probe Q6, core rules for the data and config directories).

`experimental.policies` entries such as `shell:git push *` deny apply after
plugin hooks, at the top level and inside a subagent (probe Q5). A global
`permissions` key is fatal to OpenCode 1.x, so a config shared with v1 must
not carry it (probe Q7).

A plugin `permission.hook('evaluate')` sees the shell command through the
call id that `execute.before` recorded, heredoc body included. Its
`resources` list splits on pipes and `;`, not inside a heredoc (probe Q3).
A throw in `execute.before` refuses the call with error type `unknown` and
the turn continues (probe Q4).

## Subagent dispatch

The `subagent` tool takes `{ agent, description, prompt }` and returns
`<subagent sessionID="..." state="completed">` around the answer (probe
Q10). The preamble reaches a subagent on every request (probe Q2).

`experimental.subagent_depth` defaults to 1 and is 2 to let a subagent
dispatch another. A top-level `subagent_depth` key is dropped. The built-in
`general` and `explore` agents deny `subagent` and `build` is primary only
(`Agent build cannot run as a subagent`), so nothing nests unless an agent
allows `subagent` (probe Q9). fx does not grant it on 2.x (ADR-0026): it
cannot see every place 2.0.18 reads user rules from, so it cannot tell whether
the user already answered. A user lets `general` dispatch with
`{ "agents": { "general": { "permissions": [{ "action": "subagent",
"resource": "*", "effect": "allow" }] } } }` in `opencode.json`; the conformance
runner adds that rule to its scratch config. On 1.x the plugin grants the
equivalent `task` permission unless the user set one.

The lane check runs in `permission.evaluate` on the `edit` action. It
resolves each resource against the project directory, denies on a hit, and
fails open on an error, because it is advice. `write` reaches it as observed
through live row 17; `patch` is unprobed. 1.x denies on a hit too, from
`tool.execute.before` for `edit`, `write` and `apply_patch`, and also fails
open.

Every denial the plugin makes starts with `[fx] `. The installer's policies
(`experimental.policies`) apply after the plugin and answer only `Blocked by
configuration policy`, so a plain `git branch -D` shows that text, not the
guard's reason; spellings the policies skip (`git -C . branch -D`) show the
guard's. Live row 19 shows the policy layer alone (plugin removed from the
scratch config): a plain `git push --force origin main` is refused with that
generic text and the remote receives nothing.

## Skill hiding

`opencode api skill.list` lists every skill with no permission filter. The
model's own skill list honors a global `permissions` rule such as
`skill fx-audit deny` (probe Q7). v2 ignores fx's
`disable-model-invocation: true` frontmatter; it reads
`metadata: { opencode/autoinvoke }` instead (probe Q7).

`ctx.agent.transform` lists the built-in agents and fx's own, not an agent
defined in `opencode.json`, and a rule added there does not reach such an
agent, which then still sees every skill (probe Q11).

## What fx cannot observe on v2

- A subagent's own tool calls do not appear in the parent's
  `opencode run --format json` stream; only the `subagent` call and its
  report do (probe Q10).
- `skill.list` cannot prove a skill is hidden. Ask the model, or read the
  agents' permission rules (probe Q7).
- `opencode run` treats `/name args` as plain text. A command runs through
  `opencode api session.command` (probe Q8).
- `opencode api skill.list` and `opencode debug agents` return an incomplete
  list on the first call after a start (probe, changes 3).
- Run every `opencode run`, `api` and `session` call with `</dev/null`, or
  it blocks without output (probe, changes 1).

## Session export shape

`opencode session export` keeps a tool part as `{ type: 'tool', name, state }`
where `state.content` (a list of text parts) holds the output that `run
--format json` shows as `state.output`, and a refused call's `state.error` is
`{ type, message }`, not a string. The conformance reader handles both.

A subagent whose provider call failed shows up only in its own export: an
assistant message with `finish: "error"` and `error: { type, message, status }`
(real 2.0.18 lines: `provider.auth` 401 "Missing Authentication header",
`provider.invalid-request` 400). The parent session reads as clean (probe
section 12).

## Headless runs and the question tool

`opencode run` has no one to answer the `question` tool. A session that calls
it ends `Session interrupted: shutdown`. A user who runs headless denies it
with a global rule, `"permissions": [{ "action": "question", "resource": "*",
"effect": "deny" }]`; the conformance runner does. fx does not write that rule.
