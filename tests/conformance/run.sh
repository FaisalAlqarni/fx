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
# Usage: run.sh <claude-code|opencode|opencode-v2|codex> [--free]
set -uo pipefail
cd "$(dirname "$0")/../.."
FX="$PWD"

HARNESS="${1:?usage: run.sh <claude-code|opencode|opencode-v2|codex> [--free]}"
case "$HARNESS" in claude-code|opencode|opencode-v2|codex) ;; *)
  echo "unknown harness: $HARNESS" >&2; exit 2 ;; esac
# Only `--free` is accepted. Anything else, `--fre` included, used to fall
# through to "not free" and run the live rows, spending quota on a typo.
FREE=""
case "$#:${2:-}" in
  1:) ;;
  2:--free) FREE=1 ;;
  *) echo "usage: run.sh <claude-code|opencode|opencode-v2|codex> [--free]" >&2; exit 2 ;;
esac

# Free mode on a machine whose `opencode` is the other major: the rows would
# measure the wrong binary, so skip the harness. The major is read the way the
# installer reads it: the first integer of `opencode --version`. No `opencode`
# at all is not a skip; the rows report it as they always have.
if [ -n "$FREE" ]; then
  case "$HARNESS" in opencode|opencode-v2)
    want=1; [ "$HARNESS" = opencode-v2 ] && want=2
    ocver="$(opencode --version 2>/dev/null | head -n1)"
    have="$(grep -oE '[0-9]+' <<<"$ocver" | head -n1)"
    if [ "$have" = "$((3 - want))" ]; then
      echo "SKIP $HARNESS: opencode $(grep -oE '[0-9]+(\.[0-9]+)*' <<<"$ocver" | head -n1) on PATH is not this harness's major"
      exit 0
    fi ;;
  esac
fi

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
# A caller may name the credential home explicitly (a live run started under a
# fresh fake HOME does); otherwise it is the home the runner started from. It
# is only ever read from.
export FX_REAL_HOME="${FX_REAL_HOME:-$HOME}"
export HOME="$SCRATCH/home"
export CODEX_HOME="$HOME/.codex" XDG_CONFIG_HOME="$HOME/.config" \
       CLAUDE_CONFIG_DIR="$HOME/.claude"
mkdir -p "$CODEX_HOME" "$XDG_CONFIG_HOME/opencode" "$CLAUDE_CONFIG_DIR" || exit 2

# In --free mode a GAP is allowed only for a row listed for this harness in
# expected-gaps: a free row makes no model call, so its result does not depend
# on quota, and a row that used to PASS and now GAPs is a regression, not a
# pass (final review Minor 7). Live rows keep plain GAPs: quota runs out.
EXPECTED_GAPS="${FX_CONFORMANCE_EXPECTED_GAPS:-$FX/tests/conformance/expected-gaps}"
expected_gap() { [ -f "$EXPECTED_GAPS" ] && grep -qxE "$HARNESS 0*$1" "$EXPECTED_GAPS"; }

# FX_LIVE_PROVIDER=openrouter: live rows run on OpenRouter (lib/live.sh). The
# row reports the model its session named through FX_ROW_MODEL_FILE.
OPENROUTER=""
if [ "${FX_LIVE_PROVIDER:-}" = openrouter ]; then
  OPENROUTER=1
  OR_FALLBACK="$(node -p "require('$FX/tests/conformance/lib/openrouter.js').MODELS.fallback")" || exit 2
  export FX_ROW_MODEL_FILE="$SCRATCH/row.model"
fi

