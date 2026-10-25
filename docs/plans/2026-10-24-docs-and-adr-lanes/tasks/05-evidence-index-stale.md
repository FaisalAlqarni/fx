# 05: Evidence lines, reverse index and stale pass one

**Status:** ready-for-agent
**Blocked by:** 01, 03
**Phase:** C: Docs lane and wiring

**What to build:** a doc claim carries an evidence line a reader and a parser both accept. One command, `scripts/docs-index`, builds a reverse index from code path to the doc claims and ADR decisions citing it, writes it to `.fx/docs-index.json`, rebuilds it whenever the docs changed, answers "which claims cite these paths" with superseded ADR decisions left out, and runs the stale check's first pass: a claim whose cited lines are unchanged since the doc's last verified commit passes free, every other claim is listed for re-reading with the reason. A repo with no evidence lines gets an empty index and no error; a repo with no `docs/` gets an empty answer and no `.fx/` written.

**Design:** Phase C: docs lane; Phase C: lanes read the docs; Testing Decisions

**The evidence line (decision; task 06 teaches it):**

```markdown
Shortlinks expire after 90 days unless the plan says otherwise.
Evidence: `engines/shortlink/app/models/link.rb:40-58` `Link#expired?`; `config/plans.yml:12`

The product is sold to banks and financing companies in KSA.
Evidence: owner, 2026-10-23

<!-- fx-docs verified: 3f2c1a9e0b7d4c6a8e1f2b3c4d5e6f708192a3b4 -->
```

- `Evidence:` starts the line, after optional indentation (an ADR decision) or `> ` (a callout). Items are separated by `; `.
- A path item: a backticked `path`, `path:N` or `path:N-M`, optionally followed by a backticked symbol. A path with no lines cites the whole file.
- An owner item: `owner, YYYY-MM-DD`.
- The claim is the paragraph or list item directly above the evidence line, its lines joined with single spaces (for a numbered ADR decision, the whole decision item).
- Lines inside fenced code blocks are never read: no claim, no evidence, no problem.
- The verified marker is an HTML comment anywhere in the doc outside a fence, a full 40-hex commit.
- A doc is any `docs/**/*.md` outside `docs/plans/`, `docs/issues/` and `docs/html/`. A claim is `kind: 'adr'` when its doc path has an `adr` or `decisions` folder segment. An ADR doc's status is `superseded` when its status line (a `Status:` line, the first line of a `## Status` section, or a `- **Status:**` bullet) contains "superseded by", case-insensitive; every other claim's status is `current`.

**Files:**
- Create: `src/lib/doc-evidence.ts`, `src/lib/doc-evidence.test.ts`, built to `lib/doc-evidence.js`, `lib/doc-evidence.test.js`
- Create: `src/lib/doc-index.ts`, `src/lib/doc-index.test.ts`, built to `lib/doc-index.js`, `lib/doc-index.test.js`
- Create: `src/scripts/docs-index.ts`, built to `scripts/docs-index` (extensionless, mode 755)
- Modify: `scripts/build` (add `scripts/docs-index.ts` to the extensionless case), `src/scripts/test-scope.ts` (add it to `EXTENSIONLESS`), built to `scripts/test-scope`
- Modify: `scripts/check-all` (`run doc-evidence.test.js node lib/doc-evidence.test.js` and `run doc-index.test.js node lib/doc-index.test.js`, after `evidence.test.js`)

**Interfaces:**
- Produces, `lib/doc-evidence.js`:
  - `type Evidence = { type: 'path'; path: string; start: number | null; end: number | null; symbol: string | null } | { type: 'owner'; date: string }`
  - `type Claim = { doc: string; line: number; text: string; kind: 'doc' | 'adr'; status: 'current' | 'superseded'; evidence: Evidence[] }` (`line` is the evidence line, 1-based)
  - `type Problem = { doc: string; line: number; message: string }`, message exactly `malformed evidence line: <the line, trimmed>`
  - `parseDoc(doc: string, text: string): { claims: Claim[]; problems: Problem[]; verified: string | null }`
- Produces, `lib/doc-index.js`:
  - `type DocIndex = { version: 1; claims: Claim[]; problems: Problem[]; verified: Record<string, string | null> }`
  - `buildIndex(root: string): DocIndex`
  - `loadIndex(root: string): DocIndex`: with no `<root>/docs/`, returns the empty index and writes nothing. Otherwise reads `<root>/.fx/docs-index.json` and rebuilds and rewrites it when it is missing, unreadable, older than any doc's mtime, or its `verified` keys differ from the current set of docs.
  - `queryIndex(index: DocIndex, paths: string[]): Claim[]`: a `current` claim matches when one of its path items equals a queried path, lies under a queried directory, or is a directory the queried path lies under; `superseded` claims never match; order by doc, then line; no duplicates.
  - `type Stale = { claim: Claim; verdict: 'free' | 'recheck' | 'skip'; reason: 'unchanged' | 'changed' | 'shifted' | 'deleted' | 'unverified' | 'owner' | 'superseded' }`
  - `stalePassOne(root: string, index: DocIndex): Stale[]`: superseded claims `skip`/`superseded`; owner-only claims `skip`/`owner`; a doc with no marker, or whose marker fails `git cat-file -e <sha>^{commit}`, `recheck`/`unverified`; for each path item, with `git diff -U0 <verified> HEAD -- <path>`: file gone at HEAD `recheck`/`deleted`; a hunk's old range overlaps the cited lines (any hunk, for a whole-file citation) `recheck`/`changed`; a non-zero net line shift above the cited range `recheck`/`shifted`; otherwise `free`/`unchanged`. The worst item decides the claim.
