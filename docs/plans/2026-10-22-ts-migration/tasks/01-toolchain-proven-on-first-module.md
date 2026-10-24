# 01: Toolchain proven on the first module

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** MVP

**What to build:** after this task, editing `src/lib/user-invoked-lanes.ts` and running `scripts/build` regenerates `lib/user-invoked-lanes.js`; `scripts/check-all` fails if a generated file is stale, hand-edited or lost its executable bit, if any source has a type error, or if a source uses `any`, a TypeScript suppression or a bare `JSON.parse` without a reason. `scripts/test-scope` and `test_one` accept `src/**` paths. The plugin version is 0.3.0 (owner-authorized, see plan.md rulings) so the release gate passes. An ADR records the decision. Before any of that, a throwaway spike confirms the esbuild and TypeScript behaviours this plan relies on.

**Design:** Implementation Decisions; Testing Decisions; Global Constraints

**Files:**
- Create: `scripts/build` (bash, executable)
- Create: `scripts/check-types` (bash, executable: runs `node_modules/.bin/tsc --noEmit -p <dir>`, default the repo root)
- Create: `scripts/check-ts-escapes` (bash, executable: scans a directory, default `src/`)
- Create: `tsconfig.json`
- Create: `package-lock.json`
- Create: `src/lib/types.ts` (shared types module; starts with `export {};` and a one-line purpose comment; later tasks add to it)
- Create: `src/lib/json.ts` (`parseJson`)
- Create: `src/lib/user-invoked-lanes.ts`
- Create: `tests/gates/ts-toolchain.test.sh`
- Create: `docs/adr/0046-fx-sources-are-typescript.md`
- Modify: `package.json` (`devDependencies`: esbuild, typescript at exact current versions, `@types/node` pinned to a 20.x version; no `dependencies`, no `type` field; `version` 0.3.0)
- Modify: `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json` (`version` 0.3.0)
- Modify: `lib/user-invoked-lanes.js` (now generated); create `lib/types.js`, `lib/json.js` (generated)
- Modify: `scripts/check-generated` (second block: build into a temp directory, diff contents against the committed output, and compare file modes)
- Modify: `scripts/check-all` (run `check-types`, `check-ts-escapes` and `ts-toolchain.test.sh` after `check-generated`)
- Modify: `scripts/test-scope` (still JavaScript in this task: map `src/` paths; add `--built-path <path>`)
- Modify: `scripts/test-scope.test.js` (add the mapping cases below; existing cases untouched)
- Modify: `.fx.json` (`setup` runs `npm ci` first; `test_one` maps `{file}` through `scripts/test-scope --built-path` and builds first; `test_scope` builds first)
- Modify: `docs/adr/0028-codex-agents-are-generated-to-disk-opencode-agents-are-converted-at-runtime.md` (amendment line: the Codex build step now has a sibling, ADR 0046)
- Modify: `INSTALL.md` (short contributor note: run `npm ci` once, edit `src/`, run `scripts/build`, never edit generated files)

**Interfaces:**
- Produces: `scripts/build [--out <dir>]`: compiles every `src/**` source to its output path (default the repo root; `--out` writes the same tree under `<dir>`). It calls `node_modules/.bin/esbuild` directly, never `npx`; when it is missing it exits 1 with `scripts/build: run npm ci first`. **One esbuild call per file**, so each file's banner names its own source. Exit 0 on success, nonzero with esbuild's message on failure.
- Produces: the output mapping every later task relies on (esbuild `--platform=node` unless stated):
  - `src/<path>.ts` to `<path>.js`, `--format=cjs`, unless listed below
  - `src/plugins/*.ts` and `src/index.ts` to `.js`, `--format=esm`
  - `src/scripts/build-cost.ts`, `src/scripts/test-scope.ts`, `src/skills/fx-implement/scripts/compile-brief.ts` to the same path with no extension, `--format=cjs`, mode `100755`
  - `src/**/*.cts` to `.cjs`, `--format=cjs`
  - `src/skills/fx-brainstorm/scripts/helper.ts` to `helper.js`, `--platform=browser --format=iife`
  - target `node20` for every Node group
