#!/usr/bin/env bash
# 02: the whole rendered preamble reaches a dispatched subagent.
#
# Same question as row 01, asked by a subagent. The parent also knows the
# answer, so the row checks the subagent's own return, and fails if the
# parent's dispatch prompt handed the number over. On Codex that prompt is
# encrypted in the transcript, so that one check cannot bite there; the
# subagent's return is still its own.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "02|preamble in a subagent|live"; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
live_workdir

live_run "Dispatch exactly one subagent ($SUBAGENT_TOOL) and give it this task, word for word, with nothing added: \"$PREAMBLE_QUESTION\" Do not answer the question yourself and do not help the subagent. When it returns, reply with its answer verbatim."

[ -n "$(events sub_input)" ] || fail "no subagent was dispatched"
# A Codex subagent forked with the parent's turns inherits the parent's
# context, preamble included, so its answer would prove nothing.
if [ "$HARNESS" = codex ] && ! events sub_input | grep -q '"fork_turns":"none"'; then
  fail "the subagent was forked with the parent's context, so its answer proves nothing"
fi
events sub_input | grep -qwE '111|35' && fail "the parent put an answer in the subagent's prompt"
r="$(events sub_output)"
preamble_known "$r" \
  || fail "the subagent could not answer from the preamble, so it did not wholly reach it (subagent returned: $(tail -c 300 <<<"$r"))"
events sub_tool_output | grep -qwE '111|35' \
  && fail "an answer came back from a tool the subagent ran, not from its context"
exit 0
