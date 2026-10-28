# 01: Schema version 2: new fields, `look`, glossary and code map items, the version-1 hint

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** MVP

**What to build:** the model at schema version 2. `check` accepts the new fields, requires `look` on every node and participant, treats glossary terms and code map entries as evidenced items (handles `term:<id>` and `code:<id>`, verified, stamped, listed by `query` and `stale`, accepted by `verify`), and refuses a version-1 set with one hint line per fragment.

**Design:** The model: schema version 2; Terms; Error handling

**Files:**
- Modify: `references/system-flow/system-model.schema.json`
- Modify: `src/lib/sf-model.ts` (`SCHEMA_VERSION = 2`, types, `ItemKind`, `PREFIXES`, `collect`, the version-1 hint in `loadFragments`)
- Modify: `src/lib/sf-rules.ts` (`KIND_WORD` gains `term: 'glossary term'`, `code: 'code map entry'`)
- Modify: `src/tests/helpers/sf-fixture.ts` (`schemaVersion: 2`, `look` on both nodes)
- Modify: every `src/scripts/system-flow-*.test.ts` that writes `schemaVersion: 1` or a node or participant (archify, build, check, corrections, coverage, detect, diagrams, estimate, evidence, layout, only, page, rules, stale, theme): version 2 and a `look` per node and participant, nothing else
- Test: `src/scripts/system-flow-check.test.ts`, `src/scripts/system-flow-stale.test.ts`

**Interfaces:**
- Produces, `src/lib/sf-model.ts`:
  - `type Look = 'service' | 'store' | 'client' | 'external' | 'security'`
  - `Node` and `Participant` gain `look: Look`; `Message` gains `short?: string; reply?: boolean`; `Sequence` and `StoreFlow` gain `summary?: string`
  - `Meta` gains `name?: string; intro?: string`
  - `Section` gains `role?: 'what' | 'parts' | 'request' | 'code'; lead?: string; notOwned?: Bullet[]`
  - `type GlossaryTerm = Evidenced & { id: string; term: string; aliases?: string[]; tag: 'model' | 'service' | 'job' | 'store' | 'message' | 'external' | 'concept'; meaning: string }`
  - `type CodeMapEntry = Evidenced & { id: string; root: string; path: string; owns: string }`
  - `Model` gains `glossary: GlossaryTerm[]; codeMap: CodeMapEntry[]`; `Model['schemaVersion']` is `2`
  - `ItemKind` gains `'term' | 'code'`; `handleOf('term', id) === 'term:' + id`, `handleOf('code', id) === 'code:' + id`
  - `SCHEMA_VERSION = 2`
- `notOwned` bullets are items of kind `bullet` (same handle space as section bullets).

**Not this task:** section merge and the relaxed `required` on `section` (task 02); every count or length floor (task 03); `migrate` (task 04).

**Seam:** the `system-flow` CLI run as a process.

**Tests:** fixture `goodSet()` at version 2 unless stated.
- Version 2 passes: `check` exits 0, stdout `ok` is `true`.
- Version-1 set: `goodSet()` with `meta.json` at `schemaVersion: 1` and `level0.json` whose nodes lack `look` (the set holds `meta.json`, `level0.json` and `chapters.json`): exit 1, stderr is exactly three lines, in this order: `docs/system-flow/model/fragments/meta.json:/schemaVersion: schemaVersion 1: run system-flow migrate`, `docs/system-flow/model/fragments/level0.json:: schemaVersion 1: run system-flow migrate` and `docs/system-flow/model/fragments/chapters.json:: schemaVersion 1: run system-flow migrate` (no `look` problem).
- One stale fragment: version-2 `meta.json` and `chapters.json` holding `"schemaVersion": 1`: exit 1, stderr exactly `docs/system-flow/model/fragments/chapters.json:/schemaVersion: schemaVersion 1: run system-flow migrate`.
- Newer than the CLI: `schemaVersion: 3` keeps today's message `schemaVersion 3 is newer than this CLI (2)`.
- Missing look: node `db` without `look`: stderr `docs/system-flow/model/fragments/level0.json:/levels/diagrams/0/nodes/1: required property look missing`.
- Bad look: `look: "database"`: stderr ends `/levels/diagrams/0/nodes/1/look: value "database" not in enum`.
- Message `short` of 27 characters: stderr ends `/short: longer than 26 characters`.
- Glossary tag `"thing"`: stderr ends `/glossary/0/tag: value "thing" not in enum`.
- Code map `path: "app"` (no trailing slash): stderr ends `/codeMap/0/path: does not match ^(?!/)(?:[^/]+/)+$`.
- Items: with a `glossary.json` holding term `link` (evidence `app/x.rb` `1-4` `Link`) and a code map entry `app` (`root: "backend"`, `path: "app/"`, evidence `[{ "path": "app/" }, { "path": "app/x.rb", "lines": "1-4", "symbol": "Link" }]`), `check` exits 0 and stdout `items` is 2 more than for `goodSet()` alone; `query app/x.rb` stdout `items` holds entries with `handle` `term:link` and `code:app`.
- Evidence: term `link` with lines `40-41` exits 1 with the problem at `docs/system-flow/model/fragments/glossary.json:/glossary/0/evidence/0` carrying the same message `system-flow-evidence.test.ts` asserts for a range past the end of the file.
- Verify: `verify term:link` exits 0 and its `verified` list holds `term:link`; `verify thing:link` still exits 2.
- Stale: after `build`, edit line 2 of `app/x.rb` and commit; `stale` lists `term:link` and `code:app` under root `backend`.

**Risks:** the 15 test files change only in version and `look`; a reviewer rejects any other edit there.

**Testing:** CLI process tests.

## Acceptance criteria
- [ ] A version-2 model with glossary and code map entries checks and builds.
- [ ] A version-1 set gives one hint line per fragment and nothing else.
- [ ] `term:` and `code:` items are verified, stamped, queried and listed stale like every other item.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names**

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node scripts/system-flow-check.test.js` and `... node scripts/system-flow-stale.test.js`
Expected: version 1 still passes; `glossary` is `property glossary not allowed`.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: `OK` from both.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`

- [ ] **7. Commit this task's paths on `system-flow`**

```
git add -- references/system-flow/system-model.schema.json src/lib/sf-model.ts lib/sf-model.js src/lib/sf-rules.ts lib/sf-rules.js src/tests/helpers/sf-fixture.ts tests/helpers/sf-fixture.js src/scripts/system-flow-*.test.ts scripts/system-flow-*.test.js
git commit -m "feat(system-flow): schema version 2 with look, glossary and code map items"
```

Never push, merge or open a PR.
