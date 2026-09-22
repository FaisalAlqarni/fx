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
env -u FX_REAL_HOME HOME="$FAKE" CODEX_HOME="$FAKE/.codex" XDG_CONFIG_HOME="$FAKE/.config" \
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
env -u FX_REAL_HOME HOME="$FAKE" CODEX_HOME="$FAKE/.codex" XDG_CONFIG_HOME="$FAKE/.config" \
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

# 4. A mistyped mode flag must be refused before any row runs. Accepting
# `--fre` as "not --free" would run the live rows and spend quota. The probe
# row is free, so if the runner dispatched anything the probe record appears.
env HOME="$FAKE" FX_CONFORMANCE_ROWS="$ROWS" PROBE_OUT="$OUT/typo" \
    bash "$RUNNER" codex --fre > "$OUT/typo.log" 2>&1
rc=$?
check "typo: runner exits 2 on an unknown flag (rc=$rc)" '[ "$rc" -eq 2 ]'
check "typo: no row was dispatched" '[ ! -e "$OUT/typo" ]'
env HOME="$FAKE" FX_CONFORMANCE_ROWS="$ROWS" PROBE_OUT="$OUT/extra" \
    bash "$RUNNER" codex --free extra > "$OUT/extra.log" 2>&1
rc=$?
check "extra: runner exits 2 on a third argument (rc=$rc)" '[ "$rc" -eq 2 ]'

# 5. FX_REAL_HOME set on the command line survives into the row. A live run
# starts the runner under a fresh fake HOME and names the credential home
# explicitly; overwriting it with the fake HOME would make every live row GAP.
env HOME="$FAKE" FX_REAL_HOME="$T/named-home" FX_CONFORMANCE_ROWS="$ROWS" \
    PROBE_OUT="$OUT/named" bash "$RUNNER" codex --free > "$OUT/named.log" 2>&1
check "named: row sees the FX_REAL_HOME it was given" '[ "$(sed -n 5p "$OUT/named" 2>/dev/null)" = "$T/named-home" ]'

# 6. A GAP is a visible state only if it says why. A row exiting 77 with
# nothing on stderr is a FAIL; one that gives a reason stays a GAP, and the
# reason reaches the reader.
GR="$T/rows-gap"; mkdir -p "$GR"
printf '%s\n' '#!/usr/bin/env bash' \
  '[ "${1:-}" = --describe ] && { echo "92|silent gap|free"; exit 0; }' \
  'exit 77' > "$GR/92-silent-gap.sh"
printf '%s\n' '#!/usr/bin/env bash' \
  '[ "${1:-}" = --describe ] && { echo "93|reasoned gap|free"; exit 0; }' \
  'echo "codex: cannot support this, measured" >&2; exit 77' > "$GR/93-reasoned-gap.sh"
echo "codex 93" > "$T/expected-gaps"
env HOME="$FAKE" FX_CONFORMANCE_ROWS="$GR" FX_CONFORMANCE_EXPECTED_GAPS="$T/expected-gaps" \
    bash "$RUNNER" codex --free > "$OUT/gap.log" 2>&1
rc=$?
check "gap: runner exits non-zero on a silent gap (rc=$rc)" '[ "$rc" -ne 0 ]'
check "gap: silent gap reported as FAIL" 'grep -q "^FAIL  92  silent gap" "$OUT/gap.log"'
check "gap: reasoned gap stays a GAP" 'grep -q "^GAP   93  reasoned gap" "$OUT/gap.log"'
check "gap: the reason reaches the reader" 'grep -q "cannot support this, measured" "$OUT/gap.log"'
check "gap: summary counts one fail and one gap" 'grep -q "0 pass, 1 fail, 1 gap" "$OUT/gap.log"'

# A free row that drops from PASS to GAP must not keep the gate green: in
# --free mode a GAP is allowed only for a row listed as an expected gap for
# this harness (final review Minor 7).
UG="$T/unexpected-gap-rows"; mkdir -p "$UG"
cp "$GR/93-reasoned-gap.sh" "$UG/"
: > "$T/no-expected-gaps"
env HOME="$FAKE" FX_CONFORMANCE_ROWS="$UG" FX_CONFORMANCE_EXPECTED_GAPS="$T/no-expected-gaps" \
    bash "$RUNNER" codex --free > "$OUT/ugap.log" 2>&1
rc=$?
check "unexpected gap: runner exits non-zero (rc=$rc)" '[ "$rc" -ne 0 ]'
check "unexpected gap: reported as FAIL" 'grep -q "^FAIL  93  reasoned gap" "$OUT/ugap.log"'
check "unexpected gap: says it is not an expected gap" 'grep -q "not an expected gap" "$OUT/ugap.log"'

if [ "$failures" -ne 0 ]; then
  echo "--- normal.log" >&2; cat "$OUT/normal.log" >&2
  echo "--- sigint.log" >&2; cat "$OUT/sigint.log" >&2
  echo "--- noguard.log" >&2; cat "$OUT/noguard.log" >&2
  for f in typo extra gap ugap; do echo "--- $f.log" >&2; cat "$OUT/$f.log" >&2; done
  echo "runner-isolation: $failures failed" >&2
  exit 1
fi
echo "runner-isolation: all passed"
