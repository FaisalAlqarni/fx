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
# A dot-directory and a plain file at the top level go too: `for e in /*` saw
# neither, so /init (the WSL init binary) stayed readable (re-check Minor 3).
KEEP_TOP=" usr bin sbin lib lib32 lib64 libx32 etc opt var "
JAIL=(bwrap --ro-bind / /)
for e in /* /.[!.]* /..?*; do
  { [ -e "$e" ] && [ ! -L "$e" ]; } || continue
  case "$KEEP_TOP dev proc sys run tmp " in *" ${e#/} "*) continue ;; esac
  if [ -d "$e" ]; then JAIL+=(--tmpfs "$e"); else JAIL+=(--ro-bind /dev/null "$e"); fi
done
JAIL+=(--tmpfs /mnt --tmpfs /tmp --tmpfs "$FX_REAL_HOME")
# hidden <path>: true when the jail hides that path.
hidden() {
  case "$1" in "$FX_REAL_HOME"/*|/mnt/*|/tmp/*|/run/*) return 0 ;; esac
  local top="${1#/}"; top="${top%%/*}"
  case "$KEEP_TOP" in *" $top "*) return 1 ;; *) return 0 ;; esac
}
# A mount whose SOURCE is something the jail hides is the same leak at another
# path, so hide each one too. Two sources qualify:
#   - the filesystem that holds the real home, overlapping it (its root
#     contains the home, or lies inside it);
#   - the root filesystem rooted at a top-level path hidden above, which is how
#     a bind of /development/<project> onto a kept path such as /var or /opt
#     stayed readable (re-check Minor 3).
home_dev="$(stat -c '%Hd:%Ld' "$FX_REAL_HOME")"
root_dev="$(stat -c '%Hd:%Ld' /)"
leaks() {  # leaks <maj:min> <fsroot>
  if [ "$1" = "$home_dev" ]; then
    case "$FX_REAL_HOME/" in "${2%/}/"*) return 0 ;; esac
    case "${2%/}/" in "$FX_REAL_HOME/"*) return 0 ;; esac
  fi
  [ "$1" = "$root_dev" ] && hidden "$2"
}
while read -r t dev r; do
  case "$t" in /|/mnt|/mnt/*) continue ;; esac
  leaks "$dev" "$r" || continue
  if [ -d "$t" ]; then JAIL+=(--tmpfs "$t"); else JAIL+=(--ro-bind /dev/null "$t"); fi
done < <(findmnt -rn -o TARGET,MAJ:MIN,FSROOT)
# The resolver config can point into a hidden path (WSL: /mnt/wsl/resolv.conf).
r="$(readlink -f /etc/resolv.conf)"
[ -f "$r" ] && hidden "$r" && JAIL+=(--ro-bind "$r" "$r")
# Bind the narrowest thing that runs the CLI. A self-contained binary needs
# only itself; a script needs its package, which is the nearest ancestor
# holding a package.json, or the directory it sits in when it has none.
# Counting directories up from the binary instead bound whatever happened to
# sit there: a standalone `~/.local/bin/codex` bound all of `~/.local`,
# credentials included (re-check Minor 2).
for c in node claude codex opencode; do
  p="$(command -v "$c")" || continue
  r="$(readlink -f "$p")"
  if hidden "$r"; then
    if [ "$(head -c2 "$r" 2>/dev/null)" = '#!' ]; then
      own="${r%/*}"                                  # the directory the script sits in
      d="$own"
      while [ -n "$d" ] && [ ! -f "$d/package.json" ]; do d="${d%/*}"; done
      [ -n "$d" ] || d="$own"                        # no package: its own directory is the narrowest
      # Never the real home or anything holding it.
      case "$FX_REAL_HOME/" in "${d%/}/"*)
        fail "refusing to bind $d into the jail for $c: it is the real home or holds it" ;;
      esac
      # Widening past the script's own directory must not reach a whole
      # top-level directory of the home: that is where credentials sit
      # (~/.local holds ~/.local/share/opencode/auth.json), not a CLI install.
      if [ "$d" != "$own" ]; then
        case "${d%/*}" in "$FX_REAL_HOME")
          fail "refusing to bind $d into the jail for $c: it is a whole top-level directory of the real home" ;;
        esac
      fi
      JAIL+=(--ro-bind "$d" "$d")
    else
      JAIL+=(--ro-bind "$r" "$r")
    fi
  fi
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


# jail_hide <path under $FX>...: hide each path from calls made with $JAIL
# after this point, on top of everything above. A directory goes under an
# empty tmpfs; a file (a worktree's .git is one) under /dev/null; a missing
# path is skipped. For rows whose session must not read what scores it.
jail_hide() {
  unset 'JAIL[${#JAIL[@]}-1]'
  local p
  for p in "$@"; do
    if [ -d "$FX/$p" ]; then JAIL+=(--tmpfs "$FX/$p")
    elif [ -e "$FX/$p" ]; then JAIL+=(--ro-bind /dev/null "$FX/$p"); fi
  done
  JAIL+=(--)
}
