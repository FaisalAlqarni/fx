# Codex CLI 0.155.1 against a local Qwen model through llama-server `/v1/responses`

Research date: 2026-09-22. Question: how far can a Codex run against a local model be trusted, and which parts of such a run say anything about Codex on OpenAI models.

## Sources and method

- Codex source: `github.com/openai/codex`, tag `rust-v0.155.1`, commit `be2951ea34f0d295ed0becf97079f92fa5f6950e`. `C/` below means `https://github.com/openai/codex/blob/rust-v0.155.1/codex-rs/`.
- llama.cpp source: `github.com/ggml-org/llama.cpp`, master at commit `58367713a6935c0810103378144008df32e3d5db` (`2026-09-21`). The latest release is `v0.4.1` (`2026-09-14`). `L/` below means `https://github.com/ggml-org/llama.cpp/blob/58367713a6935c0810103378144008df32e3d5db/`.
- GitHub issues on both repos, read through the REST API on 2026-09-22. The unauthenticated search limit ran out near the end, so items marked "title only" were matched on title and their body was not read.
- Qwen docs: `https://qwen.readthedocs.io/en/latest/framework/function_call.html` and the Hugging Face model cards for Qwen3-8B and Qwen3-Coder-30B-A3B-Instruct.
- The local llama-server answered `/props` and `/v1/models` with 401, so its version was not read.
- No Codex session and no llama-server was run. Every behavior below comes from reading source and issues. Items that are inferred from source and not observed live say so.

## Summary

The Codex harness is model-independent. The request it builds is not. With an unknown model slug and a custom provider, Codex 0.155.1 sends a request that llama-server's Responses shim partly drops and partly rejects:

- MCP tools and the sub-agent tools (`spawn_agent`, `wait_agent` and the rest) go out as `type: "namespace"` tools. llama-server drops every non-`function` tool with only a server-side warning. The model never sees them.
- The fallback model metadata registers no `apply_patch` tool and no `update_plan` tool, while the fallback prompt tells the model to use both.
- Replayed reasoning items reach llama-server without `content`, which its shim rejects with a 400. This is inferred from both sources and not observed live.

The shell tool (`exec_command`) and hooks work the same way they do on OpenAI models, as long as the model emits a well-formed function call.

## 1. Tool and function calling

### What Codex offers an unknown model

The model slug is looked up in the bundled catalog by longest prefix, then by one namespace segment (`C/models-manager/src/manager.rs` `L725-748`). A Qwen slug matches no bundled `gpt-*` entry, so Codex uses `model_info_from_slug` (`C/models-manager/src/model_info.rs` `L142-190`) and logs "Unknown model {slug} is used. This will use fallback model metadata." A custom provider without command auth does not fetch `/models` (`C/models-manager/src/manager.rs` `L511-515`), so llama-server's model list plays no part.

The fallback sets these values that decide the tool list:

| Field | Fallback value | Effect |
|---|---|---|
| `shell_type` | `UnifiedExec` | `exec_command` and `write_stdin`, both plain `function` tools |
| `apply_patch_tool_type` | `None` | no `apply_patch` tool at all |
| `multi_agent_version` | `None` | config and features decide, so V1 by default |
| `supports_reasoning_summary_parameter` | `true` | `reasoning.summary = "auto"` is sent |
| `default_reasoning_level` | `None` | no `reasoning.effort` unless config sets one |
| `context_window` | `272_000` | wrong for any local model unless overridden |
| `truncation_policy` | 10,000 bytes | tool output truncation |
| `supports_search_tool` | `false` | no deferred `tool_search` |

Per tool:

