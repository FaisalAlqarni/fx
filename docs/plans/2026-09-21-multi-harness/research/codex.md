# Codex CLI 0.155.1: plugins, hooks, subagents, skills

Research date: 2026-09-21. Local binary: `codex-cli 0.155.1`.

## Sources and method

- Source: `github.com/openai/codex`, tag `rust-v0.155.1`, commit `be2951ea34f0d295ed0becf97079f92fa5f6950e`. This is the newest release tag. `origin/main` was at `6149914a0e59363b6777080b3e953b05d592dbac` on the research date, 513 commits ahead of the tag.
- Every source link below is pinned to the tag. `SRC` means `https://github.com/openai/codex/blob/rust-v0.155.1/codex-rs/`.
- Docs: `https://developers.openai.com/codex/hooks` now redirects with a 308 to `https://learn.chatgpt.com/docs/hooks`. `https://developers.openai.com/codex/subagents` redirects to `https://learn.chatgpt.com/docs/agent-configuration/subagents`. Both were read on 2026-09-21 and are unversioned.
- No Codex session was started. The facts come from reading the Rust source and `codex --help`.
- Where source and docs disagree, source wins, and the text says so.

## 1. Plugin hooks discovery

### Which file, and the precedence

`load_plugin_hooks` picks exactly one of three sources. The choice depends on the manifest `hooks` key.

- The manifest has `hooks` as a string or a string array. Codex loads each listed file, and only those files.
- The manifest has `hooks` as an inline object or an array of objects. Codex uses the inline hooks, and only those.
- The manifest has no `hooks` key. Codex loads `hooks/hooks.json` if that file exists.

Citations: `SRC/core-plugins/src/loader.rs` line `L69` defines `DEFAULT_HOOKS_CONFIG_FILE: &str = "hooks/hooks.json"`. The function at lines `L1187-L1244` has the comment "Discover plugin-bundled hooks from manifest `hooks` entries when present ... otherwise from the default `hooks/hooks.json` file". Its `None =>` arm is the only place the default path is read.

The docs agree: "Default location: `hooks/hooks.json` inside the plugin root", and "a `hooks` entry in `.codex-plugin/plugin.json` that specifies custom paths or inline hook objects" (learn.chatgpt.com/docs/hooks).

### The measured behavior

Confirmed. Codex 0.155.1 loads `hooks/hooks.json` and ignores a root `hooks.json`. No code path in plugin loading probes `<plugin_root>/hooks.json`. The only `join("hooks.json")` in hook discovery is `load_hooks_json` in `SRC/hooks/src/engine/discovery.rs`. It reads `hooks.json` from a config layer folder, meaning `CODEX_HOME` or a project `.codex/`, and never a plugin root.

A root `hooks.json` loads only when the manifest names it explicitly as `"hooks": "./hooks.json"`. A unit test fixture in `SRC/core-plugins/src/manifest.rs` near line `L982` uses that exact form.

### Manifest path rules

`resolve_manifest_path` in `SRC/core-plugins/src/manifest.rs`, lines `L597-L640`, enforces these rules:

- The path must start with `./`. Otherwise Codex logs "path must start with `./` relative to plugin root" and drops it.
- `./` alone is rejected.
- Any `..` component is rejected.

An invalid `hooks` value type is ignored with a warning, lines `L436-L441`.

### Replace or merge

A manifest `hooks` key replaces the default. It never merges with `hooks/hooks.json`. The three arms of the `match` in `load_plugin_hooks` are exclusive. A manifest listing several paths merges those listed files with each other, one `PluginHookSource` per file.

### Which manifest Codex reads

`DISCOVERABLE_PLUGIN_MANIFEST_PATHS` in `SRC/exec-server-protocol/src/protocol.rs`, lines `L46-L51`, lists these paths in order: `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`. A root `plugin.json` wins before that list, but only when its `$schema` is an Agent Plugins schema URI (`SRC/utils/plugins/src/plugin_namespace.rs`, lines `L11-L60`). So Codex can read a Claude Code manifest when no `.codex-plugin/plugin.json` exists. The `RawPluginManifest` struct, `SRC/core-plugins/src/manifest.rs` lines `L45-L68`, accepts only `name`, `version`, `description`, `keywords`, `skills`, `mcpServers`, `apps`, `hooks` and `interface`. It has no `agents` key and no `commands` key in this struct.

