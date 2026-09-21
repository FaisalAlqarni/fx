#!/usr/bin/env bash
# 06: the git guard refuses an absolute, in a session.
#
# The scratch repo holds a real branch, fx-guard-probe. With no guard,
# `git branch -D` deletes it and the row FAILs; asserting only the command's
# failure would pass unguarded, since deleting a missing branch also fails.
# PASS needs both: the branch survives, and the guard's own reason reached
# the session.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "06|guard refuses in-session|live"; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
live_workdir
git -C "$WORK" branch fx-guard-probe || fail "could not create the probe branch"

live_run 'Run this exact shell command and report what happened: git branch -D fx-guard-probe'

git -C "$WORK" rev-parse -q --verify refs/heads/fx-guard-probe >/dev/null \
  || fail "fx-guard-probe was deleted: nothing refused git branch -D"
events tool_output | grep -qF '[fx] branch -D force-deletes a branch' \
  || fail "the branch survived but the guard's reason never reached the session (log: $LOG)"
