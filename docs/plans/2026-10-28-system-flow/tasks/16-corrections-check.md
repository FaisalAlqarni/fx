# 16: Corrections check

**Status:** ready-for-agent
**Blocked by:** 03
**Phase:** Hardening

**What to build:** every change to an existing fact is recorded. `check` (and so `build`) merges the fragments as committed at HEAD and the fragments in the working tree into two models and compares them item by item, matched by handle, so moving an item from one fragment to another is neither a change nor a removal. A fact bullet, a node or edge label, a store row or a flow step whose text changed or that was removed, with no new `corrections` entry naming its handle, fails the check. The log renders as the Corrections chapter (already drawn by task 10 from `corrections[]`) and in no other place.

**Design:** Corrections log; The model; Error handling

**Files:**
- Create: `src/lib/sf-corrections.ts`
- Modify: `src/scripts/system-flow.ts` or `src/lib/sf-build.ts`, wherever `check` assembles its problems (call `checkCorrections` after the evidence verifier)
- Create: `src/scripts/system-flow-corrections.test.ts` (built to `scripts/system-flow-corrections.test.js`)
- Modify: `scripts/check-all` (one line)

**Interfaces:**
- Consumes: `loadFragments`, `mergeFragments`, `itemsOf`, `handleOf`, `Problem` (task 01); `Root` (task 03).
- Produces, `src/lib/sf-corrections.ts`: `headModel(host: Root, fragmentsDir: string): { model: Model; items: Item[] }` (every fragment file listed by `git ls-tree --name-only HEAD <fragments dir>/`, read with `readCited`, merged with `mergeFragments`) and `checkCorrections(head: Item[], headModel: Model, now: Item[], nowModel: Model): Problem[]`. "Text" per kind: a bullet's `text`; a node's or edge's `label` and `short`; every column of a store row but `evidence`, `verified` and `unconfirmed`; a step's `actor`, `op`, `store`, `key`, `when`. A correction is "new" when its `id` is not among HEAD's corrections, wherever it is defined. A changed item's problem points at its place in the working tree; a removed item's problem points at its file and pointer at HEAD. With no fragments at HEAD, the check passes.

**Seam:** the `system-flow` CLI run as a process on the fixture, with fragments committed and then edited.

**Tests:** fragments committed at HEAD with bullet `b1` "A link expires after 30 days.", node `api` label "API", store row `sql-links`, step `first#1`.
- No change: `check` exits 0.
- Changed fact: `b1` text becomes "A link expires after 60 days." with no new correction: exit 1, stderr line `docs/system-flow/model/fragments/chapters.json:/sections/0/bullets/0: bullet:b1 changed since HEAD with no corrections entry`.
- Corrected: the same change plus a new `corrections.json` entry `{ id: "c1", date: "2026-10-28", item: "bullet:b1", before: "A link expires after 30 days.", after: "A link expires after 60 days.", reason: "stale", evidence: [<a file entry>] }`: exit 0.
- Old correction does not count: a correction for `b1` already present at HEAD does not cover a new change: exit 1.
- Removed: node `api` deleted from `level0.json` (and its edges): exit 1, stderr line ending `node:api removed since HEAD with no corrections entry`, with the file and pointer `api` had at HEAD.
- Moved, unchanged: bullet `b1` moved from `chapters.json` to a new `engine.json` section with the same text: exit 0. Moved and changed: the same move with the text changed and no correction: exit 1 with the pointer in `engine.json`.
- Same id, two kinds: node `turn` and sequence `turn` both at HEAD; the node's label changes with a correction naming `node:turn`: exit 0.
- Label: node `api` label "API" becomes "Public API": exit 1 with `node:api changed since HEAD ...`.
- Store row: `sql-links` `purpose` changes: exit 1; step `first#1` `when` changes: exit 1.
- Not text: only `verified` or `evidence` of `b1` changes: exit 0.
- New fragment: an untracked `extra.json` with new items: exit 0.
- Moved correction: a correction present at HEAD in `corrections.json`, moved into `extra.json`, still counts as old: a new change to its item with no other correction exits 1.
- Bad reason: a correction with `reason: "whim"` fails the schema (`value "whim" not in enum`).

**Testing:** CLI process tests.

## Acceptance criteria
- [ ] No fact, label, store row or flow step changes or disappears without a new corrections entry, judged by handle across the merged models, so a move between fragments is not a change.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/scripts/system-flow-corrections.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node scripts/system-flow-corrections.test.js`
Expected: changed facts pass `check`.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: `system-flow-corrections.test.js: OK`.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/lib/sf-corrections.ts src/scripts/system-flow.ts src/lib/sf-build.ts`, then every `scripts/system-flow-*.test.js` under the same prefix

- [ ] **7. Commit by path**

```
git add src/lib/sf-corrections.ts lib/sf-corrections.js src/scripts/system-flow.ts scripts/system-flow src/lib/sf-build.ts lib/sf-build.js src/scripts/system-flow-corrections.test.ts scripts/system-flow-corrections.test.js scripts/check-all
git commit -m "feat(system-flow): changed facts need a corrections entry"
```

No attribution trailers. Then continue to the next task: never stop and wait.
