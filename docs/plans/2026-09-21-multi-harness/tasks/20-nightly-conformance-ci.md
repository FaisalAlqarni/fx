# 20: Nightly conformance against the real CLIs

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** Amendment

**What to build:** Every night, GitHub Actions installs the pinned Claude Code,
Codex and opencode CLIs and runs fx's free gate and free conformance rows
against them. A CLI release that changes how plugins load then shows up as a
red run, before a user finds it. Design amendment A8.

This is the pattern from caveman's `agent-conformance.yml`
(`research/prior-art-multi-harness.md`, "Their tests"). It installs real
pinned binaries in a matrix, and fails when a runtime has no pinned probe.

The free rows make no model calls, so the workflow needs **no secrets**. The
live rows stay local.

**Files:**
- Create: `.github/workflows/conformance-nightly.yml`
- Create: `tests/gates/ci-pins.test.js`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: `bash tests/conformance/run.sh <harness> --free`, and
  `scripts/check-all` (task 11)
- Produces: one workflow with:
  - a `schedule` trigger (`cron`) and `workflow_dispatch`;
  - one matrix job per harness: `claude-code`, `codex`, `opencode`;
  - each job pins its CLI to the version floor in the plan's Global
    Constraints: `@anthropic-ai/claude-code@2.1.278`, `@openai/codex@0.155.1`,
    `opencode-ai@1.18.25`;
  - each job runs `bash tests/conformance/run.sh <harness> --free`.
- Produces: `tests/gates/ci-pins.test.js`, which fails when any of these holds:
  - a harness in `lib/preamble.js`'s `HARNESSES` has no matrix entry;
  - a pin differs from the plan's version floor.

**Seam:** the workflow file, read by a free gate test. Nothing runs in CI
during this task.

**Risks:**
- MEDIUM: the free rows need `node`, and some rows spawn the installed CLI
  (for example `claude plugin details`). The workflow installs Node and the
  CLIs before running the rows. It also installs `bubblewrap`, only if a free
  row turns out to need it. Check this by reading the free rows.
- Nothing in this task pushes or triggers a workflow. The file lands on the
  branch, and the user decides when it reaches GitHub.

**Idempotency:** a file and a test. Nothing runs remotely.

**Testing:** `tests/gates/ci-pins.test.js`. Validate the YAML's structure by
parsing it in the test with a small hand-rolled key check. Do not add a YAML
dependency: fx ships node and shell only.

## Acceptance criteria
- [ ] The workflow has `schedule` and `workflow_dispatch` triggers
- [ ] It has one job per harness in `HARNESSES`, each installing that harness's CLI at the plan's pinned floor version
- [ ] Each job runs that harness's free conformance rows
- [ ] The workflow references no secrets
- [ ] `tests/gates/ci-pins.test.js` fails when a harness is removed from the matrix, and when a pin changes. Show both mutations in the report
- [ ] The test is in `scripts/check-all`

## Steps

- [ ] **1. Write the failing test**

Create `tests/gates/ci-pins.test.js`:

```js
'use strict';
// Amendment A8: every runtime fx claims has a nightly probe against its real,
// pinned CLI. Adapted from caveman's agent-conformance.yml, which fails the
// build when a profile has no pinned probe.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const { HARNESSES } = require(path.join(root, 'lib', 'preamble'));

const wf = path.join(root, '.github', 'workflows', 'conformance-nightly.yml');
assert.ok(fs.existsSync(wf), 'the nightly workflow exists');
const y = fs.readFileSync(wf, 'utf8');

assert.match(y, /^\s*schedule:\s*$/m, 'runs on a schedule');
assert.match(y, /^\s*-\s*cron:\s*['"][^'"]+['"]\s*$/m, 'has a cron line');
assert.match(y, /^\s*workflow_dispatch:/m, 'can be run by hand');
assert.ok(!/secrets\./.test(y), 'needs no secrets: the free rows make no model calls');

const PINS = {
  'claude-code': '@anthropic-ai/claude-code@2.1.278',
  codex: '@openai/codex@0.155.1',
  opencode: 'opencode-ai@1.18.25',
};
for (const h of HARNESSES) {
  assert.ok(PINS[h], `a pin is defined for ${h}`);
  assert.ok(y.includes(PINS[h]), `${h} is installed at ${PINS[h]}`);
  assert.ok(y.includes(`tests/conformance/run.sh ${h} --free`) ||
            /tests\/conformance\/run\.sh \$\{\{\s*matrix\.harness\s*\}\} --free/.test(y),
            `${h} runs its free rows`);
  assert.match(y, new RegExp(`harness:\\s*${h}\\b|-\\s*${h}\\b`), `${h} is in the matrix`);
}
console.log('ci-pins: passed');
```

- [ ] **2. Run it: verify RED**

Run: `node tests/gates/ci-pins.test.js`
Expected: FAIL with "the nightly workflow exists".

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it. Write the workflow.

- [ ] **4. Run it: verify GREEN**

Run: same. Expected: PASS. Then mutate twice and restore each time: delete the
`opencode` matrix entry, and change the Codex pin. The test must FAIL both
times. Record both runs in the report.

- [ ] **5. Register and run the full gate**

Add `run ci-pins.test.js node tests/gates/ci-pins.test.js` to
`scripts/check-all`. Run: `HOME="$(mktemp -d)" scripts/check-all`. Expected:
`ALL GREEN`.

- [ ] **6. Commit**

```
git add .github/workflows/conformance-nightly.yml tests/gates/ci-pins.test.js scripts/check-all
git commit -m "ci: run the free conformance rows nightly against the pinned real CLIs"
```

No attribution trailers. Never push. Then continue to the next task: never
stop and wait.
