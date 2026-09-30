# OpenCode v2 as its own harness, and live proof through OpenRouter

**Date:** 2026-10-01
**Status:** draft, awaiting owner review
**Glossary:** harness (a runtime fx targets: `claude-code`, `codex`, `opencode`, now `opencode-v2`), preamble, guard (`lib/git-guard.js` `inspect`), lane check, live row, free row.

## Problem

fx does not load on OpenCode 2.x at all. Measured on 2.0.18
(2026-09-30): the plugin loader logs `PluginModule.LoadError: Plugin must
export a default definition with an id and an effect or setup function`
for `plugins/fx.js`, which exports a named 1.x function. So on 2.x there is
no preamble, no guard, no lane check, no fx agents and no fx commands.
Conformance free row 09 was the first check to notice (`opencode debug
skill` no longer exists). The nightly CI's opencode `@latest` entry now
installs 2.x, so it has been red for the same reason.

Separately, fx's live conformance rows depend on a local llama-server that
is often down, so OpenCode live results are pending on both versions and
Codex live rows have never run.

## Decisions (owner, 2026-09-30 and 2026-10-01)

- D1. Support both OpenCode 1.x and 2.x.
- D2. As **separate harnesses**: `opencode` (v1, unchanged except its own
  fixes) and `opencode-v2` (new). A fix to one never depends on the other.
- D3. The v2 guard in layers; `INSTALL.md` states exactly which forms v2
  catches. No new npm dependency.
- D4. Live proof through OpenRouter: `qwen/qwen3.8-27b:free` first,
  `deepseek/deepseek-v4-flash` as fallback, for OpenCode v1, OpenCode v2
  and Codex.

## Sources

Every v2 fact below is from the source at tag `v2.0.18` (clone in the
session scratchpad), the published v2 docs (opencode.ai/v2/docs: plugins,
agents, skills, commands, permissions, policies, instructions, tools,
providers), or a live probe on the installed 2.0.18. Facts that only a live
probe can settle are marked **probe** and owned by task 01 of the plan.

- Plugin module: `export default { id, setup(ctx) }` (or `effect`); named
  exports ignored (`packages/core/src/plugin/module.ts:55-68`). The docs'
  plugins page documents loading only (`plugins` config key, plural;
  auto-discovery in `~/.config/opencode/plugins/` and
  `.opencode/plugins/`).
- Registration is imperative through `ctx`: `ctx.agent.transform`,
  `ctx.skill.transform`, `ctx.command.transform`, `ctx.tool.hook`,
  `ctx.session.hook`, `ctx.permission.hook`. There is no `config` hook.
- Preamble: `ctx.session.hook('context', ev => ev.system.push({ type: 'text', text }))`,
  per model request; subagents are ordinary sessions (**probe**: does it
  reach a subagent).
- Tools: the shell tool is `shell`; file tools `edit`, `write`, `patch`
  (docs, tools page). `ctx.tool.hook('execute.before', ev)` with a mutable
  `ev.input`; a thrown error in the Promise API becomes a defect, not a
  clean refusal (**probe**).
- Permissions: `[{ action, resource, effect }]`, last match wins; actions
  include `shell`, `edit`, `skill`, `subagent`, `external_directory`.
  `ctx.permission.hook('evaluate', ev)` can set `ev.effect = 'deny'` and a
  message (**probe**: is the full shell command in `ev.resources`).
- Policies: `experimental.policies`, statements
  `{ action: 'permission', resource: 'shell:git push *', effect: 'deny' }`;
  binary, only tighten, apply after agent rules, fail with "Blocked by
  configuration policy".
- Agents: Markdown in `agents/<name>.md` with frontmatter `description`,
  `mode`, `model`, `permissions` (rule list), `hidden`; body is the system
  prompt. Subagents dispatch through the `subagent` tool; depth is
  `experimental.subagent_depth` (source only, **probe**).
- Skills: auto-discovered from `~/.config/opencode/skills` and others;
  config key `skills: string[]`. A `{action: 'skill', resource: <name>,
  effect: 'deny'}` rule hides and rejects a skill.
- Commands: Markdown in `commands/` with `description`, `agent`, `model`;
  body is the template; `$ARGUMENTS`.
- Instructions: v2 reads `AGENTS.md`; the `instructions` key is not
  resolved yet. Not relied on.
