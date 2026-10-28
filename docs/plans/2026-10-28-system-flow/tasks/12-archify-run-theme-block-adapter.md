# 12: Running archify, its retry, theme block, persisted choices and adapter rules

**Status:** ready-for-agent
**Blocked by:** 11
**Phase:** Core

**What to build:** `build` renders each deep diagram page with archify when one is found, and keeps doing so on every later build without the flags being repeated. Archify is found as plan.md Global Constraints "Finding archify" states: `--archify <dir>`, else (unless the saved preference is `cheap`) the first of `$CLAUDE_CONFIG_DIR/skills/archify`, `$HOME/.claude/skills/archify` and `.fx.json` `system_flow.diagrams.archify` that holds `bin/archify.mjs`. `detect` prints the pick. For each page `build` runs `node <dir>/bin/archify.mjs finalize <type> <spec> <out> --repo-root <owning root> --quality showcase --json`, at most 4 at a time, and reads the receipt. A failed sequence or flow gets one fixed retry at 5 messages per page; still failing, or a failed architecture diagram, falls back to SVG with the receipt path reported (design Error handling, as amended). Every archify output gets the page palette as a block between `/* fx-theme:begin */` and `/* fx-theme:end */`, replaced on every build. The lane's decisions after its visual check (`--page-limit <name>=<n>`, `--svg <name>`) and the archify preference (`--prefer cheap|fast|detailed`) are saved into `.fx.json` `system_flow.diagrams` and read by every later build. The archify adapter and the visual check references gain the rules this design adds.

**Design:** The CLI; Renderers; Error handling; What it replaces; The lane

