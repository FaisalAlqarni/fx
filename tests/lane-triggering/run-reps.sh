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

# The claude call runs inside the conformance jail (tests/conformance/lib/
# jail.sh, the one live.sh uses): the real filesystem is read-only, every
# top-level directory except the tree under test and this run's scratch dir
# is hidden, and the child's environment is cleared and rebuilt from an
# allowlist. That is what actually stops a rep from reading the real home or
# another repo by absolute path; the scratch HOME and CLAUDE_CONFIG_DIR only
# stop the owner's real CLAUDE.md, memory and other plugins from loading.
#
# REAL_HOME is read once, before HOME is overwritten, and never exported: it
# is passed to scratch_home_claude and to jail.sh as a plain shell variable,
# never to the claude process or to any other unjailed child.
. "$SCRIPT_DIR/../conformance/lib/scratch-home.sh"
gap()  { echo "[SKIP] $*" >&2; exit 0; }
fail() { echo "$*" >&2; exit 1; }
REAL_HOME="$HOME"
LIVE_SCRATCH="$(mktemp -d)" || fail "mktemp failed"
case "$LIVE_SCRATCH" in
  /tmp/?*|"${TMPDIR:-/tmp}"/?*) ;;
  *) fail "unexpected scratch dir: $LIVE_SCRATCH" ;;
esac
trap 'case "$LIVE_SCRATCH" in /tmp/?*|"${TMPDIR:-/tmp}"/?*) rm -rf -- "$LIVE_SCRATCH" ;; esac' EXIT
HOME="$LIVE_SCRATCH/home"
CLAUDE_CONFIG_DIR="$HOME/.claude"
FX_REAL_HOME="$REAL_HOME"
FX="$PLUGIN_DIR"
scratch_home_claude "$CLAUDE_CONFIG_DIR" "$REAL_HOME"
case $? in
  0) ;;
  1) gap "no credential" ;;
  *) fail "credential copy failed" ;;
esac
. "$SCRIPT_DIR/../conformance/lib/jail.sh"

echo "lane   $LANE"
echo "tree   $FX"
echo "reps   $REPS"
echo

fired=0
inconclusive=0
for i in $(seq 1 "$REPS"); do
  W="$LIVE_SCRATCH/rep$i"; mkdir -p "$W"
  # Optional per-lane fixture: some triggers cannot fire in an empty directory.
  # It runs unjailed (it is this repo's own trusted script, not the model),
  # inside the scratch cwd, so it can only write there.
  [ -f "$SCRIPT_DIR/fixtures/${LANE}.sh" ] && ( cd "$W" && bash "$SCRIPT_DIR/fixtures/${LANE}.sh" >/dev/null 2>&1 )
  LOG="$OUT/rep$i.stream.json"
  ( cd "$W" && timeout 300 "${JAIL[@]}" claude -p "$PROMPT" \
      --plugin-dir "$FX" \
      --dangerously-skip-permissions \
      --max-turns 3 \
      --output-format stream-json --verbose ) > "$LOG" 2>&1 || true

  if ! grep -q '"type":"assistant"' "$LOG"; then
    echo "  rep $i  INCONCLUSIVE  $(head -1 "$LOG" | cut -c1-70)"
    inconclusive=$((inconclusive+1)); continue
  fi
  skills="$(grep -o '"skill":"[^"]*"' "$LOG" | sort -u | tr '\n' ' ')"
  verdict="$(node "$SCRIPT_DIR/verdict.js" "$LANE" "$LOG")"
  if [ "$verdict" = PASS ]; then
    echo "  rep $i  FIRED         ${skills}"
    fired=$((fired+1))
  else
    echo "  rep $i  no            $verdict   ${skills:-(no skill invoked)}"
  fi
done

echo
echo "fire rate: $fired/$REPS   inconclusive: $inconclusive"
echo "logs: $OUT"
