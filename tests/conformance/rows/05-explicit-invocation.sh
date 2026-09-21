#!/usr/bin/env bash
# 05: a lane invoked explicitly, by this runtime's own addressing, loads.
#
# Claude Code addresses a plugin skill as /fx:fx-tdd, Codex as $fx-tdd, and
# opencode by its bare name through the skill tool. The row passes when the
# lane's body reached the session.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "05|explicit invocation by runtime addressing|live"; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
live_workdir
TASK='then reply with the one-line announcement that lane tells you to make, and stop. Do not write any code.'
case "$HARNESS" in
  claude-code) PROMPT="/fx:fx-tdd Load this lane, $TASK" ;;
  codex)       PROMPT="\$fx-tdd Load this lane, $TASK" ;;
  opencode)    PROMPT="Load the fx-tdd skill with the skill tool, $TASK" ;;
esac

live_run "$PROMPT"

lane_loaded fx-tdd "if you didn't watch the test fail, you don't know it tests" \
  || fail "fx-tdd did not load from its explicit address (skills loaded: $(events skills | sort -u | tr '\n' ' '))"
exit 0