- **Shell.** `add_shell_tools` registers `exec_command` and `write_stdin` whenever an environment exists and the model's `shell_type` is not `Disabled` (`C/core/src/tools/spec_plan.rs` `L1079-1113`). No tool named `shell` exists in 0.155.1: `ConfigShellToolType` has only `UnifiedExec` and `Disabled`, and `shell`, `local` and `default` are accepted as aliases of `UnifiedExec` (`C/protocol/src/openai_models.rs` `L310-314`). These are `function` tools, so llama-server passes them through.
- **apply_patch.** It is registered only when `apply_patch_tool_type.is_some()` (`C/core/src/tools/spec_plan.rs` `L1255-1258`). The only variant is `Freeform` (`C/protocol/src/openai_models.rs` `L318-320`), and the tool is a `type: "custom"` tool carrying a Lark grammar (`C/core/src/tools/handlers/apply_patch_spec.rs` L9-27, `C/tools/src/tool_spec.rs` `L21-55`). The fallback leaves it unset, so the model gets no `apply_patch` tool. Setting it through `model_catalog_json` does not help, because llama-server drops `custom` tools (see section 2 below). The one path left is a shell heredoc: `exec_command` intercepts an `apply_patch` command and applies it as a patch (`C/core/src/tools/handlers/unified_exec/exec_command.rs` `L385-396`).
- **Prompt contradicts tools.** The fallback base prompt says "Use the `apply_patch` tool to edit files" with a `{"command":["apply_patch", ...]}` example, and describes an `update_plan` tool (`C/models-manager/prompt.md` L54, L132, `L267-275`). Neither tool is registered by default, and `exec_command` takes a `cmd` string. Reported as openai/codex#44529 (open, `v0.151.0`). A call to a missing tool gets `unsupported call: <name>` back (`C/core/src/tools/registry.rs` L516-519, `L818-823`).
- **update_plan.** Registered only when `[tools.update_plan] enabled = true` (`C/core/src/tools/spec_plan.rs` L1142-1143, `C/core/src/config/mod.rs` `L2672-2678`). It is a `function` tool, so it survives llama-server once enabled.
- **spawn_agent and the other sub-agent tools.** Section 3 covers the V1 or V2 choice. In both versions the tools are wrapped in a `namespace` tool: V1 always uses namespace `multi_agent_v1` (`C/core/src/tools/handlers/multi_agents_spec.rs` L14, `L64-96`), and V2 defaults to a namespace too (`C/core/src/config/mod.rs` L1295, `L1314`). Namespace tools are kept for custom providers, because `ProviderCapabilities::default()` sets `namespace_tools: true` and custom providers inherit it (`C/model-provider/src/provider.rs` L66-76, `L353-366`), and no `model_providers` key can turn it off (`C/model-provider-info/src/lib.rs` `L97-160`). llama-server drops the namespace tool, so the model never sees `spawn_agent`. If a model still emits a bare `spawn_agent` call, Codex routes it as `functions/spawn_agent` (`C/core/src/tools/router.rs` `L246-260`) and the exact-match registry lookup fails with `unsupported call`. Reported as openai/codex#42488 (open, title only).
- **MCP tools.** Each MCP tool is emitted as `ToolSpec::Namespace` (`C/core/src/tools/handlers/mcp.rs` `L495-500`), so it is dropped the same way. Reported as openai/codex#23186, #26977, #36942 and #19871, and as ggml-org/llama.cpp#24295 (open). llama.cpp#23229 and #25193 were closed as not_planned. llama.cpp#23235 ("implement namespaced tools in responses API") is open.
- **web_search.** Web search defaults to `Cached` (`C/protocol/src/config_types.rs` L375-381, `C/core/src/config/mod.rs` `L2642-2653`), and the provider default allows it, so a `web_search` tool is sent. llama-server drops it. That is harmless, but it is one more tool the model is told nothing about.

### Request-level tool fields

- `tool_choice` is always `"auto"` and `parallel_tool_calls` is always `true` for a normal turn (`C/core/src/client.rs` L869-874, `C/core/src/session/turn.rs` `L1517`). llama-server honors both. With the Qwen3-Coder parser, `false` would allow exactly one call per turn (`L/common/parsers/qwen3-coder.cpp` `L166`). llama.cpp#28522 (closed not_planned) reports parallel tool calls mangled or hanging across Qwen models.
- `strict` is absent on many Codex tools, and llama-server sets it to `true` when missing (`L/tools/server/server-chat.cpp` `L269-270`).

