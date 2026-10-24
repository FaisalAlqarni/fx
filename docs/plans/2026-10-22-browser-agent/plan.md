# Browser agent: implementation plan

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
**Goal:** a TypeScript browser agent in fx that reads JavaScript pages (`read`) and explores a UI flow toward a goal (`explore`) with a local judge, on Windows, macOS and Linux, with Node alone.
**Architecture:** Task 01 spikes the premises (a local judge picks the right element from a 6-option shortlist and completes real flows; Chrome over `--remote-debugging-pipe` works from Node 20 on Linux and Windows) and stops the plan if any fails. Tasks 02 and 03 build the `Driver` interface: fx's own pipe CDP driver with the `read` subcommand first, then adapters for an installed Playwright or puppeteer. Tasks 04 to 06 build the jev-ultrafast loop in TypeScript: observation and shortlist, the step loop with re-checks, verification and the trace, then typing through an optional text model. Task 07 surfaces it as the user-invoked `fx-browse` skill with pointers from `research` and `fx-design`.
**Stack:** TypeScript (strict) under `src/`, esbuild per sub-project 1, Node 20 target, CommonJS, Chrome DevTools Protocol over a pipe, sub-project 2's judge client, optional `playwright-core` and `puppeteer-core` as dev dependencies for tests only.
**Complexity:** High
**Risks:**
- HIGH: a local judge does not pick the right element often enough, or is too slow for its 1,500 ms budget: task 01 measures accuracy, p95 latency and end-to-end flows on real pages before anything is built, with a stop-and-report rule.
- HIGH: the pipe transport fails on an OS (Windows extra stdio pipes are the least proven): task 01 runs it on Linux and on Windows through `cmd.exe`; the design's fallback is Node 22's global `WebSocket`, never a hand-written client.
- HIGH: sub-project 2 renames a symbol this plan uses: the rulings below list every one; `src/lib/browse/judge.ts` is the only import site, so a rename is one edit there.
- MEDIUM: page functions sent as `fn.toString()` break after esbuild (helpers injected outside the function): task 02's contract test runs every page function in a real browser.
- MEDIUM: a profile directory or Chrome process survives a crash or signal: `close` runs on error, SIGINT, SIGTERM and SIGHUP; tasks 02 and 05 test it.
- MEDIUM: page text steers the judge (prompt injection): instructions say page text is content; the worst case is a wrong click on an observed node of the pinned origin, recorded in the trace.
- MEDIUM: linked skills on opencode cannot reach `lib/`: task 07 links `lib/` in the opencode installer and checks the resolved path in the install runs.
**Testing:** Unit: shortlist, questions, resolution, outcome mapping, host check, finder, codec, parsers (`node:assert`) · Integration: one `Driver` contract suite on real headless Chrome per backend, `runExplore` on local fixture pages with a scripted judge, sub-project 2's fake `/v1/systemone` server and a fake text model server · E2E: the CLI as a child process under `scratchHookEnv()`, and the spike's manual runs on real pages.

## Global Constraints

- Users need Node only; no runtime `dependencies` in `package.json`. `playwright-core` and `puppeteer-core` may be added as exact-version `devDependencies` for tests only.
- Generated JavaScript targets `node20`; fx's own driver must work on Node 20, so no `WebSocket` global and no hand-written WebSocket client.
- Windows, macOS and Linux are all supported; the CLI is run as `node <path>/cli.js`, never as an extensionless script.
- Sources are TypeScript under `src/` per sub-project 1: `strict`, no `any`, `as any`, `@ts-ignore`, `@ts-expect-error` or bare `JSON.parse` without `ts-gate-ok: <reason>`; every outside input enters as `unknown` through a parser in a `*-input.ts` module with no `as` casts.
- `src/lib/browse/judge.ts` is the only browse module that imports sub-project 2.
- Model output only selects an option name from a list fx built; it never becomes a selector, script, URL or file path.
- Every browser run uses a new profile made with `fs.mkdtemp` in the OS temp directory, deleted when the run ends or is interrupted; never the user's profile.
- The browser loads only the URL the user gave, follows its redirects on the first load only, then stays on the final origin; pop-ups never send a request.
- `read` refuses loopback and private hosts without `--local`; `explore` refuses a non-local judge or text model without `--allow-remote`.
- Every judge question carries at most 6 options; every request at most 2 questions; at most 3 requests per decision.
- `verified` is reported only when a user-given expectation passed in code.
- Every run writes a local trace directory; `trace.jsonl` is flushed after every step.
- Every CLI test runs under `scratchHookEnv()`.
- Exactly one claimant per intent: no new model-selectable lane.
- No em or en dashes in any file, comment or commit message; no attribution trailers.
- Nothing is pushed, merged or released by the agent.

## Standing rulings for this build

