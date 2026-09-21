# 04: Codex plugin, marketplace, and the preamble

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** MVP

**What to build:** A user installs fx on Codex with two commands, and every
session and every dispatched subagent receives the preamble with Codex
addressing.

```
codex plugin marketplace add <path-or-repo>
codex plugin add fx@fx
```

**Files:**
- Create: `.codex-plugin/plugin.json`
- Create: `.agents/plugins/marketplace.json`
- Create: `hooks.json`  (repository root, deliberately)
- Create: `hooks/fx-codex.js`

**Interfaces:**
- Consumes: `render({ harness, cwd }) -> string` (task 01)
- Produces: `hooks/fx-codex.js`, reading hook JSON on stdin and writing
  `{ hookSpecificOutput: { hookEventName, additionalContext } }` on stdout for
  `SessionStart` and `SubagentStart`

**Seam:** Artifact shape in the install test (task 09); behaviour in the
conformance matrix (task 12).

**Measured facts this task depends on.** All verified on Codex CLI 0.155.1:

- The manifest must **not** declare `hooks`. Codex's own bundled validator,
  `~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py`, accepts
  only `id, name, version, description, skills, apps, mcpServers, interface,
  author, homepage, repository, license, keywords`. ECC and superpowers both
  declare `hooks` and both fail it. The one curated plugin that passes,
  `figma`, ships `hooks.json` at plugin root and declares nothing.
- `skills` is a **single path string**: `"./skills/"`. Not an array.
- Hook commands may be plain relative paths from the plugin root, and Codex
  exports `CLAUDE_PLUGIN_ROOT` to plugin hooks for compatibility.
- Standalone hook JSON nests events under a top-level `hooks` key. A file with
  top-level event keys is rejected: `unknown field 'PreToolUse', expected
  'description' or 'hooks'`.
- Codex copies the plugin tree and **drops symlinks**; execute bits survive.

**Risks:** Codex skips a plugin's hooks until the user reviews and trusts them,
so the preamble does not arrive on a fresh install until `/hooks` is run.
Whether a plugin's hooks are auto-trusted is contradicted between the
documentation and one measured install; task 12 settles it. Until then the
install documentation states the trust step.

**Idempotency:** Creates files only. No writes outside the repository.

**Testing:** Manual install into a throwaway `CODEX_HOME` in this task;
automated in tasks 09 and 10.

## Acceptance criteria
- [ ] `python3 ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py .`
      passes **except** for `skills/fx-audit`'s `disable-model-invocation`
      frontmatter, which pre-dates this plan and belongs to task 07. Verified
      by the controller that a live `codex plugin add` installs successfully
      regardless: the validator is a lint, not the ingestion path
- [ ] `.codex-plugin/plugin.json` does not contain the key `hooks`
- [ ] `.codex-plugin/plugin.json` declares `"skills": "./skills/"` as a string
- [ ] `hooks.json` is at the repository root and nests events under `hooks`
- [ ] `hooks.json` registers `SessionStart` and `SubagentStart` only
- [ ] `hooks/fx-codex.js` emits `additionalContext` containing `$fx-tdd`
- [ ] `hooks/fx-codex.js` emits no `{{`
- [ ] Installing into a throwaway `CODEX_HOME` lists fx's skills
- [ ] No symlink exists anywhere under a path the Codex plugin ships
- [ ] Versions in `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json` and the Codex marketplace entry are identical
- [ ] The symlink check asks git, not the filesystem, so gitignored worktrees cannot fail it

## Steps

- [ ] **1. Write the failing test**

