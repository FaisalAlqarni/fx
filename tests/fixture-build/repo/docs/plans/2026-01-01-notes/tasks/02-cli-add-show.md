# 02: CLI add and show

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** MVP

**What to build:** a user adds a note from the terminal with
`node cli.js add <name> <text>` and reads it back with `node cli.js show <name>`,
which prints the note's text followed by a newline. An unknown command prints a
one-line usage message to stderr and exits 1.

**Files:**
- Create: `cli.js`
- Test:   `test/cli.test.js`

**Interfaces:**
- Consumes: `save(name, text)` and `load(name) -> string` from `lib/store.js` (task 01)
- Produces: `cli.js` commands `add <name> <text>` and `show <name>`

**Seam:** the CLI process: `node cli.js` run as a child process with `NOTES_DIR` in its environment.

**Idempotency:** creates two files and one commit. Re-running rewrites the same files and commits only if the tree is dirty.

**Testing:** integration, `node --test`.

## Acceptance criteria
- [ ] `node cli.js add groceries "milk and eggs"` exits 0.
- [ ] `node cli.js show groceries` then prints `milk and eggs`.
- [ ] `node cli.js frobnicate` exits 1 and prints usage to stderr.

## Steps

- [ ] **1. Write the failing test**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const env = { ...process.env, NOTES_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'notes-')) };
const cli = (...args) => spawnSync('node', [path.join(__dirname, '..', 'cli.js'), ...args], { env, encoding: 'utf8' });

test('add then show prints the note', () => {
  assert.strictEqual(cli('add', 'groceries', 'milk and eggs').status, 0);
  const r = cli('show', 'groceries');
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, 'milk and eggs\n');
});

test('an unknown command exits 1 with usage on stderr', () => {
  const r = cli('frobnicate');
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /usage/i);
});
```

- [ ] **2. Run it: verify RED**

Run: `node --test test/cli.test.js`
Expected: FAIL, `add then show prints the note` fails with a non-zero status because `cli.js` does not exist.

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing test.

- [ ] **4. Run it: verify GREEN**

Run: same command. Expected: PASS, output pristine.

- [ ] **5. Run the suite**

Run: `node --test`

- [ ] **6. Commit**

```
git add cli.js test/cli.test.js
git commit -m "feat(cli): add and show commands"
```

No attribution trailers. Then continue to the next task: never stop and
wait.
