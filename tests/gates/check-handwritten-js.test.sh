#!/usr/bin/env bash
# scripts/check-handwritten-js, driven in scratch git repos that carry copies
# of the gate and the real allowlist: an unheaded file, a headed file, an
# extensionless node script, an allowlisted fixture, an empty repo and stale
# generated output.
set -uo pipefail
cd "$(dirname "$0")/../.."
ROOT="$PWD"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
fails=0
fail() { echo "FAIL: $*"; fails=1; }
HDR='// generated from src/a.ts by scripts/build: edit there, not here'

fresh() {  # fresh <name>: a scratch repo holding the gate, the allowlist and the path mapper
  local r="$T/$1"
  mkdir -p "$r/scripts" && cp "$ROOT/scripts/check-handwritten-js" "$ROOT/scripts/handwritten-js-allowlist.txt" "$ROOT/scripts/test-scope" "$r/scripts/" 2>/dev/null
  git -C "$r" init -q && echo scripts/test-scope >> "$r/.git/info/exclude" && echo "$r"
}
run() {  # run <repo> <want exit> <want line, or empty> <label>
  local r="$1" want="$2" text="$3" label="$4" out got
  git -C "$r" add -A >/dev/null
  out="$("$r/scripts/check-handwritten-js" 2>&1)"; got=$?
  [ "$got" -eq "$want" ] || { fail "$label (exit $got, wanted $want): $out"; return; }
  [ -z "$text" ] || grep -qxF -- "$text" <<<"$out" || fail "$label: no line '$text' in: $out"
}

r="$(fresh bare)"; echo 'x();' > "$r/a.js"
run "$r" 1 'FAIL: a.js is hand-written JavaScript' "a.js without the header"

r="$(fresh headed)"; mkdir "$r/src"; : > "$r/src/a.ts"; printf '%s\nx();\n' "$HDR" > "$r/a.js"
run "$r" 0 'check-handwritten-js: OK (1 files)' "a.js with the header"

r="$(fresh shebang)"; mkdir "$r/src"; : > "$r/src/a.ts"; printf '#!/usr/bin/env node\n%s\nx();\n' "$HDR" > "$r/a.js"
run "$r" 0 '' "header on line 2 after a shebang"

r="$(fresh nodescript)"; printf '#!/usr/bin/env node\nx();\n' > "$r/tool"
run "$r" 1 'FAIL: tool is hand-written JavaScript' "extensionless node script without the header"

r="$(fresh bashscript)"; printf '#!/usr/bin/env bash\nx\n' > "$r/tool"; echo 'x();' > "$r/b.cjs"; printf 'y\n' > "$r/b.mjs"
run "$r" 1 'FAIL: b.cjs is hand-written JavaScript' ".cjs is scanned"
out="$("$r/scripts/check-handwritten-js" 2>&1)"
grep -qxF 'FAIL: b.mjs is hand-written JavaScript' <<<"$out" || fail ".mjs is not scanned"
grep -q 'tool' <<<"$out" && fail "a bash script was reported"

r="$(fresh fixture)"; mkdir -p "$r/tests/review-bench/good"; echo 'x();' > "$r/tests/review-bench/good/a.js"
run "$r" 0 'check-handwritten-js: OK (1 files)' "an allowlisted fixture"

r="$(fresh nonfixture)"; mkdir -p "$r/tests/fixture-build/repo"; echo 'x();' > "$r/tests/fixture-build/repo/a.js"
run "$r" 1 'FAIL: tests/fixture-build/repo/a.js is hand-written JavaScript' "a non-fixture path is not allowlisted"

r="$(fresh empty)"; echo hi > "$r/README.md"
run "$r" 1 'FAIL: no JavaScript file scanned' "a repo with no JavaScript"

r="$(fresh stale)"; printf '%s\nx();\n' "$HDR" > "$r/a.js"
run "$r" 1 'FAIL: a.js is stale generated output: src/a.ts does not exist' "header naming a missing source"

r="$(fresh copied)"; mkdir "$r/src"; : > "$r/src/a.ts"; printf '%s\nx();\n' "$HDR" > "$r/b.js"
run "$r" 1 'FAIL: b.js names src/a.ts, which scripts/build writes to a.js' "a header copied onto another path"

r="$(fresh mapped)"; mkdir -p "$r/src/scripts"; : > "$r/src/scripts/test-scope.ts"
printf '#!/usr/bin/env node\n// generated from src/scripts/test-scope.ts by scripts/build: edit there, not here\nx();\n' > "$r/scripts/tool"
run "$r" 1 'FAIL: scripts/tool names src/scripts/test-scope.ts, which scripts/build writes to scripts/test-scope' "an extensionless output on the wrong path"

exit "$fails"
