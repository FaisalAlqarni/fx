#!/usr/bin/env bash
# The remote-asset rule in scripts/check-artifacts, run against scratch trees.
# Test scaffolding: the scratch directory is removed on every exit.
set -euo pipefail
cd "$(dirname "$0")/../.."
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT
fails=0

# expect <exit> <label> <path inside the scratch tree> <line to write>
expect() {
  local want="$1" label="$2" rel="$3" content="$4" root="$SCRATCH/$2"
  mkdir -p "$root/$(dirname "$rel")"
  printf '%s\n' "$content" > "$root/$rel"
  set +e
  python3 scripts/check-artifacts "$root" > "$SCRATCH/$label.out" 2>&1
  local got=$?
  set -e
  if [ "$got" -ne "$want" ]; then
    echo "FAIL: $label: exit $got, want $want"
    cat "$SCRATCH/$label.out"
    fails=$((fails + 1))
  else
    echo "ok: $label"
  fi
}

expect 1 remote-script-in-skill      skills/x/SKILL.md '<script src="https://cdn.tailwindcss.com"></script>'
expect 1 remote-import-in-reference  references/x.md   'import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";'
expect 1 remote-stylesheet-in-agent  agents/x.md       '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">'
expect 1 protocol-relative-command   commands/x.md     '<script src="//cdn.example.com/a.js"></script>'
expect 0 local-script                skills/x/SKILL.md '<script src="../_assets/mermaid-11.0.0.min.js"></script>'
expect 0 marked-exception            skills/x/SKILL.md '<script src="https://cdn.tailwindcss.com"></script> artifact-gate: ok'
expect 0 remote-image-is-not-a-script skills/x/SKILL.md '<img src="https://example.com/a.png">'
expect 0 vendored-upstream-code      references/vendor/lib.min.js 'x="<script src=\"https://example.com/a.js\">"'

if [ "$fails" -ne 0 ]; then
  echo "check-artifacts remote rule: $fails failed"
  exit 1
fi
echo "check-artifacts remote rule: all passed"
