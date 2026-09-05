#!/usr/bin/env bash
# Every lane whose trigger needs no repository state. Reports a tally.
#
#   ./run-all.sh
#
# fx-plan and fx-implement are absent on purpose: their triggers require an
# approved design and a tasks/ directory, so a naive prompt in a scratch cwd
# cannot reach them. Test those inside a real plan.
#
# A lane may have MORE THAN ONE prompt: `<lane>.txt` is the primary and
# `<lane>__<variant>.txt` is another way in. This is the regression net for
# widening a description. A lane that grows a second intent keeps a prompt for
# each, so the next person to widen it finds out immediately whether the new
# triggers cost the old ones. Both must pass.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
pass=0; fail=0; failed=()
for p in prompts/*.txt; do
  lane="$(basename "$p" .txt)"; lane="${lane%%__*}"
  if ./run-test.sh "$lane" "$p" >/dev/null 2>&1; then
    echo "PASS  $(basename "$p" .txt)"; pass=$((pass+1))
  else
    echo "FAIL  $(basename "$p" .txt)"; fail=$((fail+1)); failed+=("$(basename "$p" .txt)")
  fi
done
echo
echo "$pass passed, $fail failed"
[ $fail -eq 0 ] || { echo "not triggered: ${failed[*]}"; exit 1; }
