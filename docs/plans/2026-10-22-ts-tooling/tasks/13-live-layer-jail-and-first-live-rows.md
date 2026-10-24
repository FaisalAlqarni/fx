# 13: Live layer, jail and live rows 01 to 09 on Node

**Status:** ready-for-agent
**Blocked by:** 12
**Phase:** Hardening

**What to build:** the shared live-row library and the bwrap jail become TypeScript modules that rows import, with the same jail boundary (the same bwrap argument vector for the same environment), the same credential handling through `with-key.sh`, the same Codex role planting, opencode provider merge and OpenRouter behaviour. Live rows 01 to 09 become TypeScript rows. The stub-driven tests that prove the live layer without model calls move to TypeScript. `live.sh` and `jail.sh` stay until task 16, when their last bash users are gone.

**Design:** Implementation Decisions > 1; Implementation Decisions > 11; Implementation Decisions > 14; Testing Decisions

**Files:**
- Create: `src/tests/conformance/lib/live.ts`, `src/tests/conformance/lib/jail.ts`, `src/tests/conformance/lib/plant-codex-roles.ts` (built to `.js`)
- Create: `src/tests/conformance/rows/01-preamble-in-session.ts` through `src/tests/conformance/rows/09-every-skill-discovered.ts` (nine rows, same file names with `.ts`)
- Delete: `tests/conformance/rows/01-preamble-in-session.sh` through `tests/conformance/rows/09-every-skill-discovered.sh`, `tests/conformance/lib/plant-codex-roles.sh` (its only users are `live.sh`, which task 16 deletes, and its test; `live.sh` calls the new module through `node` from this task on)
- Create: `src/tests/conformance/jail-probe.test.ts`, `src/tests/conformance/live-exit-code.test.ts`, `src/tests/conformance/live-openrouter.test.ts`, `src/tests/conformance/plant-codex-roles.test.ts`, `src/tests/conformance/merge-opencode-provider.test.ts`, `src/tests/conformance/jail-argv.test.ts` (built to `.test.js` beside them)
- Delete: `tests/conformance/jail-probe.test.sh`, `tests/conformance/live-exit-code.test.sh`, `tests/conformance/live-openrouter.test.sh`, `tests/conformance/plant-codex-roles.test.sh`, `tests/conformance/merge-opencode-provider.test.sh`
- Modify: `tests/conformance/lib/live.sh` (its call to `lib/plant-codex-roles.sh` becomes `node "$FX/tests/conformance/lib/plant-codex-roles.js"`; nothing else)
- Modify: `src/scripts/check-all.ts` (the five conformance test rows keep their names and run the new `.test.js` files; add row `conformance-jail-argv`)
- Create: `src/tests/conformance/stub-rows.test.ts` (built to `tests/conformance/stub-rows.test.js`; a ledger tool for this task and task 14, not a `check-all` row: it needs the old `.sh` rows from `old.rev`)
- Keep: `tests/conformance/lib/with-key.sh` (design decision 1)

