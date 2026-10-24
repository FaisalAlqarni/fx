# opencode-v2

Harness knowledge. ADR 0016. True of the runtime executing the session, in
any repository. Measured against OpenCode 2.0.18; the paragraphs dated
2026-10-24 were read from the installed OpenCode 2.1.4. Source tags: the 2.0.18
probe (probe-findings.md, cited as "probe Q<n>") and the v2 docs at
opencode.ai/v2/docs (plugins, agents, permissions).

Nothing here is load-bearing before a lane is invoked: ADR 0020.

## Tool vocabulary

`shell`, `read`, `glob`, `grep`, `edit`, `subagent`, `skill`. The shell tool
is `shell`, not `bash`, and dispatch is `subagent`, not `task` (probe Q3,
Q9, Q10: `tool_use.part.tool` is `shell`, `subagent`, `read`). A plugin
reaches a call through `ctx.tool.hook('execute.before' | 'execute.after')`
(probe Q3).

MEASURED 2026-10-24 on OpenCode 2.1.4: three tools write a file, all under the `edit` permission, and the `execute.before` event carries their arguments at `input`. `edit` takes `{path, oldString, newString, replaceAll}`, `write` takes `{path, content}`, and `patch` takes `{patchText}` in the same `*** Add File:` / `*** Update File:` / `*** Delete File:` envelope as Codex's `apply_patch`. The file field is `path`, not 1.x's `filePath`, and the patch tool is `patch`, not `apply_patch`. Evidence: `strings` of `~/.opencode/bin/opencode` (version string `"2.1.4"`), read only: `iF="edit",oF=o({path:...,oldString:...,newString:...,replaceAll:...})` beside `id:"opencode.tool.edit"` with `permission:"edit"`; `eT="write",tT=o({path:...,content:...})` beside `id:"opencode.tool.write"`; `XS="patch",JS=o({patchText:...})` beside `id:"opencode.tool.patch"`, whose parser accepts the hunk headers `'*** Add File: {path}', '*** Delete File: {path}', '*** Update File: {path}'`. A tool or field name outside these gets no edit rule check, never a refusal.

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

## Shell guard

On 2.x the shell guard runs in `permission.evaluate`. `execute.before`
records the full command text for the call; `evaluate` runs the git guard on
it, then the hard rules, the read-only allowlist and the repo's own commands.
A hard rule sets `deny` with its text; any other command is allowed and
logged.

GAP: the passive-stall nudge is meant for root sessions only (decision 8).
No 2.x event fx reads says that a session is a child, so a child session
that is not a read-only review agent can be nudged too. The read-only
exemption itself rests on the agent named on the `prompt` event, a field the
2.1.4 event does not carry (see "Turn boundary").

MEASURED 2026-10-24 on OpenCode 2.1.4: execute.before is awaited before `permission.evaluate` runs, so a promise returned from a `tool.execute.before` callback settles before the call's permission request. Evidence, from `strings` of `~/.opencode/bin/opencode` (version string `"2.1.4"`), read only: (1) the plugin adapter registers a tool hook as `hook:(o,r)=>I(e.tool.hook(o,(n)=>oe[o](()=>Promise.resolve(r(n)))))` with `oe={"execute.before":(i)=>$e({try:i,catch:X}),"execute.after":(i)=>le(i)}`, where `$e` is the same `{try,catch}` promise wrapper `command.transform` uses to await `n.execute(a)`, so the returned promise is awaited and a rejection fails the call; (2) the hook service's `trigger` runs each registered callback in turn with `yield*x.callback(h)`; (3) the tool registry's `execute` starts with `Me=yield*i(te.call.name,te.call.input,re)`, where `i=(h,x,y)=>e.trigger("tool","execute.before",...)`, before it looks the tool up and runs it; (4) the shell tool raises its permission request from inside its own execution, `yield*F.assert({action:wd,resources:ge.commands.map(...)...})`, and the permission service fires `a.trigger("permission","evaluate",...)` while answering such a request. The probe against the owner's loopback model server was not run, because the binary text settled the question; this is a reading of the bundled code, not a recorded session.

