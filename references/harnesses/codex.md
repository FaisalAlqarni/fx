# Codex

Harness knowledge. ADR 0016. True of the runtime executing the session, in
any repository. Measured against Codex CLI 0.155.1; sections dated 2026-10-28 against 0.164.0.

Nothing here is load-bearing before a lane is invoked: ADR 0020.

## Tool vocabulary

No `Read`, `Grep` or `Glob` tool exists. Everything goes through the shell.

MEASURED 2026-10-28 on Codex CLI 0.164.0: the `apply_patch` tool exists only when the model's catalog entry sets `apply_patch_tool_type` (`CX:core/src/tools/spec_plan.rs:1409-1412`; only `freeform` exists in 0.164, and `function` fails with "unknown variant `function`, expected `freeform`", run `ap2-function`). Over OpenRouter an `openai/` model receives the tool (run `ap5-gpt-tools`) and an `anthropic/` model does not (run `ap4-tools`: Haiku's tool list has no `apply_patch`). There its edits arrive as a shell `apply_patch` command, which fx sees (ADR 0039), or as heredocs, which fx does not see, by decision (owner accepted 2026-10-28, ADR 0065).

A shell call arrives at a hook as `tool_name: "Bash"`, with the command at
`tool_input.command`. The `exec_command` tool reaches hooks under that name
and shape, with `command` a string
(`docs/plans/2026-09-21-multi-harness/research/codex.md`, section 2,
`tool_name` values). fx's shell guard reads no other tool name and no other
type as a command.

UNVERIFIED gap: unified exec registers `write_stdin` next to `exec_command`.
An agent could start an interactive shell with `exec_command` and then type
commands into it through `write_stdin`; fx guards neither that text nor that
tool, so such commands skip the git guard and the hard rules.
Whether `write_stdin` reaches PreToolUse, and whether a tty `exec_command` is
allowed, is not known; Codex's sandbox may still stop the command. A live run
settles it, and it is on the owner's live-run list.

## Skill trigger rules

