#!/usr/bin/env bash
# The TypeScript toolchain: scripts/build writes the generated header,
# scripts/check-generated catches drift and a lost executable bit,
# scripts/check-ts-escapes catches the escapes it names and nothing else,
# scripts/check-types fails on a type error and accepts ESM syntax.
set -uo pipefail
cd "$(dirname "$0")/../.."
ROOT="$PWD"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
fails=0
fail() { echo "FAIL: $*"; fails=1; }
expect() {  # expect <exit> <expected output, or empty> <label> <command...>
  local want="$1" text="$2" label="$3"; shift 3
  out="$("$@" 2>&1)"; got=$?
  if [ "$got" -ne "$want" ]; then fail "$label (exit $got, wanted $want): $out"; return; fi
  if [ -n "$text" ] && ! grep -qxF -- "$text" <<<"$out"; then fail "$label: no line '$text' in: $out"; fi
}

# Header on the committed module.
scripts/build || fail "scripts/build exited nonzero"
line1="$(head -1 lib/user-invoked-lanes.js)"
[ "$line1" = "// generated from src/lib/user-invoked-lanes.ts by scripts/build: edit there, not here" ] \
  || fail "line 1 of lib/user-invoked-lanes.js is '$line1'"

# A shebang stays line 1 and the header moves to line 2.
mkdir -p "$T/repo/scripts" "$T/repo/src/lib"
cp scripts/build "$T/repo/scripts/"
printf '#!/usr/bin/env node\nconsole.log(1);\n' > "$T/repo/src/lib/sample.ts"
ln -s "$ROOT/node_modules" "$T/repo/node_modules"
"$T/repo/scripts/build" --out "$T/out" || fail "scripts/build --out exited nonzero"
[ "$(sed -n 1p "$T/out/lib/sample.js")" = '#!/usr/bin/env node' ] || fail "shebang is not line 1"
[ "$(sed -n 2p "$T/out/lib/sample.js")" = '// generated from src/lib/sample.ts by scripts/build: edit there, not here' ] \
  || fail "header is not line 2 after a shebang"

# Nothing to build is a failure, whether src/ is empty or find cannot read it.
mkdir -p "$T/nosrc/scripts" "$T/nosrc/src"
cp scripts/build "$T/nosrc/scripts/"
ln -s "$ROOT/node_modules" "$T/nosrc/node_modules"
expect 1 "scripts/build: built no files from src/" "build with an empty src/" "$T/nosrc/scripts/build" --out "$T/nosrc-out"
rmdir "$T/nosrc/src"
expect 1 "scripts/build: built no files from src/" "build with no src/" "$T/nosrc/scripts/build" --out "$T/nosrc-out"

# No esbuild: one clear instruction.
rm "$T/repo/node_modules"
expect 1 "scripts/build: run npm ci first" "build without node_modules" "$T/repo/scripts/build"

# Drift and mode comparisons on temp copies of a built tree.
scripts/build --out "$T/built" >/dev/null
cp -a "$T/built" "$T/drift"; git -C "$T/drift" init -q; git -C "$T/drift" add -A
echo '// x' >> "$T/drift/lib/user-invoked-lanes.js"
expect 1 "FAIL: generated JavaScript has drifted from src/" "hand-edited generated file" \
  scripts/check-generated --compare "$T/built" "$T/drift"
mkdir -p "$T/modes/built/scripts"
printf 'x\n' > "$T/modes/built/scripts/test-scope"
chmod 755 "$T/modes/built/scripts/test-scope"
cp -a "$T/modes/built" "$T/modes/copy"
chmod 644 "$T/modes/copy/scripts/test-scope"; git -C "$T/modes/copy" init -q
expect 1 "FAIL: scripts/test-scope should be executable" "lost executable bit" \
  scripts/check-generated --compare "$T/modes/built" "$T/modes/copy"
expect 0 "check-generated: OK" "committed tree is clean" scripts/check-generated

# A tracked file carrying the generated header that the build does not write.
cp -a "$T/built" "$T/orphan"
printf '%s\nx();\n' '// generated from src/lib/ghost.ts by scripts/build: edit there, not here' > "$T/orphan/lib/ghost.js"
git -C "$T/orphan" init -q && git -C "$T/orphan" add -A
expect 1 "FAIL: lib/ghost.js carries the generated header but scripts/build does not write it" \
  "orphaned generated file" scripts/check-generated --compare "$T/built" "$T/orphan"

