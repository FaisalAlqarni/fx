# fx judge hooks: implementation plan

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
**Goal:** an optional local judge, a shell guard, a Stop evidence check and a stuck-loop tracker on Claude Code, Codex, opencode 1.x and 2.x, all failing open and logging every judged decision on the machine.
**Architecture:** Task 01 builds the adapter-neutral core (per-OS paths, the `judge.json` parser, the `/v1/systemone` client with redaction, budget and escalation, the decision log, a fake server and hook test helpers, ADR and notices). Task 02 adds the per-session journal and the turn boundary; every later hook reads and appends to it. Tasks 03 to 07 put the shell guard and the health line on each harness through thin adapters over one `guardShell`; tasks 08 to 10 add the tracker and the Stop check over the same journal; task 11 adds the setup guide and the user docs. The live conformance rows belong to sub-project 4's task 14 (controller ruling; sub-project order 1, 2, 3, 4).
**Stack:** TypeScript (strict) compiled by sub-project 1's `scripts/build` to CommonJS (hooks, `lib/`, tests) and ESM (opencode plugins); Node 20 built-in `fetch`; Bash gates.
**Complexity:** High
**Risks:**
- HIGH: a hook that reads per-machine files changes behaviour on a developer machine that has a `judge.json`, or writes logs into the real home during tests: Global Constraints require scratch `HOME`, `XDG_*`, `APPDATA`, `LOCALAPPDATA` for every test that runs a hook; task 02 moves the existing hook tests onto the shared helper.
- HIGH: a judge call stalls a session: the 1,500 ms budget is a constant enforced by an abort; tasks 01 and 03 test it against a fake server that delays 3,000 ms and assert wall time under 2,500 ms.
- HIGH: a guard change moves the git guard from fail-closed to fail-open, or a hoisted `import` moves a guarded load outside its `try`: the shell guard runs only after the git guard allows, its loads stay typed `require` inside `try`, and sub-project 1's golden gate (including its failed-load cases) must stay green with no fixture changed unless a task states an intended change.
- HIGH: Codex silently fails a hook run on an unknown output key (ADR 0023), which turns its guard off: every new key goes into `tests/gates/codex-hook-output` allowed sets first, in the task that prints it.
- HIGH: an agent or a prompt injection turns the guard off or talks past it (red team C1, C2): the repo switch turns off only the judge step and is read from the git top level; the stamp counts only after a new user prompt and never skips an ask; the loop guard never allows. Task 03 tests each.
- HIGH: a word in an argument or a heredoc body trips a hard rule, or a real spelling slips past one (red team I4, I5): task 03 matches at command position through the git guard's own splitters and tests every spelling both ways.
- MEDIUM: harness payload fields the design marks unverified (Codex `tool_response` and Stop input, Claude's failing-`Bash` signal and subagent `agent_id`, opencode prompt hooks, opencode 2.x await): each owning task (08, 09, 06, 07) reads the source or a recorded payload first and takes the design's stated fallback when the field is absent.
- MEDIUM: parallel tool calls write the same session journal: one short `appendFileSync` per event, never a rewrite.
- MEDIUM: `tests/gates/release-version.test.js` fails if the base branch already carries sub-project 1's version: the build stops and asks the owner for a version; the agent never picks one.
**Testing:** Unit: parsers, redactor, path resolver, guard classifier, evidence and tracker rules (`src/lib/*.test.ts`) · Process: each hook entry point with stdin payloads and a fake `/v1/systemone` server (`src/tests/gates/*.test.ts`); opencode plugins called in-process · Integration: `scripts/check-all` with install runs and free conformance on all four harnesses · Live: conformance rows 21 to 23, owned by sub-project 4's task 14 · Calibration: the 42-command guard set measured once in task 01, recorded in ADR 0047.

## Global Constraints

- Sub-project 1 is complete before task 01 starts: all fx code is TypeScript under `src/`, compiled file by file by `scripts/build` to committed JavaScript at the runtime paths.
- Users need Node only; no runtime `dependencies` in `package.json`; HTTP through Node's built-in `fetch`.
- Generated JavaScript targets `node20`.
- Module format per file is unchanged: CommonJS stays CommonJS, ESM stays ESM. Compile file by file; never bundle.
- `strict: true` and `noUncheckedIndexedAccess: true`; no `any`, `as any`, `@ts-ignore`, `@ts-expect-error` without `ts-gate-ok: <reason>`.
- External input (hook stdin, opencode events, `judge.json`, judge responses, journal and log files, `.fx.json`, environment) enters as `unknown` and is parsed by one function each; no `as` casts at trust boundaries; no validation library.
- Every path referenced by `hooks.json`, `hooks/hooks.json`, the Codex manifest, the opencode installer, `.fx.json` and skills stays byte-identical, except the new entries this design adds.
- A load guarded by `try` stays a typed `require` inside its `try`; never a hoisted `import`.
- The git guard stays fail-closed; the judge, shell guard, Stop check and tracker fail open.
- Judge budget: 1,500 ms per call, a constant.
- No default judge: with no `judge.json`, no network call is made.
- Nothing leaves the machine unless the user configured a remote `base_url`; redaction runs before every request and every log line.
- Logs and journals stay on the machine, mode `0600` on POSIX.
- Every test that runs a hook or plugin sets `HOME`, `XDG_CONFIG_HOME`, `XDG_STATE_HOME`, `APPDATA` and `LOCALAPPDATA` to scratch directories.
- Locale: English only; fx has no localized text.
- No em or en dashes in any file, comment or commit message; no attribution trailers.
- Nothing is pushed, merged or released by the agent.
- A generated file is committed in the same commit as its source; run `scripts/build` before every test run.
- Every task edits `scripts/check-all` and most edit `src/lib/types.ts`, `src/lib/hook-input.ts` or a hook entry point, so the tasks form one chain: never run two at once.
- A new parser lives in a file named `src/lib/*-input.ts`, so sub-project 1's escape gate forbids `as` there with no gate change.
- Hook and plugin tests go through `src/tests/helpers/hook-env.ts` (task 01) and spawn asynchronously whenever the fake server runs in the same process.

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | Judge client and per-machine config | none (sub-project 1 complete) | per-OS paths, `judge.json` and response parsers, redaction, `/v1/systemone` client with budget, escalation and mock backend, `GUARD_QUESTION` and its calibration, decision log, fake server and hook test helpers, `judge-cli path`/`check`, ADR 0047, `THIRD_PARTY_NOTICES.md` | MVP |
| 02 | Session journal and the turn on Claude Code | 01 | redacted journal with prune, `UserPromptSubmit` and SubagentStart turn starts, `hooks` key read from the git top level, existing hook tests on scratch env | MVP |
| 03 | Shell guard on Claude Code | 02 | `guardShell` (hard rules at command position, allowlist, repo commands, judge, gated stamp, loop guard), fail-open handlers, Claude PreToolUse forms | MVP |
| 04 | Judge health line at session start | 03 | health probe and line on Claude Code and Codex SessionStart, journal prune at start | Core |
| 05 | Shell guard and turn on Codex | 04 | Codex `UserPromptSubmit` (subagent-aware) and guard, ask as warn, fail-open handlers, narrowed preamble fallthrough, allowed output keys, harness reference | Core |
| 06 | Shell guard on opencode 1.x | 05 | v1 guard forms, health line, prompt boundary | Core |
| 07 | Shell guard on opencode 2.x | 06 | await probe, v2 guard forms or code-only branch, health line, prompt boundary, harness reference | Core |
| 08 | Stuck-loop nudges on Claude Code and Codex | 07 | Claude failure signal recorded, tool classification, evidence rules, tracker with read-only and subagent exemptions, PostToolUse on both | Core |
| 09 | Stop evidence check on Claude Code and Codex | 08 | Codex Stop contract recorded, Stop and SubagentStop block once, overclaim judge | Core |
| 10 | Nudges and Stop reminder on opencode | 09 | tool events, turn-end check, queued lines on both majors | Core |
| 11 | Judge setup in fx-setup and user docs | 10 | `judge-cli write` (key from stdin or env), fx-setup judge section, `.fx.json` `hooks` documented, README and INSTALL | Polish |
| 12 | No rm inside shell -c strings | 11 | `scripts/test-one` and `scripts/setup` replace the `bash -c` strings in `.fx.json`; preamble rule; gate | Polish |
| 13 | Coverage audit fixes | 12 | Codex PostToolUse shape measured, calibration with the guard state, ADR and design brought in line with rulings, opencode journal prune, missing tests and docs | Polish |
| 14 | Benchmark fixes | 13 | edit paths unredacted in the journal, seven hard-rule spellings, judge masks inert quoted text, shell-loop retries counted | Polish |

Phases ship independently, each ending with `scripts/check-all` green. After MVP, Claude Code has the shell guard with an optional judge. After Core, all four harnesses have the guard, the health line, the tracker and the Stop check or reminder. After Polish, a user can set up a judge through fx-setup and the docs describe it.

## Exported symbols

Every symbol sub-project 2 exports, with its exact signature and owning task. Sub-project 3 consumes these; a change here is a change to its plan too. Generated files keep the same names at the paths `scripts/build` gives them (`src/lib/x.ts` to `lib/x.js`).

| Module | Symbol | Signature | Task |
|---|---|---|---|
| `src/lib/types.ts` | `Harness` | `'claude-code' \| 'codex' \| 'opencode' \| 'opencode-v2'` | 01 |
| `src/lib/env.ts` | `FxEnv` (added fields) | `xdgConfigHome, xdgStateHome, appData, localAppData: string \| undefined` | 01 |
| `src/lib/fx-paths.ts` | `fxConfigDir` | `(platform: NodeJS.Platform, env: FxEnv, home: string) => string` | 01 |
| `src/lib/fx-paths.ts` | `fxStateDir` | `(platform: NodeJS.Platform, env: FxEnv, home: string) => string` | 01 |
| `src/lib/fx-paths.ts` | `machinePaths` | `() => { configDir: string, stateDir: string, judgeConfig: string }` | 01 |
| `src/lib/judge-input.ts` | `JudgeConfig` | `{ baseUrl: string, model: string, apiKey: string \| null, insecureHttp: boolean, mockAnswers: Record<string, RawAnswer> \| null }` | 01 |
| `src/lib/judge-input.ts` | `RawAnswer` | `{ type: 'choice', choice: string, probabilities: Record<string, number> } \| { type: 'noul', p: number }` | 01 |
| `src/lib/judge-input.ts` | `parseJudgeConfig` | `(raw: unknown) => { ok: true, value: JudgeConfig } \| { ok: false, reason: string }` | 01 |
| `src/lib/judge-input.ts` | `parseSystemOneResponse` | `(raw: unknown, questions: Record<string, JudgeQuestion>) => { ok: true, value: Record<string, RawAnswer> } \| { ok: false, reason: string }` | 01 |
| `src/lib/judge-input.ts` | `isLoopbackUrl` | `(baseUrl: string) => boolean` | 01 |
| `src/lib/judge-input.ts` | `checkAnswer` | `(name: string, answer: RawAnswer, question: JudgeQuestion) => string \| null` | 01 |
| `src/lib/judge.ts` | `JudgeQuestion` | `{ type: 'choice', instructions: string, options: [string, string][] } \| { type: 'noul', instructions: string }` | 01 |
| `src/lib/judge.ts` | `EscalateReason` | `'low-top' \| 'small-gap' \| 'mid-noul'` | 01 |
| `src/lib/judge.ts` | `JudgeAnswer` | `{ type: 'choice', choice: string, probabilities: Record<string, number>, escalate: EscalateReason \| null } \| { type: 'noul', p: number, escalate: EscalateReason \| null }` | 01 |
| `src/lib/judge.ts` | `UnavailableReason` | `'no-config' \| 'bad-config' \| 'timeout' \| 'network' \| 'bad-response' \| \`http-${number}\`` | 01 |
| `src/lib/judge.ts` | `JudgeHandle` | `{ kind: 'none' } \| { kind: 'invalid', reason: string } \| { kind: 'ready', config: JudgeConfig }` | 01 |
| `src/lib/judge.ts` | `JudgeResult` | `{ ok: true, answers: Record<string, JudgeAnswer>, model: string, latencyMs: number } \| { ok: false, reason: UnavailableReason, detail: string, latencyMs: number }` | 01 |
| `src/lib/judge.ts` | `loadJudge` | `(configPath?: string) => JudgeHandle` | 01 |
| `src/lib/judge.ts` | `askJudge` | `(handle: JudgeHandle, state: Record<string, string>, questions: Record<string, JudgeQuestion>) => Promise<JudgeResult>` (never rejects; budget fixed at `JUDGE_BUDGET_MS`) | 01 |
| `src/lib/guard-question.ts` | `GUARD_QUESTION` | `JudgeQuestion` (choice: `run`, `ask`, `deny`, in that order: ADR 0047) | 01 |
| `src/lib/judge-thresholds.ts` | constants | `JUDGE_BUDGET_MS`, `CHOICE_MIN_TOP`, `CHOICE_MIN_GAP`, `NOUL_UNSURE_LOW`, `NOUL_UNSURE_HIGH`, `DENY_MIN_TOP`, `DENY_MIN_GAP`, `OVERCLAIM_LIFT_MAX`, `REPEAT_FAILURES`, `PASSIVE_READS`, `UNVERIFIED_EDITS`, `LOOP_GUARD_MS`, `JOURNAL_MAX_AGE_MS`, `LOG_ROTATE_BYTES`: `number` | 01 |
| `src/lib/redact.ts` | `redact` | `(text: string, cap: number, runs = true) => string` | 01 |
| `src/lib/redact.ts` | `CAP_COMMAND`, `CAP_PROMPT`, `CAP_MESSAGE` | `number` (2000, 1500, 2000) | 01 |
| `src/lib/decision-log.ts` | `DecisionLogEntry` | as task 01 Interfaces | 01 |
| `src/lib/decision-log.ts` | `logDecision` | `(entry: DecisionLogEntry, stateDir?: string) => void` | 01 |
| `lib/judge-cli.js` (CLI) | `path`, `check`, `write` | `path`; `check`; `write --base-url <url> --model <id> [--api-key-stdin \| --api-key-env <NAME>] [--insecure-http]` | 01, 11 |
| `src/tests/helpers/fake-systemone.ts` | `startFakeSystemOne`, `FakeReply` | `(reply: (body: unknown, n: number) => FakeReply) => Promise<{ url: string, requests: unknown[], close: () => Promise<void> }>`; `{ status?: number, delayMs?: number, json?: unknown, raw?: string }` | 01 |
| `src/tests/helpers/hook-env.ts` | `scratchHookEnv`, `writeJudgeConfig`, `readDecisionLog`, `runHook` | as task 01 Interfaces | 01 |
| `src/lib/types.ts` | `ToolKind`, `NudgeSignal`, `JournalEvent` | as task 02 Interfaces (`JournalEvent` has `prompt` with `agentType?`, and `deny` and `ask` variants) | 02 |
| `src/lib/journal.ts` | `journalKey` | `(sessionId: unknown, agentId?: unknown) => string \| null` | 02 |
| `src/lib/journal.ts` | `appendEvent` | `(key: string, ev: JournalEvent, stateDir?: string) => boolean` (false when the line was not written) | 02 |
| `src/lib/journal.ts` | `appendPrompt` | `(key: string, text: string, t: number, stateDir?: string) => void` | 05 |
| `src/lib/journal.ts` | `readJournal` | `(key: string, stateDir?: string) => JournalEvent[]` | 02 |
| `src/lib/journal.ts` | `currentTurn` | `(events: JournalEvent[]) => JournalEvent[]` | 02 |
| `src/lib/journal.ts` | `lastUserPrompt` | `(sessionId: string, stateDir?: string) => string \| null` | 02 |
| `src/lib/journal.ts` | `pruneJournals` | `(now: number, stateDir?: string) => void` (called by `fx-context`, `fx-codex` and, from task 13, both opencode plugins at construction) | 02, 13 |
| `src/lib/session-input.ts` | `parseJournalLine` | `(raw: unknown) => JournalEvent \| null` | 02 |
| `src/lib/repo-config.ts` | `HookSwitches` | `{ shellJudge: boolean, stopCheck: boolean, loopNudge: boolean }` | 02 |
| `src/lib/repo-config.ts` | `CheckCommands` | `{ test_one, test_scope, test_all, lint, setup: string \| null }` | 02 |
| `src/lib/repo-config.ts` | `repoRoot` | `(cwd: string) => string` | 02 |
| `src/lib/repo-config.ts` | `readRepoConfig` | `(cwd: string) => { hooks: HookSwitches, checks: CheckCommands }` | 02 |
| `src/lib/types.ts` | `GuardSource`, `GuardDecision` | as task 03 Interfaces | 03 |
| `src/lib/shell-rules.ts` | `ShellClass` | `{ kind: 'hard-deny', rule: string, reason: string } \| { kind: 'read-only' } \| { kind: 'grey' }` | 03 |
| `src/lib/shell-rules.ts` | `classifyShell` | `(command: string, posix = true) => ShellClass` (re-exported by `shell-guard`) | 03 |
| `src/lib/shell-rules.ts` | `stripComments` | `(command: string, posix = true) => string` (re-exported by `shell-guard`) | 03 |
| `src/lib/shell-rules.ts` | `overrideReason` | `(command: string, posix = true) => string \| null` (re-exported by `shell-guard`) | 03 |
| `src/lib/shell-rules.ts` | `hardReason` | `(rule: string) => string` | 03 |
| `src/lib/shell-rules.ts` | `namesFxState` | `(text: string) => boolean` | 03 |
| `src/lib/shell-guard.ts` | `normalizeCommand` | `(command: string, posix = true) => string` | 03 |
| `src/lib/shell-guard.ts` | `judgeState` | `(command: string, cwd: string, harness: Harness, userRequest: string \| null, posix = true) => Record<string, string>` (the judge's state; `guard-calibrate` sends the same) | 13 |
| `src/lib/shell-guard.ts` | `guardShell` | `(input: { command: string, cwd: string, harness: Harness, sessionId: string \| null, agentId: string \| null, now: number, judgeSupported?: boolean, posix?: boolean }, judge?: JudgeHandle) => Promise<GuardDecision>` | 03 |
| `src/lib/shell-guard.ts` | `guardShellCodeOnly` | `(input: { command: string, cwd: string, harness: Harness, sessionId: string \| null, posix?: boolean }) => GuardDecision` | 07 |
| `src/lib/evidence.ts` | `matchRepoCommand` | `(command: string, template: string \| null) => { tail: string, placeholder: boolean } \| null` | 03 |
| `src/lib/evidence.ts` | `isRepoCommand` | `(command: string, template: string \| null) => boolean` | 03 |
| `src/lib/evidence.ts` | `isCheckCommand` | `(command: string, checks: CheckCommands) => boolean` | 03 |
| `src/lib/evidence.ts` | `hasPassSummary` | `(output: string) => boolean` | 08 |
| `src/lib/evidence.ts` | `countsAsVerification` | `(kind: ToolKind, command: string \| null, outcome: 'ok' \| 'fail' \| 'unknown', output: string, checks: CheckCommands) => boolean` | 08 |
| `src/lib/evidence.ts` | `checkHint` | `(checks: CheckCommands) => string` | 08 |
| `src/lib/guard-output.ts` | `claudeGuardOutput` | `(d: GuardDecision) => { stdout: string, stderr: string, exitCode: 0 \| 2 }` | 03 |
| `src/lib/guard-output.ts` | `codexGuardOutput` | `(d: GuardDecision) => { stdout: string, stderr: string, exitCode: 0 \| 2 }` | 05 |
| `src/lib/judge-health.ts` | `judgeHealth` | `(input: { harness: Harness, cwd: string, sessionId: string \| null }, judge?: JudgeHandle) => Promise<string \| null>` | 04 |
| `src/lib/health-failure.ts` | `healthFailed` | `(input: { harness: Harness, cwd: string, sessionId: string \| null }, error: unknown) => string \| null` (the `health-check-failed` line and log entry) | 04 |
| `src/lib/health-failure.ts` | `HEALTH_TAIL` | `string` | 04 |
| `src/lib/tool-events.ts` | `classifyTool` | `(harness: Harness, toolName: string, command: string \| null) => ToolKind` | 08 |
| `src/lib/tool-events.ts` | `toolOutcomeAndOutput` | `(harness: Harness, event: string, toolResponse: unknown, interrupted = false) => { outcome: 'ok' \| 'fail' \| 'unknown', output: string, interrupted?: true }` | 08 |
| `src/lib/tool-events.ts` | `editedPaths` | `(harness: Harness, toolName: string, toolInput: unknown, cwd: string) => string[]` | 08 |
| `src/lib/patch-paths.ts` | `extractPatchPaths` | `(command: unknown) => string[]` (moved unchanged from `fx-codex`) | 08 |
| `src/lib/loop-tracker.ts` | `checkSignals` | `(turn: JournalEvent[], skip: NudgeSignal[] = []) => NudgeSignal \| null` | 08 |
| `src/lib/loop-tracker.ts` | `recordToolResult` | `(input: { harness: Harness, sessionId: string \| null, agentId: string \| null, cwd: string, toolName: string, toolInput: unknown, command: string \| null, outcome: 'ok' \| 'fail' \| 'unknown', output: string, interrupted?: boolean }) => string \| null` (`ToolResultInput`) | 08 |
| `src/lib/preamble.ts` | `laneAddress` | `(harness: Harness, lane: string) => string` (added only if no export gives it) | 08 |
| `src/lib/stop-check.ts` | `DOC_EXTENSIONS` | `string[]` | 09 |
| `src/lib/stop-check.ts` | `turnNeedsEvidence` | `(turn: JournalEvent[]) => boolean` | 09 |
| `src/lib/stop-check.ts` | `decideStop` | `(input: { harness: Harness, sessionId: string \| null, agentId: string \| null, cwd: string, stopHookActive: boolean, lastMessage: string \| null, mode: 'block' \| 'reminder' }, judge?: JudgeHandle) => Promise<{ text: string \| null }>` | 09 |
| `src/lib/stop-check.ts` | `OVERCLAIM_QUESTION` | `JudgeQuestion` (noul) | 09 |
| `src/lib/opencode-queue.ts` | `createQueue` | `(harness: Harness, cwd: string) => { enqueue(session: string, line: string): void, drain(session: string): string[] }` | 10 |
| `src/lib/opencode-queue.ts` | `MAX_LINES_PER_SESSION`, `MAX_SESSIONS` | `number` (5, 50) | 10 |

Changed by the red team against the first draft (2026-10-22): `JudgeConfig` gained `insecureHttp`; `isLoopbackUrl` is new; `GUARD_QUESTION` moved from `shell-guard` to `guard-question` (task 01); `JournalEvent` gained the `ask` variant and `prompt.agentType`; `HookSwitches.shellGuard` became `shellJudge` (and the `.fx.json` key `shell_guard` became `shell_judge`); `CheckCommands` gained `setup`; `repoRoot`, `stripComments`, `isRepoCommand` and `countsAsVerification` are new; `isCheckCommand` moved from task 08 to task 03; `GuardSource` gained `repo-command`; `judge-cli write` takes a key only through `--api-key-stdin` or `--api-key-env`. Every other name and signature is unchanged.

Refreshed from the shipped exports by task 13 (coverage audit gap 12): the hard rules, `stripComments` and `overrideReason` live in `shell-rules` with a `posix` parameter, as do `normalizeCommand` and the guard inputs; `hardReason`, `namesFxState`, `matchRepoCommand`, `checkAnswer`, `appendPrompt`, `healthFailed`, `createQueue` and `judgeState` are new; `appendEvent` returns whether it wrote; `toolOutcomeAndOutput`, `checkSignals` and `recordToolResult` gained an interrupted or skip argument. `health-check-failed` is a new health reason, logged as `unavailable`.

## Red-team changes and their owners

| Finding | Changed requirement | Owning task |
|---|---|---|
| C1 | repo switch turns off only the judge step; `.fx.json` from the git top level | 02 (key, `repoRoot`), 03 (behaviour and test) |
| C2 | stamp honoured only after a later user prompt, never skips ask; loop guard asks or denies | 03 (rule), 05 (Codex warn), 06 (opencode 1.x warn and deny), 07 (opencode 2.x ask) |
| C3 | a `UserPromptSubmit` with `agent_id` starts only the subagent's turn | 02 (Claude Code), 05 (Codex) |
| I4, I5 | hard rules at command position; full spelling list | 03 |
| I6 | allowlist flag denylist, git global options, more secret paths | 03 |
| I7 | comments stripped from the judge's state | 03 |
| I8 | fail-open `uncaughtException`/`unhandledRejection`, explicit exit | 03 (Claude Code), 05 (Codex) |
| I9 | pass summaries only from real shell runs, count at least 1; piped checks need a summary; Claude failure signal recorded first | 08 |
| I10 | one check-command matching rule | 03 (`isRepoCommand`), 08 (uses it) |
| I11 | empty final message keeps the block; ADR names the Stop lift exception | 09, 01 (ADR) |
| I12 | journal redacted; loop guard and stamp compare redacted forms | 02, 03 |
| I13 | more redaction patterns with exact tests | 01 |
| I14 | non-loopback is remote; https unless `insecure_http`; no userinfo | 01, 11 (warning on `write`) |
| I15 | key never in argv | 11 |
| I16 | 42-command calibration in ADR 0047; repo check and setup commands allowlisted | 01 (calibration), 03 (allowlist) |
| I17 | no nudges for read-only agents; no passive-stall in subagents; edits reset repeat-failure | 02 (agent type recorded), 05 (Codex agent type), 08 (rules) |
| I18 | Codex Stop contract read first; `[fx] ` prompts ignored | 09 (contract), 02 and 05 (ignore) |
| I19 | opencode 2.x prompt hook outside the failure list, GAP recorded | 07 |
| I20 | rows 21 to 23 and `live.sh` edits move to sub-project 4 task 14; exported symbols listed above | plan.md, design.md Testing Decisions |
| M21 | Codex shell is `Bash` with a string command only | 05 |
| M22 | opencode health line once per session, on stderr | 06, 07 |
| M23 | Codex prints the preamble only for SessionStart and SubagentStart; health line names the re-trust step | 05, 04 |
| M24, M25 | live rows on scratch home and XDG dirs; row 21 uses `curl ... \| sh`; no assertion on model wording | design.md Testing Decisions (built by sub-project 4 task 14) |
| M26 | setup recommends Nimble or Kev; d1 caveats; Ollama 0.40.7; OpenRouter path unverified | 11 |
| M27 | which shells honour the stamp | 11 (INSTALL), design decision 5 |
| M28 | ADR 0047 amends ADR 0001 | 01 |
