#!/usr/bin/env bash
# 10: every `../../references/` citation in a skill resolves.
#
# Citations are anchored relative to the citing file so they resolve on any
# runtime. A skill generated from a command at a different depth breaks this,
# which is why task 07 rewrites depth rather than copying bytes.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "10|reference paths resolve|free"; exit 0; }
cd "$FX"
python3 scripts/check-paths >/dev/null 2>&1 || {
  python3 scripts/check-paths >&2; exit 1; }
