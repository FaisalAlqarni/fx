#!/usr/bin/env bash
# live_run must not discard the CLI's exit code (final review Minor 6). A stub
# `claude` that exits 3 stands in for a crashed CLI; the probe row must FAIL,
# where it used to PASS because nothing it checked was present. A stub that
# ends its stream with Claude Code's error_max_turns result and exits 1 stands
# in for a session that ran out of --max-turns: that row is a GAP naming the
# cause, never a FAIL and never a PASS (re-review Important). No model call:
# the stub is the only CLI that runs, inside the real jail, under a fake home.
set -uo pipefail
cd "$(dirname "$0")/../.."
command -v bwrap >/dev/null || { echo "live-exit-code: bwrap not installed, not run" >&2; exit 0; }
T="$(mktemp -d)" || exit 2
trap 'rm -rf -- "$T"' EXIT
FAKE="$T/fake-home"
mkdir -p "$FAKE/.claude" "$FAKE/bin" "$T/rows"
echo '{}' > "$FAKE/.claude/.credentials.json"
cat > "$T/rows/95-probe.sh" <<'ROW'
#!/usr/bin/env bash
[ "${1:-}" = --describe ] && { echo '95|exit code probe|live'; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
live_workdir
live_run 'anything'
exit 0
ROW
row() {  # row <stub body>: run the probe row against a stub claude
  printf '#!/bin/sh\n%s\n' "$1" > "$FAKE/bin/claude"; chmod +x "$FAKE/bin/claude"
  out="$(env PATH="$FAKE/bin:$PATH" HOME="$FAKE" FX_REAL_HOME="$FAKE" FX_CONFORMANCE_ROWS="$T/rows" \
    bash tests/conformance/run.sh claude-code 2>&1)"; rc=$?
}
fails=0
check() { grep -q "$1" <<<"$out" || { echo "FAIL: $2"; printf '%s\n' "$out"; fails=1; }; }

row 'echo stub-crashed; exit 3'
[ "$rc" -ne 0 ] || { echo "FAIL: the runner passed a session whose CLI exited 3"; fails=1; }
check '^FAIL  95' "a crash is not a FAIL"
check 'exited 3' "the exit code is not reported"

MAXT='{"type":"result","subtype":"error_max_turns","is_error":true,"num_turns":31,"errors":["Reached maximum number of turns (30)"]}'
row "echo '{\"type\":\"system\",\"subtype\":\"init\"}'; echo '$MAXT'; exit 1"
check '^GAP   95' "a max-turns stop is not a GAP"
check 'max-turns' "the GAP does not name max-turns"

# The same words anywhere but the CLI's own final result line are a crash.
row "echo '{\"type\":\"assistant\",\"message\":{\"content\":[{\"type\":\"text\",\"text\":\"error_max_turns\"}]}}'; echo 'not json: {\"type\":\"result\",\"subtype\":\"error_max_turns\"}'; exit 1"
check '^FAIL  95' "a crash that quotes error_max_turns is not a FAIL"
row "echo '$MAXT'; echo '{\"type\":\"result\",\"subtype\":\"error_during_execution\",\"is_error\":true}'; exit 1"
check '^FAIL  95' "a later error result is not a FAIL"

[ "$fails" -eq 0 ] || exit 1
echo "live-exit-code: all passed"
