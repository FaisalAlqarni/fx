# Probe findings: OpenCode 2.0.18

Probed 2026-10-01 on the installed `opencode` 2.0.18, in a scratch `HOME`,
`XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_CACHE_HOME`, `XDG_STATE_HOME` and
`TMPDIR` under one `mktemp -d` directory (`<H>` below), with a throwaway
plugin at `<H>/xdg/opencode/plugins/probe.js` that logged every hook to
`<H>/probe.log`. Model: `openrouter/qwen/qwen3.8-27b:free` for every run (no
429 or provider error, so the fallback model was never used). The key came
from `OPENROUTER_API_KEY` in the environment only; none of it appears here.
The scratch directories were removed at the end.

Ten of the eleven questions are proven; question 11 is disproven. Seven
findings the design did not anticipate change a task: read "Changes for
later tasks" first.

## Changes for later tasks

1. **Every `opencode run`, `api` and `session` call in a test or script needs
   `</dev/null`.** `opencode run --standalone "..."` with an inherited stdin
   blocks forever after "database schema bootstrap completed" and prints
   nothing. With `</dev/null` a one-line run takes 6 s. (Tasks 04, 07.)
2. **`opencode debug agents` times out for 2 minutes whenever another
   OpenCode managed service already holds the default port 49374** (as on
   any developer machine running OpenCode). Log line: `Managed service port
   49374 on 127.0.0.1 is already in use by another process. Configure another
   port with "opencode service set port <port>"`, then `Error: Timed out
   waiting for the background service to start`. With `opencode service set
   port 49777` run once in the scratch `XDG_*` environment, the same command
   returns in under 1 s. The service it starts keeps running: end the run
   with `opencode service stop` in the same scratch environment. (Task 07.)
3. **`opencode api skill.list` and `opencode debug agents` race plugin and
   config loading.** The first call after a service or standalone start
   returns `[]` (or only the built-in `opencode` and `report` skills); the
   second and later calls return the full list. `opencode api --standalone
   skill.list` is a fresh process every time, so it returned `data: []` on
   three tries in a row. Poll a warm service (`opencode api skill.list`
   without `--standalone`, after `service set port`) until the count stops
   changing. (Tasks 04, 07.)
4. **`opencode api skill.list` is not filtered by any permission rule.** It
   lists all 17 fx skills, `fx-audit` included, with the rule in place. The
   filter is on the model's skill tool (question 7). Tasks 04 and 07 must
   prove hiding by asking the model, or by reading the agents' permission
   rules, never by `skill.list`.
5. **A user-defined agent in `opencode.json` is not reached by
   `ctx.agent.transform`, and does not get its skill-deny rules** (question
   11). The plan's hiding of the five user-invoked lanes covers the built-in
   agents and fx's own, not a user's agents. ADR-0026 and task 04 must say so.
6. **`opencode run` has no command flag and treats `/name args` as plain
   text.** Commands are invoked with `opencode api session.command`
   (question 8). **`opencode export <session>` no longer exists**; it is
   `opencode session export [session]` (question 10).
7. **Built-in `general` and `explore` subagents deny `subagent`.** Depth
   2 only matters for an agent that allows `subagent` (question 9).

## Setup used

`<H>/xdg/opencode/opencode.json` held `"model": "openrouter/qwen/qwen3.8-27b:free"`
plus, per question, `experimental.policies` (5), `permissions` (7),
`agents` (11) or `experimental.subagent_depth` (9). No provider block was
needed: `OPENROUTER_API_KEY` in the environment enabled the preloaded
OpenRouter provider. Runs used `opencode run --standalone --format json
"<prompt>" </dev/null` from `<H>/proj`, a scratch git repo with
`origin` set to `/nonexistent/remote.git`. The plugin was one file,
`export default { id: 'fx-probe', setup(ctx) { ... } }`, with a
`PROBE_MODE` environment variable switching the hooks on per question.

## 1. Module shape

- `export default { id: 'fx-probe', setup(ctx) { log('setup') } }`: the
  log had `msg="loading plugin" id=<XDG>/opencode/plugins/probe.js
  entrypoint=file://<XDG>/opencode/plugins/probe.js` and `setup` in
  `probe.log`.
- The same default export with `extra: 'x'` and a `server() { log(...) }`
  method added also loaded. `server` was never called (no
  `server-key-called` line in any run), `extra` was ignored.
- Across all 28 `loading plugin` lines in the session logs,
  `grep -c 'failed to load plugin'` printed `0`.
