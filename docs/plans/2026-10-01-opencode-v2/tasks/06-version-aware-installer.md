# 06: Version-aware installer

**Status:** ready-for-agent
**Blocked by:** 04, 05
**Phase:** Harness

**What to build:** `scripts/fx-opencode-install` installs the fx that matches the OpenCode major it finds. On 1.x it does exactly what it does today. On 2.x it links the v2 plugin, writes v2-format agents and commands, writes `experimental.subagent_depth` and the guard policies, hides the five user-invoked lanes, and removes its own earlier link to the other major's plugin. `--major 1|2` overrides detection.

**Files:**
- Modify: `scripts/fx-opencode-install`
- Modify: `tests/install/run.sh`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: `toOpencodeV2Agent` (task 03), `opencodeCommands` (unchanged), `GUARD_POLICIES` (task 05), `probe-findings.md` questions 5, 7, 8, 9.
- Produces: `scripts/fx-opencode-install [--dest DIR] [--dry-run] [--major 1|2]`. Detection: `opencode --version`, first integer; no binary and no `--major` is an error naming `--major`. On 2.x, in `--dest`: `plugins/fx.js` links to `plugins/fx-opencode-v2.js`; `agents/<name>.md` in v2 frontmatter (`description`, `mode: subagent`, `permissions` rule list, body as system prompt) with the generated header naming `opencode 2`; `commands/<name>.md` (`description` frontmatter, template body); `skills/<name>` links as today; `opencode.json` gains `experimental.subagent_depth >= 2`, `experimental.policies` containing every `GUARD_POLICIES` entry (without `sample`), and `permissions` entries `{ action: 'skill', resource: <lane>, effect: 'deny' }` for the five hidden lanes.

**Seam:** `tests/install/run.sh opencode-v2`, which runs the installer into a scratch `--dest` and inspects the result.

**Risks:** the installer owns only what it wrote: merge into the user's `opencode.json` without removing their entries; add a policy or permission entry only if an equal entry is absent; keep the user's own higher `subagent_depth`. The existing refusal markers (`refuse_if_foreign_generated`, `points_into_fx`) apply to v2 files the same way. Switching majors replaces fx's generated files and link, never a foreign one. A top-level `subagent_depth` is written only for 1.x (2.x drops it). On 1.x nothing in the output changes: diff the v1 output before and after.

**Idempotency:** a second run with the same major changes nothing (`diff -r` of two runs is empty); refusals fire before the first write, including under `--dry-run`.

**Testing:** the install test's new branch; the v1 branch unchanged and green.

## Acceptance criteria
- [ ] `--major 2` produces the files and keys in **Produces**; a second run leaves the tree identical.
- [ ] A user's own `permissions` entry, policy and higher `experimental.subagent_depth` survive.
- [ ] `--major 2` after `--major 1` leaves `plugins/fx.js` pointing at the v2 file and no v1-format agent files; `--major 1` after `--major 2` restores the v1 output exactly.
- [ ] With `opencode` absent from `PATH` and no `--major`, the installer exits non-zero naming `--major`.
- [ ] `bash tests/install/run.sh opencode` output is unchanged from before this task.

## Steps

- [ ] **1. RED:** in `tests/install/run.sh`, accept `opencode-v2` beside the existing harnesses and add an `opencode-v2` branch that, in a scratch `--dest` seeded with a user `opencode.json` (`{"permissions":[{"action":"read","resource":"*.secret","effect":"deny"}],"experimental":{"subagent_depth":3}}`):
  1. runs `python3 scripts/fx-opencode-install --dest "$D" --major 2`;
  2. asserts `readlink "$D/plugins/fx.js"` ends in `plugins/fx-opencode-v2.js`;
  3. asserts each of the six `agents/*.md` has `mode: subagent`, a `permissions:` block whose first rule denies `*`, and the generated header naming `opencode 2`;
  4. asserts `commands/fx-audit.md` exists with a `description:` line;
  5. with `node -e`, asserts `opencode.json` keeps the user's permission, keeps `experimental.subagent_depth` at 3, holds every `GUARD_POLICIES` resource under `experimental.policies`, and denies `skill` for the five lanes;
  6. runs the installer again into a copy and asserts `diff -r` is empty;
  7. runs `--major 1` then `--major 2` and asserts the same tree as step 2's;
  8. runs with `PATH` stripped of `opencode` and no `--major`, asserting a non-zero exit and `--major` in stderr.

  Run `bash tests/install/run.sh opencode-v2`: FAIL.
- [ ] **2. Record v1's output** for the regression check: `python3 scripts/fx-opencode-install --dest "$(mktemp -d)/v1" --major 1` before changing the installer, and keep the tree.
- [ ] **3. Implement** with `fx-tdd`: version detection and `--major`, the v2 branch, the switch-majors cleanup, reusing the existing refusal helpers and the `node -e` bridge for the converters.
- [ ] **4. GREEN:** `bash tests/install/run.sh opencode-v2 && bash tests/install/run.sh opencode`, and `diff -r` of step 2's v1 tree against a fresh `--major 1` run is empty.
- [ ] **5. check-all:** add `run install-opencode-v2 bash tests/install/run.sh opencode-v2` after the `install-opencode` line.
- [ ] **6. Commit**

```
git add scripts/fx-opencode-install tests/install/run.sh scripts/check-all
git commit -m "feat(opencode-v2): version-aware installer"
```
