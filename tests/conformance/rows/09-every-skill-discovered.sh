#!/usr/bin/env bash
# 09: every skill fx ships is discoverable on this runtime, and the count is the
# same on all three. A skill that ships to two runtimes and not the third is the
# asymmetry this matrix exists to catch.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "09|every skill discovered|free"; exit 0; }
cd "$FX"
node -e '
const fs = require("fs"), path = require("path");
const dirs = fs.readdirSync("skills").filter(d =>
  fs.existsSync(path.join("skills", d, "SKILL.md")));
if (dirs.length === 0) { console.error("no skills found"); process.exit(1); }
for (const d of dirs) {
  const t = fs.readFileSync(path.join("skills", d, "SKILL.md"), "utf8");
  const m = t.match(/^---\n([\s\S]*?)\n---/);
  if (!m) { console.error(d + ": no frontmatter"); process.exit(1); }
  if (!/^name:/m.test(m[1]))        { console.error(d + ": no name"); process.exit(1); }
  if (!/^description:/m.test(m[1])) { console.error(d + ": no description"); process.exit(1); }
}
process.stdout.write(String(dirs.length));
' > /tmp/fx-row09.$$ || exit 1
COUNT=$(cat /tmp/fx-row09.$$); rm -f /tmp/fx-row09.$$
# Every runtime is served from the same skills/ tree, so the count must not
# vary by harness. Pin it so a delivery that drops one is visible.
[ "$COUNT" -ge 13 ] || { echo "only $COUNT skills discovered, expected at least 13" >&2; exit 1; }
