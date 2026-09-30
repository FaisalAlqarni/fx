# 02: Rename the v1 plugin

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** Harness

**What to build:** the OpenCode 1.x plugin's source file is named for its runtime, `plugins/fx-opencode-v1.js`, so the new v2 file sits beside it without ambiguity. Behaviour on 1.x does not change: the installed link in the OpenCode config directory stays `plugins/fx.js`, and every test, script and doc that points at the source file points at the new name.

**Files:**
- Rename: `plugins/fx.js` to `plugins/fx-opencode-v1.js` (`git mv`)
- Modify: every live reference. Find them with `git grep -n -e "plugins/fx\.js" -e "'plugins', 'fx.js'" -e '"plugins", "fx.js"' -- . ':!docs/plans'` and review each hit: code (`scripts/fx-opencode-install`, `lib/agent-dialects.js`, `lib/opencode-commands.js`, `scripts/test-scope`), tests (`tests/gates/opencode-plugin.test.js`, `tests/install/run.sh`, `tests/conformance/rows/*.sh`, `tests/conformance/lib/live.sh`, `tests/conformance/*.test.sh`, `tests/conformance/README.md`), docs (`README.md`, `INSTALL.md`, `SURFACE.md`, ADRs 0020, 0026, 0028, 0032).
- Do not edit: `docs/plans/**` (history), `AGENTS.md` and `.claude/CLAUDE.md` (repowise-generated).

**Interfaces:**
- Consumes: nothing.
- Produces: the source path `plugins/fx-opencode-v1.js`. The installer's link destination name stays `plugins/fx.js` in the config directory; the `FX_OPENCODE_ROUTE=plugin` entry becomes `file://$FX/plugins/fx-opencode-v1.js`.
- Produces, in `scripts/fx-opencode-install`: `FX_PLUGIN_SOURCES = (FX / "plugins" / "fx.js", FX / "plugins" / "fx-opencode-v1.js")`, the plugin file names fx has shipped. `check_link_conflicts` treats a `plugins/fx.js` link whose recorded target is any entry of `FX_PLUGIN_SOURCES` as fx's own and replaces it; any other target is still refused. Task 06 adds `plugins/fx-opencode-v2.js` to the tuple.

**Seam:** the existing gates and install test, which import or link the source file by path.

**Risks:** the installer both names the source and the link; only the source side changes. An install made before this task has `plugins/fx.js` linked to `$FX/plugins/fx.js`, which the rename leaves dangling; `check_link_conflicts` (`scripts/fx-opencode-install:246-255`) replaces a link only when its target equals the new source, so without `FX_PLUGIN_SOURCES` every existing user's re-run would refuse with "refusing to replace a link fx did not create". `points_into_fx` never resolves the target, so a dangling link still matches. A comment or error string that says "fx.js" meaning the installed link stays. `scripts/test-scope` routes `plugins/` paths to the plugin gate: keep that routing working for the new file name.

**Idempotency:** `git mv` and text edits; a re-run finds the new name in place.

**Testing:** the existing gates and install test, which fail if a reference was missed.

## Acceptance criteria
- [ ] `plugins/fx.js` no longer exists in the tree; `plugins/fx-opencode-v1.js` does, byte-identical apart from comments that name the file.
- [ ] `git grep -n "plugins/fx\.js" -- . ':!docs/plans' ':!AGENTS.md' ':!.claude'` returns only lines that mean the installed link (each one read and kept deliberately; list them in the report).
- [ ] A `--dest` whose `plugins/fx.js` links to `$FX/plugins/fx.js` (the pre-rename install) is re-linked to `plugins/fx-opencode-v1.js`; one linking to an unrelated file is still refused.
- [ ] `node tests/gates/opencode-plugin.test.js`, `bash tests/install/run.sh opencode`, `bash tests/conformance/run.sh opencode --free`, `node tests/gates/no-runtime-addressing.test.js`, `scripts/check-paths` and `scripts/check-prose` on every edited Markdown file pass.

## Steps

- [ ] **1. RED:** add to `tests/gates/opencode-plugin.test.js`, near its top, before the import:

```js
assert.ok(!fs.existsSync(path.join(root, 'plugins', 'fx.js')), 'the v1 plugin source is named for its runtime');
assert.ok(fs.existsSync(path.join(root, 'plugins', 'fx-opencode-v1.js')), 'plugins/fx-opencode-v1.js exists');
```

(reuse the file's existing `fs`, `path` and `root`; add a require if one is missing). Run `node tests/gates/opencode-plugin.test.js`: FAIL on the first assertion.

In `tests/install/run.sh`'s `opencode` branch, beside the other `check` lines, add:

```bash
  OLD="$SCRATCH/pre-rename"; mkdir -p "$OLD/plugins"; ln -s "$FX/plugins/fx.js" "$OLD/plugins/fx.js"
  check "an install made before the rename is re-linked, not refused" \
    'python3 "$FX/scripts/fx-opencode-install" --dest "$OLD" >/dev/null && [ "$(readlink "$OLD/plugins/fx.js")" = "$FX/plugins/fx-opencode-v1.js" ]'
  FOREIGN="$SCRATCH/foreign-plugin"; mkdir -p "$FOREIGN/plugins"; ln -s /etc/hostname "$FOREIGN/plugins/fx.js"
  check "a foreign plugins/fx.js link is still refused" \
    '! python3 "$FX/scripts/fx-opencode-install" --dest "$FOREIGN" >/dev/null 2>&1 && [ "$(readlink "$FOREIGN/plugins/fx.js")" = /etc/hostname ]'
```

Run `bash tests/install/run.sh opencode`: the first new check FAILs once the rename lands without `FX_PLUGIN_SOURCES` (run it after step 2's `git mv` and before the installer edit to see it red).

- [ ] **2. Rename:** `git mv plugins/fx.js plugins/fx-opencode-v1.js`, then update every reference found by the grep in **Files**. Run `bash tests/install/run.sh opencode`: the pre-rename check FAILs. Then add `FX_PLUGIN_SOURCES` and use it in `check_link_conflicts` for the plugin link (with `fx-tdd`).
- [ ] **3. GREEN:** run the commands in the acceptance criteria. All pass.
- [ ] **4. Commit** the renamed file and every edited path, listed explicitly:

```
git add plugins/fx.js plugins/fx-opencode-v1.js scripts/fx-opencode-install tests/install/run.sh tests/gates/opencode-plugin.test.js <each further path the grep found, named one by one>
git commit -m "refactor(opencode): name the v1 plugin for its runtime"
```