- CLI: `opencode debug agents` (needs the managed service; slow in a
  scratch home), `opencode api --standalone skill.list`.
- One config directory and one npm package (`opencode-ai`) serve both
  majors, so one machine runs one major at a time.

## 1. The `opencode-v2` harness

New files, none shared with v1 except pure `lib/` functions:

- `plugins/fx-v2.js`: `export default { id: 'fx', setup }`. `setup(ctx)`:
  - renders the preamble with `render({ harness: 'opencode-v2', cwd: ctx.location.directory })`
    and pushes it in `session.hook('context')`, for sessions and subagents;
  - registers the six fx agents with `ctx.agent.transform`, built by a new
    `toOpencodeV2Agent(md, { referencesDirs })` in `lib/agent-dialects.js`
    (`system`, `mode: 'subagent'`, `description`, `permissions` as a rule
    list with `*` denied first). `toOpencodeAgent` is unchanged;
  - registers the guard and lane check (§2);
  - denies the five user-invoked skills with `skill` rules, and registers
    their commands from `opencodeCommands` (unchanged) through
    `ctx.command.transform`, or through generated command files if the
    transform API cannot take a template (**probe**);
  - sets nothing the user already set (ADR-0026 applies).
- `lib/preamble.js`: an `opencode-v2` entry in `HARNESSES` and `ADDRESSING`
  (skill tool `the \`skill\` tool`, dispatch through the `subagent` tool,
  no plugin prefix). `lib/preamble.test.js`'s pinned list gains it.
- `references/harnesses/opencode-v2.md`: tool vocabulary (`shell`, `edit`,
  `write`, `patch`, `subagent`, `skill`), permissions, subagent dispatch,
  and what fx cannot observe on v2 (ADR-0024).
- Installer: `scripts/fx-opencode-install` gains a version check
  (`opencode --version`, overridable with `--major 1|2`). On 1.x it does
  exactly what it does today. On 2.x it links `plugins/fx-v2.js`, generates
  v2-format agents and commands, writes `experimental.subagent_depth` and
  the guard policies (§2) into `opencode.json` under keys it owns, and
  removes a v1 `plugins/fx.js` link it placed earlier (and the reverse on
  1.x), so the plugin that cannot load on the running major is never left
  behind. Its refusal markers stay; the generated header names the major.

v1 changes, each justified by a v1 fault, not by v2:
- CI and `tests/gates/ci-pins.test.js`: the v1 `latest` matrix entry pins
  `opencode-ai@1` (it now installs 2.x). `opencode-v2` gets its own `PKG`
  (`opencode-ai`), `FLOOR` `2.0.18` and matrix entries (`2.0.18`, `@latest`).

## 2. The v2 guard and lane check (D3)

Three layers, each proven or dropped by task 01's probe:

1. **Permission evaluate hook.** If `ev.resources` for `action: 'shell'`
   carries the full command text, run `inspect(command, cwd)` there and set
   `effect: 'deny'` with the guard's reason. This is the full v1 guard,
   compound and disguised forms included, with no dependency.
2. **Policies (always).** The installer writes `experimental.policies`
   denies for the absolutes a pattern can express: `git push --force*`,
   `git push -f*`, `git push * --force*`, `git push origin main*` and the
   base-branch forms, `git reset --hard*`, `git clean -f*`, `git branch -D*`,
   `git stash drop*`, `git checkout .*`, `git tag -d*`, `git push --delete*`,
   `git push * :*`, and `* --no-verify*`. The exact list is derived from
   `lib/git-guard.js`'s refusals in the plan.
3. **Tool hook.** `tool.hook('execute.before')` throwing, only if the probe
   shows a throw refuses the call cleanly (the turn continues and the model
   sees the reason).

Fail-closed rule: if the guard cannot load, layer 1 denies every shell
call with the reason, as v1 does. Layer 2 does not depend on the plugin.

Lane check (advice-class, fail open): through whichever of layers 1 or 3
the probe proves, on `edit`, `write` and `patch`. If neither works, v2 has
no lane check and `INSTALL.md` says so.

`INSTALL.md` states, per layer, what v2 catches and what it does not.

## 3. Live proof through OpenRouter (D4)

`tests/conformance/lib/live.sh` gains a provider switch,
`FX_LIVE_PROVIDER=openrouter` (default stays `llamacpp`, so nothing changes
for anyone not opting in):

