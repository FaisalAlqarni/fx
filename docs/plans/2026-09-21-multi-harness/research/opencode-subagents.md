# opencode subagents: task tool, depth, and plugin hooks

Scope: how the built-in `task` tool is granted to or withheld from
subagents, whether a depth limit is real, how a plugin can define an
agent with `task` access, how `edit: deny` interacts with `bash`, and
whether the calling agent's identity reaches `tool.execute.before`.

Installed CLI: `opencode --version` reports **1.18.25**
(`/home/faisal/.opencode/bin/opencode`). Source used for file citations:
a fresh clone of `https://github.com/sst/opencode` into a `mktemp -d`
scratch directory, HEAD at commit `70a24697ea0028e19f22712fd63059538cb4bee7`,
package version **1.18.31**. Same minor line as the installed CLI (1.18.x);
the seven-patch gap between 1.18.25 and 1.18.31 did not touch any file
cited below (checked with `git log` on each path against that range).

## Part 1: everything below is the engine the installed 1.18.25 CLI runs

Every claim in sections 1 through 5 is read from files under
`packages/opencode/src/` and `packages/plugin/src/index.ts` (the v1 plugin
API), and matches what `1.18.25` executes. Where opencode's v2 docs
describe something different, that is called out separately in its own
section below, with the file evidence for why v2 is not yet what ships.

### 1. How the `task` tool is granted to or withheld from a subagent

Two independent things have to line up: the tool must be visible to the
model, and the spawned child session's own permission ruleset must not
carry a `task: deny *` rule.

Visibility and the deny rule both come from `deriveSubagentSessionPermission`
in `packages/opencode/src/agent/subagent-permissions.ts`:

```ts
export function deriveSubagentSessionPermission(input: {
  parentSessionPermission: PermissionV1.Ruleset
  subagent: Agent.Info
}): PermissionV1.Ruleset {
  const canTask = input.subagent.permission.some((rule) => rule.permission === "task")
  const canTodo = input.subagent.permission.some((rule) => rule.permission === "todowrite")
  return [
    ...input.parentSessionPermission.filter(
      (rule) => rule.permission === "external_directory" || rule.action === "deny",
    ),
    ...(canTodo ? [] : [{ permission: "todowrite" as const, pattern: "*" as const, action: "deny" as const }]),
    ...(canTask ? [] : [{ permission: "task" as const, pattern: "*" as const, action: "deny" as const }]),
  ]
}
```

The `canTask` check is an exact match on `rule.permission === "task"`. It
is not wildcard-aware. Every agent (including built-in `general`) inherits
a base `defaults` ruleset in `packages/opencode/src/agent/agent.ts`
(around line 119 in that file) that includes `{ permission: "*", pattern: "*", action: "allow" }`.
That wildcard rule does not satisfy the exact-match `canTask` check
because its `permission` field is the literal string `"*"`, not `"task"`.
So unless an agent's own config adds a rule whose `permission` field is
literally `"task"`, `canTask` is false and a `task: deny *` rule gets
injected into that agent's spawned session.

The built-in `general` agent's definition (same file, lines 182 to 195 inclusive)
confirms this is deliberate:

```ts
general: {
  name: "general",
  description: `General-purpose agent for researching complex questions and executing multi-step tasks. ...`,
  permission: Permission.merge(
    defaults,
    Permission.fromConfig({
      todowrite: "deny",
    }),
    user,
  ),
  options: {},
  mode: "subagent",
  native: true,
},
```

No `task` entry. This is exactly why the measured behavior (`general`
exposing `bash, edit, glob, grep, read, skill, webfetch, write` and no
`task`) happens: the child session created for it in
`packages/opencode/src/tool/task.ts` (lines 139 to 172 inclusive) merges in the
injected `task: deny *` rule, and that deny is then enforced by
`Permission.disabled()` / `Permission.visibleTools()` in
`packages/opencode/src/permission/index.ts` (lines 204 to 219 inclusive), which hides
any tool whose last-matching rule is `pattern === "*"` and
`action === "deny"`.

