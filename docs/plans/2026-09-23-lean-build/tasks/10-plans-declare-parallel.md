# 10: Plans can declare parallel tasks

**Status:** ready-for-agent
**Blocked by:** 09
**Phase:** Hardening

**What to build:** a plan can say which tasks are safe to build at the same
time, and the owner sees that claim when approving the plan. Parallelism is
never inferred from a missing blocking edge: a model writing a plan can miss
an edge, so parallel work needs a positive claim with a reason.

Also: `fx-setup` learns the existing `isolated_test_execution` key, which
`fx-implement` already honours (`SKILL.md`, "Serial implementers") but nothing
ever sets.

**Files:**
- Modify: `skills/fx-plan/SKILL.md` (task template; plan.md template; one rules paragraph)
- Modify: `commands/fx-setup.md` (`.fx.json` example, keys table, one question)
- Modify: `skills/fx-setup/SKILL.md` (regenerated, never hand-edited: `scripts/gen-command-skills` builds it from `commands/fx-setup.md`, and `scripts/check-manifest` fails when they differ)
- Create: `tests/gates/parallel-contract.test.js`
- Modify: `scripts/check-all` (add the gate)

**Interfaces:**
- Task template gains, directly under `**Blocked by:**`, an optional line:
  `**Parallel with:** 04: <why neither task needs the other's output>`
  (several tasks separated by `; `). Absent means serial.
- A rules paragraph under "Blocking edges", titled `**Parallel with.**`, says:
  declare it only when neither task consumes the other's `Produces`, their
  `**Files:**` lists share no path, and neither touches a hot file; the claim
  is symmetric (both tasks carry it); the hot-file list, exact:
  plugin and package manifests (`.claude-plugin/`, `package.json`,
  `*.toml` manifests), version files, `scripts/check-all`, changelogs, and any
  registry or index file that every task appends to.
- `plan.md` template: the Tasks table gains a `Parallel with` column, so the
  owner sees every claim in one place at approval.
- `fx-setup`: `.fx.json` example gains `"isolated_test_execution": false`; keys
  table gains the row `isolated_test_execution | true when test runs share no
  service (database, broker, cache) and each run uses its own temp paths;
  enables parallel tasks declared in a plan`; the workflow round gains the
  question "Do your tests use a shared service such as a database or broker?"
  (yes sets `false`).

**Seam:** gate over skill text.

**Idempotency:** text edits only.

**Testing:** `node tests/gates/parallel-contract.test.js`, `scripts/check-all`.

**Skill edit:** through the `fx-authoring` lane.

## Acceptance criteria
- [ ] The task template has the `**Parallel with:**` line directly under `**Blocked by:**`, marked optional.
- [ ] The rules paragraph names every hot-file class above and says the claim is symmetric.
- [ ] The plan.md Tasks table header includes `Parallel with`.
- [ ] `commands/fx-setup.md` has the key in the example, the table, and the question, and the generated `skills/fx-setup/SKILL.md` matches it (`scripts/check-manifest` passes).
- [ ] `tests/gates/description-overlap.test.js` still passes (descriptions are not edited).

## Steps

- [ ] **1. Write the failing gate**

```js
'use strict';
// Run: node tests/gates/parallel-contract.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const plan = read('skills/fx-plan/SKILL.md');
assert.match(plan, /\*\*Blocked by:\*\*[^\n]*\n\*\*Parallel with:\*\*/, 'task template: Parallel with sits under Blocked by');
assert.match(plan, /\| # \| Title \| Blocked by \| Parallel with \|/, 'plan.md Tasks table has a Parallel with column');
const i = plan.indexOf('**Parallel with.**');
assert.ok(i >= 0, 'fx-plan has the Parallel with rules paragraph');
const rules = plan.slice(i, i + 2000);
for (const needle of ['symmetric', 'package.json', 'check-all', 'version', 'changelog', 'registry', 'Files:']) {
  assert.ok(rules.toLowerCase().includes(needle.toLowerCase()), `rules mention ${needle}`);
}

const setup = read('skills/fx-setup/SKILL.md');
assert.match(setup, /"isolated_test_execution":\s*false/, 'fx-setup example carries the key');
assert.match(setup, /\|\s*`?isolated_test_execution`?\s*\|/, 'fx-setup keys table has the row');
assert.match(setup, /shared service/i, 'fx-setup asks about shared services');
console.log('parallel-contract: ok');
```

- [ ] **2. Run it: verify RED.** Run: `node tests/gates/parallel-contract.test.js`. Expected: FAIL on the first assertion.

- [ ] **3. Edit `skills/fx-plan/SKILL.md` and `commands/fx-setup.md`** through `fx-authoring`, to the Interfaces above, then run `scripts/gen-command-skills` and `scripts/check-manifest`.

- [ ] **4. Run it: verify GREEN.**

- [ ] **5. Run the suite.** Add the gate to `scripts/check-all`, run it, bump the version if asked.

- [ ] **6. Commit**

```
git add skills/fx-plan/SKILL.md commands/fx-setup.md skills/fx-setup/SKILL.md tests/gates/parallel-contract.test.js scripts/check-all
git commit -m "feat(fx-plan): tasks can declare Parallel with, with a hot-file rule"
```
