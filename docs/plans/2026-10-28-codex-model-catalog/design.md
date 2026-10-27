# Codex: declare the model, render for how Codex loads a lane

**Date:** 2026-10-28
**Status:** ready-for-agent
**Approved:** 2026-10-28
**Glossary:** fx has no GLOSSARY.md. Terms used as fx uses them: lane, preamble, render, harness fact (ADR 0016). One new term: **catalog entry**, the Codex `ModelInfo` record fx writes for a model, in a `model_catalog_json` file.

Evidence: `research/codex-integration.md` (root cause) and `research/experiments.md` (this design's experiments). Run names below (`a3-haiku-1`, `ap4-tools`) refer to the second file.

## Problem Statement

A Codex user who runs fx with a model reached through a third-party provider, such as `anthropic/claude-haiku-4.5` on OpenRouter, gets code written with no design. Baseline: a lane read first in 0/6 runs, code before any design in 4/6.

Codex itself causes most of this. For such a model, Codex's catalog entry (fetched from OpenRouter's `/models`, or the fallback for an unknown slug) has `include_skills_usage_instructions: false` and no `apply_patch` tool. The model therefore sees a list of skills with no rule to use them, and has no edit tool for fx's lane check to watch. fx then makes it worse in two ways:

1. Its Codex preamble says to invoke a lane "before reading a single file", although on Codex invoking a lane *is* reading a file.
2. It points at short alias paths, and the model guessed those wrong in 4 of 10 runs.

ADR 0020 decided that only names differ per runtime, so it carried the Claude Code shape to Codex. That premise is false there.

## Solution

1. fx declares the model to Codex. fx-setup writes a catalog entry for the user's third-party model and a Codex profile file that points at it. The user starts Codex with `--profile fx-<provider>`. Codex then adds its own "How to use skills" trigger rules to the skill list, and offers `apply_patch` wherever the provider passes Codex's `custom` tool through.
2. The Codex render of the preamble names the absolute `SKILL.md` path of each lane. It says that reading that file is the first thing the model does, before any file in the repository. Claude Code and opencode renders do not change by a byte.
3. A new ADR replaces ADR 0020's names-only premise for Codex, and `references/harnesses/codex.md` records the facts this work established.

Nothing is re-sent per turn, and no heredoc parsing is added.

## Approaches

- **A. Profile-scoped catalog entry, generated from Codex's own view of the model, plus a per-runtime ordering slot (chosen).** It uses Codex's supported mechanism and leaves the user's `config.toml` alone. Codex's own trigger rules land in the same message as the skill list, the slot superpowers relies on. Cost: the user has to pass `--profile`.
- **B. `model_catalog_json` at the top level of the user's `config.toml`.** One line less for the user. Rejected for two reasons. The file replaces the whole catalog (`provider.rs:396-406`, run `m1-top`: 1 model left), so every ChatGPT-login model in that home would lose its bundled metadata. And fx-setup does not edit `config.toml`.
- **C. Re-deliver the preamble at UserPromptSubmit and lane-check shell redirects.** `findings.md` measured this as v1 and v2. Rejected by the owner: it works around Codex instead of declaring the model, it repeats the preamble every turn, and redirect parsing as the main write channel is fragile.

## User Stories

1. As a Codex user on an OpenRouter model, I want Codex to tell my model that a matching skill must be used, so that fx's lanes run before any code.
2. As a Codex user, I want fx-setup to generate the catalog entry and the profile file for my configured model and print the one flag to use, so that I never hand-write Codex model metadata.
3. As a Codex user, I want fx-setup to leave my `config.toml` and any profile file it did not write untouched, so that setup cannot break my other Codex configurations.
4. As a Codex user on a model whose provider passes `custom` tools (OpenAI models on OpenRouter), I want an `apply_patch` tool, so that my writes reach fx's lane check, edit rules and journal as edits.
5. As a Codex user on a model whose provider drops `custom` tools (Anthropic models on OpenRouter), I want fx-setup's report and the harness doc to say that fx's write checks see only shell-run `apply_patch` there, so that I know what is not watched.
6. As a model running in Codex, I want the preamble to give me the absolute path of each lane's `SKILL.md` and to say that reading it comes first, so that I neither guess a path nor read the repository first.
7. As a subagent spawned in Codex, I want the same rendered preamble at SubagentStart, so that the rule binds me as it binds the controller.
8. As a Claude Code or opencode user, I want my preamble unchanged, so that this fix costs me nothing.
9. As an fx maintainer, I want the OpenRouter conformance rows to run with the same profile and catalog a user gets, so that live results describe the shipped shape.
10. As a Codex user who later changes model, I want a re-run of fx-setup to rewrite the entry it generated, so that a stale entry does not silently describe the old model.

