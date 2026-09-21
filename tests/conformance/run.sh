#!/usr/bin/env bash
# fx conformance: every guarantee, on every runtime, against the real CLI.
#
# A row is PASS, FAIL or GAP. A GAP is a visible state, not a pass, and a row is
# never omitted: a silently absent row is how a runtime comes to claim parity it
# does not have. fx claimed opencode support for months while its plugin pushed
# nothing into the session, because nothing ever ran a session.
#
# Row contract: `<row> --describe` prints `<number>|<name>|<free|live>`.
# Running it exits 0 (pass), 77 (gap), anything else (fail).
#
# Usage: run.sh <claude-code|opencode|codex> [--free]
set -uo pipefail
cd "$(dirname "$0")/../.."
FX="$PWD"

HARNESS="${1:?usage: run.sh <claude-code|opencode|codex> [--free]}"
case "$HARNESS" in claude-code|opencode|codex) ;; *)
  echo "unknown harness: $HARNESS" >&2; exit 2 ;; esac
FREE=""
[ "${2:-}" = "--free" ] && FREE=1

ROWS_DIR="$FX/tests/conformance/rows"
shopt -s nullglob
ROWS=("$ROWS_DIR"/*.sh)
if [ "${#ROWS[@]}" -eq 0 ]; then
  echo "no rows found under $ROWS_DIR" >&2
  echo "a runner with no rows reports nothing; that is not a pass" >&2
  exit 2
fi

# Rows may write into a runtime home. Snapshot all three and restore on ANY
# exit, including failure and interrupt. Earlier in this build a test without
# CODEX_HOME set wrote six role files into a real ~/.codex/agents.
SNAP="$(mktemp -d)"
HOMES=("$HOME/.codex" "$HOME/.config/opencode" "$HOME/.claude")
for h in "${HOMES[@]}"; do
  [ -e "$h" ] && cp -a "$h" "$SNAP/$(echo "$h" | tr / _)" 2>/dev/null
done
restore() {
  for h in "${HOMES[@]}"; do
    src="$SNAP/$(echo "$h" | tr / _)"
    [ -e "$src" ] || continue
    rm -rf "$h" && cp -a "$src" "$h"
  done
  rm -rf "$SNAP"
}
trap restore EXIT INT TERM

pass=0; fail=0; gap=0; ran=0
for f in "${ROWS[@]}"; do
  desc="$(bash "$f" --describe 2>/dev/null)" || {
    printf 'FAIL  ??  %s (no --describe)\n' "$(basename "$f")"; fail=$((fail+1)); continue; }
  IFS='|' read -r n name kind <<<"$desc"
  if [ -n "$FREE" ] && [ "$kind" != free ]; then continue; fi

  FX="$FX" HARNESS="$HARNESS" bash "$f"; rc=$?
  ran=$((ran+1))
  case "$rc" in
    0)  printf 'PASS  %2s  %s\n' "$n" "$name"; pass=$((pass+1)) ;;
    77) printf 'GAP   %2s  %s\n' "$n" "$name"; gap=$((gap+1)) ;;
    *)  printf 'FAIL  %2s  %s\n' "$n" "$name"; fail=$((fail+1)) ;;
  esac
done

printf '\n%s: %d pass, %d fail, %d gap\n' "$HARNESS" "$pass" "$fail" "$gap"

# A runner that dispatched nothing looks exactly like success. Say so instead.
if [ "$ran" -eq 0 ]; then
  echo "no rows ran: the runner dispatched nothing, which is not a pass" >&2
  exit 2
fi
[ "$fail" -eq 0 ]