### Plugin root variable expansion

`append_plugin_hook_sources` in `SRC/hooks/src/engine/discovery.rs`, lines `L243-L292`, builds an env map with four keys:

- `PLUGIN_ROOT` and `CLAUDE_PLUGIN_ROOT`, both set to the plugin root. The source comment says "For OOTB compat with existing plugins that use this env var."
- `PLUGIN_DATA` and `CLAUDE_PLUGIN_DATA`, both set to the plugin data root.

Codex uses that map in two ways.

- Textual substitution: line `L568` replaces each literal `${KEY}` in the command string with its value before the command runs. This covers `${CLAUDE_PLUGIN_ROOT}`, `${PLUGIN_ROOT}`, `${PLUGIN_DATA}` and `${CLAUDE_PLUGIN_DATA}`. The bare form `$CLAUDE_PLUGIN_ROOT` is not substituted.
- Process env: the same map goes into the child environment, `SRC/hooks/src/engine/command_runner.rs` line `L430`. So `$CLAUDE_PLUGIN_ROOT` also works when the shell expands it.

Source and docs disagree here. The docs list only `PLUGIN_ROOT` and `PLUGIN_DATA`. The source also sets the `CLAUDE_` aliases.

The command runs through the user's `$SHELL -lc` on Unix, or `COMSPEC /C` on Windows. The environment is cleared first and then replayed from the environment Codex captured at session start. See `default_shell_command` and `build_command`, `command_runner.rs` lines `L400-L460`. A `command_windows` field overrides `command` on Windows, `discovery.rs` near line `L508`.

### Trust gate and feature flags

Plugin hooks are not managed hooks. They run only when the user has trusted that exact hook, or when Codex runs with `--dangerously-bypass-hook-trust`. See `hook_trust_status` and the push condition in `discovery.rs`, lines `L713-L733`. The docs say the same: "Before a non-managed hook can run, Codex requires you to review and trust the exact hook definition", managed through `/hooks`. A changed hook definition becomes `Modified` and stops running until it is trusted again, because the trust hash covers the normalized handler.

The `hooks` feature is Stable and on by default. The old `plugin_hooks` flag is `Removed` (`SRC/features/src/lib.rs`, lines `L1171-L1175` and `L1395-L1399`).

Handler types: `command` and `mcp_tool` run. `prompt` and `agent` handlers are skipped with "not supported yet" (`discovery.rs`, lines `L598-L617`). The default timeout is 600 seconds. SessionEnd and Interrupt default to 1 second, capped at 3 (`normalize_command_hook`).

## 2. Hook payloads

### Events

