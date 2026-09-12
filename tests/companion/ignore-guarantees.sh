#!/usr/bin/env bash
# The visual companion's ignore guarantees, proven by starting it for real in
# scratch repositories. Needs git and node. Starts servers, so it is run by
# hand, not by scripts/check-all. Everything it creates is removed on exit.
set -uo pipefail
FX="$(cd "$(dirname "$0")/../.." && pwd -P)"
START="$FX/skills/fx-brainstorm/scripts/start-server.sh"
STOP="$FX/skills/fx-brainstorm/scripts/stop-server.sh"
SCRATCH="$(mktemp -d)"
STARTED=()
cleanup() {
  for s in "${STARTED[@]}"; do bash "$STOP" "$s" >/dev/null 2>&1; done
  rm -rf "$SCRATCH"
}
trap cleanup EXIT
fails=0
check() { if eval "$2"; then echo "ok: $1"; else echo "FAIL: $1"; fails=$((fails + 1)); fi; }

# start <project> <label>: prints the start JSON to $SCRATCH/<label>.json
start() {
  bash "$START" --project-dir "$1" --slug 2026-09-12-probe --background > "$SCRATCH/$2.json" 2>"$SCRATCH/$2.err"
  local state
  state="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("state_dir",""))' "$SCRATCH/$2.json" 2>/dev/null)"
  if [ -n "$state" ]; then STARTED+=("$(dirname "$state")"); fi
}
stop_all() { for s in "${STARTED[@]}"; do bash "$STOP" "$s" >/dev/null 2>&1; done; STARTED=(); }

# 1. a git repository: the exclude file is untouched and session files are ignored
P1="$SCRATCH/repo"; mkdir -p "$P1"; git -C "$P1" init -q
EXCLUDE="$(git -C "$P1" rev-parse --path-format=absolute --git-path info/exclude)"
BEFORE="$(sha256sum "$EXCLUDE" | cut -d' ' -f1)"
start "$P1" repo
check "git repository: start succeeded" 'grep -q state_dir "$SCRATCH/repo.json"'
check "git repository: exclude file unchanged" '[ "$(sha256sum "$EXCLUDE" | cut -d" " -f1)" = "$BEFORE" ]'
check "git repository: nothing under .fx is stageable" '[ -z "$(git -C "$P1" status --porcelain --untracked-files=all -- .fx)" ]'
stop_all

# 2. no .git at start: a later git init stages nothing under .fx
P2="$SCRATCH/plain"; mkdir -p "$P2"
start "$P2" plain
check "no .git: start succeeded" 'grep -q state_dir "$SCRATCH/plain.json"'
stop_all
git -C "$P2" init -q && git -C "$P2" add -A
check "no .git: git init and add -A stage nothing under .fx" '[ -z "$(git -C "$P2" diff --cached --name-only -- .fx)" ]'

# 3. a project rule re-including .fx/
P3="$SCRATCH/reinclude"; mkdir -p "$P3"; git -C "$P3" init -q
printf '!.fx/\n' > "$P3/.gitignore"
start "$P3" reinclude
check "re-include rule: start succeeded" 'grep -q state_dir "$SCRATCH/reinclude.json"'
check "re-include rule: nothing under .fx is stageable" '[ -z "$(git -C "$P3" status --porcelain --untracked-files=all -- .fx)" ]'
stop_all

# 4. a tracked session file is refused, by name
P4="$SCRATCH/tracked"; mkdir -p "$P4/.fx/2026-09-12-probe/companion"; git -C "$P4" init -q
echo stale > "$P4/.fx/2026-09-12-probe/companion/.last-token"
git -C "$P4" add -f .fx/2026-09-12-probe/companion/.last-token
start "$P4" tracked
check "tracked session file: refused by name" 'grep -q "error" "$SCRATCH/tracked.json" && grep -q ".last-token" "$SCRATCH/tracked.json"'

# 5. a symbolic link at .fx is refused before anything is created
P5="$SCRATCH/link"; OUTSIDE="$SCRATCH/outside"; mkdir -p "$P5" "$OUTSIDE"; git -C "$P5" init -q
ln -s "$OUTSIDE" "$P5/.fx"
start "$P5" link
check "symbolic link: refused" 'grep -q "symbolic link" "$SCRATCH/link.json"'
check "symbolic link: nothing created outside" '[ -z "$(ls -A "$OUTSIDE")" ]'

if [ "$fails" -ne 0 ]; then echo "companion ignore guarantees: $fails failed"; exit 1; fi
echo "companion ignore guarantees: all passed"
