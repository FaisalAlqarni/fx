# Prior art: shipping one plugin to several AI coding harnesses

Sources: fresh clones read directly.

- ponytail: `github.com/dietrichgebert/ponytail`, cloned to a mktemp directory, HEAD at commit e3ba2aa (full hash e3ba2aa6f1e6f0bc4d69eb09c9f0d0a93af56156 in full), dated 2026-09-14.
- caveman: `github.com/JuliusBrussee/caveman`, cloned to a mktemp directory, HEAD at commit ae26f3a (full hash ae26f3a4775574bd49dc8bdb61c0287bbc3cd268 in full), dated 2026-09-20.

All paths below are relative to each repo's own root as cloned. Local read-only installs at `/home/faisal/.claude/plugins/cache/ponytail/` and `/home/faisal/.claude/skills/caveman/` were checked but hold only a subset of files (the plugin cache copy and the skill copy respectively), not the harness-specific files the questions ask about, so the clones are the citation source throughout.

## Ponytail (dietrichgebert/ponytail)

### 1. File layout per harness

Ponytail ships one manifest or rule file per harness at the repo root, all pointing at a shared `hooks/` and `skills/` directory:

- `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` for Claude Code. The plugin manifest sets `"hooks": "./hooks/claude-codex-hooks.json"`.
- `.codex-plugin/plugin.json` for Codex, also pointing `"hooks"` at the same `./hooks/claude-codex-hooks.json` file and `"skills"` at the same `./skills/` directory as Claude.
- `hooks/claude-codex-hooks.json`, a single hooks file loaded by both Claude Code and Codex (see below).
- `opencode.json` at the repo root registering `.opencode/plugins/ponytail.mjs`, plus `.opencode/command/*.md` for slash commands.
- `AGENTS.md` at the repo root, read natively by Codex, opencode, Qoder, and the VS Code Codex extension.
- `gemini-extension.json`, which sets `"contextFileName": "AGENTS.md"` so the Gemini CLI extension reuses the same file rather than shipping a separate one.
- `plugin.yaml` for Hermes Agent (`provides_hooks`, `provides_commands`, `provides_skills`).
- `.devin-plugin/plugin.json`, `.grok-plugin/marketplace.json`, `.qoder-plugin/plugin.json`, `.github/plugin/plugin.json` and `.github/plugin/marketplace.json` (Copilot), one manifest per remaining marketplace-style host.
- Instruction-file-only hosts get a checked-in copy of the same rule text: `.cursor/rules/ponytail.mdc`, `.windsurf/rules/ponytail.md`, `.clinerules/ponytail.md`, `.kiro/steering/ponytail.md`, `.qoder/rules/ponytail.md`, `.agents/rules/ponytail.md`, `.github/copilot-instructions.md`.
- `.openclaw/skills/ponytail*/SKILL.md`, a build output generated from `skills/*/SKILL.md` by `scripts/build-openclaw-skills.js` for OpenClaw's ClawHub distribution.

A CI-run script, `scripts/check-rule-copies.js`, diffs every one of those rule-file copies against `AGENTS.md` (with per-host frontmatter stripped) and fails the build if any copy has drifted, which keeps "one manifest per harness" from becoming "one ruleset per harness that silently forks."

### 2. Hooks per harness

Claude Code and Codex load the exact same file, `hooks/claude-codex-hooks.json`, wiring `SessionStart`, `SubagentStart`, and `UserPromptSubmit` to three Node scripts (`hooks/ponytail-activate.js`, `hooks/ponytail-subagent.js`, `hooks/ponytail-mode-tracker.js`). Cursor, GitHub Copilot, Grok, and Qoder also invoke the same activation script through their own hook wiring (Cursor via `scripts/cursor-hooks.js install`, which merges entries into `~/.cursor/hooks.json`; Qoder via a copy of `hooks/qoder-hooks.json` the user adds to `.qoder/settings.json`).

`hooks/ponytail-activate.js` is one script that runs under every one of those hosts. Harness detection lives in `hooks/ponytail-runtime.js` and is entirely environment-variable based, resolved in this order:

