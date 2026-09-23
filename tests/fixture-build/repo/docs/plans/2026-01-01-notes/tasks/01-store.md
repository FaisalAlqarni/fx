# 01: Note store

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** MVP

**What to build:** the storage every other task reads through. A note is saved
under its name as one file in the notes directory, loaded back by name, and
listed. Names come from the command line. Callers must be able to tell a
missing note from an empty one. The notes directory is created on the first
save.

**Files:**
- Create: `lib/store.js`
- Test:   `test/store.test.js`

**Interfaces:**
- Consumes: `process.env.NOTES_DIR`, read on every call, default `./notes`
- Produces: `lib/store.js` exports `save(name, text)`, returning nothing
- Produces: `lib/store.js` exports `load(name) -> string`, the note's text
- Produces: `lib/store.js` exports `list() -> string[]`, every note name sorted in ascending order, `[]` when the directory does not exist

**Seam:** the module's exports, called in process with `NOTES_DIR` pointed at a temporary directory.

**Idempotency:** creates two files and one commit. Re-running rewrites the same files and commits only if the tree is dirty.

**Testing:** unit, `node --test`.

## Acceptance criteria
- [ ] `save` then `load` returns the saved text.
- [ ] `list()` returns every saved name, sorted.
- [ ] `list()` returns `[]` before anything is saved.

## Steps

- [ ] **1. Write the failing test**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.NOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-'));
const store = require('../lib/store');

test('list is empty before the first save', () => {
  assert.deepStrictEqual(store.list(), []);
});

test('a saved note loads back', () => {
  store.save('groceries', 'milk and eggs');
  assert.strictEqual(store.load('groceries'), 'milk and eggs');
});

test('list returns every name, sorted', () => {
  store.save('zebra', 'z');
  store.save('apple', 'a');
  assert.deepStrictEqual(store.list(), ['apple', 'groceries', 'zebra']);
});
```

- [ ] **2. Run it: verify RED**

Run: `node --test test/store.test.js`
Expected: FAIL, `Cannot find module '../lib/store'`

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing test.

- [ ] **4. Run it: verify GREEN**

Run: same command. Expected: PASS, output pristine.

- [ ] **5. Run the suite**

Run: `node --test`

- [ ] **6. Commit**

```
git add lib/store.js test/store.test.js
git commit -m "feat(store): save, load and list notes"
```

No attribution trailers. Then continue to the next task: never stop and
wait.
