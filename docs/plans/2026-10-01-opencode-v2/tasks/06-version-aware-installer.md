# 06: Version-aware installer

**Status:** ready-for-agent
**Blocked by:** 04, 05
**Phase:** Harness

**What to build:** `scripts/fx-opencode-install` installs the fx that matches the OpenCode major it finds. On 1.x it does exactly what it does today. On 2.x it links the v2 plugin, writes v2-format agents, writes `experimental.subagent_depth` and the guard policies, and replaces its own earlier link to the other major's plugin. It never writes a `permissions` key into `opencode.json`, because OpenCode 1.x refuses to start with one and both majors share the file. `--major 1|2` overrides detection, and every existing v1 caller passes `--major 1`, so a machine with 2.x installed never tests v2 while claiming v1.

**Files:**
- Modify: `scripts/fx-opencode-install`
- Modify: `tests/install/run.sh`
- Modify: `scripts/check-all`
- Modify, the v1 callers, each gaining `--major 1` on every installer call:
  - `tests/install/run.sh` (`install_into`, `attempt`, and every direct `python3 "$FX/scripts/fx-opencode-install"` line in the `opencode` branch, about ten)
  - `tests/gates/opencode-plugin.test.js` (the `execFileSync` call near line 182)
  - `tests/conformance/rows/09-every-skill-discovered.sh` (line 61)
  - `tests/conformance/rows/14-audit-lane-user-invocable.sh` (line 30)
  - `tests/conformance/lib/live.sh` (line 139, the `opencode` installer route)

**Interfaces:**
- Consumes: `toOpencodeV2Agent` (task 03), `opencodeCommands` (unchanged), `GUARD_POLICIES` (task 05), `FX_PLUGIN_SOURCES` (task 02), task 04's report (whether the plugin registers commands), `probe-findings.md` questions 5, 7, 8, 9.
- Produces: `scripts/fx-opencode-install [--dest DIR] [--dry-run] [--major 1|2]`.
  - Detection: `opencode --version`, first integer; a missing binary, a non-zero exit or no integer, with no `--major`, is an error naming `--major`.
  - On 2.x, in `--dest`: `plugins/fx.js` links to `plugins/fx-opencode-v2.js`; `agents/<name>.md` in v2 frontmatter (`description`, `mode: subagent`, `permissions` rule list, body as system prompt) with today's generated header line byte-identical, followed by a separate line `<!-- opencode major: 2 -->`; `commands/<name>.md` only if task 04 reports the plugin cannot register commands; `skills/<name>` links as today (`load_skills` never links the five user-invoked lanes, so nothing needs hiding on this route); `opencode.json` gains `experimental.subagent_depth >= 2` and `experimental.policies` containing every `GUARD_POLICIES` entry without `sample` and `allowed`.
  - On either major: no top-level `permissions` key and no `permissions` on any agent entry of `opencode.json` is ever written.
  - On 1.x: today's output, plus removal of fx's own `experimental.policies` entries (an entry equal to a `GUARD_POLICIES` entry without its samples); `experimental.policies` is dropped only when that leaves it empty.
  - `FX_PLUGIN_SOURCES` gains `FX / "plugins" / "fx-opencode-v2.js"`: a `plugins/fx.js` link to any of the three names is fx's own.
- Produces, in `tests/conformance/lib/live.sh`: before the install step for `opencode` and `opencode-v2`, `opencode --version`'s first integer must equal the harness's major (`opencode` 1, `opencode-v2` 2), or the row fails with both versions named.

**Seam:** `tests/install/run.sh opencode-v2`, which runs the installer into a scratch `--dest` and inspects the result; the real 1.18.25 binary's `opencode debug config` for the shared-config check.

**Risks:** OpenCode 1.18.25 throws `InvalidError` "V2 permissions are not supported by OpenCode V1" on a top-level `permissions` key or `permissions` on an agent (`oc1/packages/opencode/src/config/v2-compat.ts:95-113`), so one such write breaks v1 for the user until they edit the file by hand. The installer owns only what it wrote: merge into the user's `opencode.json` without removing their entries; add a policy only if an equal entry is absent; keep the user's own higher `subagent_depth`. The existing refusal markers (`refuse_if_foreign_generated`, `points_into_fx`) apply to v2 files the same way, which holds only because the header line stays byte-identical. Switching majors replaces fx's generated files and link, never a foreign one. A top-level `subagent_depth` is written only for 1.x (2.x drops it). If 1.18.25 rejects `experimental.subagent_depth` in the step 7 check, stop and report it as a ruling for the controller. On 1.x nothing in the output changes except the policy removal: diff the v1 output before and after. Generated agents embed the destination path, so every idempotency check re-runs into the same destination.

**Idempotency:** a second run with the same major into the same destination changes nothing (diff against a snapshot taken before it); refusals fire before the first write, including under `--dry-run`.

**Testing:** the install test's new branch; the v1 branch unchanged and green; the 1.18.25 config check.

