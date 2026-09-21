#!/usr/bin/env bash
# The conformance runner must never write to the home it was started from.
#
# An earlier runner snapshotted and restored the three runtime homes with
# `rm -rf <home> && cp -a <snapshot> <home>`, and deleted a real ~/.claude.
# The runner now points every row at a scratch home. This test proves it,
# against a FAKE home only: the real $HOME is never passed to the runner here.
#
# Two runs, each with a probe row that writes $HOME/.claude/probe:
#   1. a normal run;
#   2. a run sent SIGINT while the probe row sleeps.
# After both: the fake home is byte-identical, probe never landed in it, the
# row saw a scratch home with FX_REAL_HOME set to the fake home, and the
# runner's scratch directory is gone.
set -uo pipefail
cd "$(dirname "$0")/../.."
RUNNER="$PWD/tests/conformance/run.sh"

T="$(mktemp -d)" || { echo "mktemp failed" >&2; exit 2; }
case "$T" in /tmp/*|"${TMPDIR:-/tmp}"/*) ;; *) echo "unexpected temp dir: $T" >&2; exit 2 ;; esac
trap 'rm -rf -- "$T"' EXIT

FAKE="$T/fake-home" ROWS="$T/rows" OUT="$T/out"
mkdir -p "$FAKE/.codex" "$FAKE/.config/opencode" "$FAKE/.claude/plugins" "$ROWS" "$OUT"
echo codex-sentinel    > "$FAKE/.codex/config.toml"
echo opencode-sentinel > "$FAKE/.config/opencode/opencode.json"
echo claude-sentinel   > "$FAKE/.claude/settings.json"
echo plugin-sentinel   > "$FAKE/.claude/plugins/installed.json"

# The probe writes into $HOME/.claude, records the environment it saw, and
# optionally sleeps so a signal can arrive mid-row.
cat > "$ROWS/90-probe.sh" <<'ROW'
#!/usr/bin/env bash
[ "${1:-}" = --describe ] && { echo '90|probe|free'; exit 0; }
mkdir -p "$HOME/.claude" && echo probe > "$HOME/.claude/probe" || exit 1
printf '%s\n' "$HOME" "${CODEX_HOME:-}" "${XDG_CONFIG_HOME:-}" \
  "${CLAUDE_CONFIG_DIR:-}" "${FX_REAL_HOME:-}" > "$PROBE_OUT.tmp"
mv "$PROBE_OUT.tmp" "$PROBE_OUT"
[ -n "${PROBE_SLEEP:-}" ] && sleep "$PROBE_SLEEP"
exit 0
ROW

fingerprint() {
  (cd "$1" && find . -printf '%y %m %p\n' | sort &&
    find . -type f -exec sha256sum {} + | sort) | sha256sum
}
BEFORE="$(fingerprint "$FAKE")"

failures=0
check() { if eval "$2"; then echo "ok   $1"; else echo "FAIL $1" >&2; failures=$((failures+1)); fi; }

# Assertions shared by both runs. $1 names the run, $2 is the probe's record.
assert_isolated() {
  local run="$1" rec="$2" home codex xdg claude real scratch
  check "$run: probe row ran" '[ -s "$rec" ]'
  [ -s "$rec" ] || return
  { read -r home; read -r codex; read -r xdg; read -r claude; read -r real; } < "$rec"
  scratch="$(dirname "$home")"
  check "$run: row HOME is not the fake home"        '[ "$home" != "$FAKE" ]'
  check "$run: CODEX_HOME is under the row HOME"      '[ "$codex" = "$home/.codex" ]'
  check "$run: XDG_CONFIG_HOME is under the row HOME" '[ "$xdg" = "$home/.config" ]'
  check "$run: CLAUDE_CONFIG_DIR is under the row HOME" '[ "$claude" = "$home/.claude" ]'
  check "$run: FX_REAL_HOME is the home it was started from" '[ "$real" = "$FAKE" ]'
  check "$run: probe never landed in the fake home"   '[ ! -e "$FAKE/.claude/probe" ]'
  check "$run: fake home is byte-identical"           '[ "$(fingerprint "$FAKE")" = "$BEFORE" ]'
  check "$run: scratch directory removed"             '[ ! -e "$scratch" ]'
}

# 1. A normal run.
env HOME="$FAKE" CODEX_HOME="$FAKE/.codex" XDG_CONFIG_HOME="$FAKE/.config" \
    CLAUDE_CONFIG_DIR="$FAKE/.claude" FX_CONFORMANCE_ROWS="$ROWS" \
    PROBE_OUT="$OUT/normal" \
    bash "$RUNNER" codex --free > "$OUT/normal.log" 2>&1
rc=$?
check "normal: runner exits 0 (rc=$rc)" '[ "$rc" -eq 0 ]'
check "normal: runner dispatched the probe" 'grep -q "PASS  90  probe" "$OUT/normal.log"'
assert_isolated normal "$OUT/normal"

# 2. SIGINT mid-row. Job control gives the runner its own process group, so the
# signal reaches it the way a terminal ^C would, and a background job does not
# ignore SIGINT.
set -m
env HOME="$FAKE" CODEX_HOME="$FAKE/.codex" XDG_CONFIG_HOME="$FAKE/.config" \
    CLAUDE_CONFIG_DIR="$FAKE/.claude" FX_CONFORMANCE_ROWS="$ROWS" \
    PROBE_OUT="$OUT/sigint" PROBE_SLEEP=30 \
    bash "$RUNNER" codex --free > "$OUT/sigint.log" 2>&1 &
pid=$!
set +m
for _ in $(seq 100); do [ -s "$OUT/sigint" ] && break; sleep 0.1; done
kill -INT -- "-$pid"
wait "$pid"; rc=$?
check "sigint: runner did not exit 0 (rc=$rc)" '[ "$rc" -ne 0 ]'
check "sigint: runner did not finish the run" '! grep -q "pass, .* fail, .* gap" "$OUT/sigint.log"'
assert_isolated sigint "$OUT/sigint"

# 3. A row with no --describe guard runs its body on the describe call and
# prints nothing parseable. It must FAIL, never be skipped as "not free".
NG="$T/rows-noguard"; mkdir -p "$NG"
printf '%s\n' '#!/usr/bin/env bash' 'exit 0' > "$NG/91-noguard.sh"
env HOME="$FAKE" FX_CONFORMANCE_ROWS="$NG" \
    bash "$RUNNER" codex --free > "$OUT/noguard.log" 2>&1
rc=$?
check "noguard: runner exits non-zero (rc=$rc)" '[ "$rc" -ne 0 ]'
check "noguard: row reported as FAIL" 'grep -q "^FAIL.*91-noguard.sh" "$OUT/noguard.log"'

if [ "$failures" -ne 0 ]; then
  echo "--- normal.log" >&2; cat "$OUT/normal.log" >&2
  echo "--- sigint.log" >&2; cat "$OUT/sigint.log" >&2
  echo "--- noguard.log" >&2; cat "$OUT/noguard.log" >&2
  echo "runner-isolation: $failures failed" >&2
  exit 1
fi
echo "runner-isolation: all passed"
