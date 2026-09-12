#!/usr/bin/env bash
# The opencode installer, run for real into scratch destinations.
# Test scaffolding: the scratch directory is removed on every exit. rm -rf
# never follows a symbolic link, so fx's own skills are never touched.
set -euo pipefail
FX="$(cd "$(dirname "$0")/../.." && pwd -P)"
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT
fails=0
check() { if eval "$2"; then echo "ok: $1"; else echo "FAIL: $1"; fails=$((fails + 1)); fi; }
install_into() { python3 "$FX/scripts/fx-opencode-install" --dest "$1" > "$SCRATCH/$(basename "$1").out" 2>&1; }
# attempt <dest> [--dry-run]: runs the installer and keeps its exit code in rc
attempt() { set +e; python3 "$FX/scripts/fx-opencode-install" --dest "$@" > "$SCRATCH/$(basename "$1").out" 2>&1; rc=$?; set -e; }
# Every path under a tree, with a link's recorded target or a file's checksum.
snapshot() { find "$1" | sort | while read -r f; do printf '%s %s\n' "$f" "$( [ -L "$f" ] && readlink "$f" || { [ -f "$f" ] && sha256sum "$f" | cut -d' ' -f1; } || true)"; done; }
# A generated command carries its source body: the source's first heading and
# its last line of prose, with Claude Code's `fx:` prefix dropped, since
# opencode registers commands and agents without it.
body_carried() {
  local first last
  first="$(grep -m1 '^# ' "$1" | sed 's/fx:fx-/fx-/g')"
  last="$(awk 'NF && !/^```/{l=$0} END{print l}' "$1" | sed 's/fx:fx-/fx-/g')"
  grep -qxF -- "$first" "$2" && grep -qxF -- "$last" "$2"
}
# Computed once into a variable and matched with a here-string, never piped
# into `grep -q`: under `pipefail`, `grep -q` can exit as soon as it finds a
# match while the upstream command is still writing, which reports the whole
# pipeline as failed even though there was a match.
USER_INVOKED="$(grep -l '^disable-model-invocation: true' "$FX"/skills/*/SKILL.md | xargs -n1 dirname | xargs -n1 basename)"

# 1. another tool's skill already there, and a stale fx link
D1="$SCRATCH/d1"
mkdir -p "$D1/skills/foreign-skill"
printf -- '---\nname: foreign-skill\ndescription: not fx\n---\nforeign\n' > "$D1/skills/foreign-skill/SKILL.md"
FOREIGN_SUM="$(sha256sum "$D1/skills/foreign-skill/SKILL.md" | cut -d' ' -f1)"
ln -s "$FX/skills/fx-gone" "$D1/skills/fx-gone"
printf '{"theme": "mine"}\n' > "$D1/opencode.json"
CONFIG_SUM="$(sha256sum "$D1/opencode.json" | cut -d' ' -f1)"
install_into "$D1" || true

check "skills is a real directory" '[ -d "$D1/skills" ] && [ ! -L "$D1/skills" ]'
check "foreign skill untouched" '[ ! -L "$D1/skills/foreign-skill" ] && [ "$(sha256sum "$D1/skills/foreign-skill/SKILL.md" | cut -d" " -f1)" = "$FOREIGN_SUM" ]'
check "stale fx link removed" '[ ! -L "$D1/skills/fx-gone" ]'
check "opencode.json untouched" '[ "$(sha256sum "$D1/opencode.json" | cut -d" " -f1)" = "$CONFIG_SUM" ]'
for s in $(ls "$FX/skills"); do
  if grep -qx "$s" <<<"$USER_INVOKED"; then
    check "user-invoked $s not linked" '[ ! -e "$D1/skills/$s" ] && [ ! -L "$D1/skills/$s" ]'
  else
    check "skill $s linked" '[ -L "$D1/skills/$s" ] && [ "$(readlink "$D1/skills/$s")" = "$FX/skills/$s" ]'
  fi
