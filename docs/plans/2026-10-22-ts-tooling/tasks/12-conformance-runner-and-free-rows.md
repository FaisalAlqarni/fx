# 12: Conformance runner and free rows on Node

**Status:** ready-for-agent
**Blocked by:** 11
**Phase:** Hardening

**What to build:** `node tests/conformance/run.js <claude-code|opencode|opencode-v2|codex> [--free]` replaces `run.sh` with the same row contract, the same scratch homes, the same expected-gaps handling, the same OpenRouter fallback and log handling, the same PASS, FAIL and GAP table and the same exit codes. It runs a `.js` row with `node` and, until task 13 removes the branch, a `.sh` row with `bash`. The two free rows (10 and 11) and the free-row helper for opencode 2.x become TypeScript, and the runner-isolation test moves to TypeScript. The nightly workflow and its pin test name the new runner.

**Design:** Implementation Decisions > 2; Implementation Decisions > 11; Testing Decisions

**Files:**
- Create: `src/tests/conformance/run.ts` (built to `tests/conformance/run.js`)
- Delete: `tests/conformance/run.sh`
- Create: `src/tests/conformance/rows/10-reference-paths-resolve.ts`, `src/tests/conformance/rows/11-read-only-roles-registered.ts` (built to `.js` beside the rows)
- Delete: `tests/conformance/rows/10-reference-paths-resolve.sh`, `tests/conformance/rows/11-read-only-roles-registered.sh`
- Create: `src/tests/conformance/lib/opencode-v2.ts`, `src/tests/conformance/lib/scratch-home.ts` (modules; the `.sh` files stay until their last bash user is gone: tasks 13 and 14)
- Create: `src/tests/conformance/runner-isolation.test.ts` (built to `tests/conformance/runner-isolation.test.js`)
- Delete: `tests/conformance/runner-isolation.test.sh`
- Modify: `src/scripts/check-all.ts` (rows `conformance-free-*` run `node tests/conformance/run.js <h> --free`; `conformance-runner-isolation` runs the new test)
- Modify: `.github/workflows/conformance-nightly.yml` (`run: node tests/conformance/run.js ${{ matrix.harness }} --free`; the comment saying the free rows call python3 is removed, since none does after this task)
- Modify: `src/tests/gates/ci-pins.test.ts` (the asserted `run:` line)
- Modify: `tests/conformance/README.md`, `tests/review-bench/rows/01-review-bench.sh` and `tests/fixture-build/run.sh` (their `bash tests/conformance/run.sh` call becomes `node tests/conformance/run.js`), and any other caller `git grep -n "conformance/run.sh"` finds outside `docs/plans/`
- Modify: `tests/conformance/lib/opencode-v2.sh` and `tests/conformance/rows/20-v2-command-runs.sh`: each `python3 -c 'import socket;...'` free-port picker becomes `node -e "const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})"`; the TypeScript `lib/opencode-v2` picks its port the same way, in process

**Interfaces:**
- Produces: row contract, unchanged: `<row> --describe` prints `<number>|<name>|<free|live>`; a run exits 0 pass, 77 gap, other fail; a gap must write its reason to stderr. Environment handed to rows unchanged: `FX`, `HARNESS`, `FX_REAL_HOME`, the scratch `HOME`, `CODEX_HOME`, `XDG_CONFIG_HOME`, `CLAUDE_CONFIG_DIR`, `FX_ROW_MODEL_FILE`, `FX_LIVE_MODEL`.
- Produces: `startRow(file: string, args: readonly string[], opts: RunOptions) -> RunResult`: `runNode` for `.js`, `run('bash', [file, ...args])` for `.sh` (removed in task 13).
- Produces: `src/tests/conformance/lib/opencode-v2.ts` and `scratch-home.ts` export the functions their `.sh` counterparts define, under the same names in camelCase (`scratch_home_claude` becomes `scratchHomeClaude(dir: string, realHome?: string) -> void`), with the same effects on disk.
- Consumes: `run`, `runNode` (task 01); `lib/openrouter` and `lib/events` (sub-project 1).

**Seam:** the free conformance runs on all four harnesses in `check-all`; old against new runner output.