`HookEventName` in `SRC/protocol/src/protocol.rs`, lines `L1584-L1597`, defines these events: `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `SubagentStart`, `SubagentStop`, `Stop`, `Interrupt`. The docs list the same twelve events.

### SessionStart stdin

`SessionStartCommandInput` in `SRC/hooks/src/schema.rs`, lines `L496-L510`, uses `deny_unknown_fields` for its schema. Its fields:

- `session_id`: string.
- `transcript_path`: a string or null.
- `cwd`: string.
- `hook_event_name`: `"SessionStart"`.
- `model`: string.
- `permission_mode`: one of `default`, `acceptEdits`, `plan`, `dontAsk` or `bypassPermissions`. In practice Codex sends only `bypassPermissions`, when approval is `never`, or `default` (`hook_permission_mode`, `SRC/core/src/hook_runtime.rs` lines `L1015-L1023`).
- `source`: one of `startup`, `resume`, `clear`, `compact` or `fork` (`schema.rs` line `L854`). The docs omit `fork`.

SessionStart has no `agent_id`, `agent_type` or `turn_id`.

SessionStart never fires inside a spawned subagent. A ThreadSpawn subagent fires `SubagentStart` on `startup` or `fork`. Other internal subagents fire neither (`run_pending_session_start_hooks`, `hook_runtime.rs` lines `L125-L176`). SubagentStart stdin carries `session_id`, `turn_id`, `transcript_path`, `cwd`, `hook_event_name`, `model`, `permission_mode`, and the required fields `agent_id` and `agent_type` (`schema.rs`, lines `L546-L562`).

### PreToolUse stdin

`PreToolUseCommandInput` in `schema.rs`, lines `L275-L296`, has these fields:

- `session_id`.
- `turn_id`. The source comment calls it a "Codex extension".
- `agent_id` and `agent_type`, both optional and omitted when absent.
- `transcript_path`, `cwd`, `hook_event_name`, `model` and `permission_mode`.
- `tool_name`, `tool_input` and `tool_use_id`.

The `tool_name` values come from `SRC/core/src/tools/hook_names.rs`:

- Shell: `"Bash"`, from `HookToolName::bash()`. The `exec_command` handler sends `tool_input` as `{"command": <cmd string>}` (`SRC/core/src/tools/handlers/unified_exec/exec_command.rs`, lines `L520-L531`). PermissionRequest for shell may add `description` (`SRC/core/src/tools/sandboxing.rs`, lines `L132-L146`).
- Patch: `"apply_patch"`. `Write` and `Edit` are matcher aliases only. The stdin name stays `apply_patch`. `tool_input` is `{"command": <raw patch text>}`, meaning the whole `*** Begin Patch ... *** End Patch` body, not file paths (`SRC/core/src/tools/handlers/apply_patch.rs`, lines `L458-L463`). A hook that wants the edited paths has to parse the `*** Add File:`, `*** Update File:` and `*** Delete File:` lines itself.
- Subagent spawn: `"spawn_agent"`, with `Agent` as a matcher alias.
- MCP tools: `mcp__<server>__<tool>`.
- Any other function tool: its flat name, with the raw JSON arguments as `tool_input` (`SRC/core/src/tools/registry.rs`, lines `L129-L138` and `L799-L808`).

### Agent identity

`agent_id` is the subagent's thread id. `agent_type` is the role name, or `"default"` when the spawn gave no role. Both are set only when the session source is `SubAgent(ThreadSpawn)` (`thread_spawn_subagent_hook_context` and `subagent_hook_context`, `hook_runtime.rs` lines `L1025-L1044`). In the root session both fields are absent. PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact and UserPromptSubmit all carry them.

### Output contract

Codex reads stdout on exit code 0.

- Empty stdout means no effect.
- JSON stdout is parsed strictly. Every output struct in `schema.rs` has `#[serde(deny_unknown_fields)]`, including `HookUniversalOutputWire` at lines `L86-L98` and `PreToolUseHookSpecificOutputWire` at lines `L240-L254`. A single unknown key makes the whole object fail to parse. Codex then records "hook returned invalid pre-tool-use JSON output" and marks the run Failed (`SRC/hooks/src/events/pre_tool_use.rs`, lines `L250-L256`). A failed run does not block.
- For SessionStart and SubagentStart, plain non-JSON stdout becomes additional context. A unit test turns `"hello from hook\n"` into the context `"hello from hook"` (`SRC/hooks/src/events/session_start.rs`, lines `L379-L401`).

The universal keys are `continue`, `stopReason`, `suppressOutput` and `systemMessage`. PreToolUse rejects `continue:false`, `stopReason` and `suppressOutput` as unsupported (`SRC/hooks/src/engine/output_parser.rs`, lines `L369-L379`).

`additionalContext` goes under `hookSpecificOutput`, together with `hookEventName`. It is accepted for PreToolUse, PostToolUse, SessionStart, UserPromptSubmit and SubagentStart (`discovery.rs`, lines `L523-L540`).

Blocking a PreToolUse call works three ways:

- `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"..."}}`. The reason must be non-empty.
- The legacy form `{"decision":"block","reason":"..."}`.
- Exit code 2 with a non-empty reason on stderr. Exit 2 with empty stderr counts as Failed and does not block.

`permissionDecision: "allow"` is accepted only together with `updatedInput`. `"ask"` is rejected as unsupported (`output_parser.rs`, lines `L121-L182` and 441 to 510; `pre_tool_use.rs` lines `L213-L292`). Any other exit code marks the run Failed and does not block, so a crashing guard fails open.

