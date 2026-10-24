# 15: Lane-triggering on Node, fixtures as trees

**Status:** ready-for-agent
**Blocked by:** 13
**Phase:** Hardening

**What to build:** the lane-triggering runners run as `node tests/lane-triggering/run-test.js <lane> <prompt>`, `node tests/lane-triggering/run-reps.js ...` and `node tests/lane-triggering/run-all.js`, with the same arguments, the same `PASS`, `SKIP` and `FAIL` lines, the same summary, the same 77-on-skip rule and the same jail (task 13's `jailArgv`) and scratch home (task 12's `scratchHomeClaude`). Each per-lane fixture script, which only writes files, becomes a directory `tests/lane-triggering/fixtures/<lane>/` that the runner copies verbatim into the scratch project. The jail-isolation and skip-exit tests move to TypeScript.

**Design:** Implementation Decisions > 11; Implementation Decisions > 12; Testing Decisions

**Files:**
- Create: `src/tests/lane-triggering/run-test.ts`, `src/tests/lane-triggering/run-reps.ts`, `src/tests/lane-triggering/run-all.ts` (built to `.js` beside them)
- Delete: `tests/lane-triggering/run-test.sh`, `tests/lane-triggering/run-reps.sh`, `tests/lane-triggering/run-all.sh`
- Create: `tests/lane-triggering/fixtures/fx-architecture/`, `fixtures/fx-design/`, `fixtures/fx-implement/`, `fixtures/fx-plan/`, `fixtures/fx-review/` (each the exact tree its script writes)
- Delete: `tests/lane-triggering/fixtures/fx-architecture.sh`, `fx-design.sh`, `fx-implement.sh`, `fx-plan.sh`, `fx-review.sh`
- Create: `src/tests/lane-triggering/jail-isolation.test.ts`, `src/tests/lane-triggering/skip-exit.test.ts`, `src/tests/lane-triggering/fixtures.test.ts` (built to `.test.js`)
- Delete: `tests/lane-triggering/jail-isolation.test.sh`, `tests/lane-triggering/skip-exit.test.sh`
- Modify: `src/scripts/check-all.ts` (rows `lane-triggering-jail-isolation` and `lane-triggering-skip-exit` keep their names and run the new tests; add row `lane-triggering-fixtures`)
- Modify: any doc naming the old runner files (`git grep -nE "lane-triggering/(run-test|run-reps|run-all)\.sh"` outside `docs/plans/`)
- Modify: `scripts/handwritten-js-allowlist.txt` only if a fixture tree contains a `.js` file (fx-architecture's and fx-review's do: they are eval fixture content, allowlisted with that reason, as sub-project 1 did for review-bench cases)

**Interfaces:**
- Produces: runner arguments, exit codes (0 pass, 77 skip, 1 fail) and printed lines as the bash runners have them; `run-reps.js`'s refusals, each on stderr with exit 2, verbatim with `run-reps.sh` replaced by `run-reps.js` only in the usage line: `usage: <path>/run-reps.js <lane> <prompt-file> [reps] [plugin-dir]`, `no such prompt file: <f>`, `plugin tree must be an absolute path: <d>`, `plugin tree is not a directory: <d>`, `plugin tree is / or a top-level directory: <d>`, `plugin tree is the real home or a parent of it: <d>`, `plugin tree holds no .claude-plugin/plugin.json: <d>`; and `[SKIP] claude not on PATH`, exit 77.
- Produces: fixture rule: when `fixtures/<lane>/` exists, its tree is copied into the scratch project before the session, keeping modes; no fixture code runs.
- Consumes: `jailArgv` (task 13), `scratchHomeClaude` (task 12), `run`, `runNode` (task 01), `lib/verdict` (sub-project 1).

**Seam:** fixture tree comparison; skip-exit and jail-isolation tests in `check-all`.

**Tests:**
- `fixtures.test`: for each of the five lanes, running the old fixture script from `git show <old.rev>:tests/lane-triggering/fixtures/<lane>.sh` with `bash` in an empty scratch directory produces a tree whose snapshot (path, type, sha256, executable bit) equals the snapshot of `fixtures/<lane>/`. Skipped with `fixtures: bash or python3 not available, not run` and exit 0 where either is missing (the fx-architecture fixture script runs `python3` to write one file); it is deleted in task 17 once its last green run is saved to the ledger.
- `skip-exit.test`: every check of the bash test: with a stand-in `claude` that is never reached and a home with no credential, `run-test.js` and `run-reps.js` exit 77, and `run-all.js` counts them as skipped, prints `skipped runs exercised no lane; this is not a pass` and exits 1; `run-reps.js` refuses each plugin-tree argument the bash test refuses, with the message listed in Interfaces.
- `jail-isolation.test`: every check of the bash test, rewritten to assert that both runners build their bwrap command from `jailArgv` (the bash test grepped for `conformance/lib/jail.sh`; the new one asserts the runners import `../conformance/lib/jail` and pass its vector), plus the bash test's behavioural checks unchanged.
- `run-all.js` with every lane skipped: output `0 passed, 0 failed, <n> skipped` then the skipped line, exit 1, where `<n>` is the number of prompt files.

**Risks:** lane-triggering scores must stay comparable with past runs; the fixture tree comparison is what guarantees the scratch project is unchanged. A fixture tree under `tests/` is scanned by repo gates (`check-prose` reads `*.md`): the bash heredocs were not scanned, the trees are. If a gate flags fixture content, exempt `tests/lane-triggering/fixtures/` in that gate the way `references/testing/` is exempt in check-prose, in this task, with a recorded equivalence case showing only that path changed.

**Idempotency:** writes only scratch directories.

**Testing:** tree comparison; migrated tests; `check-all`. Real lane-triggering runs (model calls) are the owner's.

## Acceptance criteria
- [ ] Five fixture trees identical to what their scripts wrote.
- [ ] No `.sh` under `tests/lane-triggering/`.
- [ ] `git grep -nE "lane-triggering/(run-test|run-reps|run-all|jail-isolation\.test|skip-exit\.test)\.sh|lane-triggering/fixtures/[a-z-]+\.sh"` outside `docs/plans/` prints nothing.
- [ ] `node scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Record `old.rev`**
- [ ] **3. Write `fixtures.test`, `skip-exit.test`, `jail-isolation.test`: verify RED**

Run: `scripts/build && node tests/lane-triggering/fixtures.test.js; node tests/lane-triggering/skip-exit.test.js`

- [ ] **4. Generate each fixture tree by running its script once into the fixtures directory; delete the scripts**
- [ ] **5. Port the three runners**
- [ ] **6. Verify GREEN**: the three tests
- [ ] **7. Run the scope**

Run: `node scripts/check-all` (tracked background command)

- [ ] **8. Commit by path**

```
git rm tests/lane-triggering/run-test.sh tests/lane-triggering/run-reps.sh tests/lane-triggering/run-all.sh tests/lane-triggering/fixtures/fx-architecture.sh tests/lane-triggering/fixtures/fx-design.sh tests/lane-triggering/fixtures/fx-implement.sh tests/lane-triggering/fixtures/fx-plan.sh tests/lane-triggering/fixtures/fx-review.sh tests/lane-triggering/jail-isolation.test.sh tests/lane-triggering/skip-exit.test.sh
git add src/tests/lane-triggering tests/lane-triggering src/scripts/check-all.ts scripts/check-all
git commit -m "test: lane-triggering on Node, fixtures as trees"
```

Add the allowlist and any doc the `git grep` found to the `git add`.