## Implementation Decisions

**Catalog generator: one new module, one job.** Input: the entries Codex itself reports for the requested slugs (from `codex debug models`) and the slugs. Output: a `model_catalog_json` document. For each slug it does three things:
- Start from Codex's own entry for that slug. This keeps what Codex learned from the provider; OpenRouter's entry gives Haiku 4.5 a `context_window` of 200000, where the fallback says 272000 (run `m0-base`). Losing that would let auto-compaction trigger past the model's real window.
- Set `include_skills_usage_instructions: true`.
- Set `apply_patch_tool_type: "freeform"`, the only variant Codex 0.164 has (`openai_models.rs:326-328`).

If Codex has no entry for the slug, it clones the fallback `ModelInfo` field for field and says so in its result, since that entry's context window is a guess. It refuses a slug whose entry already has `include_skills_usage_instructions: true`, or whose instructions template carries its own `# Skills` section (the bundled GPT models): those already have a skill contract, and replacing it is not this module's business. It is a pure function plus a thin CLI wrapper, so fx-setup and the conformance runner call the same code.

**Scope: a profile file, never `config.toml`.** Codex 0.164 profiles are files, `$CODEX_HOME/<name>.config.toml`, selected with `--profile <name>`. The legacy `[profiles.x]` plus `profile = "x"` form is rejected at startup (run `p2-prof`). fx writes `$CODEX_HOME/fx-<provider>.config.toml`, holding one key, `model_catalog_json`, and an fx-generated marker. The catalog file sits next to it. The user's `model` and `model_provider` stay in their own `config.toml`. Ownership follows the role-planting rule (ADR 0024, fx-setup section 6): fx writes or rewrites only a file that carries its marker, and leaves any other same-named file alone and reports it.

**Which slugs.** The `model` of the user's `config.toml`, when its `model_provider` is not OpenAI's first-party provider, plus any slugs the user names to fx-setup. The catalog replaces the remote list for that profile, so any other model run under the profile falls back to Codex's fallback metadata. The report says this.

**fx-setup, Codex section.** After planting roles, it runs `codex debug models` (local, no model call; it refreshes from the provider as Codex does at every start), calls the generator, and writes the two files. It reports the files written, the refusals, any fallback-cloned entry, and the line `codex --profile fx-<provider>`. It also states the write-visibility fact for the provider (user stories 4 and 5) and keeps the existing `/hooks` trust instruction, which run `h1-trusted` showed is enough for hooks to fire in `codex exec` without the bypass flag.

**apply_patch is declared, not relied on.** For OpenAI models on OpenRouter the tool reaches the model (run `ap5-gpt-tools`), and fx's existing edit-tool path sees the writes. For Anthropic models on OpenRouter, OpenRouter drops it (run `ap4-tools`), and Codex 0.164 has no function-typed variant. There, writes go through the shell: `apply_patch` as a command, which ADR 0039's match still sees, or a heredoc, which nothing sees. No heredoc parsing is added. The new ADR records this limit, and so do `codex.md` and the fx-setup report (ADR 0024: say what fx cannot observe).

**Preamble render: one new slot.** `PREAMBLE.md`'s opening imperative gets an `{{ORDER}}` slot in place of "including before a clarifying question and before reading a single file". Claude Code, opencode and opencode-v2 render that slot as those exact words, so their output is unchanged. Codex renders it as "including before a clarifying question. That `SKILL.md` is the first file you read, before any file in the repository."

The Codex resolution clause stops saying "the runtime lists each lane's `SKILL.md` path". It names the lane directory as an absolute path, computed at render time from the installed plugin root, with fx-brainstorm as the example. It names `$fx:fx-tdd` as what the user types, not as the model's action. Nothing goes above the imperative, and the first line is unchanged (ADR 0002). The spike wording reached the injected text in 3/3 runs, and the absolute path was used in 3/3 (`a3-haiku-1..3`).

**Conformance runner.** For Codex under OpenRouter, the runner's provider setup also produces the profile file and catalog through the same generator CLI, and `live_run` passes `--profile fx-openrouter`. The runner keeps `--dangerously-bypass-hook-trust`: run `h1-trusted` against `h0-untrusted` showed that trust through `/hooks` gives the same hook behaviour, and the bypass keeps rows non-interactive.

