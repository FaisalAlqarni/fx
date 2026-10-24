# 02: Own CDP driver and the `read` subcommand

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** MVP

**What to build:** `node lib/browse/cli.js read <url>` opens the page in a fresh headless Chrome, Chromium or Edge driven by fx's own CDP driver over `--remote-debugging-pipe`, follows the first load's redirects, waits for the page to settle, prints its title, final URL, visible text and links as Markdown, and leaves `page.md`, `screenshot.png` and `browser.log` in a trace directory. The temporary profile is gone afterwards, also after SIGINT, SIGTERM or SIGHUP. After the first load the browser stays on the final origin; pop-ups are closed before they send a request; dialogs and downloads are dismissed or denied; each is recorded. A loopback or private host is refused unless `--local` is given. This works on Node 20 with no npm package.

**Design:** Implementation Decisions > 2; Implementation Decisions > 3; Implementation Decisions > 4; Implementation Decisions > 10; Implementation Decisions > 11; Testing Decisions; Global Constraints

**Files:**
- Create: `src/lib/browse/judge.ts` (the one import site of sub-project 2: re-exports `machinePaths` for now; task 04 adds the judge client)
- Create: `src/lib/browse/driver.ts` (`JsonValue`, `DriverEvent`, `Driver`, `DriverChoice`, `OpenDriverOptions`, `openDriver`)
- Create: `src/lib/browse/cdp.ts` (finder, profile, launch, pipe session, the `cdp` backend)
- Create: `src/lib/browse/cdp-input.ts` (`parseCdpMessage`)
- Create: `src/lib/browse/hosts.ts` (`isLocalUrl`)
- Create: `src/lib/browse/page.ts` (`/// <reference lib="dom" />`; page functions `settle` and `extractText`)
- Create: `src/lib/browse/page-input.ts` (`parseExtracted`)
- Create: `src/lib/browse/config-input.ts` (`parseBrowseConfig`, `browserPath` only for now; `readBrowseConfig`)
- Create: `src/lib/browse/trace.ts` (`makeRunDir`)
- Create: `src/lib/browse/read.ts` (`runRead`, `toMarkdown`)
- Create: `src/lib/browse/cli.ts`
- Create: `src/lib/browse/cdp.test.ts`, `src/lib/browse/inputs.test.ts`
- Create: `src/tests/browse/fixture-server.ts`, `src/tests/browse/driver-contract.test.ts`, `src/tests/browse/read-cli.test.ts`
- Create: `tests/browse/fixtures/js-only.html`, `tests/browse/fixtures/events.html`
- Generated: the matching `lib/browse/*.js` and `tests/browse/*.js`
- Modify: `scripts/check-ts-escapes` (the no-`as` rule covers `src/lib/**/*-input.ts`, not only `src/lib/*-input.ts`)
- Modify: `scripts/check-all` (run the three new test files)

**Interfaces:**
- Consumes: `machinePaths()` (sub-project 2, plan.md rulings), imported only in `src/lib/browse/judge.ts`; `scratchHookEnv`, `runHook` (sub-project 2 test helpers).
- Produces, in `driver.ts`, exactly the `Driver` and `DriverEvent` types in design item 3, plus:
  - `type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue }`
  - `type DriverChoice = 'auto' | 'cdp'` (task 03 widens it)
  - `type OpenDriverOptions = { choice: DriverChoice; cwd: string; logFile: string; browserPath?: string }`
  - `openDriver(opts: OpenDriverOptions): Promise<Driver>`: creates the profile with `fs.mkdtemp(path.join(os.tmpdir(), 'fx-browse-'))` and owns its deletion; writes the browser's stderr to `logFile`. Rejects with `Error('fx-browse: no browser found: install Chrome, Chromium or Edge, or set browserPath in <browse.json path>')` when no browser is found.
  - The first `goto` follows redirects and then pins the allowed origin to `new URL(await currentUrl()).origin`; every later main-frame navigation to another origin is blocked and recorded.
