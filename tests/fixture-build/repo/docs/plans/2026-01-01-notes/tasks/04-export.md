# 04: Export

**Status:** ready-for-agent
**Blocked by:** 01
**Parallel with:** 05 (disjoint files, and both consume only `lib/store.js`)
**Phase:** MVP

**What to build:** every note as one Markdown document, ready to paste
somewhere else. For each note: a `# <name>` heading, a blank line, the note's
text, and a newline, with the notes joined into one string. Notes appear in the order `list()` returns them. With no notes, the result is the
empty string.

**Files:**
- Create: `lib/export.js`
- Test:   `test/export.test.js`

**Interfaces:**
- Consumes: `list() -> string[]` and `load(name) -> string` from `lib/store.js` (task 01)
- Produces: `lib/export.js` exports `exportAll() -> string`

**Seam:** the module's exports, called in process with `NOTES_DIR` pointed at a temporary directory.

**Idempotency:** creates two files and one commit. Re-running rewrites the same files and commits only if the tree is dirty.

**Testing:** unit, `node --test`.

## Acceptance criteria
- [ ] With no notes, `exportAll()` returns `''`.
- [ ] One note `groceries` with text `milk` exports as `# groceries\n\nmilk\n`.
- [ ] Every saved note's heading and text appear in the export.

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
const { exportAll } = require('../lib/export');

test('no notes export as the empty string', () => {
  assert.strictEqual(exportAll(), '');
});

test('one note exports as a heading, a blank line and its text', () => {
  store.save('groceries', 'milk');
  assert.strictEqual(exportAll(), '# groceries\n\nmilk\n');
});

test('every note appears in the export', () => {
  store.save('todo', 'call the plumber');
  const out = exportAll();
  assert.ok(out.includes('# groceries\n\nmilk\n'));
  assert.ok(out.includes('# todo\n\ncall the plumber\n'));
});
```

- [ ] **2. Run it: verify RED**

Run: `node --test test/export.test.js`
Expected: FAIL, `Cannot find module '../lib/export'`

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing test.

- [ ] **4. Run it: verify GREEN**

Run: same command. Expected: PASS, output pristine.

- [ ] **5. Run the suite**

Run: `node --test`

- [ ] **6. Commit**

```
git add lib/export.js test/export.test.js
git commit -m "feat(export): every note as one Markdown document"
```

No attribution trailers. Then continue to the next task: never stop and
wait.
