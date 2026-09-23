#!/usr/bin/env bash
# Picks the build worktree out of a `git worktree list --porcelain` dump,
# using the plan ledger instead of list position: `git worktree list` sorts
# linked worktrees by path, not by add order (confirmed against git 2.43.0
# in pick-build-worktree.test.sh), so "the Nth entry" can name a task
# worktree whose path happens to sort ahead of the build worktree's.
#
# Every task worktree's own path is named in a `Task NN: parallel with MM,
# branch <b>, base <sha>, worktree <path>` ledger line, written before that
# worktree is created (Parallel tasks step 2 precedes step 3). So among the
# linked worktrees, whichever one the ledger never names as a task worktree
# is the build worktree, and there should be exactly one.
#
# Runs no git itself and needs no jail: the caller already read both inputs
# (with a jailed git, since it reads the model's own repo) and hands them
# over as files.
#
# Usage: pick-build-worktree.sh <main-worktree-path> <worktree-list-file> <ledger-text-file>
# Prints the chosen worktree path and exits 0. On an ambiguous choice, names
# the candidates on stderr and exits 1.
set -uo pipefail
MAIN="$1" WTLIST="$2" LEDGER="$3"

WT_PATHS=()
while IFS= read -r p; do WT_PATHS+=("$p"); done \
  < <(awk '/^worktree /{ sub(/^worktree /, ""); print }' "$WTLIST")

TASK_WTS="$(grep -oE 'Task [0-9]+: parallel with [0-9]+, branch [^ ,]+, base [^ ,]+, worktree [^ ,]+' "$LEDGER" 2>/dev/null \
  | sed -E 's/^.*, worktree //' | sort -u)"

CANDIDATES=()
for p in "${WT_PATHS[@]}"; do
  [ "$p" = "$MAIN" ] && continue
  grep -qxF "$p" <<<"$TASK_WTS" || CANDIDATES+=("$p")
done

case "${#CANDIDATES[@]}" in
  0) printf '%s\n' "$MAIN" ;;
  1) printf '%s\n' "${CANDIDATES[0]}" ;;
  *)
    printf 'ambiguous build worktree, candidates:%s\n' "$(printf ' %s' "${CANDIDATES[@]}")" >&2
    exit 1
    ;;
esac