**Tests:**
- Per harness, `bash tests/conformance/run.sh <h> --free` at `old.rev` and `node tests/conformance/run.js <h> --free`: identical stdout after removing timing columns, identical exit code; saved to the ledger.
- Runner arguments, exact stderr and exit code: no harness: `usage: run.js <claude-code|opencode|opencode-v2|codex> [--free]`, exit 1 (the bash runner exits 1 here through `${1:?}`, whose `<file>: line 17: 1:` prefix is bash's and is not kept); `nope`: `unknown harness: nope`, exit 2; `claude-code --fre`: `usage: run.sh <claude-code|opencode|opencode-v2|codex> [--free]` with `run.sh` replaced by `run.js`, exit 2.
- `runner-isolation.test`: every check of the bash test: with a fake home and a probe row writing `$HOME/.claude/probe`, a normal run and a run sent SIGINT while the probe sleeps both leave the fake home byte-identical, the probe never lands there, and no scratch directory is left behind.
- Mixed rows: with `FX_CONFORMANCE_ROWS` pointing at a directory holding one `.sh` row (`--describe` prints `1|a|free`, exits 0) and one `.js` row (`2|b|free`, exits 77 with a reason), the runner reports row 1 PASS and row 2 GAP.
- Rows 10 and 11, each harness: `--describe` output identical to the bash row's; free-run exit code identical.
- `ci-pins.test` passes against the edited workflow.

**Risks:** the runner's SIGINT handling must forward to the running row and still clean up; Node's `process.on('SIGINT')` with a synchronous child does not fire until the child exits, so the runner spawns rows asynchronously. The `refusing scratch dir outside the temp dir` guard compares against `os.tmpdir()`, which is the right temp root on Windows too.

**Idempotency:** writes only scratch directories, removed on exit or interrupt.

**Testing:** old against new runner output; runner-isolation; `check-all`.

## Acceptance criteria
- [ ] `git grep -nE "(bash|sh) [^ ]*conformance/(run|runner-isolation)|python3" -- tests .github README.md INSTALL.md` prints no line naming `run.sh`, `runner-isolation.test.sh` or a `python3` call outside `docs/plans/`.
- [ ] Four free-run outputs identical old against new.
- [ ] `runner-isolation.test` passes, interrupt case included.
- [ ] The nightly workflow runs `node tests/conformance/run.js`; `ci-pins.test` passes.
- [ ] `node scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Record `old.rev`; save each harness's free-run output to the ledger**
- [ ] **3. Write `runner-isolation.test`, the argument checks and the mixed-rows check: verify RED**

Run: `scripts/build && node tests/conformance/runner-isolation.test.js`

- [ ] **4. Port the runner, the two free rows and the two helper libraries**
- [ ] **5. Verify GREEN**: the tests, then each harness's free run diffed against the ledger
- [ ] **6. Update the workflow, `ci-pins.test` and the callers**
- [ ] **7. Run the scope**

Run: `node scripts/check-all` (tracked background command)

- [ ] **8. Commit by path**

```
git rm tests/conformance/run.sh tests/conformance/rows/10-reference-paths-resolve.sh tests/conformance/rows/11-read-only-roles-registered.sh tests/conformance/runner-isolation.test.sh
git add src/tests/conformance/run.ts tests/conformance/run.js src/tests/conformance/rows/10-reference-paths-resolve.ts src/tests/conformance/rows/11-read-only-roles-registered.ts tests/conformance/rows/10-reference-paths-resolve.js tests/conformance/rows/11-read-only-roles-registered.js src/tests/conformance/lib/opencode-v2.ts src/tests/conformance/lib/scratch-home.ts tests/conformance/lib/opencode-v2.js tests/conformance/lib/scratch-home.js src/tests/conformance/runner-isolation.test.ts tests/conformance/runner-isolation.test.js src/scripts/check-all.ts scripts/check-all .github/workflows/conformance-nightly.yml src/tests/gates/ci-pins.test.ts tests/gates/ci-pins.test.js tests/conformance/README.md tests/review-bench/rows/01-review-bench.sh tests/fixture-build/run.sh tests/conformance/lib/opencode-v2.sh tests/conformance/rows/20-v2-command-runs.sh
git commit -m "test: conformance runner and free rows on Node"
```
