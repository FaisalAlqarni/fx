# Task 03 fix round 1: controller re-review (4c152d9, 8 lines in test code)

### Finding verdicts

- shell-guard-codex.test.js:121 raw comparison against the `<root>` golden: ADDRESSED. The assertion now compares `rootToToken(r.out, ROOT)` (src/tests/helpers/hook-env.ts, new helper mapping the realpath and the given root to `<root>`) to the unchanged fixture. Fix report: shell-guard-codex ok, hook-output-golden ok (41 cases), check-generated OK, test_scope green apart from the expected release-version gate.

### New breakage in the fix diff

None. Minor: the helper's comment reads "swap the real path in" where it swaps the path out for `<root>`.
