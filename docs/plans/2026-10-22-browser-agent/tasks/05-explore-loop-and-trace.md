# 05: Explore loop, re-checks, verification and trace

**Status:** ready-for-agent
**Blocked by:** 04
**Phase:** Core

**What to build:** `node lib/browse/cli.js explore <url> --goal "<text>" [--expect-text <s>] [--expect-url <s>] [--max-steps <n>] [--allow-remote]` runs the step loop with the configured judge: observe, shortlist, ask, re-check the target's freshness and that nothing covers it, act (click, select, scroll, wait), screenshot, check the expectation, repeat. It stops `verified` the first time the user's expectation passes in code, ends `done-unverified` when the judge alone claims success, or `blocked` with a reason (judge, stuck, step or time limit, judge unavailable, judge invalid, interrupted). It refuses a non-local judge without `--allow-remote` before launching anything. Every step is appended to `trace.jsonl` as it ends, and `report.md` sums up the run, also when interrupted. Typing is not offered yet (task 06).

**Design:** Implementation Decisions > 4; Implementation Decisions > 6; Implementation Decisions > 7; Implementation Decisions > 8; Implementation Decisions > 9; Implementation Decisions > 11; Global Constraints

**Files:**
- Modify: `src/lib/browse/page.ts` (add page functions `resolve`, `selectOption`, `scrollDown`)
- Modify: `src/lib/browse/page-input.ts` (add `parseResolved`)
- Create: `src/lib/browse/step.ts` (`resolveDecision`, `act`)
- Create: `src/lib/browse/explore.ts` (`runExplore`, `verifyExpectation`, `failureStep`, `exitCode`)
- Modify: `src/lib/browse/trace.ts` (`appendStep`, `writeReport`)
- Modify: `src/lib/browse/cli.ts` (the `explore` subcommand, remote consent, signals)
- Create: `src/lib/browse/explore.test.ts` (pure: resolution, verification, failure mapping, exit codes, report text)
- Create: `src/tests/browse/explore.test.ts` (real Chrome, scripted judge)
- Create: `src/tests/browse/explore-cli.test.ts` (CLI under `scratchHookEnv()` with the mock judge)
- Create: `tests/browse/fixtures/covered.html`, `tests/browse/fixtures/stale.html`
- Generated: the matching `lib/browse/*.js`, `tests/browse/explore.test.js`, `tests/browse/explore-cli.test.js`
- Modify: `scripts/check-all` (run the three new test files)

**Interfaces:**
- Consumes: `Driver`, `DriverChoice`, `openDriver`, `makeRunDir`, `extractText`, `isLocalUrl`, `readBrowseConfig` (task 02); `observe`, `Observation`, `rank`, `shortlist`, `operationOptions`, `buildStepRequest`, `buildTargetRequest`, `Operation`, `Head`, `HistoryEntry`, `JudgeRequest`, `loadJudge`, `askJudge`, `judgeEndpoint`, `JudgeResult`, `JudgeQuestion`, `JudgeAnswer` (task 04); `scratchHookEnv`, `writeJudgeConfig`, `runHook` (sub-project 2).
- Produces, in `explore.ts`:
  - `type AskFn = (state: Record<string, string>, questions: Record<string, JudgeQuestion>) => Promise<JudgeResult>`
  - `type FieldContext = { goal: string; label: string; role: string; value: string; title: string; text: string; recent: { op: Operation; label?: string }[] }`
  - `type TypeTextFn = (ctx: FieldContext) => Promise<string | null>` (task 06 supplies one; `null` as the option means typing is not offered)
  - `type ExploreOptions = { url: string; goal: string; expectText?: string; expectUrl?: string; maxSteps: number; maxMs: number; cwd: string; out?: string; choice: DriverChoice; ask: AskFn; typeText: TypeTextFn | null; judge: { baseUrl: string; model: string } | null; textModelBaseUrl?: string; signal?: AbortSignal }`
  - `type BlockedReason = 'judge' | 'stuck' | 'max-steps' | 'time-limit' | 'judge-unavailable' | 'judge-invalid' | 'interrupted'`
  - `type ExploreResult = { outcome: 'verified' | 'done-unverified' | 'blocked'; reason?: BlockedReason; dir: string; steps: number; uncertain: number }`
  - `runExplore(opts: ExploreOptions): Promise<ExploreResult>` (an aborted `signal` ends the run with `interrupted`, writes `report.md` and closes the driver)
  - `verifyExpectation(page: { url: string; text: string }, expect: { text?: string; url?: string }): 'passed' | 'failed' | 'none'`
  - `failureStep(r: { ok: false; reason: string }): 'judge-unavailable' | 'invalid-answer'` (`bad-response` gives `invalid-answer`; `timeout`, `network` and every `http-<status>` give `judge-unavailable`)
  - `exitCode(r: ExploreResult): 0 | 3 | 4`
