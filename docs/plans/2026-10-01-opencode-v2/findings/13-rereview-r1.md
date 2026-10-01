### Finding verdicts

- **[13-review Important] general grant is unconditional, violates ADR-0026's two-part check**: NOT ADDRESSED. The guard exists now (plugins/fx-opencode-v2.js:71-85, 226) and no rule is stripped (line 228). But it reads 3 of the sources OpenCode 2.0.18 merges, so a user rule in any other source still gets the grant. v1 (plugins/fx-opencode-v1.js:170-174) reads the merged config, which holds every source; v2 does not match it. Sources the plugin skips, from the v2 source (packages/core/src/config/*):
  - `opencode.jsonc` in the global dir and in every project dir (discovery.ts:11, `names = ["opencode.json", "opencode.jsonc"]`; config.ts loadDirectory and the direct walk load both). The fix comment at fx:70 admits this ("no .jsonc").
  - Every ancestor directory's `opencode.json`/`.jsonc` and `.opencode/` (discovery.ts:36, `fs.up({ targets: ["."], start: location.directory })` walks to `/`). The plugin reads only `location.directory`, so a monorepo root config is missed when opencode starts in a subdirectory.
  - `OPENCODE_CONFIG` (explicit file) and `OPENCODE_CONFIG_CONTENT` (cli/src/server-process.ts:113-114; config.ts load(): `explicit`, `content`).
  - The 1.x keys that 2.0.18 still accepts and migrates: `permission` (string or map) and `tools` at top level, and `agent.<name>.permission` (normalize.ts:131-134, 179-183, 497-521). `task` maps to `subagent` (v1/config/migrate.ts:119), and `permission: "ask"` becomes `{action:"*"}`. The plugin checks only `permissions` arrays (fx:79-80), so `"permission": {"task": {"explore": "allow"}}`, a likely shape for a user moving from fx on 1.x, is the narrow rule from the lens finding and still gets fx's `* allow`.
  - Agent markdown files (`agent/general.md`, `agents/**/*.md` under the global dir and each `.opencode`; config/plugin/agent.ts:21-26, 202-207), whose frontmatter can carry permissions for `general`.
  A broad user `subagent` or `*` rule in a missed source still wins, because it is applied after fx (lens Q1). A narrow one does not, and that was the defect. Fix: cover every source above (glob both names, walk ancestors to `/` as discovery.ts does, read `OPENCODE_CONFIG` and `OPENCODE_CONFIG_CONTENT`, treat any `permission`/`tools` key whose map holds `task` or `*`, or a string `permission`, as an answer, and treat any `general` agent markdown file as an answer). Parse JSONC, or keep the current fail-closed result when JSON.parse fails. Or supersede ADR-0026 for v2 in ADR-0037 and name the sources fx reads. Add a gate case per source shape: `.jsonc`, ancestor dir, `OPENCODE_CONFIG`, a 1.x `permission.task` map.
- **[13-lens-security 1, Important] a narrow user `subagent` rule leaves fx's `*` allow answering everything else**: NOT ADDRESSED. The case is fixed only where the narrow rule sits in `opencode.json` or `.opencode/opencode.json` in the start directory, or in the global `opencode.json`, in the 2.x `permissions` or `agents.general.permissions` form (gate cases at tests/gates/opencode-v2-plugin.test.js:156-161). The same narrow rule in any source listed above still falls through to fx's allow (fx:228).
- **[ruled] INSTALL.md states the policy-only generic refusal for plain spellings**: ADDRESSED. INSTALL.md:396-401 says a plain `git branch -D` gets only "Blocked by configuration policy", and that `-C .`, `sh -c` and post-heredoc spellings reach fx's guard with the `[fx] ` reason.
- **[ruled] question-tool deny on the llamacpp path**: ADDRESSED. tests/conformance/lib/merge-opencode-provider.js:18 writes the deny only for `opencode-v2`; tests/conformance/lib/live.sh:163 passes `$HARNESS`; merge-opencode-provider.test.sh:31-40 checks the v2 deny and that 1.x gets no `permissions` key. Not proven live (stated in the report).

Checks against the focus questions:
- Path traversal: none. Every path is built from `OPENCODE_CONFIG_DIR`, `XDG_CONFIG_HOME`/`HOME` and `ctx.location.directory` joined with fixed names (fx:72-76). Nothing comes from model or tool input.
- Symlinks: `readFileSync` follows them, as OpenCode does (discovery.ts resolves through `fs.resolve`). A symlinked `opencode.json` can only add a rule, which removes the grant, so it fails closed. A dangling link gives ENOENT, which is read as "no file", the same as OpenCode.
- Fail-open: unreadable file (EACCES, EISDIR), malformed JSON, JSONC comments in a `.json` file, and a throw inside `userHasSubagentRule` (caught by `attempt`, fx:225) all skip the grant. The only fail-open path is a source the plugin never reads (verdict 1).

### New breakage in the fix diff

- Minor: plugins/fx-opencode-v2.js:77. `readFileSync` on an `opencode.json` that is a FIFO blocks plugin setup, so OpenCode hangs at start. OpenCode's own reader has the same shape, so the practical risk is low. Fix: `fs.statSync(file).isFile()` before reading, and treat a non-file as "answered".
- Minor: plugins/fx-opencode-v2.js:70. The `ponytail:` comment cuts the corner on a permission grant, which is a security path. Once the sources in verdict 1 are covered, the comment goes.

### Out-of-scope observations

None.

### Verdict

**Fix round:** Findings remain open: 13-review Important (grant guard reads 3 of OpenCode 2.0.18's config sources, so it is not v1's merged-config check) and 13-lens-security 1 Important (a narrow rule in `.jsonc`, an ancestor dir, `OPENCODE_CONFIG`/`_CONTENT`, the 1.x `permission`/`tools` keys or an agent markdown file still gets fx's `* allow`).

## Ledger lines

Task 13: fix round 1/5 (2 addressed, 2 open: grant guard misses .jsonc, ancestor dirs, OPENCODE_CONFIG/_CONTENT, 1.x permission/tools keys and agent markdown; narrow user subagent rule in those sources still gets fx's * allow; commits 6a6f8b2..9ffccff)
Task 13: minor (deferred): readFileSync on a FIFO named opencode.json hangs plugin setup; stat isFile first and treat a non-file as answered.
Task 13: minor (deferred): ponytail comment cuts the config-source corner on a permission grant; remove it once every source is covered.
