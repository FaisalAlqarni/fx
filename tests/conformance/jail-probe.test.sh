#!/usr/bin/env bash
# The live-row jail (tests/conformance/lib/jail.sh) hides host sockets and the
# parent environment. Proved with bwrap directly, never a model session: from
# inside the jail, the session bus and docker.sock are absent, a sentinel env
# var set outside is not visible, and the allowlisted variables still are.
# Final review I7; security re-review C1, I1 and Minor 4 (the /mnt paths).
set -uo pipefail
cd "$(dirname "$0")/../.."
command -v bwrap >/dev/null || { echo "jail-probe: bwrap not installed, not run" >&2; exit 0; }
T="$(mktemp -d)" || exit 2
trap 'rm -rf -- "$T"' EXIT
mkdir -p "$T/real-home/.claude" "$T/scratch/home"
# A stand-in for the real home's credentials. It lives on the root filesystem
# (under /tmp), so any second mount of that filesystem would expose it.
SENTINEL="$T/real-home/.claude/.credentials.json"
echo fx-jail-sentinel >"$SENTINEL"
SENTINEL_DEV="$(stat -c '%Hd:%Ld' "$SENTINEL")"
FX="$PWD" FX_REAL_HOME="$T/real-home" LIVE_SCRATCH="$T/scratch" HOME="$T/scratch/home"
# Proxy URLs carrying a username and password: only the host may cross.
export HTTPS_PROXY='http://fxuser:fx%40secret@proxy.example:3128' http_proxy='fxuser:p@ss@proxy.example:3128/'
export HTTP_PROXY='http://proxy.example:3128'
gap() { echo "$*" >&2; exit 77; }; fail() { echo "$*" >&2; exit 1; }
. tests/conformance/lib/jail.sh

fails=0
probe() {  # probe <label> <shell test run inside the jail>
  if FX_JAIL_SENTINEL=leaked "${JAIL[@]}" bash -c "$2" >"$T/out" 2>&1; then echo "ok   $1"
  else echo "FAIL $1: $(cat "$T/out")"; fails=1; fi
}
probe "no session bus under /run/user" 'for b in /run/user/*/bus; do [ ! -e "$b" ] || { echo "$b"; exit 1; }; done'
probe "no docker.sock" '[ ! -e /var/run/docker.sock ] && [ ! -e /run/docker.sock ]'
probe "no socket reachable under /mnt" 's="$(find /mnt \( -fstype 9p -prune \) -o -type s -print 2>/dev/null)"; [ -z "$s" ] || { echo "$s"; exit 1; }'
probe "no second mount of the distro root at /mnt/wslg/distro" '[ ! -e /mnt/wslg/distro/home ]'
probe "no Windows drive at /mnt/c" '[ ! -e /mnt/c ]'
# The real home's credentials are unreadable by ANY path: every mount of the
# sentinel's filesystem whose root contains it is a way in, so try each one.
probe "the real home's credentials are unreadable by any mount path" "
  [ ! -r '$SENTINEL' ] || { echo '$SENTINEL'; exit 1; }
  awk -v dev='$SENTINEL_DEV' -v p='$SENTINEL' '\$3 == dev {
      r = \$4; if (r == \"/\") r = \"\"
      if (index(p, r \"/\") == 1) print \$5 substr(p, length(r) + 1) }' /proc/self/mountinfo |
  while read -r c; do [ ! -r \"\$c\" ] || { echo \"\$c\"; exit 1; }; done"
probe "a sentinel set outside is not visible" '[ -z "${FX_JAIL_SENTINEL+x}" ]'
probe "no inherited DBUS_SESSION_BUS_ADDRESS" '[ -z "${DBUS_SESSION_BUS_ADDRESS+x}" ]'
probe "HOME and PATH are passed" "[ \"\$HOME\" = '$HOME' ] && [ \"\$PATH\" = '$PATH' ]"
probe "proxy credentials are stripped, the proxy host is kept" '
  [ "$HTTPS_PROXY" = http://proxy.example:3128 ] && [ "$http_proxy" = proxy.example:3128/ ] &&
  [ "$HTTP_PROXY" = http://proxy.example:3128 ] || { env | grep -i _proxy; exit 1; }'
probe "a per-call variable reaches the command" "env TMPDIR=/tmp/x bash -c '[ \"\$TMPDIR\" = /tmp/x ]'"
probe "a private IPC namespace" "[ \"\$(readlink /proc/self/ns/ipc)\" != '$(readlink /proc/self/ns/ipc)' ]"
probe "the network stays open" "[ \"\$(readlink /proc/self/ns/net)\" = '$(readlink /proc/self/ns/net)' ]"
[ "$fails" -eq 0 ] || exit 1
echo "jail-probe: all passed"
