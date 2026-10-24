# 08: Build tooling on Node

**Status:** ready-for-agent
**Blocked by:** 07
**Phase:** Core

**What to build:** sub-project 1's four bash tools, `scripts/build`, `scripts/check-types`, `scripts/check-ts-escapes` and `scripts/check-handwritten-js`, become TypeScript with the same arguments, messages and exit codes, and their two bash tests become TypeScript tests. `scripts/build` is generated from its own source and committed, so it always runs from committed JavaScript and the drift check catches a stale one.

**Design:** Implementation Decisions > 4; Implementation Decisions > 5; Implementation Decisions > 7

**Files:**
- Create: `src/scripts/build.ts`, `src/scripts/check-types.ts`, `src/scripts/check-ts-escapes.ts`, `src/scripts/check-handwritten-js.ts` (built over the bash files)
- Create: `src/tests/gates/ts-toolchain.test.ts`, `src/tests/gates/check-handwritten-js.test.ts` (built to `tests/gates/*.test.js`)
- Delete: `tests/gates/ts-toolchain.test.sh`, `tests/gates/check-handwritten-js.test.sh`
- Create: `tests/equivalence/build.json`, `tests/equivalence/check-ts-escapes.json`, `tests/equivalence/check-types.json`, `tests/equivalence/check-handwritten-js.json` and their goldens
- Modify: `src/scripts/check-all.ts` (rows for the four tools run `node scripts/<name>`; the two test rows keep their names and run the `.test.js` files)
- Modify: `INSTALL.md` (contributor note: `node scripts/build`)

**Interfaces:**
- Produces: `scripts/build [--out <dir>]`, `scripts/check-types [dir]`, `scripts/check-ts-escapes [dir]`, `scripts/check-handwritten-js`: interfaces as sub-project 1's task 01 and task 13 define them, unchanged. `scripts/build` imports only Node builtins (`node:child_process`, `node:fs`, `node:path`), never `lib/proc`, because it rebuilds `lib/proc` and must run from a tree where only `scripts/build` was copied; this is the one documented exception to the `lib/proc` constraint. It calls `node_modules/.bin/esbuild` one call per file, never esbuild's JavaScript API, so each banner stays exactly as today.
- Consumes: `run`, `runNode`, `toPosixRel` (task 01).

**Seam:** `equiv check` with trees; the two migrated tests; `check-generated`'s build drift block.

**Tests:**
- build cases, `link: ["node_modules"]`, `tree: "out"`, args `["--out", "{root}/out"]`: `repo-src` (`src/`, `tsconfig.json` and `package.json` copied from `old.rev`: tree identical, including modes `x` on extensionless files); `shebang-source` (a written `src/scripts/z.ts` starting `#!/usr/bin/env node`: `scripts/z` line 1 shebang, line 2 header); `no-node-modules` (no `link`: `scripts/build: run npm ci first`, exit 1); `type-error-does-not-stop-build` (esbuild does not type check: tree as recorded).
- check-ts-escapes cases: one per finding in sub-project 1's task 01 Tests (`: any`, `as any`, `@ts-ignore`, `@ts-expect-error`, bare `JSON.parse`, ` as ` in a trust-boundary file), the comment and string non-findings, the `ts-gate-ok` allowance, and the empty directory.
- check-types cases, `link: ["node_modules"]`: `clean` and `type-error` (exit code as recorded; stdout as recorded with `<ROOT>`).
- check-handwritten-js cases, `git: true`: `repo-clean` (the tracked files at `old.rev` copied: `check-handwritten-js: OK (<n> files)`), `handwritten-js` (`FAIL: a.js is hand-written JavaScript`), `node-shebang-no-header`, `allowlisted`, `no-js` (`FAIL: no JavaScript file scanned`).
- `ts-toolchain.test` and `check-handwritten-js.test`: every expectation the bash tests make, same inputs, same expected exits and lines. Where `ts-toolchain.test` copies `scripts/build` into a scratch tree, it copies exactly what the new build reads (`scripts/build`, `tsconfig.json`, `package.json`, the sources) and links `node_modules`.
- `ts-toolchain.test`: `scripts/build` copied alone with `src/`, `tsconfig.json`, `package.json` and a linked `node_modules` into a scratch tree, without `lib/`: the build succeeds (it needs no `lib/proc`).
- check-ts-escapes cases include whatever rule sub-project 3 added to the bash gate; this task's `old.rev` is after sub-project 3, so the golden records it.
- Bootstrap: on a clean clone, `npm ci && node scripts/build && git status --porcelain` prints nothing; recorded in the ledger.

**Risks:** the build now builds itself: if `src/scripts/build.ts` is broken, the committed `scripts/build` still works, and check-generated reports the drift. Never commit a `scripts/build` produced by a broken build; the clean-clone check above catches it.

**Testing:** recorded equivalence; migrated tests; clean clone; `check-all`.

## Acceptance criteria
- [ ] `git grep -nE "(bash|sh) [^ ]*scripts/(build|check-types|check-ts-escapes|check-handwritten-js)"` outside `docs/plans/` prints nothing.
- [ ] Four cases files check identical; two `.sh` tests deleted, replacements green.
- [ ] Clean clone reproduces every generated file.
- [ ] `node scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Record `old.rev`; write the cases; record goldens**
- [ ] **3. Write the two tests**
- [ ] **4. Verify RED**: `scripts/build && node scripts/equiv check tests/equivalence; node tests/gates/ts-toolchain.test.js; node tests/gates/check-handwritten-js.test.js`
- [ ] **5. Port the four tools; build `scripts/build` with the old bash build once, then with itself, and confirm the two outputs are identical**
- [ ] **6. Verify GREEN**: same commands
- [ ] **7. Run the clean-clone check**

Run: `C=$(mktemp -d) && git clone -q . "$C" && (cd "$C" && npm ci && node scripts/build && git status --porcelain); rm -rf "$C"`
Expected: no `git status` output.

- [ ] **8. Run the scope**

Run: `node scripts/check-all` (tracked background command)

- [ ] **9. Commit by path**

```
git rm tests/gates/ts-toolchain.test.sh tests/gates/check-handwritten-js.test.sh
git add src/scripts/build.ts src/scripts/check-types.ts src/scripts/check-ts-escapes.ts src/scripts/check-handwritten-js.ts scripts/build scripts/check-types scripts/check-ts-escapes scripts/check-handwritten-js src/tests/gates/ts-toolchain.test.ts src/tests/gates/check-handwritten-js.test.ts tests/gates/ts-toolchain.test.js tests/gates/check-handwritten-js.test.js tests/equivalence/build.json tests/equivalence/build.golden.json tests/equivalence/check-ts-escapes.json tests/equivalence/check-ts-escapes.golden.json tests/equivalence/check-types.json tests/equivalence/check-types.golden.json tests/equivalence/check-handwritten-js.json tests/equivalence/check-handwritten-js.golden.json src/scripts/check-all.ts scripts/check-all INSTALL.md
git commit -m "build: build tooling on Node, build bootstraps from committed output"
```
