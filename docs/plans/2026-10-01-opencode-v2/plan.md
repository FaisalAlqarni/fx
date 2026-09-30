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
- HIGH: the OpenRouter key: read only from `OPENROUTER_API_KEY`, never written to the repo, a log kept, or a commit; row logs are scanned for `sk-or-` and a hit fails the row.
- MEDIUM: one config directory and one npm package serve both OpenCode majors: the installer must never leave the other major's plugin link in place.
- MEDIUM: free models are rate-limited (a 429 was measured on the first Codex probe): fallback to DeepSeek on provider errors only, every row records its model.
**Testing:** Unit/gate: `lib/preamble`, `lib/agent-dialects`, the v2 plugin driven with a stub `ctx`, the installer's v2 branch · Integration: `tests/install/run.sh opencode-v2`, free conformance rows on both OpenCode majors · Live: the full matrix on Codex and both OpenCode majors through OpenRouter, and Claude Code rows 01, 02, 06, 07, 08, 16 on Haiku through OpenRouter.

## Global Constraints

- Harnesses: `claude-code`, `codex`, `opencode` (v1, measured 1.18.25), `opencode-v2` (measured 2.0.18). A change for one harness does not change another harness's files except where a task names both.
- Plugin files: `plugins/fx-opencode-v1.js` (renamed from `plugins/fx.js`) and `plugins/fx-opencode-v2.js`. The installed link in the OpenCode config directory is `plugins/fx.js` for either major.
- v2 plugin module: `export default { id: 'fx', setup }`; `setup(ctx)` uses `ctx.location.directory`, `ctx.session.hook('context')`, `ctx.agent.transform`, `ctx.permission.hook('evaluate')`, `ctx.tool.hook('execute.before')` as task 01 confirms them.
- v2 tool names: `shell`, `edit`, `write`, `patch`, `subagent`, `skill`. v2 permissions: `[{ action, resource, effect }]`, last match wins, `*` deny first for read-only agents.
- The five user-invoked lanes stay hidden from the model on every harness (ADR-0025): on v2 through `{ action: 'skill', resource: <name>, effect: 'deny' }`, reached by the user through generated commands.
- The user's own permission answer wins over fx's grant (ADR-0026); anything fx cannot observe is stated, never guessed (ADR-0024); hook output carries only keys the runtime knows (ADR-0023).
- Live provider: `FX_LIVE_PROVIDER=openrouter` is opt-in; default stays `llamacpp`. Models: `openrouter/qwen/qwen3.8-27b:free` then `openrouter/deepseek/deepseek-v4-flash` for Codex and OpenCode; `anthropic/claude-haiku-4.5` for Claude Code. Fallback only on a provider error (HTTP 429, 5xx, "Insufficient credits", no first token before the timeout).
- The key comes only from `OPENROUTER_API_KEY`. No task writes it to a file inside the repo, prints it, or commits it.
- Prose: no dashes, no stock vocabulary; `scripts/check-prose` passes on every edited Markdown file. No attribution trailers. Stage by path.
- Skill, agent and prompt edits go through `fx-authoring`. New tests get their own `run` line in `scripts/check-all`.
- ADR numbers 0036 to 0038 are reserved for this plan.
- Locale: Arabic is the default locale, with RTL support throughout.
- `scripts/check-all` runs once at the end (task 14). Tasks run only the gates they touch.

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | Probe OpenCode 2.0.18 | none | `probe-findings.md`: every design **probe** item settled on the real binary | Probe |
| 02 | Rename the v1 plugin | none | `plugins/fx-opencode-v1.js`, every reference updated, v1 unchanged in behaviour | Harness |
| 03 | v2 harness registration | 01 | preamble entry, `references/harnesses/opencode-v2.md`, `toOpencodeV2Agent`, CI pins | Harness |
| 04 | v2 plugin: preamble, agents, skills | 02, 03 | `plugins/fx-opencode-v2.js` loads on 2.0.18 and registers fx; its gate | Harness |
| 05 | v2 guard and lane check | 04 | the layers task 01 proved, fail-closed guard, gate cases | Harness |
| 06 | Version-aware installer | 04, 05 | `--major`, v2 agents, commands, policies, depth; the other major's link removed; install test | Harness |
| 07 | v2 conformance plumbing and rows | 06 | `opencode-v2` in the runner, events, jail, rows; free rows green on v2 | Harness |
| 08 | OpenRouter live provider | 07 | `FX_LIVE_PROVIDER=openrouter` for all four harnesses, fallback, key scrubbing, model per row | Harness |
| 09 | Docs and ADRs | 05, 06, 08 | INSTALL v2 section and corrected table, README, SURFACE, ADRs 0036 to 0038 | Harness |
| 10 | Phase A baseline | 08 | full live matrix on Codex and both OpenCode majors, Claude Code's changed rows; `baseline.md` | Baseline |
| 11 | Phase B: Codex | 10 | every Codex FAIL and GAP closed or proven unclosable, rows 13 and 14 included | Fix |
| 12 | Phase B: OpenCode v1 | 10, 11 | every v1 FAIL and GAP closed or proven unclosable | Fix |
| 13 | Phase B: OpenCode v2 and Claude Code | 10, 12 | every v2 and Claude Code FAIL and GAP closed or proven unclosable | Fix |
| 14 | Re-run and final gate | 09, 11, 12, 13 | matrix re-run on changed harnesses, `INSTALL.md` verified table, `check-all` | Fix |

Phases: Probe (01) settles facts. Harness (02 to 09) makes v2 load and the matrix runnable on every harness. Baseline (10) measures. Fix (11 to 14) closes what the baseline found, one harness per task. Tasks 11 to 13 are serial only because they share the live model budget and the runner; their files are disjoint.
