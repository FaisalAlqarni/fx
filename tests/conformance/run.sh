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

# FX_CONFORMANCE_ROWS points the runner at another rows directory; the
# isolation test uses it to run a probe row. Unset, the real rows run.
ROWS_DIR="${FX_CONFORMANCE_ROWS:-$FX/tests/conformance/rows}"
shopt -s nullglob
ROWS=("$ROWS_DIR"/*.sh)
if [ "${#ROWS[@]}" -eq 0 ]; then
  echo "no rows found under $ROWS_DIR" >&2
  echo "a runner with no rows reports nothing; that is not a pass" >&2
  exit 2
fi

# Rows run against a scratch home: HOME, CODEX_HOME, XDG_CONFIG_HOME and
# CLAUDE_CONFIG_DIR all point inside one mktemp -d, and only that directory is
# removed on exit. FX_REAL_HOME lets a live row copy credentials IN; nothing is
# ever copied back out.
#
# Isolation replaced restoration. An earlier runner snapshotted the three homes
# and restored them with `rm -rf <home> && cp -a <snapshot> <home>`; a silenced
# failed copy armed that restore and it deleted a real ~/.claude. A row that
# cannot reach the real home has nothing to put back.
SCRATCH="$(mktemp -d)" || { echo "mktemp -d failed" >&2; exit 2; }
case "$SCRATCH" in /tmp/?*|"${TMPDIR:-/tmp}"/?*) ;; *)
  echo "refusing scratch dir outside the temp dir: '$SCRATCH'" >&2; exit 2 ;; esac
trap 'rm -rf -- "$SCRATCH"' EXIT
export FX_REAL_HOME="$HOME"
export HOME="$SCRATCH/home"
export CODEX_HOME="$HOME/.codex" XDG_CONFIG_HOME="$HOME/.config" \
       CLAUDE_CONFIG_DIR="$HOME/.claude"
mkdir -p "$CODEX_HOME" "$XDG_CONFIG_HOME/opencode" "$CLAUDE_CONFIG_DIR" || exit 2

pass=0; fail=0; gap=0; ran=0
for f in "${ROWS[@]}"; do
  # A row without a --describe guard runs its body here and prints nothing
  # parseable. That is a FAIL, never a skip: an empty kind is not "not free".
  desc="$(bash "$f" --describe 2>/dev/null)"
  if [ $? -ne 0 ] || ! [[ "$desc" =~ ^[0-9]+\|[^|]+\|(free|live)$ ]]; then
    printf 'FAIL  ??  %s (no valid --describe)\n' "$(basename "$f")"; fail=$((fail+1)); ran=$((ran+1)); continue
  fi
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