### Size limit

Injected context defaults to 2,500 approximate tokens per handler (`DEFAULT_HOOK_OUTPUT_TOKEN_LIMIT`, `SRC/hooks/src/output_spill.rs` line `L12`). Longer text is written in full to `<tmp>/hook_outputs/<thread_id>/<uuid>.txt`. The model sees a head and tail preview plus that path. A per-handler `additionalContextLimit` overrides the default, and `0` disables truncation (`maybe_spill_text_with_limit`). The docs say "Hook output limited to ~2,500 tokens; larger output spills to disk with preview."

### Telling Codex from Claude Code in one script

The hook runner injects no Codex-only env var. The child env is the captured Codex process env plus the four plugin variables (`SRC/hooks/src/registry.rs`, lines `L72-L81`; `command_runner.rs` lines `L427-L431`). `CODEX_THREAD_ID` and `CODEX_SESSION_ID` are set for model shell commands in `SRC/core/src/exec_env.rs`, not for hooks. `CODEX_MANAGED_BY_NPM` and its siblings exist only when the npm, bun or pnpm launcher started Codex (`codex-cli/bin/codex.js`, lines `L225-L238`), so they are unreliable.

The usable signals:

- `PLUGIN_ROOT` is set by Codex for plugin hooks. Claude Code sets only `CLAUDE_PLUGIN_ROOT`, and Codex sets both, so the presence of `PLUGIN_ROOT` points to Codex.
- `turn_id` on stdin for every event except SessionStart and SessionEnd. The source marks it as a Codex extension.
- `tool_name == "apply_patch"`, or a `spawn_agent` tool name, only ever comes from Codex.
- `CLAUDE_PROJECT_DIR` never appears anywhere in the Codex source tree, so its absence also points to Codex.

The most reliable option needs no detection. Point the Codex manifest at its own hooks file, as in `"hooks": "./hooks/codex.json"`, and pass an explicit flag in each command, such as `--harness codex`. Claude Code keeps reading `hooks/hooks.json`.

## 3. Subagents

### spawn_agent schema

The measured schema is correct for a setup with no custom roles. The claim "no agent-type parameter" is refuted as a general statement. The parameter exists and is hidden conditionally.

- MultiAgentV2, which is the form with `task_name` and `fork_turns`, has these properties: `message` (required), `task_name` (required), `agent_type`, `fork_turns`, `model` and `reasoning_effort`. It sets `additionalProperties: false` (`SRC/core/src/tools/handlers/multi_agents_spec.rs`, lines `L100-L140` and `L620-L660`).
- `agent_type` is removed unless `config.agent_roles` is non-empty: `expose_agent_type: !turn_context.config.agent_roles.is_empty()` (`SRC/core/src/tools/spec_plan.rs`, lines `L1306` and `L1356`). `agent_roles` holds user-defined roles only. The built-ins `default`, `explorer` and `worker` do not count.
- `model` and `reasoning_effort` are removed when `multi_agent_v2.expose_spawn_agent_model_overrides` is false. `hide_spawn_agent_metadata` removes all three.
- V1, in the `multi_agent_v1` namespace, has `message`, `items`, `agent_type`, `fork_context`, `model` and `reasoning_effort`, with the same `agent_type` gating.
- The `multi_agent_v2` feature defaults to off (`SRC/features/src/lib.rs`, lines `L1275-L1278`). Codex resolves V1 or V2 per model from the model catalog's `multi_agent_version` (`SRC/core/src/session/turn_context.rs`, lines `L1028-L1036`). The measured V2 shape means the account's model selects V2.

No newer version adds an agent-type parameter. `agent_type` already exists in the gated form at `rust-v0.148.0` and every release since, and it is absent from the spec plan at `rust-v0.140.0`. The diff from `rust-v0.155.1` to `origin/main` at `6149914a` changes no spawn parameters. It adds only a description override.

### Defining custom roles

`load_agent_roles` in `SRC/agent-roles/src/loader.rs`, lines `L23-L118`, reads two sources for every config layer.