**Files:**
- Modify: `src/lib/sf-diagrams.ts` (`findArchify`, `runArchify`, the retry, the theme block)
- Modify: `src/lib/sf-detect.ts` (`Detected.archify`)
- Modify: `src/lib/sf-build.ts`, `src/scripts/system-flow.ts` (`--archify <dir>`, `--prefer <p>`, `--page-limit <name>=<n>` repeatable, `--svg <name>` repeatable; read and write `.fx.json` `system_flow.diagrams`)
- Create: `src/scripts/system-flow-archify.test.ts` (built to `scripts/system-flow-archify.test.js`)
- Modify: `references/visual/archify-adapter.md` (sources from evidence, the single-root rule, the theme block, the fixed retry, the 390 check, the lookup order; the per-diagram pick line stays)
- Modify: `references/visual/visual-check.md` (archify outputs are opened at 1440 and 390, light and dark, like every page; archify's own check still runs as well)
- Modify: `scripts/check-all` (one line)

**Interfaces:**
- Consumes: `DeepDiagram`, `deepDiagrams`, `svgPage`, `pickLine` (task 11); `themeCss`, `Theme` (task 07); `detect`, `Detected`, `writeFxJson` (task 06); `FxJson['system_flow']['diagrams']` (task 03).
- Produces, `src/lib/sf-diagrams.ts`:

```ts
export function findArchify(hostRoot: string, env: NodeJS.ProcessEnv, fx: FxJson['system_flow']): { dir: string; version: string | null; via: 'CLAUDE_CONFIG_DIR' | 'HOME' | '.fx.json' } | null; // version from <dir>/skill-release.json "version"
export function runArchify(dir: string, jobs: { name: string; kind: 'architecture' | 'sequence'; spec: string; out: string; repoRoot: string }[], limit: 4): Promise<{ name: string; ok: boolean; receipt: string | null }[]>;
export function applyThemeBlock(html: string, t: Theme): string;
```
- Produces, `src/lib/sf-detect.ts`: `Detected.archify: { dir: string; version: string | null; via: string } | null`, `null` when `prefer` is `cheap` or nothing is found.
- Produces, CLI: `system-flow build [--archify <dir>] [--prefer cheap|fast|detailed] [--page-limit <name>=<n>]... [--svg <name>]...`. Flags other than `--archify` are merged into `.fx.json` `system_flow.diagrams` (`pageLimits[name] = n`, `svg` gains the name once, sorted; `prefer` replaced) before the build reads them; `--archify` is never saved. The CLI distinguishes only `cheap` (no archify, no lookup) from `fast` and `detailed` (archify when found), which keep their adapter meaning for the lane. `BuildResult.diagrams[].reason` for archify reads `archify <kind>, <n> messages in <p> pages`, `archify <kind>, <n> messages in <p> pages, retried at 5 per page` or `archify architecture, <n> components`; for a fallback, `static SVG, archify failed: <receipt path>` or `animated SVG, archify failed: <receipt path>`; for a saved or given `--svg`, `<static|animated> SVG, owner or lane chose SVG`; for `cheap`, `<static|animated> SVG, preference cheap`; with nothing found, `<static|animated> SVG, archify not installed`.

**Seam:** the `system-flow` CLI run as a process with a fake archify: a fixture folder holding `bin/archify.mjs` and `skill-release.json` (`{"version": "0.0.0-fake"}`) that records each call (arguments, start and end time) to a log file, writes `<out>` as a small HTML page with a `<style>` element, and writes a receipt JSON beside it. It exits 1 for any spec whose name the fixture lists as failing, and for any sequence spec holding more messages than a limit the fixture sets.

**Tests:** the fixture's `run` removes `CLAUDE_CONFIG_DIR` and sets `HOME` to the fixture's `home`, so only what a test places is found.
- Calls: `build --archify <fake>` with diagrams `arch-system`, `arch-engine`, `seq-turn`, `seq-turn-p2`, `flow-first`: the log holds 5 calls, each with `finalize`, the type (`architecture` for `arch-*`, `sequence` otherwise), the spec path under `diagrams/src/`, the out path under `diagrams/`, `--repo-root <owning root dir>`, `--quality showcase`, `--json`.
- Concurrency: with 9 diagrams and a fake that sleeps 200 ms per call, the log's intervals never overlap more than 4 at once.
- Theme block: each archify output holds exactly one `/* fx-theme:begin */ ... /* fx-theme:end */` block whose body equals `themeCss(theme)`; a second build leaves exactly one block, with the current theme.
- Retry then pass: the fake fails sequence specs with more than 5 messages; `seq-turn` has 14 messages: `build` exits 0; the log shows `seq-turn` and `seq-turn-p2` attempted at 8 per page, then `seq-turn`, `seq-turn-p2`, `seq-turn-p3` at 5, 5 and 4; `diagrams` holds `{ name: "seq-turn", renderer: "archify", reason: "archify sequence, 14 messages in 3 pages, retried at 5 per page" }`.
- Retry then fallback: the fake fails `flow-first` always: the log holds `flow-first` attempted once at 8 per page and again at 5 per page, and no third attempt; `flow-first.html` is the animated SVG page; reason `animated SVG, archify failed: docs/system-flow/diagrams/flow-first-p2.receipt.json` (the receipt of the last failed page).
- No retry for architecture: the fake fails `arch-engine`: the log holds exactly one `arch-engine` call; `arch-engine.html` is the static SVG page; `diagrams` holds `{ name: "arch-engine", renderer: "svg", reason: "static SVG, archify failed: docs/system-flow/diagrams/arch-engine.receipt.json" }`.
- Page limit: `--page-limit seq-turn=5` with 14 messages: specs `seq-turn`, `seq-turn-p2`, `seq-turn-p3` with 5, 5 and 4 messages.
- Forced SVG: `--svg seq-turn`: no archify call for `seq-turn` or its continuation pages; reason `animated SVG, owner or lane chose SVG`.
- Persisted: `build --archify <fake> --page-limit seq-turn=5 --svg arch-engine` writes `.fx.json` `system_flow.diagrams` deep-equal to `{ "pageLimits": { "seq-turn": 5 }, "svg": ["arch-engine"] }`, keeping every other `.fx.json` key; `.fx.json` holds no absolute path.
- Flagless rebuild keeps the renderer: after the persisted case, place the fake at `<fixture home>/.claude/skills/archify` and run `build` with no flags: `diagrams` deep-equals the first build's `diagrams` (seq-turn by archify in 3 pages, arch-engine SVG chosen by the owner or lane), and every `seq-turn*` and `arch-engine` output byte-equals the first build's.
- Lookup order: with fakes at `<cfg>/skills/archify` (run with `CLAUDE_CONFIG_DIR=<cfg>`), at `<home>/.claude/skills/archify`, and at `tools/archify` named by `.fx.json` `system_flow.diagrams.archify`, `detect` prints `archify.via` `"CLAUDE_CONFIG_DIR"`; without the `CLAUDE_CONFIG_DIR` env, `"HOME"`; with only the `.fx.json` one, `".fx.json"` and `dir` the resolved `tools/archify`; with none, `archify` is `null`. A folder without `bin/archify.mjs` is skipped.
- Cheap: `build --prefer cheap` with a fake at `<home>/.claude/skills/archify`: no archify call; every reason ends `, preference cheap`; `.fx.json` `system_flow.diagrams.prefer` is `"cheap"`; `detect` prints `archify: null`. A later `build --prefer detailed` calls archify again.
- Not installed: no fake anywhere and no `--archify`: no call; reasons end `, archify not installed` (task 11's behaviour holds).
- Usage: `--page-limit seq-turn` with no `=<n>`, `--page-limit seq-turn=9` and `--prefer max` each exit 2.
- Text: `archify-adapter.md` contains `sources`, `one repository`, `fx-theme:begin`, `390`, `5 messages per page` and `$CLAUDE_CONFIG_DIR/skills/archify`; `visual-check.md` states archify outputs are opened at 1440 and 390 in light and dark; `kitErrors` over both files stays `[]` (`node tests/gates/visual-kit.test.js`).

**Risks:** the theme block is written after archify's finalize; archify's own check ran on the bytes before it. If archify's strict check re-reads its output later, task 18 shows it; record the finding there.

**Idempotency:** each build replaces the outputs and the theme block whole; `.fx.json` merges are by key, so repeating the same flags writes the same bytes; the fake log is per-fixture.

**Testing:** CLI process tests with a fake archify; the visual-kit gate for the two references.

## Acceptance criteria
- [ ] With archify found or passed, every deep diagram is rendered by it or falls back to SVG with the receipt named, after at most one fixed retry.
- [ ] Never more than 4 archify runs at once.
- [ ] Every archify output carries the page palette.
- [ ] A build with no flags renders every diagram the way the previous build did, from `.fx.json` `system_flow.diagrams` and the lookup order.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/scripts/system-flow-archify.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node scripts/system-flow-archify.test.js`
Expected: `--archify` exits 2 as an unknown option.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Edit the two references**

- [ ] **6. Run them: verify GREEN**

Run: same. Expected: `system-flow-archify.test.js: OK`.

- [ ] **7. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/lib/sf-diagrams.ts src/lib/sf-detect.ts src/lib/sf-build.ts src/scripts/system-flow.ts references/visual/archify-adapter.md references/visual/visual-check.md`, then `node scripts/system-flow-detect.test.js` and `node scripts/system-flow-diagrams.test.js` under the same prefix

- [ ] **8. Commit by path**

```
git add src/lib/sf-diagrams.ts lib/sf-diagrams.js src/lib/sf-detect.ts lib/sf-detect.js src/lib/sf-build.ts lib/sf-build.js src/scripts/system-flow.ts scripts/system-flow src/scripts/system-flow-archify.test.ts scripts/system-flow-archify.test.js references/visual/archify-adapter.md references/visual/visual-check.md scripts/check-all
git commit -m "feat(system-flow): find and run archify per deep diagram with a fixed retry, the page palette and saved choices"
```

No attribution trailers. Then continue to the next task: never stop and wait.
