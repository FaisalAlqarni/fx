### Finding verdicts

- **1. Rulings past the cap dropped silently**: ADDRESSED. lib/plan-state.js:73-75 appends `…and N more in docs/plans/rulings.md or the ledger's Standing rulings section.` when all.length > MAX_RULINGS; test plan-state.test.js:127-130. The 160-char cut still can remove a `Why:` (reported unchanged, see out-of-scope).
- **2. readText hides unreadable files**: ADDRESSED. lib/plan-state.js:31-36 reports non-ENOENT as `(could not read <relpath>: <code>)`; covers rulings.md and each ledger (line 56). Tests :133-138 (EISDIR named, absent not reported).
- **3. Parser accepts one shape only**: ADDRESSED. Regex at :57 takes `##`/`###` heading and ends at `#{1,3}`; asRuling :39-43 strips `- `/`* ` bullets and `**` bold. Test :141-146 covers all three drifts and log exclusion. Section-found-zero-rulings still silent (see out-of-scope).
- **4. standingRulings outside try/catch**: ADDRESSED. :98-99 wraps call, loses only rulings. Test :149-156 forces a throw via path.relative and checks plans block survives; report says it failed without the try/catch.

Check run: `node lib/plan-state.test.js` -> 41 passed, 0 failed (focused, specific doubt: test 4 mock also hitting scan; path.relative is not used in scan, so fine).

### New breakage in the fix diff

None. Notes lines (`…and N more`, `could not read`) are appended to the string[] and rendered as `- ` bullets; short, budget impact small (report says preamble test OK). Return shape now holds non-`Ruling:` entries; documented in the comment at :47.

### Out-of-scope observations

- lib/plan-state.js:87 (unchanged): a ruling over 160 chars is cut with `…` and can lose its `Why:` or qualifier.
- lib/plan-state.js:57-58 (unchanged): a Standing rulings section that yields zero rulings is still not reported.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ledger lines

Task 04: fix round 1/5 (4 addressed, 0 open: none; commits 943f8c5..9575f4c)
Task 04: minor (deferred): a ruling over 160 characters is cut with an ellipsis and can lose its Why: or qualifier
Task 04: minor (deferred): a Standing rulings section that yields zero rulings is not reported in the block
