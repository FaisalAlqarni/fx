### Spec Compliance
- ✅ Spec compliant (queries, stale reasons, verify, added paths, ruling 22 shape). Rulings 1, 20, 21, 23 are test-side; only read from the diff, not re-run.
- ⚠️ Cannot verify from diff: ruling 20/21/23 fixtures (test file read only, not run).

### Strengths
- `checkPath` is exported with no behaviour change; its only new caller is sf-stale. verify checks all handles before any write, writes only changed fragments, and shares the merged objects like `stampVerified`. Argument arrays throughout, no shell.

### Issues
#### Critical (Must Fix)
- src/lib/sf-stale.ts `changedPaths` (git diff with `${base}...HEAD`): `base` comes from the CLI (`query --diff <base>`, `--base id=ref`) with no `--` and no dash check. A base such as `--output=/path/file` becomes the option `--output=/path/file...HEAD`, and git diff writes the diff to that file (arbitrary file write by a crafted ref or an fx-docs-supplied base). diffBases and `src/scripts/system-flow.ts` accept any non-empty text. Fix: reject a base starting with `-` (exit 2) and/or `git rev-parse --verify --end-of-options`; add a test.
#### Important (Should Fix)
- Same flaw in `diffBases`/`staleItems`: `verified` values from fragments go into `cat-file -e ${s}^{commit}`, `rev-list --no-walk=sorted ...seen` and checkPath's `${verified}:${p}` with no 40-hex check (sf-schema does not validate `verified`; sf-model.ts:12 only states it in a comment). A hand-edited fragment can inject an option. Validate `^[0-9a-f]{40}$` at load, or filter before use.
#### Minor (Nice to Have)
- `verifyItems` duplicates the fragment read/write loop of `stampVerified` (sf-model.ts:231) instead of reusing it.

### Assessment
**Task quality:** Needs fixes
**Reasoning:** Behaviour matches the brief, but a ref beginning with a dash is read as a git option (diff --output writes a file), a missed security tripwire; the report said Tripwires: none.

## Ledger lines
Task 13: minor (deferred): verifyItems repeats stampVerified's fragment read and write loop instead of reusing it.
