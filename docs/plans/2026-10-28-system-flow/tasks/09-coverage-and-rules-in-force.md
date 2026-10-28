# 09: Coverage report and Rules in force

**Status:** ready-for-agent
**Blocked by:** 04
**Phase:** Core

**What to build:** the owner sees what the site leaves out and which decisions still bind the code. `build` marks each inventory entry covered when an item in a chapter cites an overlapping range of the same file in the same root (or a path under a folder entry), or the chapter lists it in `covers`; it writes `<site>/model/coverage.json` and `coverage.md` with each entry's chapter or "not covered" and per-kind counts. `check` fails a rule whose ADR is superseded, deprecated or ignored, using the same status rule docs-index applies, and `build` writes `rules-in-force.md`.

**Design:** Coverage report; Rules in force; Renderers; Error handling

**Files:**
- Create: `src/lib/sf-coverage.ts`
- Modify: `src/lib/sf-rules.ts` (add `checkRuleAdrs`), `src/scripts/system-flow.ts` (call it in `check`)
- Modify: `src/lib/doc-evidence.ts` (export `adrStatus(text: string): 'current' | 'superseded'`, the status test `parseDoc` already applies), `src/lib/doc-evidence.test.ts`
- Modify: `src/lib/sf-markdown.ts` (`coverage.md`, `rules-in-force.md`)
- Modify: `src/lib/sf-build.ts` (write `coverage.json`; add `coverage` to `BuildResult`)
- Create: `src/scripts/system-flow-coverage.test.ts` (built to `scripts/system-flow-coverage.test.js`)
- Modify: `scripts/check-all` (one line)

**Interfaces:**
- Consumes: `Model`, `Item`, `itemsOf`, `readCited`, `Root` (tasks 01, 03); `renderMarkdown` (task 04).
- Produces, `src/lib/sf-coverage.ts`:

```ts
export type Coverage = {
  entries: { id: string; kind: 'engine' | 'flow' | 'store' | 'job' | 'integration'; name: string; chapter: string | null }[];
  counts: Record<'engine' | 'flow' | 'store' | 'job' | 'integration', { covered: number; total: number }>;
};
export function coverage(model: Model): Coverage;
export function sectionItems(model: Model, sectionId: string): Item[]; // bullets, its diagrams' nodes and edges, its sequences' participants and messages, its flows' steps, its storeRefs rows, its catalogueRefs
```
- Produces: `checkRuleAdrs(model: Model, roots: Map<string, Root>): Problem[]` in `src/lib/sf-rules.ts`, called by `check` after `resolveRoots` (the task 02 `checkRules` signature is unchanged).
- Produces: `adrStatus` in `src/lib/doc-evidence.ts`. `BuildResult` gains `coverage: Coverage['counts']`.

**Seam:** the `system-flow` CLI run as a process.

**Tests:**
- Range overlap: inventory `job-sweep` (kind `job`) cites `app/jobs/sweep.rb` `lines: '1-20'`; section `s1` has a bullet citing `app/jobs/sweep.rb` `lines: '10-12'`: `coverage.json` entry `{ id: "job-sweep", kind: "job", name: <its name>, chapter: "s1" }`.
- No overlap: the bullet cites `lines: '21-30'`: `chapter: null`.
- Same path, other root: the bullet cites `{root:'guide', path:'app/jobs/sweep.rb', ...}`: `chapter: null`.
- Folder: inventory `eng-a` (kind `engine`) cites `engines/a/`; a node in a diagram that section `s2` lists cites `engines/a/app/x.rb`: `chapter: "s2"`.
- `covers`: section `s3` lists `covers: ["int-sms"]` with no overlapping evidence: `chapter: "s3"`.
- First chapter wins: two sections both cover an entry: `chapter` is the first in section order.
- Counts: with the five entries above, `counts.job` is `{ covered: 1, total: 1 }` in the overlap case; `coverage.md` holds a table with header `| Kind | Name | Chapter |` and the row for an uncovered entry reads `not covered`; stdout `coverage` equals the counts.
- Rule in force: rule `r1` with `adr: { path: "docs/adr/0001-x.md" }` whose ADR has `Status: accepted, 2026-01-01`: `check` exits 0; `rules-in-force.md` lists `r1` with a link to the ADR and its decision.
- Superseded: the ADR's status is `Superseded by 0002 (replaced: 1; the rest carried forward)`: `check` exits 1 with a stderr line ending `rule r1: ADR docs/adr/0001-x.md is superseded`. `Deprecated` and `Ignored` give the same line.
- Partly superseded: `Partly superseded by 0002`: exit 0 (the docs-index rule).
- Missing ADR file: `... rule r1: ADR docs/adr/0009-gone.md not found`.
- `doc-evidence.test`: `adrStatus('# T\n\nStatus: Superseded by 0002\n')` is `'superseded'`; `adrStatus('# T\n\n## Status\n\nAccepted\n')` is `'current'`; `parseDoc` behaviour is unchanged (existing tests pass).

**Testing:** CLI process tests; `doc-evidence.test.js`.

## Acceptance criteria
- [ ] Every inventory entry appears in `coverage.json` with a chapter or `null`, and `coverage.md` with a chapter or "not covered".
- [ ] A rule citing a superseded ADR fails `check`.
- [ ] docs-index and the CLI share one ADR status test.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/scripts/system-flow-coverage.test.ts` and `src/lib/doc-evidence.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node scripts/system-flow-coverage.test.js` and `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node lib/doc-evidence.test.js`
Expected: no `coverage.json`; the superseded rule passes; `adrStatus` is not exported.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: both print OK.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/lib/sf-coverage.ts src/lib/sf-rules.ts src/lib/doc-evidence.ts src/lib/sf-markdown.ts src/lib/sf-build.ts`, then `node lib/doc-index.test.js` and `node scripts/system-flow-build.test.js` under the same prefix

- [ ] **7. Commit by path**

```
git add src/lib/sf-coverage.ts lib/sf-coverage.js src/lib/sf-rules.ts lib/sf-rules.js src/scripts/system-flow.ts scripts/system-flow src/lib/doc-evidence.ts lib/doc-evidence.js src/lib/doc-evidence.test.ts lib/doc-evidence.test.js src/lib/sf-markdown.ts lib/sf-markdown.js src/lib/sf-build.ts lib/sf-build.js src/scripts/system-flow-coverage.test.ts scripts/system-flow-coverage.test.js scripts/check-all
git commit -m "feat(system-flow): coverage report and Rules in force with a superseded-ADR check"
```

No attribution trailers. Then continue to the next task: never stop and wait.
