#!/usr/bin/env bash
# 01-fixture-build.sh step 4 used to take the second `worktree` entry of
# `git worktree list --porcelain` as the build worktree. That entry is not
# the build worktree: git sorts linked worktrees by path, not by add order
# (confirmed against git 2.43.0 below), so a task worktree whose path sorts
# ahead of the build worktree's gets scored instead. This locks in both the
# real git ordering that caused it and the fix: pick-build-worktree.sh reads
# the ledger's `parallel with ... worktree <path>` lines instead of trusting
# list position.
set -uo pipefail
cd "$(dirname "$0")/../../.."
PICK="tests/fixture-build/hidden/pick-build-worktree.sh"
fails=0
note() { echo "FAIL: $1"; fails=1; }

T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
git -C "$T" init -q -b main
git -C "$T" -c user.name=fx -c user.email=fx@example.invalid commit -q --allow-empty -m seed

# Add the build worktree first, then a task worktree named so it sorts
# before it: this is the exact repro from the review (.worktrees/01-store
# ahead of .worktrees/notes).
git -C "$T" worktree add -q -b build-branch "$T/.worktrees/notes" >/dev/null
git -C "$T" worktree add -q -b task-01 "$T/.worktrees/01-store" >/dev/null

WTLIST="$(mktemp)"
git -C "$T" worktree list --porcelain > "$WTLIST"

# Lock in the premise: if git ever stops sorting by path, this test should
# say so rather than silently stop exercising the bug.
FIRST="$(awk '/^worktree /{ sub(/^worktree /, ""); print; exit }' "$WTLIST")"
[ "$FIRST" = "$T" ] || note "premise: expected the main worktree ($T) listed first, got $FIRST"
SECOND="$(awk '/^worktree /{ n++; if (n == 2) { sub(/^worktree /, ""); print; exit } }' "$WTLIST")"
[ "$SECOND" = "$T/.worktrees/01-store" ] || note "premise: expected git to sort .worktrees/01-store ahead of .worktrees/notes, got $SECOND (git version may differ; the fix must not depend on this)"

# Case 1: the ledger names 01-store as a task worktree. notes is the only
# worktree left unnamed, so it must win even though it sorts second.
LEDGER="$(mktemp)"
echo "Task 01: parallel with 02, branch task-01, base 0000000, worktree $T/.worktrees/01-store" > "$LEDGER"
OUT="$("$PICK" "$T" "$WTLIST" "$LEDGER")"; RC=$?
[ "$RC" -eq 0 ] || note "case 1: expected exit 0, got $RC: $OUT"
[ "$OUT" = "$T/.worktrees/notes" ] || note "case 1: expected the notes worktree, got: $OUT"

# Case 2: neither linked worktree is named in the ledger: ambiguous, must
# fail rather than guess.
: > "$LEDGER"
OUT="$("$PICK" "$T" "$WTLIST" "$LEDGER" 2>&1)"; RC=$?
[ "$RC" -ne 0 ] || note "case 2: expected a nonzero exit on an ambiguous choice, got 0: $OUT"
case "$OUT" in *".worktrees/notes"*".worktrees/01-store"*|*".worktrees/01-store"*".worktrees/notes"*) : ;; \
  *) note "case 2: expected both candidates named in the failure, got: $OUT" ;; esac

# Case 3: no linked worktree at all (built directly on the main checkout):
# the main worktree itself is the answer.
git -C "$T" worktree remove --force "$T/.worktrees/notes" >/dev/null
git -C "$T" worktree remove --force "$T/.worktrees/01-store" >/dev/null
git -C "$T" worktree list --porcelain > "$WTLIST"
: > "$LEDGER"
OUT="$("$PICK" "$T" "$WTLIST" "$LEDGER")"; RC=$?
[ "$RC" -eq 0 ] || note "case 3: expected exit 0, got $RC: $OUT"
[ "$OUT" = "$T" ] || note "case 3: expected the main worktree ($T), got: $OUT"

rm -f "$WTLIST" "$LEDGER"
[ "$fails" -eq 0 ] || exit 1
echo "pick-build-worktree.test.sh: all passed"