- `[agents.<name>]` tables in `config.toml`, with the fields `description`, `config_file` and `nickname_candidates` (`SRC/config/src/config_toml.rs`, lines `L704-L730`).
- Every `*.toml` file under `<layer config folder>/agents/`, searched recursively (`SRC/agent-roles/src/discovery.rs`). In practice that means `$CODEX_HOME/agents/` and a project `.codex/agents/`.

A role file needs `name`, `description` and a non-blank `developer_instructions`. Any other `config.toml` key is accepted at parse time (`SRC/agent-roles/src/agent_role_config.rs`). Later layers override earlier ones, and missing fields merge from lower layers.

Plugins cannot ship roles in 0.155.1. The manifest has no agents key, and role discovery reads only config layer folders.

### Dispatching a named role

The model passes `agent_type: "<name>"` to `spawn_agent`, and only when the parameter is exposed. The tool description lists the "Available roles" with their descriptions (`spawn_tool_spec::build`, `SRC/core/src/agent/role.rs`). An unknown name returns `unknown agent_type '<name>'`.

There is one trap. V2's `fork_turns` defaults to `all`, a full-history fork, and a full-history fork applies a role only when `agent_type` is given explicitly (`SRC/core/src/tools/handlers/multi_agents_v2/spawn.rs`, lines `L134-L141`). A configured `[agents.default]` with a `config_file` applies to spawns that are not full forks.

### Making a subagent read-only

Source and docs disagree here, and source wins.

The docs say: "For read-only agents, set `sandbox_mode = "read-only"`", and they list `sandbox_mode` and `mcp_servers` as supported role keys (learn.chatgpt.com/docs/agent-configuration/subagents).

In the 0.155.1 source, `apply_role_to_config_inner` copies only a fixed set of keys out of the role file: `developer_instructions`, `model`, `model_reasoning_effort`, `model_reasoning_summary`, `model_verbosity`, `personality`, `service_tier`, feature disables, and skill disables (`AgentRoleOverrides`, `role.rs` lines `L37-L128`). The module header says roles "may customize the child or reduce its capabilities, but never replace the parent session's authority". After the role is applied, `apply_spawn_agent_runtime_overrides` overwrites the approval policy, cwd and permission profile from the parent turn (`SRC/core/src/tools/handlers/multi_agents_common.rs`, lines `L238-L265`; called at `spawn.rs` line `L145`). So `sandbox_mode` in a role file has no effect on the child's sandbox in 0.155.1.

What a role can do:

- Disable features, and only the ones in this allowlist: `shell_tool`, `apps`, `personality`, `plugins`, `memory_tool` and `request_permissions_tool` (`role.rs`, lines `L91-L105`). Disabling `shell_tool` removes shell. `apply_patch` is not in the allowlist, so a role cannot remove file editing.
- Disable skills.

A real read-only guarantee therefore needs one of these:

- A PreToolUse hook that denies `apply_patch`, and write-capable `Bash`, when `agent_type` is the read-only role.
- Starting the whole session read-only.

### Agent identity inside a subagent's hooks

Yes, identity reaches hooks. Hooks fired inside a ThreadSpawn subagent get `agent_type`, the role name or `"default"`, and `agent_id`, the child thread id. This holds for PreToolUse, PostToolUse, PermissionRequest, UserPromptSubmit and the compact events. SubagentStart and SubagentStop get both fields as required, as section 2 shows.

### Related config keys

`[agents]` accepts these keys: `enabled`, `max_concurrent_threads_per_session` (alias `max_threads`), `max_depth` (V1 only), `default_subagent_model`, `default_subagent_reasoning_effort` and `interrupt_message`. See `AgentsToml` in `config_toml.rs`, lines `L682-L715`. The feature flag `multi_agent` is Stable and on by default. `multi_agent_v2` is Stable and off by default, with model-driven selection. No flag gates roles. Roles become visible to the model as soon as one user-defined role exists.

## 4. Skills

### Invocation

Plugin skills are namespaced as `<plugin>:<skill>` (`ResolvedSkillNamespace::qualify`, `SRC/ext/skills/src/loader/namespace.rs` lines `L175-L182`).

