### Finding verdicts

- **Security 1: judge-review reads and sends secret files named by a hostile package; ruling: never read them, report them unchecked in every subcommand**: NOT ADDRESSED (partly fixed). `secretPath` (src/lib/judge-review.ts:67-71) covers `.env`, `.env.*`, `.npmrc`, `*.pem`, `*.key` (so `config/master.key`), `id_rsa*`, `id_ed25519*` and any `.git` path segment. Test data includes `config/master.key` and `.git/config`. `authored` skips them before any read or request (:231, :233) and they fall to `unchecked` at :250 when the judge is ready. `search` emits a `blocked` unit that is never read or sent and is listed unchecked (:258-261, `u.blocked` branch). Those two are fixed. `tripwires` is not: line 209 filters secret files out of `diffChunks` and nothing records them. The tripwires result is lens-level (`{ named, add, unchecked }`, :226), so the file is not reported anywhere. A diff holding only secret files sends no request and returns `add=[]`, `unchecked=[]`, which reads as "checked, nothing found". That breaks the ruling's "reported unchecked in every subcommand". The new test only asserts `reqs.length === 0` for tripwires (src/tests/gates/judge-review.test.ts, last assertion of the added block), so it does not catch the silent drop.

### New breakage in the fix diff

- **Important**: src/lib/judge-review.ts:209: the tripwires filter drops secret files with no unchecked signal (same defect as above, counted once as the open finding). Fix shape: when any `files` entry is `secretPath`, add every name in `names` to `unchecked` (unless already in `add`) when the judge is enabled, and assert that in the test.
- Otherwise none. The `.git` rule is a segment match, so `.gitignore` and `.github/` are not caught, which matches the ruling's `.git/`.

### Out-of-scope observations

- Minor: lens-security finding 2 (unescaped paths and function names in output) is Minor and untouched by this fix.

### Verdict

**Fix round:** Findings remain open: security 1 (tripwires silently drops secret files instead of reporting them unchecked).

Tests: the report was not re-run. The new test block covers authored and search (including master.key and .git/config) and shows no request is sent for tripwires, but asserts no unchecked output for tripwires.

## Ledger lines

Task 11: fix round 1/5 (0 addressed, 1 open: security 1 tripwires silently drops secret files, not reported unchecked; commits 0ea1187..136276d)
Task 11: minor (deferred): lens-security finding 2, unescaped file paths and function names in judge-review output