- Produces, in `cdp.ts`:
  - `findBrowser(sys: { platform: NodeJS.Platform; env: Record<string, string | undefined>; home: string; exists(p: string): boolean; which(cmd: string): string | null; regQuery(key: string): string | null; warn(line: string): void }, configured?: string): string | null`
  - `encodeMessage(msg: JsonValue): Buffer`
  - `splitMessages(rest: Buffer, chunk: Buffer): { messages: string[]; rest: Buffer }` (splits on byte `0x00`, decodes each complete message as UTF-8)
  - `killCommand(platform: NodeJS.Platform, pid: number): string[] | null`
  - `removeProfile(dir: string, platform: NodeJS.Platform, rm: (dir: string) => Promise<void>, sleep: (ms: number) => Promise<void>): Promise<void>` (on `win32`, up to 5 attempts 200 ms apart on `EBUSY` or `EPERM`; elsewhere one attempt)
- Produces, in `cdp-input.ts`: `parseCdpMessage(text: string): { kind: 'reply'; id: number; result: unknown } | { kind: 'error'; id: number; message: string } | { kind: 'event'; method: string; params: unknown; sessionId?: string } | { kind: 'invalid' }`
- Produces, in `hosts.ts`: `isLocalUrl(url: string): boolean` (true for the literal `mock`, and for `localhost`, `127.0.0.0/8`, `::1`, `10/8`, `172.16/12`, `192.168/16`; false for anything else or an unparsable URL)
- Produces, in `page.ts`: `settle(arg: { quietMs: number; maxMs: number }): Promise<boolean>` and `extractText(arg: { maxChars: number; maxLinks: number }): { title: string; url: string; text: string; links: { text: string; href: string }[] }`. Page functions are self-contained: no imports, no reference to anything outside their own body. The caller sends `fn.toString()` as `Driver.evaluate`'s source.
- Produces, in `page-input.ts`: `parseExtracted(v: unknown): { title: string; url: string; text: string; links: { text: string; href: string }[] } | null`
- Produces, in `config-input.ts`: `parseBrowseConfig(raw: unknown): { browserPath?: string; warning?: string }` (task 06 adds `textModel`) and `readBrowseConfig(): { path: string; config: ReturnType<typeof parseBrowseConfig> }` (reads `<machinePaths().configDir>/browse.json`; a missing file gives `config: {}`)
- Produces, in `trace.ts`: `makeRunDir(cwd: string, sub: 'read' | 'explore', out?: string, now?: Date): string` (creates and returns `.fx/browse/<YYYYMMDD-HHMMSS>-<sub>` under `cwd`, or `out`)
- Produces, in `read.ts`: `runRead(opts: { url: string; cwd: string; out?: string; choice: DriverChoice; local: boolean }): Promise<{ dir: string; markdown: string }>` and `toMarkdown(page: { title: string; url: string; text: string; links: { text: string; href: string }[] }): string` (text capped at 100,000 characters, links at 200)
- Produces, in `src/tests/browse/fixture-server.ts`: `startFixtureServer(): Promise<{ origin: string; altOrigin: string; requests: string[]; close(): Promise<void> }>` serving `tests/browse/fixtures/` on `127.0.0.1:0`; `origin` is `http://127.0.0.1:<port>`, `altOrigin` is `http://localhost:<port>`; `requests` records each request's host and path; `/hang` never answers; `/redirect` answers 302 to `<altOrigin>/js-only.html`.
- Produces: CLI `node lib/browse/cli.js read <url> [--local] [--out <dir>] [--driver auto|cdp]`. Exit 0 on success, 1 on a driver or runtime error (stderr then holds the error and the last 20 lines of `browser.log`), 2 on usage errors and refusals. SIGINT, SIGTERM and SIGHUP close the driver (deleting the profile) and exit 4.

**Seam:** `Driver` contract on real headless Chrome; the CLI as a child process under `scratchHookEnv()`; pure functions for the rest.