## Acceptance criteria
- [ ] `--major 2` produces the files and keys in **Produces**; a second run into the same destination leaves the tree identical to the snapshot.
- [ ] `opencode.json` after any run, on either major, has no top-level `permissions` key and no agent entry with `permissions`.
- [ ] A user's own policy and higher `experimental.subagent_depth` survive both majors.
- [ ] `--major 2` after `--major 1` leaves `plugins/fx.js` pointing at the v2 file and no v1-format agent files; `--major 1` after `--major 2` restores the v1 output exactly, fx's policies removed and the user's kept.
- [ ] After `--major 2` then `--major 1` into a scratch config, OpenCode 1.18.25's `opencode debug config` exits 0 and prints no `InvalidError`.
- [ ] With a failing `opencode` stub first on `PATH` and no `--major`, the installer exits non-zero naming `--major`; with stubs printing `1.18.25` and `2.0.18` it picks 1 and 2.
- [ ] Every v1 caller in **Files** passes `--major 1`: `git grep -n 'fx-opencode-install' -- tests` shows no call without `--major`.
- [ ] `bash tests/install/run.sh opencode` output is unchanged from before this task.

## Steps

- [ ] **1. Record v1's output** for the regression check, before changing anything: `V1="$(mktemp -d)/v1"; python3 scripts/fx-opencode-install --dest "$V1"` (no `--major`: the unmodified installer has no such flag), and keep the tree.
- [ ] **2. RED:** in `tests/install/run.sh`, accept `opencode-v2` beside the existing harnesses and add an `opencode-v2` branch that, in a scratch `--dest` `$D` seeded with a user `opencode.json` (`{"experimental":{"subagent_depth":3,"policies":[{"action":"permission","resource":"shell:rm -rf /*","effect":"deny"}]}}`):
  1. runs `python3 scripts/fx-opencode-install --dest "$D" --major 2`;
  2. asserts `readlink "$D/plugins/fx.js"` ends in `plugins/fx-opencode-v2.js`;
  3. asserts each of the six `agents/*.md` has `mode: subagent`, a `permissions:` block whose first rule denies `*`, the generated header line byte-identical to `GENERATED` in the installer, and the line `<!-- opencode major: 2 -->`;
  4. asserts `commands/` holds no generated file when task 04 reports that the plugin registers commands, else asserts `commands/fx-audit.md` exists with a `description:` line;
  5. with `node -e`, asserts `opencode.json` has no top-level `permissions` and no agent entry with `permissions`, keeps the user's policy, keeps `experimental.subagent_depth` at 3, and holds every `GUARD_POLICIES` resource under `experimental.policies` without `sample` or `allowed`;
  6. snapshots `cp -a "$D" "$D.first"`, runs the installer again into `$D`, and asserts `diff -r "$D.first" "$D"` is empty;
  7. in a second destination `$E` seeded the same way: runs `--major 1`, snapshots `cp -a "$E" "$E.v1"`, runs `--major 2`, then `--major 1` again, and asserts `diff -r "$E.v1" "$E"` is empty (fx's policies gone, the user's kept); then runs `--major 2` into `$D` after a `--major 1` there and asserts `diff -r "$D.first" "$D"` is empty;
  8. puts a stub `opencode` that prints nothing and exits 1 first on `PATH` (a scratch `bin/` prepended, so `node` and `python3` stay reachable), runs with no `--major`, and asserts a non-zero exit and `--major` in stderr; then stubs printing `opencode 1.18.25` and `2.0.18` and asserts the link each run leaves.

  Run `bash tests/install/run.sh opencode-v2`: FAIL.
- [ ] **3. Implement** with `fx-tdd`: version detection and `--major`, the v2 branch, the switch-majors cleanup, the policy removal on `--major 1`, `FX_PLUGIN_SOURCES` gaining the v2 file, reusing the existing refusal helpers and the `node -e` bridge for the converters.
- [ ] **4. v1 callers:** add `--major 1` to every call listed in **Files**; add the `opencode --version` major check to `live.sh`. Run `git grep -n 'fx-opencode-install' -- tests` and read each hit.
- [ ] **5. GREEN:** `bash tests/install/run.sh opencode-v2 && bash tests/install/run.sh opencode && node tests/gates/opencode-plugin.test.js`, `bash -n` on the two rows and `live.sh`, and `diff -r` of step 1's v1 tree against a fresh `--major 1` run into the same path (`rm -rf "$V1"` first) is empty.
- [ ] **6. Build the 1.18.25 binary** as task 10 describes (`npm install --prefix` into a scratch directory, copy the `opencode-linux-*` binary into its own directory) and confirm `--version`.
- [ ] **7. Shared-config check:** scratch `HOME` and `XDG_CONFIG_HOME="$H/cfg"`; run the installer with `--dest "$H/cfg/opencode" --major 2`, then `--major 1`; then, with 1.18.25 first on `PATH`, run `opencode debug config` (timeout 200). Expected: exit 0 and no `InvalidError` in its output. Record the exit code and the first lines in the report.
- [ ] **8. check-all:** add `run install-opencode-v2 bash tests/install/run.sh opencode-v2` after the `install-opencode` line.
- [ ] **9. Commit**

```
git add scripts/fx-opencode-install tests/install/run.sh scripts/check-all tests/gates/opencode-plugin.test.js tests/conformance/rows/09-every-skill-discovered.sh tests/conformance/rows/14-audit-lane-user-invocable.sh tests/conformance/lib/live.sh
git commit -m "feat(opencode-v2): version-aware installer"
```
