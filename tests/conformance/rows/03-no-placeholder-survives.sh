#!/usr/bin/env bash
# 03: the preamble reaches a session with its lane names rendered, and no
# placeholder survives.
#
# PREAMBLE.md carries `{{...}}` placeholders so one file can serve three
# runtimes. A placeholder that reaches a session is a lane name the agent cannot
# act on. ADR 0020.
#
# The text is taken from each runtime's own entry point, never from
# lib/preamble directly: a delivery path that reads the raw PREAMBLE.md must
# fail here. opencode: the plugin's system transform. Claude Code and Codex:
# the SessionStart hook script, spawned with a SessionStart payload. The Codex
# hook plants roles into CODEX_HOME, which the runner points at its scratch home.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "03|no placeholder survives|free"; exit 0; }
: "${FX_REAL_HOME:?run rows through tests/conformance/run.sh, which isolates HOME}"

cd "$FX"
payload='{"hook_event_name":"SessionStart","source":"startup","cwd":"'"$FX"'"}'
case "$HARNESS" in
  opencode)
    text="$(node --input-type=module -e '
      const { fx } = await import(process.cwd() + "/plugins/fx.js");
      const hooks = await fx({ directory: process.cwd() });
      const out = { system: [] };
      await hooks["experimental.chat.system.transform"]({}, out);
      process.stdout.write(out.system.join("\n"));
    ')" || { echo "opencode plugin system transform failed" >&2; exit 1; } ;;
  claude-code|codex)
    hook=hooks/fx-context.js; [ "$HARNESS" = codex ] && hook=hooks/fx-codex.js
    text="$(printf '%s' "$payload" | node "$hook" | node -e '
      let r = ""; process.stdin.on("data", c => r += c).on("end", () =>
        process.stdout.write(JSON.parse(r).hookSpecificOutput.additionalContext));
    ')" || { echo "$hook produced no additionalContext" >&2; exit 1; } ;;
esac

TEXT="$text" node -e '
const text = process.env.TEXT, harness = process.env.HARNESS;
if (!text) { console.error(harness + ": empty preamble"); process.exit(1); }
if (text.includes("{{")) {
  console.error("unrendered placeholder reached the session: " +
    (text.match(/\{\{[^}]*\}\}/g) || []).join(", "));
  process.exit(1);
}
// The addressing must be this runtime s own, not another s.
const want = { "claude-code": "fx:fx-tdd", opencode: "fx-tdd", codex: "$fx-tdd" };
if (!text.includes(want[harness])) {
  console.error(harness + " preamble does not carry " + want[harness]);
  process.exit(1);
}
if (harness !== "claude-code" && text.includes("fx:fx-tdd")) {
  console.error(harness + " carries the Claude Code plugin prefix");
  process.exit(1);
}
'
