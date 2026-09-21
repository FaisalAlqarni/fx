#!/usr/bin/env bash
# 15: a subagent can dispatch a subagent of its own.
#
# Two levels: the session dispatches A, A dispatches B. Depth is read from the
# transcript, never from what the model says, since A could answer for B.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "15|subagent dispatches a subagent|live"; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
live_workdir

live_run "Dispatch one subagent ($SUBAGENT_TOOL). Its task, word for word: \"Dispatch one subagent of your own ($SUBAGENT_TOOL). Its task, word for word: 'Reply with the word NESTED-OK.' Wait for it, then reply with exactly what it returned.\" Wait for it, then reply with exactly what it returned."

d="$(events max_depth)"
[ "$d" -ge 2 ] || fail "dispatch reached depth $d, not 2 (answer: $(events answer | tail -c 300))"
exit 0