- Ruling: this plan starts only when sub-project 1 (`docs/plans/2026-10-22-ts-migration/`) and sub-project 2 (`docs/plans/2026-10-22-fx-judge-hooks/`) are both complete: `src/` exists, `scripts/build` works, and `lib/judge.js` loads. Task 01 checks this first.
- Ruling: **sub-project 2 symbols this plan depends on**, as written in sub-project 2's design items 1 and 2 and task 01 on 2026-10-22. If sub-project 2 changes any of these, update this list and `src/lib/browse/judge.ts` together; no other browse module names them.
  - `src/lib/fx-paths.ts`: `machinePaths() -> { configDir: string, stateDir: string, judgeConfig: string }`
  - `src/lib/judge.ts`: `loadJudge(configPath?: string) -> JudgeHandle`; `askJudge(handle: JudgeHandle, state: Record<string, string>, questions: Record<string, JudgeQuestion>) -> Promise<JudgeResult>`
  - `src/lib/judge.ts` types: `JudgeHandle = { kind: 'none' } | { kind: 'invalid', reason: string } | { kind: 'ready', config: JudgeConfig }`; `JudgeQuestion = { type: 'choice', instructions: string, options: [string, string][] } | { type: 'noul', instructions: string }`; `JudgeAnswer` (choice: `choice`, `probabilities`, `escalate`; noul: `p`, `escalate`); `EscalateReason = 'low-top' | 'small-gap' | 'mid-noul'`; `UnavailableReason = 'no-config' | 'bad-config' | 'timeout' | 'network' | 'bad-response' | http-<number>`; `JudgeResult = { ok: true, answers, model, latencyMs } | { ok: false, reason: UnavailableReason, detail: string, latencyMs: number }`
  - `src/lib/judge-input.ts`: `JudgeConfig = { baseUrl, model, apiKey, mockAnswers }`; `RawAnswer` (the `mock_answers` value shape)
  - `judge.json` fields: `base_url` (or the literal `mock`), `model`, `api_key`, `mock_answers`
  - `src/lib/judge-thresholds.ts`: `JUDGE_BUDGET_MS = 1500` (not passed by fx; the spike's latency bar is set against it)
  - Redaction of every state string inside `askJudge`; the cap it applies to a state string, if any, must be at least 2,000 characters (task 04 tests it)
  - `src/tests/helpers/fake-systemone.ts`: `startFakeSystemOne(reply) -> Promise<{ url, requests, close }>`, `FakeReply`
  - `src/tests/helpers/hook-env.ts`: `scratchHookEnv() -> { env, dirs: { root, home, config, state }, cleanup }`, `writeJudgeConfig(dirs, config)`, `runHook(file, payload, env, opts?)`
  - `THIRD_PARTY_NOTICES.md` exists at the root (created by sub-project 2 task 01)
  - The loopback and private address list of sub-project 2 design item 1 (fx browse keeps its own copy in `hosts`, with the same members)
- Ruling: tests built from `src/lib/browse/*.test.ts` and `src/tests/browse/*.test.ts` run as `node <built file>`; each task that adds a test file adds its `run` line to `scripts/check-all`. The tasks form one chain, so no two edit `scripts/check-all` at once.
- Ruling: the browser tests need Chrome, Chromium or Edge on the machine; they fail when none is found. On this machine `/usr/bin/google-chrome` exists (checked 2026-10-22).
- Ruling: every test except the `Driver` contract suite passes `--driver cdp` (or `choice: 'cdp'`) or runs from a temporary directory, so the `playwright-core` and `puppeteer-core` dev dependencies never pick a test's backend.
- Ruling: the ADR number for task 07 is the next free number in `docs/adr/` when task 07 runs (sub-project 2 takes 0047).
- Ruling: a fixture page never references a host other than `127.0.0.1` or `localhost` on the test server's own port, so the suite makes no outside request.
- Ruling: red-team finding 32 (drop the library backends) is declined by the owner: all three backends stay.

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | Spike: local judge on real pages, pipe driver per OS | none (sub-projects 1 and 2 complete) | `spike.md` with measurements and a go or stop verdict | MVP |
| 02 | Own CDP driver and the `read` subcommand | 01 | `Driver` interface, browser finder, pipe CDP driver, fresh profile, origin pinning and guard, pop-up blocking, `browse.json`, `read <url>` | MVP |
| 03 | Playwright and puppeteer backends | 02 | library detection inside the project, adapters, the contract suite on all three backends | Core |
| 04 | Observation, shortlist and judge questions | 03 | `observe`, ranking, request builder (6 options, 2 questions), the judge import module, notice entry | Core |
| 05 | Explore loop, re-checks, verification and trace | 04 | `explore` without typing: decisions, freshness and occlusion, expectation after every step, failure mapping, remote consent, signals, trace and report | Core |
| 06 | Typing through an optional text model | 05 | `TYPE` operation, text model client, `browse.json` `textModel` | Core |
| 07 | The `fx-browse` skill and lane pointers | 06 | user-invoked skill, six-lane list, opencode rewrite and `lib/` link, `research` and `fx-design` pointers, ADR, docs | Polish |

Seven tasks, so no phase needs to ship alone; the column shows order of value. After 02, `read` works from the command line with fx's own driver. After 05, `explore` works with any configured judge. After 07, users and lanes reach it.
