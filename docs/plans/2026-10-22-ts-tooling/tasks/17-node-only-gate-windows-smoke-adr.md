# 17: Node-only gate, Windows smoke job, ADR

**Status:** ready-for-agent
**Blocked by:** 16
**Phase:** Polish

**What to build:** `check-all` fails if a bash or Python file comes back: `node scripts/check-node-only` rejects any tracked `.sh`, `.bash` or `.py` file, or any tracked file whose line 1 names `bash`, `sh` or `python`, outside the allowlist (`tests/conformance/lib/with-key.sh`, `docs/plans/**`). A shipped-scripts smoke test exercises what users run (the opencode installer, the companion start and stop, review-package, the hitl template) and runs in `check-all` and in a new nightly Windows job. A new ADR records the decision. The leftovers of the migration are removed: test-scope's `.test.sh` branch and the lane fixtures comparison test. Contributor docs list Node and git as the only prerequisites.

**Design:** Implementation Decisions > 13; Implementation Decisions > 14; Implementation Decisions > 10; Testing Decisions

**Files:**
- Create: `src/scripts/check-node-only.ts` (built to `scripts/check-node-only`), `src/tests/gates/check-node-only.test.ts` (built to `tests/gates/check-node-only.test.js`)
- Create: `src/tests/shipped/smoke.test.ts` (built to `tests/shipped/smoke.test.js`)
- Delete: `src/tests/lane-triggering/fixtures.test.ts`, `tests/lane-triggering/fixtures.test.js` (after a last green run, saved to the ledger)
- Modify: `src/scripts/check-all.ts` (add rows `check-node-only`, `check-node-only.test.js`, `shipped-smoke.test.js`; remove row `lane-triggering-fixtures`)
- Modify: `src/scripts/test-scope.ts` (remove the `.test.sh` branch; a `.sh` path is no longer mapped) and `src/scripts/test-scope.test.ts` (cases that named a `.test.sh` path)
- Modify: `.github/workflows/conformance-nightly.yml` (new job `windows-smoke`: `runs-on: windows-latest`, checkout and setup-node pinned to the same SHAs and Node version as the existing job, then `npm ci` and `node tests/shipped/smoke.test.js`)
- Modify: `src/tests/gates/ci-pins.test.ts` only if it rejects a job without a harness matrix (make it accept `windows-smoke` by name)
- Create: `docs/adr/<next free number>-fx-tooling-needs-only-node.md` (the next unused four-digit number in `docs/adr/` when this task runs)
- Modify: `docs/adr/0046-fx-sources-are-typescript.md` (one line: sub-project 4 complete, the new ADR's number)
- Modify: `INSTALL.md`, `README.md` (prerequisites: Node and git; every command shown with `node`)

**Interfaces:**
- Produces: `scripts/check-node-only`: scans `git ls-files`; output `FAIL: <path> is <shell|Python>` per offender then exit 1; `check-node-only: OK (<n> files)` exit 0; `FAIL: no file scanned` exit 1 when `git ls-files` is empty.
- Produces: `tests/shipped/smoke.test.js`: exits 0 printing `shipped smoke: passed`; on any platform it (1) with `HOME` set to a scratch directory, runs `fx-opencode-install --major 1 --dest <tmp>`, then `fx-opencode-install --major 1 --dest <tmp> --dry-run`, and asserts `<tmp>/plugins/fx.js` resolves to the repo's `plugins/fx-opencode-v1.js` (junction or link) and that the dry run's output equals the installer's recorded dry-run output for an existing install (task 09's `dry-run-lines` golden, ending with a blank line and `dry run: nothing written`) after `<ROOT>` replacement; (2) starts the companion with `start-server.cjs --project-dir <scratch git repo> --slug s --background`, requests its URL (status 200), stops it with `stop-server.cjs` (`{"status": "stopped"}`); (3) runs `review-package s HEAD~1 HEAD` in a scratch repo with two commits (exit 0, file exists); (4) runs the hitl template with stdin `\ny\nboom\n` and checks its last two lines are `ERRORED=y` and `ERROR_MSG=boom`. Every child through `runNode` or `run`.
- Consumes: `run`, `runNode`, `toPosixRel` (task 01); the installer (task 09); the shipped scripts (task 10).