### Known failure modes

- **Tool call printed as text.** openai/codex#2229 (closed, Ollama qwen2.5-coder). llama.cpp#20837 (open): Qwen3.5 9B prints XML tool calls as text and stops when thinking is on. llama.cpp#20614 (closed): a `<tool_call>` inside `<think>`. llama.cpp#26987 (open): the lazy grammar trigger never fires when the model skips both `<tool_call>` and `<function=`. anomalyco/opencode#24316: Qwen 3.6 35B-A3B on llama.cpp leaves a bare XML call inside "Thinking" and stalls.
- **Malformed arguments.** llama.cpp#19382 (closed): Qwen3-Coder-Next emits invalid JSON tool calls. llama.cpp#21771 (open): the Qwen3 autoparser fails on `array<object>` arguments. llama.cpp#26763 (not_planned): `</parameter>` suffix mismatch. llama.cpp#28429 (open): non-ASCII parameter names. openai/codex#29549 (title only): invalid JSON in function-call arguments.
- **Calls dropped or never triggered.** llama.cpp#27363 (closed `2026-08-19`): the parser silently dropped Qwen3-Coder calls. llama.cpp#26530 (not_planned): XML calls fail to trigger on large prompts. llama.cpp#27619 (open): "Unexpected empty grammar stack". openai/codex#45096 (open): the model says "I will now..." and ends the turn with no call.
- **Custom tool type.** Unsupported by llama-server, so there is no native `apply_patch` and no Code Mode `exec`. See openai/codex#33405, #37825 and #11940. #11940 records that commit `a1abd53b` removed the old gpt-oss special case that gave it a `function` `apply_patch`.

## 2. The Responses API surface in llama-server

### Origin and design

- PR ggml-org/llama.cpp#18486, "server: /v1/responses (partial)", merged 2026-01-21 (merge commit `fbbf3ad190`). The first release containing it is `b7793`. An earlier text-only attempt, #18227, was closed unmerged.
- The endpoint rewrites the whole request into a Chat Completions request in one function, `L/tools/server/server-chat.cpp` L6-294. The README states the same, `L/tools/server/README.md` L1501.
- Later merged fixes:
  - #19773: merge contiguous assistant items.
  - #19873: `/responses` alias.
  - #20285: refusal content.
  - #19361: `cached_tokens` in usage.
  - #23041: skip non-function tools instead of returning 400, titled "Support for Codex CLI".
  - #24882: `id` on tool calls.
  - #25348: timings in the stream.
- Closed unmerged: #21174 (Codex compatibility), #25073 and #28735.
- Open PRs: #27751 relaxes reasoning, function_call and function_call_output parsing for Codex, tested with a Qwen 27B model. #23235 adds namespaced tools. #19720 covers general compliance.

### Request fields: what Codex sends and what llama-server does with it

Codex builds the request in `C/core/src/client.rs` L784-889.

| Codex sends | llama-server behavior | Source |
|---|---|---|
| `instructions` (base prompt) | leading system message | `server-chat.cpp` L19-24 |
| developer messages (permissions, AGENTS.md, hook context) | renamed to `system`, never merged | `L/common/chat.cpp` L1271-1273 |
| `function` tools | kept | `server-chat.cpp` L260-270 |
| `namespace`, `custom`, `web_search` tools | skipped with a server-side warning | `server-chat.cpp` L260-264 |
| `tool_choice: "auto"` | honored | `L/common/chat.cpp` L345-356 |
| `parallel_tool_calls: true` | honored | `L/tools/server/server-common.cpp` L1295 |
| `reasoning.effort` | becomes `reasoning_effort`, `"none"` turns thinking off | `server-common.cpp` L1346-1353 |
| `reasoning.summary` | dropped | `server-chat.cpp` L285-291 |
| `include: ["reasoning.encrypted_content"]` (always sent, `client.rs` `L852`) | ignored | `server-common.cpp` L1413-1421 |
| `store: false` | ignored, nothing is stored | same |
| `prompt_cache_key`, `text`, `client_metadata` | ignored | same |
| `previous_response_id` | Codex never sets it on HTTP; a non-empty value would be 400 | `server-chat.cpp` L10-11 |
| `stream: true` | supported | `L/tools/server/server-task.cpp` |

