#!/usr/bin/env bash
# The remote-asset rule in scripts/check-artifacts, run against scratch trees.
# Test scaffolding: the scratch directory is removed on every exit.
set -euo pipefail
cd "$(dirname "$0")/../.."
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT
fails=0

# expect <exit> <label> <path inside the scratch tree> <text to write> [<line a hit is reported at>]
expect() {
  local want="$1" label="$2" rel="$3" content="$4" line="${5:-}" root="$SCRATCH/$2"
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
  elif [ -n "$line" ] && ! grep -q "$rel:$line\$" "$SCRATCH/$label.out"; then
    echo "FAIL: $label: hit not reported at line $line"
    cat "$SCRATCH/$label.out"
    fails=$((fails + 1))
  else
    echo "ok: $label"
  fi
}

# refuse <label> <root>: a root that cannot hold what the gate checks fails,
# naming the root, instead of reporting a clean result
refuse() {
  set +e
  python3 scripts/check-artifacts "$2" > "$SCRATCH/$1.out" 2>&1
  local got=$?
  set -e
  if [ "$got" -eq 0 ]; then
    echo "FAIL: $1: exit 0, want nonzero"
    cat "$SCRATCH/$1.out"
    fails=$((fails + 1))
  elif ! grep -qF "$2" "$SCRATCH/$1.out"; then
    echo "FAIL: $1: output does not name the root"
    cat "$SCRATCH/$1.out"
    fails=$((fails + 1))
  else
    echo "ok: $1 (exit $got)"
  fi
}

expect 1 remote-script-in-skill      skills/x/SKILL.md '<script src="https://cdn.tailwindcss.com"></script>'
expect 1 remote-import-in-reference  references/x.md   'import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";'
expect 1 remote-stylesheet-in-agent  agents/x.md       '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">'
expect 1 protocol-relative-command   commands/x.md     '<script src="//cdn.example.com/a.js"></script>'
expect 1 unquoted-script-src         skills/x/SKILL.md '<script src=https://cdn.tailwindcss.com></script>'
expect 1 unquoted-link-href          commands/x.md     '<link rel=stylesheet href=https://fonts.googleapis.com/css2?family=Inter>'
expect 1 side-effect-import          references/x.md   'import "https://cdn.example.com/a.js";'
expect 1 dynamic-import              skills/x/SKILL.md 'const m = await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs");'
expect 1 dynamic-import-template     skills/x/SKILL.md 'const m = await import(`https://cdn.example.com/a.js`);'
expect 1 stylesheet-import-url       agents/x.md       '@import url("https://fonts.googleapis.com/css2?family=Inter");'
expect 1 stylesheet-import-string    agents/x.md       "@import 'https://fonts.googleapis.com/css2?family=Inter';"
expect 1 dynamic-import-line-number  skills/x/SKILL.md $'one\ntwo\nawait import("https://cdn.example.com/a.js");' 3
expect 0 local-script                skills/x/SKILL.md '<script src="../_assets/mermaid-11.0.0.min.js"></script>'
expect 0 marked-exception            skills/x/SKILL.md '<script src="https://cdn.tailwindcss.com"></script> artifact-gate: ok'
expect 0 marked-dynamic-import       skills/x/SKILL.md 'await import("https://cdn.example.com/a.js"); // artifact-gate: ok'
expect 0 remote-image-is-not-a-script skills/x/SKILL.md '<img src="https://example.com/a.png">'
expect 0 prose-names-a-url           skills/x/SKILL.md 'Reports once loaded Tailwind from https://cdn.tailwindcss.com; import the vendored copy instead, from "../_assets/".'
expect 0 vendored-upstream-code      references/vendor/lib.min.js 'x="<script src=\"https://example.com/a.js\">"'

# split-script-tag: a <script> tag whose src attribute sits on the next
# line still gets caught, and the reported line is where the tag starts
# (line 2, after the "before" padding line), not where src= appears.
ROOT="$SCRATCH/split-script-tag"
mkdir -p "$ROOT/skills/x"
printf 'before\n<script\n  src="https://cdn.tailwindcss.com"></script>\n' > "$ROOT/skills/x/SKILL.md"
set +e
python3 scripts/check-artifacts "$ROOT" > "$SCRATCH/split-script-tag.out" 2>&1
got=$?
set -e
if [ "$got" -ne 1 ]; then
  echo "FAIL: split-script-tag: exit $got, want 1"
  cat "$SCRATCH/split-script-tag.out"
  fails=$((fails + 1))
elif ! grep -q 'skills/x/SKILL.md:2' "$SCRATCH/split-script-tag.out"; then
  echo "FAIL: split-script-tag: hit not reported at line 2"
  cat "$SCRATCH/split-script-tag.out"
  fails=$((fails + 1))
else
  echo "ok: split-script-tag"
fi

refuse missing-root "$SCRATCH/does-not-exist"
printf 'skills\n' > "$SCRATCH/a-file"
refuse file-root "$SCRATCH/a-file"
mkdir -p "$SCRATCH/no-area/x"; printf '<script src="https://cdn.tailwindcss.com"></script>\n' > "$SCRATCH/no-area/x/SKILL.md"
refuse root-with-no-scanned-area "$SCRATCH/no-area"

if [ "$fails" -ne 0 ]; then
  echo "check-artifacts remote rule: $fails failed"
  exit 1
fi
echo "check-artifacts remote rule: all passed"
