# 03: README usage section

**Status:** ready-for-agent
**Blocked by:** 02
**Phase:** MVP

**What to build:** documentation. A new user opens `README.md` and finds a
`## Usage` section with one fenced `sh` block that adds a note and shows it,
and a sentence saying where notes are stored and how `NOTES_DIR` changes that.
The example must work when pasted into a shell at the repository root; there is no installed binary.

**Files:**
- Modify: `README.md`
- Test:   `test/readme.test.js`

**Interfaces:**
- Consumes: `cli.js` commands `add <name> <text>` and `show <name>` (task 02)
- Produces: a `## Usage` section in `README.md` with one fenced `sh` block

**Seam:** the README file as text.

**Idempotency:** edits one file, creates one, and makes one commit. Re-running rewrites the same section and commits only if the tree is dirty.

**Testing:** a text check on `README.md`, `node --test`.

## Acceptance criteria
- [ ] `README.md` has a `## Usage` heading.
- [ ] Under it, one fenced `sh` block uses the `add` and `show` commands.
- [ ] The section names `NOTES_DIR` and its default, `./notes`.

## Steps

- [ ] **1. Write the failing test**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
const usage = readme.split(/^## Usage$/m)[1] || '';

test('the README has a usage section', () => {
  assert.notStrictEqual(usage, '');
});

test('the usage section shows add and show in an sh block', () => {
  const block = (usage.match(/```sh\n([\s\S]*?)```/) || [])[1] || '';
  assert.match(block, /\badd\b/);
  assert.match(block, /\bshow\b/);
});

test('the usage section names NOTES_DIR and its default', () => {
  assert.match(usage, /NOTES_DIR/);
  assert.match(usage, /\.\/notes/);
});
```

- [ ] **2. Run it: verify RED**

Run: `node --test test/readme.test.js`
Expected: FAIL, `the README has a usage section`

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing test.

- [ ] **4. Run it: verify GREEN**

Run: same command. Expected: PASS, output pristine.

- [ ] **5. Run the suite**

Run: `node --test`

- [ ] **6. Commit**

```
git add README.md test/readme.test.js
git commit -m "docs(readme): usage section"
```

No attribution trailers. Then continue to the next task: never stop and
wait.