pass=0; fail=0; gap=0; ran=0; fb=0; inc_total=0
for f in "${ROWS[@]}"; do
  # A row without a --describe guard runs its body here and prints nothing
  # parseable. That is a FAIL, never a skip: an empty kind is not "not free".
  desc="$(HARNESS="$HARNESS" bash "$f" --describe 2>/dev/null)"
  if [ $? -ne 0 ] || ! [[ "$desc" =~ ^[0-9]+\|[^|]+\|(free|live)$ ]]; then
    printf 'FAIL  ??  %s (no valid --describe)\n' "$(basename "$f")"; fail=$((fail+1)); ran=$((ran+1)); continue
  fi
  IFS='|' read -r n name kind <<<"$desc"
  if [ -n "$FREE" ] && [ "$kind" != free ]; then continue; fi

  # The row's stderr is its reason. It is captured so a GAP can be held to
  # having one, and passed through so the reader still sees it.
  run_row() {
    rm -f "$SCRATCH/row.model"; FX="$FX" HARNESS="$HARNESS" bash "$f" 2>"$SCRATCH/row.err"; rc=$?
    # Rows print tails of the model's answer when they fail. Under OpenRouter
    # that stderr is scanned for the key before it reaches the reader, and a
    # scan that cannot run suppresses it too.
    if [ -n "$OPENROUTER" ]; then
      node "$FX/tests/conformance/lib/openrouter.js" leaks "$SCRATCH/row.err"; local sc=$?
      case $sc in
        0) ;;
        10) echo "row $n: stderr held the OpenRouter key; it was not printed" > "$SCRATCH/row.err"; rc=1 ;;
        *)  echo "row $n: the key scan of stderr could not run; it was not printed" > "$SCRATCH/row.err"; rc=1 ;;
      esac
    fi
    cat "$SCRATCH/row.err" >&2
  }
  run_row
  suffix=""
  inc=0; [ "$rc" -ne 75 ] || inc=1   # attempts that saw a provider error, whatever the row asserted
  if [ -n "$OPENROUTER" ] && [ "$kind" = live ]; then
    # 75 is a provider error (live.sh). Re-run once on the fallback model. Every
    # log the first attempt kept (one per live_run call) is renamed
    # <row>-<harness>.attempt1*.log, so the second attempt cannot overwrite it.
    # Claude Code has no fallback: only Haiku works there, so its 75 is a GAP.
    if [ "$rc" -eq 75 ] && [ "$HARNESS" != claude-code ]; then
      first="$(basename "$f" .sh)-$HARNESS"
      if [ -n "${FX_CONFORMANCE_LOGS:-}" ]; then
        for g in "$FX_CONFORMANCE_LOGS/$first".log "$FX_CONFORMANCE_LOGS/$first".[0-9]*.log; do
          [ -f "$g" ] && mv "$g" "$FX_CONFORMANCE_LOGS/$first.attempt1${g#"$FX_CONFORMANCE_LOGS/$first"}"
        done
      else
        echo "row $n: the first attempt's log is not kept: FX_CONFORMANCE_LOGS is unset" >&2
      fi
      echo "row $n: provider error on the primary model, re-running once on $OR_FALLBACK" >&2
      FX_LIVE_MODEL="openrouter/$OR_FALLBACK" run_row
      suffix=" attempt=2 (fallback)"
      [ "$rc" -ne 75 ] || inc=2
    fi
    suffix=" model=$(cat "$SCRATCH/row.model" 2>/dev/null || echo unknown)$suffix"
    [ "$inc" -eq 0 ] || suffix="$suffix inconclusive=$inc"
    inc_total=$((inc_total+inc))
    [ "$rc" -ne 75 ] || rc=77   # a provider error that survived the re-run is a GAP, its reason is on stderr above
  fi
  ran=$((ran+1))
  # A GAP with no reason is indistinguishable from a row that gave up. FAIL it.
  if [ "$rc" -eq 77 ] && ! [ -s "$SCRATCH/row.err" ]; then
    echo "row exited 77 with no reason on stderr; a GAP must say why" >&2; rc=1
  fi
  if [ "$rc" -eq 77 ] && [ -n "$FREE" ] && ! expected_gap "$n"; then
    echo "row $n is not an expected gap for $HARNESS ($EXPECTED_GAPS): a free row that stops passing is a FAIL" >&2; rc=1
  fi
  case "$rc" in
    0)  printf 'PASS  %2s  %s%s\n' "$n" "$name" "$suffix"; pass=$((pass+1))
        case "$suffix" in *"(fallback)"*) fb=$((fb+1)) ;; esac ;;
    77) printf 'GAP   %2s  %s%s\n' "$n" "$name" "$suffix"; gap=$((gap+1)) ;;
    *)  printf 'FAIL  %2s  %s%s\n' "$n" "$name" "$suffix"; fail=$((fail+1)) ;;
  esac
done

# Under OpenRouter the passes that needed the fallback model are counted apart.
fbnote=""; [ "$fb" -eq 0 ] || fbnote=" ($fb on fallback)"
incnote=""; [ "$inc_total" -eq 0 ] || incnote=", $inc_total inconclusive"
printf '\n%s: %d pass%s, %d fail, %d gap%s\n' "$HARNESS" "$pass" "$fbnote" "$fail" "$gap" "$incnote"

# A runner that dispatched nothing looks exactly like success. Say so instead.
if [ "$ran" -eq 0 ]; then
  echo "no rows ran: the runner dispatched nothing, which is not a pass" >&2
  exit 2
fi
[ "$fail" -eq 0 ]