- `ctx` keys seen: `app location options agent aisdk command event
  experimental generate model provider integration mcp permission plugin
  reference rpc skill storage tool vcs websearch worktree session shell`.

Verdict: proven: a default export with `id` and `setup` loads, and extra keys
such as `server` are ignored without an error.

## 2. Preamble

`ctx.session.hook('context', ev => ev.system.push({ type: 'text', text:
'PROBE-PREAMBLE-7c1 (marker text)' }))`.

- Top-level: `opencode run --standalone --format json "What is the marker text
  in your instructions? Answer with it only."` gave the text part
  `PROBE-PREAMBLE-7c1`.
- Subagent: a run asking the `build` agent to dispatch the `general`
  subagent with the same question. The `subagent` tool result was
  `<subagent sessionID="ses_..." state="completed">\nPROBE-PREAMBLE-7c1\n</subagent>`.
  `probe.log` shows the `context` hook firing for both sessions (`context
  build ses_f0b8...` and `context general ses_f0b8...`).

Verdict: proven: a `session.hook('context')` system part reaches the top-level
agent and a dispatched subagent, on every model request.

## 3. Guard layer 1, the call-id lookup

Hooks as in the task (the `execute.before` map, `execute.after` delete,
`permission.hook('evaluate')` lookup). One session, three shell calls asked
for in order. Log excerpt (`<H>/q3.log`, ids shortened):

```
EXEC-BEFORE shell 429dd4a8-..._0 build {"command":"echo probe-deny | cat"}
EVALUATE shell {"type":"tool","messageID":"msg_...","id":"429dd4a8-..._0"} ["echo probe-deny","cat"] agent=build pre-effect=allow
  lookup "echo probe-deny | cat"
EXEC-AFTER shell 429dd4a8-..._0 error
EXEC-BEFORE shell 502531ef-..._0 build {"command":"bash <<'EOF'\ngit status\nEOF"}
EVALUATE shell {... "id":"502531ef-..._0"} ["bash <<'EOF'\ngit status\nEOF"] agent=build pre-effect=allow
  lookup "bash <<'EOF'\ngit status\nEOF"
EXEC-AFTER shell 502531ef-..._0 completed
EXEC-BEFORE shell 15c0aa5a-..._0 build {"command":"echo ok"}
EVALUATE shell {... "id":"15c0aa5a-..._0"} ["echo ok"] agent=build pre-effect=allow
  lookup "echo ok"
EXEC-AFTER shell 15c0aa5a-..._0 completed
```

Answers:

- `before` comes before `evaluate` for the same call: yes, all three. When
  the model issues parallel calls (question 4) every `before` still runs
  before any `evaluate`.
- `ev.source.id` equals the `ev.id` the tool hook saw: yes, byte for byte
  (`ev.source` is `{ type: 'tool', messageID, id }`).
- The lookup returns the full command, heredoc body included: yes
  (`"bash <<'EOF'\ngit status\nEOF"`). `ev.resources` for the pipeline held
  two entries (`["echo probe-deny","cat"]`). For the heredoc it held **one**
  entry, the whole heredoc text, not the inner `git status` (so `resources`
  is only split on pipes and `;`-style separators, not into heredoc bodies).
- `probe-deny` refused, turn continued: yes. The shell part was
  `status: "error", error: "probe refused"`; the model's next message said
  `{"error":{"type":"permission.rejected","message":"probe refused"}}` and
  it ran the next two commands.
- `echo ok` ran (`output: "ok\n"`): no spurious lookup miss. No call hit the
  `cmd === undefined` branch in any run.
- `execute.after` fires for a denied call, with `status: "error"`, so the map
  entry is deleted and does not grow. (It does **not** fire for a call
  whose `execute.before` threw; see question 4. A guard that records in
  `before` and could then throw must not record before it can throw.)
- `pre-effect` is `allow` when the hook runs: the hook sees the agent's
  rules applied, and policies (question 5) are applied after it.

Verdict: proven: `execute.before` runs before the shell permission check, the
call ids match, the map returns the full command, and a deny from `evaluate`
refuses the call cleanly with the message visible to the model.

## 4. Guard layer 3

`ctx.tool.hook('execute.before', ev => { if (ev.tool === 'shell' &&
String(ev.input && ev.input.command).includes('probe-throw')) throw new
Error('probe threw') })`. The model was asked to run `echo probe-throw`, then
`echo after-throw`.

- Shell part for the first: `status: "error", error: "probe threw"`.
- The model received `{"error":{"type":"unknown","message":"probe threw"},"content":[]}`
  and reported it; the second call ran and returned `after-throw\n`.
