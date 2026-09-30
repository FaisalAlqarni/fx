# fx on four harnesses: implementation plan

> **Build this with `fx-implement`. Do not execute the tasks directly.**
>
> The tasks below are deliberately detailed. That makes them easy to follow and
> it is exactly why the lane gets skipped: nothing looks missing. What is
> missing is everything a task file cannot hold, and it is what `fx-implement`
> supplies: a worktree so the main checkout is never written to, a ledger that
> survives compaction, a fresh subagent per task, a review while each diff is
> still small, and lens dispatch on what the diff actually touched.
>
> Steps use `- [ ]` checkboxes.

**Design:** `./design.md`
**Goal:** fx loads and passes its full conformance matrix on Claude Code, Codex, OpenCode 1.x and OpenCode 2.x, with OpenCode 2.x as its own harness and live rows running through OpenRouter.
**Architecture:** A new `opencode-v2` harness beside the three existing ones: its own plugin file on the 2.x `setup(ctx)` API, its own preamble entry, harness reference, gate, install route and conformance runtime, sharing only pure `lib/` functions. The installer detects the running major. A live-provider switch in the conformance runner sends Codex, both OpenCode majors and Claude Code to OpenRouter.
**Stack:** Node ESM plugins, plain `node:assert` gates, Python installer, bash conformance runner, OpenCode 1.18.25 and 2.0.18, Codex 0.155.1, Claude Code 2.1.286.
**Complexity:** High
**Risks:**
- HIGH: 2.x behaviour the source and docs leave open (guard layers, preamble reaching subagents, command registration, run output): task 01 probes each on the real binary before any code depends on it; a failed probe becomes a ruling that switches to the design's fallback.
- HIGH: the git guard on 2.x is weaker than on 1.x by construction for anything a pattern cannot express unless layer 1 is proven: `INSTALL.md` states exactly what v2 catches, per layer.
- HIGH: v2's `evaluate` hook sees one resource per parsed sub-command, never the full command, so `inspect` per resource misses heredoc and pipe-into-shell forms (finding 3): the plugin records `ev.input.command` in `tool.hook('execute.before')` by call id, looks it up in `evaluate` through `ev.source.id`, runs `inspect` on the full command, and denies on a missed lookup or any throw. Task 01 question 3 proves the lookup first.
- HIGH: the OpenRouter key and the live jail (finding 1): the jail clears the environment, so the provider variables must be allowlisted under `FX_LIVE_PROVIDER=openrouter`, and the real Claude and Codex credential copies skipped, or Claude Code runs on the subscription while its line says Haiku. The model is verified from each session's own init event. The key is read only from `OPENROUTER_API_KEY`; the scan for `sk-or-` runs inside `keep_log` and on every teed runner output, and a hit fails the row.
- HIGH: OpenCode 1.x refuses to start with a top-level `permissions` key in the shared `opencode.json` (finding 2): the installer never writes one, `--major 1` removes fx's `experimental.policies` entries, and task 06 checks `opencode debug config` on 1.18.25 after a v2-then-v1 install.
- HIGH: on a machine with 2.x installed, a v1 caller that runs the installer without `--major` installs and tests v2 as v1 (finding 6): every v1 caller passes `--major 1`, and `live.sh` checks the running major matches the harness.
- MEDIUM: one config directory and one npm package serve both OpenCode majors: the installer must never leave the other major's plugin link in place, and treats all three fx plugin file names as its own.
- MEDIUM: free-model limits (finding 9): a key without purchased credits gets 50 free-model requests a day at 20 a minute, which the matrix exceeds. An account with purchased credits is a checked precondition of tasks 10 and 15 (`https://openrouter.ai/api/v1/credits`); each harness run states a request budget and paces its rows. Fallback to DeepSeek on provider errors only (401, 429, 5xx, credits, no first token), matched only in the CLI's own error events and stderr; every row records its model.
**Testing:** Unit/gate: `lib/preamble`, `lib/agent-dialects`, the v2 plugin driven with a stub `ctx`, the installer's v2 branch · Integration: `tests/install/run.sh opencode-v2`, free conformance rows on both OpenCode majors · Live: the full matrix on Codex and both OpenCode majors through OpenRouter, and Claude Code rows 01, 02, 06, 07, 08, 16 on Haiku through OpenRouter.

## Global Constraints