**Tests:**
- `encodeMessage({ id: 1, method: 'Browser.close' })` equals `Buffer.from('{"id":1,"method":"Browser.close"}\0')`.
- `splitMessages(Buffer.alloc(0), Buffer.from('{"id":1}\0{"id"'))` returns messages `['{"id":1}']` and rest equal to `Buffer.from('{"id"')`; then with chunk `Buffer.from(':2}\0')` returns `['{"id":2}']` and an empty rest.
- UTF-8 split: the bytes of `{"v":"é"}\0` cut between the two bytes of `é` and fed as two chunks give exactly one message, `{"v":"é"}`.
- `parseCdpMessage('{"id":3,"result":{}}')` returns `{ kind: 'reply', id: 3, result: {} }`; `'{"id":4,"error":{"message":"x"}}'` returns `{ kind: 'error', id: 4, message: 'x' }`; `'{"method":"Page.loadEventFired","params":{},"sessionId":"s"}'` returns `{ kind: 'event', method: 'Page.loadEventFired', params: {}, sessionId: 's' }`; `'[1]'` and `'not json'` return `{ kind: 'invalid' }`.
- `findBrowser` on `linux` where only `which('chromium')` returns `/usr/bin/chromium`: returns `/usr/bin/chromium`.
- `findBrowser` on `linux` where `which('chromium')` returns `/snap/bin/chromium` and `which('microsoft-edge')` returns `/usr/bin/microsoft-edge`: returns `/usr/bin/microsoft-edge` and `warn` received `fx-browse: skipping snap browser /snap/bin/chromium: its sandbox cannot read a temporary profile`. With `configured` `/snap/bin/chromium` that exists: returns it and warns nothing.
- `findBrowser` on `win32` where `regQuery` returns `C:\Apps\Chrome\chrome.exe` for the `HKLM` App Paths key of `chrome.exe` and that file exists: returns it. With `regQuery` returning `null` everywhere, `PROGRAMFILES=C:\Program Files`, and only `C:\Program Files\Microsoft\Edge\Application\msedge.exe` existing: returns that path.
- `findBrowser` on `darwin` with `home` `/Users/u` where only `/Users/u/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` exists: returns it. Where only `/Applications/Chromium.app/Contents/MacOS/Chromium` exists: returns that.
- `findBrowser` with `configured` `/opt/x/chrome` that exists: returns `/opt/x/chrome` even when `google-chrome` is on `PATH`; with nothing found: returns `null`.
- `killCommand('win32', 123)` returns `['taskkill', '/pid', '123', '/T', '/F']`; `killCommand('linux', 123)` returns `null`.
- `removeProfile` on `win32` with an `rm` that throws `EBUSY` 3 times then succeeds: resolves, `rm` called 4 times; always `EBUSY`: rejects after 5 calls. On `linux` with an `rm` that throws `EBUSY` once: rejects after 1 call.
- `isLocalUrl`: `http://127.0.0.1:3000/`, `http://localhost/`, `http://[::1]:8/`, `http://10.1.2.3/`, `http://172.16.0.1/`, `http://192.168.1.5/` and `mock` give `true`; `http://172.32.0.1/`, `https://example.com/` and `not a url` give `false`.
- `parseBrowseConfig({ browserPath: '/opt/x/chrome' })` returns `{ browserPath: '/opt/x/chrome' }`; `parseBrowseConfig(undefined)` returns `{}`; `parseBrowseConfig({ browserPath: 7 })` returns `{ warning: 'fx-browse: ignoring malformed browse.json' }`.
- `parseExtracted({ title: 't', url: 'u', text: 'x', links: [] })` returns the same object; `parseExtracted({ title: 1 })` returns `null`.
- `toMarkdown({ title: 'T', url: 'http://a/', text: 'body', links: [{ text: 'L', href: 'http://a/l' }] })` returns exactly `# T\n\nhttp://a/\n\nbody\n\n## Links\n\n- [L](http://a/l)\n`.
- `makeRunDir(<tmp>, 'read', undefined, new Date(2026, 9, 22, 13, 4, 5))` returns `<tmp>/.fx/browse/20261022-130405-read` and the directory exists afterwards.
- Contract, `cdp` backend, `js-only.html` (title `JS only fixture`, inserts `Rendered by script` after 300 ms): after `goto` and `settle`, `extractText` returns `text` containing `Rendered by script`; `screenshot(file)` writes a file whose first 4 bytes are `89 50 4E 47`; `currentUrl()` equals the fixture URL; `logFile` exists.
- Contract, redirect: `goto(origin + '/redirect')` ends with `currentUrl()` equal to `altOrigin + '/js-only.html'`; a later test-only navigation to `origin + '/events.html'` is blocked: `currentUrl()` unchanged after 1,000 ms and `events()` contains `{ kind: 'navigation-blocked', url: origin + '/events.html' }`.
- Contract, `events.html` opened at `origin`: clicking its link to `altOrigin + '/js-only.html'` (test-only `evaluate` source) leaves `currentUrl()` unchanged after 1,000 ms and `events()` contains `{ kind: 'navigation-blocked', url: altOrigin + '/js-only.html' }`; its pop-up button (`window.open('/popup-target.html')`) yields `{ kind: 'popup-closed', url: origin + '/popup-target.html' }` and the fixture server's `requests` never contains `/popup-target.html`; its alert button (`alert('hi')`) yields `{ kind: 'dialog-dismissed', message: 'hi' }`.
- Contract, cleanup: after `close()`, the profile directory no longer exists and the browser process has exited; after `goto('http://127.0.0.1:1/', 5000)` rejects, `close()` still removes the profile directory.
- CLI (under `scratchHookEnv()`, `--driver cdp`): `read --local <origin>/js-only.html --out <tmp>/r` exits 0; stdout starts with `# JS only fixture` and contains `Rendered by script`; `<tmp>/r/page.md`, `<tmp>/r/screenshot.png` and `<tmp>/r/browser.log` exist; no directory starting `fx-browse-` created by this run remains in the OS temp directory.
- CLI: `read <origin>/js-only.html` without `--local` exits 2 with stderr `fx-browse: 127.0.0.1 is a local or private address; pass --local to read it`.
- CLI signals: `read --local <origin>/hang --out <tmp>/h`, sent SIGTERM after 1,000 ms, exits 4 within 5,000 ms and leaves no profile directory; the same with SIGINT and with SIGHUP (Linux and macOS only).
- CLI: `read ftp://x` exits 2 with stderr `fx-browse: only http and https URLs are supported`; no arguments exits 2 with stderr starting `usage: fx-browse read <url> | explore <url> --goal <text>`.
- Escape gate: a temp file `src/lib/browse/x-input.ts` holding `const a = b as string;` makes `scripts/check-ts-escapes` exit 1 naming ` as `.