```js
// tests/gates/codex-manifest.test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const codex = JSON.parse(fs.readFileSync(path.join(root, '.codex-plugin/plugin.json'), 'utf8'));
const claude = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin/plugin.json'), 'utf8'));

assert.ok(!('hooks' in codex), 'the Codex validator rejects a hooks key');
assert.ok(!('agents' in codex), 'no agents key exists in the Codex manifest');
assert.strictEqual(typeof codex.skills, 'string', 'skills is a single path string');
assert.strictEqual(codex.skills, './skills/');
assert.strictEqual(codex.version, claude.version, 'manifest versions must match');

// The design requires manifest and marketplace versions to stay identical, and
// says a gate checks it. This is that gate.
const cxMarket = JSON.parse(fs.readFileSync(path.join(root, '.agents/plugins/marketplace.json'), 'utf8'));
const entry = cxMarket.plugins.find((p) => p.name === 'fx');
assert.ok(entry, 'fx must be listed in the Codex marketplace');
assert.strictEqual(entry.version, codex.version, 'marketplace entry must match the manifest');

const hooks = JSON.parse(fs.readFileSync(path.join(root, 'hooks.json'), 'utf8'));
assert.ok(hooks.hooks, 'events nest under a top-level hooks key');
assert.deepStrictEqual(
  Object.keys(hooks.hooks).sort(),
  ['SessionStart', 'SubagentStart'],
  'this task registers exactly the two context events'
);

// No symlinks anywhere Codex would copy: it drops them silently.
// Ask git, not the filesystem: `find` also walks .worktrees/ and other
// gitignored build state, which would fail this gate on something never shipped.
const links = execFileSync('bash', ['-c',
  "git ls-files -s | awk '$1==\"120000\" {print $4}'"],
  { cwd: root, encoding: 'utf8' }).trim();
assert.strictEqual(links, '', `symlinks are dropped by the Codex installer: ${links}`);

// The injector renders, and renders for Codex.
const out = execFileSync('node', [path.join(root, 'hooks/fx-codex.js')], {
  input: JSON.stringify({ hook_event_name: 'SessionStart', cwd: root }),
  encoding: 'utf8',
});
const parsed = JSON.parse(out);
const ctx = parsed.hookSpecificOutput.additionalContext;
assert.ok(ctx.includes('$fx-tdd'), 'Codex addressing must be rendered');
assert.ok(!ctx.includes('{{'), 'no placeholder may survive');
assert.ok(!ctx.includes('fx:fx-tdd'), 'the plugin prefix is Claude Code only');

console.log('codex-manifest.test.js: OK');
```

- [ ] **2. Run it: verify RED**

Run: `node tests/gates/codex-manifest.test.js`
Expected: FAIL, `ENOENT` on `.codex-plugin/plugin.json`

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing test. `hooks/fx-codex.js`
delegates to `render({ harness: 'codex', cwd })` and keeps the same failure
text `hooks/fx-context.js` uses when rendering throws.

`hooks.json` registers both events against one command:
`node "${CLAUDE_PLUGIN_ROOT}/hooks/fx-codex.js"`.

- [ ] **4. Run it: verify GREEN**

Run: `node tests/gates/codex-manifest.test.js`
Expected: PASS.

- [ ] **5. Validate with Codex's own validator**

Run: `python3 ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py .`
Expected: `Plugin validation passed`.

- [ ] **6. Install into a throwaway CODEX_HOME**

Run:
```
export CODEX_HOME=$(mktemp -d)
codex plugin marketplace add "$PWD"
codex plugin add fx@fx
codex plugin list
```
Expected: fx listed as installed. Then `unset CODEX_HOME` and delete the
directory. Do not install into the real `~/.codex` in this task.

- [ ] **7. Register the test and run the gate**

Add to `scripts/check-all`:
```
run codex-manifest.test.js  node tests/gates/codex-manifest.test.js
```
Run: `scripts/check-all`
Expected: `ALL GREEN`.

- [ ] **8. Commit**

```
git add .codex-plugin .agents hooks.json hooks/fx-codex.js tests/gates/codex-manifest.test.js scripts/check-all scripts/check-manifest
git commit -m "feat(codex): ship fx as a Codex plugin with preamble injection"
```

No attribution trailers. Then continue to the next task: never stop and wait.
