# 09: Installer and install-shape tests

**Status:** ready-for-agent
**Blocked by:** 06, 07, 08
**Phase:** Hardening

**What to build:** fx still installs where a plugin loader cannot be used, and
the shape of every install is checked for free. `scripts/fx-opencode-install`
is kept and updated to the facts measured in this plan. `fx-setup` gains the
job no hook can do: verify and report.

**Files:**
- Modify: `scripts/fx-opencode-install`
- Rename: `tests/opencode-install/` to `tests/install/`
- Modify: `tests/install/run.sh`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: `plantRoles({ home, source })` (task 06)
- Consumes: `lib/agent-dialects.js` (task 08): the installer calls it instead
  of keeping its own `convert_agent`, so one converter serves both callers
- Consumes: the plugin's `config` hook (task 08), for the facts the installer
  must reproduce without it
- Produces: `tests/install/run.sh <harness>`, exit 0 or a named failure

**Seam:** `tests/install/run.sh`, the existing install-test seam, generalised
from one runtime to three. Reads files, spends nothing, stays in `check-all`.

**Why the installer survives.** The plugin path is better where it works, and
that qualifier carries weight. opencode has forks; `OPENCODE_PURE` and
`OPENCODE_DISABLE_DEFAULT_PLUGINS` disable plugin loading outright; part of the
registration surface task 08 relies on is experimental. The script is the
supported route when the loader is unavailable.

**What changes in the installer.** It stops being the only path and starts
being the fallback, so it must reproduce what the plugin now does: register
skills, register every read-only agent in opencode's dialect, and set
`subagent_depth`. Correct these measured errors while there:

- Agent generation must set `permission.edit` to `deny`. `write` and `patch`
  collapse onto `edit`, and `tools: { apply_patch: false }` is a silent no-op.
- Both `skill/` and `skills/` are scanned, as are `command/` and `commands/`.
  Pick one spelling and keep it.
- opencode reads `~/.agents/skills` as well as its own directory. Install into
  exactly one, and warn if fx is already in the other.
- The installer is invoked as `python3 scripts/fx-opencode-install`. Every
  existing call site does; a bare invocation depends on an execute bit.

**Where fx's own settings live.** The retained scenario asserts the user's
`opencode.json` is untouched, and the plugin path now needs `subagent_depth`
raised. Both cannot hold if fx rewrites that file wholesale. The contract: fx
merges only its own keys, and the retained scenario is rewritten to assert
**every key the user already had survives unchanged**, rather than byte
identity.

**Risks:** The installer writes into a user's configuration directory. Keep
every write inside fx's own namespace, and keep `--dry-run` honest: it must
print exactly what a real run would do.

**Finding fx in a second pool warns; it never refuses.** The design says every
current path keeps working, and a user with fx in both
`~/.config/opencode/skills` and `~/.agents/skills` has a working install today.
A refusal would break it. Warn, name the pool, name the remediation.

**Idempotency:** Re-running the installer converges on the same tree. Re-running
`fx-setup` reports rather than rewrites when everything is already correct.

**Testing:** Run the install test per harness against a temporary destination.
No live session: that is task 12.

## Acceptance criteria
- [ ] Every fixture the checks use is defined in the file and cleaned up by a trap
- [ ] The installer is invoked as `python3 scripts/fx-opencode-install` everywhere
- [ ] The opencode agent directory is `agents/`, plural
- [ ] `tests/install/run.sh opencode` passes against a temporary destination
- [ ] `tests/install/run.sh codex` passes against a temporary `CODEX_HOME`
- [ ] `tests/install/run.sh claude-code` passes, asserting the plugin's component inventory
- [ ] Every generated opencode read-only agent sets `permission.edit` to `deny`, including `fx-devils-advocate`
- [ ] No generated opencode artifact contains `fx:fx-`
- [ ] No generated opencode artifact sets `tools: { apply_patch: ... }`
- [ ] The installer sets `subagent_depth` to at least 2
- [ ] The installer installs skills into exactly one pool, and **warns** if it finds fx in the other, naming the remediation
- [ ] It never refuses on that basis: an install that works today keeps working
- [ ] The retained untouched-config scenario asserts the user's own keys survive, not byte identity
- [ ] `scripts/fx-opencode-install` has no `convert_agent` of its own: it calls `lib/agent-dialects.js`
- [ ] `--dry-run` writes nothing and lists the same paths a real run creates
- [ ] Running the installer twice produces an identical tree
- [ ] `scripts/check-all` runs `tests/install/run.sh` for all three harnesses
- [ ] All three callers reach the same planter: `hooks/fx-codex.js`,
      `commands/fx-setup.md` and `scripts/fx-opencode-install` each route
      role planting through `lib/plant-roles.js`, and no second
      implementation of it exists in the repository

## Steps

