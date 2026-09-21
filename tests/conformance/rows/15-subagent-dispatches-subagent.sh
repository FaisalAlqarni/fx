#!/usr/bin/env bash
# 15: a subagent can dispatch a subagent of its own.
#
# Two levels: the session dispatches A, A dispatches B. Depth is read from the
# transcript, never from what the model says, since A could answer for B:
# a nested dispatch counts only when its result came back without an error.
# NESTED-OK must then come back up as well.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "15|subagent dispatches a subagent|live"; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
live_workdir
# opencode: name the built-in general agent at both levels, so a PASS proves
# the plugin's permission.task override reached it (task 18). A prompt that
# let the model pick another agent could pass without touching the override.
AS=""
[ "$HARNESS" = opencode ] && AS=" as agent type general"

live_run "Dispatch one subagent ($SUBAGENT_TOOL)$AS. Its task, word for word: \"Dispatch one subagent of your own ($SUBAGENT_TOOL)$AS. Its task, word for word: 'Reply with the word NESTED-OK.' Wait for it, then reply with exactly what it returned.\" Wait for it, then reply with exactly what it returned."

d="$(events max_depth)"
# opencode: the session's dispatch must have gone to general. That agent is the
# one that needs the plugin's task grant to nest; events.js records only
# the session's own dispatches, so the nested one's type is not read here.
if [ "$HARNESS" = opencode ]; then
  types="$(events sub_type)"
  ! grep -qvx general <<<"$types" && [ -n "$types" ] \
    || fail "a dispatch went to another agent than general (dispatched: $(tr '\n' ' ' <<<"$types"))"
fi
[ "$d" -ge 2 ] || fail "dispatch reached depth $d, not 2 (answer: $(events answer | tail -c 300))"
# The depth says a nested dispatch completed; the word says it did the work.
{ events answer; events sub_output; } | grep -q NESTED-OK \
  || fail "a nested dispatch completed but NESTED-OK never came back up"
exit 0
