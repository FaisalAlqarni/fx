# Task 03, silent-failure lens (task mode), 2026-09-23

Controller verified each citation against tests/fixture-build at 74e7b06.

1. Critical per lens. rows/01-fixture-build.sh:106-108: the node -e that counts merge defects has no failure check; on a throw, n is empty and MERGE=$((MERGE + n)) adds nothing, so the row exits 0 with mergeDefects understated.
2. Important. rows/01-fixture-build.sh:56: the worktree list pipeline's status is not checked; a jgit failure yields an empty BUILD, which reads as built on main.
3. Important. rows/01-fixture-build.sh:93 and :97: the node -e calls that read a head SHA from HEADS and merge AT_HEAD are unchecked; a parse failure scores the task unknown (93) or empties the accumulator (97) instead of failing the row.
4. Important. hidden/traps.test.js:115-117: catch maps every exception to false without distinguishing a scorer bug (fresh, TRAPS lookup) from the build's own failure; a harness crash reads as a missed trap.
5. Minor. rows/01-fixture-build.sh:43: SEED rev-parse unchecked, unlike the file's other git calls.

Controller note: the merge-defect loop reads the ledgers with `cat ... 2>/dev/null` (line 110); a missing ledger is legitimate before task 11, but a present unreadable one would read as no parallel tasks.
