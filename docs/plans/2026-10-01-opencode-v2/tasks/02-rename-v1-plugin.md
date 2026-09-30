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

**Seam:** the existing gates and install test, which import or link the source file by path.

**Risks:** the installer both names the source and the link; only the source side changes. A comment or error string that says "fx.js" meaning the installed link stays. `scripts/test-scope` routes `plugins/` paths to the plugin gate: keep that routing working for the new file name.

**Idempotency:** `git mv` and text edits; a re-run finds the new name in place.

**Testing:** the existing gates and install test, which fail if a reference was missed.

## Acceptance criteria
- [ ] `plugins/fx.js` no longer exists in the tree; `plugins/fx-opencode-v1.js` does, byte-identical apart from comments that name the file.
- [ ] `git grep -n "plugins/fx\.js" -- . ':!docs/plans' ':!AGENTS.md' ':!.claude'` returns only lines that mean the installed link (each one read and kept deliberately; list them in the report).
- [ ] `node tests/gates/opencode-plugin.test.js`, `bash tests/install/run.sh opencode`, `bash tests/conformance/run.sh opencode --free`, `node tests/gates/no-runtime-addressing.test.js`, `scripts/check-paths` and `scripts/check-prose` on every edited Markdown file pass.

## Steps

- [ ] **1. RED:** add to `tests/gates/opencode-plugin.test.js`, near its top, before the import:

```js
assert.ok(!fs.existsSync(path.join(root, 'plugins', 'fx.js')), 'the v1 plugin source is named for its runtime');
assert.ok(fs.existsSync(path.join(root, 'plugins', 'fx-opencode-v1.js')), 'plugins/fx-opencode-v1.js exists');
```

(reuse the file's existing `fs`, `path` and `root`; add a require if one is missing). Run `node tests/gates/opencode-plugin.test.js`: FAIL on the first assertion.

- [ ] **2. Rename:** `git mv plugins/fx.js plugins/fx-opencode-v1.js`, then update every reference found by the grep in **Files**.
- [ ] **3. GREEN:** run the commands in the acceptance criteria. All pass.
- [ ] **4. Commit** the renamed file and every edited path, listed explicitly:

```
git add plugins/fx-opencode-v1.js <every edited path>
git commit -m "refactor(opencode): name the v1 plugin for its runtime"
```
