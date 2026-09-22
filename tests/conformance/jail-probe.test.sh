#!/usr/bin/env bash
# The live-row jail (tests/conformance/lib/jail.sh) hides host sockets and the
# parent environment. Proved with bwrap directly, never a model session: from
# inside the jail, the session bus and docker.sock are absent, a sentinel env
# var set outside is not visible, and the allowlisted variables still are.
# Final review I7.
set -uo pipefail
cd "$(dirname "$0")/../.."
command -v bwrap >/dev/null || { echo "jail-probe: bwrap not installed, not run" >&2; exit 0; }
T="$(mktemp -d)" || exit 2
trap 'rm -rf -- "$T"' EXIT
mkdir -p "$T/real-home" "$T/scratch/home"
FX="$PWD" FX_REAL_HOME="$T/real-home" LIVE_SCRATCH="$T/scratch" HOME="$T/scratch/home"
gap() { echo "$*" >&2; exit 77; }; fail() { echo "$*" >&2; exit 1; }
. tests/conformance/lib/jail.sh

fails=0
probe() {  # probe <label> <shell test run inside the jail>
  if FX_JAIL_SENTINEL=leaked "${JAIL[@]}" bash -c "$2" >"$T/out" 2>&1; then echo "ok   $1"
  else echo "FAIL $1: $(cat "$T/out")"; fails=1; fi
}
probe "no session bus under /run/user" 'for b in /run/user/*/bus; do [ ! -e "$b" ] || { echo "$b"; exit 1; }; done'
probe "no docker.sock" '[ ! -e /var/run/docker.sock ] && [ ! -e /run/docker.sock ]'
probe "a sentinel set outside is not visible" '[ -z "${FX_JAIL_SENTINEL+x}" ]'
probe "no inherited DBUS_SESSION_BUS_ADDRESS" '[ -z "${DBUS_SESSION_BUS_ADDRESS+x}" ]'
probe "HOME and PATH are passed" "[ \"\$HOME\" = '$HOME' ] && [ \"\$PATH\" = '$PATH' ]"
probe "a per-call variable reaches the command" "env TMPDIR=/tmp/x bash -c '[ \"\$TMPDIR\" = /tmp/x ]'"
probe "a private IPC namespace" "[ \"\$(readlink /proc/self/ns/ipc)\" != '$(readlink /proc/self/ns/ipc)' ]"
probe "the network stays open" "[ \"\$(readlink /proc/self/ns/net)\" = '$(readlink /proc/self/ns/net)' ]"
[ "$fails" -eq 0 ] || exit 1
echo "jail-probe: all passed"