- Produces, in `step.ts`: `resolveDecision(answers: Record<string, JudgeAnswer>, offered: Record<string, string[]>): { kind: 'act'; op: Operation; targetId?: string; confidence: number; uncertain: boolean } | { kind: 'need-target'; op: 'TYPE' | 'SELECT' } | { kind: 'none-of-these'; head: Head } | { kind: 'invalid' }`. `offered` maps each question name to the option names fx sent. `confidence` is `probabilities[choice]` of the operation answer; `uncertain` is true when the operation answer or the target answer used has `escalate` not `null`.
- Loop rules (design items 7 and 8): limits checked per step; `maxMs` default 540,000; judge failures counted in a row per kind (2 `judge-unavailable` steps end the run, 3 `invalid-answer` steps end it); the expectation is checked after every acted step and on every judge `DONE`.
- Produces: CLI `explore <url> --goal <text> [--expect-text <s>] [--expect-url <s>] [--max-steps <n>] [--allow-remote] [--out <dir>] [--driver <choice>]`. Before launching a browser: `loadJudge()`; `none` or `invalid` prints `outcome: blocked <dir>` after writing `report.md` with reason `judge-unavailable` and the handle's reason, exit 4; a `ready` judge whose `baseUrl` fails `isLocalUrl` without `--allow-remote` exits 2 with `fx-browse: page content would be sent to <host>; pass --allow-remote to allow it`; with it, that line's host is printed to stderr as `fx-browse: sending page content to <host>`. SIGINT, SIGTERM and SIGHUP abort the run's `signal`.
- Produces, in `trace.ts`: `appendStep(dir: string, step: Record<string, JsonValue>): void` (appends one line and flushes) and `writeReport(dir: string, r: ExploreResult, meta: { goal: string; url: string; backend: string | null; judge: { baseUrl: string; model: string } | null; textModelBaseUrl?: string; rows: { step: number; op: string; target: string; confidence: number; uncertain: boolean; progress: boolean; ms: number }[]; failures: { step: number; reason: string; detail: string }[]; events: DriverEvent[] }): void`

**Seam:** `runExplore` end to end on real Chrome with a scripted `AskFn` that picks options by label; the CLI as a process with the mock judge; pure functions for resolution, verification, mapping and exit codes.