# check-generated in a scratch repo whose generators are stubs: codex/agents
# missing is trouble, not a clean diff, and a build that writes nothing fails.
gen() {  # gen <name> <build body>: a scratch repo, codex/agents present and matching
  local r="$T/gen-$1"
  mkdir -p "$r/scripts" "$r/codex/agents"
  cp scripts/check-generated "$r/scripts/"
  printf '#!/usr/bin/env bash\nmkdir -p "$1"; echo x > "$1/a.toml"\n' > "$r/scripts/gen-codex-agents"
  printf '#!/usr/bin/env bash\nmkdir -p "$2"\n%s\n' "$2" > "$r/scripts/build"
  chmod 755 "$r/scripts/gen-codex-agents" "$r/scripts/build"
  echo x > "$r/codex/agents/a.toml"
  git -C "$r" init -q && git -C "$r" add -A
  echo "$r"
}
r="$(gen nocodex :)"; rm -r "$r/codex"
expect 1 "FAIL: could not compare codex/agents with a fresh generation" "codex/agents missing" "$r/scripts/check-generated"
r="$(gen nobuild :)"
expect 1 "FAIL: scripts/build wrote no files" "a build that writes nothing" "$r/scripts/check-generated"
mkdir "$T/emptybuilt"
expect 1 "FAIL: scripts/build wrote no files" "compare over an empty tree" scripts/check-generated --compare "$T/emptybuilt" "$T/orphan"

# .fx.json's test_one and test_scope never rebuild in place: in a copy of the
# checkout with src/ edited and scripts/build not run, both fail on drift and
# the committed JavaScript is left as it was.
mkdir "$T/stale"
git ls-files -z | tar --null -T - -cf - | tar -xf - -C "$T/stale"
ln -s "$ROOT/node_modules" "$T/stale/node_modules"
git -C "$T/stale" init -q && git -C "$T/stale" add -A
echo 'export const STALE = 1;' >> "$T/stale/src/lib/user-invoked-lanes.ts"
before="$(cat "$T/stale/lib/user-invoked-lanes.js")"
for key in test_one test_scope; do
  cmd="$(node -e 'const c = require(process.argv[1]); process.stdout.write(c[process.argv[2]].replace("{file}", process.argv[3]).replace("{paths}", process.argv[3]))' \
    "$T/stale/.fx.json" "$key" src/lib/env.test.ts)"
  expect 1 "FAIL: generated JavaScript has drifted from src/" "$key with scripts/build not run" bash -c "cd \"\$1\" && $cmd" _ "$T/stale"
  [ "$(cat "$T/stale/lib/user-invoked-lanes.js")" = "$before" ] || fail "$key rebuilt lib/user-invoked-lanes.js in place"
done

# Escapes: one case each.
esc() {  # esc <exit> <expected line or empty> <source line>
  rm -rf "$T/esc"; mkdir "$T/esc"; printf '%s\n' "$3" > "$T/esc/a.ts"
  expect "$1" "$2" "escape gate on: $3" scripts/check-ts-escapes "$T/esc"
}
esc 1 "FAIL: a.ts:1: any without ts-gate-ok" 'let v: any = 1;'
esc 1 "FAIL: a.ts:1: as any without ts-gate-ok" 'const x = y as any;'
esc 1 "FAIL: a.ts:1: @ts-ignore without ts-gate-ok" '// @ts-ignore'
esc 1 "FAIL: a.ts:1: @ts-expect-error without ts-gate-ok" '// @ts-expect-error'
esc 1 "FAIL: a.ts:1: JSON.parse without ts-gate-ok" 'const o = JSON.parse(s);'
esc 1 "FAIL: a.ts:1: @ts-nocheck without ts-gate-ok" '// @ts-nocheck'
for shape in 'const m: Record<string, any> = {};' 'let m: Map<any, string>;' 'let u: string | any;' \
  'let u: any | string;' 'function f<T = any>(): T { throw 1; }' 'let t: [string, any];' 'type X = any;' \
  'type C<T> = T extends any ? 1 : 2;' 'let f: (x: number) => any;' 'let a: Array<any>;'; do
  esc 1 "FAIL: a.ts:1: any without ts-gate-ok" "$shape"