- `probe.log`: `EXEC-BEFORE` for both calls, `EVALUATE` and `EXEC-AFTER`
  only for the second. A throw in `before` skips `evaluate` and
  `execute.after` for that call.

Verdict: proven: a throw in `execute.before` refuses the call cleanly
(error type `unknown`, reason visible) and the turn continues, contrary to
the source reading that it becomes a defect.

## 5. Policies

`experimental.policies: [{ "action": "permission", "resource": "shell:git
push *", "effect": "deny" }]` in the scratch `opencode.json`, in a scratch git
repo with a bogus remote.

- Top-level, "run exactly: git push origin HEAD": shell part `status:
  "error", error: "Blocked by configuration policy"`; the model reported
  `{"error":{"type":"permission.rejected","message":"Blocked by configuration
  policy"},"content":[]}` and said nothing was pushed.
- In a `general` subagent: its shell call was issued as `git push origin HEAD;
  rc=$?; echo "EXIT_CODE=$rc"` (evaluate saw `["git push origin HEAD","echo
  \"EXIT_CODE=$rc\""]`) and was blocked with the same message, relayed in
  the subagent's report.
- In both runs the plugin's `evaluate` hook saw `pre-effect=allow`: policies
  apply after plugin hooks, as the design says.

Verdict: proven: a `shell:git push *` policy blocks with "Blocked by
configuration policy" at the top level and inside a subagent, including when
the push is the first piece of a compound command.

## 6. Agents

`ctx.agent.transform(ed => ed.update('fx-probe-agent', a => { ... }))`.

- `ed.list().map(a => a.id)` before the update: `["build","general","explore",
  "compaction","title","summary","plan"]`.
- `update` on a missing id **creates it**. The object handed to the callback
  (logged before the callback changed it), with directory paths shortened:

```json
{"id":"fx-probe-agent","name":"fx-probe-agent",
 "request":{"settings":{},"headers":{},"body":{}},
 "mode":"primary","hidden":false,
 "permissions":[
  {"action":"*","resource":"*","effect":"allow"},
  {"action":"external_directory","resource":"*","effect":"ask"},
  {"action":"read","resource":"*.env","effect":"ask"},
  {"action":"read","resource":"*.env.*","effect":"ask"},
  {"action":"read","resource":"*.env.example","effect":"allow"},
  {"action":"external_directory","resource":"<H>/data/opencode/shell/*/*","effect":"allow"},
  {"action":"external_directory","resource":"<H>/data/opencode/tool-output/*","effect":"allow"},
  {"action":"external_directory","resource":"<H>/tmp/opencode/*","effect":"allow"},
  {"action":"external_directory","resource":"<H>/xdg/opencode/*","effect":"allow"}]}
```

  This matches the source reading: `Info.default(id)` (`mode: 'primary'`,
  `* * allow`, `external_directory * ask`, the three `.env` read rules) plus
  core's four `external_directory` allows for the data `shell` and
  `tool-output`, `TMPDIR/opencode` and the config directory. `description`
  and `system` are absent until set. Task 04's stub copies these.
- After the callback set `mode: 'subagent'`, `description`, `system` and
  `permissions`, `ed.get('fx-probe-agent')` returned exactly those (the
  replaced `permissions` list included; the defaults are replaced, not
  merged).
- `opencode debug agents` (warm service, see "Changes" 2 and 3) listed
  `fx-probe-agent` with `"mode":"subagent"`, `"system":"Answer
  PROBE-AGENT"`, `"description":"probe"` and exactly the permissions set
  (`* * deny`, `read * allow`, `shell * allow`), plus the `skill fx-audit
  deny` rule added in question 11. Other entries: `build`, `compaction`,
  `explore`, `general`, `plan`, `summary`, `title`.
- Timing: the first `opencode debug agents` in the scratch environment
  failed after 2 min 0.09 s because the default service port was taken;
  after `service set port 49777` it took 0.44 s cold and 0.07 s warm.

Verdict: proven: `update` creates a missing id from the defaults above, the
callback's assignments replace the defaults, and `opencode debug agents` lists
the agent with those permissions.

## 7. Skills

fx's 17 `skills/` entries symlinked into `<H>/xdg/opencode/skills/`;
`opencode.json` held `"permissions": [{ "action": "skill", "resource":
"fx-audit", "effect": "deny" }]`.