**Risks:** page functions must survive esbuild unchanged in meaning; the contract tests run them in a real browser, which is the only proof. Windows needs the extra stdio pipes, the registry lookup and `taskkill`; unit tests cover the finder and kill command, and the spike covered the transport. A blocked navigation must not leave CDP's `Fetch` paused: every paused request is either continued or failed. A pop-up target must be closed before `Runtime.runIfWaitingForDebugger`, or its request goes out.

**Idempotency:** each run creates a new run directory and a new temporary profile, and deletes the profile on every exit path; a rerun creates another run directory and never touches an old one.

**Testing:** unit (`lib/browse/cdp.test.js`, `lib/browse/inputs.test.js`), integration on real Chrome (`tests/browse/driver-contract.test.js`), CLI (`tests/browse/read-cli.test.js`).

## Acceptance criteria
- [ ] `node lib/browse/cli.js read --local <url>` prints the rendered page as Markdown on this machine with no npm package installed.
- [ ] No `WebSocket` and no `--remote-debugging-port` anywhere in `src/lib/browse/`.
- [ ] After any run, normal, failed or signalled, no profile directory remains.
- [ ] After the first load, a link to another origin does not navigate, a pop-up sends no request, and both are recorded.
- [ ] `scripts/check-all` passes with the three new test files in it.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Write each test the Tests field names**
- [ ] **3. Run them: verify RED**

Run: `scripts/build && node lib/browse/cdp.test.js; node lib/browse/inputs.test.js; node tests/browse/driver-contract.test.js; node tests/browse/read-cli.test.js`
Expected: each fails because the modules are missing.

- [ ] **4. Implement the minimum that passes**
- [ ] **5. Run them: verify GREEN**

Run: same command, joined with `&&`. Expected: PASS.

- [ ] **6. Run the scope**

Run: `scripts/test-scope src/lib/browse/driver.ts src/lib/browse/cdp.ts src/lib/browse/read.ts src/lib/browse/cli.ts`

- [ ] **7. Commit by path**

```
git add src/lib/browse/judge.ts src/lib/browse/driver.ts src/lib/browse/cdp.ts src/lib/browse/cdp-input.ts src/lib/browse/hosts.ts src/lib/browse/page.ts src/lib/browse/page-input.ts src/lib/browse/config-input.ts src/lib/browse/trace.ts src/lib/browse/read.ts src/lib/browse/cli.ts src/lib/browse/cdp.test.ts src/lib/browse/inputs.test.ts src/tests/browse/fixture-server.ts src/tests/browse/driver-contract.test.ts src/tests/browse/read-cli.test.ts lib/browse tests/browse scripts/check-ts-escapes scripts/check-all
git commit -m "feat(browse): own CDP pipe driver and read subcommand"
```
