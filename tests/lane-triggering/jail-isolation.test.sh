#!/usr/bin/env bash
# run-test.sh and run-reps.sh used to run claude unjailed, with FX_REAL_HOME
# exported into the session's own environment. Security review, task 02 fix
# round 1: the scratch HOME stopped the real config loading, but the session
# could still read the real home and other repos by absolute path, and
# FX_REAL_HOME was visible to it. Both now run the call through
# tests/conformance/lib/jail.sh, the way tests/conformance/lib/live.sh does,
# and never export FX_REAL_HOME.
#
# Static: the fix is structural, so grep it directly. Dynamic: prove the real
# home is actually unreachable, with a stand-in claude, never the real CLI.
set -uo pipefail
cd "$(dirname "$0")/../.."
fails=0
check() { if eval "$2"; then echo "ok   $1"; else echo "FAIL $1" >&2; fails=$((fails+1)); fi; }

for f in tests/lane-triggering/run-test.sh tests/lane-triggering/run-reps.sh; do
  check "$f: never exports FX_REAL_HOME" \
    '! grep -qE "^[[:space:]]*export[[:space:]]+FX_REAL_HOME" "$f"'
  check "$f: sources the conformance jail" \
    'grep -qF "conformance/lib/jail.sh" "$f"'
  check "$f: runs claude through the jail array" \
    'grep -qE "JAIL\[@\]\}\" claude" "$f"'
done

command -v bwrap >/dev/null || { echo "jail-isolation: bwrap not installed, static checks only" >&2; [ "$fails" -eq 0 ]; exit $?; }
command -v claude >/dev/null || { echo "jail-isolation: claude not on PATH, static checks only" >&2; [ "$fails" -eq 0 ]; exit $?; }

# A stand-in real home, with a sentinel credential at the exact path
# scratch_home_claude reads. A stand-in claude that tries to read that exact
# absolute path (never the scratch copy, which is legitimately allowed) and
# reports, in its own stream, whether it could.
T="$(mktemp -d)" || exit 2
trap 'rm -rf -- "$T"' EXIT
FAKE_REAL_HOME="$T/real-home"
mkdir -p "$FAKE_REAL_HOME/.claude"
echo fx-jail-isolation-sentinel >"$FAKE_REAL_HOME/.claude/.credentials.json"
SENTINEL="$FAKE_REAL_HOME/.claude/.credentials.json"

FAKEBIN="$T/fakebin"
mkdir -p "$FAKEBIN"
cat >"$FAKEBIN/claude" <<EOF
#!/usr/bin/env bash
echo '{"type":"system"}'
if cat "$SENTINEL" >/dev/null 2>&1; then
  echo "JAIL-ISOLATION-TEST: real home was readable"
else
  echo "JAIL-ISOLATION-TEST: real home was not readable"
fi
echo '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Skill","input":{"skill":"fx:fx-tdd"}}]}}'
EOF
chmod +x "$FAKEBIN/claude"

for row in run-test run-reps; do
  case "$row" in
    run-test) CMD=(bash tests/lane-triggering/run-test.sh fx-tdd tests/lane-triggering/prompts/fx-tdd.txt) ;;
    run-reps) CMD=(bash tests/lane-triggering/run-reps.sh fx-tdd tests/lane-triggering/prompts/fx-tdd.txt 1) ;;
  esac
  out="$(HOME="$FAKE_REAL_HOME" PATH="$FAKEBIN:$PATH" "${CMD[@]}" 2>&1)"
  case "$row" in
    run-test) logfile="$(printf '%s\n' "$out" | grep -oE '/[^[:space:]]*stream\.json' | tail -1)" ;;
    # run-reps never prints the log filename itself, only the directory
    # ("logs: <dir>"); with one rep the file is <dir>/rep1.stream.json.
    run-reps) logdir="$(printf '%s\n' "$out" | sed -n 's/^logs: //p' | tail -1)"
              logfile="${logdir:+$logdir/rep1.stream.json}" ;;
  esac
  check "$row: ran (produced a log)" '[ -n "$logfile" ] && [ -f "$logfile" ]'
  [ -n "$logfile" ] && [ -f "$logfile" ] || continue
  check "$row: the real home was not readable at its absolute path" \
    'grep -qF "real home was not readable" "$logfile"'
  check "$row: FX_REAL_HOME did not reach the claude process" \
    '! grep -qF "FX_REAL_HOME" "$logfile"'
done

if [ "$fails" -ne 0 ]; then
  echo "jail-isolation: $fails failed" >&2
  exit 1
fi
echo "jail-isolation: all passed"
