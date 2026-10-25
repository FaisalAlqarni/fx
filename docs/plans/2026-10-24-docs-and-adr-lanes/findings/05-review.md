### Spec Compliance

- ❌ Issues found: one violated ruling (below, Important). Every Tests-field case and every interface in the brief is present in the diff; the rest of the spec holds.
- ⚠️ Cannot verify from diff: task 06's lookup must not depend on the index file existing for a docs tree with no evidence lines (see Important 1); `.fx/` is ignored in this repo (`.gitignore:1`), but task 06 should check the same for a target repo, which is out of this range.

Checks I ran (scratch dirs under the owner TMPDIR, `scripts/docs-index` from HEAD):
- `docs/r.md` holding only prose, `docs-index --root <dir> query a.rb`: prints `{claims: [], more: 0}` and leaves `.fx/` behind. This is the Important 1 case.
- Corrupt cache `claims: [{}]` with a newer mtime: query returns empty, no crash.
- A four-backtick fence holding an inner three-backtick block: parsed without a spurious claim in both samples I tried (parity luck, see Minor 1).
- Read the stale logic hunk by hunk: pure insertion at line a (`oldCount 0`) is `changed` only when `start <= a < end`, `shifted` when `a < start`, free after the range; deletion and replacement hunks use the old range; whole-file citation returns `changed` on any hunk; worst item wins via RANK. All match the brief's rules.

Judgement of the five silent places and the shortcut:
1. Evidence line with no claim above is a problem: accepted. The brief defines a claim as the block above; reporting beats a silent drop and uses the exact message form.
2. Index written for docs with no evidence lines: not accepted, see Important 1. The `docs/` holding only `docs/plans/` half is correct and tested.
3. Path absent at the verified commit but present at HEAD is `recheck`/`changed`: accepted. The brief has no verdict for it; recheck is the safe side and the test pins it (`b.rb` case).
4. `build` always rewrites: accepted, matches "overwrites whole on each rebuild". The `shortcut:` at `src/lib/doc-index.ts:55` is in the required form and the limit is real but narrow: the cache is trusted past the shape check, so a hand-edited current claim with no `evidence` array would throw in `queryIndex` until a doc changes. The file is a gitignored cache the tool writes; acceptable as marked.
5. Bullet claim text keeps its marker: accepted. It matches the numbered-decision rule the brief states (`1. Keep Postgres ...`), so one rule covers both list kinds.

### Strengths

- Parser and index are small, split cleanly (`src/lib/doc-evidence.ts` pure parse, `src/lib/doc-index.ts` IO and git), and reuse `parseJson` from `lib/json.js`; nothing reimplemented that exists.
- Stale logic is correct on the edge cases that usually break: insertion at the range boundary, oldCount 0 hunks, whole-file citation, a path newly added since the marker, unreachable marker commit cached per sha.
- Tests use real git fixtures from `scripts/make-git-fixture` under `os.tmpdir()`, assert exact verdict/reason pairs, and add cases beyond the brief (edit below range stays free, worst item wins, unreadable cache rebuild, bad `--limit` path).
- `check-all`, `scripts/build` and `test-scope` wiring match the brief; no em or en dashes in added lines (grep over the added lines found none).

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
1. `src/lib/doc-index.ts:42-47` (`writeIndex`) · writes `.fx/docs-index.json` whenever any doc exists, so a repo with `docs/readme.md` and no evidence lines gets an index file on the first `query` or `stale` (reproduced). Violates the brief's ruling: "no Markdown with Evidence lines under docs/ outside docs/plans/ means no lookup, no docs step offer, and no .fx/docs-index.json written". The report admits it (decision 2). The test only covers docs holding `docs/plans/` alone (`src/lib/doc-index.test.ts` nodocs loop), so the ruling's broader case is unguarded. Fix: skip the write when `claims.length === 0 && problems.length === 0` (loadIndex then rebuilds each call, which is cheap for an index with no claims), and add `docs/readme.md` with prose to the nodocs loop asserting no `.fx/`.

#### Minor (Nice to Have)
1. `src/lib/doc-evidence.ts:13,40-46` · fence tracking records the marker (` ``` ` or `~~~`) but not its length, so a four-backtick fence whose body contains a three-backtick block closes early and the lines after it are read as live. fx-docs will teach the evidence format inside such fences, so this is likely to bite; fix by capturing the full run of backticks and closing only on a run at least as long.
2. `src/scripts/docs-index.ts` · the `stale` and `build` subcommands have no process-level test beyond `build` problem output; a one-line `stale` run over the git fixture would pin the JSON shape task 06 will read.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** The implementation matches the interfaces and tests, and the stale pass is correct, but `writeIndex` breaks the standing ruling that a docs tree without evidence lines writes no `.fx/docs-index.json`, and the test that should catch it covers only the plans-only case.

## Ledger lines

Task 05: minor (deferred): fence tracking ignores fence length, so a four-backtick fence containing a three-backtick block closes early
Task 05: minor (deferred): the `stale` subcommand and the `build` JSON output have no process-level test
