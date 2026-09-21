#!/usr/bin/env bash
# 13: the five user-invoked lanes are hidden from the model on this runtime.
#
# Static half. The live half, asserting absence from the model-facing listing
# with visible controls, is task 12's.
#
# On Codex this also depends on undocumented behaviour: its command-to-skill
# migrator parses command frontmatter as strict YAML and skips what fails. All
# four fx commands carry an unquoted colon, so none migrate. A future Codex
# release that fixes that parser reopens the hole with no local warning, and the
# live half of this row is the only thing that would notice.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "13|audit lane not model-facing|free"; exit 0; }
cd "$FX"
node -e '
const fs = require("fs"), path = require("path");
const HIDDEN = ["fx-audit", "fx-critique", "fx-grill", "fx-handoff", "fx-setup"];
const head = p => (fs.readFileSync(p, "utf8").match(/^---\n([\s\S]*?)\n---/) || [,""])[1];

for (const n of HIDDEN) {
  const skill = path.join("skills", n, "SKILL.md");
  if (!/^disable-model-invocation:\s*true$/m.test(head(skill))) {
    console.error(n + ": Claude Code would auto-select it"); process.exit(1); }
  const side = path.join("skills", n, "agents", "openai.yaml");
  if (!fs.existsSync(side) ||
      !/allow_implicit_invocation:\s*false/.test(fs.readFileSync(side, "utf8"))) {
    console.error(n + ": Codex would auto-select it"); process.exit(1); }
}
for (const d of fs.readdirSync("skills")) {
  if (HIDDEN.includes(d)) continue;
  const p = path.join("skills", d, "SKILL.md");
  if (!fs.existsSync(p)) continue;
  if (/^disable-model-invocation:/m.test(head(p))) {
    console.error(d + ": hidden but not a user-invoked lane"); process.exit(1); }
}
'