`task.ts` (lines 143 to 155 inclusive) additionally injects the same style of deny for
`todowrite` and for any tool named in `cfg.experimental.primary_tools`,
using the identical exact-match-on-own-permission check.

### 2. Is `subagent_depth` real, and what does it control

Yes, real, and read directly, in `packages/opencode/src/tool/task.ts`
(lines 104 to 117 inclusive):

```ts
const parent = yield* sessions.get(ctx.sessionID)
let current = parent
let depth = 0
while (current.parentID) {
  depth++
  current = yield* sessions.get(current.parentID)
}
if (depth >= (cfg.subagent_depth ?? 1)) {
  return yield* Effect.fail(
    new Error(
      `Subagent depth limit reached (${cfg.subagent_depth ?? 1}). Increase "subagent_depth" to allow nested subagents.`,
    ),
  )
}
```

`subagent_depth` is a config value, default 1, and it counts parent
sessions by walking `session.parentID` up to the root. A primary session
is depth 0, so it can call `task`, since 0 is less than 1. The session `task`
spawns for it has `parentID` set to the primary session, so when that
child session itself calls `task`, its own depth computes to 1, and
`1 >= 1` fails the check regardless of the deny-rule mechanism in section 1.

This is why raising `subagent_depth` to 2 alone does not let a `general`
subagent spawn a further subagent: the depth check in `task.ts` runs
after the permission gate. If `general`'s own session already carries a
`task: deny *` rule (section 1 above), the model never even sees the `task`
tool as available, so the depth check is never reached. `subagent_depth`
only raises the ceiling on how many *nested* `task` calls are allowed
once a chain of agents each individually has `task` permission; it does
not itself grant `task` to an agent that otherwise lacks it.

### 3. Granting `task` to a custom agent via a plugin's `config` hook

The v1 plugin hook signature, `packages/plugin/src/index.ts`, around line 225:

```ts
config?: (input: Config) => Promise<void>
```

`Config` (same file, around line seventy) is `Omit<SDKConfig, "plugin"> & {...}`, which
includes the same `agent` map that `opencode.json` populates. The hook
receives the config object and mutates it in place (return type is
`void`); this is the standard mutation-hook pattern used throughout this
file (`chat.params`, `chat.headers`, etc. all follow the same shape).

The per-agent schema in `packages/core/src/v1/config/agent.ts` (lines
12 to 41, normalized at lines 62 to 81 inclusive) accepts either the modern `permission`
field or the deprecated `tools` boolean map, and `normalize()` converts
`tools` entries into `permission` entries (`write`/`edit`/`patch` all
collapse to the single `edit` permission key; everything else maps
one-to-one, including `task`).

So a plugin's `config` hook can grant `task` to a custom subagent either
way:

```ts
export default {
  config: async (input) => {
    input.agent ??= {}
    input.agent.myResearcher = {
      description: "Can dispatch further subagents",
      mode: "subagent",
      permission: { task: "allow" },
      // or, equivalently, the deprecated form:
      // tools: { task: true },
    }
  },
}
```

Because `canTask` in section 1 only requires an exact `permission: "task"`
entry to exist in the agent's own ruleset, either form works; what matters
is that the entry's `permission` field is literally `"task"`, not a
wildcard.

### 4. `edit: deny` and `bash`

They are enforced independently and do not interact. `packages/opencode/src/tool/shell.ts`
gates itself entirely on its own permission key:

```ts
yield* ctx.ask({
  permission: "external_directory",
  ...
})
...
yield* ctx.ask({
  permission: ShellID.ToolID, // "bash"
  ...
})
```

There is no reference to `"edit"` anywhere in `shell.ts`. A ruleset with
`edit: deny` for all patterns has no effect on whether `bash` is offered
or allowed; a shell command that writes or edits a file is governed
solely by the `bash` permission rule (optionally narrowed per command
prefix via `packages/opencode/src/permission/arity.ts`, which maps
command prefixes like `git checkout` to a matchable pattern token so
`bash` permission rules can be scoped per subcommand). Denying `edit`
without also constraining `bash` leaves file writes reachable through
shell commands.

### 5. Does the calling agent's identity reach `tool.execute.before`

