# 20: Nightly conformance against the real CLIs

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** Amendment

**What to build:** Every night, GitHub Actions installs Claude Code, Codex and
opencode, each twice: at the pinned version floor and at `@latest`. It runs
fx's free conformance rows against each. A CLI release that changes how
plugins load then shows up as a red `@latest` run, before a user finds it, and
a red floor run says fx no longer works on the oldest version it claims.
Design amendment A8.

**Prior art, copy it.** caveman's `.github/workflows/agent-conformance.yml`
(caveman section 7 of `research/prior-art-multi-harness.md`): a nightly `cron`
plus `workflow_dispatch`, a matrix that installs each real, pinned CLI, and a
companion check that fails when a shipped profile has no pinned probe. Copy
its shape. caveman pins only, and its open issue 1097 ("agent-drift: codex,
installed 0.155.1 exceeds pinned 0.155.0", in caveman section 4 of the same file) is
what a floor alone misses: the world moved and the pinned job stayed green.
That is why this workflow adds `@latest` beside every floor.

The free rows make no model calls, so the workflow needs **no secrets**. The
live rows stay local.

**Files:**
- Create: `.github/workflows/conformance-nightly.yml`
- Create: `tests/gates/ci-pins.test.js`
- Modify: `scripts/check-all`  (one line, appended directly after `conformance-free-codex`)

**Interfaces:**
- Consumes: `bash tests/conformance/run.sh <harness> --free` (task 11)
- Produces: one workflow with:
  - a `schedule` trigger (`cron`) and `workflow_dispatch`;
  - `strategy.fail-fast: false`, so a red `@latest` never cancels the floor;
  - a `matrix.include` list with two entries per harness, `claude-code`,
    `codex` and `opencode`. Each entry is a `- harness: <name>` line followed
    by an `install: npm install -g <package>@<version>` line. The floor
    entries use the plan's Global Constraints: `@anthropic-ai/claude-code@2.1.278`,
    `@openai/codex@0.155.1`, `opencode-ai@1.18.25`. The other entry per harness
    uses `@latest`;
  - an install step `run: ${{ matrix.install }}`;
  - a step `run: bash tests/conformance/run.sh ${{ matrix.harness }} --free`.
- Produces: `tests/gates/ci-pins.test.js`, which reads only non-comment lines
  and fails when any of these holds:
  - a harness in `lib/preamble.js`'s `HARNESSES` has no real matrix entry;
  - a harness lacks its floor install line or its `@latest` install line;
  - a floor pin differs from the plan's version floor;
  - an install line names a package other than its harness's.

**Seam:** the workflow file, read by a free gate test. Nothing runs in CI
during this task.

**Risks:**
- MEDIUM: the free rows need `node`, and some rows spawn the installed CLI
  (for example `claude plugin details`). The workflow installs Node and the
  CLI before running the rows. It also installs `bubblewrap`, only if a free
  row turns out to need it. Check this by reading the free rows.
- MEDIUM: a pin check that greps the whole file passes on a pin written in a
  comment, or on a matrix entry that is commented out. The test drops comment
  lines first, and pairs each install line with the `harness:` entry it
  belongs to.
- Nothing in this task pushes or triggers a workflow. The file lands on the
  branch, and the user decides when it reaches GitHub.

**Idempotency:** a file and a test. Nothing runs remotely.

**Testing:** `tests/gates/ci-pins.test.js`. Validate the YAML's structure with
the small hand-rolled line parser below. Do not add a YAML dependency: fx
ships node and shell only.

## Acceptance criteria
- [ ] The workflow has `schedule` and `workflow_dispatch` triggers, and `fail-fast: false`
- [ ] Its matrix has, for each harness in `HARNESSES`, one entry installing the plan's floor version and one installing `@latest`
- [ ] Each entry runs that harness's free conformance rows
- [ ] The workflow references no secrets
- [ ] `tests/gates/ci-pins.test.js` ignores comment lines, and fails on each of these mutations: removing the `opencode` floor entry, removing the `codex` `@latest` entry, changing the Codex floor pin, and moving a pin into a comment while deleting its entry. Show all four runs in the report
- [ ] The test is in `scripts/check-all`, directly after `conformance-free-codex`
- [ ] The workflow's header comment cites caveman's `agent-conformance.yml` and its drift issue 1097

## Steps

- [ ] **1. Write the failing test**

Create `tests/gates/ci-pins.test.js`:

```js
'use strict';
// Amendment A8: every runtime fx claims has a nightly probe against its real
// CLI, at the pinned floor AND at @latest. Copied from caveman's
// .github/workflows/agent-conformance.yml, which fails the build when a
// profile has no pinned probe. The @latest half exists because of caveman's
// issue 1097: a pinned job stays green while the installed CLI moves on.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const { HARNESSES } = require(path.join(root, 'lib', 'preamble'));

const wf = path.join(root, '.github', 'workflows', 'conformance-nightly.yml');
assert.ok(fs.existsSync(wf), 'the nightly workflow exists');
// Comments never count: a pin or an entry that is commented out is not a probe.
const lines = fs.readFileSync(wf, 'utf8').split('\n').filter((l) => !/^\s*#/.test(l));
const y = lines.join('\n');

assert.match(y, /^\s*schedule:\s*$/m, 'runs on a schedule');
assert.match(y, /^\s*-\s*cron:\s*['"][^'"]+['"]\s*$/m, 'has a cron line');
assert.match(y, /^\s*workflow_dispatch:/m, 'can be run by hand');
assert.match(y, /^\s*fail-fast:\s*false\s*$/m, 'a red @latest never cancels the floor');
assert.ok(!/secrets\./.test(y), 'needs no secrets: the free rows make no model calls');
assert.match(y, /^\s*run:\s*\$\{\{\s*matrix\.install\s*\}\}\s*$/m, 'the install step runs the entry\'s install line');
assert.match(y, /^\s*run:\s*bash tests\/conformance\/run\.sh \$\{\{\s*matrix\.harness\s*\}\} --free\s*$/m,
  'each entry runs its free rows');

// Pair every install line with the matrix entry it belongs to.
const entries = [];
for (const l of lines) {
  const h = l.match(/^\s*-\s*harness:\s*([a-z-]+)\s*$/);
  if (h) { entries.push({ harness: h[1], install: null }); continue; }
  const i = l.match(/^\s*install:\s*npm install -g (\S+)\s*$/);
  if (i && entries.length && entries[entries.length - 1].install === null) entries[entries.length - 1].install = i[1];
}

const PKG = { 'claude-code': '@anthropic-ai/claude-code', codex: '@openai/codex', opencode: 'opencode-ai' };
const FLOOR = { 'claude-code': '2.1.278', codex: '0.155.1', opencode: '1.18.25' };
for (const h of HARNESSES) {
  assert.ok(PKG[h] && FLOOR[h], `a package and a floor are defined for ${h}`);
  const mine = entries.filter((e) => e.harness === h);
  assert.ok(mine.length > 0, `${h} has a real matrix entry`);
  for (const e of mine) {
    assert.ok(e.install, `${h} entry has an install line`);
    assert.ok(e.install.startsWith(`${PKG[h]}@`), `${h} installs ${PKG[h]}, not ${e.install}`);
  }
  const versions = mine.map((e) => e.install.slice(PKG[h].length + 1));
  assert.ok(versions.includes(FLOOR[h]), `${h} is installed at the floor ${PKG[h]}@${FLOOR[h]}`);
  assert.ok(versions.includes('latest'), `${h} is installed at ${PKG[h]}@latest`);
}
for (const e of entries) assert.ok(HARNESSES.includes(e.harness), `matrix entry ${e.harness} is a known harness`);
console.log('ci-pins: passed');
```

- [ ] **2. Run it: verify RED**

Run: `node tests/gates/ci-pins.test.js`
Expected: FAIL with "the nightly workflow exists".

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it. Write the workflow, with a header comment
citing caveman's `agent-conformance.yml` and issue 1097.

- [ ] **4. Run it: verify GREEN, then prove it can fail**

Run: same. Expected: PASS. Then make each mutation below, run the test, and
restore the file each time:
- delete the `opencode` floor entry;
- delete the `codex` `@latest` entry;
- change the Codex floor pin to `0.155.0`;
- delete the `claude-code` floor entry and put its install line back as a comment.

The test must FAIL all four times. Record the four runs in the report.

- [ ] **5. Register and run the full gate**

Append `run ci-pins.test.js node tests/gates/ci-pins.test.js` to
`scripts/check-all`, on the line directly after
`run conformance-free-codex ...`. Tasks 14, 16 and 19 each add a line beside a
different neighbour, so the merges stay trivial. Run:
`HOME="$(mktemp -d)" scripts/check-all`. Expected: `ALL GREEN`.

- [ ] **6. Commit**

```
git add .github/workflows/conformance-nightly.yml tests/gates/ci-pins.test.js scripts/check-all
git commit -m "ci: run the free conformance rows nightly against the real CLIs at the floor and at latest"
```

No attribution trailers. Never push. Then continue to the next task: never
stop and wait.