Input items:

- `function_call` and a string `function_call_output` convert cleanly.
- A `function_call_output` whose output is an array must hold only `input_text` parts. Anything else is 400 "Output of tool call should be 'Input text'" (`server-chat.cpp` `L207`). This breaks image viewing through tool output. See llama.cpp#20663, #23380 and #23890, all closed while the throw is still in master, plus #27958 and #28847, which are open.
- `custom_tool_call`, `custom_tool_call_output`, `local_shell_call`, `web_search_call` and unknown items return 400 "Cannot determine type of 'item'" (`server-chat.cpp` `L243`).
- A `reasoning` item must have an array `summary` and a non-empty `content` array whose first element has `text`, or the request fails with 400 (`server-chat.cpp` `L216-235`). `encrypted_content` is ignored.

**Reasoning replay is likely broken (inferred from source, not observed live).** llama-server streams a reasoning item whose `content` is `[{type: "reasoning_text", text}]` (`server-task.cpp` `L599-710`). Codex stores it in history, which keeps reasoning items (`C/core/src/context_manager/history.rs` `L640-660`). On serialization, Codex skips `content` whenever it contains `ReasoningText` (`C/protocol/src/models.rs` L1035-1047, `L1611-1618`). The next request in the same turn, the one that carries the tool output, therefore sends a reasoning item without `content`, and llama-server throws `item['content'] is not an array`. llama.cpp#29159 (open, `2026-09-19`) reports every Codex request failing on reasoning items. It describes the trigger as `summary: null`, while the 0.155.1 struct serializes `summary` as an array. Either way the conclusion is the same: with thinking on, multi-step turns fail. llama.cpp#27751 is the open fix.

### Streaming

- Emitted events: `response.created`, `response.in_progress`, `response.output_item.added`, `response.content_part.added`, `response.output_text.delta`, `response.reasoning_text.delta`, `response.function_call_arguments.delta`, `response.output_text.done`, `response.content_part.done`, `response.output_item.done` and `response.completed` with usage (`server-task.cpp` L599-710, `L1166-1310`).
- Never emitted: `output_index`, `sequence_number`, `function_call_arguments.done`, `reasoning_text.done` and any `reasoning_summary_*` event. llama.cpp#20607, which asked for `output_index`, was closed as not_planned.
- Codex tolerates this. Its event struct has no `output_index` or `sequence_number` field, it builds items from `response.output_item.done`, and it requires `response.completed` (`C/codex-api/src/sse/responses.rs` L169-184, L357-533, `L598`).
- A mid-stream error arrives as a bare `data: {"error": ...}` line, not a `response.failed` event (`L/tools/server/server-context.cpp` `L4415-4423`). Codex then fails with "stream closed before response.completed" and does not see the real error.

### Templates, `--jinja` and Qwen parsers