- Harnesses: `claude-code`, `codex`, `opencode` (v1, measured 1.18.25), `opencode-v2` (measured 2.0.18). A change for one harness does not change another harness's files except where a task names both.
- Plugin files: `plugins/fx-opencode-v1.js` (renamed from `plugins/fx.js`) and `plugins/fx-opencode-v2.js`. The installed link in the OpenCode config directory is `plugins/fx.js` for either major.
- v2 plugin module: `export default { id: 'fx', setup }`; `setup(ctx)` uses `ctx.location.directory`, `ctx.session.hook('context')`, `ctx.agent.transform`, `ctx.permission.hook('evaluate')`, `ctx.tool.hook('execute.before')` and `('execute.after')`, `ctx.command.transform` as task 01 confirms them.
- v2 tool names: `shell`, `edit`, `write`, `patch`, `subagent`, `skill`. v2 permissions: `[{ action, resource, effect }]`, last match wins, `*` deny first for read-only agents.
- The five user-invoked lanes stay hidden from the model on every harness (ADR-0025): on v2 through `{ action: 'skill', resource: <name>, effect: 'deny' }` rules the plugin adds to every agent's permissions in `agent.transform` (the skill list is filtered only by those rules; the `evaluate` hook is a backstop that hides nothing), reached by the user through commands the plugin registers with `command.transform`, or generated command files on the installer route if task 01 disproves that.
- The user's own permission answer wins over fx's grant (ADR-0026); anything fx cannot observe is stated, never guessed (ADR-0024); hook output carries only keys the runtime knows (ADR-0023).
- Live provider: `FX_LIVE_PROVIDER=openrouter` is opt-in; default stays `llamacpp`. Models: `openrouter/qwen/qwen3.8-27b:free` then `openrouter/deepseek/deepseek-v4-flash` for Codex and OpenCode; `anthropic/claude-haiku-4.5` for Claude Code. Fallback only on a provider error (HTTP 401, 429, 5xx, "Insufficient credits", no first token before the timeout), matched only in the CLI's own error events and stderr; the fallback re-run lives in `tests/conformance/run.sh`.
- The key comes only from `OPENROUTER_API_KEY`. No task writes it to a file inside the repo, prints it, or commits it.
- An account with purchased credits is a checked precondition for live runs: `GET https://openrouter.ai/api/v1/credits` reports `total_credits > 0` before any live run starts.
- Every v1 installer caller passes `--major 1`.
- No top-level `permissions` key is ever written to `opencode.json`, and no `permissions` on an agent entry in it.
- Prose: no dashes, no stock vocabulary; `scripts/check-prose` passes on every edited Markdown file. No attribution trailers. Stage by path.
- Skill, agent and prompt edits go through `fx-authoring`. New tests get their own `run` line in `scripts/check-all`.
- ADR numbers 0036 to 0038 are reserved for this plan.
- Locale: Arabic is the default locale, with RTL support throughout.
- `scripts/check-all` runs once at the end (task 15). Tasks run only the gates they touch.

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | Probe OpenCode 2.0.18 | none | `probe-findings.md`: every design **probe** item settled on the real binary | Probe |
| 02 | Rename the v1 plugin | none | `plugins/fx-opencode-v1.js`, every reference updated, v1 unchanged in behaviour | Harness |
| 03 | v2 harness registration | 01 | preamble entry, `references/harnesses/opencode-v2.md`, `toOpencodeV2Agent`, CI pins | Harness |
| 04 | v2 plugin: preamble, agents, skills, commands | 02, 03 | `plugins/fx-opencode-v2.js` loads on 2.0.18, registers fx, hides the five lanes in every agent's rules, registers commands; its gate | Harness |
| 05 | v2 guard and lane check | 04 | the layers task 01 proved, the call-id lookup, fail-closed guard, tight policies with allowed samples, gate cases | Harness |
| 06 | Version-aware installer | 04, 05 | `--major`, v2 agents, policies, depth; no `permissions` key; fx's policies removed on `--major 1`; every v1 caller passes `--major 1`; the other major's link replaced; install test and the 1.18.25 config check | Harness |
| 07 | v2 conformance plumbing and rows | 06 | `opencode-v2` in the runner, events, jail, rows; free rows green on v2 | Harness |
| 08 | OpenRouter live provider | 07 | `FX_LIVE_PROVIDER=openrouter` for all four harnesses: jail allowlist, no credential copies, fallback re-run in `run.sh`, CLI-only error matching, key scan in `keep_log`, model from the session's init event | Harness |
| 09 | Docs and ADRs | 05, 06, 08 | INSTALL v2 section and corrected table, README, SURFACE, ADRs 0036 to 0038 | Harness |
| 10 | Phase A baseline | 08 | credits precondition, baseline commit, full live matrix on Codex and both OpenCode majors, Claude Code's changed rows; `baseline.md` | Baseline |
| 11 | Phase B: Codex | 10 | every Codex FAIL and GAP closed or proven unclosable, rows 13 and 14 included | Fix |
| 12 | Phase B: OpenCode v1 | 10, 11 | every v1 FAIL and GAP closed or proven unclosable | Fix |
| 13 | Phase B: OpenCode v2 | 10, 12 | every v2 FAIL and GAP closed or proven unclosable | Fix |
| 14 | Phase B: Claude Code | 10, 13 | every Claude Code FAIL and GAP among D7's rows closed or proven unclosable | Fix |
| 15 | Re-run and final gate | 09, 11, 12, 13, 14 | matrix re-run on changed harnesses, `INSTALL.md` verified table, `check-all` | Fix |

Phases: Probe (01) settles facts. Harness (02 to 09) makes v2 load and the matrix runnable on every harness. Baseline (10) measures. Fix (11 to 15) closes what the baseline found, one harness per task (11 to 14), then re-runs (15). Tasks 11 to 14 are serial only because they share the live model budget and the runner; their files are disjoint.

Phase B rules (tasks 11 to 15): a fixed row passes 2 of 2 live runs. A harness has changed when any file it loads changed since the baseline commit. Every non-PASS gets one ruling: fixed, unclosable with evidence, or model capability (re-run once on DeepSeek; a pass there is PASS on the fallback, recorded with both runs; Claude Code, which runs only on Haiku, re-runs once on Haiku instead).