**Interfaces:**
- Produces: `jailArgv(env: { FX: string; FX_REAL_HOME: string; LIVE_SCRATCH: string }) -> string[] | { gap: string } | { fail: string }` in `lib/jail`: the bwrap argument vector `jail.sh` builds into `JAIL` for the same environment and filesystem, or the gap (`not run: bwrap is not installed, and live rows never run a CLI unconfined`) or failure (`FAIL`-path messages verbatim) it would report.
- Produces: `jailHide(argv: readonly string[], fx: string, paths: readonly string[]) -> string[]` and `jailProviderEnv(argv: readonly string[], names: readonly string[], env: Readonly<Record<string, string | undefined>>) -> string[]` in `lib/jail`: the effect of `jail_hide` and `jail_provider_env` (drop the trailing `--`, append `--tmpfs` or `--ro-bind /dev/null` per existing path, or `--setenv <name> <value>` per set variable, then `--` again), returning a new vector instead of mutating a global `JAIL`.
- Produces: `lib/live` exports, in camelCase, every function a row calls from `live.sh` (`gap(reason): never` writes `<HARNESS>: <reason>` to stderr and exits 77; `fail(reason): never` does the same and exits 1; `liveRegular(path) -> boolean` is true for a regular file that is not a link; `liveRun(...)` returns the CLI's exit code and stream path as `live_run` does; and the rest as found in `live.sh`), plus the `--describe` handling a row needs. Each row module calls `describe(number, name, 'live')` first, which prints and exits when `--describe` is the argument.
- Produces: `plantCodexRoles(): void` in `lib/plant-codex-roles` (refuses with `plant-codex-roles: CODEX_HOME is not set; refusing`, `plant-codex-roles: FX is not set`, `plant-codex-roles: no roles under <dir>/agents`, as the bash helper does); its file is also runnable with `node` for `live.sh`'s call.
- Consumes: `run`, `runNode` (task 01); `lib/opencode-v2`, `lib/scratch-home` (task 12); `lib/openrouter`, `lib/events`, `lib/merge-opencode-provider` (sub-project 1).

**Seam:** stub-driven live tests and the jail probe in `check-all`; the argument-vector comparison; `--describe` of every row.

**Tests:**
- `jail-argv.test`: for the current machine's environment and a scratch `FX_REAL_HOME` and `LIVE_SCRATCH`, the lines printed by `bash -c 'gap(){ echo "GAP $*"; exit 77; }; fail(){ echo "FAIL $*"; exit 1; }; source tests/conformance/lib/jail.sh; printf "%s\n" "${JAIL[@]}"'` equal `jailArgv(...)` joined by newlines; skipped with `jail-argv: bwrap not installed, not run` and exit 0 when bwrap is absent, as the probe test does. This test is deleted in task 16 together with `jail.sh`, after its last green run is saved to the ledger.
- `jail-probe.test`: prints exactly the `ok   <label>` lines `bash tests/conformance/jail-probe.test.sh` prints at `old.rev` on this machine, same labels, same order (both outputs saved to the ledger and diffed; labels include `a mount overlapping the home is hidden: <t>`, `a standalone CLI binary does not bind a slice of the real home`, `a script CLI binds its own package directory`, `a package directory that is the real home is refused`, `an inherited FX_LIVE_PROVIDER and FX_JAIL_PROVIDER_ENV pass nothing`, `jail_provider_env passes the named variable and never the key`); on a failure it prints `FAIL <label>` as the bash test does.
- Stub-CLI comparison (design decision 11): for rows 01 to 09 on each harness, the `.sh` row from `old.rev` and the new `.js` row, each run through the runner with `PATH` led by a stub CLI directory whose `claude`, `codex` and `opencode` replay one fixed recorded stream (the stub technique `live-exit-code.test` uses), give the same exit code and the same stderr after `<ROOT>` replacement; `stub-rows.test` prints `stub-rows: <n> rows identical`, and its output goes to the ledger.
- `live-exit-code.test`: a stub `claude` exiting 3 makes the probe row FAIL; a stub ending with Claude Code's `error_max_turns` result and exiting 1 makes it a GAP whose reason names the cause.
- `live-openrouter.test`: every check of the bash test (stub runs without a credential copy; provider error counted only from stderr and error events; a key in a log fails the row before any copy; the result line names the session's model and a different model fails; the runner re-runs a 75 once on the fallback and a second 75 is a GAP).
- `plant-codex-roles.test`: with a scratch `CODEX_HOME`, roles land under `<CODEX_HOME>/agents`; with `CODEX_HOME` unset, exit 1 and the refusal line; `live.sh` and `lib/live` call it before the first Codex session.
- `merge-opencode-provider.test`: the seeded config keeps the plugin-route entry and `subagent_depth` after the merge.
- Rows 01 to 09, each harness: `node <row>.js --describe` equals `bash <row>.sh --describe` at `old.rev`.
- Free runs on all four harnesses still pass (rows 01 to 09 are live, so they are skipped in free mode; the runner reports them the same way it did).

**Risks:** a row that `source`s `live.sh` inherits shell state (`set -u`, traps, exported variables); the module form must make each of those explicit. The jail argument vector depends on mounts and `stat` device numbers; `jailArgv` reads them the same way (`fs.statSync(...).dev` split into major and minor matches `stat -c '%Hd:%Ld'` only after converting; the argv test proves it).

**Idempotency:** writes only scratch directories, removed on exit.

**Testing:** stub-driven tests; argv comparison; `--describe` comparison; free runs; `check-all`. Live runs with model calls are the owner's (Testing Decisions).

## Acceptance criteria
- [ ] `jail-argv.test` prints identical vectors on this machine (bwrap installed); result saved to the ledger.
- [ ] The five migrated conformance tests pass with the same checks as their bash versions.
- [ ] Rows 01 to 09 `--describe` identical and stub-CLI runs identical (ledger); the `.sh` files deleted.
- [ ] `git grep -nE "conformance/lib/plant-codex-roles\.sh|conformance/rows/0[1-9]-[a-z-]+\.sh|(jail-probe|live-exit-code|live-openrouter|plant-codex-roles|merge-opencode-provider)\.test\.sh"` outside `docs/plans/` prints nothing.
- [ ] `node scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Record `old.rev`; save each row's `--describe` and the bash jail vector to the ledger**
- [ ] **3. Write `jail-argv.test` and the five migrated tests: verify RED**

Run: `scripts/build && node tests/conformance/jail-argv.test.js; node tests/conformance/jail-probe.test.js`

- [ ] **4. Port `jail`, `live` and `plant-codex-roles`**
- [ ] **5. Verify GREEN** for the six tests
- [ ] **6. Port rows 01 to 09; compare `--describe`**
- [ ] **7. Run the scope**

Run: `node scripts/check-all` (tracked background command)

- [ ] **8. Commit by path**

```
git rm tests/conformance/rows/01-preamble-in-session.sh tests/conformance/rows/02-preamble-in-subagent.sh tests/conformance/rows/03-no-placeholder-survives.sh tests/conformance/rows/04-naive-prompt-invokes-lane.sh tests/conformance/rows/05-explicit-invocation.sh tests/conformance/rows/06-guard-in-session.sh tests/conformance/rows/07-guard-in-subagent.sh tests/conformance/rows/08-guard-survives-evasion.sh tests/conformance/rows/09-every-skill-discovered.sh tests/conformance/lib/plant-codex-roles.sh tests/conformance/jail-probe.test.sh tests/conformance/live-exit-code.test.sh tests/conformance/live-openrouter.test.sh tests/conformance/plant-codex-roles.test.sh tests/conformance/merge-opencode-provider.test.sh
git add src/tests/conformance/lib/live.ts src/tests/conformance/lib/jail.ts src/tests/conformance/lib/plant-codex-roles.ts tests/conformance/lib/live.js tests/conformance/lib/jail.js tests/conformance/lib/plant-codex-roles.js src/tests/conformance/rows tests/conformance/rows src/tests/conformance/jail-probe.test.ts src/tests/conformance/live-exit-code.test.ts src/tests/conformance/live-openrouter.test.ts src/tests/conformance/plant-codex-roles.test.ts src/tests/conformance/merge-opencode-provider.test.ts src/tests/conformance/jail-argv.test.ts tests/conformance/jail-probe.test.js tests/conformance/live-exit-code.test.js tests/conformance/live-openrouter.test.js tests/conformance/plant-codex-roles.test.js tests/conformance/merge-opencode-provider.test.js tests/conformance/jail-argv.test.js src/tests/conformance/stub-rows.test.ts tests/conformance/stub-rows.test.js tests/conformance/lib/live.sh src/scripts/check-all.ts scripts/check-all
git commit -m "test: live layer, jail and live rows 01 to 09 on Node"
```