- `--jinja` is on by default (`use_jinja = true`, `L/common/common.h` L638, with a `--no-jinja` escape at `L/common/arg.cpp` `L3658-3664`). Tools without jinja are an error (`server-common.cpp` `L1163-1169`).
- `--reasoning-format` defaults to `auto`, which puts thinking into `reasoning_content` (`L/common/arg.cpp` `L3666-3671`). `--reasoning on|off|auto` sets `enable_thinking` (`arg.cpp` `L3677-3690`).
- Qwen3-Coder and Qwen3.5 and later use the XML format `<tool_call><function=...><parameter=...>`. A template that contains those markers routes to a dedicated parser (`L/common/chat.cpp` L1212-1217, `L/common/parsers/qwen3-coder.cpp`). That parser tolerates a missing leading `<tool_call>` and parameters in any order, and it applies a lazy grammar only when `tool_choice` is `auto`.
- Qwen3 (Hermes-style `<tool_call>` JSON) has no dedicated parser and goes through the generic autoparser (`chat.cpp` `L1334-1337`).
- **Qwen3.5 template versus Codex.** The bundled `Qwen3.5-4B.jinja` raises "System message must be at the beginning." for any system message after the first (`L/models/templates/Qwen3.5-4B.jinja` `L82-86`). Codex sends `instructions` followed by developer messages, llama.cpp renames them to `system`, and they are not merged. Every Codex request therefore fails on that template. See llama.cpp#20733 (closed not_planned), anomalyco/opencode#42909 (title only) for the same rejection in another harness, and llama.cpp#27139, where swapping the chat template fixed an immediate disconnect with Codex. The bundled `Qwen3-Coder.jinja` renders later system messages inline and does not raise.

### Qwen's own guidance

- Qwen3 recommends Hermes-style tool calling and advises against stopword and ReAct templates (qwen.readthedocs.io, function_call page). The page does not cover llama.cpp.
- Qwen3-Coder-30B-A3B-Instruct is non-thinking only. Recommended sampling is temperature 0.7, top_p 0.8, top_k 20 and repetition_penalty 1.05 (Hugging Face model card).
- Qwen3-8B in thinking mode wants temperature 0.6, top_p 0.95, top_k 20 and no greedy decoding. It says history should omit thinking content (Hugging Face model card).

## 3. Codex behavior with an unknown model

- **Catalog fallback.** Covered in section 1. The fallback base prompt is `C/models-manager/prompt.md`, which calls the model "a coding agent based on GPT-5". The model's own identity does not change the harness.
- **Multi-agent version.** `multi_agent_version_for_model` takes the config override first, then the model's value, then the features (`C/core/src/config/mod.rs` `L1552-1579`). The fallback's value is `None`, `features.multi_agent` is stable and on by default, and `multi_agent_v2` is off by default (`C/features/src/lib.rs` `L1269-1278`). The result is **V1**.
- **Limits.** `agents.max_depth` defaults to `1` and `agents.max_threads` defaults to `6` (`C/core/src/config/mod.rs` L237, `L247`). With depth 1 the root can spawn, and a child cannot spawn further (`C/core/src/agent/registry.rs` L87-93, `C/core/src/tools/spec_plan.rs` `L648-660`).
- **Is `spawn_agent` offered?** Codex registers it and sends it, but inside namespace `multi_agent_v1`. llama-server drops that namespace, so in practice the model is **not** offered it. V2 has the same problem through its default namespace. V2 also sends task bodies as encrypted inter-agent messages (`C/core/src/tools/handlers/multi_agents_v2.rs` `L58-76`). openai/codex#37237 reports that non-OpenAI providers lose those, so sub-agents start empty. See also #45233 (0.154.0, title only), #24069 and #17598.
- **Reasoning parameters.** `reasoning.summary` is `"auto"` unless `model_reasoning_summary = "none"`. `reasoning.effort` is absent unless `model_reasoning_effort` is set (`C/core/src/client.rs` `L763-782`). llama-server ignores the summary and honors the effort.
- **Hooks.** Hooks do not depend on the model:
  - SessionStart runs at session start, or SubagentStart for a spawned thread (`C/core/src/hook_runtime.rs` `L124-176`). Its additional context is recorded into history as model input.
  - PreToolUse runs in the registry dispatcher, after the call is parsed and before the handler runs (`C/core/src/tools/registry.rs` `L567-575`). A block returns `Command blocked by PreToolUse hook: ...` to the model (`C/core/src/hook_runtime.rs` `L230-240`).
  - The hook tool names are fixed: `exec_command` reports as `Bash`, `apply_patch` as `apply_patch` with matcher aliases `Write` and `Edit`, and `spawn_agent` as `spawn_agent` with alias `Agent` (`C/core/src/tools/hook_names.rs` `L34-56`).
  - Two dependencies on the model output matter. First, PreToolUse fires only for a call the model actually emits. Second, `exec_command` builds its hook payload from `parse_arguments(...).ok()`, so malformed JSON arguments produce no PreToolUse event (`C/core/src/tools/handlers/unified_exec/exec_command.rs` `L520-531`). The handler then fails on the same bad arguments, so no command runs, but the hook's refusal is never exercised.
