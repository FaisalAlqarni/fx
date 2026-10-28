### Finding verdicts

- **[Important] silent dead deep link under `--only` when no page is on disk (07-lens-silent-failure.md, sf-build.ts:377-379)**: ADDRESSED. src/lib/sf-build.ts:378-380 now pushes a `level: 'warning'` problem naming the figure and the missing `diagrams/<base>.html` in the else branch of the `name !== undefined` check. `result.ok` is set only at line 396 and error-level problems alone block it, so the build still succeeds and the page is written. The case is no longer silent in the build result. New test src/scripts/system-flow-only.test.ts (end of file) pins the exit status 0, the `Open full diagram` link and the exact three warnings. The report shows RED then GREEN and a test_scope run.
- 07-review.md: Minors only, none open.

### New breakage in the fix diff

Minor: src/lib/sf-build.ts:380. The warning reaches stdout JSON `problems` only; the CLI prints only error-level problems on stderr (as the report states), so a human running the CLI does not see it unless they read the JSON. This is consistent with other build warnings. The card label is unchanged and does not mark the dead link.

### Out-of-scope observations

None.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ledger lines

Task 07: fix round 1/5 (1 addressed, 0 open: none; commits a7142ce..8c7c456)
Task 07: minor (deferred): missing-deep-page warning shows only in the stdout JSON, not on stderr
