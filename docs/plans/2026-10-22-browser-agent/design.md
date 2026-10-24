# Browser agent

**Date:** 2026-10-22
**Status:** ready-for-agent
**Approved:** 2026-10-22
**Glossary:** none (fx has no `CONTEXT.md`); terms used here are defined in Implementation Decisions item 1, "Terms"

## Problem Statement

fx has no way to drive a web page. Two jobs need one. First, exploring a UI flow end to end ("can a new user sign up?") and coming back with a trace and screenshots, before anyone writes assertions for it. Second, the `research` lane falls flat on pages that render their content with JavaScript: a plain fetch returns an empty shell.

The existing options do not fit fx's rules. jev-ultrafast, the reference loop, is Python, sends its decisions to a hosted judge, sends 100 or more options per question, and drives the user's own logged-in Chrome profile. Local judges, which fx must support so nothing leaves the machine, were measured only on 3 to 6 options per question. Browser MCP servers belong to the runtime, not to fx, and differ per harness.

This is sub-project 3 of 4. It needs sub-project 1 (TypeScript sources) and sub-project 2 (the judge client, `docs/plans/2026-10-22-fx-judge-hooks/`) finished.

## Solution

fx ships a small browser agent, written in TypeScript, that any of the four harnesses can run as `node <plugin>/lib/browse/cli.js` with Node alone.

- `read <url>` opens one page in a fresh headless browser, waits for it to settle, and prints its visible text and links as Markdown, with a screenshot in the trace directory. No judge is involved. It refuses loopback and private addresses unless given `--local`. The `research` lane points at it for public pages that need JavaScript; `fx-design` points at it, with `--local`, for a screenshot of a running page.
- `explore <url> --goal "<text>"` runs a step loop: observe the page, shortlist candidates in plain code, ask the judge which operation and target to use, act only on an observed element after re-checking it, and repeat until a user-given expectation passes, the judge says done or blocked, or a limit is hit. Every step is logged to a local trace directory with the judge's answers and a screenshot, and a `report.md` sums the run up.
- `/fx:fx-browse` is the user-invoked command that runs either, reads the report and tells the user what happened. The model never selects it on its own.

The browser is the Playwright or puppeteer library the user's project already has when one resolves there, and otherwise fx's own minimal Chrome DevTools Protocol driver over a pipe. Every run uses a new temporary profile, never the user's.

## User Stories