- **Model-dependent tool naming.** Whether `apply_patch` exists, and that it is always freeform, depends on the catalog entry. `shell_type`, `multi_agent_version`, `supports_search_tool` and `use_responses_lite` are catalog fields too (`C/protocol/src/openai_models.rs` `L400-480`). Everything else, including tool names, hook names and namespaces, is fixed code.

## 4. Other harnesses and issue trackers

- **Chat Completions was removed.** Deprecated in openai/codex#7897 (`v0.72.0`) and removed in #10157 (commit `d2394a249`, first in `v0.95.0`). `wire_api = "chat"` is now a hard config error that points to discussion #7782 (`C/model-provider-info/src/lib.rs` L61, `L83-95`). openai/codex#31083, asking to re-add it, is closed. openai/codex#41816 (`v0.151.0`) reports that even an unused `wire_api = "chat"` entry stops config loading.
- **Documented local path.** Codex's official local path is `--oss` with `oss_provider = "ollama" | "lmstudio"`, both on the Responses API. Ollama must be 0.13.4 or newer (`C/ollama/src/lib.rs`). The config-advanced docs say `model_providers` in a project-local `.codex/config.toml` is ignored. There is no official llama.cpp or vLLM guidance.
- **Namespace tools dropped:** openai/codex#23186, #26234, #26977, #27580, #36942 and #42488, and ggml-org/llama.cpp#24295 and #23235, all open. This is the largest cluster.
- **No usable edit tool:** openai/codex#11940, #17899, #33405 and #44529, all open.
- **Reasoning items:** ggml-org/llama.cpp#29159 and PR #27751, both open. openai/codex#22061 reports that reasoning never displays for local reasoning models.
- **Injected `function_call_output` without `call_id`:** openai/codex#42088, #44723, #45318 and others, all open, title only. A 400 on every later turn on strict shims. This fires on automation and cross-thread paths, not on plain sessions.
- **Transport:** openai/codex#21773 reports that `localhost` in `base_url` disconnects while `127.0.0.1` works. openai/codex#34758 (title only) reports that `codex exec` with a custom provider and no `model` exposes no shell tool.
- **Model catalog discovery:** openai/codex#35758 and #37122 report that Codex expects its own `/models` schema, not the OpenAI `{"data": [...]}` list. This hurts `--oss` flows. A custom provider with `model` set does not fetch the list.
- **opencode.** opencode has no Responses, namespace or custom-tool layer. Its Qwen failures are template and parser failures:
  - anomalyco/opencode#24316: XML tool calls leak as text.
  - #44489: a tool description ("DO NOT enter undefined/null") destabilizes Qwen3-Coder on llama.cpp; fixed by #45120.
  - #42909: multiple system messages rejected.
  - #29757: JSON printed instead of a write call on Ollama.

  Those failure classes carry over to Codex, and the wire-protocol failures above come on top of them.

## 5. Representativeness

Model-independent harness mechanics carry over to Codex on OpenAI models:

- config and plugin loading, and hook discovery;
- SessionStart and SubagentStart firing, and their context injection;
- PreToolUse matching on `Bash`, `apply_patch`/`Write`/`Edit` and `spawn_agent`/`Agent`, and the effect of a block;
- sandbox and approval behavior of `exec_command`;
- `apply_patch` interception inside `exec_command`.

These do not carry over:

- **The tool list itself.** OpenAI catalog models get a freeform `apply_patch`, and many get V2 multi-agent through `multi_agent_version`, `supports_search_tool` with deferred tools, and `use_responses_lite`. A local run exercises the fallback's tool list, which no OpenAI model uses.
- **Namespaced tools.** On OpenAI the server understands namespaces. Locally, sub-agent and MCP tools are invisible, so role dispatch and MCP use cannot be observed at all.
- **The base prompt.** OpenAI models get model-specific `model_messages`. The local run gets the generic fallback prompt, which contradicts its own tool list.
- **Reasoning.** OpenAI replays encrypted reasoning server-side. Locally, reasoning must be off or requests fail.
- **Routing and tool-use quality.** Whether the model picks the right skill, sub-agent or tool, follows an injected preamble, and emits well-formed calls is pure model behavior. A Qwen result says nothing about GPT-5-class results in either direction.

## Known blockers, ranked

1. **Sub-agent and MCP tools never reach the model.** They are `namespace` tools, and llama-server drops them silently. Role dispatch through `spawn_agent` cannot be tested. No Codex config switch flattens them. Sources: openai/codex#23186 and #42488, ggml-org/llama.cpp#24295 and #23235.
2. **Reasoning replay 400s.** With thinking enabled, the second request of a tool-using turn fails. Sources: ggml-org/llama.cpp#29159 and PR #27751, plus the source trace in section 2.
3. **Qwen3.5-family template rejects Codex's second system message.** Every request fails until the chat template is replaced. Sources: `Qwen3.5-4B.jinja` L82-86, llama.cpp#20733 and #27139.
4. **No edit tool, and a prompt that promises one.** The fallback has no `apply_patch` or `update_plan`, but the prompt tells the model to use both. Expect `unsupported call` loops. Source: openai/codex#44529.
5. **Qwen tool-call parsing.** Calls come out as text, break inside `<think>`, carry malformed arguments or never trigger on large prompts. Sources: llama.cpp#20837, #26987, #21771 and #27619, all open.
6. **Hidden errors.** A mid-stream server error surfaces as "stream closed before response.completed". The wrong default context window of 272k delays compaction until llama-server overflows.
7. **Image tool output 400s,** for example from `view_image`. Source: `server-chat.cpp` L207.

## Mitigations and required config

`~/.codex/config.toml`, or a profile in it. A project-local `.codex/config.toml` cannot set `model_providers`.

```toml
model = "qwen3-coder"                 # must equal llama-server --alias
model_provider = "llamacpp"
model_context_window = 65536          # match llama-server -c
model_auto_compact_token_limit = 52000
model_reasoning_effort = "none"       # llama-server maps "none" to thinking off
model_reasoning_summary = "none"
web_search = "disabled"

[model_providers.llamacpp]
name = "llama-server"
base_url = "http://127.0.0.1:8899/v1" # 127.0.0.1, not localhost, see codex#21773
wire_api = "responses"
env_key = "LLAMA_API_KEY"             # the local server returns 401 without a key
stream_idle_timeout_ms = 600000       # slow local prefill

[tools.update_plan]
enabled = true                        # the fallback prompt describes it

[agents]
max_depth = 1                         # the default, stated so a test does not rely on it
max_threads = 6
```

llama-server:

```sh
llama-server -m <qwen3-coder-gguf> --alias qwen3-coder \
  --host 127.0.0.1 --port 8899 --api-key "$LLAMA_API_KEY" \
  -c 65536 --jinja --reasoning off \
  --temp 0.7 --top-p 0.8 --top-k 20 --repeat-penalty 1.05
```

- Prefer Qwen3-Coder, whose template tolerates later system messages and which is non-thinking by design. For Qwen3.5 or later, pass `--chat-template-file` with a template that folds extra system messages into the first, as in llama.cpp#20663 and #27139.
- `--reasoning off` together with `model_reasoning_effort = "none"` keeps reasoning items out of the stream, which avoids blocker 2.
- Blocker 1 has no config fix at these versions. To exercise `spawn_agent` or MCP tools, one option is to put a small proxy in front of llama-server. It would flatten each `namespace` tool into `function` tools named `<namespace>__<tool>` and map returned calls back to `{namespace, name}`. The other option is a local build of llama.cpp with PR #23235 applied. Neither was tested here.
- To give the model an edit tool, there is no working option: `model_catalog_json` with `apply_patch_tool_type = "freeform"` produces a `custom` tool that llama-server drops (`openai/codex#33405`). The model must edit through `exec_command`, including the intercepted `apply_patch` heredoc.