- `isCopilot`: `process.env.COPILOT_PLUGIN_DATA` is set, or `CLAUDE_PLUGIN_ROOT` contains an `agent-plugins` segment under a `.vscode` path (VS Code Copilot sets neither `COPILOT_PLUGIN_DATA` nor a distinct signal, so the fallback matches on the install path shape, a workaround recorded against issue 528 with a trailing note).
- `isCodex`: `process.env.PLUGIN_DATA` is set and Copilot was already ruled out.
- `isQoder`: `process.env.QODER_SESSION_ID` is set and neither of the above matched.
- `isCursor`: `process.env.CURSOR_VERSION` is set and none of the above matched. The code comment explains the ordering is deliberate: Cursor sets `CURSOR_VERSION` only in hook-process environments, but it also sets it when it happens to run a Claude-format plugin's hooks next to `CLAUDE_PLUGIN_ROOT`, so Cursor detection has to come last.

Once the harness is known, `writeHookOutput()` shapes the same instruction text into the four different JSON payload conventions each host expects: Copilot gets `{ additionalContext }` only on `SessionStart`; Codex gets `{ systemMessage, hookSpecificOutput: { hookEventName, additionalContext } }`; Qoder gets `hookSpecificOutput` without the `systemMessage` field; Cursor gets `{ additional_context }` (snake_case) plus `continue: true` on `UserPromptSubmit`; native Claude gets raw stdout text on `SessionStart` but must use the `hookSpecificOutput` wrapper on `SubagentStart` or the context is silently dropped. All of this lives in one file, `hooks/ponytail-runtime.js`, rather than one file per harness.

Grok Build is the one exception the code documents rather than works around: README.md states plainly that "Grok lifecycle hooks are not used because their SessionStart output cannot inject instructions," so Grok gets the AGENTS.md-equivalent path (skill descriptions) instead of a hook.

### 3. Always-on context

The canonical ruleset lives in `skills/ponytail/SKILL.md`. `hooks/ponytail-instructions.js` reads that file and filters it down per intensity level before emitting it: `filterSkillBodyForMode()` strips frontmatter, then drops every markdown table row and worked example whose label names a mode other than the active one, so a session running `full` never receives the `lite` and `ultra` example text. This filtering is the deliberate size control: the function comment explains it distinguishes a genuine rule bullet from a labeled worked example so filtering never silently drops ordinary prose that happens to start with a mode word.

