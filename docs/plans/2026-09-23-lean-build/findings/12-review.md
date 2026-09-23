### Spec Compliance (✅ | ❌ with file:line; ⚠️ cannot verify)

- ✅ `scripts/test-scope` created, executable (mode 100755), bash/Node dispatcher, `--dry-run` prints one command per line and exits 0 (scripts/test-scope:116-128).
- ✅ `scripts/test-scope.test.js` created with the exact content the task's step 1 specifies (matches task file lines 64-85 verbatim).
- ✅ `.fx.json` changed only at `test_scope`, now `"scripts/test-scope {paths}"`; `test_all` unchanged at `"scripts/check-all"`; `isolated_test_execution` not added.
- ✅ `scripts/check-all` gained one line, `run test-scope.test.js node scripts/test-scope.test.js`, placed beside `plan-state.test.js` as the report states.
- ✅ A failing command stops the run with that command's exit code (scripts/test-scope:130-133, `spawnSync` then `process.exit(result.status ?? 1)` on first nonzero).
- ✅ A path that does not exist is skipped (scripts/test-scope:87, `commandsFor` returns `[]` when `fs.existsSync` is false).
- ✅ Concurrency check (step 6) run and recorded: report says "concurrent check-all: pass", both backgrounded runs exited 0.
- ✅ Rule order for `.test.js`, `.js`+sibling, `.test.sh`, skills/agents/commands/md, hooks/plugins/preamble/plan-state, matches the task's given test exactly (verified by running the logic by hand against `lib/plan-state.js`, `lib/plan-state.test.js`, `skills/fx-plan/SKILL.md`, `hooks/fx-context.js`, `no/such/file.js`).
- ❌ scripts/test-scope:78-104 (`commandsFor` default `return [];`): the task's own rule table has a seventh bullet, "When unsure which class a path is in, run `scripts/check-all`," listed among the other path-class rules under "Produces:". No such fallback exists in the code; any path matching none of the six explicit rules silently gets an empty command list (only the unconditional `release-version.test.js` runs). Acceptance criterion 1 ("`--dry-run` output for each path class matches the rules above") is not met for the unenumerated classes; see the coverage table below for which real repo paths this leaves unguarded.
- ❌ scripts/test-scope:100-103 (`.claude-plugin/` or manifest rule): for `.codex-plugin/plugin.json` and any `marketplace.json`, the rule fires and picks `scripts/check-manifest`, but `scripts/check-manifest`'s own docstring says it validates only `.claude-plugin/plugin.json` (confirmed: `grep -n "marketplace" scripts/check-manifest` is empty). The one gate that actually reads `.codex-plugin/plugin.json` and both manifests together is `tests/gates/codex-manifest.test.js` (confirmed the only hit for `marketplace.json` outside test-scope's own files), which this rule never runs and no other rule reaches for these paths.

### Coverage audit by path class (what test-scope runs, and the check-all gate it could miss)

