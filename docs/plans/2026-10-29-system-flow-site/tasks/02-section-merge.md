# 02: Sections merge across fragments

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** MVP

**What to build:** a chapter is assembled from several fragments. `chapters.json` declares every section; an area fragment may hold a section with the same `id` to add `lead`, `bullets`, `notOwned` and figure references. Arrays concatenate, a scalar set in two fragments is an error naming both files, a section `chapters.json` does not declare is an error, and the chapter order is the order in `chapters.json`. Sections are the one kind exempt from the duplicate-id rule. The schema's `section.required` drops to `["id"]`; `check` requires `title` and `question` on the merged section.

**Design:** The model: schema version 2; Error handling

**Files:**
- Modify: `references/system-flow/system-model.schema.json` (`section.required: ["id"]`)
- Modify: `src/lib/sf-model.ts` (`mergeFragments` combines sections by id; origins per field)
- Modify: `src/lib/sf-rules.ts` (merged-section `title` and `question` rule)
- Test: `src/scripts/system-flow-check.test.ts`, `src/scripts/system-flow-build.test.ts`

**Interfaces:**
- Consumes: `Section` with `lead`, `notOwned`, `role` (task 01).
- Produces: `mergeFragments(fragments)` returns one `Section` per declared id, in `chapters.json` order; `originOf(section)` is the `chapters.json` declaration; `originOf(section.bullets[i])` and the `lead` origin (exposed as `fieldOrigin(section, 'lead' | 'notOwned' | 'title' | 'question') -> { file: string; pointer: string } | undefined`, exported from `sf-model.ts`) name the fragment that wrote them. Task 03's `checkProse` calls `fieldOrigin` and `originOf` itself to place each prose problem.

**Seam:** the `system-flow` CLI run as a process.

**Tests:** fixture `goodSet()` plus an area fragment `links.json`.
- Merge reaches the chapter: `links.json` holds `{ "sections": [{ "id": "s1", "lead": "Links expire. The job checks them.", "bullets": [<b2 evidenced on app/x.rb 4 expired?>] }] }`; `check` exits 0; after `build`, `model/system-model.json` has exactly one section `s1` whose `lead` is that text and whose `bullets` ids are `["b1", "b2"]`, `title` `Links` from `chapters.json`.
- Order: `chapters.json` declares `s1` then `s2`, `links.json` (sorted after `chapters.json`) holds `s2` first: merged order is `s1`, `s2`.
- Scalar twice: `lead` set in `chapters.json` and in `links.json`: exit 1, stderr exactly `docs/system-flow/model/fragments/links.json:/sections/0/lead: section s1 lead is also set in docs/system-flow/model/fragments/chapters.json`.
- Undeclared: `links.json` holds section `s9`: exit 1, stderr exactly `docs/system-flow/model/fragments/links.json:/sections/0: section s9 is not declared in chapters.json`.
- Missing title: `chapters.json` declares `{ "id": "s3", "question": "Why?" }`: exit 1, stderr exactly `docs/system-flow/model/fragments/chapters.json:/sections/1: section s3: title missing`.
- Duplicate rule kept: a node `link` in `links.json` beside `level0.json`'s still fails with today's `node link is also defined in docs/system-flow/model/fragments/level0.json`.
- Stamps land in the right file: after `build`, bullet `b2` carries `verified` in `links.json`, and `chapters.json` gains no `b2`.
- `--fragment`: `check --fragment docs/system-flow/model/fragments/links.json` exits 0 and reports only that file's problems.

**Risks:** `stampVerified` writes back through objects shared with fragment data; combine sections by moving references, never by cloning bullets.

**Testing:** CLI process tests.

## Acceptance criteria
- [ ] An area fragment's lead and bullets reach the chapter `chapters.json` declares, and its stamps land in the area fragment.
- [ ] The two merge errors name both files or `chapters.json`.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names**

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `... node scripts/system-flow-check.test.js` and `... node scripts/system-flow-build.test.js`
Expected: `section s1 is also defined in ...` where a merge was expected.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: `OK` from both.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`

- [ ] **7. Commit this task's paths on `system-flow`**

```
git add -- references/system-flow/system-model.schema.json src/lib/sf-model.ts lib/sf-model.js src/lib/sf-rules.ts lib/sf-rules.js src/scripts/system-flow-check.test.ts scripts/system-flow-check.test.js src/scripts/system-flow-build.test.ts scripts/system-flow-build.test.js
git commit -m "feat(system-flow): sections merge across fragments"
```

Never push, merge or open a PR.
