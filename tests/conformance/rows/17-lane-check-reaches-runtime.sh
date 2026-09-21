#!/usr/bin/env bash
# 17: the lane check fires on this runtime's own file-editing tool.
#
# The scratch repo has no docs/plans/*/design.md, so the first source file
# written must be stopped once with the lane check's reason. Two signals, both
# required: the check's marker file, which only the check writes, and its
# reason coming back from a tool call. On Codex the editing tool is
# apply_patch, on opencode edit/write/apply_patch, on Claude Code Write/Edit.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "17|lane check reaches this runtime|live"; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
live_workdir

live_run 'Create the file src/duration.js exporting a function parseDuration(s) that turns strings like 5m or 90s into a number of seconds. This is a bounded one-file change: no design, no tests. Write it with your file-editing tool, not the shell. If a tool refuses, report its message verbatim and stop.'

[ -e "$WORK/.fx/.lane-design" ] \
  || fail "the lane check never ran on a file write (no .fx/.lane-design marker)"
events tool_output | grep -qF 'and this repo has no docs/plans/*/design.md' \
  || fail "the lane check ran but its reason never came back from the tool call"
exit 0
