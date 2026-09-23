# Task 03b re-review 2 (fix rounds 2 and 3, ledger Ruling S)

Scope: the two fix commits 8737a9c (round 2) and 470cf25 (round 3) in
tests/review-bench, per docs/plans/2026-09-23-lean-build/.fx/03b/review/r2r3.diff.
Verified by running node tests/review-bench/build-case.test.js and
node tests/review-bench/score.test.js (both exit 0, all green), by
reproducing review-package's base/head diff for several cases in a scratch
git repo, by running node --test directly against the constructed trees, and
by reading the fixture task files (01, 03, 05, 06) and diffing their fenced
test blocks against the case files byte for byte.

### Finding verdicts

Item 1 (round 2, Ruling S): addressed. Every case's files/ now carries the
fixture task's own test file, byte identical to the fenced block in the
task's own task file (confirmed with a direct diff against
tests/fixture-build/repo/docs/plans/2026-01-01-notes/tasks/{01,03,05,06}-*.md
for all nine cases). build-case.test.js proves the test file is absent at
base and present at head for every case. Reproducing review-package's diff
for path-no-check, cli-inline-search, and others shows exactly the
implementation file plus the test file changed, matching each task's own
Files list (create vs modify tracks correctly, for example cli.js shows as
modified for cli-inline-search since it exists at base). The [REPORT_FILE]
content (rows/01-review-bench.sh) now runs the real node --test for the
case's own test file and writes the actual "# pass N # fail N" summary.
Running node --test directly against every case's constructed tree confirms
all nine now report 0 failures, so the report always states a genuine
passing line and never names the defect, the binary, or any rule.

Item 2 (round 3): addressed. tests/review-bench/good/README.md gained a
"## Usage" section with the NOTES_DIR sentence; running test/readme.test.js
against it passes all three assertions. The readme-binary case's README
differs from good/README.md in exactly two lines (node cli.js -> notes on
the add and show lines), confirmed with a direct diff; everything else,
including the new Usage heading and NOTES_DIR sentence, is identical. The
case still carries only its one planted defect.

Check also: build-case.test.js's EXPECTED map and its "head scores the
expected trap, and only that one" assertion (which passed for all nine
cases) confirm every case's own trap reads false under
tests/fixture-build/hidden/traps.test.js, every other trap reads true, and
control reads all six true. The same file's "the task's own given test at
head" assertion, unconditional across all nine cases after round 3 removed
the readme-binary exception, confirms every case's own example test passes
on the defective version: none of the nine planted defects is something the
task's own visible test would have caught.

### New breakage in the fix diff

None found. Both permitted test commands pass. The diff (b7d1091..470cf25,
filtered to tests/review-bench, scripts/check-all, and
tests/conformance/lib/live.sh) touches only build-case.test.js, the nine
cases' new test/*.test.js files, the two README.md files, and
rows/01-review-bench.sh; no other file in that commit range carries
review-bench content. The removed GIVEN_TEST_EXPECTED_TO_FAIL exception has
no leftover references anywhere in tests/review-bench.

### Out-of-scope observations

- tests/review-bench/good/README.md now deliberately diverges from
  tests/fixture-build/hidden/traps.self-test.js's own good['README.md'],
  which still has no "## Usage" heading. The round 3 report names this
  divergence explicitly and states it is intentional and scoped to
  tests/review-bench. It does not break scoring (the bench's own
  traps.test.js run is against the bench's own good tree, not
  traps.self-test.js's), so it is noted only so a future reader does not try
  to reconcile the two.
- While reading rows/01-review-bench.sh, a hook reported the file had
  changed on disk since an earlier read in this session, not through any
  edit I made. The content on the second read matched what the r2r3.diff
  already showed, so this looks like concurrent activity elsewhere in the
  shared worktree (other lanes are active per state.md) rather than a
  substantive change; flagged for awareness, not a finding against this
  task.
- Deferred minors already on record from earlier rounds (GLOBAL_CONSTRAINTS'
  joining label is not verbatim from either source, score.js's dash-bullet
  heuristic) are unchanged by rounds 2 and 3 and outside this re-review's
  two items.

### Verdict

Both items under verification are addressed with no open gaps and no new
breakage. The bench's diffs now read as real fx task diffs (implementation
plus its own test file, nothing else), the reports are honest and hint at
nothing, and the check-also conditions (per-case trap isolation, control all
true, example tests blind to the planted defects) all hold under direct
verification.
