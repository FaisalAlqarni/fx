# fx tooling moves to TypeScript

**Date:** 2026-10-22
**Status:** ready-for-agent
**Approved:** 2026-10-22
**Glossary:** none (fx has no `CONTEXT.md`); no terms added

## Problem Statement

After sub-project 1, fx's runtime code is strict TypeScript, but its tooling is still three languages. The gates, the two generators and the opencode installer are Python; `check-all`, the build, four gates, the git fixture builder, every test runner, the conformance rows, the jail and three scripts shipped inside skills are bash. To develop or test fx a contributor needs Node, Python 3 and bash. To install fx on opencode a user needs Python 3. A Windows user has no bash by default, so the brainstorm companion's start and stop scripts and fx-implement's review package do not run there at all, and neither does `check-all`.

The two languages also duplicate work. The opencode installer already shells out to `node -e` to reach the one agent converter, and Python's `json.dumps` and regex rules have to be kept in step with JavaScript ones by hand.

This is sub-project 4 of 4. It adds no features.

## Solution

Every Python and bash file fx runs gets a TypeScript source under `src/` and is compiled by sub-project 1's build to committed JavaScript. A migrated tool keeps its path and its command-line interface; only the interpreter word in front of it changes to `node`. Each migrated gate, generator and installer is proven equivalent to the script it replaces by recording the old script's output on fixed inputs and checking the new one against that record, in `check-all`, forever. After this, fx needs Node and git to develop, test and install. The only shell left is a 13-line `/bin/sh` helper that runs inside the Linux-only bwrap jail.

## User Stories

1. As an fx user on opencode, I want to install fx with `node scripts/fx-opencode-install`, so that I need no Python.
2. As an fx user on Windows, I want the brainstorm companion, the review package and the human-in-the-loop template to run with Node, so that the lanes that use them work without bash.
3. As an fx contributor, I want `node scripts/check-all` to be the whole test gate on Linux and macOS, with the same gate order and the same `== <name> ==`, `FAIL: <name>` and `ALL GREEN` lines as today, so that nothing I rely on changes except the interpreter.
4. As an fx contributor, I want every gate to report exactly the findings, messages and exit codes it reports today on the same input, so that a migration cannot quietly widen or narrow a rule.
5. As an fx contributor, I want the two generators to write byte-identical trees, and `check-generated` to cover both of them, so that a stale generated skill is caught as a stale Codex role already is.
6. As an fx user on opencode, I want the installer to produce the same installed tree, the same `opencode.json` bytes, the same dry-run lines and the same refusals as today, so that reinstalling over an old install changes nothing.
7. As an fx contributor, I want the install runs and the free conformance rows on Claude Code, Codex, opencode 1.x and 2.x to stay green through every step, so that harness behaviour is proven unchanged.
8. As an fx contributor, I want the live conformance rows, the lane-triggering, review-bench and fixture-build runners on Node with the same row contract and the same jail boundary, so that past scores stay comparable.
9. As an fx contributor, I want `check-all` to fail on any new tracked bash or Python file outside a short allowlist, so that the migration stays complete.
10. As the fx author, I want a nightly Windows job that installs fx and runs the shipped scripts, so that the Windows support this plan claims (installer and shipped scripts only) is measured, not assumed.
11. As an fx contributor running fx-implement on fx itself, I want `.fx.json` commands that need no `bash -c`, so that fx's own loop runs on every platform.

## Implementation Decisions

**1. Inventory and decision per file.** Taken 2026-10-22 against the fx main checkout (before sub-project 1 lands; its additions are listed too).

| File or group | Today | Decision | Reason |
|---|---|---|---|
| check-paths, check-manifest, check-prose, check-artifacts, check-collisions | Python | migrate | gates; Python is the dependency being removed |
| check-reference-leaves, check-tool-names, check-interpreters, check-generated | bash | migrate | gates run by `check-all` |
| gen-codex-agents, gen-command-skills | Python | migrate | generators; ADR 0028 |
| fx-opencode-install | Python plus `node -e` | migrate | user-facing installer; Node is already required |
| make-git-fixture | bash | migrate | used by `check-all` and `.fx.json` |
| check-all | bash | migrate, Node only | decision 3 |
| build, check-types, check-ts-escapes, check-handwritten-js (sub-project 1) | bash | migrate | decision 7 |
| brainstorm start-server.sh, stop-server.sh | bash, shipped | migrate to `.cjs` | run in users' projects, Windows included |
| fx-implement review-package | bash, shipped | migrate, same path | run in users' projects |
| fx-debug hitl-loop.template.sh | bash, shipped | migrate to a hand-written `.mjs` template | decision 6 |
| install suite, conformance runner, rows and libs, lane-triggering, review-bench and fixture-build runners | bash | migrate | `check-all` runs them or their safety tests |
| gate tests in bash (check-interpreters, check-prose explicit path, check-artifacts remote, toolchain and hand-written-JS tests) | bash | migrate | tests run by `check-all` |
| companion ignore-guarantees test | bash | migrate | proves the companion; run by hand |
| lane-triggering fixtures | bash heredocs | become static directory trees | they only write files; data needs no code |
| conformance with-key.sh | `/bin/sh` | keep | runs only inside the bwrap jail, which exists only on Linux, where `/bin/sh` always exists; it must `exec` the CLI so the key never appears in a process argument, which `/bin/sh` does in one line |
| lean-review measure fx-cost.py | Python | keep | frozen evidence inside a finished plan; nothing runs it |
| hooks | JavaScript (TypeScript after sub-project 1) | nothing to do | no bash or Python |

