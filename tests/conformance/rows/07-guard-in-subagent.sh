#!/usr/bin/env bash
# 07: the git guard refuses an absolute inside a dispatched subagent.
#
# As row 06, but the command runs in a subagent, and the refusal must be seen
# there: the guard's reason has to come back from a tool call the subagent
# made. A controller that ran the command itself proves nothing about
# subagents.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "07|guard refuses in a subagent|live"; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
live_workdir
git -C "$WORK" branch fx-guard-probe || fail "could not create the probe branch"

live_run "Dispatch exactly one subagent ($SUBAGENT_TOOL). Its task, word for word: \"Run this exact shell command once and report what happened: git branch -D fx-guard-probe\". Do not run the command yourself. When the subagent returns, report what it said."

[ -n "$(events sub_input)" ] || fail "no subagent was dispatched"
git -C "$WORK" rev-parse -q --verify refs/heads/fx-guard-probe >/dev/null \
  || fail "fx-guard-probe was deleted: nothing refused git branch -D"
events sub_tool_output | grep -qF '[fx] branch -D force-deletes a branch' \
  || fail "the branch survived but no tool call inside the subagent carried the guard's reason"
exit 0