- Produces: generated header, exact text: `// generated from src/<path> by scripts/build: edit there, not here`. It is line 1, or line 2 when the source's line 1 is a shebang (the shebang stays line 1).
- Produces: `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `noEmit: true`, `isolatedModules: true`, `module: "preserve"`, `moduleResolution: "bundler"`, `target: "ES2022"`, `lib: ["ES2023"]`, `types: ["node"]`, `include: ["src"]`. `helper.ts` adds `/// <reference lib="dom" />` itself (task 10); DOM types stay out of Node code.
- Produces: `parseJson(text: string) -> unknown` in `src/lib/json.ts`: the one place `JSON.parse` is called; it throws exactly what `JSON.parse` throws.
- Produces: `scripts/check-ts-escapes [dir]` rules: fails on `any` in a type position (`: any`, `<any>`, `any[]`, `as any`), `@ts-ignore`, `@ts-expect-error`, a bare `JSON.parse` call outside `src/lib/json.ts`, and ` as ` (a type assertion) in `src/lib/*-input.ts`, `src/lib/fx-json.ts`, `src/lib/env.ts`; any of these is allowed on a line carrying `ts-gate-ok: <reason>`. The word "any" in comments and strings is not a finding.
- Produces: `scripts/test-scope --built-path <path>`: prints the built path for a `src/` path (`src/lib/x.test.ts` prints `lib/x.test.js`; `src/scripts/test-scope.ts` prints `scripts/test-scope`); prints a non-`src/` path unchanged.
- Produces: `src/lib/user-invoked-lanes.ts` exports `USER_INVOKED_LANES` (same values and order as today: `fx-audit`, `fx-critique`, `fx-grill`, `fx-handoff`, `fx-setup`).

**Seam:** `scripts/check-all` and the new `tests/gates/ts-toolchain.test.sh`.

**Tests:**
- Spike (scratch directory, throwaway, results written to the ledger): confirm with the pinned esbuild and tsc: (a) a `--platform=node --format=cjs` file with `export const a = 1` is importable by name from an ESM file via `import { a } from './x.js'` under Node 20; (b) a `--format=esm` file using `import.meta.url` and top-level `await` builds and runs; (c) `tsc --noEmit` with the tsconfig above accepts (b) and accepts `import { a } from './x.js'` resolving to `./x.ts`; (d) a source starting with a shebang builds with the shebang on line 1 and the banner on line 2. If any of these fails, stop and report to the owner before building on it.
- Header: after `scripts/build`, line 1 of `lib/user-invoked-lanes.js` is exactly `// generated from src/lib/user-invoked-lanes.ts by scripts/build: edit there, not here`.
- Shebang sample: a temp source `#!/usr/bin/env node` then `console.log(1)` built with `scripts/build --out <tmp>`: line 1 is `#!/usr/bin/env node`, line 2 is the header.
- Drift caught: after appending `// x` to a temp copy of the built tree's `lib/user-invoked-lanes.js`, the drift comparison on that copy exits 1 and prints `FAIL: generated JavaScript has drifted from src/`.
- Mode caught: a temp copy where `scripts/test-scope` has mode `100644` makes the mode comparison exit 1 and print `FAIL: scripts/test-scope should be executable`.
- Drift clean: on the committed tree, `scripts/check-generated` exits 0 and prints `check-generated: OK`.
- Escape caught, one case each, exit 1 and output `FAIL: a.ts:1: <token> without ts-gate-ok` naming the token: `let v: any = 1;`, `const x = y as any;`, `// @ts-ignore`, `// @ts-expect-error`, `const o = JSON.parse(s);` (token `JSON.parse`).
- Escape not a finding: `// any of these may run` and `const s = "any value";`: exit 0.
- Escape allowed: `let v: any = 1; // ts-gate-ok: test fixture`: exit 0.
- Escape gate scans something: an empty directory: exit 1 with `FAIL: no TypeScript source found`.
- Type error caught: a temp directory with its own `tsconfig.json` that extends the repo's and sets `"files": ["a.ts"]`, and `a.ts` holding `const n: number = "x";`: `scripts/check-types <dir>` exits nonzero.
- ESM accepted: the same temp setup with `a.ts` holding `const u = import.meta.url; await Promise.resolve(u); export {};`: `scripts/check-types <dir>` exits 0.
- Missing tools: with `node_modules/.bin/esbuild` absent (run against a temp copy without `node_modules`), `scripts/build` exits 1 and prints `scripts/build: run npm ci first`.
- Behaviour kept: `node tests/gates/user-invoked.test.js` passes unchanged.
- Version: `node tests/gates/release-version.test.js` and `node tests/gates/codex-manifest.test.js` exit 0.
- test-scope mapping (in `scripts/test-scope.test.js`): `--dry-run src/lib/dispatch-route.ts` prints `scripts/check-types`, `scripts/check-ts-escapes`, `scripts/check-generated`, then the same commands as `--dry-run lib/dispatch-route.js`; `--dry-run src/hooks/fx-context.ts` the three gates then the same as `hooks/fx-context.js`; `--dry-run src/lib/git-guard.ts` prints `scripts/check-all` then `node tests/gates/release-version.test.js`; `--built-path src/lib/x.test.ts` prints `lib/x.test.js`; `--built-path src/scripts/build-cost.ts` prints `scripts/build-cost`.

