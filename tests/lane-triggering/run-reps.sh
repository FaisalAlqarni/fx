#!/usr/bin/env bash
# N fresh-context reps of one lane, reported as a fire rate.
#
#   ./run-reps.sh <lane> <prompt-file> [reps] [plugin-dir]
#   ./run-reps.sh fx-review prompts/fx-review.txt 5
#   ./run-reps.sh fx-review prompts/fx-review.txt 5 /tmp/variant-a
#
# `fx-authoring` requires 5+ reps per variant and a no-guidance control, because
# single samples lie. It also treats VARIANCE as a metric: five different
# outcomes across five reps means the wording is not binding, and the fix is to
# tighten the form rather than add words.
#
# The fourth argument points at an alternate tree, which is how you run a
# variant or a control without touching the one you are editing.

set -uo pipefail

LANE="${1:-}"
PROMPT_FILE="${2:-}"
REPS="${3:-5}"
PLUGIN_DIR="${4:-}"

if [ -z "$LANE" ] || [ -z "$PROMPT_FILE" ]; then
  echo "usage: $0 <lane> <prompt-file> [reps] [plugin-dir]" >&2
  exit 2
fi
[ -f "$PROMPT_FILE" ] || { echo "no such prompt file: $PROMPT_FILE" >&2; exit 2; }
command -v claude >/dev/null 2>&1 || { echo "[SKIP] claude not on PATH" >&2; exit 0; }

PROMPT="$(cat "$PROMPT_FILE")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -n "$PLUGIN_DIR" ] || PLUGIN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

OUT="${TMPDIR:-/tmp}/fx-reps/$$"
mkdir -p "$OUT"

echo "lane   $LANE"
echo "tree   $PLUGIN_DIR"
echo "reps   $REPS"
echo

fired=0
inconclusive=0
for i in $(seq 1 "$REPS"); do
  W="$OUT/rep$i"; mkdir -p "$W"
  # Optional per-lane fixture: some triggers cannot fire in an empty directory.
  # It runs inside the scratch cwd, so it can only write there.
  [ -f "$SCRIPT_DIR/fixtures/${LANE}.sh" ] && ( cd "$W" && bash "$SCRIPT_DIR/fixtures/${LANE}.sh" >/dev/null 2>&1 )
  LOG="$W/stream.json"
  ( cd "$W" && timeout 300 claude -p "$PROMPT" \
      --plugin-dir "$PLUGIN_DIR" \
      --dangerously-skip-permissions \
      --max-turns 3 \
      --output-format stream-json --verbose ) > "$LOG" 2>&1 || true

  if ! grep -q '"type":"assistant"' "$LOG"; then
    echo "  rep $i  INCONCLUSIVE  $(head -1 "$LOG" | cut -c1-70)"
    inconclusive=$((inconclusive+1)); continue
  fi
  skills="$(grep -o '"skill":"[^"]*"' "$LOG" | sort -u | tr '\n' ' ')"
  if grep -qE '"skill":"([^"]*:)?'"${LANE}"'"' "$LOG"; then
    echo "  rep $i  FIRED         ${skills}"
    fired=$((fired+1))
  else
    echo "  rep $i  no            ${skills:-(no skill invoked)}"
  fi
done

echo
echo "fire rate: $fired/$REPS   inconclusive: $inconclusive"
echo "logs: $OUT"
