# 10: Shipped skill scripts on Node

**Status:** ready-for-agent
**Blocked by:** 09
**Phase:** Core

**What to build:** the scripts fx ships inside skills, which run in the user's project, need only Node. The brainstorm companion starts with `node <skill-dir>/scripts/start-server.cjs` and stops with `node <skill-dir>/scripts/stop-server.cjs <session_dir>`, with the same options, JSON lines, state files, ignore checks and owner-PID rule as the bash scripts. fx-implement's `node scripts/review-package SLUG BASE HEAD [OUTFILE]` writes the same package file and prints the same summary. fx-debug's human-in-the-loop template is `hitl-loop.template.mjs`, which the agent copies, edits and runs with `node`. Every skill, COVERAGE row and test that names the old files names the new ones, and `check-interpreters` (with task 06's shebang rule) passes.

**Design:** Implementation Decisions > 2; Implementation Decisions > 4; Implementation Decisions > 6

**Files:**
- Create: `src/skills/fx-brainstorm/scripts/start-server.cts`, `src/skills/fx-brainstorm/scripts/stop-server.cts` (built to `start-server.cjs`, `stop-server.cjs`)
- Delete: `skills/fx-brainstorm/scripts/start-server.sh`, `skills/fx-brainstorm/scripts/stop-server.sh`
- Create: `src/skills/fx-implement/scripts/review-package.ts` (built over the bash file at `skills/fx-implement/scripts/review-package`), `src/skills/fx-implement/scripts/review-package.test.ts`
- Create: `skills/fx-debug/scripts/hitl-loop.template.mjs` (hand-written, no generated header)
- Delete: `skills/fx-debug/scripts/hitl-loop.template.sh`
- Create: `src/tests/companion/ignore-guarantees.test.ts` (built to `tests/companion/ignore-guarantees.test.js`; still run by hand, not by `check-all`)
- Delete: `tests/companion/ignore-guarantees.sh`
- Create: `src/tests/gates/hitl-template.test.ts` (built to `tests/gates/hitl-template.test.js`)
- Create: `tests/equivalence/review-package.json` and its golden
- Modify: `scripts/handwritten-js-allowlist.txt` (add `skills/fx-debug/scripts/hitl-loop.template.mjs` with the reason: a template the agent copies into the user's project and edits there, so a generated header would point at a `src/` the user does not have)
- Modify: `skills/fx-brainstorm/visual-companion.md`, `skills/fx-brainstorm/SKILL.md`, `skills/fx-brainstorm/COVERAGE.md`, `skills/fx-debug/SKILL.md`, `skills/fx-debug/COVERAGE.md`, `skills/fx-implement/SKILL.md`, `skills/fx-review/SKILL.md` (every `bash .../start-server.sh`, `stop-server.sh`, `bash scripts/review-package`, `hitl-loop.template.sh` becomes the `node` form and new file name; COVERAGE rows say the script was ported to Node for Windows)
- Modify: `src/tests/gates/brainstorm-server.test.ts` (sub-project 1 task 10 created it): point any `start-server.sh` call at `start-server.cjs`, and add the four argument-error cases below
- Modify: `src/scripts/check-all.ts` (add rows `review-package.test.js` and `hitl-template.test.js`)

**Interfaces:**
- Produces: `start-server.cjs` options as `start-server.sh` documents them (`--slug`, `--project-dir`, `--host`, `--url-host`, `--idle-timeout-minutes`, `--open`, `--foreground` and `--no-daemon`, `--background` and `--daemon`). stdout JSON lines and their keys unchanged; every `{"error": ...}` message unchanged except that `start-server.sh` inside the "Retry in a persistent terminal" message reads `node <dir>/start-server.cjs`. Background mode: `spawn(process.execPath, ['server.cjs', '--brainstorm-server-id=<id>'], { cwd: <script dir>, detached: true, stdio: ['ignore', log, log], env })` then `unref()`. Owner PID: on POSIX the parent of `process.ppid` read with `run('ps', ['-o', 'ppid=', '-p', String(process.ppid)])`, falling back to `process.ppid` when empty or `1`; on win32 empty, as the bash script does for a Windows shell.
- Produces: `stop-server.cjs <session_dir>`: outputs `{"status": "stopped"}`, `{"status": "not_running"}`, `{"status": "stale_pid"}`, `{"status": "failed", "error": "process still running"}`, `{"error": "Usage: stop-server.sh <session_dir>"}` with `stop-server.sh` replaced by `stop-server.cjs`; same exit codes; same `/tmp`-only deletion rule (on win32: under `os.tmpdir()`).
- Produces: `review-package SLUG BASE HEAD [OUTFILE]`: same usage line (`usage: review-package SLUG BASE HEAD [OUTFILE]`, exit 2), `not a git repo`, `bad BASE: <x>`, `bad HEAD: <x>` (exit 2), `empty range <b>..<h>: no commits to review` (exit 3), the `.fx/` not-ignored warning, file content and the `wrote <out>: <n> commit(s), <bytes> bytes` line.
- Produces: `hitl-loop.template.mjs`: helpers `step(instruction)` (prints, waits for Enter) and `capture(name, question)` (prints, reads one line); at the end prints each captured value as `KEY=VALUE`, one per line, as the bash template does; same example steps.
- Consumes: `run`, `runNode` (task 01) in the generated scripts. The hand-written template uses only `node:readline`.

**Seam:** the companion test and `brainstorm-server.test` for the server scripts; `equiv check` for review-package; `hitl-template.test`; `check-interpreters` over the edited skills.

**Tests:**
- review-package cases, each `git: true` with `setup` making commits (`git -c user.name=t -c user.email=t@t commit -qm <msg>` after writes): `two-commits` (`tree: ".fx"`, args `s HEAD~1 HEAD`: output file and summary equal), `explicit-outfile`, `empty-range` (`s HEAD HEAD`, exit 3), `bad-base` (exit 2), `usage` (one argument, exit 2), `fx-not-ignored` (warning on stderr). Commit hashes differ between old and new scratch roots only if the commit times differ, so `setup` sets `GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE` to `2026-01-01T00:00:00Z` through the case `env`.
- `review-package.test`: in a scratch repo with two commits, `node review-package s HEAD~1 HEAD` writes `.fx/s/review/<b7>..<h7>.diff` whose first line is `# Review package: HEAD~1..HEAD` and prints `wrote <path>: 1 commit(s), <n> bytes` where `<n>` equals the file size.
- `ignore-guarantees.test`: every check the bash test makes (state files git-ignored, tracked-file refusal, mockups kept after stop), starting servers with `node start-server.cjs` and stopping with `node stop-server.cjs`; all servers stopped and scratch removed on exit.
- start-server, argument errors (no server started), exact stdout line and exit 1, in `brainstorm-server.test`: `--slug a/b` prints `{"error": "--slug must be one path segment of letters, digits, dots, dashes or underscores, starting with a letter or digit"}`; `--idle-timeout-minutes 0` prints `{"error": "--idle-timeout-minutes must be a positive integer"}`; `--bogus` prints `{"error": "Unknown argument: --bogus"}`; `--project-dir <skill dir>/x` prints `{"error": "the project directory <physical path of that dir> is inside the fx-brainstorm skill directory <physical skill dir>. Pass --project-dir with the project root."}`.
- start-server then stop-server in a scratch git repo with `.fx/` ignored: start prints one JSON line with `url` and `port`; a request to `url` answers 200; stop prints `{"status": "stopped"}` exit 0; a second stop prints `{"status": "not_running"}`.
- `hitl-template.test`: `node hitl-loop.template.mjs` with stdin `\ny\nboom\n` (Enter for the step, then the template's two example captures) exits 0 and its last two lines are `ERRORED=y` and `ERROR_MSG=boom`. The template reads stdin through one async line iterator (`readline.createInterface(...)[Symbol.asyncIterator]()`), so piped input is not lost between prompts.
- `node scripts/check-interpreters` exits 0 over the edited skills; `git grep -nE "start-server\.sh|stop-server\.sh|hitl-loop\.template\.sh|bash [^ ]*review-package"` outside `docs/plans/` prints nothing.

**Risks:** the companion server must outlive the starting process on every platform; `detached: true` plus `unref()` and file descriptors for the log (not pipes) are what keep it alive. Windows behaviour is unverified here; task 16's nightly job runs start and stop on Windows.

**Testing:** recorded equivalence for review-package; unit and companion tests; `check-all`.

## Acceptance criteria
- [ ] A user following `visual-companion.md` on any platform runs only `node` commands; the companion starts, answers and stops.
- [ ] `review-package` cases check identical.
- [ ] No `.sh` file remains under `skills/`.
- [ ] `node scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Record `old.rev`; write the review-package cases; record the golden**
- [ ] **3. Write the tests the Tests field names**
- [ ] **4. Verify RED**: `scripts/build && node scripts/equiv check tests/equivalence/review-package.json; node skills/fx-implement/scripts/review-package.test.js; node tests/gates/hitl-template.test.js; node tests/companion/ignore-guarantees.test.js`
- [ ] **5. Port the four scripts; update the skill text, COVERAGE rows and allowlist**
- [ ] **6. Verify GREEN**: same commands, then `node scripts/check-interpreters`
- [ ] **7. Run the scope**

Run: `node scripts/check-all` (tracked background command)

- [ ] **8. Commit by path**

```
git rm skills/fx-brainstorm/scripts/start-server.sh skills/fx-brainstorm/scripts/stop-server.sh skills/fx-debug/scripts/hitl-loop.template.sh tests/companion/ignore-guarantees.sh
git add src/skills/fx-brainstorm/scripts/start-server.cts src/skills/fx-brainstorm/scripts/stop-server.cts skills/fx-brainstorm/scripts/start-server.cjs skills/fx-brainstorm/scripts/stop-server.cjs src/skills/fx-implement/scripts/review-package.ts src/skills/fx-implement/scripts/review-package.test.ts skills/fx-implement/scripts/review-package skills/fx-implement/scripts/review-package.test.js skills/fx-debug/scripts/hitl-loop.template.mjs src/tests/companion/ignore-guarantees.test.ts tests/companion/ignore-guarantees.test.js src/tests/gates/hitl-template.test.ts tests/gates/hitl-template.test.js tests/equivalence/review-package.json tests/equivalence/review-package.golden.json scripts/handwritten-js-allowlist.txt skills/fx-brainstorm/visual-companion.md skills/fx-brainstorm/SKILL.md skills/fx-brainstorm/COVERAGE.md skills/fx-debug/SKILL.md skills/fx-debug/COVERAGE.md skills/fx-implement/SKILL.md skills/fx-review/SKILL.md src/tests/gates/brainstorm-server.test.ts tests/gates/brainstorm-server.test.js src/scripts/check-all.ts scripts/check-all
git commit -m "feat(skills): companion, review package and hitl template run on Node"
```