**Risks:** `include: ["src"]` keeps `tsc` off the committed JavaScript and the fixtures. esbuild's CommonJS output must still satisfy `require('../lib/user-invoked-lanes.js').USER_INVOKED_LANES`; the user-invoked gate proves it. `diff -rq` ignores modes, which is why the mode comparison is separate.

**Idempotency:** `npm ci` and `scripts/build` are safe to re-run; the build overwrites only generated paths.

**Testing:** spike, gate test, `scripts/check-all`, clean clone.

## Acceptance criteria
- [ ] Spike results (a) to (d) recorded in the ledger, all confirmed.
- [ ] A clean clone of this commit, then `npm ci && scripts/build`, then `git status --porcelain`, prints nothing.
- [ ] `scripts/check-all` prints `ALL GREEN`, including the new entries and the release gate.
- [ ] `package.json` has `devDependencies` with exact versions (`@types/node` 20.x) and no `dependencies`; all three manifests say 0.3.0.
- [ ] ADR 0046 states: sources are TypeScript under `src/`, generated JavaScript is committed, compile file by file with one esbuild call per file, guarded loads stay `require`, users need Node only, eval and vendored files stay JavaScript, Python and bash move in a later sub-project.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Run the spike** (scratch directory outside the repo; record (a) to (d) in the ledger)
- [ ] **3. Write each test the Tests field names** (`tests/gates/ts-toolchain.test.sh`, new cases in `scripts/test-scope.test.js`)
- [ ] **4. Run them: verify RED**

Run: `bash tests/gates/ts-toolchain.test.sh; node scripts/test-scope.test.js`
Expected: each fails because the scripts and mapping do not exist yet.

- [ ] **5. Implement the minimum that passes**
- [ ] **6. Run them: verify GREEN**

Run: `npm ci && scripts/build && bash tests/gates/ts-toolchain.test.sh && node scripts/test-scope.test.js && node tests/gates/user-invoked.test.js && node tests/gates/release-version.test.js && node tests/gates/codex-manifest.test.js`
Expected: PASS.

- [ ] **7. Run the scope**

Run: `scripts/check-all` (tracked background command)

- [ ] **8. Commit by path**

```
git add scripts/build scripts/check-types scripts/check-ts-escapes tsconfig.json package.json package-lock.json .claude-plugin/plugin.json .codex-plugin/plugin.json src/lib/types.ts src/lib/json.ts src/lib/user-invoked-lanes.ts lib/types.js lib/json.js lib/user-invoked-lanes.js tests/gates/ts-toolchain.test.sh scripts/check-generated scripts/check-all scripts/test-scope scripts/test-scope.test.js .fx.json docs/adr/0046-fx-sources-are-typescript.md docs/adr/0028-codex-agents-are-generated-to-disk-opencode-agents-are-converted-at-runtime.md INSTALL.md
git commit -m "build: TypeScript toolchain, first module migrated, version 0.3.0"
```

- [ ] **9. Run the clean-clone check on the commit**

Run: `C=$(mktemp -d) && trap 'rm -rf "$C"' EXIT && git clone -q . "$C" && (cd "$C" && git checkout -q "$(git -C "$OLDPWD" rev-parse HEAD)" && npm ci && scripts/build && git status --porcelain)`
Expected: no output from `git status --porcelain`. If anything prints, fix it in a follow-up commit and run again.
