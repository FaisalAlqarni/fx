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
# A row that calls live_run twice: each call's kept log needs its own name.
cat > "$T/rows/97-twice.sh" <<'ROW'
#!/usr/bin/env bash
[ "${1:-}" = --describe ] && { echo '97|two sessions|live'; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
live_workdir
live_run 'one'
live_run 'two'
exit 0
ROW
# A row that never reaches a CLI: 75 until the runner re-runs it on the fallback.
cat > "$T/rows75/96-fallback.sh" <<'ROW'
#!/usr/bin/env bash
[ "${1:-}" = --describe ] && { echo '96|fallback probe|live'; exit 0; }
[ "${FX_STUB_LEAK:-}" = 1 ] && { echo "tail of the answer: $OPENROUTER_API_KEY" >&2; exit 1; }
[ "${FX_STUB_ALWAYS_75:-}" = 1 ] || [ -z "${FX_LIVE_MODEL:-}" ] && {
  [ -z "${FX_CONFORMANCE_LOGS:-}" ] || { echo first > "$FX_CONFORMANCE_LOGS/96-fallback-codex.log"; echo first2 > "$FX_CONFORMANCE_LOGS/96-fallback-codex.2.log"; }
  echo "stub: provider error (status: 429)" >&2; exit 75; }
echo "${FX_LIVE_MODEL#openrouter/}" > "$FX_ROW_MODEL_FILE"; exit 0
ROW
# A row that judges the session and fails it: used for the subagent 429 checks.
mkdir -p "$T/rows98"
cat > "$T/rows98/98-judges.sh" <<'ROW'
#!/usr/bin/env bash
[ "${1:-}" = --describe ] && { echo '98|judges the session|live'; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
live_workdir
live_run 'anything'
[ "${FX_STUB_PASS:-}" = 1 ] && exit 0
fail "the subagent never ran the command"
ROW
ok='{"type":"system","subtype":"init","model":"anthropic/claude-haiku-4.5"}'
row() {  # row <stub body>
  printf '#!/bin/sh\n%s\n' "$1" > "$FAKE/bin/claude"; chmod +x "$FAKE/bin/claude"
  rm -f "$LOGS"/*
  out="$(env PATH="$FAKE/bin:$PATH" HOME="$FAKE" FX_REAL_HOME="$FAKE" FX_CONFORMANCE_ROWS="$T/rows" FX_CONFORMANCE_LOGS="$LOGS" \
    FX_LIVE_PROVIDER=openrouter OPENROUTER_API_KEY=$KEY "${ENVX[@]}" bash tests/conformance/run.sh claude-code 2>&1)"; rc=$?
}
ENVX=(FX_X=1)
# Built at run time, so this script's own command line never holds it.
KEY="fxkey-$$-$RANDOM-$RANDOM"
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

# A provider error anywhere in the session (here a Codex-shaped collab_tool_call
# line, exit 0) makes the run inconclusive whatever the row's assertions said:
# a FAIL and a PASS alike exit 75, so run.sh re-runs or GAPs it; the same text in
# a model message changes nothing; a log the detector cannot read is inconclusive
# too, never clean.
child='{"type":"item.completed","item":{"type":"collab_tool_call","tool":"wait","prompt":null,"agents_states":{"t1":{"status":"errored","message":"exceeded retry limit, last status: 429 Too Many Requests"}},"status":"failed"}}'
saved="$T/rows"; T_ROWS="$T/rows98"
rowc() { printf '#!/bin/sh\n%s\n' "$1" > "$FAKE/bin/claude"; chmod +x "$FAKE/bin/claude"; shift; rm -f "$LOGS"/*
  out="$(env PATH="$FAKE/bin:$PATH" HOME="$FAKE" FX_REAL_HOME="$FAKE" FX_CONFORMANCE_ROWS="$T_ROWS" FX_CONFORMANCE_LOGS="$LOGS" \
    FX_LIVE_PROVIDER=openrouter OPENROUTER_API_KEY=$KEY "$@" bash tests/conformance/run.sh claude-code 2>&1)"; rc=$?; }
rowc "echo '$ok'; echo '$child'; exit 0"
check '^GAP   98.*inconclusive=1' "a FAIL beside a subagent 429 is not an inconclusive GAP"
check 'provider error in a subagent (last status: 429)' "the GAP does not name the subagent 429"
rowc "echo '$ok'; echo '$child'; exit 0" FX_STUB_PASS=1
check '^GAP   98.*inconclusive=1' "a PASS beside a subagent 429 is not inconclusive"
rowc "echo '$ok'; echo '{\"type\":\"item.completed\",\"item\":{\"type\":\"agent_message\",\"text\":\"last status: 429 Too Many Requests\"}}'; exit 0" FX_STUB_PASS=1
check '^PASS  98' "a 429 in a model message is not a clean PASS"
rowc "echo '$ok'; echo '{\"type\":\"item.completed\",\"item\":{\"type\":\"agent_mess'; exit 0" FX_STUB_PASS=1
check '^GAP   98.*inconclusive=1' "a log with a cut JSON line is not inconclusive"
check 'could not read' "the unreadable-log GAP does not say so"

# opencode-v2 with a stub `opencode`: a child session whose export fails is a
# FAIL whatever the parent did (the child's error would be invisible), and a
# crash of the model lookup is a FAIL carrying the node error, not a silent
# empty model. run.sh opencode-v2 reads no real credential under openrouter.
ocstub() {  # ocstub <export body>
  cat > "$FAKE/bin/opencode" <<STUB
#!/bin/sh
case "\$1" in
  --version) echo 2.0.18 ;;
  run) echo '{"type":"text","part":{"text":"child ses_child1 done"}}' ;;
  session) $1 ;;
esac
exit 0
STUB
  chmod +x "$FAKE/bin/opencode"
  rm -f "$LOGS"/*
  out="$(env PATH="$FAKE/bin:$PATH" HOME="$FAKE" FX_REAL_HOME="$FAKE" FX_CONFORMANCE_ROWS="$T_ROWS" FX_CONFORMANCE_LOGS="$LOGS" \
    FX_LIVE_PROVIDER=openrouter OPENROUTER_API_KEY=$KEY FX_STUB_PASS=1 bash tests/conformance/run.sh opencode-v2 2>&1)"; rc=$?
}
okexp='echo "{\"info\":{\"id\":\"ses_child1\"},\"messages\":[{\"type\":\"assistant\",\"model\":{\"id\":\"qwen/qwen3.8-27b:free\"}}]}"'
ocstub "$okexp"
check '^PASS  98' "a clean opencode-v2 stub session is not a PASS (the stub harness is broken)"
ocstub 'echo "no session here"; exit 3'
check '^FAIL  98' "a child session whose export failed is not a FAIL"
check 'child session export failed: ses_child1' "the failed export does not name the child"
ocstub 'echo "{\"info\":{\"id\":\"ses_child1\"},\"messages\":[]}"; exit 3'
check 'child session export failed: ses_child1' "a nonzero export exit with parseable output is not a FAIL"

# A crash of the session-model lookup is a FAIL with the node error, not an
# empty model that skips the model check. The wrapper fails only that call.
ocstub "$okexp"
printf '#!/bin/sh\n[ "$2" = model ] && { echo "boom: lookup crashed" >&2; exit 1; }\nPATH="${PATH#*%s/bin:}"; exec node "$@"\n' "$FAKE" > "$FAKE/bin/node"; chmod +x "$FAKE/bin/node"
out="$(env PATH="$FAKE/bin:$PATH" HOME="$FAKE" FX_REAL_HOME="$FAKE" FX_CONFORMANCE_ROWS="$T_ROWS" FX_CONFORMANCE_LOGS="$LOGS" \
  FX_LIVE_PROVIDER=openrouter OPENROUTER_API_KEY=$KEY FX_STUB_PASS=1 bash tests/conformance/run.sh opencode-v2 2>&1)"; rc=$?
rm -f "$FAKE/bin/node"
check '^FAIL  98' "a crashed model lookup is not a FAIL"
check 'boom: lookup crashed' "the crashed model lookup does not show the node error"

# The key crosses as a file, not a variable: Claude Code gets only
# ANTHROPIC_AUTH_TOKEN, and OPENROUTER_API_KEY is not in its environment.
row "m=anthropic/claude-haiku-4.5; [ \"\$ANTHROPIC_AUTH_TOKEN\" = $KEY ] && [ -z \"\${OPENROUTER_API_KEY:-}\" ] || m=ENV-WRONG; echo '{\"type\":\"system\",\"subtype\":\"init\",\"model\":\"'\$m'\"}'; exit 0"
check '^PASS  95.*model=anthropic/claude-haiku-4.5$' "the CLI does not get only ANTHROPIC_AUTH_TOKEN holding the key"

# No process on the host has the key on its command line while a session runs.
printf '#!/bin/sh\necho %s; exec sleep 6.123\n' "'$ok'" > "$FAKE/bin/claude"; chmod +x "$FAKE/bin/claude"
( env PATH="$FAKE/bin:$PATH" HOME="$FAKE" FX_REAL_HOME="$FAKE" FX_CONFORMANCE_ROWS="$T/rows" FX_LIVE_PROVIDER=openrouter \
    OPENROUTER_API_KEY=$KEY bash tests/conformance/run.sh claude-code >"$T/cmdline.out" 2>&1 ) &
runpid=$!
seen_sleep=""
for _ in $(seq 100); do
  for c in /proc/[0-9]*/cmdline; do
    { tr '\0' ' ' < "$c" | grep -q 'sleep 6.123'; } 2>/dev/null && { seen_sleep=1; break; }
  done
  [ -n "$seen_sleep" ] && break; sleep 0.2
done
[ -n "$seen_sleep" ] || { echo "FAIL: the stub session never started"; fails=1; }
hits=""
for c in /proc/[0-9]*/cmdline; do
  { tr '\0' ' ' < "$c" | grep -q "$KEY"; } 2>/dev/null && hits="$hits $c"
done
hits="$(for c in $hits; do [ "$c" = "/proc/$$/cmdline" ] || echo "$c"; done)"
[ -z "$hits" ] || { echo "FAIL: the key is on a command line during a session:$(for c in $hits; do echo; echo -n "  $c: "; tr '\0' ' ' < "$c" | cut -c1-200; done)"; fails=1; }
wait "$runpid"

# The key's own value is scanned for, not only the sk-or- prefix.
row "echo '$ok'; echo 'the key is $KEY'; exit 0"
check '^FAIL  95' "a log with the key's own value is not a FAIL"
[ -z "$(ls -A "$LOGS")" ] || { echo "FAIL: a log holding the key value was copied"; fails=1; }

# A timeout is a provider error only beside an upstream HTTP error.
export FX_LIVE_TIMEOUT=2
row "exec sleep 30"
check '^FAIL  95' "a silent timeout is not a FAIL"
check 'no output before timeout' "the silent timeout does not say so"
row "echo 'HTTP/1.1 503 Service Unavailable' >&2; exec sleep 30"
check '^GAP   95' "a timeout beside an upstream 503 is not a GAP"
unset FX_LIVE_TIMEOUT

# A row that calls live_run twice keeps both logs.
cp "$T/rows/95-probe.sh" "$T/rows/95-probe.sh.keep"; mv "$T/rows/95-probe.sh" "$T/95.off"
row "echo '$ok'; exit 0"
[ -f "$LOGS/97-twice-claude-code.log" ] && [ -f "$LOGS/97-twice-claude-code.2.log" ] \
  || { echo "FAIL: a second live_run overwrote the first log: $(ls "$LOGS")"; fails=1; }
mv "$T/95.off" "$T/rows/95-probe.sh"; rm -f "$T/rows/95-probe.sh.keep"

# run.sh: the re-run on the fallback, and a second 75.
r75() { rm -f "$LOGS"/*; out="$(env FX_CONFORMANCE_ROWS="$T/rows75" FX_CONFORMANCE_LOGS="$LOGS" FX_LIVE_PROVIDER=openrouter "$@" bash tests/conformance/run.sh codex 2>&1)"; rc=$?; }
r75
check '^PASS  96.*model=deepseek/deepseek-v4-flash attempt=2 (fallback) inconclusive=1$' "a 75 is not re-run once on the fallback"
check '1 pass (1 on fallback), 0 fail, 0 gap, 1 inconclusive' "the summary does not count the fallback pass and the inconclusive attempt"
for f in 96-fallback-codex.attempt1.log 96-fallback-codex.attempt1.2.log; do
  [ -f "$LOGS/$f" ] || { echo "FAIL: the first attempt's log is not kept as $f: $(ls "$LOGS")"; fails=1; }
done
[ ! -f "$LOGS/96-fallback-codex.log" ] || { echo "FAIL: the first attempt's log was left under the live name"; fails=1; }
r75 FX_STUB_ALWAYS_75=1
check '^GAP   96.*attempt=2 (fallback) inconclusive=2' "a second 75 is not a GAP"
check 'provider error' "the second-75 GAP carries no reason"
# Rows print tails of the model's answer: the runner scans that stderr for the key.
r75 OPENROUTER_API_KEY=$KEY FX_STUB_LEAK=1
grep -q "$KEY" <<<"$out" && { echo "FAIL: the runner printed a row's stderr holding the key"; fails=1; }
check '^FAIL  96' "a row whose stderr held the key is not a FAIL"

[ "$fails" -eq 0 ] || exit 1
echo "live-openrouter: all passed"
