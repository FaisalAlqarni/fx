# 02: check-all and the git fixture on Node

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** MVP

**What to build:** `node scripts/check-all` runs every row the bash version runs, in the same order, printing the same `== <name> ==`, `FAIL: <name>` and `ALL GREEN` lines and stopping at the first failure. It builds the git fixture through `node scripts/make-git-fixture` with the same shape check. fx's own loop (`.fx.json`) needs no `bash -c`: `test_one` and `setup` go through a small `scripts/test-one`. Every later task adds or edits rows in one TypeScript list. Rows sub-projects 2 and 3 added to the bash file are carried over, and row names never change.

**Design:** Implementation Decisions > 3; Implementation Decisions > 4; Implementation Decisions > 15; Global Constraints

**Files:**
- Create: `src/scripts/check-all.ts` (built over `scripts/check-all`)
- Create: `src/scripts/make-git-fixture.ts` (built over `scripts/make-git-fixture`)
- Create: `src/scripts/test-one.ts` (built to `scripts/test-one`), `src/scripts/test-one.test.ts`
- Create: `src/scripts/check-all.test.ts` (both new tests become `ROWS` entries `check-all.test.js` and `test-one.test.js`, right after `equivalence`)
- Create: `tests/equivalence/make-git-fixture.json` and its golden
- Modify: `.fx.json` (`test_all`: `node scripts/check-all`; `test_one`: `node scripts/test-one {file}`; `setup`: `node scripts/test-one --setup`)
- Modify: `scripts/test-scope` source `src/scripts/test-scope.ts` (where it prints `scripts/check-all`, print `node scripts/check-all`) and its test's expected lines
- Modify: `INSTALL.md`, and `README.md` and `AGENTS.md` where they show the command (contributor note: `node scripts/check-all`)

**Interfaces:**
- Produces: `src/scripts/check-all.ts` exports `ROWS: ReadonlyArray<{ name: string; argv: readonly string[]; fixture?: true }>`; a row with `fixture: true` gets `<MAIN> <WT>` appended. A row whose argv[0] is `node` runs through `runNode`, anything else through `run`. Each `== <name> ==` line is written with `fs.writeSync(1, ...)` before the row's child starts, and the child's output is inherited, never buffered. Exit 0 after `ALL GREEN`; exit 1 after `FAIL: <name>`.
- Produces: `runAll(rows: typeof ROWS, makeFixture: (dir: string) => RunResult) -> number` (the exit code), exported so the test can inject rows and a fake fixture; the script's entry calls it with `ROWS` and `runNode('scripts/make-git-fixture', [dir])`.
- Produces: `scripts/make-git-fixture <dir>`: same output (`<dir>/m <dir>/w` on one line), same refusals and exit codes as the bash script.
- Produces: `scripts/test-one <file>`: runs `node scripts/build`, maps `<file>` with `scripts/test-scope --built-path`, makes a fixture in `os.tmpdir()`, runs `node <built> <MAIN> <WT>`, removes the fixture on every exit, exits with the test's status. `scripts/test-one --setup`: runs `npm ci` then builds and removes one fixture; exit 0 prints `test-one: setup OK`.
- Consumes: `run`, `runNode` (task 01).

**Seam:** `node scripts/check-all`.

**Tests:**
- One-time ledger check, not a committed test (a committed one would break on every later row change and in shallow clones): the `== <name> ==` lines of `node scripts/check-all` equal those of `bash scripts/check-all` at `old.rev` with exactly `check-all.test.js` and `test-one.test.js` inserted directly after `equivalence`; both outputs and the diff go to the ledger.
- `check-all.test`: with `ROWS` injected as `[{name:'a', argv:['node','-e','0']},{name:'b', argv:['node','-e','process.exit(1)']},{name:'c', argv:['node','-e','0']}]`, stdout is `== a ==\n== b ==\nFAIL: b\n` and exit 1 (c never runs).
- `check-all.test`: fixture shape check: a fake fixture printing `x` yields `FAIL: make-git-fixture returned an unexpected shape: 'x'` and exit 1.
- `check-all.test`: a row whose child writes `out` with its `== a ==` line already printed: stdout is `== a ==\nout\nALL GREEN\n` in that order (one row, passing).
- make-git-fixture equivalence cases: `new-dir` (prints `<ROOT>/f/m <ROOT>/f/w`, tree `f` snapshot equal), `existing-dir-replaced`, `no-argument` (usage and exit code as recorded).
- `test-one.test`: `node scripts/test-one lib/git-guard.test.js` exits 0; with a test file that exits 3, exits 3; the fixture directory no longer exists afterwards.
- test-scope: `--dry-run src/lib/git-guard.ts` prints `node scripts/check-all` where it printed `scripts/check-all`.

**Risks:** the bash `run` helper echoes `== name ==` before running; `fs.writeSync` is what keeps the line ahead of the child's output. The ledger check compares against the bash file at this task's own `old.rev`, which already holds every row sub-projects 2 and 3 added.

**Testing:** unit tests; equivalence; full `check-all`.

## Acceptance criteria
- [ ] `node scripts/check-all` prints `ALL GREEN`, and its `== <name> ==` lines equal those `bash scripts/check-all` printed at `old.rev` (diff saved in the ledger).
- [ ] `.fx.json` contains no `bash`.
- [ ] `git grep -nE "(bash|sh) [^ ]*scripts/(check-all|make-git-fixture)"` outside `docs/plans/` prints nothing; `git grep -nE "(^|[^/a-z])scripts/check-all" README.md INSTALL.md AGENTS.md` shows only the `node` form.
- [ ] `scripts/check-all` and `scripts/make-git-fixture` are generated, mode `100755`.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Record `git rev-parse HEAD` as `old.rev`; save `bash scripts/check-all` output to the ledger**
- [ ] **3. Write the tests and the make-git-fixture cases; record its golden**
- [ ] **4. Run them: verify RED**

Run: `scripts/build && node scripts/check-all.test.js; node scripts/test-one.test.js`

- [ ] **5. Implement check-all, make-git-fixture and test-one**
- [ ] **6. Run them: verify GREEN**, then `node scripts/equiv check tests/equivalence`
- [ ] **7. Run the scope**

Run: `node scripts/check-all` (tracked background command)

- [ ] **8. Commit by path**

```
git add src/scripts/check-all.ts src/scripts/check-all.test.ts scripts/check-all scripts/check-all.test.js src/scripts/make-git-fixture.ts scripts/make-git-fixture src/scripts/test-one.ts src/scripts/test-one.test.ts scripts/test-one scripts/test-one.test.js tests/equivalence/make-git-fixture.json tests/equivalence/make-git-fixture.golden.json .fx.json src/scripts/test-scope.ts scripts/test-scope src/scripts/test-scope.test.ts scripts/test-scope.test.js INSTALL.md README.md AGENTS.md
git commit -m "build: check-all and make-git-fixture on Node"
```