done
check "references resolve through a linked skill" '[ -f "$D1/skills/fx-tdd/../../references/vocab/good-tests.md" ]'
FX_SKILLS="$(( $(ls -d "$FX"/skills/*/SKILL.md | wc -l) - $(grep -c . <<<"$USER_INVOKED") ))"
check "printed skill count is fx's $FX_SKILLS links, not the foreign skill" 'grep -q "^skills: $FX_SKILLS " "$SCRATCH/d1.out"'
for f in "$D1"/commands/*.md; do
  n="$(basename "$f")"
  src="$FX/commands/$n"; [ -f "$src" ] || src="$FX/skills/${n%.md}/SKILL.md"
  check "$n has no template field" '! grep -q "^template:" "$f"'
  check "$n carries its source body" 'body_carried "$src" "$f"'
  check "$n names commands and agents as opencode registers them" '! grep -q "fx:fx-" "$f"'
done
A="$D1/commands/fx-audit.md"
check "fx-audit command generated" '[ -f "$A" ]'
check "fx-audit command has no relative paths" '! grep -qF "../../" "$A"'
check "fx-audit command claims no base directory" '! grep -q "base directory" "$A"'
check "fx-audit command names the audit template" 'grep -qF "$D1/references/audit-template.md" "$A"'
while IFS= read -r p; do
  check "fx-audit path exists: ${p#$D1/}" '[ -e "$p" ]'
done < <(grep -oE "$D1/(references|agents)/[A-Za-z0-9/._-]+" "$A" | sort -u)

# 2. a second install into the same destination succeeds and changes nothing:
# fx's own skills, references and plugin links are accepted as fx's
snapshot "$D1" > "$SCRATCH/first.txt"
attempt "$D1"
check "second install succeeds" '[ "$rc" -eq 0 ]'
snapshot "$D1" > "$SCRATCH/second.txt"
check "second install identical" 'diff -q "$SCRATCH/first.txt" "$SCRATCH/second.txt" >/dev/null'

# 3. an earlier install's whole-folder link becomes a folder of links
D2="$SCRATCH/d2"; mkdir -p "$D2"; ln -s "$FX/skills" "$D2/skills"
install_into "$D2" || true
check "whole-folder link replaced" '[ -d "$D2/skills" ] && [ ! -L "$D2/skills" ] && [ -L "$D2/skills/fx-tdd" ]'
check "fx skills directory intact" '[ -f "$FX/skills/fx-tdd/SKILL.md" ] && [ -f "$FX/skills/fx-audit/SKILL.md" ]'

# 4. a real entry with an fx skill's name is refused and left alone
D3="$SCRATCH/d3"; mkdir -p "$D3/skills/fx-tdd"; echo mine > "$D3/skills/fx-tdd/SKILL.md"
set +e; install_into "$D3"; rc=$?; set -e
check "same-named real entry refused" '[ "$rc" -ne 0 ] && grep -q "fx-tdd" "$SCRATCH/d3.out"'
check "same-named real entry unchanged" '[ "$(cat "$D3/skills/fx-tdd/SKILL.md")" = mine ]'

# 5. a command file another tool created, never generated by this installer,
# is refused rather than overwritten silently
D4="$SCRATCH/d4"; mkdir -p "$D4/commands"; printf 'not generated\n' > "$D4/commands/fx-critique.md"
set +e; install_into "$D4"; rc=$?; set -e
check "foreign command file refused" '[ "$rc" -ne 0 ] && grep -q "fx-critique" "$SCRATCH/d4.out"'
check "foreign command file unchanged" '[ "$(cat "$D4/commands/fx-critique.md")" = "not generated" ]'

# 6. a same-named skill link pointing outside fx is refused, not replaced
D5="$SCRATCH/d5"; mkdir -p "$D5/skills" "$SCRATCH/outside-fx"
ln -s "$SCRATCH/outside-fx" "$D5/skills/fx-tdd"
set +e; install_into "$D5"; rc=$?; set -e
check "foreign skill link refused" '[ "$rc" -ne 0 ] && grep -q "fx-tdd" "$SCRATCH/d5.out"'
check "foreign skill link unchanged" '[ "$(readlink "$D5/skills/fx-tdd")" = "$SCRATCH/outside-fx" ]'

# 7. a dry run refuses a foreign skill link too, and reports it, exactly as
# a real install would: the refusal must not be gated behind --dry-run
D7="$SCRATCH/d7"; mkdir -p "$D7/skills" "$SCRATCH/outside-fx3"
ln -s "$SCRATCH/outside-fx3" "$D7/skills/fx-tdd"
set +e; python3 "$FX/scripts/fx-opencode-install" --dest "$D7" --dry-run > "$SCRATCH/d7.out" 2>&1; rc=$?; set -e
check "dry run refuses a foreign skill link" '[ "$rc" -ne 0 ] && grep -q "fx-tdd" "$SCRATCH/d7.out"'
check "dry run wrote nothing new" '[ ! -e "$D7/references" ] && [ ! -e "$D7/commands" ] && [ ! -e "$D7/agents" ]'

# 8. a refusal fires before any write: a stale fx link sits next to a
# foreign link, and the whole install must fail before the stale link is
# ever touched, proving checks all run before writes start
D6="$SCRATCH/d6"; mkdir -p "$D6/skills" "$SCRATCH/outside-fx4"
ln -s "$FX/skills/fx-gone" "$D6/skills/fx-gone"
ln -s "$SCRATCH/outside-fx4" "$D6/skills/fx-tdd"
set +e; install_into "$D6"; rc=$?; set -e
check "refusal alongside a stale link still fails" '[ "$rc" -ne 0 ] && grep -q "fx-tdd" "$SCRATCH/d6.out"'
check "stale link survives a refusal before any write" '[ -L "$D6/skills/fx-gone" ] && [ "$(readlink "$D6/skills/fx-gone")" = "$FX/skills/fx-gone" ]'

# 9. a foreign command file's refusal fires before skills are ever linked
D8="$SCRATCH/d8"; mkdir -p "$D8/commands"; printf 'not generated\n' > "$D8/commands/fx-critique.md"
set +e; install_into "$D8"; rc=$?; set -e
check "foreign command file refusal precedes any write" '[ "$rc" -ne 0 ] && [ ! -e "$D8/skills" ]'

# 10. a link fx did not create at skills, references or plugins/fx.js, and a
# real file where references or plugins/fx.js belongs, is refused and named
# before any write, in a real install and in a dry run alike
mkdir -p "$SCRATCH/other-tool"
for mode in install dry-run; do
  for setup in link:skills link:references link:plugins/fx.js real:references real:plugins/fx.js real:plugins; do
    kind="${setup%%:*}"; entry="${setup#*:}"
    D="$SCRATCH/c1-$mode-$kind-${entry//\//-}"; mkdir -p "$(dirname "$D/$entry")"
    if [ "$kind" = link ]; then ln -s "$SCRATCH/other-tool" "$D/$entry"; else echo mine > "$D/$entry"; fi
    snapshot "$D" > "$SCRATCH/before.txt"
    if [ "$mode" = dry-run ]; then attempt "$D" --dry-run; else attempt "$D"; fi
    check "$mode: $kind at $entry refused, named" '[ "$rc" -ne 0 ] && grep -qF "$D/$entry" "$SCRATCH/$(basename "$D").out"'
    check "$mode: $kind at $entry, nothing written or removed" 'snapshot "$D" | diff -q "$SCRATCH/before.txt" - >/dev/null'
  done
done

# 11. any link at a command or agent path is refused, a dangling one included:
# fx never creates one there, and writing through it lands outside the
# destination
for p in commands/fx-critique.md agents/fx-lens-pipeline.md; do
  D="$SCRATCH/m1-${p%%/*}"; mkdir -p "$D/${p%%/*}"
  ln -s "$SCRATCH/m1-target-${p%%/*}.md" "$D/$p"
  attempt "$D"
  check "dangling link at $p refused, named" '[ "$rc" -ne 0 ] && grep -qF "$D/$p" "$SCRATCH/$(basename "$D").out"'
  check "dangling link at $p not written through" '[ ! -e "$SCRATCH/m1-target-${p%%/*}.md" ] && [ ! -e "$D/skills" ]'
done

# 12. an agent file the installer did not generate is refused before any
# write, the way a command file is
D="$SCRATCH/foreign-agent"; mkdir -p "$D/agents"; printf 'not generated\n' > "$D/agents/fx-devils-advocate.md"
attempt "$D"
check "foreign agent file refused, named" '[ "$rc" -ne 0 ] && grep -qF "$D/agents/fx-devils-advocate.md" "$SCRATCH/foreign-agent.out"'
check "foreign agent file unchanged, nothing written" '[ "$(cat "$D/agents/fx-devils-advocate.md")" = "not generated" ] && [ ! -e "$D/skills" ]'

# 13. the final probe reads <dest>/references itself: an installer that never
# links references fails loudly rather than printing OK. The installer is
# copied beside links to fx's own tree with that one link step removed.
M="$SCRATCH/fx-without-references-step"; mkdir -p "$M/scripts" "$M/plugins"
for d in skills agents commands references; do ln -s "$FX/$d" "$M/$d"; done
ln -s "$FX/plugins/fx.js" "$M/plugins/fx.js"
grep -vF '(FX / "references", dest / "references"),' "$FX/scripts/fx-opencode-install" > "$M/scripts/fx-opencode-install"
check "the copy really lacks the references link step" '! cmp -s "$FX/scripts/fx-opencode-install" "$M/scripts/fx-opencode-install"'
set +e; python3 "$M/scripts/fx-opencode-install" --dest "$SCRATCH/no-references" > "$SCRATCH/no-references.out" 2>&1; rc=$?; set -e
check "a missing references entry fails the install, named" '[ "$rc" -ne 0 ] && [ ! -e "$SCRATCH/no-references/references" ] && grep -q "references did not resolve" "$SCRATCH/no-references.out"'

if [ "$fails" -ne 0 ]; then echo "opencode install: $fails failed"; exit 1; fi
echo "opencode install: all passed"