- **Key:** read from `OPENROUTER_API_KEY` in the environment only; never
  written into the repo, a transcript copy, or a log. Row logs are grepped
  for `sk-or-` before they are kept; a hit fails the row.
- **Model:** primary `openrouter/qwen/qwen3.8-27b:free`, fallback
  `openrouter/deepseek/deepseek-v4-flash`. The fallback is used only when a
  row's failure is a provider error (HTTP 429, 5xx, "Insufficient
  credits", timeout before the first token). A capability failure is
  re-run once on the same model and both results are recorded, as
  `tests/conformance/README.md` already requires. Each row's result line
  names the model it ran on.
- **OpenCode v1:** provider entry `provider.openrouter` in the scratch
  `opencode.json` (the v1 provider format), key from the environment.
- **OpenCode v2:** `providers.openrouter` with the key from the
  environment (v2 providers docs).
- **Codex:** a scratch `config.toml` with `model_provider = "openrouter"`,
  `base_url = "https://openrouter.ai/api/v1"` and command auth
  `sh -c 'echo $OPENROUTER_API_KEY'` (OpenRouter's Codex guide); measured
  working on Codex 0.155.1 with DeepSeek, 2026-09-30.
- Claude Code live rows keep their own auth; not in scope.

## 4. Conformance for `opencode-v2`

- `tests/conformance/run.sh` and `tests/install/run.sh` accept
  `opencode-v2`; `tests/conformance/lib/events.js` gets a v2 parser for
  `opencode run --format json` output (format **probe**);
  `tests/conformance/lib/jail.sh` binds the v2 binary.
- Rows that branch on the harness get an `opencode-v2` case: 03, 05, 09,
  11, 12, 13, 14, 15, 18. Row 09 uses `opencode api --standalone
  skill.list` and the agent registry. Row 15 checks the `subagent` tool and
  `experimental.subagent_depth`.
- `tests/gates/opencode-v2-plugin.test.js`: `setup` driven with a stub
  `ctx` that records every transform and hook, asserting the preamble,
  agents, skill denies, commands, guard and lane-check behaviour. The v1
  gate is unchanged.
- `scripts/check-all`: `install-opencode-v2`, `conformance-free-opencode-v2`,
  the new gate. `scripts/test-scope` routes `plugins/fx-v2.js` to the new
  gate.

## 5. Docs and ADRs

- `INSTALL.md`: an OpenCode v2 section (install, verify, what the guard
  catches per layer, what fx cannot observe), and the verified table gains
  `opencode-v2` and the Codex live row. README and SURFACE list four
  harnesses.
- ADR-0036: OpenCode v2 is a separate harness (D2), with the shared config
  directory and the version-aware installer.
- ADR-0037: the v2 guard layers and what each catches (D3).
- ADR-0038: live conformance through OpenRouter, the fallback rule, and key
  handling (D4).

## 6. Order of work

1. **Probe (task 01):** on 2.0.18 with a scratch home and OpenRouter:
   the layer-1 resource content, a tool-hook throw, `session.hook` reaching
   a subagent, `command.transform` taking a template, `subagent_depth`,
   `opencode run --format json` output shape, and `debug agents` timing.
   Findings recorded in the plan directory; later tasks read them. A probe
   that fails changes the matching section's fallback, recorded as a
   ruling.
2. Harness core: preamble entry, reference, `toOpencodeV2Agent`,
   `plugins/fx-v2.js`, its gate.
3. Guard and lane check per the probe.
4. Installer.
5. Conformance plumbing and rows.
6. OpenRouter provider in `live.sh`.
7. CI pins.
8. Docs and ADRs.
9. Live matrix: OpenCode 1.18.25, OpenCode 2.0.18, Codex 0.155.1.

## 7. Verification

- Gate tests for every new file; `scripts/check-all` once at the end.
- Free rows for `opencode` and `opencode-v2`.
- Live rows through OpenRouter on all three, each row's model recorded;
  the results replace "pending" in `INSTALL.md`.
- The v1 harness's own results must not change except where a v1 fault is
  fixed (the CI pin).

## Open questions

- [x] Keep v1 → yes (D1)
- [x] One harness or two → two (D2)
- [x] v2 guard → layers, stated coverage (D3)
- [x] Live proof → OpenRouter, free Qwen then DeepSeek (D4)
- [x] Codex live → included, OpenRouter (D4)
- [ ] Everything marked **probe** → task 01
