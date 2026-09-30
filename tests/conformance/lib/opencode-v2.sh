# Free rows on opencode-v2 run the real 2.x binary against a scratch config and
# its own managed service, never the developer's (probe-findings.md, changes 1
# to 4). Source it after the row's --describe guard; needs FX and HOME set by
# run.sh.
#
#   . "$FX/tests/conformance/lib/opencode-v2.sh"
#   oc2_setup                        # install fx by $FX_OPENCODE_ROUTE, start a service
#   oc2_wait skill.list 'd.length'   # poll a warm service until the predicate on d holds
#   $OC2_LAST                        # the last data JSON that satisfied it
#
# FX_OPENCODE_ROUTE: `installer` (default) runs fx-opencode-install --major 2;
# `plugin` links only the plugin into plugins/ and adds fx's skills path.
# No model call is made.

oc2_fail() { echo "$HARNESS: $*" >&2; exit 1; }

oc2_stop() { [ -n "${OC2_ROOT:-}" ] && (cd "$OC2_ROOT" && timeout 30 opencode service stop </dev/null >/dev/null 2>&1); }

oc2_setup() {
  command -v opencode >/dev/null || { echo "opencode CLI not on PATH: no real delivery check" >&2; exit 77; }
  local have; have="$(opencode --version 2>&1 | grep -oE '[0-9]+' | head -n1)"
  [ "$have" = 2 ] || oc2_fail "harness opencode-v2 needs opencode 2.x, but \`opencode --version\` reports ${have:-no version}"
  OC2_ROOT="$(mktemp -d "$HOME/ocv2.XXXXXX")" || oc2_fail "mktemp failed"
  OC2_ROUTE="${FX_OPENCODE_ROUTE:-installer}"
  export XDG_CONFIG_HOME="$OC2_ROOT/config" XDG_DATA_HOME="$OC2_ROOT/data" XDG_CACHE_HOME="$OC2_ROOT/cache" \
         XDG_STATE_HOME="$OC2_ROOT/state" TMPDIR="$OC2_ROOT/tmp"
  OC2_DEST="$XDG_CONFIG_HOME/opencode"
  mkdir -p "$OC2_DEST" "$TMPDIR" "$XDG_DATA_HOME" "$XDG_CACHE_HOME" "$XDG_STATE_HOME" || oc2_fail "cannot make the scratch dirs"
  case "$OC2_ROUTE" in
    installer)
      python3 "$FX/scripts/fx-opencode-install" --major 2 --dest "$OC2_DEST" >"$OC2_ROOT/install.out" 2>&1 \
        || { cat "$OC2_ROOT/install.out" >&2; oc2_fail "fx-opencode-install --major 2 failed"; } ;;
    plugin)
      # The plugin and fx's skills path, nothing else: no installer, no
      # permissions key, no command or agent files, no policies. On 2.0.18 a
      # `plugins` config entry must be a package directory (a bare .js file is
      # refused: "configured plugin path must be a directory"), so the plugin
      # is loaded the way OpenCode discovers every local plugin: a file in the
      # config directory's plugins/.
      mkdir -p "$OC2_DEST/plugins" && ln -s "$FX/plugins/fx-opencode-v2.js" "$OC2_DEST/plugins/fx.js" \
        && node -e '
          require("fs").writeFileSync(process.argv[1], JSON.stringify({ skills: [process.env.FX + "/skills"] }, null, 2));
        ' "$OC2_DEST/opencode.json" || oc2_fail "could not set up the plugin route" ;;
    *) oc2_fail "unknown FX_OPENCODE_ROUTE: $OC2_ROUTE" ;;
  esac
  # The default service port is often taken by a developer's own OpenCode; a
  # taken port makes every call wait two minutes.
  local port; port="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])')"
  trap oc2_stop EXIT
  (cd "$OC2_ROOT" && opencode service set port "$port" </dev/null >/dev/null 2>&1) || oc2_fail "opencode service set port failed"
}

# oc2_api <args>: one API call against the warm service, stdin closed.
oc2_api() { (cd "$OC2_ROOT" && timeout 60 opencode api "$@" </dev/null 2>/dev/null); }

# oc2_wait <method> <js predicate on d, the data array>: the first calls after
# a start race plugin and config loading and return a short list, so poll until
# the predicate holds. Fails after 40 tries. The satisfying data is left in
# $OC2_LAST (a file).
oc2_wait() {
  OC2_LAST="$OC2_ROOT/last.json"
  local i
  for i in $(seq 40); do
    if oc2_api "$1" >"$OC2_ROOT/raw.json" && PRED="$2" F="$OC2_ROOT/raw.json" OUT="$OC2_LAST" node -e '
      const fs = require("fs");
      const d = JSON.parse(fs.readFileSync(process.env.F, "utf8")).data;
      if (!eval(process.env.PRED)) process.exit(1);
      fs.writeFileSync(process.env.OUT, JSON.stringify(d));' 2>/dev/null; then return 0; fi
    sleep 1
  done
  oc2_fail "opencode api $1 never satisfied [$2] in 40 tries (last reply: $(head -c 300 "$OC2_ROOT/raw.json" 2>/dev/null))"
}

# oc2_agents: `opencode debug agents` into $OC2_ROOT/agents.json, polled until
# the fx agent and the built-in build agent are both listed.
oc2_agents() {
  local i
  for i in $(seq 40); do
    (cd "$OC2_ROOT" && timeout 60 opencode debug agents </dev/null >"$OC2_ROOT/agents.json" 2>/dev/null) \
      && node -e 'const a=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).map(x=>x.id);process.exit(a.includes("build")&&a.includes("fx-devils-advocate")?0:1)' "$OC2_ROOT/agents.json" 2>/dev/null \
      && return 0
    sleep 1
  done
  oc2_fail "opencode debug agents never listed build and fx-devils-advocate"
}
