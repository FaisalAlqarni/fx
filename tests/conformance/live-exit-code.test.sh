#!/usr/bin/env bash
# live_run must not discard the CLI's exit code (final review Minor 6). A stub
# `claude` that exits 3 stands in for a crashed CLI; the probe row must FAIL,
# where it used to PASS because nothing it checked was present. No model call:
# the stub is the only CLI that runs, inside the real jail, under a fake home.
set -uo pipefail
cd "$(dirname "$0")/../.."
command -v bwrap >/dev/null || { echo "live-exit-code: bwrap not installed, not run" >&2; exit 0; }
T="$(mktemp -d)" || exit 2
trap 'rm -rf -- "$T"' EXIT
FAKE="$T/fake-home"
mkdir -p "$FAKE/.claude" "$FAKE/bin" "$T/rows"
echo '{}' > "$FAKE/.claude/.credentials.json"
printf '#!/bin/sh\necho stub-crashed\nexit 3\n' > "$FAKE/bin/claude"; chmod +x "$FAKE/bin/claude"
cat > "$T/rows/95-probe.sh" <<'ROW'
#!/usr/bin/env bash
[ "${1:-}" = --describe ] && { echo '95|exit code probe|live'; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
live_workdir
live_run 'anything'
exit 0
ROW
out="$(env PATH="$FAKE/bin:$PATH" HOME="$FAKE" FX_REAL_HOME="$FAKE" FX_CONFORMANCE_ROWS="$T/rows" \
  bash tests/conformance/run.sh claude-code 2>&1)"; rc=$?
fails=0
[ "$rc" -ne 0 ] || { echo "FAIL: the runner passed a session whose CLI exited 3"; fails=1; }
grep -q '^FAIL  95' <<<"$out" || { echo "FAIL: the row was not a FAIL"; fails=1; }
grep -q 'exited 3' <<<"$out" || { echo "FAIL: the exit code is not reported"; fails=1; }
[ "$fails" -eq 0 ] || { printf '%s\n' "$out"; exit 1; }
echo "live-exit-code: all passed"
