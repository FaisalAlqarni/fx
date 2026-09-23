# 05: Search

**Status:** ready-for-agent
**Blocked by:** 01
**Parallel with:** 04 (disjoint files, and both consume only `lib/store.js`)
**Phase:** MVP

**What to build:** a user who half remembers a note finds it by a word in its
text. Search returns the names of the notes whose text contains the query, in
the order `list()` returns them. People type queries in any case. A query that
matches nothing returns `[]`.

**Files:**
- Create: `lib/search.js`
- Test:   `test/search.test.js`

**Interfaces:**
- Consumes: `list() -> string[]` and `load(name) -> string` from `lib/store.js` (task 01)
- Produces: `lib/search.js` exports `search(q) -> string[]`, note names

**Seam:** the module's exports, called in process with `NOTES_DIR` pointed at a temporary directory.

**Idempotency:** creates two files and one commit. Re-running rewrites the same files and commits only if the tree is dirty.

**Testing:** unit, `node --test`.

## Acceptance criteria
- [ ] `search('milk')` returns `['groceries']` when only `groceries` contains `milk`.
- [ ] A query that matches nothing returns `[]`.
- [ ] Every matching name is returned.

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
const { search } = require('../lib/search');

store.save('groceries', 'milk and eggs');
store.save('todo', 'call the plumber');
store.save('recipes', 'pancakes need milk');

test('search returns every note whose text contains the query', () => {
  assert.deepStrictEqual(search('milk'), ['groceries', 'recipes']);
});

test('search returns only the matching notes', () => {
  assert.deepStrictEqual(search('plumber'), ['todo']);
});

test('a query that matches nothing returns an empty list', () => {
  assert.deepStrictEqual(search('bicycle'), []);
});
```

- [ ] **2. Run it: verify RED**

Run: `node --test test/search.test.js`
Expected: FAIL, `Cannot find module '../lib/search'`

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing test.

- [ ] **4. Run it: verify GREEN**

Run: same command. Expected: PASS, output pristine.

- [ ] **5. Run the suite**

Run: `node --test`

- [ ] **6. Commit**

```
git add lib/search.js test/search.test.js
git commit -m "feat(search): find notes by a word in their text"
```

No attribution trailers. Then continue to the next task: never stop and
wait.
