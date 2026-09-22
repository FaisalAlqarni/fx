# The bwrap jail every live-row CLI call runs in. Sourced by live.sh; the
# boundary it draws is described there. Needs FX, FX_REAL_HOME, LIVE_SCRATCH,
# and gap/fail defined by the caller. Proved by tests/conformance/jail-probe.test.sh.

command -v bwrap >/dev/null || gap "not run: bwrap is not installed, and live rows never run a CLI unconfined"
case "$FX_REAL_HOME" in /|"") fail "FX_REAL_HOME is not a home: '$FX_REAL_HOME'" ;; esac
[ -d "$FX_REAL_HOME" ] || fail "FX_REAL_HOME is not a directory: $FX_REAL_HOME"
JAIL=(bwrap --ro-bind / / --tmpfs /tmp --tmpfs "$FX_REAL_HOME")
under_real_home() { case "$1" in "$FX_REAL_HOME"/*) return 0 ;; *) return 1 ;; esac; }
for c in node claude codex opencode; do
  p="$(command -v "$c")" || continue
  r="$(readlink -f "$p")"
  case "$c" in
    node)  d="$r" ;;                                 # the node binary alone
    codex) d="$(dirname "$(dirname "$r")")" ;;       # the @openai/codex package: bin/codex.js
    *)     d="$(dirname "$r")" ;;                    # the directory the binary lives in
  esac
  under_real_home "$d" && JAIL+=(--ro-bind "$d" "$d")
  # A PATH entry that is a symlink comes back as the same symlink, so the
  # command resolves by name and its target keeps its own path.
  if [ "$p" != "$r" ] && under_real_home "$p"; then JAIL+=(--symlink "$r" "$p"); fi
done
JAIL+=(--ro-bind "$FX" "$FX" --bind "$LIVE_SCRATCH" "$LIVE_SCRATCH" --dev /dev
       --tmpfs /dev/shm --tmpfs /run --unshare-pid --unshare-ipc --proc /proc --die-with-parent)
# The environment is rebuilt, not inherited: a parent session's tokens, its
# bus address and every other variable stay outside. Only what the CLIs need
# to run, and what locates the scratch home, crosses. A variable one call
# needs on top (TMPDIR, XDG_DATA_HOME) goes through `env` inside the jail:
#   "${JAIL[@]}" env TMPDIR="$tmp" claude ...
JAIL+=(--clearenv)
for v in PATH HOME USER LOGNAME SHELL TERM LANG LC_ALL \
         CODEX_HOME XDG_CONFIG_HOME CLAUDE_CONFIG_DIR FX \
         HTTPS_PROXY HTTP_PROXY NO_PROXY https_proxy http_proxy no_proxy \
         NODE_EXTRA_CA_CERTS SSL_CERT_FILE SSL_CERT_DIR; do
  [ -n "${!v+x}" ] && JAIL+=(--setenv "$v" "${!v}")
done
JAIL+=(--)

