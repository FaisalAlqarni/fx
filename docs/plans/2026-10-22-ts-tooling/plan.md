# fx tooling moves to TypeScript: implementation plan

> **Build this with `fx-implement`. Do not execute the tasks directly.**
>
> The tasks below are deliberately detailed. That makes them easy to follow and
> it is exactly why the lane gets skipped: nothing looks missing. What is
> missing is everything a task file cannot hold, and it is what `fx-implement`
> supplies: a worktree so the main checkout is never written to, a ledger that
> survives compaction, a fresh subagent per task, a review while each diff is
> still small, and lens dispatch on what the diff actually touched.
>
> Steps use `- [ ]` checkboxes.

**Design:** `./design.md`
**Goal:** every Python and bash file fx runs to develop, test or install becomes strict TypeScript compiled to committed JavaScript, proven to behave identically, so fx needs only Node and git.
**Architecture:** Task 01 builds the equivalence tool (`scripts/equiv`: record the old script's output on fixed cases, check the new one against it in `check-all` forever), the one process helper and an ASCII JSON writer, and proves them on the two smallest bash gates. Task 02 ports `check-all` itself, so every later task edits one TypeScript row list. Tasks 03 to 10 migrate the gates, generators, build tooling, the opencode installer and the scripts shipped inside skills; tasks 11 to 16 migrate the install suite, the conformance runner, rows, live layer and jail, and the three eval runners; task 17 adds the gate that keeps it complete and the Windows smoke job.
**Stack:** TypeScript (strict) through sub-project 1's toolchain (`scripts/build`, esbuild file by file, `tsc --noEmit`), Node 20 target, git.
**Complexity:** High
**Risks:**
- HIGH: a gate reports a different finding set after migration (Python and JavaScript regexes differ: `\w` and `\b` are Unicode-aware in Python 3 and ASCII in JavaScript; `re.S`, `rglob` and `sorted` have their own orders): every migrated gate has a cases file with one case per message it can print, including non-ASCII input, recorded from the old script and checked in `check-all`; each task also runs a `live` compare over the whole repo.
- HIGH: the opencode installer writes a different tree or `opencode.json` (users reinstall over old installs): task 09 records installed trees for both majors, every refusal and the dry run; the JSON writer reproduces `json.dumps(indent=2)` except for the four accepted differences design decision 9 lists, each pinned by a case.
- HIGH: `check-all` drops or reorders a row while being ported, so a gate silently stops running: task 02 diffs the new `== <name> ==` sequence against the bash version's once, in the ledger, name for name.
- HIGH: a caller still runs `python3` or `bash` on a ported script (bash rows and libraries call the installer and check-paths): every migration task's acceptance criteria include a `git grep` for leftover invocations of what it ported, outside `docs/plans/`.
- HIGH: a golden silently depends on the repo or machine and breaks later for an unrelated reason: recorded cases copy inputs from `old.rev` only, environments start empty, `.git` contents are never hashed (design decision 5).
- MEDIUM: an invocation in a skill still says `bash` or `python3` for a script that is now Node: task 06's shebang rule fails `check-interpreters` on it, and task 17's gate fails on any leftover shell or Python file.
- MEDIUM: the jail's boundary changes when `jail.sh` becomes a module (a hidden path becomes readable to a live row): task 13 diffs the bwrap argument vectors one per line and keeps the jail probe test green.
- MEDIUM: a Windows behaviour cannot be verified locally (junctions, `.cmd` shims, detached spawn): Windows support is narrowed to the installer and shipped scripts; unit tests cover the branches with `process.platform` injected; the nightly Windows job (task 17) is the measurement and runs only after the owner pushes.
- MEDIUM: a ported live row behaves differently and nothing cheap notices: tasks 13 and 14 run each old and new live row against the same stub CLI stream; the owner's real live run stays listed as unverified.
**Testing:** Unit: new `*.test.ts` for `scripts/equiv`, `lib/proc`, `lib/json` additions and the new gates · Equivalence: `node scripts/equiv check tests/equivalence` in `check-all`, plus a `live` compare per task in the ledger · Integration: `node scripts/check-all`, which runs the install runs and the free conformance rows on Claude Code, Codex, opencode 1.x and 2.x · Platform: shipped-scripts smoke test on Linux in `check-all` and on Windows nightly; `check-all` itself is Linux and macOS.

## Global Constraints

- Develop, test and install need Node and git only; no Python and no bash, except `tests/conformance/lib/with-key.sh` under `/bin/sh` inside the Linux bwrap jail.
- No runtime `dependencies` in `package.json`; no new devDependencies.
- Every sub-project 1 constraint holds: TypeScript `strict` and `noUncheckedIndexedAccess`, no `any` or suppression without `ts-gate-ok: <reason>`, external input (CLI arguments, files a tool reads, child output, environment) enters as `unknown` and is parsed, compile file by file, target `node20`, generated files carry the header and are committed.
- A migrated gate prints the same stdout and stderr and returns the same exit code as the script it replaces on every recorded case; printed paths use `/`. A recorded case reads only content the case writes or copies from `old.rev`, never the live repo or machine.
- A migrated generator or installer produces a byte-identical tree: same paths, contents, link targets and executable bits.
- A migrated script keeps its path and command-line interface; only the interpreter changes to `node`. The exceptions are start-server, stop-server, the hitl template and `.sh` tests and runners, renamed as decisions 2 and 6 say, with every reference updated in the same commit.
- Every child process spawned by code this plan writes goes through `lib/proc` with an argument array, Node scripts as `process.execPath <script>`; the one exception is `scripts/build`, which imports only Node builtins because it rebuilds `lib/proc` itself.
- Text files are LF; `.gitattributes` enforces it.
- Windows support covers the opencode installer and the scripts shipped inside skills; `check-all` and the test suites are supported on Linux and macOS.
- Old scripts are recorded with `LC_ALL=C` and an otherwise empty environment apart from `PATH`; new code orders by code point. A tool that prints in `find` order is compared on single-file cases or with `sortLines`.
- Each migration step is one commit with `node scripts/check-all` green; the old file is deleted in the commit that lands its replacement.
- This plan starts after sub-projects 1, 2 and 3 are complete. Their files are edited only to port them: task 14 ports sub-project 2's live rows 21 to 23, task 02 carries over every `check-all` row they added, and each task ports whatever lines they added to the bash or Python file it migrates.
- No em or en dashes in any file, comment or commit message; no attribution trailers.
- Nothing is pushed, merged or released by the agent.

## Standing rulings for this build

- Ruling: task 01 starts only when sub-projects 1, 2 and 3 (`docs/plans/2026-10-22-ts-migration/`, `docs/plans/2026-10-22-fx-judge-hooks/`, `docs/plans/2026-10-22-browser-agent/`) are complete: every task in each is committed and `bash scripts/check-all` prints `ALL GREEN`. If not, stop and report.
- Ruling: tasks that edit `scripts/check-all` (01 in bash; 02 ports it; then 03 to 13 and 15 to 17 in TypeScript) are serialized by their blocking edges, which form one chain 01 to 13 with 14 and 15 after 13. Task 14 does not edit it. Each task that creates a test adds its `check-all` row in the same task. Row names never change (design decision 3).
- Ruling: a cases file's `old.rev` is the commit `git rev-parse HEAD` printed at the start of the task that writes it, before any change; it is never edited afterwards.
- Ruling: goldens are written only by `equiv record` from the old script, never by hand. If `equiv check` fails, the new code is wrong; a golden is re-recorded only when the cases file itself changed, from the same `old.rev`. The one exception: a case for a difference the design accepts (decision 9) or one a ledger Ruling accepts, naming the case and the reason, is re-recorded from the new script with `equiv record --from-new <cases.json> <case>`.
- Ruling: every migration task's acceptance criteria include `git grep -nE "(python3?|bash|sh) [^ ]*<ported path>"` outside `docs/plans/` printing nothing, for each path it ports, including callers inside bash files not yet migrated.
- Ruling: tests and smoke runs that invoke the opencode installer always pass `--dest <scratch>`, `--major <n>` and a scratch `HOME`.
- Ruling: a `live` compare difference that comes from repo content the cases do not cover is fixed in the new code, and the triggering input is added as a recorded case.
- Ruling: `scripts/check-all` runs the free conformance rows, which need the four harness CLIs installed; a task whose scope run reaches `check-all` runs it as one tracked background command.
- Ruling: every `.sh` or Python file that a task migrates is listed in that task's Files as Delete, and `git rm` is part of its commit.

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | Equivalence tool, process helper, first two gates | none (sub-projects 1, 2, 3 complete) | `scripts/equiv`, `lib/proc`, `stringifyAscii`, `.gitattributes`, shebang build rule; check-reference-leaves and check-tool-names on Node | MVP |
| 02 | check-all and the git fixture on Node | 01 | `scripts/check-all`, `scripts/make-git-fixture`, `scripts/test-one`; `.fx.json` without `bash -c` | MVP |
| 03 | check-paths and check-manifest on Node | 02 | two gates with recorded equivalence | Core |
| 04 | check-prose on Node | 03 | check-prose and its explicit-path test | Core |
| 05 | check-artifacts and check-collisions on Node | 04 | two gates and the remote-asset test | Core |
| 06 | check-interpreters on Node with the shebang rule | 05 | gate, its test, the interpreter-matches-shebang rule | Core |
| 07 | Generators and check-generated on Node | 06 | gen-codex-agents, gen-command-skills, check-generated covering both; ADR 0028 amendment | Core |
| 08 | Build tooling on Node | 07 | build, check-types, check-ts-escapes, check-handwritten-js and their tests | Core |
| 09 | opencode installer on Node | 08 | fx-opencode-install with identical trees; INSTALL.md | Core |
| 10 | Shipped skill scripts on Node | 09 | start-server.cjs, stop-server.cjs, review-package, hitl template, companion test | Core |
| 11 | Install suite on Node | 10 | `tests/install/run.js`, home-untouched test | Hardening |
| 12 | Conformance runner and free rows on Node | 11 | runner (runs `.sh` and `.js` rows), free rows, `opencode-v2` and `scratch-home` modules, runner-isolation test; CI workflow line | Hardening |
| 13 | Live layer, jail and live rows 01 to 09 on Node | 12 | `live`, `jail`, `plant-codex-roles` modules; nine rows; five stub-driven tests; jail argument-vector test | Hardening |
| 14 | Live rows 12 to 23 on Node | 13 | rows 12 to 20 and sub-project 2's rows 21 to 23; no conformance row left in bash | Hardening |
| 15 | Lane-triggering on Node, fixtures as trees | 13 | three runners, five fixture trees, jail-isolation and skip-exit tests | Hardening |
| 16 | Review-bench and fixture-build on Node, bash libraries removed | 14, 15 | two runners and rows, row-safety test; runner `.sh` branch and four bash libraries deleted | Hardening |
| 17 | Node-only gate, Windows smoke job, ADR | 16 | `check-node-only`, shipped-scripts smoke test, Windows nightly job, ADR, test-scope cleanup | Polish |

Phases ship independently: each ends with `node scripts/check-all` green. After MVP the equivalence tool and the Node `check-all` exist. After Core no gate, generator, installer or shipped script needs Python or bash, so users need only Node. After Hardening no test needs bash. After Polish a gate keeps it that way and Windows is measured nightly.
