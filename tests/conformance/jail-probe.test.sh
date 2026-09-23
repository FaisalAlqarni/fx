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
# A sibling of the tree under test, holding a stand-in for another project's
# .env: the jail must expose the tree under test and nothing beside it.
SIB="$(mktemp -d "$(dirname "$PWD")/fx-jail-sibling.XXXXXX")" || exit 2
trap 'rm -rf -- "$T" "$SIB"' EXIT
echo FX_SIBLING_SECRET=1 >"$SIB/.env"
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
probe "a sibling project's .env is unreadable" "[ ! -r '$SIB/.env' ]"
probe "the tree under test stays readable" "[ -r '$PWD/tests/conformance/lib/jail.sh' ]"
probe "the DNS resolver config is readable" '[ -s /etc/resolv.conf ]'
for c in node claude codex opencode; do
  command -v "$c" >/dev/null || continue
  # Actually run it: the jail binds the narrowest thing that works (the binary
  # alone when it is self-contained, its package directory when it is a
  # script), so "the file is there" is no longer proof that the CLI still runs.
  probe "$c still resolves and runs" "command -v $c >/dev/null && $c --version >/dev/null"
done
# Top-level dot-directories and regular files are hidden too. `for e in /*`
# matched neither, so /init (the WSL init binary) stayed readable inside the
# jail (security re-check Minor 3). The allowlist is restated here rather than
# read from jail.sh: a gate that imports the value it checks proves nothing.
probe "no top-level dot-entry or regular file outside the allowlist is readable" '
  keep=" usr bin sbin lib lib32 lib64 libx32 etc opt var dev proc sys run tmp "
  for e in /* /.[!.]* /..?*; do
    [ -e "$e" ] || continue
    [ ! -L "$e" ] || continue
    case "$keep" in *" ${e#/} "*) continue ;; esac
    case "$e" in /.*) ;; *) [ -d "$e" ] && continue ;; esac
    if [ -d "$e" ]; then
      [ -z "$(ls -A "$e" 2>/dev/null)" ] || { echo "$e is not empty"; exit 1; }
    else
      [ ! -s "$e" ] || { echo "$e is readable"; exit 1; }
    fi
  done'
# jail_hide <path under $FX>...: the session cannot read a hidden directory
# (the answer keys) or a hidden file (a worktree's .git pointer), and the rest
# of the tree stays readable. Final review adversarial 2.
SAVED_JAIL=("${JAIL[@]}")
GITPATH=.git
jail_hide tests/review-bench/cases "$GITPATH" no/such/path
probe "jail_hide: a hidden directory is empty" "[ -z \"\$(ls -A '$PWD/tests/review-bench/cases')\" ]"
probe "jail_hide: a hidden .git reads as nothing" "
  if [ -d '$PWD/.git' ]; then [ -z \"\$(ls -A '$PWD/.git')\" ]; else [ ! -s '$PWD/.git' ]; fi
  [ ! -e '$PWD/.git/HEAD' ]"
probe "jail_hide: the rest of the tree stays readable" "[ -r '$PWD/tests/review-bench/score.js' ]"
JAIL=("${SAVED_JAIL[@]}")
probe "a sentinel set outside is not visible" '[ -z "${FX_JAIL_SENTINEL+x}" ]'
probe "no inherited DBUS_SESSION_BUS_ADDRESS" '[ -z "${DBUS_SESSION_BUS_ADDRESS+x}" ]'
probe "HOME and PATH are passed" "[ \"\$HOME\" = '$HOME' ] && [ \"\$PATH\" = '$PATH' ]"
probe "proxy credentials are stripped, the proxy host is kept" '
  [ "$HTTPS_PROXY" = http://proxy.example:3128 ] && [ "$http_proxy" = proxy.example:3128/ ] &&
  [ "$HTTP_PROXY" = http://proxy.example:3128 ] || { env | grep -i _proxy; exit 1; }'
probe "a per-call variable reaches the command" "env TMPDIR=/tmp/x bash -c '[ \"\$TMPDIR\" = /tmp/x ]'"
probe "a private IPC namespace" "[ \"\$(readlink /proc/self/ns/ipc)\" != '$(readlink /proc/self/ns/ipc)' ]"
probe "the network stays open" "[ \"\$(readlink /proc/self/ns/net)\" = '$(readlink /proc/self/ns/net)' ]"
# The mount rule, fed fake findmnt output. A mount is hidden when its source is
# something the jail hides: the home's filesystem overlapping the home (its root
# contains the home, or sits inside it), or the root filesystem rooted at a
# top-level path the jail hides, which is how a bind of /development/<project>
# onto a kept path such as /var stayed readable (security re-check Minor 3).
# A mount whose source is a kept top-level path, or another filesystem, is not.
mkdir -p "$T/fakebin"
D="$(stat -c '%Hd:%Ld' "$T/real-home")"
R="$(stat -c '%Hd:%Ld' /)"
cat >"$T/fakebin/findmnt" <<FM
#!/bin/sh
printf '%s\\n' '/ $D /' '/srv/root $D /' '/srv/claude $D $T/real-home/.claude' '/srv/ssh $D $T/real-home/.ssh' \\
  '/srv/home $D $T/real-home' '/var/hidden-top $R /home' '/var/project $R /development/some-project' \\
  '/srv/other $D /var/lib/other' '/opt/pkg $R /opt/other' '/srv/otherdev 9:9 /'
FM
chmod +x "$T/fakebin/findmnt"
hidden="$(PATH="$T/fakebin:$PATH"; . tests/conformance/lib/jail.sh; printf '%s\n' "${JAIL[@]}")"
for t in /srv/root /srv/claude /srv/ssh /srv/home; do
  grep -qxF "$t" <<<"$hidden" && echo "ok   a mount overlapping the home is hidden: $t" \
    || { echo "FAIL a mount overlapping the home is not hidden: $t"; fails=1; }
done
for t in /var/hidden-top /var/project; do
  grep -qxF "$t" <<<"$hidden" && echo "ok   a bind of a hidden top-level directory onto a kept path is hidden: $t" \
    || { echo "FAIL a bind of a hidden top-level directory onto a kept path is not hidden: $t"; fails=1; }
done
for t in /srv/other /opt/pkg /srv/otherdev; do
  grep -qxF "$t" <<<"$hidden" && { echo "FAIL a mount of a kept source is hidden: $t"; fails=1; } \
    || echo "ok   a mount of a kept source is left alone: $t"
done

# The CLI binds, fed a fake home layout: the jail binds the narrowest thing that
# runs the CLI, never a credential-holding slice of the real home. A standalone
# binary anywhere under the home used to bind its whole parent (for codex, its
# grandparent), so `~/.local/bin/codex` bound all of `~/.local`, which holds
# `~/.local/share/opencode/auth.json` (security re-check Minor 2).
jail_for() {  # jail_for <dir of fake CLIs>: the JAIL array built with them on PATH
  ( PATH="$1:$T/fakebin:$PATH"; . tests/conformance/lib/jail.sh; printf '%s\n' "${JAIL[@]}" ) 2>&1
}
binds() { grep -A1 -xF -- --ro-bind <<<"$1" | grep -vxF -- --ro-bind | grep -vxF -- --; }

# A standalone binary: the binary alone is enough, so nothing above it is bound.
mkdir -p "$T/real-home/.local/bin" "$T/real-home/.local/share/opencode"
cp /bin/true "$T/real-home/.local/bin/codex"
echo PLANTED > "$T/real-home/.local/share/opencode/auth.json"
out="$(jail_for "$T/real-home/.local/bin")"
if binds "$out" | grep -qxF "$T/real-home/.local"; then
  echo "FAIL a standalone CLI binary binds a whole slice of the real home"; fails=1
else echo "ok   a standalone CLI binary does not bind a slice of the real home"; fi
binds "$out" | grep -qxF "$T/real-home/.local/bin/codex" \
  && echo "ok   a standalone CLI binary is bound on its own" \
  || { echo "FAIL a standalone CLI binary is not bound at all"; printf '%s\n' "$out"; fails=1; }

# A script: it needs its package, so the package directory is bound, and
# nothing wider. The package is found by its package.json, not by counting
# directories up from the binary.
mkdir -p "$T/real-home/pkgs/mycli/bin" "$T/real-home/pkgs/other-secrets" "$T/fakescript"
echo '{"name":"mycli"}' > "$T/real-home/pkgs/mycli/package.json"
printf '#!/bin/sh\nexit 0\n' > "$T/real-home/pkgs/mycli/bin/cli.js"
chmod +x "$T/real-home/pkgs/mycli/bin/cli.js"
ln -sf "$T/real-home/pkgs/mycli/bin/cli.js" "$T/fakescript/opencode"
out="$(jail_for "$T/fakescript")"
binds "$out" | grep -qxF "$T/real-home/pkgs/mycli" \
  && echo "ok   a script CLI binds its own package directory" \
  || { echo "FAIL a script CLI does not bind its package directory"; printf '%s\n' "$out"; fails=1; }
if binds "$out" | grep -qxF "$T/real-home/pkgs"; then
  echo "FAIL a script CLI binds the directory above its package"; fails=1
else echo "ok   a script CLI binds nothing above its package"; fi

# Fail closed: a package directory that is the real home, or a top-level
# directory of it, is refused with a message rather than bound.
mkdir -p "$T/failhome"
echo '{"name":"home"}' > "$T/real-home/package.json"
printf '#!/bin/sh\nexit 0\n' > "$T/real-home/claude.js"; chmod +x "$T/real-home/claude.js"
ln -sf "$T/real-home/claude.js" "$T/failhome/claude"
out="$(jail_for "$T/failhome")"
grep -qi 'refus' <<<"$out" \
  && echo "ok   a package directory that is the real home is refused" \
  || { echo "FAIL a package directory that is the real home is not refused"; printf '%s\n' "$out"; fails=1; }
rm -f -- "$T/real-home/package.json"
echo '{"name":"broad"}' > "$T/real-home/.local/package.json"
mkdir -p "$T/real-home/.local/libexec"
printf '#!/bin/sh\nexit 0\n' > "$T/real-home/.local/libexec/cli.js"
chmod +x "$T/real-home/.local/libexec/cli.js"
ln -sf "$T/real-home/.local/libexec/cli.js" "$T/failhome/claude"
out="$(jail_for "$T/failhome")"
grep -qi 'refus' <<<"$out" \
  && echo "ok   a package directory that is a top-level directory of the real home is refused" \
  || { echo "FAIL a broad home subtree is not refused"; printf '%s\n' "$out"; fails=1; }
rm -f -- "$T/real-home/.local/package.json"

# A script with no package of its own: the directory it sits in is the
# narrowest thing that can work, and it is bound, not refused.
mkdir -p "$T/real-home/tools/bin" "$T/nopkg"
printf '#!/bin/sh\nexit 0\n' > "$T/real-home/tools/bin/cli.sh"; chmod +x "$T/real-home/tools/bin/cli.sh"
ln -sf "$T/real-home/tools/bin/cli.sh" "$T/nopkg/claude"
out="$(jail_for "$T/nopkg")"
binds "$out" | grep -qxF "$T/real-home/tools/bin" \
  && echo "ok   a script with no package binds the directory it sits in" \
  || { echo "FAIL a script with no package does not bind its own directory"; printf '%s\n' "$out"; fails=1; }
if binds "$out" | grep -qxF "$T/real-home/tools"; then
  echo "FAIL a script with no package binds more than its own directory"; fails=1
else echo "ok   a script with no package binds nothing above its own directory"; fi

[ "$fails" -eq 0 ] || exit 1
echo "jail-probe: all passed"
