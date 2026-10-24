# 03: Playwright and puppeteer backends

**Status:** ready-for-agent
**Blocked by:** 02
**Phase:** Core

**What to build:** when the user's project has Playwright or puppeteer installed, `read` and `explore` drive the browser through that library, with the same temporary profile, origin pinning and guard, pop-up blocking and events as fx's own driver. `--driver auto` tries `playwright`, `playwright-core`, `puppeteer`, `puppeteer-core` resolved inside the current project, falls back to fx's own driver, and the run says which backend it used. `--driver playwright` or `--driver puppeteer` forces one and fails with a clear message when it cannot load.

**Design:** Implementation Decisions > 3; Implementation Decisions > 4; Testing Decisions; Global Constraints

**Files:**
- Create: `src/lib/browse/library.ts` (resolution, the two adapters)
- Create: `src/lib/browse/library-input.ts` (shape parsers for each module and for each object created through it)
- Create: `src/lib/browse/library.test.ts`
- Modify: `src/lib/browse/driver.ts` (`DriverChoice` gains `'playwright' | 'puppeteer'`; `openDriver` selection order and fallback)
- Modify: `src/lib/browse/cli.ts` (`--driver` accepts the two new values; stderr line `fx-browse: using <backend>`)
- Modify: `src/tests/browse/driver-contract.test.ts` (run the same suite for each backend)
- Modify: `package.json`, `package-lock.json` (`devDependencies`: `playwright-core` and `puppeteer-core`, exact current versions; no `dependencies`)
- Generated: `lib/browse/library.js`, `lib/browse/library-input.js`, `lib/browse/library.test.js`, `lib/browse/driver.js`, `lib/browse/cli.js`, `tests/browse/driver-contract.test.js`
- Modify: `scripts/check-all` (run `lib/browse/library.test.js`)

**Interfaces:**
- Consumes: `Driver`, `DriverEvent`, `OpenDriverOptions`, `openDriver`, `findBrowser`, `removeProfile` (task 02); `startFixtureServer` (task 02); `scratchHookEnv`, `runHook` (sub-project 2).
- Produces: `type DriverChoice = 'auto' | 'cdp' | 'playwright' | 'puppeteer'`.
- Produces, in `library.ts`:
  - `projectRoot(cwd: string, exists: (p: string) => boolean): string | null` (the directory of the nearest `package.json` at or above `cwd`)
  - `resolveLibrary(cwd: string, resolve: (name: string, paths: string[]) => string | null, exists: (p: string) => boolean): { name: 'playwright' | 'playwright-core' | 'puppeteer' | 'puppeteer-core'; path: string } | null` (first hit in that order whose resolved path lies inside `projectRoot(cwd)`; `null` when there is no project root)
  - `openLibraryDriver(lib: { name: string; path: string }, opts: OpenDriverOptions, executablePath: string | null): Promise<Driver | { error: string }>`
- Produces, in `library-input.ts`: `parsePlaywrightModule`, `parsePlaywrightContext`, `parsePlaywrightPage`, `parsePuppeteerModule`, `parsePuppeteerBrowser`, `parsePuppeteerPage`, each `(v: unknown) => <Shape> | null`, where each shape names only the functions fx calls on that object. Playwright: module `chromium.launchPersistentContext`; context `pages`, `newPage`, `route`, `on`, `close`; page `goto`, `evaluate`, `mouse.click`, `keyboard.insertText`, `screenshot`, `url`, `on`. puppeteer: module `launch`; browser `pages`, `target().createCDPSession`, `on`, `close`; page `goto`, `evaluate`, `mouse.click`, `keyboard.sendCharacter`, `screenshot`, `url`, `setRequestInterception`, `on`. Every created object goes through its parser before use; a `null` is an adapter failure.
- Launch: Playwright `chromium.launchPersistentContext(profileDir, { headless: true, executablePath? })`; puppeteer `launch({ userDataDir: profileDir, headless: true, pipe: true, executablePath? })`. `profileDir` comes from the same `fs.mkdtemp` step as the `cdp` backend and is deleted by `close()`.
- Pop-ups: Playwright fails every request whose page is not the main page through `context.route` and closes that page; puppeteer opens a CDP session with `browser.target().createCDPSession()` and applies the `cdp` backend's `Target.setAutoAttach` rule. Both record `popup-closed`.
- `openDriver` with `choice: 'auto'`: the library from `resolveLibrary`, launched with its default executable, then with `findBrowser`'s path; on any failure, the `cdp` backend. Each skipped step adds one stderr line `fx-browse: <name> unavailable: <reason>`.

