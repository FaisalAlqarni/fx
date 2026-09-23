#!/usr/bin/env bash
# The two live rows (review bench, fixture build) spend quota, so check-all
# never runs them. These are the static guarantees the final review asked
# for, checked on the row text:
#   - the bench's case commit never names the case (adversarial 1);
#   - each row hides its answer keys and $FX/.git from the session
#     (adversarial 2; jail_hide itself is proved in jail-probe.test.sh);
#   - host-side reads of files the session could write go through
#     live_regular, so a planted symlink or FIFO is refused (security 1, 5);
#   - a revision read from a model-written transcript never reaches git as an
#     option (security 5);
#   - the parallel scaffolding the step 4 revert left is gone (adversarial 7).
set -uo pipefail
cd "$(dirname "$0")/../.."
BENCH=tests/review-bench/rows/01-review-bench.sh
FIXTURE=tests/fixture-build/rows/01-fixture-build.sh
fails=0
check() { if eval "$2"; then echo "ok   $1"; else echo "FAIL $1" >&2; fails=$((fails+1)); fi; }
# hides <row> <path>: the row's jail_hide call names <path>.
hides() { grep -E '^[[:space:]]*jail_hide ' "$1" | grep -qE "(^|[[:space:]])$2([[:space:]]|$)"; }

check "bench: no commit message carries the case name" '! grep -E "commit .*-m" "$BENCH" | grep -q "CASE"'
check "bench: the case head commit is a neutral task subject" 'grep -qE "commit -q -m \"task \\\$TASK_NUM\"" "$BENCH"'
for p in tests/fixture-build/hidden tests/review-bench/good tests/review-bench/cases .git; do
  check "bench: hides $p from the reviewer" 'hides "$BENCH" "$p"'
done
for p in tests/fixture-build docs/plans .fx .worktrees tests/review-bench .git; do
  check "fixture: hides $p from the build" 'hides "$FIXTURE" "$p"'
done
check "bench: jail_hide runs before live_run" \
  '[ "$(grep -nE "^[[:space:]]*jail_hide " "$BENCH" | cut -d: -f1)" -lt "$(grep -nE "^[[:space:]]*FX_LIVE_MODEL=.* live_run " "$BENCH" | cut -d: -f1)" ]'
check "bench: the kept prompt is copied only as a regular file" 'grep -qF "live_regular \"\$PROMPT_FILE\"" "$BENCH"'
check "bench: the findings file is read only as a regular file" 'grep -qF "live_regular \"\$FINDINGS_FILE\"" "$BENCH"'
check "bench: no bare [ -f ] test on the findings file" '! grep -qF "[ -f \"\$FINDINGS_FILE\" ]" "$BENCH"'
check "fixture: the transcript is read only as a regular file" 'grep -qF "live_regular \"\${CTL[0]}\"" "$FIXTURE"'
check "fixture: at() refuses a revision that starts with -" 'grep -qE "^[[:space:]]*case \"\\\$1\" in -\*\)" "$FIXTURE"'
check "fixture: no FX_FIXTURE_PARALLEL" '! grep -q FX_FIXTURE_PARALLEL "$FIXTURE" tests/fixture-build/run.sh tests/fixture-build/README.md'
check "fixture: no isolated_test_execution write" '! grep -q isolated_test_execution "$FIXTURE" tests/fixture-build/README.md'
check "fixture: no mergeDefects" '! grep -q mergeDefects "$FIXTURE" tests/fixture-build/run.sh'

if [ "$fails" -ne 0 ]; then echo "row-safety: $fails failed" >&2; exit 1; fi
echo "row-safety: all passed"
