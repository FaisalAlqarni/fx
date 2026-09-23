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
  exit 77
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

# The claude call runs inside the conformance jail (tests/conformance/lib/
# jail.sh, the one live.sh uses): the real filesystem is read-only, every
# top-level directory except the tree under test and this run's scratch dir
# is hidden, and the child's environment is cleared and rebuilt from an
# allowlist. That is what actually stops the session from reading the real
# home or another repo by absolute path; the scratch HOME and
# CLAUDE_CONFIG_DIR only stop the owner's real CLAUDE.md, memory and other
# plugins from loading, and a none__ prompt from firing one of them instead
# of proving fx stayed quiet.
#
# REAL_HOME is read once, before HOME is overwritten, and never exported: it
# is passed to scratch_home_claude and to jail.sh as a plain shell variable,
# so it is visible to this script and to what it sources, never to the
# claude process (the jail's clearenv does not forward it either way) or to
# any other unjailed child.
. "$SCRIPT_DIR/../conformance/lib/scratch-home.sh"
# SKIP exits 77, never 0: a run that exercised no lane is not a pass (Ruling J).
gap()  { echo "[SKIP] $*" >&2; exit 77; }
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

# A scratch cwd inside the jailed scratch dir, so the run cannot be steered by
# whatever repo you happen to be sitting in, and cannot write to it, or to
# anything else the jail hides, either.
#
# CONSEQUENCE, and it bit once: a prompt that refers to repo state ("the changes
# on this branch") cannot trigger anything here, because there is no repo. The
# model goes looking, finds nothing, and the lane never fires. That is the test
# being wrong, not the lane. A prompt must carry its own subject.
WORK="$LIVE_SCRATCH/work"
mkdir -p "$WORK"

# Optional per-lane fixture, same contract as run-reps.sh: some triggers cannot
# fire in an empty directory, and a miss caused by an absent subject reads
# exactly like a miss caused by the description. It runs unjailed (it is this
# repo's own trusted script, not the model), inside the scratch cwd, so it can
# only write there.
[ -f "$SCRIPT_DIR/fixtures/${LANE}.sh" ] && ( cd "$WORK" && bash "$SCRIPT_DIR/fixtures/${LANE}.sh" >/dev/null 2>&1 )

echo "lane        $LANE"
echo "prompt      $PROMPT_FILE"
echo "plugin dir  $FX   (the working tree, not the cache)"

( cd "$WORK" && timeout 300 "${JAIL[@]}" claude -p "$PROMPT" \
    --plugin-dir "$FX" \
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

echo
echo "lanes invoked in this run:"
grep -o '"skill":"[^"]*"' "$LOG" 2>/dev/null | sort -u | sed 's/^/  /' || echo "  (none)"

echo
verdict="$(node "$SCRIPT_DIR/verdict.js" "$LANE" "$LOG")"
vrc=$?
echo "$verdict  ($LANE)"
echo "log  $LOG"

exit "$vrc"
