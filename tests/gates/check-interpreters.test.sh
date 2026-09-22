#!/usr/bin/env bash
# check-interpreters must scan something, must not swallow a scan error, and
# must catch the inline "Run `x`" form as well as fenced blocks and "Run:".
# Final review I4: called with no arguments it scanned zero files and passed.
set -uo pipefail
cd "$(dirname "$0")/../.."
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
fails=0
expect() {  # expect <exit> <label> <args...>
  local want="$1" label="$2"; shift 2
  out="$(scripts/check-interpreters "$@" 2>&1)"; got=$?
  if [ "$got" -ne "$want" ]; then echo "FAIL: $label (exit $got, wanted $want): $out"; fails=1; fi
}

out="$(scripts/check-interpreters 2>&1)"
n="$(printf '%s\n' "$out" | sed -n 's/.*OK (\([0-9]*\) files).*/\1/p')"
if [ -z "$n" ] || [ "$n" -lt 50 ]; then echo "FAIL: the default run scanned ${n:-no} files: $out"; fails=1; fi

mkdir "$T/empty" "$T/inline" "$T/wrapped" "$T/good"
expect 1 "an empty target scans nothing and fails" "$T/empty"
expect 1 "a missing target is an error, not a pass" "$T/missing"
printf 'Then run it. Run `scripts/x.sh a b` to finish.\n' > "$T/inline/a.md"
expect 1 "inline Run \`scripts/x\` is an invocation" "$T/inline"
printf 'Package the range. Run\n`../fx-implement/scripts/review-package <slug> HEAD`: it writes.\n' > "$T/wrapped/a.md"
expect 1 "Run at a line end, the command on the next line" "$T/wrapped"
printf 'Run `bash scripts/x.sh a`. The file `scripts/x.sh` is a mention.\n```\nbash scripts/y.sh\n```\n' > "$T/good/a.md"
expect 0 "an interpreter-led invocation and a mention pass" "$T/good"

[ "$fails" -eq 0 ] || exit 1
echo "check-interpreters.test.sh: all passed"