**Seam:** `check-all`; the nightly Windows job.

**Tests:**
- `check-node-only.test`, each in a scratch git repo: a tracked `a.sh`: exit 1, `FAIL: a.sh is shell`; a tracked `x` whose line 1 is `#!/usr/bin/env python3`: `FAIL: x is Python`; a tracked `y` whose line 1 is `#!/bin/sh`: `FAIL: y is shell`; `tests/conformance/lib/with-key.sh`: exit 0; `docs/plans/p/m.py`: exit 0; a tracked `z` whose line 1 is `#!/usr/bin/env node`: exit 0; empty repo: `FAIL: no file scanned`.
- `node scripts/check-node-only` on this repo: `check-node-only: OK (<n> files)`, exit 0.
- `node tests/shipped/smoke.test.js` on Linux: `shipped smoke: passed`, and no server process left (the PID in the state file is not alive).
- test-scope: `--dry-run tests/x.test.sh` no longer prints `bash tests/x.test.sh`.
- `ci-pins.test` passes with the new job.

**Risks:** the Windows job's first run happens only after the owner pushes; its failures are expected findings, not regressions, and get their own follow-up. On Windows the installer's file link needs Developer Mode, and whether GitHub's `windows-latest` runner has it is not verified; when the installer exits with the Developer Mode refusal, the smoke test prints `skipped: file symlink needs Developer Mode`, skips step (1)'s link assertion and continues, since that refusal is the documented behaviour.

**Testing:** gate test; smoke test on Linux; `check-all`; Windows nightly (owner-triggered).

## Acceptance criteria
- [ ] `node scripts/check-all` prints `ALL GREEN` with `check-node-only` and the smoke test in it.
- [ ] `git ls-files | grep -E '\.(sh|bash|py)$' | grep -v '^docs/plans/'` prints only `tests/conformance/lib/with-key.sh`.
- [ ] The ADR states: fx needs Node and git to develop, test and install; `with-key.sh` is the one shell file and why; live rows and the jail are Linux-only; the equivalence records under `tests/equivalence/` are checked in `check-all`; the Windows support level and that it is measured nightly.
- [ ] INSTALL.md lists Node and git as the only prerequisites.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Run `node tests/lane-triggering/fixtures.test.js` one last time; save its output to the ledger**
- [ ] **3. Write `check-node-only.test` and the smoke test: verify RED**

Run: `scripts/build && node tests/gates/check-node-only.test.js; node tests/shipped/smoke.test.js`

- [ ] **4. Implement `check-node-only`; fix anything the smoke test exposes in the code under test**
- [ ] **5. Verify GREEN**: same commands
- [ ] **6. Workflow job, test-scope cleanup, ADRs, docs**
- [ ] **7. Run the scope**

Run: `node scripts/check-all` (tracked background command)

- [ ] **8. Commit by path**

```
git rm src/tests/lane-triggering/fixtures.test.ts tests/lane-triggering/fixtures.test.js
git add src/scripts/check-node-only.ts scripts/check-node-only src/tests/gates/check-node-only.test.ts tests/gates/check-node-only.test.js src/tests/shipped/smoke.test.ts tests/shipped/smoke.test.js src/scripts/check-all.ts scripts/check-all src/scripts/test-scope.ts scripts/test-scope src/scripts/test-scope.test.ts scripts/test-scope.test.js .github/workflows/conformance-nightly.yml docs/adr/0046-fx-sources-are-typescript.md INSTALL.md README.md
git commit -m "build: node-only gate, shipped-scripts smoke test, Windows nightly job"
```

Add the new ADR file, and `src/tests/gates/ci-pins.test.ts tests/gates/ci-pins.test.js` if changed, to the `git add`.
