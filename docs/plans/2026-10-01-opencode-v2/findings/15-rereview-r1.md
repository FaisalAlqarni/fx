# Task 15 fix round 1: controller re-review

Fix diff b09e442..9d108eb: INSTALL.md and baseline.md only (the range also carries the controller's own b5f7630 ledger and findings commit). Docs only, from the task reviewer, not Critical, no test touched: qualifies for a controller re-review.

### Finding verdicts

1. Codex 16/18 stale: ADDRESSED. INSTALL.md's verified table reads Codex 18 pass, 0 fail, 0 GAP, with "rows 12 and 17 passed on the paid primary"; the "rows 12 and 17 are open" lines are gone; baseline.md's Final table matches.
2. OpenCode 1.18.25 inconclusive count: ADDRESSED. 14 in the table, explained as 12 fallback first attempts plus 2 from the re-run of rows 07 and 18.

### New breakage in the fix diff

None. The paid-listing caveat is stated in both files.

## Ledger lines

Task 15: fix round 1/5: controller re-review (0 production lines, docs only): 2 addressed, 0 open
