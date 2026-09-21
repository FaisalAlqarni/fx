#!/usr/bin/env bash
# 04: a naive prompt makes the model invoke a lane on its own.
#
# One literal user message, in a clean session, that names no lane: the
# lane-triggering suite's fx-tdd prompt. fx-tdd must load. This is the only
# row that proves fx changes behaviour rather than merely loading.
#
# Needs a capable model. On opencode the model is a local 27B; a FAIL there
# may be the model, not fx. The runbook re-runs a suspected flake once and
# records both results.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "04|naive prompt invokes a lane|live"; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
live_workdir
PROMPT="$(cat "$FX/tests/lane-triggering/prompts/fx-tdd.txt")" || fail "prompt file missing"
grep -q 'fx-' <<<"$PROMPT" && fail "the naive prompt names a lane, so it proves nothing"

live_run "$PROMPT"

lane_loaded fx-tdd "if you didn't watch the test fail, you don't know it tests" \
  || fail "fx-tdd never loaded (skills loaded: $(events skills | sort -u | tr '\n' ' '))"
exit 0