**2. Same path, same interface, Node shebang.** A migrated extensionless script keeps its path, its arguments, its stdout and stderr text and its exit codes. Its line 1 is `#!/usr/bin/env node`, so `scripts/check-prose` still runs directly on Linux and macOS, and `node scripts/check-prose` runs everywhere. `python3 scripts/<name>` and `bash scripts/<name>` stop working; every invocation fx documents or runs is rewritten to `node`, including callers inside bash files that are migrated later (each task greps for them). A migrated `.sh` file that is a test or runner becomes `<name>.js` beside it (the row contract and arguments unchanged); the old `.sh` is deleted in the same commit. Two interface additions only: `gen-command-skills [output-root]` (decision 8), and `FX_FIXTURE_OUT_DIR`, the fixture-build runner's output directory, defaulting to today's path, so its overwrite refusal can be tested without writing under `docs/plans/`.

**3. check-all is Node only, no shim.** `scripts/check-all` becomes a thin extensionless Node script: an ordered list of rows (name and argument vector), the same `make-git-fixture` step and shape check, and the same output lines. Row names stay exactly as today even where the file a row runs changes (`check-prose-explicit-path.sh` keeps that name while it runs a `.test.js`), so the `== <name> ==` lines do not change. Each `== <name> ==` line is written with `fs.writeSync(1, ...)` before the row's child starts, so it never interleaves with child output. No bash or `.cmd` shim: `node scripts/check-all` works wherever Node does, and a bash shim would bring back the dependency this removes. `.fx.json` `test_all` becomes `node scripts/check-all`. `check-collisions` stays out of `check-all`, for the reason the file states today.

**4. One process helper.** A new `lib/proc` module is the only place fx tooling spawns a process. It always passes an argument array with no shell. Node scripts are started as `process.execPath <script>`, never through their shebang. On Windows a bare command that resolves to a `.cmd` or `.bat` shim on `PATH` (the npm-installed `claude`, `codex`, `opencode`, `npm`) runs through the shell with each argument wrapped in double quotes, and the helper refuses any argument containing `"`, `%`, `^`, `&`, `|`, `<`, `>` or a newline there, so no argument is ever split or interpreted by `cmd.exe`. `scripts/build` is the one script that does not use it (decision 7). A second helper turns a path into the `/`-separated form relative to a root; every path a gate prints goes through it, so findings read the same on every platform.

**5. Equivalence is recorded, then checked forever.** A new tool, `scripts/equiv`, reads a cases file per migrated tool. Each case names the files to copy into a scratch root, files to write and remove there, untracked paths to link in (such as `node_modules`), whether the root becomes a git repository and which setup commands run in it, arguments, environment, and optionally a directory whose tree is compared. Old and new each run in their own fresh scratch root. A recorded case copies its inputs from the cases file's fixed revision (`old.rev`), never from the working tree, so a golden never changes because the repo did; the new root additionally receives the new tool and the built files it requires from the working tree. The old script is written at its real path in its own root, so its root-finding (`dirname "$0"/..`, `Path(__file__).parent.parent`) resolves and its own file name in messages is unchanged. Each case's environment starts empty apart from `PATH` and `LC_ALL=C`, plus what the case sets. Three modes:
- `compare` runs old and new on every case and diffs them; needs the old interpreter.
- `record` runs the old script on every case not marked `live` and writes the results (exit code, stdout, stderr, tree snapshot) to a golden file beside the cases file.
- `check` runs the new script on every case not marked `live` and compares against the golden file; needs only Node. `check-all` runs it over every cases file.

