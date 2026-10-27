# Experiments: the Codex model catalog, apply_patch over OpenRouter, hook trust, and the corrected render

Date: 2026-10-28. Codex CLI 0.164.0, fx 0.7.0 (`ce1fb19`), OpenRouter, `anthropic/claude-haiku-4.5` unless named.
Settles the open questions in `codex-integration.md` (section "Open questions") before the design.

Spike, throwaway, all under `/tmp/claude-1000/fx-codex/spike/`:

- `run.sh`: a copy of `tools/run.sh` (sources fx's `tests/conformance/lib/live.sh`, `with-key.sh`, `openrouter.js`). Same jail and scratch home. Adds: a catalog file, config lines, a `--profile` file, optional hook trust, optional no-bypass, a prompt override, and `codex debug models` / `codex debug prompt-input` modes.
- `mkcat.py`: writes a `model_catalog_json` with one entry that clones Codex's fallback `ModelInfo` (`CX:models-manager/src/model_info.rs:98-150`) and flips `include_skills_usage_instructions` and `apply_patch_tool_type`.
- `proxy.py`: a localhost logging proxy in front of `openrouter.ai`. It saves request and response bodies, never headers. Used only for `ap3`, `ap4` and `ap5`.
- `trust.py`: trusts hooks the way the TUI's `/hooks` does (`CX:tui/src/hooks_rpc.rs:58-91`): `codex app-server`, `hooks/list`, then `config/batchWrite` of `hooks.state`.
- `analyze.py`: rollout summary (calls before the first lane read, lanes, changed files, write channel).
- `fx-a3/`: a copy of fx 0.7.0 with the corrected Codex render patched into `lib/preamble.js` and `PREAMBLE.md` (an `{{ORDER}}` slot, absolute lane paths). Throwaway. The worktree's code was not touched.

`CX:` paths are under `/tmp/claude-1000/sp-research/codex/codex-rs` at `rust-v0.164.0`.

## Q1. Does OpenRouter accept Codex's apply_patch tool, and which type works?

**Codex 0.164 has one type only.** `ApplyPatchToolType` has a single variant, `Freeform` (`CX:protocol/src/openai_models.rs:326-328`). A catalog entry with `"function"` fails at startup: `unknown variant 'function', expected 'freeform'` (run `ap2-function`). The tool is registered only when the field is set (`CX:core/src/tools/spec_plan.rs:1409-1412`).

**OpenRouter accepts the request, and then drops the tool for Anthropic models.**

| run | model | catalog | what happened |
|---|---|---|---|
| ap3-proxy | haiku-4.5 | skills on, freeform | All 5 requests carried `('custom', 'apply_patch')` in `tools`, and all returned HTTP 200. Asked to "Use the apply_patch tool", Haiku ran `apply_patch` **inside `exec_command`** 3 times (2 malformed patches, then success). 0 `custom_tool_call` items. |
| ap4-tools | haiku-4.5 | skills on, freeform | Asked to list its callable tools without calling any: `openrouter_web_search, exec_command, write_stdin, request_user_input, view_image, multi_agent_v1__*, get_goal, create_goal, update_goal`. **No apply_patch.** |
| ap5-gpt-tools | openai/gpt-6.1-sol | skills on, freeform | Same question: the list includes `functions.apply_patch`. |
| ap1-freeform | haiku-4.5 | skills on, freeform | "Use your file editing tool, not the shell": Haiku wrote `cat > .../NOTES.txt << 'EOF'`. |

Answer: freeform reaches OpenAI models over OpenRouter, and does not reach Anthropic models over OpenRouter. OpenRouter forwards a `custom` tool to OpenAI and leaves it out for Anthropic. For Haiku over OpenRouter, no catalog setting gives the model an apply_patch tool. Its writes stay in the shell: `apply_patch` as a command (which ADR 0039's match already sees) or a heredoc (which nothing sees).

## Q2. Does a `model_catalog_json` entry take effect for an OpenRouter slug, or does a `/models` fetch override it?

**It takes effect, and it replaces the fetch.**

- Without a catalog, Codex fetches OpenRouter's `/models` (the provider has command auth) and builds 471 entries: the 11 bundled models plus OpenRouter's list (run `m0-base`, `codex debug models`; cached at `CODEX_HOME/models_cache.json`). The OpenRouter entries carry the generic 20,751-char base prompt, `include_skills_usage_instructions: false` and `apply_patch_tool_type: null`. `anthropic/claude-haiku-4.5` gets `context_window: 200000` from OpenRouter. So these slugs are not unknown to Codex. They are known, and have the same two flags off as the fallback. The research doc's "fallback metadata" attribution is right about the effect and wrong about the path. The OpenRouter `openai/gpt-6.1-sol` matched OpenRouter's own entry exactly, which is why it never reached the bundled `gpt-6.1-sol` through the namespaced-suffix retry (`CX:models-manager/src/manager.rs:906-927`).
- With `model_catalog_json`, the provider builds a `StaticModelsManager` from the file and never constructs the endpoint client (`CX:model-provider/src/provider.rs:396-406`). Run `m1-top`: `codex debug models` lists exactly 1 model, `('anthropic/claude-haiku-4.5', True, 'freeform')`. The bundled models are gone too, so the catalog has to be scoped.
- **Rendered prompt** (`codex debug prompt-input`, no model call): `How to use skills` appears 0 times without a catalog (`p0-base`) and 1 time with one (`p1-top`). In the live runs `a3-haiku-1..3`, the rollouts contain the block (2 matches each: the developer message and its copy in the turn's recorded input).
- **Scoping in 0.164.** The legacy form is rejected: `profile = "openrouter-haiku"` plus `[profiles.openrouter-haiku]` fails with "legacy `profile = ...` config is no longer supported; use `--profile openrouter-haiku` with `openrouter-haiku.config.toml` instead" (run `p2-prof`; `CX:core/src/config/mod.rs:3498`). The 0.164 profile is a file, `$CODEX_HOME/<name>.config.toml`, layered over `config.toml` when `--profile <name>` is passed (`CX:config/src/loader/mod.rs:131`, `CX:core/src/config/mod.rs:270`). A profile file holding only `model_catalog_json = ".../catalog.json"` renders the usage block (run `p3b-prof`: 1 match). `ConfigProfile` carries `model_catalog_json` (`CX:config/src/profile_toml.rs:41`).

## Q3. Does Codex's own skill-usage text conflict with fx's preamble rule?

The text Codex adds for plugin skills (full copy from `p1-top`; source `CX:ext/skills/src/catalog_prompt.rs:24-40`):

> Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
>
> 1) After deciding to use a skill, the main agent must expand the listed short `path` with the matching alias from `### Skill roots`, then open and read its `SKILL.md` completely before taking task actions.
>
> Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
>
> Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.

- **No direct conflict on the first action.** It says "must use", "read its SKILL.md completely before taking task actions" and "announce", which is fx's rule in weaker words. It has none of the GPT template's "Do not use a skill based solely on keywords" or "default to proceeding" (`models.json` lines 76, 250, 424).
- **Two weaker points:**
  1. "clearly matches" sets a higher bar than fx's 1%.
  2. "Do not carry skills across turns unless re-mentioned" works against lanes that span turns, such as an fx-brainstorm interview. fx's preamble, sent again on `resume`, is what carries a lane across turns. Multi-turn rows should watch for it.
- Order in the request (`a3-haiku-1`): developer `<skills_instructions>` (12,032 chars, usage block included), user `<environment_context>`, developer fx preamble (3,914), user prompt. fx's text comes later and is more specific.

## Q4. Do hooks fire in `codex exec` when trusted, without the bypass flag?

**Yes.**

- `h1-trusted`: `trust.py` before the run. `hooks/list` reported all 7 fx hooks (`sessionStart, subagentStart, userPromptSubmit, preToolUse, postToolUse, stop, subagentStop`) `untrusted`. After `config/batchWrite` they were `trusted`, stored as `[hooks.state."fx@fx:hooks.json:<event>:0:0"]` with `trusted_hash` and `trusted_content_hash` in `config.toml`. The app-server splits a plugin's `decl/content` hash into those two fields (`CX:app-server/src/config_manager_service.rs:375-390`). Then `codex exec` without `--dangerously-bypass-hook-trust` injected the fx preamble: 1 match for "Invoking a lane is not optional" in the rollout.
- `h0-untrusted`, the control: the same run with no trust step and no bypass. 0 matches.
- superpowers PR #2088's "on codex-cli 0.146.0, `codex exec` sessions receive no hook injection at startup" does not hold on 0.164 for trusted hooks.
- Side finding: `trust.py` is a non-interactive way to do exactly what `/hooks` does. fx-setup still tells the user to run `/hooks` (ADR 0024).

## Q5. Codex + Haiku first turn: catalog entry plus the corrected render

Arm: the `fx-a3` scratch copy (Codex render: "invoke it with your shell, by reading the lane's `SKILL.md` in full **before any response**, including before a clarifying question. That `SKILL.md` is the first file you read, before any file in the repository.", plus "Each lane's file is `<plugin root>/skills/<lane>/SKILL.md`, for example `<abs path>/fx-brainstorm/SKILL.md`"). Catalog: skills on, freeform, top-level `model_catalog_json`. Prompt `prompts/baseline.txt` ("Managers need to approve invoices before they get paid. Can we add that?"). Seed `/tmp/claude-1000/fx-codex/seed`.

| run | usage block | new wording injected | calls before 1st lane | lanes read | code files | tokens in / cached / out |
|---|---|---|---|---|---|---|
| a3-haiku-1 | yes | yes | 4 | fx-brainstorm | 0 | 206K / 185K / 1.3K |
| a3-haiku-2 | yes | yes | 14 | fx-brainstorm | 0 | 284K / 262K / 1.6K |
| a3-haiku-3 | yes | yes | 15 | fx-brainstorm | 0 | 310K / 287K / 1.9K |

Baseline for comparison (`findings.md`): a lane read first in 0/6, code before any design in 4/6, 15 to 35 calls before the first lane, and 4/10 runs guessing wrong skill paths.

- **3/3 entered fx-brainstorm and wrote 0 files.** Each ended at a design in chat with questions: "Using `$fx:fx-brainstorm` to design this feature before implementing." (a3-2); "This is an **architectural** task since it adds a new model" (a3-3).
- **0/3 wrong-path reads.** All three read the absolute path the preamble gave: `cat .../home/.codex/plugins/cache/fx/fx/0.7.0/skills/fx-brainstorm/SKILL.md`. The path came from the installed plugin's own `__dirname`.
- **The ordering clause still did not hold.** 4, 14 and 15 repo calls came first, starting with `find . -type f -name "*.md"`, then README, then a hunt for `AGENTS.md` that the Codex base prompt's AGENTS.md section drives. First messages: "I'll start by exploring the repo structure to understand the codebase and then use the appropriate lane" (a3-1). Three runs are a signal, not proof. The 10-run arms after implementation decide it.
- Write channel: none of the runs wrote anything, so the lane check had nothing to fire on.

## Hygiene and spend

- Key scan after every run (`python3 -I tools/scrub.py`). 18 runs, 18 hits: each was live.sh's own transient key file `runs/<run>/keytmp/tmp.*/key`, overwritten with REDACTED and removed by live.sh's exit handler (0 such directories remain). 0 hits anywhere else. A final sweep of the whole spike directory found 0. The proxy saved bodies only, no headers.
- No Claude credentials were copied: these were Codex-only runs under OpenRouter, and live.sh copies nothing in that mode.
- OpenRouter usage went from 20.7436 to 21.0241: **USD 0.28** for the 18 runs. 9 of them made no model call (debug modes, the config-error runs).
- `/development/fx` and the worktree's code are untouched. No commits.
