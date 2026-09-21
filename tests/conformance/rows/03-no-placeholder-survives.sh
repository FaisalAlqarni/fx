#!/usr/bin/env bash
# 03: the preamble reaches a session with its lane names rendered, and no
# placeholder survives.
#
# PREAMBLE.md carries `{{...}}` placeholders so one file can serve three
# runtimes. A placeholder that reaches a session is a lane name the agent cannot
# act on. ADR 0020.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "03|no placeholder survives|free"; exit 0; }

cd "$FX"
node -e '
const { render } = require("./lib/preamble");
const harness = process.env.HARNESS;
let text;
try { text = render({ harness, cwd: process.cwd() }); }
catch (e) { console.error("render threw: " + e.message); process.exit(1); }

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