`AGENTS.md` at the repo root (read by Codex, opencode, Qoder, and Gemini via `gemini-extension.json`'s `contextFileName`) is a separate, much shorter document, about 2.6 KB of plain text, ending with the line "(Yes, this file also applies to agents working on the ponytail repo itself. Especially to them.)" A CI check (`scripts/check-rule-copies.js`) keeps every host-specific rule-file copy byte-identical to this file (frontmatter aside), which functions as the size discipline: there is exactly one long-form source (the SKILL.md, filtered per mode) and one short-form source (AGENTS.md, copied verbatim), and nothing in between is allowed to drift.

README.md documents the OpenCode adapter as loading both: "OpenCode also auto-loads this repo's `AGENTS.md`, so the rules hold even without the plugin," while the plugin itself injects the fuller, mode-filtered SKILL.md body through `experimental.chat.system.transform`.

### 4. Codex specifically

Codex is treated as a first-class target sharing the Claude Code plumbing rather than a bolted-on adapter: `.codex-plugin/plugin.json` points `"skills"` at the same `./skills/` directory Claude uses and `"hooks"` at the same `./hooks/claude-codex-hooks.json` file, and `isCodex` detection in `hooks/ponytail-runtime.js` gates on `process.env.PLUGIN_DATA`. Codex's `writeHookOutput()` branch additionally sets `systemMessage: "PONYTAIL:" + mode.toUpperCase()` alongside `hookSpecificOutput.additionalContext`, a Codex-specific field the other hosts do not receive.

README.md documents the install as `codex plugin marketplace add DietrichGebert/ponytail` followed by `codex plugin add ponytail@ponytail`, then instructs the user to run `codex`, open `/hooks`, and "review and trust its two lifecycle hooks" before starting a new thread, a manual trust step Claude Code does not require. The same section notes that installing the Codex plugin also covers the Codex desktop app, which "picks up the plugin" after a restart. Commands are documented as invoked with `@` under Codex ("In Codex they're skills, invoke with `@` (`@ponytail-review`)"), unlike Claude Code's `/` slash-command convention.

No `agents/openai.yaml` or comparable Codex-only role file exists in ponytail; ponytail's Codex support is entirely the shared `.codex-plugin/plugin.json` plus the shared hooks file plus `AGENTS.md`.

### 5. opencode specifically

`.opencode/plugins/ponytail.mjs` is the opencode plugin. Its shape:

- `config` hook: reads `.opencode/command/*.md`, parses each with `ponytail-frontmatter.cjs`, and registers it under `config.command[name]`; also pushes ponytail's `skills/` directory onto `config.skills.paths`.
- `experimental.chat.system.transform`: on every turn, reads the persisted mode and appends `getPonytailInstructions(mode)` to the outgoing system prompt (or pushes it as a new system entry if none exists yet). This is the same instruction builder Claude and Codex use, imported from the CommonJS `hooks/ponytail-instructions.js` via `createRequire`, so opencode is not a separate ruleset source.
- `command.execute.before`: intercepts `/ponytail <level>` and persists the mode to a state file at `$XDG_CONFIG_HOME/opencode/.ponytail-active` (or `~/.config/opencode/.ponytail-active`), since opencode has no flag-file convention of its own.

There is no separate skill-based subagent role file for opencode; opencode agents pick up the shared `skills/` directory through the `config` hook, and permission-scoping is left entirely to opencode's own config, not touched by ponytail's plugin code.

### 6. What they avoid or document as unsupported

README.md's per-host install sections are explicit about limitations rather than silent about them:

- Cursor: "Cursor's `subagentStart` cannot inject context, so subagents run without the ruleset, and cloud agents never fire `sessionStart`." Also, the always-on rule file (`.cursor/rules/ponytail.mdc`) and the hooks-based install are documented as mutually exclusive: `hooks/ponytail-runtime.js`'s `cursorRulePath()` detects the rule file and, when present, the activation hook injects nothing further and mode-switch commands answer with a notice instead of acting, so the user is told to delete the rule to hand control back to the hooks (tracked against issue 817 in the tracker).
- Grok Build: lifecycle hooks are not used at all, "because their SessionStart output cannot inject instructions"; ponytail relies on Grok's own skill auto-invocation instead.
- GitHub Copilot CLI fallback mode: reading `AGENTS.md` "keeps always-on guidance, but does not add plugin mode switches or hooks."
- VS Code Copilot needed a dedicated detection fallback (`isVsCodeCopilotRoot()`) because it never sets `COPILOT_PLUGIN_DATA`, tracked against issue 528; without the fallback ponytail misidentified the host as native Claude Code and emitted an irrelevant statusline nudge.
- Gemini CLI: "The Gemini adapter intentionally does not ship a root `hooks/hooks.json`: Gemini auto-loads that path, while Ponytail's lifecycle hooks use Claude/Codex event names," so a same-named file would be picked up by Gemini and misinterpreted.
- Commands generally: "Commands need a skill-capable host... Cursor with the hooks install gets `/ponytail` level switching only, typed as a plain message. The instruction-only adapters (Cursor's rule file, Windsurf, Cline, Copilot, Kiro, Antigravity) load the always-on ruleset without the commands."

GitHub's live issue tracker corroborates the same class of problem outside the code comments: issue 821 ("SessionStart on compact makes Codex greet like a new session," open), issue 798 ("ZCode: SessionStart rules never injected, raw-text stdout fails," open), issue 791 and issue 790 (Windows-specific hook timing and flashing-console-window problems, both open), and issue 763 ("UserPromptSubmit hook runs 31 to 39 seconds despite timeout 5," open). Issue 817, cited above from the code comments, is closed and shipped as the Cursor-rule-versus-hooks precedence fix. Issue 764, "Ponytail skill may trigger false-positive Invalid prompt," is also closed.

### 7. Tests

`.github/workflows/test.yml` runs on push and pull request: it installs Node 22 and Python 3.12, installs the `ponytail-mcp` package's dependencies, then runs three checks in sequence: `scripts/check-rule-copies.js` (the drift check described above), `scripts/check-versions.js` (manifest version consistency across the many per-harness files), and `npm test`.

`npm test` runs the files under `tests/`, about 2070 lines total across `tests/hooks.test.js`, `tests/cursor-hooks.test.js`, `tests/copilot-plugin.test.js`, `tests/gemini-extension.test.js`, `tests/grok-plugin.test.js`, `tests/hermes-plugin.test.js`, `tests/opencode-plugin.test.js`, `tests/qoder-plugin.test.js`, `tests/openclaw-skills.test.js`, and others, one file per harness adapter. `tests/hooks.test.js` is a conformance test in the literal sense: it spawns the real hook scripts as child processes (`spawnSync`) with each harness's real environment variables set (`PLUGIN_DATA` for Codex, `COPILOT_PLUGIN_DATA` for Copilot, `CURSOR_VERSION` and `CURSOR_PROJECT_DIR` for Cursor, `QODER_SESSION_ID` for Qoder) and asserts on the JSON each branch of `writeHookOutput()` actually produces, rather than mocking the detection layer. The file's own comments explain why the base environment is scrubbed before each run: "A leaked subagent matcher would scope the inject-into-every-subagent assertions," and a stray `CURSOR_VERSION` from a Cursor-hosted terminal running the test suite would otherwise steer every case into the wrong branch (issue 817 again).

No workflow in `.github/workflows/` installs a real Codex, Cursor, or opencode binary; verification is by simulated environment plus a byte-level content check across the rule-file copies, not by running inside the real hosts.

## Caveman (JuliusBrussee/caveman)

Caveman is a much larger repository (a compression engine, a proxy, SDKs, a browser extension, and more), but the plugin-distribution layer that answers these questions is concentrated in a small set of paths: `.claude-plugin/`, `.codex/`, `plugins/caveman/`, `src/hooks/`, `src/plugins/opencode/`, `src/rules/`, `AGENTS.md`, `GEMINI.md`, `INSTALL.md`, and `CLAUDE.md`'s own "Agent distribution" section, which is written as an internal reference table and doubles as documentation of the whole scheme.

### 1. File layout per harness

- `.claude-plugin/plugin.json`, Claude's plugin manifest, with the `SessionStart` and `UserPromptSubmit` hooks defined inline in the manifest's own `"hooks"` object rather than pointed at a separate hooks file.
- `.claude-plugin/marketplace.json`, the marketplace listing.
- `.codex/hooks.json` and `.codex/config.toml` at the repo root: a Codex-specific hooks file plus `[features] hooks = true` to opt the repo into Codex's hook system.
- `plugins/caveman/.codex-plugin/plugin.json`, a second, independent Codex plugin manifest (version 0.1.0, distinct from the root Claude plugin's version 2.7.0 line) that points `"skills"` at `plugins/caveman/skills/`.
- `plugins/caveman/skills/caveman/agents/openai.yaml`, a Codex-only interface descriptor (`display_name`, `icon_small`, `icon_large`, `default_prompt`) that names the skill as `$caveman` in its default prompt text, matching the task's mention of a `$name` convention.
- `src/plugins/opencode/plugin.js` plus `src/plugins/opencode/commands/*.md`, opencode's plugin and slash commands, installed by `bin/install.js` into `~/.config/opencode/plugins/caveman/`.
- `AGENTS.md` and `GEMINI.md` at the repo root. Note: this repo's own root `AGENTS.md` is the maintainer's internal cross-repo routing file (it names other private repos on the maintainer's machine) and is not the payload shipped to end users; the payload the installer copies is `src/rules/caveman-activate.md`, and INSTALL.md points to that file directly, quote: "For agents without hook systems, the always-on snippet lives in `INSTALL.md`'s Want it always on section, keep current with `src/rules/caveman-activate.md`."
- `src/rules/caveman-openclaw-bootstrap.md`, a marker-fenced snippet appended into OpenClaw's `SOUL.md`.
- A single Node installer, `bin/install.js`, backed by a `PROVIDERS` array (one entry per host, with `id`, `label`, `mech`, `detect`, and optional `profile`/`soft` fields) that is, per `CLAUDE.md`, "single source of truth, no more bash/PS1 dual-source drift." `install.sh` and `install.ps1` are documented as 30-line shims that forward to it.
- For hosts covered by the upstream `vercel-labs/skills` tool rather than by `bin/install.js` directly (Cursor, Windsurf, Cline, Copilot, Kilo Code, Roo Code, and about twenty more), caveman does not maintain its own per-host manifest at all; it delegates to `npx skills add ... -a <profile>`.

### 2. Hooks per harness

Unlike ponytail, Claude Code and Codex do not share a hooks file in caveman. Claude's three hooks (`SessionStart`, `UserPromptSubmit`, plus the statusline script wired through `settings.json`) are backed by full Node modules: `src/hooks/caveman-activate.js` (427 lines), `src/hooks/caveman-mode-tracker.js` (432 lines), and a shared `src/hooks/caveman-config.js` (811 lines) that both depend on for mode resolution, session-scoped state, and a symlink-safe `safeWriteFlag()`.

Codex's hook, defined in `.codex/hooks.json`, is a single inline shell command: `echo 'CAVEMAN MODE ACTIVE. Rules: Drop articles/filler/pleasantries/hedging...'`, a hardcoded, much shorter ruleset with no reference to `caveman-config.js`, no session-scoping, and no mode persistence. It is a separate, independently maintained string rather than the output of the shared instruction builder. This is the clearest structural difference from ponytail's single-script, env-var-detected design: caveman gives Claude the full-featured implementation and gives Codex a static fallback string.

opencode gets a third, independent implementation: `src/plugins/opencode/plugin.js` (277 lines long). It does reuse `caveman-config.js` and `caveman-parse.js` for mode-state logic, but not via `require()`: the file's own comment explains that opencode runs plugins inside a compiled Bun binary where `require()` of on-disk files is rejected and `await import()` of a CommonJS file yields an empty namespace, both of which silently broke the plugin (tracked as a follow-up to issue 418 in the tracker). Its workaround, `loadConfig()`, reads the sibling file's source as text and evaluates it by hand with `new Function(module, exports, require, __dirname, __filename, code)`, using a `createRequire` scoped only to Node built-ins. The plugin hooks into opencode's `event` dispatcher (filtering for `event.type === 'session.created'`) rather than a `session.created`-named plugin key, because, per the same comment, "opencode does NOT support `session.created` or `tui.prompt.append` as named plugin-hook keys... the old direct-key handlers were silently ignored," a bug documented against issues 418 and 421.

Every hook entrypoint, across all three implementations, follows one documented convention recorded in `CLAUDE.md`: "Any entrypoint that reads a host hook payload from stdin returns on the first complete JSON object, never at EOF," because on Windows the host's pipe close can lag arbitrarily (issues 729, 833, and 949 are all cited against this). `caveman-activate.js` and `caveman-mode-tracker.js` implement this with a per-chunk JSON parse plus a 2000ms watchdog timer rather than waiting for stream close.

### 3. Always-on context

The canonical ruleset is `skills/caveman/SKILL.md`, about 7.1 KB. `AGENTS.md` and `GEMINI.md` at the repo root are not separate hand-written summaries the way ponytail's `AGENTS.md` is; caveman's `AGENTS.md` and `GEMINI.md` each consist of a short routing preamble followed by four `@./skills/<name>/SKILL.md` include directives, so the "small" file is really a pointer into the full skill bodies rather than a filtered digest.

Size discipline is documented for hosts with hard caps rather than for the SKILL.md itself. `CLAUDE.md`'s file-structure table states that `src/rules/caveman-openclaw-bootstrap.md` "must include the SENTINEL `Respond terse like smart caveman` and stay well under OpenClaw's 12K-per-bootstrap-file cap," and the Agent distribution table separately notes OpenClaw's SOUL.md injection is "subject to OpenClaw's 12K-per-file / 60K-total bootstrap caps." No equivalent numeric budget is documented for Claude, Codex, or opencode; those hosts receive the full SKILL.md content on each session start with no filtering by mode, which is a real design difference from ponytail's per-mode table-row filtering.

opencode's always-on layer is explicitly split from its dynamic layer. The plugin file's own header comment: "The always-on caveman ruleset is provided separately via `~/.config/opencode/AGENTS.md` (Tier-3 base). This plugin handles dynamic state only: flag writes, slash-command parsing, natural-language activation, and per-turn reinforcement," so the persistent context and the runtime mode machinery are two different install artifacts for the same host.

### 4. Codex specifically

Codex support is spread across three artifacts that do not obviously reference one another: the root `.codex/hooks.json` (the hardcoded echo hook described above), `.codex/config.toml` (`[features] hooks = true`), and the independent `plugins/caveman/.codex-plugin/plugin.json` plus its `plugins/caveman/skills/caveman/agents/openai.yaml`. `INSTALL.md`'s per-agent table lists the Codex CLI install path as `npx skills add JuliusBrussee/caveman -a codex -g`, i.e. the same upstream `vercel-labs/skills` delegation used for most of the long tail of hosts, with activation marked "Per-session: `/caveman`" rather than automatic. `CLAUDE.md`'s Agent distribution table separately claims Codex auto-activates "on macOS/Linux" via the `.codex/hooks.json` `SessionStart` hook, which is a different install path (repo-local hooks) from the `npx skills add` path INSTALL.md documents; the two are not reconciled in the text and appear to be alternative, not layered, install routes.

Live issues corroborate that Codex integration has been an active source of regressions distinct from the other hosts: issue 1051 ("Caveman Causing codex config.toml to stop working," closed), issue 1045 ("Codex integration pack v2.2.0: base_url missing /v1, and chatgpt-auth tokens sent to platform API cause 401 missing scope api.responses.write," closed), issue 1092 ("Regression: Codex trial with ChatGPT OAuth selects /w/codex/v1 and fails api.responses.write," closed), issue 1037 ("Codex re-prompts for already-approved commands after Caveman shrink rewrite," closed), and, still open, issue 1097 ("agent-drift: codex, installed 0.155.1 exceeds pinned 0.155.0") and issue 1053 ("Codex Desktop ChatGPT Responses requests omit tools; standalone subscription compression cannot prove MCP recovery").

### 5. opencode specifically

Covered structurally under Q2 and Q3 above. On permissions and subagent tool access specifically: caveman's opencode plugin does not touch opencode's own permission or agent-role configuration at all; it registers commands (`config.command`), adds a skills path (`config.skills.paths`), and injects text into the system prompt (`experimental.chat.system.transform`). `CLAUDE.md`'s Agent distribution table states opencode "reaches Tier 1 minus the statusline (opencode's TUI has no plugin-writable badge)," and that the mode flag is written to `~/.config/opencode/.caveman-active` "for any external tooling that wants to surface it," i.e. no opencode-specific statusline integration exists, unlike Claude's `settings.json`-wired `statusLine.command`.

A live regression specific to this host: issue 1081, "caveman learn doesn't work on OpenCode 1.18.31" (open), and issue 1083, "OpenCode 2: generated native plugin uses incompatible V1 API" (closed), both post-date the code read here and describe the same opencode-plugin-API-surface fragility the `loadConfig()` workaround above was already compensating for.

### 6. What they avoid or document as unsupported

`CLAUDE.md`'s "Agent distribution" table (`CLAUDE.md`, the "How caveman reaches each agent type" section) is the single most direct answer to this question; it is written as an internal reference and states plainly, per host, whether activation is automatic:

- Claude Code, Codex, Gemini CLI, and opencode: "Yes" (automatic, each through the hook or context-file mechanism described above).
- OpenClaw: "Yes," but capped by OpenClaw's own bootstrap size limits, as covered under Q3.
- Cursor, Windsurf, Cline: automatic only if the user opts into `--with-init`, which additionally writes a per-repo always-on rule file; without that flag, activation is "per-session" via the upstream skills tool.
- Copilot: automatic ("repo-wide instructions"), but only when installed with `--with-init`.
- Continue, AiderDesk, and the roughly twenty "Others" (Junie, Trae, Warp, Tabnine, Mistral, Qwen, Devin, Droid, ForgeCode, Bob, Crush, iFlow, OpenHands, Qoder, Rovo Dev, Replit, and more): explicitly "No" for auto-activation; these require the user to invoke the skill by name or slash command each session.

`INSTALL.md`'s per-agent table adds a parallel, install-command-level view of the same split and introduces the term "soft probe" for hosts the installer cannot reliably auto-detect (JetBrains Junie, Qoder, Antigravity IDE): "installer won't auto-detect these without `--only <id>` because there's no reliable always-on signal (no CLI, config-dir-only)."

`CLAUDE.md` also documents a caveman-specific measurement discipline that reads as an explicit thing they refuse to claim: the statusline section states "fixed-ratio savings estimates were removed because no measured baseline supported them," and that `/caveman-stats` "records actual Claude output/cache-read counts and mode attribution with savings unknown," adding "Gemini uses native `/stats model` and `/stats session`; never read Claude transcripts as another host's usage," i.e. a deliberate refusal to extrapolate one host's telemetry onto another.

### 7. Tests

Caveman verifies harness support two different ways, at two different rigor levels.

Ordinary unit and integration tests live under `tests/hooks/` (three files exercising `caveman-config.js`, a Windows hook-path test, and standalone-install safety) and `tests/installer/` (about 34 files, most named after a specific host: `opencode.test.mjs`, `opencode-agent.test.mjs`, `gemini-agents.test.mjs`, `gemini-install.test.mjs`, `hermes.test.mjs`, `omp.test.mjs`, `agent-registry-compile.test.mjs`, `agent-registry-drift.test.mjs`, and more). These run as part of the ordinary CI pipeline (`.github/workflows/ci.yml`).

Separately, `.github/workflows/agent-conformance.yml` runs on a nightly cron schedule (`17 4 * * *`) plus manual dispatch, and is a genuine conformance suite rather than a mock: its `pinned-upstream-binary` job installs the real, version-pinned CLI for each supported host inside a matrix, for example `npm install -g @openai/codex@0.155.0` for Codex, `npm install -g @google/gemini-cli@0.60.0` for Gemini, `npm install -g opencode-ai@1.18.31` for opencode, `npm install -g @anthropic-ai/claude-code@2.1.276` for Claude, plus Aider, Hermes, Kilo Code, and OpenClaw entries, and then exercises caveman's install and compression against that real binary. A companion job, `real-engine-contract`, first validates that the generated agent registry (`agents/agents.json` and two generated TypeScript files) is up to date and that "one pinned probe" exists in the workflow for every shipped profile, failing the build if a host is added to the registry without a matching pinned-binary job. This is a materially stronger conformance guarantee than ponytail's simulated-environment approach: caveman actually installs and runs the real Codex, Gemini, and opencode CLIs in CI, not just a script that mimics their environment variables.

## Comparison table

| Aspect | Ponytail | Caveman |
|---|---|---|
| Claude and Codex hook file | One shared file, `hooks/claude-codex-hooks.json`, referenced by both manifests | Separate: Claude's hooks are inline in `.claude-plugin/plugin.json`; Codex's are a standalone `.codex/hooks.json` |
| Harness detection | Centralized in one module, `hooks/ponytail-runtime.js`, keyed on environment variables (`PLUGIN_DATA`, `COPILOT_PLUGIN_DATA`, `CURSOR_VERSION`, `QODER_SESSION_ID`) with one shared output-shaping function | No shared detection module; each host (Claude, Codex, opencode) has its own hook implementation with no runtime host-sniffing |
| Codex ruleset content | Full mode-filtered `SKILL.md` body via the same instruction builder Claude uses | A separate, hardcoded, shorter string embedded directly in `.codex/hooks.json` |
| Always-on context size control | Deliberate: `filterSkillBodyForMode()` strips out every worked example and table row not matching the active intensity level before emitting | Not filtered by mode for Claude, Codex, or opencode; size limits are only documented for OpenClaw's SOUL.md bootstrap caps |
| Number of harnesses with a repo-committed manifest or rule file | About twenty, all generated or checked in the repo itself | A smaller core set with dedicated files (Claude, Codex twice over, opencode, Gemini, OpenClaw, Hermes), plus roughly twenty five more delegated to the upstream `vercel-labs/skills` installer |
| Single source of truth enforcement | `scripts/check-rule-copies.js`, run in CI, byte-diffs every per-host rule copy against `AGENTS.md` | `bin/install.js`'s `PROVIDERS` array plus `tests/installer/agent-registry-drift.test.mjs`; no byte-level rule-file diff test was found |
| opencode plugin runtime constraint documented in code | Not applicable (opencode is not a compiled binary target for ponytail's plugin) | Documented at length: opencode's compiled Bun binary rejects `require()` of on-disk files, worked around with a hand-rolled `new Function()` module evaluator |
| Explicit "we do not do X here" documentation | README.md per-host sections state the limitation directly (Grok hooks, Cursor subagents, Gemini's own hooks.json path) | `CLAUDE.md`'s Agent distribution table marks each host's auto-activation as Yes or No; `INSTALL.md` names "soft probe" hosts explicitly |
| Codex trust or install friction documented | Yes: README.md tells the user to open `/hooks` in Codex and "review and trust its two lifecycle hooks" | Not documented as a discrete step in the material read here |
| CI conformance against real harness binaries | No; `tests/hooks.test.js` spawns hook scripts with simulated per-harness environment variables, not the real CLIs | Yes; `agent-conformance.yml` installs pinned, versioned real CLIs (Codex, Gemini, opencode, Claude, and more) nightly and runs the real engine against them |
| Documented stdin and pipe-close quirks | Not found in the material read here | Yes, at length: a documented convention (parse on first complete JSON object, never wait for EOF) applied to every hook entrypoint because of a Windows pipe-close lag, cited against three separate issues |

## Patterns worth copying, and what they avoid

**A single hooks file per host family, not per host.** Ponytail's strongest structural idea is that Claude Code and Codex share both hook events and hook event shapes closely enough that one JSON file and one detection-and-dispatch module can serve both (`hooks/claude-codex-hooks.json`, `hooks/ponytail-runtime.js`). Caveman's Codex support, by contrast, forked into an independent, hand-maintained, much shorter ruleset embedded directly in `.codex/hooks.json`, which is exactly the kind of drift a shared source of truth prevents; the two rulesets can silently diverge and nothing in caveman's CI catches it the way `check-rule-copies.js` catches drift in ponytail's rule-file copies. For a plugin that already targets Claude Code and Codex, replicate ponytail's approach: one hooks manifest, one instruction builder, environment-variable-based host detection in a single module, and a CI check that fails the build if any per-host copy of the always-on text stops matching its source.

**Filter the always-on payload by mode or level before emitting it, don't ship the whole document every time.** Ponytail's `filterSkillBodyForMode()` is a small, specific technique: it recognizes worked-example lines and table rows by their leading label syntax, and drops every one that doesn't match the active mode, so a `full`-mode session never pays for the `lite` and `ultra` example blocks. Caveman does not do this: every host that reads `skills/caveman/SKILL.md` gets the same roughly 7 KB regardless of active level. If token budget for the always-on layer matters, ponytail's per-mode filtering is the more disciplined design and is straightforward to copy: tag mode-specific content with a recognizable label, strip everything not matching the active mode at emission time.

**Document the host quirk in the code, at the call site, not just in a changelog.** Both repos do this well and it is worth preserving as a habit: caveman's stdin-parses-on-first-JSON-object-not-EOF convention, ponytail's Cursor-rule-versus-hooks precedence logic, and caveman's opencode `new Function()` module loader are all explained inline, with the triggering issue numbers named, at the exact line where the workaround lives. Neither repo relies on a reader having read the README first to understand why a given branch exists.

**Prefer real, pinned-binary conformance tests over simulated ones where the budget allows it.** Caveman's `agent-conformance.yml` installing real, version-pinned Codex, Gemini, and opencode CLIs nightly and running the actual compression engine against them is a stronger guarantee than ponytail's approach of spawning hook scripts with faked environment variables. Ponytail's simulated tests are cheap and catch host-detection regressions quickly on every pull request, which caveman's nightly-only conformance job does not; the two are complementary rather than substitutes; a plugin with the budget for both should keep a fast simulated-environment suite on every push and add a slower, real-binary conformance job on a schedule, the way caveman does.

**Separate the persistent, always-on context from the turn-scoped dynamic state, and say so.** Caveman's opencode plugin header comment naming the always-on ruleset as coming from `AGENTS.md` and the plugin itself as "dynamic state only" is a useful naming discipline: it makes explicit which artifact is responsible for the model's baseline behavior and which is responsible for runtime mode switching, so a bug report about "the ruleset isn't the right one" and a bug report about "the mode won't switch" point a maintainer at two different files immediately.

**What both avoid, worth carrying forward as negative space.** Neither repo tries to make every host behave identically. Ponytail's README says outright that Grok hooks cannot inject instructions and does not use them; that Cursor subagents and cloud agents do not receive the ruleset and says so; that instruction-only hosts do not get slash commands. Caveman's distribution table marks roughly two thirds of its listed hosts "No" for automatic activation and requires an explicit skill invocation instead of pretending otherwise. Neither project tries to paper over a host's real limitation with a workaround that would be fragile or surprising; both write the limitation down where a user or a future maintainer will find it next to the code that hits it.