No, not directly. The hook's input type, `packages/plugin/src/index.ts`
(lines 265 to 269 inclusive):

```ts
"tool.execute.before"?: (
  input: { tool: string; sessionID: string; callID: string },
  output: { args: any },
) => Promise<void>
```

Only `tool`, `sessionID`, and `callID`. Compare to `chat.params` and
`chat.headers` in the same file, whose input explicitly includes
`agent: string`. `tool.execute.before` carries no such field. The call
site for the `task` tool specifically, `packages/opencode/src/session/prompt.ts`
(around line 308 in that file), confirms the trigger is invoked with exactly that
shape:

```ts
yield* plugin.trigger(
  "tool.execute.before",
  { tool: TaskTool.id, sessionID, callID: part.id },
  { args: taskArgs },
)
```

A plugin can still recover the calling agent indirectly, since the
session object created for that `sessionID` carries an `agent` field
(set at session creation in `task.ts`, `agent: next.name`), so a hook
implementation that looks up the session by `sessionID` can learn which
agent it belongs to. But the hook does not hand that identity over
directly; the plugin has to go fetch it.

## Part 2: opencode's v2 docs describe a different, partly-unshipped system

The coordinator asked me to read `opencode.ai/v2/docs/{agents,skills,commands,plugins,references,tools,mcp-servers}/`.
Fetched all seven. Two of them (`plugins`, `references`) do not cover the
topics asked about at all (`plugins` covers discovery/reload/CLI usage,
not hooks; `references` covers the unrelated "References" file-catalog
feature). The other five give a clear, consistent picture that V2 is a
real, in-progress redesign, not just new wording for the same mechanism,
and it is not what `1.18.25` runs by default.

### What V2 docs say, versus what section 1-5 found

- **Permission model is renamed and restructured.** `opencode.ai/v2/docs/agents/`
  describes permission rules as `{ action, resource, effect }` triples
  (example quoted from the page: `{ "action": "edit", "resource": "*", "effect": "deny" }`),
  not the 1.x `{ permission, pattern, action }` triples used throughout
  section 1-5. `opencode.ai/v2/docs/tools/` names the subagent-dispatch
  permission action `subagent`, not `task`, and states outright: `"permission: `subagent` with the selected agent ID as its resource."`
  This is the same underlying concept as the v1 `task` permission checked
  in section 1, under a new name and a new rule shape.
- **Depth limit is the same default, same knob, new location.**
  `opencode.ai/v2/docs/tools/` states: `"the default nesting depth is one."`
  That is the same default as `cfg.subagent_depth ?? 1` in section 2, just
  documented under the V2 permission/tools model instead of the config
  field name.
- **`edit`/`bash` independence carries over.** The V2 tools page describes
  `shell` and `edit` as governed by separate permission actions
  (`"permission: `shell` with each scanner-produced command as its resource"`
  vs `"permission: `edit` with the target path as its resource"`), with no
  documented interaction between them, matching section 4 exactly.
- **Per-agent `permission`/`tools` config fields are explicitly deprecated
  in V2.** `opencode.ai/v2/docs/agents/` states: `"Do not use legacy
  top-level fields such as `temperature`, `top_p`, `prompt`, `permission`,
  `tools`, `disable`, or `maxSteps` in new V2 agent configuration."` and
  separately: `"The V2 session runner preserves these values but does not
  yet send them with model requests."` So in V2, an agent is not expected
  to carry its own `permission`/`tools` map the way section 1 and 3
  describe; permission becomes a separate policy layer referencing agent
  IDs as `resource` values.
- **Skills and commands gain plugin-facing registration paths that v1's
  generic `config` hook does not have a comparable name for.**
  `opencode.ai/v2/docs/skills/` documents an HTTP-catalog mechanism
  (`"An HTTP catalog is a base URL with an `index.json` file"`, with a
  `version` field to bust the cache) in addition to filesystem discovery,
  and says the `skills` array in `opencode.json`/`opencode.jsonc` is how
  more sources, local or HTTP, get added. `opencode.ai/v2/docs/commands/`
  documents only file-based (`commands/*.md`) and config-based
  (`commands` key in `opencode.json`/`opencode.jsonc`) discovery; the page
  states no plugin-driven registration path for commands specifically.
  `opencode.ai/v2/docs/mcp-servers/` does not connect MCP servers to
  plugins or to the subagent/task system at all; it only describes MCP as
  a tool source, unrelated to agent dispatch.

