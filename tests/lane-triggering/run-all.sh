#!/usr/bin/env bash
# Every lane whose trigger needs no repository state. Reports a tally.
#
#   ./run-all.sh
#
# fx-plan and fx-implement are absent on purpose: their triggers require an
# approved design and a tasks/ directory, so a naive prompt in a scratch cwd
# cannot reach them. Test those inside a real plan.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
pass=0; fail=0; failed=()
for p in prompts/*.txt; do
  lane="$(basename "$p" .txt)"
  if ./run-test.sh "$lane" "$p" >/dev/null 2>&1; then
    echo "PASS  $lane"; pass=$((pass+1))
  else
    echo "FAIL  $lane"; fail=$((fail+1)); failed+=("$lane")
  fi
done
echo
echo "$pass passed, $fail failed"
[ $fail -eq 0 ] || { echo "not triggered: ${failed[*]}"; exit 1; }