- Produces, `scripts/docs-index [--root <dir>] build | query [--limit <n>] <path>... | stale`: JSON on stdout (`build`: the index; `query`: `{ "claims": Claim[], "more": <n> }`, at most `--limit` claims, default 20, `more` counting the rest; `stale`: the `Stale[]`); each problem on stderr as `<doc>:<line>: malformed evidence line: <text>`; exit 0 with problems, 2 on a usage error with `docs-index: usage: docs-index [--root <dir>] build | query [--limit <n>] <path>... | stale`.

**Seam:** `parseDoc`, `buildIndex`, `loadIndex`, `queryIndex` and `stalePassOne` called from the tests; the command process for `--limit` and the usage error.

**Tests:**
- `parseDoc` on the path example: one claim, `text` `Shortlinks expire after 90 days unless the plan says otherwise.`, `status: 'current'`, evidence `[{ type: 'path', path: 'engines/shortlink/app/models/link.rb', start: 40, end: 58, symbol: 'Link#expired?' }, { type: 'path', path: 'config/plans.yml', start: 12, end: 12, symbol: null }]`.
- `parseDoc` on the owner example: evidence `[{ type: 'owner', date: '2026-10-23' }]`.
- `parseDoc` on `Evidence: link.rb line 40` at line 7 of `docs/a.md`: no claim; problems `[{ doc: 'docs/a.md', line: 7, message: 'malformed evidence line: Evidence: link.rb line 40' }]`.
- `parseDoc` returns `verified` `3f2c1a9e0b7d4c6a8e1f2b3c4d5e6f708192a3b4` from the marker, and `null` without one.
- Fence: the path example inside a fenced block gives no claims, no problems and `verified: null`.
- Wrapped decision: `docs/adr/0002-x.md` with decision line `1. Keep Postgres as the source`, an indented continuation line `of truth.`, and an indented evidence line citing `db/schema.rb:1-9`: one claim, `kind: 'adr'`, `text` `1. Keep Postgres as the source of truth.`
- Superseded ADR: `docs/adr/0001-x.md` with `Status: superseded by 0002 (replaced: decisions 1; the rest carried forward).` and an evidence line: its claim has `status: 'superseded'`, and `queryIndex` on its path returns only the `current` claims of `0002`.
- `buildIndex` on a fixture tree (`docs/arch/overview.md` with two claims, `docs/adr/0002-x.md` as above, `docs/plans/p/design.md` with an evidence line): three claims, none from `docs/plans/`.
- `queryIndex(index, ['engines/shortlink'])` returns the claim citing `engines/shortlink/app/models/link.rb`; `queryIndex(index, ['app/other.rb'])` returns `[]`.
- Empty case: `buildIndex` on a tree with `docs/readme.md` and no evidence lines returns `{ version: 1, claims: [], problems: [], verified: { 'docs/readme.md': null } }`.
- No docs: `loadIndex` on a tree with no `docs/` returns the empty index and `.fx/` does not exist afterwards.
- Cache: `loadIndex` writes `.fx/docs-index.json`; after a doc's mtime moves past the index's, the rebuilt claims return; after a doc is deleted, its claims are gone from the next `loadIndex`.
- `stalePassOne` on a git fixture: `scripts/make-git-fixture <dir under os.tmpdir()>`, the printed main checkout, commits made from node with `git -c user.name=t -c user.email=t@t commit`; a code file and a doc citing lines 3-4 with the marker set to that commit; then one change per case: unchanged `free`/`unchanged`; edit line 4 `recheck`/`changed`; insert a line at line 1 `recheck`/`shifted`; delete the file `recheck`/`deleted`; no marker `recheck`/`unverified`; marker `0000000000000000000000000000000000000000` `recheck`/`unverified`; owner-only claim `skip`/`owner`; superseded ADR claim `skip`/`superseded`.
- `scripts/docs-index --root <tree with 25 matching claims> query --limit 20 <path>` prints 20 claims and `"more": 5`.
- `scripts/docs-index frob` exits 2 and prints the usage line on stderr.

**Risks:** the git fixture's main checkout has no commits; the test makes its own. Keep every fixture under `os.tmpdir()`, which `scripts/scratch-env` points into the scratch home.

**Idempotency:** `loadIndex` overwrites `.fx/docs-index.json` whole on each rebuild; reruns give the same file for the same docs.

**Testing:** unit tests beside the code, part of `check-all`.

## Acceptance criteria
- [ ] `node lib/doc-evidence.test.js` and `node lib/doc-index.test.js` pass, and both run in `check-all`.
- [ ] `scripts/docs-index --root <fixture> query engines/shortlink` prints the matching claim as JSON.
- [ ] `scripts/check-handwritten-js` and `scripts/check-generated` pass with the new extensionless script.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/lib/doc-evidence.test.ts` and `src/lib/doc-index.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node lib/doc-evidence.test.js`
Expected: fails because the modules do not exist.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node lib/doc-evidence.test.js` and `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node lib/doc-index.test.js`. Expected: both pass.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-generated`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/lib/doc-evidence.ts src/lib/doc-index.ts src/scripts/docs-index.ts src/scripts/test-scope.ts`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-handwritten-js`

- [ ] **7. Commit by path**

```
git add src/lib/doc-evidence.ts src/lib/doc-evidence.test.ts lib/doc-evidence.js lib/doc-evidence.test.js src/lib/doc-index.ts src/lib/doc-index.test.ts lib/doc-index.js lib/doc-index.test.js src/scripts/docs-index.ts scripts/docs-index scripts/build src/scripts/test-scope.ts scripts/test-scope scripts/check-all
git commit -m "feat(lib): evidence lines, a reverse index from code path to doc claims, stale pass one"
```
