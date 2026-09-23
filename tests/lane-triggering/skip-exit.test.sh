#!/usr/bin/env bash
# A run that cannot exercise a lane (no claude CLI, no credential) must never
# read as a pass. run-test.sh and run-reps.sh exit 77 on SKIP, and run-all.sh
# counts those as skipped and exits non-zero (ledger Ruling J: a missing
# credential used to print "17 passed, 0 failed").
#
# run-reps.sh's plugin-tree argument becomes the tree the jail binds back
# after hiding everything, so it refuses anything that would undo the hiding.
#
# No quota: a stand-in claude that is never reached, and a stand-in home with
# no credential.
set -uo pipefail
cd "$(dirname "$0")/../.."
ROOT="$PWD"
fails=0
check() { if eval "$2"; then echo "ok   $1"; else echo "FAIL $1" >&2; fails=$((fails+1)); fi; }

T="$(mktemp -d)" || exit 2
case "$T" in /tmp/?*|"${TMPDIR:-/tmp}"/?*) ;; *) echo "unexpected temp dir: $T" >&2; exit 2 ;; esac
trap 'rm -rf -- "$T"' EXIT
mkdir -p "$T/empty" "$T/fakebin" "$T/home"
printf '#!/bin/sh\necho "{\\"type\\":\\"system\\"}"\n' >"$T/fakebin/claude"
chmod +x "$T/fakebin/claude"
P=tests/lane-triggering/prompts/fx-tdd.txt

# No CLI: everything before the CLI check is a shell builtin, so an empty PATH works.
PATH="$T/empty" "$BASH" tests/lane-triggering/run-test.sh fx-tdd "$P" >/dev/null 2>&1; rc=$?
check "run-test.sh: no claude CLI exits 77 (got $rc)" '[ "$rc" -eq 77 ]'
PATH="$T/empty" "$BASH" tests/lane-triggering/run-reps.sh fx-tdd "$P" 1 >/dev/null 2>&1; rc=$?
check "run-reps.sh: no claude CLI exits 77 (got $rc)" '[ "$rc" -eq 77 ]'

# No credential: a stand-in claude on PATH, a home with no .credentials.json.
HOME="$T/home" PATH="$T/fakebin:$PATH" bash tests/lane-triggering/run-test.sh fx-tdd "$P" >/dev/null 2>&1; rc=$?
check "run-test.sh: no credential exits 77 (got $rc)" '[ "$rc" -eq 77 ]'
HOME="$T/home" PATH="$T/fakebin:$PATH" bash tests/lane-triggering/run-reps.sh fx-tdd "$P" 1 >/dev/null 2>&1; rc=$?
check "run-reps.sh: no credential exits 77 (got $rc)" '[ "$rc" -eq 77 ]'

out="$(HOME="$T/home" PATH="$T/fakebin:$PATH" bash tests/lane-triggering/run-all.sh 2>&1)"; rc=$?
check "run-all.sh: all skipped exits non-zero (got $rc)" '[ "$rc" -ne 0 ]'
check "run-all.sh: reports no pass" '! printf "%s\n" "$out" | grep -q "^PASS"'
check "run-all.sh: tally names the skips" 'printf "%s\n" "$out" | grep -qE "^0 passed, 0 failed, [1-9][0-9]* skipped"'

# run-reps.sh plugin tree: refused before anything runs (exit 2). The stand-in
# home is the real home as far as run-reps.sh knows, so $T is its parent.
mkdir -p "$T/notplugin"
for bad in / /usr "$T/home" "$T" relative/path "$T/notplugin" "$T/missing"; do
  HOME="$T/home" PATH="$T/fakebin:$PATH" bash tests/lane-triggering/run-reps.sh fx-tdd "$P" 1 "$bad" >/dev/null 2>&1; rc=$?
  check "run-reps.sh: refuses plugin tree $bad (got $rc)" '[ "$rc" -eq 2 ]'
done
# A real plugin tree gets past the check (to the credential SKIP here).
HOME="$T/home" PATH="$T/fakebin:$PATH" bash tests/lane-triggering/run-reps.sh fx-tdd "$P" 1 "$ROOT" >/dev/null 2>&1; rc=$?
check "run-reps.sh: accepts this checkout as plugin tree (got $rc)" '[ "$rc" -eq 77 ]'

if [ "$fails" -ne 0 ]; then echo "skip-exit: $fails failed" >&2; exit 1; fi
echo "skip-exit: all passed"
