# Task 10 fix round 1: controller re-review

Fix diff 703a0e2..5869cc5: baseline.md only, 9 lines changed, no test file touched; qualifies under fix-loop.md's small-fix rule.

### Finding verdicts

1. Codex 07, 15, 18 missing the 429 evidence: ADDRESSED. Each now carries its original verdict, the mark "inconclusive: provider rate limit inside a subagent; runner did not fall back", and the log file.
2. v2 15 and 18 not marked inconclusive: ADDRESSED. Both marked inconclusive with the log evidence (15: session interrupted after a question tool in headless mode; 18: control agent never dispatched at depth 0). 04 and 17 also marked unconfirmed or inconclusive with their evidence.

### New breakage in the fix diff

None. `grep -c 'sk-or-'` on baseline.md prints 0.

## Ledger lines

Task 10: fix round 1/5: controller re-review (0 production lines, 18 doc lines): 2 addressed, 0 open
