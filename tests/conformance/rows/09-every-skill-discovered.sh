#!/usr/bin/env bash
# 09: every skill fx ships is discoverable on this runtime.
#
# Two halves. The tree: skills/ holds exactly the pinned number of skill
# directories, each with a SKILL.md carrying name and description. The
# delivery: this runtime's own entry point hands every one of them over.
#   opencode:    the plugin's config hook registers skills/ in skills.paths.
#   codex:       the manifest's `skills` path resolves to skills/.
#   claude-code: `claude plugin details` (no model call) lists every skill.
# A skill that ships to two runtimes and not the third is the asymmetry this
# matrix exists to catch.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "09|every skill discovered|free"; exit 0; }
: "${FX_REAL_HOME:?run rows through tests/conformance/run.sh, which isolates HOME}"
cd "$FX"

# Pinned: adding or removing a skill updates this number on purpose.
EXPECTED=17
node -e '
const fs = require("fs"), path = require("path");
const dirs = fs.readdirSync("skills", { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
if (dirs.length !== +process.argv[1]) {
  console.error("skills/ holds " + dirs.length + " skills, expected " + process.argv[1]); process.exit(1); }
for (const d of dirs) {
  const p = path.join("skills", d, "SKILL.md");
  if (!fs.existsSync(p)) { console.error(d + ": no SKILL.md"); process.exit(1); }
  const m = fs.readFileSync(p, "utf8").match(/^---\n([\s\S]*?)\n---/);
  if (!m) { console.error(d + ": no frontmatter"); process.exit(1); }
  if (!/^name:/m.test(m[1]))        { console.error(d + ": no name"); process.exit(1); }
  if (!/^description:/m.test(m[1])) { console.error(d + ": no description"); process.exit(1); }
}
' "$EXPECTED" || exit 1

case "$HARNESS" in
  opencode)
    node --input-type=module -e '
      const path = await import("node:path");
      const { fx } = await import(process.cwd() + "/plugins/fx.js");
      const config = {};
      await (await fx({ directory: process.cwd() })).config(config);
      const want = path.join(process.cwd(), "skills");
      const got = ((config.skills || {}).paths || []).map(p => path.resolve(p));
      if (!got.includes(want)) {
        console.error("opencode config hook does not register " + want + " (skills.paths: " + JSON.stringify(got) + ")");
        process.exit(1);
      }
    ' ;;
  codex)
    node -e '
      const path = require("path");
      const m = require(path.resolve(".codex-plugin/plugin.json"));
      const got = m.skills ? path.resolve(m.skills) : "(none)";
      if (got !== path.resolve("skills")) {
        console.error("codex manifest skills path " + got + " is not " + path.resolve("skills"));
        process.exit(1);
      }
    ' ;;
  claude-code)
    command -v claude >/dev/null || { echo "claude CLI not on PATH: no free delivery check" >&2; exit 77; }
    details="$(timeout 60 claude --plugin-dir "$FX" plugin details fx 2>&1)" || {
      printf 'claude plugin details failed:\n%s\n' "$details" >&2; exit 1; }
    listed="$(printf '%s\n' "$details" | sed -n 's/^ *Skills ([0-9]*) *//p' | tr -d ' ' | tr ',' '\n')"
    [ -n "$listed" ] || { echo "claude plugin details lists no skills" >&2; exit 1; }
    for d in skills/*/; do
      n="$(basename "$d")"
      printf '%s\n' "$listed" | grep -qx "$n" || { echo "claude-code does not discover $n" >&2; exit 1; }
    done ;;
esac