## What a local-model Codex run can and cannot prove for harness checks

| Check | Can a local run prove it? | Why |
|---|---|---|
| Hooks load, meaning the plugin's hook config is discovered and parsed | **Yes** | Discovery and SessionStart dispatch are model-independent. Proof is the hook having run, for example a side effect or a hook event in the log, not the model's reply. |
| A preamble arrives, meaning SessionStart context lands in model input | **Yes, from the request.** Not from behavior. | The context is recorded as model input. Confirm it in the request body or session log. Whether the model obeys it is model-dependent. |
| A PreToolUse guard refuses a command | **Yes, for `exec_command`**, once the model emits a well-formed call | Matching on `Bash` and the block message are fixed code. Drive it with a prompt that asks for the exact command. Malformed arguments skip the hook, so a missing refusal is not proof that the guard failed. |
| A PreToolUse guard on edits (`apply_patch`, `Write`, `Edit`) | **Only through the `exec_command` heredoc path**, which reports as `Bash` | No native `apply_patch` tool exists in the local run. |
| Role dispatch, meaning `spawn_agent` with an agent type and a SubagentStart hook | **No** | The namespace tool never reaches the model. Proving it needs a flattening proxy or a patched server, and the dispatch then goes through a translation layer OpenAI runs do not have. |
| MCP tool use | **No** | Same namespace drop. |
| Routing quality, meaning picking the right skill, tool or sub-agent and following a preamble's instructions | **No** | Pure model behavior, on a fallback prompt and tool list no OpenAI model sees. A pass or a fail here predicts nothing for OpenAI models. |
| Failure handling, meaning what the harness does on a bad call | **Partly** | `unsupported call` and parse-error paths are exercised far more often than on OpenAI models. That is useful, but it is not representative. |

Verdict: a local run is a cheap mechanics smoke test. It can show that hooks load, that a preamble is injected, and that a shell PreToolUse guard refuses. It cannot validate role dispatch, MCP use, edit-tool guards or any routing quality, and a failure in those areas should not be read as a harness defect without checking the blockers above first.

## Measured, 2026-09-22 (task 22 part A probe)

Blocker 3 above was confirmed live, not just from source. One probe session
through `tests/conformance/run.sh codex` against this server (Qwen 3.8 27B,
`127.0.0.1:8899`) made 30 identical `POST /v1/responses` calls in ~22 seconds
and then exited 1. A captured request body, replayed once directly against
the server with `curl` (after the live session had already exited, no
further Codex or model call involved), returned:

```
HTTP_STATUS:500
{"error":{"code":500,"message":"...raise_exception('System message must be
at the beginning...Error: Jinja Exception: System message must be at the
beginning.","type":"server_error"}}
```

The request's `input` array carried roles `developer, user, developer, user`
(two `developer` items, rendered as two `system`-role messages by the
`/v1/responses` shim, never merged with the leading `instructions` message),
exactly the shape this file's section on `Qwen3.5-4B.jinja` predicted.

Of the three mechanics part A can probe: hooks loading and the preamble
reaching the model's input both PASS, checked from the captured request
(markers from both ends of `PREAMBLE.md` were present in every one of the 30
bodies), never from a reply. The PreToolUse Bash-guard mechanic is BLOCKED,
not FAILed: the template exception fires before the model produces a single
token, so no shell call is ever offered to the guard. Full detail:
`.fx/2026-09-21-multi-harness/reports/22a-codex-local-report.md`. Rows 01 and
06 were not run, per the amendment's own stop condition.
