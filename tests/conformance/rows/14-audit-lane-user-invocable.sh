#!/usr/bin/env bash
# 14: hiding a lane from the model does not hide it from the user.
#
# The counterpart to row 13. A lane hidden from both is not hidden, it is gone.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "14|audit lane user-invocable|free"; exit 0; }
cd "$FX"
node -e '
const fs = require("fs"), path = require("path");
const HIDDEN = ["fx-audit", "fx-critique", "fx-grill", "fx-handoff", "fx-setup"];
for (const n of HIDDEN) {
  const skill = path.join("skills", n, "SKILL.md");
  if (!fs.existsSync(skill)) { console.error(n + ": no SKILL.md to invoke"); process.exit(1); }
  const body = fs.readFileSync(skill, "utf8").replace(/^---\n[\s\S]*?\n---\n/, "");
  if (body.trim().length < 100) { console.error(n + ": body too thin to be real"); process.exit(1); }
}
// The four command-derived lanes must still have their command, which is how a
// user types them on Claude Code and opencode.
for (const n of ["fx-critique", "fx-grill", "fx-handoff", "fx-setup"]) {
  if (!fs.existsSync(path.join("commands", n + ".md"))) {
    console.error(n + ": command removed, user route gone"); process.exit(1); }
}
'
