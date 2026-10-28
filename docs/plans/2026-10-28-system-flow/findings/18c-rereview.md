# Task 18c fix round 1: controller re-review (4 production lines in src/lib/sf-rules.ts)

### Finding verdicts

- Important, cleanup deletes another diagram's pages: ADDRESSED. check now rejects a sequence or flow id ending in -p and digits, so seq-a-p2 can only be a page of seq-a; the cleanup regex matches only the diagram's own name and its -p pages, pinned by a test that fails when the match is widened.
- Confirmed ⚠️, viewport numbers: ADDRESSED in the report, which cites archify's file and line for each number (claim not re-opened by the controller).

### New breakage in the fix diff

- None found.

## Ledger lines

Task 18c: fix round 1/5: controller re-review (4 lines): 2 addressed, 0 open
Task 18c: minor (deferred): fragment-guide.md does not state that sequence and flow ids may not end in -p and digits; agents learn it from the check error.
