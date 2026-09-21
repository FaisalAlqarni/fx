#!/usr/bin/env bash
# 09: every skill fx ships is discoverable on this runtime.
#
# Two halves. The tree: skills/ holds exactly the pinned number of skill
# directories, each with a SKILL.md carrying name and description. The
# delivery: this runtime's own entry point hands every one of them over.
#   opencode:    the plugin's config hook registers skills/ in skills.paths,
#                and the real `opencode debug skill` lists every skill after
#                fx-opencode-install, with fx-devils-advocate denied edit and
#                bash in `opencode debug agent`.
#   codex:       the manifest's `skills` path resolves to skills/, and the real
#                `codex plugin marketplace add` + `plugin add` installs fx with
#                its hooks file and every skill.
#   claude-code: `claude plugin details` (no model call) lists every skill.
# A missing CLI is a GAP, never a pass. No branch makes a model call. Every CLI
# runs from the scratch home with a scratch TMPDIR, so it writes nowhere else.
# opencode needs no network here: offline, `debug skill` and `debug agent`
# still exit 0 with full output (its models.dev fetch and its background npm
# install fail and are logged, measured 2026-09-21 on 1.18.25), about 70s
# slower each, hence the generous timeouts.
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
    ' || exit 1
    command -v opencode >/dev/null || { echo "opencode CLI not on PATH: no real delivery check" >&2; exit 77; }
    mkdir -p "$HOME/tmp"
    out="$(python3 scripts/fx-opencode-install --dest "$XDG_CONFIG_HOME/opencode" 2>&1)" || {
      printf 'fx-opencode-install failed:\n%s\n' "$out" >&2; exit 1; }
    # stdout is the JSON, kept in files: it runs to hundreds of KB. stderr is
    # shown only on failure.
    ( cd "$HOME" && TMPDIR="$HOME/tmp" timeout 300 opencode debug skill >"$HOME/oc-skill.json" 2>"$HOME/oc.err" ) || {
      echo "opencode debug skill failed:" >&2; cat "$HOME/oc.err" >&2; exit 1; }
    ( cd "$HOME" && TMPDIR="$HOME/tmp" timeout 300 opencode debug agent fx-devils-advocate >"$HOME/oc-agent.json" 2>"$HOME/oc.err" ) || {
      echo "opencode debug agent fx-devils-advocate failed:" >&2; cat "$HOME/oc.err" >&2; exit 1; }
    node -e '
      const fs = require("fs");
      const want = fs.readdirSync("skills", { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
      let listed, agent;
      const read = (f) => fs.readFileSync(process.env.HOME + "/" + f, "utf8");
      try { listed = JSON.parse(read("oc-skill.json")).map(s => s.name); }
      catch { console.error("opencode debug skill printed no skill list: " + read("oc-skill.json").slice(0, 500)); process.exit(1); }
      for (const n of want) if (!listed.includes(n)) {
        console.error("opencode does not discover " + n); process.exit(1); }
      try { agent = JSON.parse(read("oc-agent.json")); }
      catch { console.error("opencode debug agent printed no agent: " + read("oc-agent.json").slice(0, 500)); process.exit(1); }
      // opencode applies the last rule that matches, so the last "*"-pattern
      // rule naming the tool (or "*") decides it.
      for (const tool of ["edit", "bash"]) {
        const r = (agent.permission || []).filter(r => (r.permission === tool || r.permission === "*") && r.pattern === "*").pop();
        if (!r || r.action !== "deny") {
          console.error("opencode: fx-devils-advocate " + tool + " is " + (r ? r.action : "unset") + ", not deny"); process.exit(1); }
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
    ' || exit 1
    command -v codex >/dev/null || { echo "codex CLI not on PATH: no real delivery check" >&2; exit 77; }
    mkdir -p "$CODEX_HOME" "$HOME/tmp"
    # The same install pair lib/live.sh runs, without the jail: no session
    # starts, so nothing here can reach past the scratch home.
    out="$(cd "$HOME" && TMPDIR="$HOME/tmp" timeout 120 codex plugin marketplace add "$FX" 2>&1 \
      && TMPDIR="$HOME/tmp" timeout 120 codex plugin add fx@fx 2>&1)" || {
      printf 'fx did not install into the scratch CODEX_HOME:\n%s\n' "$out" >&2; exit 1; }
    list="$(cd "$HOME" && TMPDIR="$HOME/tmp" timeout 120 codex plugin list -m fx 2>&1)" || {
      printf 'codex plugin list failed:\n%s\n' "$list" >&2; exit 1; }
    printf '%s\n' "$list" | grep -qE '^fx@fx +installed, enabled ' || {
      printf 'codex does not list fx@fx as installed and enabled:\n%s\n' "$list" >&2; exit 1; }
    node -e '
      const fs = require("fs"), path = require("path");
      const cache = path.join(process.env.CODEX_HOME, "plugins", "cache", "fx", "fx");
      const vers = fs.existsSync(cache) ? fs.readdirSync(cache) : [];
      if (vers.length !== 1) { console.error("expected one installed fx under " + cache + ", found " + JSON.stringify(vers)); process.exit(1); }
      const root = path.join(cache, vers[0]);
      const m = JSON.parse(fs.readFileSync(path.join(root, ".codex-plugin", "plugin.json"), "utf8"));
      if (!m.hooks) { console.error("installed codex manifest names no hooks file"); process.exit(1); }
      if (!fs.existsSync(path.join(root, m.hooks))) { console.error("installed copy has no hooks file " + m.hooks); process.exit(1); }
      const sk = path.join(root, m.skills || "(none)");
      for (const n of fs.readdirSync("skills", { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name))
        if (!fs.existsSync(path.join(sk, n, "SKILL.md"))) { console.error("installed codex copy lacks skill " + n); process.exit(1); }
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