**ADR plan.**
- **New ADR (0065): "On Codex, fx declares the model, and the preamble is rendered for how Codex loads a lane."**
  - It supersedes ADR 0020 in part: the premise that only names differ per runtime. The ordering clause becomes a per-runtime slot. "Rendered, not copied" stands.
  - It amends ADR 0039: the shell `apply_patch` match stays. It is the only write channel fx sees for providers that drop `custom` tools, and the fallback elsewhere. Heredoc writes stay unseen by decision.
  - It cites ADR 0021 (the bootstrap invokes lanes; unchanged), ADR 0022 (Codex declares), ADR 0024 (fx says what it cannot observe) and ADR 0016.
  - ADR 0020 and ADR 0039 get a "Superseded in part by 0065" or "Amended by 0065" line.
- **`references/harnesses/codex.md`**, re-measured against 0.164.0:
  - "Edits go through `apply_patch`" becomes conditional on the catalog entry and the provider.
  - A section on skill trigger rules being conditional on `include_skills_usage_instructions`, and on the remote `/models` entries for third-party providers having it off.
  - The 0.164 profile-file form.
  - Hooks fire in `codex exec` once trusted.

**What this replaces.**
- The Codex render's "before reading a single file" and its alias-path pointer.
- `findings.md`'s recommendations 1 and 2 (UserPromptSubmit re-delivery, shell-redirect lane checks), which are not adopted.
- The assumption in `codex.md` that every Codex model has `apply_patch`.

## Testing Decisions

Confirmed seams, highest first:

1. **The catalog generator's function.** This is a new seam. Inputs are Codex's entries plus slugs; output is the catalog document plus a report. Cases:
   - The flags are flipped and every other field is kept (the context window from the remote entry survives).
   - An unknown slug gets the fallback clone and is flagged.
   - Bundled-GPT-style entries are refused (skills flag on, or a `# Skills` section).
   - An empty slug list is an error, because Codex rejects an empty catalog (`config/mod.rs:2232`).
   - Prior art: `plant-roles.test.ts` (generated files, ownership marker) and `openrouter.test.ts` (setup output).
2. **`preamble.render`, the existing seam in `preamble.test.ts`.**
   - Claude Code, opencode and opencode-v2 renders are byte-identical to the 0.7.0 renders.
   - The Codex render has no "before reading a single file". It has "is the first file you read", and an absolute `SKILL.md` path that exists on disk under the plugin root.
   - The first line is the same for every harness.
   - The existing grammar checks keep passing.
3. **`providerSetup` in `openrouter.test.ts`, the existing seam.** The Codex setup produces the profile file pointing at the catalog file, and leaves `config.toml` without `model_catalog_json`.
4. **The live first-turn proof below.** It is the only seam that shows the behaviour change. It reuses `live.sh`, `with-key.sh` and `openrouter.js`, as the spike did.

A good test here checks what Codex reads: file contents and rendered text. It never checks how the generator builds them.

### Proof protocol (after implementation)

Codex 0.164.0, OpenRouter, the seed and `prompts/baseline.txt` from `/tmp/claude-1000/fx-codex`, one first turn per run. Hooks are trusted through the app-server trust step (as `/hooks` does) on every Codex run. Each run is checked from its rollout:
- the usage block is present;
- the new wording was injected;
- calls before the first lane read;
- lanes read;
- wrong-path reads;
- code files changed;
- whether a `design.md` exists;
- write channel: `apply_patch` tool, shell `apply_patch` or heredoc;
- `[fx]` lines.

| Arm | Build | Runs | Pass |
|---|---|---|---|
| A0 | fx 0.7.0, no catalog | 10 (the 6 measured + 4) | baseline: code before design 4/6 so far |
| A1 | fx 0.7.0 render, catalog entry via profile | 10 Haiku | attribution only: how much the usage block alone moves the numbers |
| A3 | the build: catalog via profile + new render | 10 Haiku | a lane entered in at least 9/10; 0 code files before a design.md in at least 9/10; 0/10 wrong-path reads |
| R1 | the build | 3 `anthropic/claude-sonnet-5.5` | no regression from e3a: brainstorm first, 0 code |
| R2 | the build | 3 `openai/gpt-6.1-sol` | no regression from e3b; `apply_patch` called as a tool on any write; the `[fx]` lane-check line on a code write |

Calls before the first lane read are reported against A0 (15 to 35) without a pass bar. The spike's 4, 14 and 15 suggest the ordering clause alone does not move Haiku. If A3 passes on code and lanes but not on ordering, the design holds and the ordering is the model's limit. If A3 fails on code before design, the remaining lever is policy: whether fx's no-design lane check refuses on Codex (ADR 0001 and 0039 make it advice today). That is the owner's decision and not part of this design.