A case marked `live` copies the working tree, so its output drifts with the repo; it is run by `compare` during the migration task and never recorded. Any case that would read current repo or machine content is `live`. Scratch paths, in both their given and their real-path form (macOS `/private/var`), are rewritten to `<ROOT>` before comparing. `LC_ALL=C` makes `sort` and glob order code-point order, which the new code uses; it does not order `find`, which prints directory order, so a tool that prints in `find` order is recorded on cases with one finding file, or its cases file sets `sortLines` and both outputs are line-sorted before comparing. A tree snapshot lists each path with its type, its link target or content hash, and for files its executable bit; a `.git` directory or file is listed by path and type only, never its contents. A golden is re-recorded from the new script only by a ledger Ruling naming the case and the reason (the accepted differences of decision 9 are the planned ones).

**6. Shipped skill scripts.** start-server and stop-server become `start-server.cjs` and `stop-server.cjs` with the same options, the same JSON lines and the same state files. Background mode spawns the server detached with its output to the log file, which also removes the Windows Git Bash reaping workaround; Codex auto-foreground (`CODEX_CI`) stays. review-package keeps its extensionless path, arguments, exit codes (2 usage or bad revision, 3 empty range), output file and summary line; it calls `git` through the process helper. The hitl-loop template becomes `hitl-loop.template.mjs`, reading input with an async line iterator so piped input works: the agent copies it into the user's project, edits its steps and runs it with `node`, so it carries no generated header (that header would send the user to a `src/` they do not have). It goes on sub-project 1's hand-written JavaScript allowlist with that reason. Skill text and COVERAGE rows naming the old files are updated in the same commit.

**7. Build tooling bootstraps from its own committed output.** `scripts/build`, `check-types`, `check-ts-escapes` and `check-handwritten-js` move to TypeScript like everything else. `scripts/build` is itself generated and committed, so it always runs from committed JavaScript; the drift check catches a build script that no longer matches its source. A source under `src/scripts/` or `src/skills/<skill>/scripts/` whose line 1 is `#!/usr/bin/env node` and which is not a test compiles to the extensionless path with mode `100755`. This replaces sub-project 1's explicit list of three files, so no task edits a list.

**8. Generators and check-generated.** gen-codex-agents and gen-command-skills keep their output byte for byte. `gen-command-skills` gains an optional `[output-root]` argument (default the repo root) so it can generate into a scratch directory. `check-generated` regenerates both into a scratch directory and diffs each against what is committed (gen-command-skills is not covered today), alongside sub-project 1's build drift and mode block, and keeps sub-project 1's `--compare <expected-dir> <actual-dir>` mode that the toolchain test uses. ADR 0028 gets an amendment: the generators are TypeScript, and both generated trees are drift-checked.

**9. The opencode installer.** It keeps its path, options (`--dry-run`, `--dest`, `--major 1|2`), default destination, messages, refusals and record file. The `node -e` bootstraps are replaced by direct `require` of `lib/plant-roles`, `lib/agent-dialects`, `lib/opencode-commands` and `lib/opencode-v2-policies`. JSON it writes reproduces Python's `json.dumps(data, indent=2)` plus a newline, including `\uXXXX` escapes for every non-ASCII character, through one small serializer. Accepted differences, each pinned by a case re-recorded from the new script under a ledger Ruling: a float Python writes as `1.0` or `1000.0` (JavaScript writes `1`, `1000`); object keys that look like integers (JavaScript orders them first); integers beyond 2^53 (JavaScript rounds them); the text of a malformed-JSON error. Tests and the smoke job always pass `--dest <scratch>`, `--major` and a scratch `HOME`, so no run touches a real opencode configuration. On Windows a directory link is created as a junction (no privilege needed); a file link that fails with `EPERM` stops the install before its first write with `fx-opencode-install: creating a file symlink needs Windows Developer Mode`.

**10. Text and platform rules.** A new `.gitattributes` sets `* text=auto eol=lf`, so a Windows checkout keeps LF and a shebang never ends in `\r`. Every path is built with `path.join` and compared with `path.relative`; printed paths use `/`. Executable bits are kept in git for POSIX use, but nothing fx documents relies on them: every invocation names `node`. Windows support is deliberately narrow: the opencode installer and the scripts shipped inside skills. `check-all` and the test suites stay Linux and macOS: several existing tests spawn bash on purpose (guard tests feed bash command lines), and the esbuild shim and executable bits are POSIX. `check-interpreters` gains a rule: an invocation that names an interpreter must name the one in the script's shebang, so a leftover `bash scripts/review-package` fails the gate.