MEASURED 2026-10-28 on Codex CLI 0.164.0: Codex appends its "How to use skills" trigger rules only when the model's catalog entry has `include_skills_usage_instructions: true` (`CX:ext/skills/src/fragments.rs:21-33`). OpenRouter's `/models` entries have it off (run `m0-base`: 471 models, Haiku's flag false). The profile catalog that fx-setup writes turns it on (runs `p3b-prof` and `a3-haiku-1..3`; with no catalog the block rendered 0 times, run `p0-base`).

## Model catalog and profiles

MEASURED 2026-10-28 on Codex CLI 0.164.0: `model_catalog_json` replaces the remote model list for the process (`CX:model-provider/src/provider.rs:396-406`; run `m1-top` lists 1 model). Profiles in 0.164 are files, `$CODEX_HOME/<name>.config.toml`, selected with `--profile <name>` (`CX:config/src/loader/mod.rs:131`, `CX:core/src/config/mod.rs:270`). The legacy `[profiles.x]` table plus `profile = "x"` is rejected at startup (run `p2-prof`). `codex --profile <name> debug models` is rejected ("--profile only applies to runtime commands"); `--profile <name> debug prompt-input` works and shows the skills block.

## Hook trust

MEASURED 2026-10-28 on Codex CLI 0.164.0: hooks fire in `codex exec` without `--dangerously-bypass-hook-trust` once they are trusted the way `/hooks` trusts them (run `h1-trusted`: all 7 fx hooks went from `untrusted` to `trusted` and the preamble was present; control `h0-untrusted`: preamble absent).

## Hook decisions

A PreToolUse hook cannot ask. Codex rejects `permissionDecision: "ask"` as
unsupported, marks the run failed, and lets the call through (research/codex.md,
section 2, "Output contract"). So where Claude Code would ask, fx runs the call
with a warning: the reason goes to the user as `systemMessage` and to the model
as `hookSpecificOutput.additionalContext`. A deny is exit 2 with the reason on
stderr.

The shell guard never asks: a hard rule is a deny, and any other command
runs.

## User prompts

`UserPromptSubmit` also fires inside a spawned subagent, carrying `agent_id`
and `agent_type` (research/codex.md, section 2, "Agent identity"). fx
treats its prompt there as the parent's dispatch, so it records it only as the
start of that subagent's turn and never as the user's words.

READ 2026-10-24 on Codex CLI 0.164.0: `UserPromptSubmit` output accepts `hookSpecificOutput.additionalContext`. This was read from the binary, not seen in a recorded Codex run. Evidence: the JSON schema `user-prompt-submit.command.output` embedded in the installed binary (`strings` of `~/.codex/packages/standalone/releases/0.164.0-x86_64-unknown-linux-musl/bin/codex`, needle `UserPromptSubmitHookSpecificOutputWire`) sets `additionalProperties: false` at the top, lists `hookSpecificOutput` as a `$ref` to `UserPromptSubmitHookSpecificOutputWire`, and that definition, also `additionalProperties: false`, has the properties `additionalContext` (string, default null) and `hookEventName` (const `UserPromptSubmit`, required). The top level also allows `continue`, `decision` (only `block`), `reason`, `stopReason`, `suppressOutput` and `systemMessage`. The documentation quote in `src/tests/gates/codex-hook-output.test.ts` ("Add context: hookSpecificOutput.additionalContext") does not name an event, and ADR 0023 says only that an unknown key fails the run; the binary schema settles it.

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

MEASURED 2026-10-24 on Codex CLI 0.164.0: `spawn_agent` takes an optional `model` field, and a role that sets its own model overrides it. Evidence, from `strings` of the installed binary: the tool text "This spawn_agent tool provides you access to sub-agents that inherit your current model by default. Do not set the `model` field unless the user explicitly asks for a different model.", the list header "Available model overrides (optional; inherited parent model is preferred):", the error "Unknown model `...` for spawn_agent. Available models:", and, next to `core/src/tools/handlers/multi_agents_v2.rs`, the role notes "This role's model is set to `...` and cannot be changed." A spawn with no role, or with a role that sets no model, therefore runs on the `model` it was given; ADR 0031 found the same role override at `rust-v0.155.1`.

fx does not change a dispatch's model here; model routing is Claude Code only (ADR 0031). A Codex PreToolUse hook cannot rewrite a tool input (ADR 0023) and the spawn message reaches hooks encrypted, so there is nothing to rewrite or to read.

Nesting depth, read from the 0.155.1 source. On a model whose catalog entry
selects MultiAgentV2 (5 of the 9 models in the 0.155.1 bundled catalog), there is no depth
limit: a child keeps `spawn_agent`, and only concurrency is capped, at 4
threads per session including the root by default
(`[agents] max_concurrent_threads_per_session`). On a model that selects V1,
the default depth is 1: a child cannot spawn. The user-level key
`[agents] max_depth` in `$CODEX_HOME/config.toml` raises it. It is ignored
under V2, and nothing a plugin ships can set it.

## Stop and SubagentStop

Read from the JSON schemas embedded in the installed Codex CLI 0.164.0 binary
(`stop.command.input`, `subagent-stop.command.input` and their `.output`
schemas). The Rust source was not available offline, so the source file and
line are not recorded here; the schema names are. Both input schemas set
`additionalProperties: false`.

`Stop` input, all required: `session_id` (string), `turn_id` (string, a
"Codex extension"), `transcript_path` (string or null), `cwd` (string),
`hook_event_name` (`"Stop"`), `model` (string), `permission_mode` (string),
`stop_hook_active` (boolean) and `last_assistant_message` (string or null).
It carries no `agent_id`.

`SubagentStop` input has the same fields, plus `agent_id` (string),
`agent_type` (string) and `agent_transcript_path` (string or null), all
required.

Output for both: `decision` (only `"block"`), `reason` (string; the schema
text says a reason is required with `block` and is enforced while parsing, not
in the schema), plus the universal keys `continue`, `stopReason`,
`suppressOutput` and `systemMessage`. Any other key fails the whole object.
fx prints only `decision` and `reason`, on a block, and nothing otherwise.

Not confirmed: what Codex does with a block reason (the continuation prompt)
and whether that continuation fires `UserPromptSubmit` with the reason. fx
handles both: its hooks ignore a `UserPromptSubmit` prompt that starts `[fx] `
or carries the Stop reason sentence ("edited files and no check ... passed
... the last edit") anywhere in its text, and block-once rests on the journal's `stop-block` event, not on
`stop_hook_active`. Where a field is absent, fx reads `stop_hook_active` as
false and `last_assistant_message` as null.
This handling assumes the continuation carries that sentence unchanged. If
Codex rewrites or summarises the reason, the continuation is recorded as a user
prompt: a new turn opens and block-once is lost.

## PostToolUse

Read on 2026-10-23, read-only, from the JSON schemas and strings embedded in
the installed Codex CLI 0.164.0 binary
(`~/.codex/packages/standalone/releases/0.164.0-x86_64-unknown-linux-musl/bin/codex`),
the same source as the Stop contract above.

`post-tool-use.command.input` sets `additionalProperties: false` and requires
`session_id`, `turn_id`, `transcript_path` (string or null), `cwd`,
`hook_event_name` (`"PostToolUse"`), `model`, `permission_mode`, `tool_name`,
`tool_use_id`, `tool_input` and `tool_response`. `agent_id` and `agent_type`
are optional. The schema types `tool_input` and `tool_response` as `true`:
any JSON value. The schema does not fix the result shape.

The binary holds two text forms for a shell result, which are the forms
Codex shows the model:

- the shell tool: `Exit code: N`, `Wall time: S seconds`, an optional
  `Total output lines: N`, then `Output:` and the output, one per line;
- `exec_command` (unified exec): `Chunk ID: X`, `Wall time: S seconds`, then
  `Process exited with code N` once the process has ended or
  `Process running with session ID N` while it runs, an optional
  `Original token count: N`, then `Output:` and the output.

fx reads the outcome from the first header line, before the `Output:` line,
matching `Exit code: N` or `Process exited with code N`, so the command's own
output cannot set it; an object with a numeric `exit_code` or
`exitCode` also counts. Anything else, a still-running `exec_command` among
them, is `unknown`, which never verifies and never counts as a failure.

Limit, from reading only, not from a recording: an `exec_command` that is
still running when its yield window ends returns `Process running with
session ID N`, and its final exit code arrives later through `write_stdin`.
fx classifies `write_stdin` as `other` and does not read its result, so a
check that outlasts the yield window, which most real test suites do, never
verifies on Codex, and Stop may block after it. Whether `write_stdin` reaches
PostToolUse at all is not known; a recorded payload for a long check settles
it and belongs with the owner item below.

UNVERIFIED: which value Codex places in `tool_response` for a shell call.
The binary shows the schema and the text forms, not the code that fills the
field. A recorded PostToolUse payload from a live Codex session settles it;
that run is an owner item.
