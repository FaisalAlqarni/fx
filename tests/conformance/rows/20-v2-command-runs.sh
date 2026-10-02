#!/usr/bin/env bash
# 20: an fx command, invoked the way a 2.x user invokes one, runs its lane.
#
# `opencode run` has no command flag and sends `/name args` as plain text
# (probe-findings.md section 8), so the row drives the documented API route
# against its own server: `opencode serve`, `session.create`, then
# `session.command`. The plugin's `execute` delivers the lane prompt with
# `ctx.session.prompt`. PASS needs a user message in the session export (the
# CLI's own record, never model text) that holds the lane's own heading and ends
# with `Arguments, if any: <token>`, so $ARGUMENTS was substituted, and no
# message that still holds the literal $ARGUMENTS.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "20|fx command runs|live"; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
[ "$HARNESS" = opencode-v2 ] || gap "only opencode-v2 invokes a command through the API; the other runtimes address a lane in the prompt (row 14)"
live_workdir

TOKEN="ARGTOKEN-$RANDOM$RANDOM"
tmp="$LIVE_SCRATCH/tmp"; mkdir -p "$tmp"
PORT="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])')"
URL="http://127.0.0.1:$PORT"
SJ=("${JAIL[@]}"); KW=()
if [ -n "$OPENROUTER" ]; then
  unset 'SJ[${#SJ[@]}-1]'
  SJ+=(--ro-bind "$OR_KEYFILE" "$OR_KEYFILE" --)
  KW=(sh "$FX/tests/conformance/lib/with-key.sh" "$OR_KEYFILE" "$OR_KEY_VAR" --)
fi
ENVV=(env TMPDIR="$tmp" XDG_DATA_HOME="$WORK.data")

( cd "$WORK" && exec timeout 600 "${SJ[@]}" "${KW[@]}" "${ENVV[@]}" opencode serve --hostname 127.0.0.1 --port "$PORT" ) \
  </dev/null >"$LOGDIR/serve.out" 2>&1 &
SRV=$!
trap 'kill "$SRV" 2>/dev/null; wait "$SRV" 2>/dev/null; rm -rf -- "$WORK" "$LOGDIR" "$WORK.start" "$WORK.data" "$WORK.export" "${KEYDIR:-}"' EXIT

# The server prints a one-off password for its own port; the client reads it
# from OPENCODE_PASSWORD. It guards a throwaway local server, nothing else.
pw() { grep -oP 'password \K\S+' "$LOGDIR/serve.out" | head -n1; }
api() { "${JAIL[@]}" "${ENVV[@]}" OPENCODE_PASSWORD="$(pw)" timeout 60 opencode api --server "$URL" "$@" </dev/null 2>/dev/null; }

ok=""
for _ in $(seq 60); do
  api command.list | grep -q '"fx-handoff"' && { ok=1; break; }
  sleep 1
done
[ -n "$ok" ] || fail "the server never listed fx-handoff in command.list (serve: $(head -c 300 "$LOGDIR/serve.out" | sed 's/password .*/password [redacted]/'))"

SID="$(api session.create -d "{\"location\":{\"directory\":\"$WORK\"},\"agent\":\"build\"}" \
  | node -e 'try{console.log(JSON.parse(require("fs").readFileSync(0,"utf8")).data.id)}catch{}')"
[ -n "$SID" ] || fail "session.create returned no id"
api session.command --param "sessionID=$SID" -d "{\"name\":\"fx-handoff\",\"text\":\"$TOKEN\"}" >/dev/null \
  || fail "session.command refused fx-handoff"

# Wait for the turn to end: the export carries an idle message when it does.
exp() { : > "$LOG"; export_session "$SID" "${JAIL[@]}" "${ENVV[@]}" opencode session export "$SID" --standalone; }
for _ in $(seq 90); do
  sleep 2; exp
  grep -q '"type":"idle"' "$LOG" && break
done

F="$LOG" TOKEN="$TOKEN" node -e '
  const fs = require("fs");
  const msgs = [];
  for (const l of fs.readFileSync(process.env.F, "utf8").split("\n")) {
    try { const j = JSON.parse(l); if (j.fx_export) msgs.push(...(j.fx_export.messages || [])); } catch {}
  }
  const users = msgs.filter((m) => typeof m.text === "string");
  const t = process.env.TOKEN;
  const lane = users.find((m) => m.text.includes("# /fx-handoff") && m.text.trimEnd().endsWith("Arguments, if any: " + t));
  if (!lane) { console.error("no user message holds the fx-handoff prompt ending in the argument; user messages: " + users.map((m) => JSON.stringify(m.text.slice(-80))).join(" | ")); process.exit(1); }
  if (users.some((m) => m.text.includes("$ARGUMENTS"))) { console.error("a user message still holds the literal $ARGUMENTS"); process.exit(1); }
' || fail "the command did not deliver the lane prompt (log: $LOG)"

if [ -n "$OPENROUTER" ]; then
  cerr="$(node "$OR_JS" child "$LOG" "$HARNESS" 2>&1)"; rc=$?
  case $rc in
    1) ;;
    0) echo "$HARNESS: provider error in the command's session ($cerr)" >&2; exit 75 ;;
    *) echo "$HARNESS: provider error detector could not read the session log ($cerr)" >&2; exit 75 ;;
  esac
  node "$OR_JS" leaks "$LOG" "$OR_KEYFILE" || fail "the session log holds the OpenRouter key, or the scan could not run"
  m="$(node "$OR_JS" model "$HARNESS" "$LOG")"
  [ -z "$m" ] || [ -z "${FX_ROW_MODEL_FILE:-}" ] || echo "$m" > "$FX_ROW_MODEL_FILE"
fi
[ -z "${FX_CONFORMANCE_LOGS:-}" ] || cp "$LOG" "$FX_CONFORMANCE_LOGS/20-v2-command-runs-$HARNESS.log"
exit 0