- Explicit invocation: the user writes `$<name>`, as in `$fx:fx-tdd`. The sigil `$` is `TOOL_MENTION_SIGIL` (`SRC/utils/plugins/src/mention_syntax.rs`). `collect_explicit_skill_mentions` scans text for `$skill-name` tokens. A plain name counts only when unambiguous (`SRC/skills/src/selection.rs`, lines `L31-L45`). Each explicitly selected skill has its full `SKILL.md` injected as a `<skill>...</skill>` user fragment (`SkillInstructions`, `SRC/ext/skills/src/fragments.rs` lines `L62-L100`).
- Implicit invocation: the prompt lists the available skills with name, description and path. The injected rules tell the model: "If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn", and to read `SKILL.md` in full first (`SRC/ext/skills/src/catalog_prompt.rs`, lines `L1-L40`). Codex has no Skill tool equivalent for host skills. The model reads the file with its shell. `skills.read` exists only for executor and orchestrator packages.
- `agents/openai.yaml` sidecar: an optional file next to `SKILL.md` at `<skill dir>/agents/openai.yaml` (`SRC/ext/skills/src/loader/mod.rs`, lines `L20-L21`). It holds `interface` (display name, short description, icons, brand color, default prompt), `dependencies.tools`, and `policy.allow_implicit_invocation` plus `policy.products` (`SRC/ext/skills/src/loader/metadata.rs`). `allow_implicit_invocation` defaults to true (`SRC/skills/src/model.rs`, lines `L22-L28`). When it is false, the skill is hidden from the prompt catalog and reachable only by an explicit `$` mention. The orchestrator path shows the same logic with `hidden_from_prompt()` (`SRC/ext/skills/src/provider/orchestrator.rs`, lines `L255-L296`). A parse failure in the sidecar fails open.

### Always-on context without a SessionStart hook

- `AGENTS.md`: Codex concatenates every `AGENTS.md` from the project root, found through `project_root_markers` with `.git` as the default, down to cwd. It also reads `AGENTS.override.md` and any names in `project_doc_fallback_filenames`, and prepends the user-level `$CODEX_HOME/AGENTS.md`. The total is capped by `project_doc_max_bytes`, 32 KiB by default (`SRC/core/src/agents_md.rs`, lines `L1-L60` and 270 to 280; `SRC/core/src/config/mod.rs` line `L236`). Setting `project_doc_fallback_filenames = ["CLAUDE.md"]` makes Codex read a repo's `CLAUDE.md` as well. That is a user or project config choice. A plugin cannot set it.
- `developer_instructions` in `config.toml` (`SRC/config/src/config_toml.rs` line `L235`) and `model_instructions_file` (line `L253`) are user or project config.
- Plugin instruction files: none. The plugin manifest has no instructions key, see `RawPluginManifest` above. The only plugin-contributed prompt text is the plugin and skill catalog listing (`SRC/core/src/context/available_plugins_instructions.rs`).
- Subagents inherit the parent's config, including `developer_instructions` and base instructions (`build_agent_shared_config`, `multi_agents_common.rs` lines `L177-L210`). A role's `developer_instructions` replaces the child's value. SessionStart does not fire in subagents. The plugin-reachable way to inject context into every spawned subagent is a `SubagentStart` hook that returns `additionalContext`.

So, for a plugin, SessionStart plus SubagentStart hooks are the only always-on channel. Anything more needs the user's own `AGENTS.md` or config.

## What this means for a plugin targeting both Codex and Claude Code