- `opencode api skill.list` (warm service) returned `{"location":
  {"directory":...},"data":[...]}` with 19 entries: all 17 fx skills
  (`fx-audit`, `fx-critique`, `fx-grill`, `fx-handoff`, `fx-setup` included)
  plus the built-ins `opencode` and `report`. Each entry has `id`, `name`,
  `description`, `path` and `content`. **`fx-audit` is listed, not hidden and
  not marked denied**: the API is unfiltered.
- `opencode api --standalone skill.list` returned `data: []` on three tries
  (race, "Changes" 3).
- What the model sees: with the rule in place, a run asking "List the exact
  names of every skill available to you through your skill tool" returned
  `fx-architecture, fx-authoring, fx-brainstorm, fx-critique, fx-debug,
  fx-design, fx-grill, fx-handoff, fx-humanize, fx-implement, fx-plan,
  fx-review, fx-setup, fx-tdd, OpenCode, prototype, Report, research`:
  `fx-audit` absent. `debug agents` showed **no** skill rule on any agent in
  that run, so the global `permissions` rule filters the model's list without
  being copied into the agents' rule lists.
- fx's `disable-model-invocation: true` frontmatter is not read by v2
  (`fx-critique` and the other user-invoked lanes are listed to the model).
  v2 reads `metadata: { opencode/autoinvoke }` instead
  (`core/src/config/plugin/skill-file.ts`).

Verdict: proven: a global `permissions` skill-deny rule hides a skill from the
model's skill list, but `skill.list` lists every skill unfiltered, so it
cannot prove hiding. (Note: a global `permissions` key is fatal to OpenCode
1.x, so the installer must not write it, as the design says.)

## 8. Commands

- A file `<H>/xdg/opencode/commands/fx-probe.md` with `description: probe md
  command` and the body `Reply with PROBE-MD and $ARGUMENTS` appeared in
  `opencode api command.list` (added while the service ran, picked up by the
  watcher): `{"name":"fx-probe","description":"probe md command"}`. The list
  also held the built-ins `init` and `review`. Invoked through
  `session.command` with text `world`, the user message was `Reply with
  PROBE-MD and world` and the model replied `PROBE-MD\nworld`.
- The plugin command (`ctx.command.transform(ed => ed.add({ name:
  'fx-probe-cmd', description: 'probe', execute }))`) appeared in the list as
  `{"name":"fx-probe-cmd","description":"probe"}`.
- Invocation: `opencode run` has no command flag and `opencode run
  "/fx-probe-cmd hello2"` sends the literal text (the model went exploring
  files, no `execute` call, killed at the 150 s timeout). The working route
  is the API: `opencode api session.create -d '{"location":{"directory":
  "<dir>"},"agent":"build"}'`, then `opencode api session.command --param
  sessionID=<id> -d '{"name":"fx-probe-cmd","text":"hello"}'` (HTTP 204).
- `execute` received exactly
  `{"sessionID":"ses_f0b7f16b...","prompt":{"text":"hello"},"delivery":"steer"}`:
  `input.sessionID`, `input.prompt.text` (the raw arguments, no `$ARGUMENTS`
  expansion for a plugin command) and `input.delivery`; no other keys.
- `ctx.session.prompt({ sessionID: input.sessionID, text: '...' })` delivered:
  it returned `{"id":"msg_...","type":"user","payload":{"text":"Reply with
  PROBE-CMD and hello"},"delivery":"steer"}`, and ten seconds later the
  session's last assistant text was `PROBE-CMD\nhello`, in the same session.
  The `prompt` argument is flat (`text`, optional `files`, `agents`,
  `skills`), not `{ prompt: { text } }`. `ctx.session.command` was not needed.

Verdict: proven: a Markdown command and a `command.transform` command both
list; `execute` gets `{ sessionID, prompt: { text }, delivery }`, and
`ctx.session.prompt({ sessionID, text })` delivers the template in the same
session, which the model answers with `PROBE-CMD` and `hello`. A user reaches
either only through the API or the TUI, not `opencode run`.

## 9. Depth

`subagent` tool source: `limit = experimental.subagent_depth ?? 1`; refuses
when `depth >= limit`. The built-in `general` and `explore` subagents carry
`subagent * deny`, so they cannot test depth (first attempt: `general`
reported "no subagent tool exists", identical with and without the option).
The test used the plugin's `fx-probe-agent` with `* * allow`:
`build` dispatches `fx-probe-agent`, which dispatches `explore`.

- No config: the nested call failed with `{"error":{"type":"tool.execution",
  "message":"Subagent depth limit reached (1). Increase
  \"experimental.subagent_depth\" to allow nested subagents."}}`.