**Tests:**
- `resolveDecision` with `operation` choosing `CLICK` (probability 0.8, `escalate: null`) and `click_target` choosing offered `e7`: returns `{ kind: 'act', op: 'CLICK', targetId: 'e7', confidence: 0.8, uncertain: false }`.
- `click_target` choosing `e99`, not offered: `{ kind: 'invalid' }`. `click_target` choosing `none`: `{ kind: 'none-of-these', head: 'click' }`. `operation` choosing `SELECT` with no `select_target` asked: `{ kind: 'need-target', op: 'SELECT' }`.
- `operation` answer with `escalate: 'small-gap'`: `uncertain: true`. `operation` clear and `click_target` with `escalate: 'low-top'`: `uncertain: true`.
- `failureStep({ ok: false, reason: 'bad-response' })` returns `'invalid-answer'`; `'timeout'`, `'network'` and `'http-529'` return `'judge-unavailable'`.
- `verifyExpectation({ url: 'http://a/done', text: 'Tour Started' }, { text: 'tour started' })` returns `'passed'`; with `{ text: 'missing' }` returns `'failed'`; with `{ url: '/done', text: 'tour started' }` returns `'passed'`; with `{ url: '/other', text: 'tour started' }` returns `'failed'`; with `{}` returns `'none'`.
- `exitCode` returns 0, 3 and 4 for the three outcomes.
- `writeReport` with judge `{ baseUrl: 'https://judge.example.com', model: 'm' }`: `report.md` contains `Page content was sent to judge.example.com.`; with `http://127.0.0.1:8017` or `mock`: it does not contain `Page content was sent`. Both contain `Write the checks you want to keep as Playwright tests or system specs; this run is exploration, not an assertion.` A failure row `{ step: 2, reason: 'timeout', detail: 'aborted after 1500 ms' }` appears as text containing `aborted after 1500 ms`.
- Occlusion, `covered.html` (a `Start tour` button under a fixed `Accept cookies` banner; a `Noop` button that does nothing; clicking `Start tour` when uncovered shows `Tour started`), goal `start the tour`, `expectText: 'Tour started'`, scripted judge answering in call order: 1 `CLICK` `Start tour`; 2 `CLICK` `Accept cookies`; 3 `CLICK` `Start tour`. Result: `outcome: 'verified'`, `steps: 2`; step 1's trace line has `stale_retries: 1` and action on `Accept cookies`; step 2's has `stale_retries: 0` and `expectation: 'passed'`; `steps/` holds exactly `01.png` and `02.png`; the scripted judge was called exactly 3 times.
- Freshness, `stale.html` (button `Go` relabelled `Gone` 1,000 ms after load; clicking it shows `Clicked`), `expectText: 'Clicked'`, scripted judge: call 1 waits 1,500 ms then answers `CLICK` on the button's id; call 2 answers at once `CLICK` on the same id. Result: `verified`, `steps: 1`, step 1 `stale_retries: 1`, one PNG.
- Origin guard, `events.html` with the scripted judge clicking the other-origin link, then `BLOCKED`: step 1's `events` include `navigation-blocked`, its `progress` is `false`, the URL is unchanged; `outcome: 'blocked'`, `reason: 'judge'`.
- Stuck: a scripted judge that always answers `CLICK` `Noop` on `covered.html`: `outcome: 'blocked'`, `reason: 'stuck'`, `steps: 3`.
- Judge unavailable: `ask` returns `{ ok: false, reason: 'timeout', detail: 'aborted after 1500 ms', latencyMs: 1500 }` twice: `outcome: 'blocked'`, `reason: 'judge-unavailable'`, `steps: 2`, no PNG written; one timeout followed by a good answer does not block.
- Judge invalid: `ask` returns `{ ok: false, reason: 'bad-response', detail: 'answer operation is missing', latencyMs: 5 }` three times: `blocked`, `judge-invalid`, `steps: 3`; each step's `action` is `invalid-answer`.
- Done unverified: a scripted `DONE` at step 1 with no expectation: `outcome: 'done-unverified'`. The same `DONE` with `escalate: 'low-top'` and `maxSteps: 1`: `blocked`, `max-steps`, and the trace logs the claim as rejected.
- Done rejected: `expectText: 'never there'`, scripted `DONE` every call, `maxSteps: 2`: `blocked`, `max-steps`, both steps log the claim as rejected.
- Time limit: `maxMs: 1000` with a scripted judge that waits 600 ms per call and clicks `Noop`: `blocked`, `time-limit`.
- Interrupted: aborting `signal` during step 2 ends with `blocked`, `interrupted`; `report.md` exists and the profile directory is gone.
- Widening: a scripted judge answering `none` on `click_target` once, then a real id: that step's `widenings` is 1 and the second request holds only `click_target`, offering the next 5 by rank plus `none`.
- Trace: every line of `trace.jsonl` parses as JSON and has `step`, `url`, `fingerprint`, `scroll_y`, `shortlists`, `requests`, `answers`, `decision`, `confidence`, `uncertain`, `widenings`, `stale_retries`, `action`, `events`, `progress`, `expectation`, `screenshot`; the number of lines equals `steps`.
- Caps: across every request the scripted judges received in this file's runs, no question had more than 6 options, no request more than 2 questions, and no decision more than 3 requests.
- CLI (under `scratchHookEnv()`, `--driver cdp`): with `writeJudgeConfig(dirs, { base_url: 'mock', model: 'm', mock_answers: { operation: { choice: 'DONE', probabilities: { DONE: 0.95, BLOCKED: 0.05 } } } })`, `explore <origin>/js-only.html --goal "see the rendered text" --expect-text "Rendered by script"` exits 0 and its last stdout line matches `^outcome: verified `.
- CLI: with no `judge.json`, `explore <origin>/js-only.html --goal x` exits 4, its last line matches `^outcome: blocked `, its `report.md` contains `judge-unavailable`, and no browser was launched (no `browser.log` in the run directory).
- CLI: with `judge.json` `{ base_url: 'https://judge.example.com', model: 'm' }`, `explore <origin>/js-only.html --goal x` exits 2 with stderr `fx-browse: page content would be sent to judge.example.com; pass --allow-remote to allow it`.
- CLI: without `--goal`, exit 2 with stderr `fx-browse: explore needs --goal`; with `--max-steps 51`, exit 2 with stderr `fx-browse: --max-steps is at most 50`.

