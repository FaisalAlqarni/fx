# 03: v2 harness registration

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** Harness

**What to build:** `opencode-v2` becomes a harness fx knows about: the preamble renders for it, its runtime facts have a reference file, fx's agents convert to its format, and the nightly CI probes it at its floor and latest. v1's CI `latest` entry is pinned to the 1.x line, since `opencode-ai@latest` now installs 2.x.

**Files:**
- Modify: `lib/preamble.js`, `lib/preamble.test.js`
- Create: `references/harnesses/opencode-v2.md`
- Modify: `lib/agent-dialects.js`
- Create: `tests/gates/opencode-v2-agent.test.js`
- Modify: `tests/gates/ci-pins.test.js`, `.github/workflows/conformance-nightly.yml`, `scripts/check-all`

**Interfaces:**
- Consumes: `probe-findings.md` questions 6 and 7 (agent and skill formats). If question 6 shows another field shape than below, follow the probe and say so in the report.
- Produces:
  - `HARNESSES` = `['claude-code', 'opencode', 'codex', 'opencode-v2']`; `render({ harness: 'opencode-v2', cwd, subagent })`.
  - `toOpencodeV2Agent(mdText, { referencesDirs = [] } = {}) -> { mode: 'subagent', description, system, permissions: Array<{ action, resource, effect }> }`, exported beside the unchanged `toOpencodeAgent`.

**Seam:** `render()` output; the converter's return value evaluated with v2's last-match-wins rule.

