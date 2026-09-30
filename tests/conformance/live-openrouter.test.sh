#!/usr/bin/env bash
# FX_LIVE_PROVIDER=openrouter in live.sh and run.sh, with no model call: a stub
# `claude` stands in for the CLI, inside the real jail, under a fake home that
# holds NO credential file. Proves: the stub runs without a credential copy; a
# provider error counts only from the CLI's stderr and error events, never
# assistant text; a key in a log fails the row before any copy; the result line
# names the session's own model and a different model fails the row; run.sh
# re-runs a 75 once on the fallback and a second 75 is a GAP.
set -uo pipefail
cd "$(dirname "$0")/../.."
command -v bwrap >/dev/null || { echo "live-openrouter: bwrap not installed, not run" >&2; exit 0; }
T="$(mktemp -d)" || exit 2
trap 'rm -rf -- "$T"' EXIT
FAKE="$T/fake-home"; LOGS="$T/logs"
mkdir -p "$FAKE/.claude" "$FAKE/bin" "$T/rows" "$T/rows75" "$LOGS"
cat > "$T/rows/95-probe.sh" <<'ROW'
#!/usr/bin/env bash
[ "${1:-}" = --describe ] && { echo '95|openrouter probe|live'; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
live_workdir
live_run 'anything'
exit 0
ROW
# A row that never reaches a CLI: 75 until the runner re-runs it on the fallback.
cat > "$T/rows75/96-fallback.sh" <<'ROW'
#!/usr/bin/env bash
[ "${1:-}" = --describe ] && { echo '96|fallback probe|live'; exit 0; }
[ "${FX_STUB_ALWAYS_75:-}" = 1 ] || [ -z "${FX_LIVE_MODEL:-}" ] && { echo "stub: provider error (status: 429)" >&2; exit 75; }
echo "${FX_LIVE_MODEL#openrouter/}" > "$FX_ROW_MODEL_FILE"; exit 0
ROW
ok='{"type":"system","subtype":"init","model":"anthropic/claude-haiku-4.5"}'
row() {  # row <stub body>
  printf '#!/bin/sh\n%s\n' "$1" > "$FAKE/bin/claude"; chmod +x "$FAKE/bin/claude"
  rm -f "$LOGS"/*
  out="$(env PATH="$FAKE/bin:$PATH" HOME="$FAKE" FX_REAL_HOME="$FAKE" FX_CONFORMANCE_ROWS="$T/rows" FX_CONFORMANCE_LOGS="$LOGS" \
    FX_LIVE_PROVIDER=openrouter OPENROUTER_API_KEY=fx-fake-key bash tests/conformance/run.sh claude-code 2>&1)"; rc=$?
}
fails=0
check() { grep -q "$1" <<<"$out" || { echo "FAIL: $2"; printf '%s\n' "$out"; fails=1; }; }

row "echo '$ok'; exit 0"
check '^PASS  95.*model=anthropic/claude-haiku-4.5$' "a clean session with no credential file does not PASS with the session's model"
row "echo '{\"type\":\"system\",\"subtype\":\"init\",\"model\":\"claude-opus-4\"}'; exit 0"
check '^FAIL  95.*model=claude-opus-4' "a session on another model is not a FAIL naming it"
row "echo '{\"type\":\"assistant\",\"message\":{\"content\":[{\"type\":\"text\",\"text\":\"status: 429 Too Many Requests, Insufficient credits\"}]}}'; exit 1"
check '^FAIL  95' "assistant text naming a provider error is not a FAIL"
row "echo 'ERROR: exceeded retry limit, last status: 429 Too Many Requests' >&2; exit 1"
check '^GAP   95' "a provider error on stderr is not a GAP (claude-code has no fallback)"
check 'provider error' "the provider-error GAP does not say so"
row "echo '{\"type\":\"result\",\"is_error\":true,\"result\":\"API Error: 503 upstream\"}'; exit 1"
check '^GAP   95' "the CLI's own 503 result is not a GAP"
row "echo '$ok'; echo 'sk-or-v1-leaked'; exit 0"
check '^FAIL  95' "a log with a key is not a FAIL"
[ -z "$(ls -A "$LOGS")" ] || { echo "FAIL: a log holding a key was copied: $(ls "$LOGS")"; fails=1; }

# run.sh: the re-run on the fallback, and a second 75.
r75() { out="$(env FX_CONFORMANCE_ROWS="$T/rows75" FX_CONFORMANCE_LOGS="$LOGS" FX_LIVE_PROVIDER=openrouter "$@" bash tests/conformance/run.sh codex 2>&1)"; rc=$?; }
r75
check '^PASS  96.*model=deepseek/deepseek-v4-flash attempt=2 (fallback)$' "a 75 is not re-run once on the fallback"
r75 FX_STUB_ALWAYS_75=1
check '^GAP   96.*attempt=2 (fallback)' "a second 75 is not a GAP"
check 'provider error' "the second-75 GAP carries no reason"

[ "$fails" -eq 0 ] || exit 1
echo "live-openrouter: all passed"