1. As a developer, I want to type `/fx:fx-browse explore http://localhost:3000 --goal "sign up as a new user" --expect-text "Welcome"`, so that an agent walks the flow and tells me whether the expected result appeared.
2. As a developer, I want each exploration to leave a trace directory with one log line per step, the judge's answers, a screenshot per step and the browser's own log, so that I can see exactly what was clicked and why.
3. As a developer, I want the run to stop as "verified" as soon as a check I gave (`--expect-text` or `--expect-url`) passes in code after any step, and to end "done, unverified" when the judge alone claimed success, so that a judge's guess is never reported as a pass.
4. As a developer, I want the report to suggest writing the assertions as Playwright tests or system specs, so that exploration does not turn into an untested check.
5. As an agent in the `research` lane, I want `read <url>` to return the rendered text of a public JavaScript page, and to refuse a local or private address, so that I can answer from a page a plain fetch cannot read without being steered into an internal service.
6. As an agent in the `fx-design` lane, I want `read --local <url>` to save a screenshot of a locally served page, so that I can critique the built result, not the code.
7. As a developer with Playwright or puppeteer installed in my project, I want fx to use that library, so that the browser it drives is the one my tests already use.
8. As a developer without either library, I want fx to find Chrome, Chromium or Edge on Windows, macOS or Linux and drive it directly, so that I install nothing.
9. As a developer, I want every run to start from a fresh temporary browser profile that is deleted afterwards, including when I interrupt it, so that my cookies, logins and history are never touched.
10. As a developer, I want nothing to leave my machine unless I configured a remote judge or text model and confirmed it for this run with `--allow-remote`, and the browser to stay on the origin it landed on, so that exploring an internal app does not leak it.
11. As a developer using a local judge, I want every judge question to carry at most 6 options and every request at most 2 questions, so that the judge works in the range it was measured on and inside its 1.5 s budget.
12. As a developer, I want the agent to act only on elements it observed and re-checked just before acting, so that a page that changed under it, or a banner covering a button, never gets a blind click.
13. As a developer, I want a configured small text model (any OpenAI-compatible endpoint, such as Ollama's `/v1`) to write the text the agent types, and typing to be skipped when none is configured, so that the agent can fill forms without a hosted service.
14. As a developer, I want the run to stop as blocked when it is stuck, out of steps or time, or the judge keeps failing, and to say why, so that a failed exploration is never silent.
15. As the fx author, I want a spike to prove the local judge picks the right element on real pages, completes real flows, and that the pipe driver works on Linux and Windows, before anything else is built, so that the plan stops early if the premise is wrong.
16. As the fx author, I want jev-ultrafast credited under its MIT licence, so that the rewrite respects its source.

## Implementation Decisions

**1. Terms**

- **Observation:** one snapshot of the page: URL, title, visible text, the candidate list, a page fingerprint and the scroll position.
- **Candidate:** one visible, enabled interactive element (or one option of a visible `<select>`) found by fx's own page function, with an id of the form `e<n>` that page-side code maps back to the node.
- **Head:** one judge question: the operation head, or a target head (click, type, select).
- **Shortlist:** the at most 5 candidates plain code offers to one target head.
- **Progress:** a step made progress when the fingerprint changed, or when a `SCROLL` moved the page down.
- **Trace directory:** the run's local output: `trace.jsonl`, `steps/NN.png`, `browser.log`, `report.md` (explore) or `page.md` and `screenshot.png` (read).

**2. Module layout**

All code is TypeScript under `src/lib/browse/`, built by sub-project 1's `scripts/build` to CommonJS under `lib/browse/` with the default mapping. The CLI is a `.js` file run with `node`, because an extensionless shebang script does not run on Windows. Modules, one responsibility each:

- `cli`: argument parsing, subcommand dispatch, exit codes, signal handling.
- `driver`: the `Driver` interface and `openDriver`, which picks a backend.
- `cdp`: fx's own driver: browser finder, launch with a fresh profile, CDP over a pipe, cleanup.
- `library`: adapters for an installed Playwright or puppeteer.
- `page`: the fixed page functions fx runs inside the page (settle, extract text, observe, resolve and hit-test, select content, select an option, scroll). Their source is sent as text; nothing the model returns is ever part of it.
- `observe`: turns a page function result into an `Observation`.
- `shortlist`: ranking and the question builder.
- `step`: decision resolution, acting, freshness and occlusion re-checks.
- `explore`: the loop, outcomes, verification.
- `read`: the read subcommand.
- `hosts`: the one loopback-and-private address check, used by `read --local`, `--allow-remote` and the report.
- `text-model`: the OpenAI-compatible client for typed text.
- `trace`: trace directory writer and `report.md`.
- `judge`: the one module that imports sub-project 2; every other browse module imports from here.
- `*-input` modules: one parser per trust boundary (CDP messages, page function results, library objects, text model reply, `browse.json`).

**3. Browser driver**

Selection order, with `--driver auto|playwright|puppeteer|cdp` to force one (default `auto`):

1. `playwright`, then `playwright-core`, then `puppeteer`, then `puppeteer-core`, each resolved with `require.resolve(name, { paths: [cwd] })`. A resolved path outside the directory of the nearest `package.json` above `cwd` is rejected, because `require.resolve` also walks parent and global module directories and only the user's project counts. The module, and each object fx later creates through it (context, page), is checked by a parser; a module or object without the functions fx calls is skipped with a logged reason.
2. Launch the library's Chromium headless with its default executable; if that fails, retry with the executable fx's finder located.
3. Otherwise fx's own CDP driver.
4. Otherwise exit 1 with `fx-browse: no browser found: install Chrome, Chromium or Edge, or set browserPath in <path of browse.json>`.

The report names the backend used.

Every backend gets a fresh profile: fx creates one with `fs.mkdtemp(path.join(os.tmpdir(), 'fx-browse-'))`, passes it as the user data directory (Playwright `launchPersistentContext`, puppeteer `userDataDir`, fx's driver `--user-data-dir`), and deletes it at the end, on error and on SIGINT, SIGTERM and SIGHUP. Only the trace lives under the repository's `.fx/`. On Windows the delete retries 5 times 200 ms apart on `EBUSY` or `EPERM`, because Chrome releases files late.

**fx's own driver talks CDP over `--remote-debugging-pipe`, not a WebSocket.** Chrome reads commands on file descriptor 3 and writes replies on 4, each message JSON ended by a NUL byte; Node's `child_process.spawn` opens both with `stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe']` on all three OSes. Messages are split on the `0x00` byte in `Buffer`s before decoding, so a multi-byte character split across two chunks survives. Reasons:

- Node 20 has no WebSocket client, and sub-project 1 targets `node20`. Requiring Node 22 for the fallback would raise fx's floor for one feature.
- fx has server-side WebSocket framing in the brainstorm companion, but a client needs the handshake, masking and a second code path fx would own for one feature.
- A debugging port on localhost can be reached by any local process for the life of the run; a pipe cannot.
- Playwright uses the pipe transport by default for the same reasons; puppeteer offers it as `pipe: true`.

If the spike shows the pipe failing on an OS, the fallback for that OS is Node 22's global `WebSocket` with `--remote-debugging-port=0` and the `DevToolsActivePort` file, and on Node 20 the run exits with a message asking for Node 22 or a library. No hand-written WebSocket client in either case.

Chrome's stderr is drained to `<trace dir>/browser.log`; on exit 1 the CLI prints the last 20 lines of it.

Browser finder order: `browserPath` from `browse.json`; then per OS:
- Linux: `google-chrome`, `google-chrome-stable`, `chromium`, `chromium-browser`, `microsoft-edge` on `PATH`. A path under `/snap/` is skipped with the warning `fx-browse: skipping snap browser <path>: its sandbox cannot read a temporary profile`, unless it is the configured `browserPath`.
- macOS: `Google Chrome.app/Contents/MacOS/Google Chrome`, `Chromium.app/Contents/MacOS/Chromium` and `Microsoft Edge.app/Contents/MacOS/Microsoft Edge`, under `/Applications` and then `~/Applications`.
- Windows: the default value of `HKLM` then `HKCU` `\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe` and `msedge.exe` (read with `reg query`); then `Google\Chrome\Application\chrome.exe` and `Microsoft\Edge\Application\msedge.exe` under `%PROGRAMFILES%`, `%PROGRAMFILES(X86)%` and `%LOCALAPPDATA%`.

Launch flags: `--headless=new --remote-debugging-pipe --user-data-dir=<profile> --no-first-run --no-default-browser-check --disable-background-networking --disable-component-update --disable-sync --disable-default-apps --disable-extensions --disable-domain-reliability --disable-client-side-phishing-detection --no-pings --metrics-recording-only --password-store=basic --use-mock-keychain --disable-features=Translate,OptimizationHints,MediaRouter about:blank`. The background-networking flags keep Chrome itself from calling home.

Shutdown: CDP `Browser.close`, wait up to 2 s, then kill; on Windows the last resort is `taskkill /pid <pid> /T /F`.

The `Driver` interface every backend implements, exact shape:

```ts
export type DriverEvent =
  | { kind: 'navigation-blocked'; url: string }
  | { kind: 'popup-closed'; url: string }
  | { kind: 'dialog-dismissed'; message: string }
  | { kind: 'download-denied'; url: string };

export interface Driver {
  readonly backend: 'playwright' | 'puppeteer' | 'cdp';
  goto(url: string, timeoutMs: number): Promise<void>; // first call follows redirects, then pins the origin
  evaluate(source: string, arg: JsonValue): Promise<unknown>; // source: a fixed page function's text
  mouseClick(x: number, y: number): Promise<void>;
  insertText(text: string): Promise<void>;
  screenshot(file: string): Promise<void>; // viewport PNG
  currentUrl(): Promise<string>;
  events(): DriverEvent[]; // drained on read
  close(): Promise<void>; // closes the browser and deletes the profile
}
```

**4. Nothing leaves the machine**

- The browser opens only the URL the user gave, `http:` or `https:`. The first `goto` follows redirects wherever they lead; the allowed origin is then pinned to the origin of the final URL.
- After that, top-level navigations to another origin are blocked (CDP `Fetch` on main-frame documents, Playwright `context.route`, puppeteer request interception) and recorded as `navigation-blocked`. Resources the page itself loads are allowed: that is the page the user asked for.
- New tabs and pop-ups never send a request: the CDP backend uses `Target.setAutoAttach` with `waitForDebuggerOnStart: true` and `flatten: true` and closes any new page target before resuming it; Playwright's `context.route` fails every request from a page other than the main one and closes it; puppeteer does the same through a CDP session from `browser.target().createCDPSession()`. Each is recorded as `popup-closed`. Downloads are denied. Dialogs are dismissed and recorded.
- `read` refuses a loopback or private host (`localhost`, `127.0.0.0/8`, `::1`, `10/8`, `172.16/12`, `192.168/16`, the same list sub-project 2 uses) unless `--local` is given, with exit 2 and `fx-browse: <host> is a local or private address; pass --local to read it`.
- The judge and the text model are called only when configured. `explore` refuses to start, before launching a browser, when the judge's `base_url` or the text model's `baseUrl` is neither `mock`, loopback nor private, unless `--allow-remote` is given: exit 2 with `fx-browse: page content would be sent to <host>; pass --allow-remote to allow it`. With `--allow-remote`, the host is printed to stderr before launch and named in `report.md`.
- Password, file and hidden inputs are never candidates, and their values never enter any state sent anywhere. Every judge state string is also redacted by sub-project 2's client.

**5. Observation**

The `observe` page function follows jev-ultrafast's `snapshot.js` mechanism, rewritten:

- Candidates: `a[href]`, `button`, `input`, `textarea`, `select`, `summary`, `[contenteditable="true"]` and the ARIA roles button, link, checkbox, radio, switch, tab, menuitem, menuitemradio, option, combobox, textbox, searchbox, spinbutton. Skipped: `aria-hidden`, `inert`, disabled, zero size, failing `checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })`, and password, file and hidden inputs.
- Unlike jev-ultrafast, candidates come from the whole document, not only the viewport: the shortlist keeps the judge's options small, so the table size no longer matters. Capped at 300, with the overflow count recorded.
- Label: `aria-labelledby`, `aria-label`, associated `<label>`, button value, `alt`, own text, `title`, `placeholder`, else the role name.
- Kind: `fill` for editable text inputs, textareas, searchbox, spinbutton and contenteditable; `select` for each unselected enabled option of a `<select>`, labelled `<select label> → <option label>`; `click` for the rest.
- Each node gets a stable numeric id in a page-side `WeakMap`, exposed as `e<n>` (a string that is not an array index, so JavaScript object key order keeps rank order). Nothing is written to the DOM.
- Each candidate carries a guard string: role, label, value, checked, selected, expanded and href. The observation's fingerprint covers URL, title, visible text and every candidate's guard, not the scroll position; the scroll position is recorded separately so a `SCROLL` can be judged by whether it moved.
- Page text for the judge: viewport text first, then the rest of the document, capped at 2,000 characters.

**6. Shortlist and questions**

Plain code decides what reaches the judge. **Every judge question carries at most 6 options, and every request at most 2 questions.**

- Ranking, per target head: tokenize the goal and each candidate's label (lowercase, split on anything that is not a Unicode letter or digit, drop tokens shorter than 2 characters and a fixed English stopword list). A candidate's score is the sum, over goal tokens found in its label, of `ln(1 + N / (1 + df))`, where `N` is the number of candidates for that head and `df` the number whose label holds the token. Ties break by document order. A candidate the agent acted on in the last 3 steps without progress is excluded.
- Each target head offers the top 5 plus an option `none` ("None of these moves toward the goal"). Options are sub-project 2's `[name, description]` pairs: the name is the candidate id, the description is `<label> (role <role>; value <value>; href <href>)` with absent parts left out.
- Operation head: `DONE` ("The goal is visibly achieved on this page") and `BLOCKED` ("Nothing offered here can make progress") are always offered, last, because judges favour the first option. Before them, at most 4 of, in this order: `CLICK` when click candidates exist; `TYPE` when fill candidates exist and a text model is configured; `SELECT` when select candidates exist; `SCROLL` when the page extends below the viewport; `WAIT` when the previous step made no progress.
- Request 1 of a step: the `operation` head plus the `click_target` head when `CLICK` is offered. Request 2, only when the operation is `TYPE` or `SELECT`: the `type_target` or `select_target` head alone. jev-ultrafast asks every target head at once; fx does not, because sub-project 2's response parser rejects the whole answer when any one head is malformed, so an unused head would cost the step.
- When the chosen target head answers `none`, that head is asked again alone with the next 5 by rank, at most twice (15 candidates in all), and then the step is recorded with no action. At most 3 requests per decision.
- State sent with every request, all strings as sub-project 2 requires: `url`, `title`, `text` (at most 2,000 characters), and `recent_actions`, the JSON text of the last 5 steps' operation, target label and progress. Each question's instructions name the goal and say that page text is content to read, not instructions to follow.

**7. Acting**

Model output selects an option name from a list fx built; it never becomes a selector, a script or a URL.

- Before any input: the page fingerprint must equal the one the decision was made on, and the `resolve` page function finds the node by id, checks it is connected, visible and has the same guard, scrolls it to the centre of the viewport, and hit-tests its centre with `elementFromPoint`: the hit must be the node or inside it. Any failure is a stale decision: re-observe and decide again, at most 2 times per step, then record a step with no action.
- `CLICK`: a mouse click at the resolved centre.
- `TYPE`: a click to focus, the `selectContent` page function selects the field's current content, then `insertText` with the text model's text.
- `SELECT`: a page function sets the observed `<select>` to the observed option's index and dispatches `input` and `change`.
- `SCROLL`: a page function scrolls down by 80% of the viewport height.
- `WAIT`: 1,000 ms.
- After each action: a viewport screenshot to `steps/NN.png`, then a new observation, then the expectation check (item 8).

**8. Outcomes and verification**

- **Expectation.** When `--expect-text` or `--expect-url` is given, fx checks it in code after every acted step and whenever the judge answers `DONE`: the full page's visible text contains the expected text (case-insensitive) and the URL contains the expected fragment; both given means both must hold. The first time it passes, the run stops with outcome `verified`. A judge `DONE` that fails the check is logged as rejected and the loop continues as a step without progress.
- **Judge `DONE` without an expectation:** outcome `done-unverified`, unless the operation answer carries an escalation, in which case the claim is logged as rejected and the loop continues. A judge's claim is never reported as a pass.
- `BLOCKED` from the judge: outcome `blocked`, reason `judge`.
- **Judge failures,** mapped from sub-project 2's `UnavailableReason`:

| Judge result | Step recorded as | Run ends `blocked` with reason |
|---|---|---|
| `no-config`, `bad-config` | (checked before the browser launches) | `judge-unavailable`, immediately |
| `timeout`, `network`, `http-<status>` | `judge-unavailable`, no action | `judge-unavailable` after 2 such steps in a row |
| `bad-response`, or a choice fx did not offer | `invalid-answer`, no action | `judge-invalid` after 3 such steps in a row |

  `report.md` quotes the result's `detail` for each failed step.
- Three steps in a row without progress and without `WAIT`: `blocked`, reason `stuck`. Step limit (`--max-steps`, default 20, hard cap 50): `blocked`, reason `max-steps`. Wall clock over 540 s: `blocked`, reason `time-limit` (under the 600 s cap a harness's shell tool allows).
- **Uncertain.** A step is marked `uncertain` when the operation answer or the target answer it used has `escalate` not `null`. It is still acted on (exploration is low stakes and acts only on observed nodes); the report counts uncertain steps. Confidence in the trace is `probabilities[choice]`.
- **Signals.** SIGINT, SIGTERM and SIGHUP stop the loop, write `report.md` from the steps so far with outcome `blocked` and reason `interrupted`, delete the profile and exit 4.
- CLI exit codes: 0 `verified`, 3 `done-unverified`, 4 `blocked`, 1 driver or runtime error, 2 usage error or refusal. The last stdout line is `outcome: <outcome> <trace dir>`.

**9. Judge client (from sub-project 2)**

Written against sub-project 2's design items 1 and 2 and its task 01 as of 2026-10-22. `src/lib/browse/judge.ts` is the only browse module that imports it; `plan.md` lists every symbol SP3 depends on, so a later change in sub-project 2 shows as a diff there.

- Config: sub-project 2's `judge.json` at `machinePaths().judgeConfig` (`base_url`, `model`, optional `api_key`, `mock_answers` when `base_url` is `mock`). fx browse never writes it.
- `loadJudge()` once per run, returning a `JudgeHandle` (`none`, `invalid` with a reason, or `ready` with its `JudgeConfig`). `none` and `invalid` end `explore` before the browser launches.
- `askJudge(handle, state: Record<string, string>, questions: Record<string, JudgeQuestion>)` never rejects and runs under sub-project 2's fixed 1,500 ms budget; the browse code passes no timeout. Choice questions are `{ type: 'choice', instructions, options: [name, description][] }`; the answer is `{ type: 'choice', choice, probabilities, escalate: EscalateReason | null }`. `noul` and the result's `model` and `latencyMs` are used as given; there is no `score` type and no `confidence` field.
- The judge endpoint shown in the report and checked for `--allow-remote` is derived from the handle: `ready` gives `config.baseUrl` and `config.model`, anything else none. `mock` counts as local.
- The browse loop takes an `AskFn = (state, questions) => Promise<JudgeResult>` parameter. The CLI passes `(s, q) => askJudge(handle, s, q)`; tests pass a scripted function, and the CLI tests use `judge.json` with `base_url: "mock"`.
- The browse code checks again that a choice is one of the names it offered, so a looser parser upstream cannot make it act on an unknown id.

**10. Text model and `browse.json`**

- fx browse owns its own per-machine file, `<machinePaths().configDir>/browse.json`, beside sub-project 2's `judge.json`, parsed by `parseBrowseConfig`. Missing file: no settings. Fields: `browserPath` (string), `textModel` (`{ "baseUrl": "http://127.0.0.1:11434/v1", "model": "<id>", "apiKeyEnv": "<ENV VAR NAME>" }`, `apiKeyEnv` optional). The key itself is read from that environment variable, never stored. A malformed file is ignored whole with `fx-browse: ignoring malformed browse.json`.
- Request: `POST <baseUrl>/chat/completions` with `model`, a fixed system prompt, one user message holding the field context as JSON (goal, the field's label, role and current value, page title, page text capped at 2,000 characters, last 5 actions), `response_format: { type: "json_object" }`, `temperature: 0`, `max_tokens: 256`, 20 s timeout.
- Reply: `choices[0].message.content` must parse to an object with exactly one key, `text`, a non-empty string of at most 2,000 characters. Anything else types nothing and records `text-model-invalid`; the step counts as one without progress.
- Not configured: `TYPE` is not offered.

**11. Trace**

- Default directory `.fx/browse/<YYYYMMDD-HHMMSS>-<subcommand>/` under the current directory (ADR 0015: regenerable working files live under `.fx/`), or `--out <dir>`.
- `trace.jsonl`: one JSON object per step, appended and flushed at the end of each step so a crash keeps the steps before it: `step`, `at`, `url`, `fingerprint`, `scroll_y`, `candidates`, `omitted`, `shortlists` (per head: id, label, score), `requests` (questions and state of each request), `answers`, `judge_model`, `judge_latency_ms`, `judge_failure` (reason and detail, when any), `decision`, `confidence`, `uncertain`, `widenings`, `stale_retries`, `action`, `typed_text`, `events`, `progress`, `expectation` (`passed`, `failed` or `none`), `screenshot`.
- `browser.log`: Chrome's stderr for the run.
- `report.md`: goal, start URL, backend, judge model and host, text model host, outcome and reason, a step table (number, operation, target label, confidence, uncertain, progress, ms), judge failure details, events, the remote-host line when it applies, and the line "Write the checks you want to keep as Playwright tests or system specs; this run is exploration, not an assertion."

**12. Surface**

- One new user-invoked skill, `fx-browse`, hand-written like `fx-audit` (it needs its own base directory to cite the CLI): `disable-model-invocation: true`, and its Codex `agents/openai.yaml` generated by `scripts/gen-command-skills`. On opencode it becomes a command through `lib/opencode-commands.js`, whose citation rewrite learns `../../lib/` alongside `references/` and `agents/`, and the opencode installer links `lib/` into the destination beside `references/` so linked skills resolve it too. Its body tells the agent to build the CLI's absolute path from the skill's base directory, run it with exactly the user's URL and arguments (never adding a URL, `--local` or `--allow-remote` the user did not give), with the shell tool's timeout set to 600,000 ms, then read `report.md` or `page.md` and relay the outcome in the report's own words.
- No model-selectable lane is added, so no intent gains a second claimant. The two lanes that need a browser cite the CLI as a pointer (ADR 0006), not an invocation, telling the agent to resolve `../../lib/browse/cli.js` from the skill's base directory to an absolute path: `research` gets one paragraph (`read` without `--local`), and `fx-design`'s "Critique your own work" gets one sentence (`read --local`). `fx-review` and `fx-debug` get nothing: a review checks a diff, and `fx-debug` already lists a headless browser script as a feedback loop.
- The user-invoked list grows from five to six everywhere it is enumerated.
- The skill and `INSTALL.md` name as supported only the judges that passed the spike; macOS is labelled unverified unless the spike ran there.
- A new ADR records: fx owns a browser driver; library first, pipe CDP fallback, no WebSocket client; fresh profile in the OS temp directory; origin pinned after the first load; local-only `read` and remote consent for `explore`; at most 6 options per question and 2 questions per request; model output never becomes selectors or scripts; `verified` only in code; the surface choice. It amends ADR 0012 ("No browser-driven design loop" stays true: fx-design gets a screenshot pointer, not a loop) and ADR 0025 (six lanes).
- `THIRD_PARTY_NOTICES.md`, created by sub-project 2, gains a jev-ultrafast (MIT) entry with its copyright line, saying fx's code is a TypeScript rewrite of its loop and observation mechanism, not a copy.

## Testing Decisions

- **Confirmed seams:**
  1. Pure functions, unit tested with `node:assert`: ranking and question building, decision resolution, outcome and failure mapping, the host check, browser finder (OS, environment, registry and file existence injected), pipe message codec, every `*-input` parser.
  2. The `Driver` contract, one shared suite run against each backend on a real headless Chrome serving local fixture pages from a Node `http` server on `127.0.0.1:0` that records every request path. Playwright and puppeteer run as `playwright-core` and `puppeteer-core` dev dependencies with the system Chrome's path, so no browser is downloaded. Every other test passes `--driver cdp` or runs from a temporary directory, so those dev dependencies never change which backend a test uses.
  3. `runExplore` end to end on the same fixtures with a scripted `AskFn` (answers chosen by label, so the script does not depend on ids) and, for typing, a fake OpenAI-compatible server on `127.0.0.1:0`; one test drives the real `askJudge` against sub-project 2's `startFakeSystemOne` to check the request body fx sends.
  4. The CLI as a child process, always under sub-project 2's `scratchHookEnv()` so a developer's own `judge.json` and `browse.json` never change a result, with `judge.json` set to `base_url: "mock"` where a judge is needed.
- **Good test here:** what the user sees: the outcome, exit code, trace lines, files written, the request body a fake server received, what the page shows after an action. Never the CDP message sequence or the page function's internals.
- **Fixtures** (static HTML with inline scripts, under `tests/browse/fixtures/`): a sign-up form with a country `<select>` that shows "Welcome, <name> (<country>)" on submit; a button covered by a cookie banner with a close button; content rendered by script after 300 ms; a link to the same server under a different origin (`localhost` versus `127.0.0.1`) and a pop-up button, so the origin guard is tested without any outside network; a button relabelled after a delay; a page with many buttons; a server route that redirects to the other origin, and one that never answers.
- **Real browser required:** the browser tests need Chrome, Chromium or Edge on the machine running `scripts/check-all`, as the conformance rows already need the harness CLIs. They fail, not skip, when none is found.
- **Prior art:** sub-project 2's `tests/helpers/fake-systemone` and `tests/helpers/hook-env`; `tests/gates/codex-hook-output.test.js` spawns a process and asserts its output; `lib/*.test.js` are plain `node:assert` files run by `node <file>`.

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

## Out of Scope

- Frames, shadow roots, canvas, file uploads, following pop-up tabs, nested scroll containers and custom keyboard widgets, as in jev-ultrafast's MVP.
- Logging in, cookies, or any reuse of the user's browser state.
- Navigation across origins after the first load, including sign-in redirects.
- Assertions, test generation, or turning a trace into a Playwright test.
- Screenshot-based (vision) decisions; the judge sees text only.
- Firefox and WebKit.
- A browser inside WSL driving Windows Chrome: under WSL the Linux browser is used.
- A CI job on Windows or macOS: fx's only workflow is the Ubuntu nightly conformance run.

## Open Questions

None. Sub-project 2's interface is taken from its current plan; `plan.md` lists every symbol this plan depends on.

## Further Notes

- Research: `/development/promots/jev-adapt-for-fx.md` section 1.1 and `/development/promots/jev-research.md` sections 7 to 9. jev-ultrafast mechanism read from its public `model.py`, `agent.py` and `snapshot.js` on 2026-10-22.
- Local judge results to rely on (section 9 of the research): Kev-4B, Nimble 9B (Ollama), Rizzo 4B and d1-3B are usable; Laya and Von are not. Those were measured on guard and router questions with 3 to 6 options, not on element choice, which is what the spike measures.
- jev-ultrafast's own measurement is one task, three runs, one profile, against a hosted judge. Nothing here assumes a local judge matches it.
- Red-team of 2026-10-22: every finding folded in except the proposal to drop the library backends; the owner kept all three backends.
