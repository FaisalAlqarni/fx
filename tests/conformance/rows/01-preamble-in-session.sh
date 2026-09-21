#!/usr/bin/env bash
# 01: the whole rendered preamble reaches a session.
#
# The question is answerable only from PREAMBLE.md, and from both ends of it
# (lib/live.sh). A correct answer, with no tool having produced either number,
# means the preamble was in context, first line to last. With PREAMBLE.md
# empty the model has nothing to answer from.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "01|preamble in a session|live"; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
live_workdir

live_run "$PREAMBLE_QUESTION"

a="$(events answer)"
preamble_known "$a" \
  || fail "the session could not answer from the preamble, so it is not wholly in context (answer: $(tail -c 300 <<<"$a"))"
events tool_output | grep -qwE '111|35' \
  && fail "an answer came back from a tool, not from the session's context"
exit 0