### Is V2 real code, or just docs for something unreleased

Both, at different levels of readiness, all inside the same clone used for
Part 1 (same commit, same 1.18.31 tree):

- `packages/opencode/src/config/v2-compat.ts` and
  `packages/opencode/test/config/v2-compat.test.ts` exist and are wired
  in: `packages/opencode/src/config/config.ts` calls
  `ConfigV2Compat.lower(normalizeLoadedConfig(input), source)` when
  loading config (around line one eighty-nine) and again near line six sixty-five. `lower` converts a
  V2-shaped config down into the V1 schema (`ConfigParse.schema(ConfigV1.Info, ...)`)
  that the rest of the 1.18.x engine actually runs on. So `1.18.25` can
  already *parse* some V2-style config syntax, but only by translating it
  back into the same v1 permission/agent model documented in section 1-5;
  the engine itself is unmodified.
- The V2 Agent schema inside that compat layer
  (`packages/opencode/src/config/v2-compat.ts`, around line 63 in that file) has no
  `permission` or `tools` field at all: `model`, `request`, `system`,
  `description`, `mode`, `hidden`, `color`, `steps`, `disabled`. This
  matches the docs' claim that those fields are legacy-only in V2 syntax.
- A parallel, more complete V2 plugin SDK already exists as source, under
  `packages/plugin/src/v2/{effect,promise}/`, including
  `packages/plugin/src/v2/effect/agent.ts`:

  ```ts
  export interface AgentDraft {
    list(): readonly AgentV2Info[]
    get(id: string): AgentV2Info | undefined
    default(id: string | undefined): void
    update(id: string, update: (agent: AgentV2Info) => void): void
    remove(id: string): void
  }

  export type AgentHooks = Hooks<{
    transform: AgentDraft
  }>
  ```

  This is a structurally different plugin API for agents than the v1
  `config?: (input: Config) => Promise<void>` mutation hook in section 3:
  instead of mutating a plain object, a V2 plugin gets a `transform` hook
  handed an `AgentDraft` with `list`/`get`/`update`/`remove` methods.
  Searching the running engine (`packages/opencode/src/`) for consumers of
  this V2 plugin agent API found none beyond one unrelated reference-catalog
  wait call (`PluginV2.Service` in `packages/opencode/src/agent/agent.ts`);
  the `AgentHooks`/`transform` mechanism itself is not called from
  anywhere in `packages/opencode/src`. It is real, checked-in code, but it
  is not yet the live path a running `1.18.25` server exercises.

### Net: which claims hold for installed `1.18.25`

Every specific number and mechanism in section 1 through 5 (the exact-match
`canTask` check, the `subagent_depth` default of 1, the `bash`/`edit`
independence, the `tool.execute.before` input shape, the v1 `config` hook
signature) is what `1.18.25` actually runs, unchanged, since none of the
files it depends on differ between 1.18.25 and the 1.18.31 clone.

The V2 docs describe the intended replacement for the permission-naming
and plugin-agent-registration parts of that system (`task` to `subagent`
naming for the dispatch action, `permission`/`tools` moving off the
per-agent config object and onto a separate action/resource/effect policy
layer, and a typed `AgentDraft`/`transform` hook replacing the generic
`config` mutation hook for agent registration). Concretely present in the
1.18.31 tree as a config-parsing compatibility shim
(`v2-compat.ts`, config only, lowers to v1 before anything runs) and as an
unwired plugin SDK (`packages/plugin/src/v2/`, no runtime consumer found).
Nothing under `packages/opencode/src/agent`, `.../tool/task.ts`,
`.../permission`, or the v1 `packages/plugin/src/index.ts` hook surface
has been replaced. There is no flag found in this tree, and none
documented, that switches a running `1.18.25` server onto the V2 engine;
the V2 docs appear to describe a forward-looking target that the config
layer is already partway through accepting, while the runtime is still
entirely V1.

