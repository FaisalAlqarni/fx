# 13: query, stale and verify

**Status:** ready-for-agent
**Blocked by:** 04
**Phase:** Core

**What to build:** the CLI tells the owner and fx-docs which model items to recheck. `query <path>...` lists the items whose evidence cites the given paths; `query --diff <base> [--base <root id>=<ref>]...` does the same for the paths changed in each root: the host between `<base>` and HEAD, every other root between its `--base` ref and HEAD, or, with no `--base` for it, between the oldest `verified` commit any item records for that root and HEAD (a root no item has verified yet is listed under `unbased`). It also lists, per root, the paths the diff added, so fx-docs can add inventory entries for new engines, jobs and integrations. Every item is named by its handle (plan.md Global Constraints). `stale` lists every item whose cited lines changed since the commit it was verified at, per root, with the reason (`shifted`, `changed`, `deleted`, `unverified`), using docs-index's line-level path check once per root. `verify <item id>... | --all` records each cited root's HEAD as the item's verified commit, after the agent has re-read it.

**Design:** Stale, query and the fx-docs branch step; The CLI; The model

**Files:**
- Create: `src/lib/sf-stale.ts`
- Modify: `src/lib/doc-index.ts` (export `checkPath`; behaviour unchanged)
- Modify: `src/scripts/system-flow.ts` (`query`, `stale`, `verify`)
- Create: `src/scripts/system-flow-stale.test.ts` (built to `scripts/system-flow-stale.test.js`)
- Modify: `scripts/check-all` (one line)

**Interfaces:**
- Consumes: `Item`, `itemsOf`, `handleOf`, `parseHandle`, `Root`, `resolveRoots` (tasks 01, 03); `stampVerified`'s fragment writing helpers (task 04).
- Produces: `export function checkPath(root: string, verified: string, p: string, start: number | null, end: number | null): 'unchanged' | 'shifted' | 'changed' | 'deleted'` from `src/lib/doc-index.ts`.
- Produces, `src/lib/sf-stale.ts`:

```ts
export function queryPaths(items: Item[], paths: string[], hostId: string): { handle: string; kind: ItemKind; file: string }[]; // a path is host-relative or `@<root id>/<path>`
export function changedPaths(root: Root, base: string): { changed: string[]; added: string[] }; // git diff --no-renames --name-status <base>...HEAD; `added` holds status A
export function diffBases(items: Item[], roots: Map<string, Root>, hostBase: string, given: Record<string, string>): { bases: Record<string, string>; unbased: string[] };
export function staleItems(items: Item[], roots: Map<string, Root>): Record<string, { id: string; reason: 'shifted' | 'changed' | 'deleted' | 'unverified' }[]>;
export function verifyItems(fragmentsDir: string, handles: string[] | 'all', roots: Map<string, Root>): string[]; // returns the handles written
```
- Produces, CLI stdout: `query <path>...` prints `{ "items": [...] }`; `query --diff` prints `{ "items": [...], "bases": { "<root id>": "<ref>" }, "unbased": [ids], "added": { "<root id>": [paths] } }`; `stale` prints `{ "roots": { "<root id>": [ { "handle", "reason" } ] } }` listing only items to recheck; `verify <handle>... | --all` prints `{ "verified": [handles] }`. An unknown handle in `verify` exits 1 with `system-flow: verify: no item <handle>` on stderr and writes nothing; a bare id without a prefix exits 2 with `system-flow: verify: <id> is not a handle (<kind>:<id>)`.

**Seam:** the `system-flow` CLI run as a process on the two-root fixture.

**Tests:** host `app/x.rb` of 20 lines; node `link` cites `lines: '10-12'` symbol on line 11; edge `system:link>db` cites `app/y.rb` `lines: '1-2'`; bullet `b2` cites the guide root; all verified by a first `build` (task 04 stamps them).
- Fresh: `stale` prints `{ roots: { backend: [], guide: [] } }`.
- Shifted: commit two lines inserted at the top of `app/x.rb`: `stale` lists `{ handle: "node:link", reason: "shifted" }` under `backend`.
- Changed: commit an edit to line 11: `{ handle: "node:link", reason: "changed" }`.
- Deleted: commit the removal of `app/y.rb` (`f.git('host', 'rm', '-q', 'app/y.rb')`): `{ handle: "edge:system:link>db", reason: "deleted" }`.
- Unverified: an item with no `verified`: `reason: "unverified"`; an item whose verified commit is not in the repo: `"unverified"`.
- Other root: commit a change to the guide's cited line: `bullet:b2` appears under `guide` with `changed`, and nothing under `backend` for it.
- Query by path: `query app/x.rb` prints the item `node:link` only; `query @guide/README.md` prints `bullet:b2`.
- Query diff, host: on a branch whose diff from `main` touches `app/y.rb` only, `query --diff main` prints items `[edge:system:link>db]` and `bases.backend` `"main"`.
- Query diff, other root by verified commit: after the first build, commit a change to the guide's `README.md` line 1 in the guide repo; `query --diff main` (no `--base`) prints `bullet:b2` too, and `bases.guide` equals the guide commit `b2` was verified at.
- Query diff, other root by `--base`: tag the guide's current HEAD `g0`, commit the change, then `query --diff main --base guide=g0` prints `bullet:b2` and `bases.guide` `"g0"`.
- Unbased: a third root no item has verified: it appears in `unbased` and contributes no items.
- Added paths: the branch adds `app/jobs/sweep_job.rb`: `added.backend` deep-equals `["app/jobs/sweep_job.rb"]` and the file is not in `items` (no item cites it).
- Verify: after the "changed" commit, `verify node:link` prints `{ verified: ["node:link"] }`, the fragment's `link.verified.backend` equals the new HEAD, and `stale` no longer lists it. `verify --all` stamps every item for every root it cites.
- Unknown handle: `verify node:ghost` exits 1, stderr `system-flow: verify: no item node:ghost`, fragments unchanged. `verify link` exits 2 with `system-flow: verify: link is not a handle (<kind>:<id>)`.
- docs-index: `node lib/doc-index.test.js` still passes with `checkPath` exported.

**Idempotency:** `verify` sets each value to the current HEAD; repeating it writes the same bytes.

**Testing:** CLI process tests; `doc-index.test.js`.

## Acceptance criteria
- [ ] `stale` reports per root with the four reasons, using docs-index's own path check.
- [ ] `verify` writes only the `verified` field of the named items.
- [ ] `query --diff` covers every root and lists added paths per root.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/scripts/system-flow-stale.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node scripts/system-flow-stale.test.js`
Expected: the three subcommands exit 2.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: `system-flow-stale.test.js: OK`.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/lib/sf-stale.ts src/lib/doc-index.ts src/scripts/system-flow.ts src/scripts/docs-index.ts`

- [ ] **7. Commit by path**

```
git add src/lib/sf-stale.ts lib/sf-stale.js src/lib/doc-index.ts lib/doc-index.js src/scripts/system-flow.ts scripts/system-flow src/scripts/system-flow-stale.test.ts scripts/system-flow-stale.test.js scripts/check-all
git commit -m "feat(system-flow): query, stale and verify per evidence root"
```

No attribution trailers. Then continue to the next task: never stop and wait.