Edit rules run in `execute.before` for `edit`, `write` and `patch`. The
built-in rules (no em or en dash in Markdown, no secret, no conflict marker)
are plain code checks and refuse by a synchronous throw on any 2.x, since a
throw there refuses the call (probe Q4). A failure to load the rules lets the
edit through.

GAP: opencode 2.x shows no notice when the .fx.json hook switches change during a session. Claude Code shows it at session start and Stop, Codex shows it at session start and writes it to stderr at Stop, and opencode 1.x prints it on stderr and queues it beside its Stop reminder; the 2.x reminder in the `prompt` hook does not carry it.

Which shell runs a `shell` call on Windows is not measured either. On
Windows the guard reads the command both the bash way and the PowerShell
way, and refuses when either reading meets a hard rule.

## Turn boundary

`ctx.session.hook('prompt')` marks a turn boundary: fx appends a `prompt`
event with text `null` to the session journal, keyed by the payload's
`sessionID`. The payload is described below; `sessionID` is the field
every other 2.x event carries. A payload with no string `sessionID` writes
nothing, and fx says so on stderr once per plugin instance; so does a
journal that cannot be written. If the hook cannot be registered, fx prints
`[fx] the prompt hook is unavailable: <message>; the Stop reminder cannot
work on this opencode.` to stderr only. GAP: on such an opencode no turn boundary is
recorded.

MEASURED 2026-10-24 on OpenCode 2.1.4: the `session` `prompt` event is `{sessionID, messageID, prompt: {text, files, agents, skills}, metadata, delivery}`. Evidence: `strings` of `~/.opencode/bin/opencode` (version string `"2.1.4"`), needle `"session","prompt"` in `SessionPrompt.prepare`: `trigger("session","prompt",{sessionID:H.session.id,messageID:H.messageID,prompt:structuredClone({text:H.input.text,files:H.input.files?.slice(),agents:H.input.agents?.slice(),skills:H.input.skills?.slice()}),metadata:structuredClone(H.input.metadata),delivery:H.input.delivery??"steer"})`. The text is `prompt.text`. There is no agent field: `prompt.agents` lists agents the user mentioned, not the agent the message is addressed to, and the event reads nothing else of the input.

## Subagent dispatch

The `subagent` tool takes `{ agent, description, prompt }` and returns
`<subagent sessionID="..." state="completed">` around the answer (probe
Q10). The preamble reaches a subagent on every request (probe Q2).

MEASURED 2026-10-24 on OpenCode 2.1.4: the `subagent` tool takes an optional `model` field, written `providerID/modelID` or `providerID/modelID#variant`. Evidence: `strings` of `~/.opencode/bin/opencode` (version string `"2.1.4"`), next to `opencode.tool.subagent`: the parameter object holds `description`, `prompt`, `model:et(t).annotate({description:'NEVER set this unless the user explicitly asks for a particular model or variant. The value is written as "providerID/modelID", or "providerID/modelID#variant" to include a variant. ...'})`, `sessionID` and `background`, and the agent-type text says a name that is not a subagent "most likely mean[s] a model: pick a suitable agent and pass the name through the model parameter instead."

fx does not change a dispatch's model here; model routing is Claude Code only (ADR 0031). No cheap-tier model is recorded for this harness, and whether a 2.x plugin may change a call's input before it runs is unmeasured, so a rewrite could only be logged.

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

The `permission.evaluate` backstop for the five hidden lanes yields to the
user's explicit allow on agents fx configured: the transform records them, and
an incoming `allow` there can only come from a user rule. For an agent fx never
processed (one defined in `opencode.json`) the incoming `allow` is the runtime
default, so the backstop still refuses. If the transform failed, every agent is
refused. The read-only re-deny of fx's six review agents is unchanged.

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
