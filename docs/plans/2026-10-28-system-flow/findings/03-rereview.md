# Task 03 fix round 1: controller re-review (15 production lines in src/lib/sf-evidence.ts)

### Finding verdicts

- Important 1, non-git root paths escape the root: ADDRESSED. src/lib/sf-evidence.ts adds `inside`, which resolves against root.dir and returns null unless the input is relative and the result stays under root.dir; readCited and folderExists use it; verifyEvidence rejects an absolute path or a .. segment before any fs or git call, for every root kind. Tests cover a .. path and an absolute path in the plain root and a .. path in a git root.

### New breakage in the fix diff

- None found. `inside` fails closed if root.dir were ever relative or carried a trailing separator; roots are resolved by task 03's loader, so this only matters if a later task builds Root by hand.

## Ledger lines

Task 03: fix round 1/5: controller re-review (15 lines): 1 addressed, 0 open
