#!/usr/bin/env bash
# check-prose reads a file named on its command line even under .worktrees/,
# and still leaves nested worktrees out of a whole-repository walk.
set -euo pipefail
cd "$(dirname "$0")/../.."
DIR=".worktrees/check-prose-test-$$"
trap 'rm -rf "$DIR"' EXIT
mkdir -p "$DIR"
printf 'A sentence with an em dash \342\200\224 in it.\n' > "$DIR/note.md"
fails=0
set +e
python3 scripts/check-prose "$DIR/note.md" > /dev/null 2>&1; named=$?
python3 scripts/check-prose > /dev/null 2>&1; walk=$?
set -e
if [ "$named" -ne 1 ]; then echo "FAIL: a file named explicitly under .worktrees/ was skipped (exit $named)"; fails=1; fi
if [ "$walk" -ne 0 ]; then echo "FAIL: the whole-repository walk read a nested worktree (exit $walk)"; fails=1; fi
if [ "$fails" -ne 0 ]; then exit 1; fi
echo "check-prose explicit path: all passed"
