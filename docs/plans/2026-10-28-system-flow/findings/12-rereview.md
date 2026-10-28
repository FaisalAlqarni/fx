# Task 12 fix round 1: controller re-review (3 production lines in src/lib/sf-build.ts, carried in f6c1d59; test in ea595fb)

### Finding verdicts

- Spec ❌ and Important, prefer cheap overrode an explicit --archify: ADDRESSED. build now takes opts.archify first and skips only the lookup when prefer is cheap; svgReason reports preference cheap only when no --archify was given. The archify test (saved cheap plus --archify runs 5 calls) failed first with 0 !== 5 and now passes.

### New breakage in the fix diff

- None found.

## Ledger lines

Task 12: fix round 1/5: controller re-review (3 lines): 1 addressed, 0 open