done
# Em and en dashes, written as bytes so this file carries none.
esc 1 "FAIL: a.ts:1: em or en dash" "$(printf '// one \342\200\224 two')"
esc 1 "FAIL: a.ts:1: em or en dash" "$(printf 'const r = \"1\342\200\2232\";')"
esc 1 "FAIL: a.ts:1: em or en dash" "$(printf '// a \342\200\224 b ts-gate-ok: not exempt')"
esc 0 "" 'const s = "a - b";'
esc 0 "" '// any of these may run'
esc 0 "" 'const company = anything.many;'
esc 0 "" 'x.any = 1;'
esc 0 "" '/** any of these */ const a = 1;'
esc 0 "" $'/**\n * Returns any value.\n */\nconst b = 1;'
esc 0 "" $'/* starts here\n   any here */ const c = 1;'
esc 0 "" "const s = 'it is any';"
esc 0 "" 'const s = `any ${n} more`;'
esc 0 "" 'const s = "any value";'
esc 0 "" 'let v: any = 1; // ts-gate-ok: test fixture'
rm -rf "$T/esc"; mkdir -p "$T/esc/lib"; printf 'const a = b as string;\n' > "$T/esc/lib/hook-input.ts"
expect 1 "FAIL: lib/hook-input.ts:1: as without ts-gate-ok" "type assertion in a trust-boundary parser" \
  scripts/check-ts-escapes "$T/esc"
mkdir "$T/empty"
expect 1 "FAIL: no TypeScript source found" "escape gate on an empty directory" scripts/check-ts-escapes "$T/empty"

# Type check: a type error fails, ESM syntax passes.
types() {  # types <exit> <source>
  rm -rf "$T/types"; mkdir "$T/types"
  printf '{ "extends": "%s/tsconfig.json", "include": [], "files": ["a.ts"] }\n' "$ROOT" > "$T/types/tsconfig.json"
  printf '%s\n' "$2" > "$T/types/a.ts"
  ln -s "$ROOT/node_modules" "$T/types/node_modules"
  scripts/check-types "$T/types" >/dev/null 2>&1; got=$?
  if [ "$1" -eq 0 ] && [ "$got" -ne 0 ]; then fail "check-types rejected: $2"; fi
  if [ "$1" -ne 0 ] && [ "$got" -eq 0 ]; then fail "check-types accepted: $2"; fi
}
types 1 'const n: number = "x";'
types 0 'const u = import.meta.url; await Promise.resolve(u); export {};'

# DOM types reach only the browser helper: a Node source checked with every
# real source under src/ cannot use a bare DOM global, and both projects pass.
rm -rf "$T/types"; mkdir "$T/types"
printf '{ "extends": "%s/tsconfig.json", "include": ["%s/src", "a.ts"] }\n' "$ROOT" "$ROOT" > "$T/types/tsconfig.json"
printf 'export const t = event;\n' > "$T/types/a.ts"
ln -s "$ROOT/node_modules" "$T/types/node_modules"
out="$(scripts/check-types "$T/types" 2>&1)" && fail "a Node source using the DOM global event type-checked"
grep -q "a.ts.*Cannot find name 'event'" <<<"$out" || fail "the DOM global was not the error: $out"
expect 0 "check-types: OK" "both projects on the committed tree" scripts/check-types

# Bash 3.2 (macOS): the TypeScript gates use no bash 4 builtin or expansion,
# and every "${array[@]}" is guarded, since an empty one is unbound under
# set -u before bash 4.4.
for g in scripts/build scripts/check-generated scripts/check-handwritten-js scripts/check-ts-escapes scripts/check-types; do
  hits="$(grep -nE 'mapfile|readarray|declare -[aA]*A|local -A|coproc|&>>|\|&|\$\{[A-Za-z_][A-Za-z0-9_]*(,,?|\^\^?)\}' "$g")"
  [ -z "$hits" ] || fail "$g uses a bash 4 feature: $hits"
  hits="$(sed -E 's/\$\{([A-Za-z_][A-Za-z0-9_]*)\[@\]\+"\$\{\1\[@\]\}"\}//g' "$g" | grep -nE '"\$\{[A-Za-z_][A-Za-z0-9_]*\[@\]\}"')"
  [ -z "$hits" ] || fail "$g expands an array unguarded: $hits"
done

[ "$fails" -eq 0 ] || exit 1
echo "ts-toolchain.test.sh: all passed"
