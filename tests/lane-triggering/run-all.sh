#!/usr/bin/env bash
# Every lane whose trigger needs no repository state. Reports a tally.
#
#   ./run-all.sh
#
# fx-plan and fx-implement need repository state a naive prompt in an empty
# scratch cwd does not have. Each has a fixtures/<lane>.sh that run-test.sh
# runs inside the scratch cwd first, so the prompt has a design or a plan to
# point at.
#
# A lane may have MORE THAN ONE prompt: `<lane>.txt` is the primary and
# `<lane>__<variant>.txt` is another way in. This is the regression net for
# widening a description. A lane that grows a second intent keeps a prompt for
# each, so the next person to widen it finds out immediately whether the new
# triggers cost the old ones. Both must pass.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
# run-test.sh exits 77 on SKIP (no CLI, no credential). A skip exercised no
# lane, so it is never a pass, and any skip fails the suite.
pass=0; fail=0; skip=0; failed=()
for p in prompts/*.txt; do
  lane="$(basename "$p" .txt)"; lane="${lane%%__*}"
  ./run-test.sh "$lane" "$p" >/dev/null 2>&1
  case $? in
    0)  echo "PASS  $(basename "$p" .txt)"; pass=$((pass+1)) ;;
    77) echo "SKIP  $(basename "$p" .txt)"; skip=$((skip+1)) ;;
    *)  echo "FAIL  $(basename "$p" .txt)"; fail=$((fail+1)); failed+=("$(basename "$p" .txt)") ;;
  esac
done
echo
echo "$pass passed, $fail failed, $skip skipped"
[ $fail -eq 0 ] || { echo "not triggered: ${failed[*]}"; exit 1; }
[ $skip -eq 0 ] || { echo "skipped runs exercised no lane; this is not a pass"; exit 1; }
