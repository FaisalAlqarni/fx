### Finding verdicts
- Critical (task review), option injection through `--diff` and `--base` refs: ADDRESSED. `changedPaths` at src/lib/sf-stale.ts:50-52 resolves the ref with `resolveCommit` (src/lib/sf-evidence.ts:20-25: refuses empty, leading dash, white space or NUL; then `rev-parse --verify --quiet --end-of-options <ref>^{commit}`; accepts only a 40-hex result). Git then sees `<sha>...HEAD` followed by `--`. Test block in src/scripts/system-flow-stale.test.ts runs `query --diff --output=<file>` and `--base guide=--output=<file>` and asserts exit 1 with no file written.
- Important (task review) and security lens [Important] 1, the same injection: ADDRESSED. Covered by the Critical fix above, plus the `verified` path in the next line.
- Important (task review), fragment `verified` values reaching git unvalidated: ADDRESSED. `loadModelItems` (src/lib/sf-stale.ts, after `itemsOf`) throws unless every `verified` value matches `COMMIT`, so `cat-file -e` (sf-stale.ts:75 and :110), `rev-list --no-walk` (:77) and checkPath's `${verified}:${p}` and `diff ... verified HEAD -- p` (src/lib/doc-index.ts:91-92) only get 40-hex input. Test sets `verified.backend` to `--output=<file>` and asserts `stale`, `query --diff main` and `verify node:link` all exit 1 with "is not a 40-character commit" and no file.
- Ref audit of every git call: src/lib/sf-evidence.ts uses fixed args or `HEAD`/`HEAD:<file>`; src/lib/sf-stale.ts:52 resolved sha plus `--`; src/lib/doc-index.ts:90-92 `HEAD:p` is a revision not an option, verified is 40-hex, path after `--`; src/lib/sf-markdown.ts:75 `rev-list --count` now guarded by `COMMIT.test`; src/scripts/system-flow.ts:71 fixed args. No unvalidated ref remains.
- Tests: the report records RED (`query --diff --output=<file>` exited 0, `0 !== 1`) and GREEN. I ran `node scripts/system-flow-stale.test.js` in the scratch env: `system-flow-stale.test.js: OK`.

### New breakage in the fix diff
- Minor: a `verified` value that is not 40-hex (for example a short sha in a hand-edited fragment) used to degrade to "unverified" in `stale` and `query`; it is now a hard error that stops the whole command (src/lib/sf-stale.ts `loadModelItems`). Probably intended and the message names the file and handle, but it is stricter than before.
- Minor: a bad `--diff` or `--base` ref surfaces as a thrown error in `changedPaths` (exit 1 per the test) rather than a usage error (exit 2) as the original review suggested. Acceptable.
- Critical: none. Important: none.

## Ledger lines
Task 13: fix round 1/5 (3 addressed, 0 open: none; commits 371f5ce..c66b2e9)
Task 13: minor (deferred): non-40-hex `verified` in a fragment now aborts stale, query and verify instead of reading as unverified.
Task 13: minor (deferred): a bad `--diff` or `--base` ref exits 1 from a thrown error, not the usage exit 2.
