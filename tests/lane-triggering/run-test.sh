#!/usr/bin/env bash
# Does a naive prompt actually make the model invoke an fx lane?
#
#   ./run-test.sh <lane> <prompt-file> [max-turns]
#   ./run-test.sh fx-tdd prompts/fx-tdd.txt
#
# This is the only test in fx that measures behaviour rather than text. Every
# other check reads files. Ported from superpowers `tests/skill-triggering/`,
# which fx dropped in consolidation; a twelve-task build then ran with
# `fx-tdd` invoked 0 times across 111 subagents and nothing noticed.
#
# WHY --plugin-dir MATTERS MORE THAN THE TEST
#
# It points the run at this working tree. The hooks otherwise load from
# `~/.claude/plugins/cache/fx/fx/<version>/`, which is keyed by VERSION, so an
# edited file changes nothing until the version is bumped and the plugin
# reinstalled. That cost this project two false conclusions in one hour
# (DEBT #66, #67). With `--plugin-dir` you test what you just wrote.

set -uo pipefail

LANE="${1:-}"
PROMPT_FILE="${2:-}"
MAX_TURNS="${3:-3}"

if [ -z "$LANE" ] || [ -z "$PROMPT_FILE" ]; then
  echo "usage: $0 <lane> <prompt-file> [max-turns]" >&2
  echo "   eg: $0 fx-tdd prompts/fx-tdd.txt" >&2
  exit 2
fi
if [ ! -f "$PROMPT_FILE" ]; then
  echo "no such prompt file: $PROMPT_FILE" >&2
  exit 2
fi
if ! command -v claude >/dev/null 2>&1; then
  echo "[SKIP] the claude CLI is not on PATH" >&2
  exit 0
fi

# Resolve and read the prompt BEFORE any cd. A relative path plus a subshell
# `cd` handed claude an empty prompt and reported it as the lane not firing:
# a mechanical failure wearing a behavioural verdict.
PROMPT="$(cat "$PROMPT_FILE")"
if [ -z "${PROMPT// }" ]; then
  echo "prompt file is empty: $PROMPT_FILE" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUT="${TMPDIR:-/tmp}/fx-lane-triggering/$$/${LANE}"
mkdir -p "$OUT"
LOG="$OUT/stream.json"

# A scratch cwd, so the run cannot be steered by whatever repo you happen to
# be sitting in, and cannot write to it either.
#
# CONSEQUENCE, and it bit once: a prompt that refers to repo state ("the changes
# on this branch") cannot trigger anything here, because there is no repo. The
# model goes looking, finds nothing, and the lane never fires. That is the test
# being wrong, not the lane. A prompt must carry its own subject.
WORK="$OUT/work"
mkdir -p "$WORK"

echo "lane        $LANE"
echo "prompt      $PROMPT_FILE"
echo "plugin dir  $PLUGIN_DIR   (the working tree, not the cache)"

( cd "$WORK" && timeout 300 claude -p "$PROMPT" \
    --plugin-dir "$PLUGIN_DIR" \
    --dangerously-skip-permissions \
    --max-turns "$MAX_TURNS" \
    --output-format stream-json --verbose ) > "$LOG" 2>&1 || true

# stream-json records a skill invocation as a tool_use named Skill whose input
# carries the skill name, with or without the plugin prefix.
if ! grep -q '"type":"assistant"' "$LOG"; then
  echo
  echo "INCONCLUSIVE  the run produced no assistant turn, so this says nothing"
  echo "about the lane. First line of output:"
  head -1 "$LOG" | sed 's/^/  /'
  echo "log  $LOG"
  exit 2
fi

if grep -q '"name":"Skill"' "$LOG" && grep -qE '"skill":"([^"]*:)?'"${LANE}"'"' "$LOG"; then
  verdict=PASS
else
  verdict=FAIL
fi

echo
echo "lanes invoked in this run:"
grep -o '"skill":"[^"]*"' "$LOG" 2>/dev/null | sort -u | sed 's/^/  /' || echo "  (none)"

echo
echo "$verdict  $LANE"
echo "log  $LOG"

[ "$verdict" = PASS ]