**11. Conformance, live rows and the jail.** The runner keeps the row contract: `node <row> --describe` prints `<number>|<name>|<free|live>`, and a run exits 0 pass, 77 gap, anything else fail. During the migration the runner starts a `.sh` row with `bash` and a `.js` row with `node`; the `.sh` branch is deleted when the last row moves. The live library and the jail become modules the rows import. The jail builds the same bwrap argument vector as `jail.sh` for the same environment; live rows still need bwrap, so they stay Linux-only and report a gap elsewhere, as today when bwrap is missing. Because live rows cannot be compared byte for byte without model calls, each ported live row and its `.sh` original are both run against the same stub CLI stream (the stub technique the live-exit-code test already uses) and must give the same exit code and stderr; the owner's live run is listed as unverified. Sub-project 2's rows 21 to 23 are ported with the rest.

**12. Lane-triggering fixtures are data.** Each fixture script only writes files. Each becomes a directory under the lane-triggering fixtures directory, copied verbatim into the run's scratch project; the copy is proven byte-identical to what the script wrote.

**13. The migration stays complete.** A new gate, `check-node-only`, fails on any tracked file ending `.sh`, `.bash` or `.py`, or whose line 1 names `bash`, `sh` or `python`, outside an allowlist: `tests/conformance/lib/with-key.sh` and `docs/plans/**`. A new ADR records that fx tooling needs only Node and git, the with-key exception, the Windows support level and the equivalence records. sub-project 1's ADR 0046 gets a line: sub-project 4 done.

**14. What still needs a shell afterwards.** Nothing fx runs to develop, test or install, on any platform. Inside the Linux bwrap jail, `with-key.sh` runs under `/bin/sh` (decision 1). The live rows and the jail probe need bwrap, which is Linux-only. Harnesses themselves still run shell commands the model writes; that is not fx tooling.

**15. Order and coexistence with sub-projects 2 and 3.** The order is 1, 2, 3, 4: this sub-project starts only after sub-projects 1, 2 and 3 are complete. Sub-project 2 adds live rows 21 to 23 as bash files sourcing `live.sh`, both add rows to the bash `check-all`, and sub-project 3 edits the bash `check-ts-escapes`. Every one of those is ported here: rows 21 to 23 by task 14, `check-all` rows by task 02, the `check-ts-escapes` change by task 08, which records its golden after sub-project 3 landed. No other file those sub-projects created is edited.

## Testing Decisions

- **Confirmed seam:** the existing one. `scripts/check-all` green before and after each step, which runs every gate, every test, the install runs and the free conformance rows on Claude Code, Codex, opencode 1.x and 2.x.
- **Added at that seam:** `equiv check` over every cases file (one row in `check-all`), `check-node-only`, and the shipped-scripts smoke test, which also runs on the nightly Windows job.
- **Live rows:** old and new run against the same stub CLI stream, same exit code and stderr (decision 11).
- **Equivalence per migrated tool:** a cases file with at least one passing case and one case per distinct finding or refusal the old script can print, recorded from the old script, then checked against the new one. Each migration task also runs `equiv compare` with a `live` case over the whole repo and records the result in the ledger.
- **Trees:** generators and the installer compare output trees (paths, link targets, content hashes, executable bits). The lane-triggering fixtures compare the tree each old script wrote with the new directory.
- **Jail:** the argument vector `jail.sh` builds and the one the new module builds, printed one per line for the same environment, are identical; the existing jail probe test still passes.
- **Good test here:** observable behaviour only: what a gate prints and returns, what an installer writes, what a runner reports. Never the shape of the new code.
- **Prior art:** `check-generated` already diffs a fresh generation against the committed tree; `tests/install/run.sh` already snapshots an installed tree with link targets and checksums; sub-project 1's hook-output golden gate records outputs once and checks them in `check-all`.
- **Not verified by this plan:** live rows cost model calls and are run by the owner; the Windows job runs only after the owner pushes the branch.

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

## Out of Scope

- Features, gate rule changes and output wording changes, other than the shebang-interpreter rule in `check-interpreters`, the two new gates, the accepted JSON differences of decision 9 and the two interface additions of decision 2.
- Running `check-all` or the test suites on Windows.
- Running the live conformance, lane-triggering, review-bench or fixture-build runs end to end with model calls: the owner runs them.
- Making live rows or the jail work off Linux.
- A Windows installer for Claude Code or Codex: their own plugin loaders install fx.
- Rewriting frozen plan evidence under `docs/plans/`.
- Version bump, release and merge.

## Open Questions

None.

## Further Notes

- Sub-project order: 1 TypeScript migration, 2 judge client and hooks, 3 browser agent, 4 this. This one starts after 1, 2 and 3 are complete.
- Line counts at inventory: Python 1,557 (installer 626), bash about 6,900 across 75 files, of which the conformance tree is about 3,900.
- The Windows support level after this: the opencode installer and the four shipped skill scripts; the nightly smoke job is the measurement. `check-all` is Linux and macOS.
