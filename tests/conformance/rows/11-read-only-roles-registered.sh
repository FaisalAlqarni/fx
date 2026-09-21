#!/usr/bin/env bash
# 11: every read-only review agent is registered on this runtime.
#
# There are six and only five are named fx-lens-*. fx-devils-advocate carries
# the same restriction. A prefix match leaves it writable on one runtime and
# read-only on another, which is the shape this row exists to catch.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "11|read-only roles registered|free"; exit 0; }
cd "$FX"
node -e '
const fs = require("fs");
const { READ_ONLY_AGENTS } = require("./lib/plant-roles");
const harness = process.env.HARNESS;
if (!READ_ONLY_AGENTS.includes("fx-devils-advocate")) {
  console.error("fx-devils-advocate missing from READ_ONLY_AGENTS"); process.exit(1); }

if (harness === "codex") {
  for (const n of READ_ONLY_AGENTS) {
    const p = "codex/agents/" + n + ".toml";
    if (!fs.existsSync(p)) { console.error("no generated role: " + p); process.exit(1); }
    if (!fs.readFileSync(p, "utf8").includes("sandbox_mode")) {
      console.error(p + ": no sandbox_mode"); process.exit(1); }
  }
} else if (harness === "opencode") {
  const { toOpencodeAgent } = require("./lib/agent-dialects");
  for (const n of READ_ONLY_AGENTS) {
    const md = fs.readFileSync("agents/" + n + ".md", "utf8");
    const a = toOpencodeAgent(md);
    if (!a || a.permission.edit !== "deny") {
      console.error(n + ": opencode dialect does not deny edit"); process.exit(1); }
    if (a.permission.bash !== "deny") {
      console.error(n + ": opencode dialect does not deny the shell"); process.exit(1); }
    if (a.mode !== "subagent") {
      console.error(n + ": not registered as a subagent"); process.exit(1); }
  }
} else {
  for (const n of READ_ONLY_AGENTS) {
    const p = "agents/" + n + ".md";
    const t = fs.readFileSync(p, "utf8");
    if (!/^tools:\s*Read, Grep, Glob\s*$/m.test(t)) {
      console.error(p + ": tools allowlist missing or changed"); process.exit(1); }
  }
}
'