- [ ] **1. Write the failing test**

Extend `tests/install/run.sh` to take a harness argument. Add these checks,
keeping every existing numbered scenario:

```bash
# --- harness: opencode -------------------------------------------------------
# Fixtures these checks use. `run.sh` runs under `set -euo pipefail`, so an
# undefined name aborts the whole suite rather than failing one check.
HOME_FIXTURE="$(mktemp -d)"
CODEX_HOME_FIXTURE="$(mktemp -d)"
trap 'rm -rf "$HOME_FIXTURE" "$CODEX_HOME_FIXTURE" "$DEST.first" "$DEST.dry"' EXIT

# The directory is `agents/`, plural: that is what the installer writes.
check "generated read-only agents deny edit" \
  'for f in "$DEST"/agents/fx-lens-*.md "$DEST"/agents/fx-devils-advocate.md; do grep -q "edit: deny" "$f" || exit 1; done'

check "no generated artifact carries the plugin prefix" \
  '! grep -rq "fx:fx-" "$DEST"'

check "apply_patch is never used as a permission key" \
  '! grep -rq "apply_patch:" "$DEST"'

check "subagent_depth allows an implementer to dispatch a reviewer" \
  'test "$(python3 -c "import json;print(json.load(open(\"$DEST/opencode.json\")).get(\"subagent_depth\",1))")" -ge 2'

check "skills are installed into exactly one pool" \
  'test ! -e "$HOME_FIXTURE/.agents/skills/fx-tdd" -o ! -e "$DEST/skills/fx-tdd"'

check "a second run changes nothing" \
  'cp -a "$DEST" "$DEST.first" && python3 "$FX/scripts/fx-opencode-install" --dest "$DEST" >/dev/null && diff -r "$DEST.first" "$DEST"'

check "dry-run writes nothing" \
  'rm -rf "$DEST.dry" && python3 "$FX/scripts/fx-opencode-install" --dest "$DEST.dry" --dry-run >/dev/null && test ! -d "$DEST.dry"'

check "a duplicate pool warns and does not refuse" \
  'mkdir -p "$HOME_FIXTURE/.agents/skills/fx-tdd" && \
   HOME="$HOME_FIXTURE" python3 "$FX/scripts/fx-opencode-install" --dest "$DEST" 2>&1 | grep -qi already'

# --- harness: codex ----------------------------------------------------------
check "every generated role is planted" \
  'test "$(ls "$CODEX_HOME_FIXTURE"/agents/*.toml | wc -l)" -eq "$(ls "$FX"/codex/agents/*.toml | wc -l)"'

check "the devils advocate is planted too" \
  'test -f "$CODEX_HOME_FIXTURE/agents/fx-devils-advocate.toml"'

check "planted roles declare read-only intent" \
  'for f in "$CODEX_HOME_FIXTURE"/agents/*.toml; do grep -q "sandbox_mode" "$f" || exit 1; done'

check "planting writes only names fx generates" \
  'for f in "$CODEX_HOME_FIXTURE"/agents/*.toml; do test -f "$FX/codex/agents/$(basename "$f")" || exit 1; done'

# --- harness: claude-code ----------------------------------------------------
check "the plugin reports its full component inventory" \
  'claude plugin validate "$FX" >/dev/null'

# --- one implementation, three callers ---------------------------------------
check "role planting has exactly one implementation" \
  'test "$(grep -rlE "sandbox_mode *= *\"read-only\"" "$FX/lib" "$FX/hooks" "$FX/scripts" 2>/dev/null | wc -l)" -le 1'

check "every caller routes through the planter" \
  'grep -q "plant-roles" "$FX/hooks/fx-codex.js" && grep -q "plant-roles" "$FX/scripts/fx-opencode-install" && grep -q "plant-roles" "$FX/commands/fx-setup.md"'
```

- [ ] **2. Run it: verify RED**

Run: `bash tests/install/run.sh opencode`
Expected: FAIL on the `edit: deny` check, because the installer currently
generates `edit`, `write` and `bash` keys from the old mapping.

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing test.

- [ ] **4. Run it: verify GREEN**

Run:
```
bash tests/install/run.sh opencode && \
bash tests/install/run.sh codex && \
bash tests/install/run.sh claude-code
```
Expected: all three PASS.

- [ ] **6. Register the tests and run the gate**

Replace the single `opencode-install` line in `scripts/check-all` with one per
harness.

Run: `scripts/check-all`
Expected: `ALL GREEN`.

- [ ] **7. Commit**

```
git add -A tests/
git add scripts/fx-opencode-install scripts/check-all
git commit -m "feat(install): keep the script path, generalise the install test"
```

`git add -A tests/` rather than `git add tests/install`: the directory was
renamed, and staging only the new path leaves the old one behind.

No attribution trailers. Then continue to the next task: never stop and wait.