Budget: the spike's Haiku first turns were 0.2M to 0.3M input tokens, about 90% cached. The 18 spike runs, 9 of them model calls, cost USD 0.28. Estimate: USD 2 to 3 for A0, A1 and A3, plus USD 2 to 3 for R1 and R2. The key is scanned after every run (`python3 -I`), as in the spike.

## Global Constraints

- Codex CLI 0.164.0 is the measured version. The catalog's field set follows its `ModelInfo`. `apply_patch_tool_type` accepts `freeform` only.
- fx never writes or edits the user's `config.toml`. It writes only `$CODEX_HOME/fx-<provider>.config.toml` and its catalog file, and only when they are absent or carry fx's marker.
- Claude Code, opencode and opencode-v2 preamble renders stay byte-identical to 0.7.0.
- Nothing is added above the preamble's opening imperative (ADR 0002). The preamble is sent at SessionStart and SubagentStart only, never per turn.
- No new parsing of shell text for writes. ADR 0039's `apply_patch` match is the only shell write detection.
- The OpenRouter key crosses into a run only through `with-key.sh`, never as a variable or a file written outside live.sh's key file, and every live run ends with a key scan.
- No em dashes or en dashes in any text fx emits or ships.

## Out of Scope

- Making Codex or OpenRouter pass `custom` tools to Anthropic models, or adding a function-typed `apply_patch` to Codex.
- Detecting heredoc, `tee` or redirect writes.
- A per-turn preamble (UserPromptSubmit additionalContext).
- An AGENTS.md block.
- Turning the no-design lane check from advice into a refusal on Codex.
- Catalog entries for bundled OpenAI models used with a ChatGPT login: they already have a skill contract.
- Codex versions other than 0.164.0. The generator copies the entry Codex reports, so a field rename shows up as a refusal or a startup error, not a silent mismatch.

Anti-goals: a profile that silently drops the user's other models' metadata without a word in the report. A Claude Code render that changes. A catalog that claims a context window larger than the model's.

## Open Questions

- [x] **Write visibility for Anthropic models on OpenRouter.** Deferred to the owner. With this design, fx's write checks on that path see only shell-run `apply_patch`; heredoc writes are unseen, and protection against code before design rests on the skill contract plus the preamble. Without a decision, the design ships with that limit stated in the ADR, `codex.md` and the fx-setup report, and arm A3's code-before-design count measures how much it matters. Decided 2026-10-28: the owner accepted shipping with this limit stated.

## Further Notes

Evidence index (`CX:` is `codex-rs/` at `rust-v0.164.0`; runs under `/tmp/claude-1000/fx-codex/spike/runs/`):

- **Usage block conditional on the flag:** `CX:ext/skills/src/fragments.rs:21-33`. Rendered 0 times without a catalog (`p0-base`), 1 time with one (`p1-top`) and 1 time with a profile file (`p3b-prof`).
- **The catalog replaces the remote fetch:** `CX:model-provider/src/provider.rs:396-406`. `m0-base` lists 471 models with Haiku's `include_skills_usage_instructions` false and `apply_patch_tool_type` null; `m1-top` lists 1 model with both set.
- **Profile files:** `CX:config/src/loader/mod.rs:131` and `CX:core/src/config/mod.rs:270`; the legacy form is rejected at `:3498` (`p2-prof`).
- **apply_patch:**
  - `ap3-proxy`: 5 requests carried `('custom', 'apply_patch')` and got HTTP 200. Haiku called `exec_command {"cmd": "apply_patch \"*** Begin Patch ..."}`.
  - `ap4-tools`: Haiku's own tool list has no apply_patch.
  - `ap5-gpt-tools`: GPT's list has `functions.apply_patch`.
  - `ap2-function`: "unknown variant `function`, expected `freeform`".
- **Hooks:** `h1-trusted`, all 7 fx hooks `untrusted` then `trusted`, preamble present without the bypass flag. Control `h0-untrusted`, preamble absent.
- **Live arm:** `a3-haiku-1..3`, fx-brainstorm 3/3, 0 files 3/3, absolute path 3/3, 4/14/15 calls before the lane. a3-1's first message: "I'll start by exploring the repo structure to understand the codebase and then use the appropriate lane".
- **Codex's usage text and fx:** no conflict on the first action. Watch "Do not carry skills across turns unless re-mentioned" in multi-turn rows (`research/experiments.md`, Q3).