**Risks:** the `ADDRESSING` entry text feeds every v2 session; keep it in the style of the other entries and keep the bootstrap under 3,000 characters (the preamble test's budget covers each harness). `toOpencodeAgent` and its callers must not change. `ci-pins` must stay strict: each harness at exactly its floor and its own latest line.

**Idempotency:** file edits; the new test file is written whole; the `check-all` line is added only if absent.

**Testing:** the preamble test, the new agent gate, `ci-pins`.

## Acceptance criteria
- [ ] `render({ harness: 'opencode-v2' })` names the `skill` tool, dispatch through the `subagent` tool, and lanes without a plugin prefix; it passes the size budgets.
- [ ] `toOpencodeV2Agent` for every file in `agents/` yields `*` denied first, the read-class actions its `tools:` line grants allowed, `edit` and `shell` denied unless granted, and `external_directory` allowed for each references directory; `system` is the body; `description` the description.
- [ ] `references/harnesses/opencode-v2.md` covers tool vocabulary, permissions, subagent dispatch, skill hiding and what fx cannot observe on v2, from the probe findings and the v2 docs, each fact cited.
- [ ] The workflow has `opencode` at `opencode-ai@1.18.25` and `opencode-ai@1`, and `opencode-v2` at `opencode-ai@2.0.18` and `opencode-ai@latest`; `ci-pins` passes.

## Steps

- [ ] **1. RED:** in `lib/preamble.test.js`, change the pinned list to `['claude-code', 'opencode', 'codex', 'opencode-v2']` and add:

```js
{
  const v2 = render({ harness: 'opencode-v2' });
  assert.ok(v2.includes('the `skill` tool'), 'opencode-v2 names the skill tool');
  assert.ok(/`subagent` tool/.test(v2), 'opencode-v2 dispatches through the subagent tool');
  assert.ok(!v2.includes('fx:fx-'), 'opencode-v2 addresses lanes without a plugin prefix');
  console.log('opencode-v2 addressing: passed');
}
```

Create `tests/gates/opencode-v2-agent.test.js`:

```js
'use strict';
// fx's agents converted to OpenCode v2's agent format, checked with v2's own
// rule: the last matching permission rule wins.
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const { toOpencodeV2Agent, toOpencodeAgent } = require(path.join(root, 'lib', 'agent-dialects'));

function effect(rules, action, resource) {
  const glob = (p, s) => new RegExp('^' + p.split('*').map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(s);
  let out = 'ask';
  for (const r of rules) if (glob(r.action, action) && glob(r.resource, resource)) out = r.effect;
  return out;
}

const refs = path.join(root, 'references');
for (const f of fs.readdirSync(path.join(root, 'agents')).filter((n) => n.endsWith('.md'))) {
  const md = fs.readFileSync(path.join(root, 'agents', f), 'utf8');
  const a = toOpencodeV2Agent(md, { referencesDirs: [refs] });
  assert.strictEqual(a.mode, 'subagent', `${f}: a subagent`);
  assert.ok(a.description && a.description.length > 20, `${f}: has its description`);
  assert.ok(a.system && a.system.length > 100, `${f}: body becomes the system prompt`);
  assert.deepStrictEqual(a.permissions[0], { action: '*', resource: '*', effect: 'deny' }, `${f}: deny everything first`);
  assert.strictEqual(effect(a.permissions, 'read', 'src/x.js'), 'allow', `${f}: can read`);
  assert.strictEqual(effect(a.permissions, 'grep', '*'), 'allow', `${f}: can grep`);
  assert.strictEqual(effect(a.permissions, 'edit', 'src/x.js'), 'deny', `${f}: cannot edit`);
  assert.strictEqual(effect(a.permissions, 'shell', 'rm -rf /'), 'deny', `${f}: cannot run a shell`);
  assert.strictEqual(effect(a.permissions, 'subagent', 'general'), 'deny', `${f}: cannot delegate`);
  assert.strictEqual(effect(a.permissions, 'external_directory', path.join(refs, 'vocab', 'x.md')), 'allow', `${f}: reads fx references`);
  assert.ok(toOpencodeAgent(md, { referencesDirs: [refs] }).permission, `${f}: the v1 converter is unchanged`);
}
console.log('opencode-v2-agent.test.js: OK');
```

Run both: FAIL (`opencode-v2` missing from `HARNESSES`; `toOpencodeV2Agent is not a function`).

- [ ] **2. Implement** with `fx-tdd`: the `ADDRESSING['opencode-v2']` entry and the `HARNESSES` entry in `lib/preamble.js`; `toOpencodeV2Agent` in `lib/agent-dialects.js`, reusing `splitFrontmatter` and `field`, mapping the `tools:` line (Read, Grep, Glob to `read`, `grep`, `glob`; Bash to `shell`; Write, Edit, NotebookEdit to `edit`).
- [ ] **3. GREEN:** `node lib/preamble.test.js && node tests/gates/opencode-v2-agent.test.js`.
- [ ] **4. Reference file** `references/harnesses/opencode-v2.md`, from `probe-findings.md` and the v2 docs; it must not name another reference file (`scripts/check-reference-leaves`).
- [ ] **5. CI:** in the workflow, change v1's `opencode-ai@latest` to `opencode-ai@1` and add the two `opencode-v2` entries. In `ci-pins.test.js`, add `'opencode-v2'` to `PKG` (`opencode-ai`) and `FLOOR` (`2.0.18`), add a `LATEST = { 'claude-code': 'latest', codex: 'latest', opencode: '1', 'opencode-v2': 'latest' }` map, and assert each harness's versions are exactly `[FLOOR[h], LATEST[h]]`. Run `node tests/gates/ci-pins.test.js`.
- [ ] **6. check-all:** add `run opencode-v2-agent.test.js node tests/gates/opencode-v2-agent.test.js` after the `opencode-plugin.test.js` line.
- [ ] **7. Gates:** `node lib/preamble.test.js && node tests/gates/opencode-v2-agent.test.js && node tests/gates/ci-pins.test.js && node tests/gates/no-runtime-addressing.test.js && scripts/check-reference-leaves && scripts/check-paths && scripts/check-prose references/harnesses/opencode-v2.md`
- [ ] **8. Commit**

```
git add lib/preamble.js lib/preamble.test.js references/harnesses/opencode-v2.md lib/agent-dialects.js tests/gates/opencode-v2-agent.test.js tests/gates/ci-pins.test.js .github/workflows/conformance-nightly.yml scripts/check-all
git commit -m "feat(opencode-v2): register the harness, its agent format and CI pins"
```