- `"experimental": { "subagent_depth": 2 }`: the nested call succeeded;
  `explore` returned `DEEPOK`; `EXEC-BEFORE subagent ... fx-probe-agent`
  and `EXEC-AFTER ... completed` for both levels.
- Top-level `"subagent_depth": 2`: the same "depth limit reached (1)" error.
  `opencode debug config` printed the document without the key (only
  `$schema` and `model`), so it is dropped, as the source says
  (`core/src/config/normalize.ts:46`).

Verdict: proven: `experimental.subagent_depth: 2` lets a subagent dispatch a
subagent (when that agent allows `subagent`), and the top-level key is
dropped.

## 10. Run output

`opencode run --standalone --format json "<prompt>" </dev/null`: one JSON
object per line, each `{ type, timestamp, sessionID, part }`. Across 8
captured runs (50 lines):

| `type` | `part` keys | Notes |
| --- | --- | --- |
| `step_start` | `id messageID sessionID snapshot type("step-start")` | one per model step |
| `text` | `id messageID sessionID text time type("text")` | assistant text, complete (not streamed in pieces) |
| `tool_use` | `id messageID partID sessionID state tool type` | only when the call has finished; no "running" line |
| `step_finish` | `id messageID sessionID reason snapshot cost tokens type("step-finish")` | `reason: "tool-calls"` or a stop reason; `tokens` = `{input, output, reasoning, cache:{read,write}}` |
| `error` | top level `{ type, timestamp, sessionID, error:{type, message} }` | seen once: `Transport: The socket connection was closed unexpectedly` |

- `tool_use.part.tool` is the tool id (`shell`, `subagent`, `read`).
  `part.state` is `{ status: "completed", input, output, title, metadata,
  time }` or `{ status: "error", input, error, metadata, time }` (`error` is
  the message string, e.g. `probe refused`, `Blocked by configuration
  policy`, `probe threw`).
- Shell input is `state.input.command`; output is `state.output` (text) with
  `state.metadata.metadata.exit`.
- Subagent dispatch is one `tool_use` with `tool: "subagent"`, `state.input`
  `{ agent, description, prompt }` and `state.output` the string
  `<subagent sessionID="ses_..." state="completed">\n<answer>\n</subagent>`;
  the child session id is also at `state.metadata.metadata.sessionID`. **The
  child's own tool calls do not appear in the parent's stream** (a
  subagent's blocked `git push` was visible only through its report).
- The final text is the last `text` line. `sessionID` is the same on every
  line of a run.
- Events in a session's `opencode session export <id> --standalone`
  (`opencode export <id>` is gone; `export` now reads as a directory
  argument and prints the top-level help): `{ info, messages }`;
  `info` has `id projectID cost tokens outcome time title location`;
  `messages` holds `user` (`text files`), `assistant` (`agent model content
  snapshot finish rawFinish cost tokens`; `content` parts of type
  `reasoning`, `text`, `tool` with `id name state`) and `idle` (`outcome`).
  `opencode session` also has `list`, `delete`, `import`.

Verdict: proven: the `--format json` line shapes above are stable across
shell, subagent, denied and policy-blocked calls; `opencode export` is
replaced by `opencode session export`.

## 11. Transform order

Plugin `ctx.agent.transform` logged `editor.list().map(a => a.id)` and pushed
`{ action: 'skill', resource: 'fx-audit', effect: 'deny' }` onto every listed
agent. `opencode.json` held `agents.probe-user` (`description`, `mode:
'primary'`, `system`).

- The list in the transform: `["build","general","explore","compaction",
  "title","summary","plan"]` (plus `fx-probe-agent` after the plugin's own
  `update`). **`probe-user` is not in the list**; the built-in primaries and
  subagents are.
- `opencode debug agents` (warm): `build`, `compaction`, `explore`,
  `fx-probe-agent`, `general`, `plan`, `summary`, `title` each carry `skill
  fx-audit deny`; **`probe-user` exists (`mode: primary`, `system: "You are
  probe-user. Be terse."`) with no skill rule**.
- The model's view, same prompt for both (`opencode run --agent <id>`):
  `--agent build` listed 18 skills without `fx-audit`; `--agent probe-user`
  listed 19 skills **with** `fx-audit`.

Verdict: disproven: a config-defined agent is applied after plugin
transforms, so `ctx.agent.transform` neither lists it nor adds the deny rule
to it, and it still sees `fx-audit`. Task 04's hiding covers the built-ins and
fx's own agents only; the `evaluate` backstop rejects a call but hides
nothing, and ADR-0026 must state the gap.
