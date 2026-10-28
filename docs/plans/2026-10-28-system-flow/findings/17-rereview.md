# Task 17 fix round 1: controller re-review (7 production lines in src/lib/sf-build.ts)

### Finding verdicts

- Spec ❌ and Important, --only stamped every unverified item: ADDRESSED. selectOnly returns the selected handle set and build stamps only items in it when --only is given; a full build still stamps all. The only test (an unverified item outside --only stays unverified) failed first and now passes.

### New breakage in the fix diff

- None found. Stamping is conservative: items inside a section or figure named only by a container handle are rebuilt but not stamped.

## Ledger lines

Task 17: fix round 1/5: controller re-review (7 lines): 1 addressed, 0 open
Task 17: minor (deferred): items inside a container named by --only (section:, diagram:, seq:, flow:) are rebuilt but not stamped verified.
