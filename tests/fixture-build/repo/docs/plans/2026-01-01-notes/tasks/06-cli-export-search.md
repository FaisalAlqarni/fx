# 06: CLI export and search

**Status:** ready-for-agent
**Blocked by:** 02, 04
**Parallel with:** 05 (06 only touches `cli.js`)
**Phase:** MVP

**What to build:** the last two commands. `node cli.js export` prints the
whole export to stdout. `node cli.js search <q>` prints each matching note
name on its own line, and prints nothing when no note matches. Both exit 0.

**Files:**
- Modify: `cli.js`
- Test:   `test/cli-export-search.test.js`

**Interfaces:**
- Consumes: `exportAll() -> string` from `lib/export.js` (task 04)
- Consumes: `search(q) -> string[]` from `lib/search.js` (task 05)
- Consumes: `save(name, text)` from `lib/store.js` (task 01), in the test only
- Produces: `cli.js` commands `export` and `search <q>`, next to `add` and `show`

**Seam:** the CLI process: `node cli.js` run as a child process with `NOTES_DIR` in its environment.

**Idempotency:** edits one file, creates one, and makes one commit. Re-running rewrites the same files and commits only if the tree is dirty.

**Testing:** integration, `node --test`.

## Acceptance criteria
- [ ] `node cli.js export` prints the same text `exportAll()` returns.
- [ ] `node cli.js search milk` prints `groceries` on its own line.
- [ ] `node cli.js search bicycle` prints nothing and exits 0.
- [ ] `add` and `show` still work.

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

cli('add', 'groceries', 'milk and eggs');
cli('add', 'todo', 'call the plumber');

test('export prints every note', () => {
  const r = cli('export');
  assert.strictEqual(r.status, 0);
  assert.ok(r.stdout.includes('# groceries\n\nmilk and eggs\n'));
  assert.ok(r.stdout.includes('# todo\n\ncall the plumber\n'));
});

test('search prints each matching name on its own line', () => {
  const r = cli('search', 'milk');
  assert.strictEqual(r.status, 0);
  assert.deepStrictEqual(r.stdout.split('\n').filter(Boolean), ['groceries']);
});

test('search with no match prints nothing', () => {
  const r = cli('search', 'bicycle');
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout.trim(), '');
});

test('show still works', () => {
  assert.strictEqual(cli('show', 'todo').stdout, 'call the plumber\n');
});
```

- [ ] **2. Run it: verify RED**

Run: `node --test test/cli-export-search.test.js`
Expected: FAIL, `export prints every note` fails because `export` is an unknown command and exits 1.

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing test.

- [ ] **4. Run it: verify GREEN**

Run: same command. Expected: PASS, output pristine.

- [ ] **5. Run the suite**

Run: `node --test`

- [ ] **6. Commit**

```
git add cli.js test/cli-export-search.test.js
git commit -m "feat(cli): export and search commands"
```

No attribution trailers. Then continue to the next task: never stop and
wait.
