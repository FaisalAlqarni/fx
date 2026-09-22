# The bwrap jail every live-row CLI call runs in. Sourced by live.sh; the
# boundary it draws is described there. Needs FX, FX_REAL_HOME, LIVE_SCRATCH,
# and gap/fail defined by the caller. Proved by tests/conformance/jail-probe.test.sh.

command -v bwrap >/dev/null || gap "not run: bwrap is not installed, and live rows never run a CLI unconfined"
case "$FX_REAL_HOME" in /|"") fail "FX_REAL_HOME is not a home: '$FX_REAL_HOME'" ;; esac
[ -d "$FX_REAL_HOME" ] || fail "FX_REAL_HOME is not a directory: $FX_REAL_HOME"
# The host tree is read-only, and every top-level directory that is not system
# software is hidden under an empty tmpfs: /home, /root, /srv, and any user
# data root such as /development, where other projects keep their .env files.
# Only the tree under test, the scratch dir and the CLIs are bound back below.
# /mnt goes too: on WSL it holds the Docker Desktop socket, the WSLg display,
# audio and runtime sockets, the Windows drives, and a second mount of the
# distro root (/mnt/wslg/distro) that reaches the real home by another path.
KEEP_TOP=" usr bin sbin lib lib32 lib64 libx32 etc opt var "
JAIL=(bwrap --ro-bind / /)
for e in /*; do
  { [ -d "$e" ] && [ ! -L "$e" ]; } || continue
  case "$KEEP_TOP dev proc sys run tmp " in *" ${e#/} "*) continue ;; esac
  JAIL+=(--tmpfs "$e")
done
JAIL+=(--tmpfs /mnt --tmpfs /tmp --tmpfs "$FX_REAL_HOME")
# hidden <path>: true when the jail hides that path.
hidden() {
  case "$1" in "$FX_REAL_HOME"/*|/mnt/*|/tmp/*|/run/*) return 0 ;; esac
  local top="${1#/}"; top="${top%%/*}"
  case "$KEEP_TOP" in *" $top "*) return 1 ;; *) return 0 ;; esac
}
# Any other mount of the filesystem that holds the real home, whose root
# contains the home, is the same leak at another path: hide each one too.
home_dev="$(stat -c '%Hd:%Ld' "$FX_REAL_HOME")"
while read -r t dev r; do
  case "$t" in /|/mnt|/mnt/*) continue ;; esac
  [ "$dev" = "$home_dev" ] || continue
  case "$FX_REAL_HOME/" in "${r%/}/"*) JAIL+=(--tmpfs "$t") ;; esac
done < <(findmnt -rn -o TARGET,MAJ:MIN,FSROOT)
# The resolver config can point into a hidden path (WSL: /mnt/wsl/resolv.conf).
r="$(readlink -f /etc/resolv.conf)"
[ -f "$r" ] && hidden "$r" && JAIL+=(--ro-bind "$r" "$r")
for c in node claude codex opencode; do
  p="$(command -v "$c")" || continue
  r="$(readlink -f "$p")"
  case "$c" in
    node)  d="$r" ;;                                 # the node binary alone
    codex) d="$(dirname "$(dirname "$r")")" ;;       # the @openai/codex package: bin/codex.js
    *)     d="$(dirname "$r")" ;;                    # the directory the binary lives in
  esac
  hidden "$d" && JAIL+=(--ro-bind "$d" "$d")
  # A PATH entry that is a symlink comes back as the same symlink, so the
  # command resolves by name and its target keeps its own path.
  if [ "$p" != "$r" ] && hidden "$p"; then JAIL+=(--symlink "$r" "$p"); fi
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
  [ -n "${!v+x}" ] || continue
  val="${!v}"
  # A proxy URL's user:password never crosses: only scheme, host and port.
  if [[ "$v" == [Hh][Tt][Tt][Pp]* && "$val" =~ ^([A-Za-z][A-Za-z0-9+.-]*://)?[^/]*@(.*)$ ]]; then
    val="${BASH_REMATCH[1]}${BASH_REMATCH[2]}"
  fi
  JAIL+=(--setenv "$v" "$val")
done
JAIL+=(--)