**Seam:** the `Driver` contract suite from task 02, run per backend; unit tests for resolution and shapes.

**Tests:**
- `projectRoot('/p/app/src', exists)` where only `/p/app/package.json` exists returns `/p/app`; where none exists returns `null`.
- `resolveLibrary('/p/app', resolve, exists)` with `/p/app/package.json` present and a resolver that finds only `puppeteer-core` at `/p/app/node_modules/puppeteer-core/lib/index.js`: returns `{ name: 'puppeteer-core', path: '/p/app/node_modules/puppeteer-core/lib/index.js' }`. Finding `playwright` and `puppeteer` both inside: returns `playwright`. Finding `playwright` only at `/usr/lib/node_modules/playwright/index.js`: returns `null`.
- `parsePlaywrightModule({ chromium: {} })` returns `null`; `parsePlaywrightModule(require('playwright-core'))` is non-null; `parsePuppeteerModule(require('puppeteer-core'))` is non-null; `parsePuppeteerModule(42)` returns `null`; `parsePlaywrightPage({ goto() {} })` returns `null`.
- `openDriver({ choice: 'auto', cwd: <temp dir with no package.json>, ... })`: the driver's `backend` is `'cdp'`.
- `openDriver({ choice: 'playwright', cwd: <temp dir with no node_modules>, ... })`: rejects with `Error('fx-browse: playwright is not installed in this project')`.
- Contract suite (every task 02 contract case: rendered text, screenshot bytes, redirect then pinned origin, navigation blocked and recorded, pop-up closed with no request reaching the fixture server, dialog dismissed, profile directory gone after `close()` and after a failed `goto`) passes for `backend: 'playwright'` (via `playwright-core` with the system Chrome's `executablePath`) and `backend: 'puppeteer'` (via `puppeteer-core`, same executable).
- CLI (under `scratchHookEnv()`): `read --local <origin>/js-only.html --driver puppeteer --out <tmp>/p`, run with the repo root as `cwd` (where `puppeteer-core` resolves inside the project), exits 0 and stderr contains `fx-browse: using puppeteer`.

**Risks:** library APIs differ by version; the shape parsers keep fx to the calls it uses, and a failure falls back to the `cdp` backend in `auto`. `require.resolve` walks parent and global directories, which is why the project-root check exists.

**Idempotency:** as task 02: a new temporary profile per run, deleted on every exit path.

**Testing:** unit (`lib/browse/library.test.js`), integration (contract suite on three backends), CLI.

## Acceptance criteria
- [ ] With `playwright-core` and `puppeteer-core` installed, the full contract suite passes on all three backends.
- [ ] In a directory with neither library in its project, `--driver auto` uses `cdp` and the run succeeds, even when a library is installed globally.
- [ ] `package.json` still has no `dependencies`; the two libraries are exact-version `devDependencies`.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Write each test the Tests field names**
- [ ] **3. Run them: verify RED**

Run: `npm ci && scripts/build && node lib/browse/library.test.js; node tests/browse/driver-contract.test.js`
Expected: resolution and shape tests fail on the missing module; the contract suite fails for the two new backends.

- [ ] **4. Implement the minimum that passes**
- [ ] **5. Run them: verify GREEN**

Run: same command, joined with `&&`. Expected: PASS.

- [ ] **6. Run the scope**

Run: `scripts/test-scope src/lib/browse/library.ts src/lib/browse/driver.ts src/lib/browse/cli.ts`

- [ ] **7. Commit by path**

```
git add src/lib/browse/library.ts src/lib/browse/library-input.ts src/lib/browse/library.test.ts src/lib/browse/driver.ts src/lib/browse/cli.ts src/tests/browse/driver-contract.test.ts lib/browse/library.js lib/browse/library-input.js lib/browse/library.test.js lib/browse/driver.js lib/browse/cli.js tests/browse/driver-contract.test.js package.json package-lock.json scripts/check-all
git commit -m "feat(browse): use an installed Playwright or puppeteer"
```