**Upgrade path, if planning against V2:** do not build a plugin today that
relies on the `AgentDraft`/`transform` hook from `packages/plugin/src/v2/effect/agent.ts`;
it has no running consumer in `1.18.25`/`1.18.31`. Do not write a V2-style
`{ action, resource, effect }` permission block expecting it to gate tool
visibility; only the V1 `{ permission, pattern, action }` shape, and the
`config` object it lives on, is enforced today (`v2-compat.ts` only lowers
config *shape*, it does not change what the engine checks). When V2 ships
for real, expect a rename of the `task` permission key to `subagent` and a
move of permission definitions off the agent object; a plugin's `config`
hook mutating `input.agent.foo.permission.task` (section 3 above) is the correct
integration point for `1.18.x` today, and is expected to need a rewrite
once the `AgentHooks.transform` path goes live, since V2 agent config
carries no `permission` field at all.

## Answers

1. **Task tool grant/withhold**: an exact-match check
   (`rule.permission === "task"`) on the subagent's own static permission
   list; missing that exact entry causes a `task: deny *` rule to be
   injected into its spawned session, hiding the tool. A bare `"*": "allow"`
   default does not satisfy the check.
2. **`subagent_depth`**: real, a config value defaulting to 1, enforced by
   walking `session.parentID` in `task.ts`; it caps how many levels of
   already-permitted `task` calls can nest, but does not itself grant the
   tool to an agent whose own permission lacks `task`.
3. **Plugin granting `task` via `config` hook**: mutate `input.agent.<name>.permission.task = "allow"`
   (or the deprecated `tools: { task: true }`, which `normalize()`
   converts to the same permission entry) inside the plugin's
   `config?: (input: Config) => Promise<void>` hook.
4. **`edit: deny` vs `bash`**: independent; `shell.ts` only checks its own
   `bash` permission key, never `edit`, so file writes via shell commands
   are unaffected by an `edit: deny` rule.
5. **Agent identity in `tool.execute.before`**: not included in the hook's
   input (`{ tool, sessionID, callID }` only); a plugin must look up the
   session by `sessionID` to learn which agent is calling.
6. **v2 docs vs installed 1.18.25**: the naming, permission shape, and
   plugin agent-registration API described at `opencode.ai/v2/docs/` are a
   different, largely unwired system. Installed `1.18.25` runs the v1
   mechanics in section 1 through 5 exclusively; only a config-shape
   compatibility layer for V2 syntax exists in the shipped engine today.

## What this means for a plugin

- To let a custom subagent dispatch further subagents on `1.18.x` today,
  its agent config must include an explicit `permission: { task: "allow" }`
  (or `tools: { task: true }`) entry; inheriting the global `"*": "allow"`
  default is not enough, by design (`subagent-permissions.ts`'s exact-match
  check).
- Raising `subagent_depth` alone does nothing for an agent that lacks
  `task` permission; the two gates are independent and the permission gate
  is checked first (the tool is not even visible to the model without it).
  A plugin that wants nested dispatch needs both: a `task` permission
  grant on every agent in the chain, and a `subagent_depth` high enough
  for the intended nesting.
- Do not rely on `edit: deny` to stop a subagent from modifying files; it
  does not constrain `bash`. An agent meant to be read-only needs an
  explicit `bash: deny` (or a narrow allow-list via the command-prefix
  patterns in `permission/arity.ts`), not just an `edit` restriction.
- A `tool.execute.before` plugin hook that needs to know which agent
  triggered a tool call has to resolve `sessionID` to the session's
  `agent` field itself; do not assume the hook input carries that
  identity.
- Building against opencode's v2 docs today would target a system that is
  only partially present in the shipped 1.18.x engine. The safe integration
  surface for a plugin right now is the v1 API in section 1 through 5
  (`config` hook, `{ permission, pattern, action }` rulesets, `task` as
  the permission name). Revisit once `packages/plugin/src/v2/` gains a
  runtime consumer in `packages/opencode/src`, which as of this commit it
  does not.