**Risks:** a click must go only to the resolved centre of a node the hit-test confirmed; never act on coordinates from an older observation. The decision is cleared before acting so a retry can never double-click. Page text in the state can try to steer the judge; the instructions say it is content, and the action space stays the observed nodes.

**Idempotency:** each run writes a new run directory; `appendStep` only appends to that run's own file.

**Testing:** unit (`lib/browse/explore.test.js`), integration on real Chrome (`tests/browse/explore.test.js`), CLI (`tests/browse/explore-cli.test.js`).

## Acceptance criteria
- [ ] An explore run on `covered.html` reaches `verified` only after the banner is dismissed, and the trace shows the covered click was refused.
- [ ] `verified` is reached only through a passing expectation, and `done-unverified` never prints as a pass.
- [ ] With the mock judge, the CLI reaches `verified` end to end through the real `askJudge`.
- [ ] A remote judge is never sent page content without `--allow-remote`.
- [ ] `trace.jsonl` has one line per step, written as each step ends; `report.md` exists after an interrupted run.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Write each test the Tests field names**
- [ ] **3. Run them: verify RED**

Run: `scripts/build && node lib/browse/explore.test.js; node tests/browse/explore.test.js; node tests/browse/explore-cli.test.js`
Expected: each fails because `runExplore` and `resolveDecision` are missing.

- [ ] **4. Implement the minimum that passes**
- [ ] **5. Run them: verify GREEN**

Run: same command, joined with `&&`. Expected: PASS.

- [ ] **6. Run the scope**

Run: `scripts/test-scope src/lib/browse/explore.ts src/lib/browse/step.ts src/lib/browse/trace.ts src/lib/browse/cli.ts`

- [ ] **7. Commit by path**

```
git add src/lib/browse/page.ts src/lib/browse/page-input.ts src/lib/browse/step.ts src/lib/browse/explore.ts src/lib/browse/trace.ts src/lib/browse/cli.ts src/lib/browse/explore.test.ts src/tests/browse/explore.test.ts src/tests/browse/explore-cli.test.ts tests/browse/fixtures/covered.html tests/browse/fixtures/stale.html lib/browse/page.js lib/browse/page-input.js lib/browse/step.js lib/browse/explore.js lib/browse/trace.js lib/browse/cli.js lib/browse/explore.test.js tests/browse/explore.test.js tests/browse/explore-cli.test.js scripts/check-all
git commit -m "feat(browse): explore loop with re-checks, verification and trace"
```