| Path class | test-scope runs | Gap |
|---|---|---|
| `lib/*.js` with sibling `.test.js` (e.g. `lib/plan-state.js`) | the sibling test + release-version | none found |
| `lib/*.js` with no sibling test (`lib/agent-dialects.js`, `lib/lane-check.js`, `lib/opencode-commands.js`) | release-version only | these three are required by `plugins/fx.js`, `hooks/fx-pretooluse.js`, `hooks/fx-codex.js`, and `lib/lane-check.js`/`lib/opencode-commands.js` are read by `tests/gates/opencode-plugin.test.js`; a break there is invisible to test-scope |
| `hooks/*.js` | preamble.test.js, codex-hook-output.test.js, opencode-plugin.test.js, release-version | none found (matches the task's named exception list) |
| `plugins/fx.js` | same three plus release-version (no sibling test exists, so rule 5 fires as intended) | none found |
| `skills/`, `agents/`, `commands/`, any `.md` | check-prose, check-paths, check-generated, check-manifest, every `tests/gates/*.test.js`, release-version | none found |
| `references/*.md` | covered by the `.md` rule above | none found |
| `references/vocab/*.ts`, `references/vendor/*.js` (non-`.md`) | release-version only | `scripts/check-reference-leaves` scans `references/*.md` for links to these files by name; a rename here breaks that gate unnoticed by test-scope |
| `tests/conformance/lib/*.sh` (`live.sh`, `jail.sh`, `scratch-home.sh`, `plant-codex-roles.sh`), `tests/conformance/rows/*.sh`, `tests/conformance/run.sh` | release-version only (none end `.test.sh`) | check-all runs 10+ conformance/install suites that source these helpers (`conformance-events`, `conformance-runner-isolation`, `jail-probe`, `live-exit-code`, `plant-codex-roles`, `merge-opencode-provider`, the three `conformance-free-*` rows, `install-*`); none of that is reachable from test-scope for these paths. `tests/conformance/lib/live.sh` is this repo's own top flagged "change entropy" file |
| `tests/lane-triggering/verdict.js`, `run-all.sh`, `run-test.sh`, `run-reps.sh`, `fixtures/*.sh`, `prompts/*.txt` | release-version only | `verdict.test.js` (run inside check-all) and `lane-triggering-jail-isolation` exercise these; test-scope has no rule for the directory at all |
| `tests/fixture-build/*` (`run.sh`, `repo/**`, `hidden/traps.self-test.js`) | release-version only, except `hidden/traps.test.js` and `hidden/implementer-heads.test.js` which end `.test.js` and are caught by rule 1 | `traps.self-test.js` does **not** end in `.test.js` (`"traps.self-test.js".endsWith(".test.js")` is `false`), so it is invisible to test-scope even though check-all runs it by name and the task's own pre-flight table calls task 03/03b's fixture-build files self-consistent; a change to `run.sh` or the seed `repo/` breaks `traps.self-test.js`/`implementer-heads.test.js` with no rule pointing there |
| `tests/review-bench/*` (`run.sh`, `build-case.js`, `score.js`, `fill-template.js`, `cases/**`) | release-version only, except `build-case.test.js`/`score.test.js` under rule 1 | check-all runs `review-bench-score.test.js` and `review-bench-build-case.test.js`; a change to `score.js`, `build-case.js`, or a `cases/*/task` fixture is not routed to either |
| `scripts/*` other than `test-scope` itself (`check-manifest`, `check-prose`, `check-paths`, `make-git-fixture`, etc.) | release-version only | check-all runs each of these directly (`check-manifest`, `check-paths`, `check-prose`, etc.); editing one is invisible to test-scope |
| `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` | `scripts/check-manifest`, release-version | `scripts/check-manifest` only reads `.claude-plugin/plugin.json` per its own docstring; a `marketplace.json` edit runs a command that never opens the file it changed. `tests/gates/codex-manifest.test.js` (the gate that cross-checks both manifests) is not run |
| `.codex-plugin/plugin.json` | `scripts/check-manifest` (basename match), release-version | same defect, sharper: `scripts/check-manifest` never reads `.codex-plugin/plugin.json` at all; `tests/gates/codex-manifest.test.js` is the only gate that does, and it is skipped |
| `.agents/plugins/marketplace.json` | `scripts/check-manifest` (basename match), release-version | same defect as above |
| `.fx.json` | release-version only | no rule names it; nothing in check-all appears to validate `.fx.json`'s shape directly today, so this one looks like a non-issue, but it is worth the same "unsure -> check-all" fallback the task specifies |
| `docs/**` | release-version only | matches only if a `docs/*.md` path also happens to live under `skills/`/`agents/`/`commands/` (it does not); a plan/task doc change is otherwise unrouted, which is probably intended (docs are not code), but the task's own escape hatch would have covered it explicitly instead of by omission |

All of the "release-version only" rows above resolve to the same code defect: the missing "when unsure, run `scripts/check-all`" fallback (see Spec Compliance ❌ above). The `.codex-plugin/`/`marketplace.json` row is a second, independent defect: the rule fires but names the wrong command.

### Strengths

- The dry-run test matches the task's mandated RED/GREEN test exactly, unmodified, and the report shows real RED (`ENOENT`) then GREEN output, so this is genuine TDD, not a retrofit.
- `dedupeKeepLast` correctly keeps the final occurrence of a repeated command so the unconditional `release-version.test.js` line lands once, at the true end, even when the skills/agents/md rule's gate sweep also lists it in the middle. Verified this by hand against the `skills/fx-plan/SKILL.md` case.
- The implementer noticed and documented, unprompted, that the task's own rule 5 text names `lib/plan-state.js` but the task's own test expects the sibling-test rule (rule 2) to win for that path, and implemented an ordered if/else-if chain so this is resolved correctly and explained in the report rather than silently guessed.
- `.fx.json` diff is exactly the one line specified; nothing else touched; `isolated_test_execution` correctly withheld for task 13.
- Concurrency proof step run for real, in the foreground, both runs green, and the result line format matches what the task and Ruling in the pre-flight table expect for task 13 to read.
- Commit stages exactly the four named paths, no `git add -A`.
- No em dashes, en dashes, or attribution trailers found in the diff or the report.

### Issues (Critical / Important / Minor)

**Critical**

1. The "when unsure which class a path is in, run `scripts/check-all`" fallback from the task's Interfaces section is not implemented. `commandsFor` returns `[]` for any path outside the six explicit rules, so `test-scope` silently gives no scoped coverage beyond `release-version.test.js` for a large set of real, frequently touched paths in this repo: `lib/*.js` files with no sibling test (`lib/agent-dialects.js`, `lib/lane-check.js`, `lib/opencode-commands.js`), every non-`.test.sh` file under `tests/conformance/` (including `tests/conformance/lib/live.sh`, this repo's own top-flagged change-entropy file), every non-`.test.js`/`.test.sh` file under `tests/lane-triggering/`, `tests/fixture-build/`, and `tests/review-bench/`, every `scripts/*` file besides `test-scope` itself, and `.fx.json`. A task that touches any of these and trusts `test_scope` instead of `test_all` can ship a break in a check-all gate (an install suite, a conformance row, `verdict.test.js`, `review-bench-score.test.js`, `check-reference-leaves`, `check-manifest` itself, etc.) with test-scope reporting a clean run. This is exactly the "a missed gate is the failure that matters" risk the task exists to avoid.
2. `scripts/test-scope:100-103` routes both `.codex-plugin/plugin.json` and any `marketplace.json` to `scripts/check-manifest`, but `scripts/check-manifest` validates only `.claude-plugin/plugin.json` by its own docstring. The gate that actually reads `.codex-plugin/plugin.json` and cross-checks it against `.claude-plugin/plugin.json` is `tests/gates/codex-manifest.test.js`, which no rule routes to for these paths. A change to the Codex manifest or either marketplace file runs a command that never opens the changed file, while the gate that would catch a real defect (as `codex-manifest.test.js`'s own comments show it exists specifically to catch codex/claude manifest drift) is skipped.

**Important**

None beyond the Critical items above; the rest of the implementation matches its stated rules faithfully.

**Minor**

1. The task's acceptance line "the concurrency check ... its result is in the task report" is satisfied by prose ("concurrent check-all: pass") rather than a machine-checkable artifact; fine for this task, but task 13 should confirm it can parse this line reliably before depending on it.
2. `spawnSync(cmd, { shell: true, ... })` builds each command from a string via a shell; every command in the fixed rule table is a literal known string, so this is not a live injection risk today, but it is worth a one-line comment if a future rule ever interpolates a path into the command string itself (none currently does; `{paths}` substitution happens in `.fx.json`, outside this file).

### Assessment (Approved | Needs fixes)

Needs fixes. Two Critical gaps mean `test_scope` can report clean while a real check-all gate would have failed, for path classes that exist and are actively edited in this repository today: the missing "unsure, run check-all" fallback, and the `.codex-plugin/plugin.json`/`marketplace.json` misroute to a manifest checker that does not read those files.
