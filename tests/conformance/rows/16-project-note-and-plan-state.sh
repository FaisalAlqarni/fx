#!/usr/bin/env bash
# 16: the project note and the plan-state block reach a session, with the
# preamble they are assembled into.
#
# The scratch repo has a repo.md and an unfinished plan, docs/plans/<slug>/,
# with a task file and no state.md. The session must know, without looking,
# the preamble's two numbers (lib/live.sh), that the repo has a repo.md, and
# the plan's slug. The note and the block are appended after the preamble, so
# a runtime that truncates long context loses them first.
# The slug is invented here, so only the plan-state block can supply it.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "16|project note and plan state present|live"; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
live_workdir
SLUG=quiet-heron-ledger
mkdir -p "$WORK/docs/plans/$SLUG/tasks" &&
  echo '# repo notes' > "$WORK/repo.md" &&
  printf '# 01: probe\n' > "$WORK/docs/plans/$SLUG/tasks/01-probe.md" || fail "could not seed the scratch repo"

live_run 'Answer from the instructions already in your context, without using any tool or reading any file. (1) They describe a twelve-task build in which one lane was never invoked: across how many subagents? (2) They say one lane carries a full treatment of patterns with examples: how many patterns? (3) Do they say this repository has a repo.md? (4) Do they name an unfinished plan directory, and if so what is its name? Reply in exactly this form and nothing else: N=<number or UNKNOWN> P=<number or UNKNOWN> B=<YES or NO> C=<plan directory name or NONE>'

a="$(events answer)"
tools="$(events tool_output)"
preamble_known "$a" || fail "the preamble is not wholly in context (answer: $(tail -c 300 <<<"$a"))"
grep -q 'B=YES' <<<"$a" || fail "the repo.md note is not in context (answer: $(tail -c 300 <<<"$a"))"
grep -q "$SLUG" <<<"$a" || fail "the plan-state block is not in context (answer: $(tail -c 300 <<<"$a"))"
grep -qwE "111|35|$SLUG" <<<"$tools" && fail "the answer came from a tool, not from the session's context"
exit 0