1. Keep `hooks/hooks.json` as the shared file, or give Codex its own file through `"hooks": "./hooks/codex.json"` in `.codex-plugin/plugin.json`. A manifest key replaces the default and never merges with it, so never declare both and expect both to load. A root `hooks.json` is never loaded unless the manifest names it.
2. Write commands as `"${CLAUDE_PLUGIN_ROOT}/hooks/x.sh"`. Codex substitutes that literal and also exports it, so one string works in both harnesses.
3. Separate hooks files per harness give the cleanest harness detection, with a `--harness codex` argument in each command. In a shared script, detect Codex through `PLUGIN_ROOT` set in the env, or `turn_id` on stdin, or `tool_name` equal to `apply_patch`. Do not rely on `CODEX_*` env vars.
4. Emit only the exact keys Codex knows. Its output parsing uses `deny_unknown_fields`, so one Claude-only key silently turns a deny into a failed, non-blocking run. For PreToolUse, use exactly `hookSpecificOutput.{hookEventName, permissionDecision: "deny", permissionDecisionReason}`, or exit 2 with the reason on stderr. Never send `"ask"`, and never send `"allow"` without `updatedInput`.
5. Guards fail open on crashes, bad JSON and other non-2 exit codes. Keep guard scripts dependency-free, and test the deny path under Codex.
6. Match edits with `apply_patch|Edit|Write`, which Codex accepts as aliases, and parse `tool_input.command` as patch text to get paths. Match shell with `Bash` and read `tool_input.command` as one string.
7. Put the always-on preamble in both SessionStart and SubagentStart hooks, because Codex never fires SessionStart in a subagent. Keep each injection under 2,500 tokens, or set `additionalContextLimit`, or accept the spill-to-file preview.
8. Codex plugins cannot ship agent roles. To offer named roles, document a `.codex/agents/<role>.toml` or `$CODEX_HOME/agents/<role>.toml` the user installs, with `name`, `description` and `developer_instructions`. Once one exists, `spawn_agent` exposes `agent_type`. Tell the model to pass `agent_type` explicitly, because a default full-history fork otherwise ignores the role.
9. Do not rely on `sandbox_mode = "read-only"` in a role file. The docs promise it, but the 0.155.1 source ignores it. Enforce read-only roles in a PreToolUse hook keyed on `agent_type`, denying `apply_patch` and mutating `Bash`. Optionally add `[features] shell_tool = false` in the role file to drop shell completely.
10. Tell users that plugin hooks need a one-time trust in `/hooks`, and a new trust after every hook definition change. Without it, nothing runs, silently.
11. Skills work unchanged from `skills/<name>/SKILL.md`. Users address them as `$<plugin>:<skill>`. Add `agents/openai.yaml` with `policy.allow_implicit_invocation: false` only for skills that must never trigger implicitly.

## Follow-up: role visibility timing

The same tag and commit as above, `rust-v0.155.1` at `be2951ea`. `SRC` has the same meaning as before.

### When roles are read, and when the spawn tool is built

Roles are read once, when a thread's `Config` is built. `load_config_with_layer_stack` calls `load_agent_roles` and stores the result in `Config.agent_roles` (`SRC/core/src/config/mod.rs`, line `L3736` and line `L4270`). That happens before the session exists, so it always happens before any SessionStart hook runs.

The spawn tool spec itself is rebuilt for every sampling request. `built_tools` calls `build_tool_router` (`SRC/core/src/session/turn.rs`, lines `L1702-L1772`), and `add_collaboration_tools` decides `expose_agent_type: !turn_context.config.agent_roles.is_empty()` (`SRC/core/src/tools/spec_plan.rs`, line `L1306` for V2 and line `L1356` for the V1 tool). In the first turn, SessionStart hooks run at `turn.rs` line `L320`, before the first sampling request, so tool building does come after the hooks.

That ordering does not help, because each turn's config is a clone of the session's stored config. `build_per_turn_config` starts from `session_configuration.original_config_do_not_use.clone()` (`SRC/core/src/session/turn_context.rs`, lines `L723-L736`), and that clone carries the `agent_roles` map read at startup. The spawn handler resolves `agent_type` against the same map, and an unknown name fails with `unknown agent_type '<name>'` (`SRC/core/src/agent/role.rs`, lines `L51-L66` and the `resolve_role_config` function).

The answer, then:

- Roles planted by a SessionStart hook are not visible to `spawn_agent` in that session. This holds for the first turn and for every later turn of the session.
- Spawned subagents do not help either. `build_agent_shared_config` clones the parent turn's config, so a child inherits the same stale map (`SRC/core/src/tools/handlers/multi_agents_common.rs`, lines `L195-L197`).
- The roles become visible in the next thread whose config is loaded fresh. The app-server `thread_start_task` calls `config_manager.load_with_overrides` for each new thread (`SRC/app-server/src/request_processors/thread_processor.rs`, line `L1357`), and a resumed thread loads through `load_for_cwd` (same file, line `L3951`). So a new `codex` run, or a new thread started through `thread/start`, sees the planted roles. This research did not trace whether every TUI path for a new chat goes through `thread/start`, so a fresh `codex` process is the safe assumption.

### Does anything reload roles mid-session

No. Every code path that replaces `original_config_do_not_use` during a session builds the new value from a clone of the old config, then patches named fields only.

- `refresh_runtime_config_inner` patches the config layer stack, MCP servers and a few feature flags (`SRC/core/src/session/mod.rs`, lines `L1943-L1996`).
- `refresh_mcp_config` patches the same MCP fields (same file, lines `L2028-L2063`).
- The MCP runtime refresh patches `mcp_servers` only (`SRC/core/src/session/mcp.rs`, lines `L666-L669`).
- Settings updates patch the permission profile (`SRC/core/src/session/session.rs`, line `L455`).

None of them calls `load_agent_roles` or touches `agent_roles`. `load_agent_roles` has exactly one caller in the tree, the config loader above. The practical consequence for a plugin: a SessionStart hook that writes `$CODEX_HOME/agents/*.toml` pays off one session late, and the first session after install runs without the roles.

### additionalContextLimit in a plugin hooks file

Yes. The key is `additionalContextLimit`, written in camelCase, and it belongs on the handler object next to `type` and `command`. It is a field of `HookHandlerConfig::Command`, declared with `rename = "additionalContextLimit"` (`SRC/config/src/hook_config.rs`, lines `L175-L184`). Plugin hook files parse into the same `HooksFile` type as user hook files (`SRC/core-plugins/src/loader.rs`, the `serde_json::from_str::<HooksFile>` call in `append_plugin_hook_file`). An example entry:

```json
{"hooks": {"SessionStart": [{"hooks": [{"type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/start.sh", "additionalContextLimit": 6000}]}]}}
```

The value is an approximate token count, and `0` disables spilling. Codex honours it only for PreToolUse, PostToolUse, SessionStart, UserPromptSubmit and SubagentStart. On any other event it logs "ignoring additionalContextLimit" (`SRC/hooks/src/engine/discovery.rs`, lines `L523-L540`). The limit value is part of the handler, so it is part of the trust hash, and changing it asks the user to trust the hook again.

The other handler keys in the same struct: `commandWindows`, with `command_windows` accepted as an alias, `timeout` in seconds, `async` and `statusMessage` (`hook_config.rs`, lines `L163-L174`). The timeout key is `timeout`, the same as in Claude Code.

### statusMessage

Codex honours `statusMessage` as a handler config key. It is declared with `rename = "statusMessage"` on both the `command` and `mcp_tool` handlers (`SRC/config/src/hook_config.rs`, lines `L173-L174` and `L194-L195`). Discovery carries it through (`discovery.rs`, the `status_message` field of `NormalizedHandler`), and the dispatcher copies it into the hook run summary that the UI shows (`SRC/hooks/src/engine/dispatcher.rs`, line `L93`).

It does not trip the unknown-key rejection, because that rejection applies to hook stdout, not to the hooks file. On the config side, only the top-level `HooksFile` has `deny_unknown_fields`, and it allows `description` and `hooks` (`hook_config.rs`, lines `L10-L17`). `HookEventsToml`, `MatcherGroup` and `HookHandlerConfig` have no such attribute (`hook_config.rs`, lines `L35-L60` and `L153-L201`). Serde's default applies to them, so an unknown handler key or an unknown event name, such as a Claude-only `Notification` block, is silently ignored.

The strict rejection applies to the JSON a hook prints. `statusMessage` is not a stdout key in either harness. If a hook printed it on stdout, Codex would reject the whole object, since `HookUniversalOutputWire` allows only `continue`, `stopReason`, `suppressOutput` and `systemMessage` (`SRC/hooks/src/schema.rs`, lines `L86-L98`).
