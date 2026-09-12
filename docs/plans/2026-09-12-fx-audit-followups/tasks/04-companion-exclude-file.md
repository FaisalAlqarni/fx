# 04: The companion stops writing to the exclude file

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** Core

**What to build:** starting the visual companion no longer changes the
repository's local exclude file. Its session files stay ignored because
`.fx/.gitignore` holds `*`, which already covers a project with no `.git` yet
and a project rule that re-includes `.fx/`. The companion still refuses to start
when a session file would be committable, naming the cause.

**Files:**
- Modify: `skills/fx-brainstorm/scripts/start-server.sh`
- Modify: `skills/fx-brainstorm/visual-companion.md`
- Test: `tests/companion/ignore-guarantees.sh`

**Interfaces:**
- Consumes: `start-server.sh --project-dir <path> --slug <slug> --background`, which prints one JSON object on standard output with `state_dir` among its keys, or `{"error": "..."}` and exit 1 on a refusal.
- Consumes: `stop-server.sh <session_dir>`, where `<session_dir>` is the parent of `state_dir`.
- Produces: the start order: refuse a symbolic link on the state path; write `.fx/.gitignore` with `*`; in a git repository, confirm every session file is ignored and refuse, naming the cause, when one is not.

**Seam:** the companion started and stopped in scratch repositories (design seam 6).

**Risks:**
- Removing the ignore guarantee along with the redundant step. The final check that every session file is ignored stays, and the test proves a tracked session file is still refused.
- Leaving a server running. The test stops every server it starts, on every exit path.
- The `append_line` helper is still used to write `.fx/.gitignore`; keep it.

**Idempotency:** the script change is a deletion plus comment edits. The test builds and removes its own scratch directory and stops its servers on exit.

**Testing:** a shell probe that starts the real companion in scratch repositories; it needs `git` and `node`, starts servers, and so is run by hand and by task 09, not by `check-all`.

## Acceptance criteria

- [ ] In a git repository, a companion start leaves the local exclude file byte-identical, and every session file is ignored.
- [ ] In a project with no `.git`, after a start and a stop, `git init && git add -A` stages nothing under `.fx/`.
- [ ] With a project `.gitignore` that re-includes `.fx/`, a start succeeds and stages nothing under `.fx/`.
- [ ] A tracked session file is still refused, with a message naming it.
- [ ] A symbolic link at `.fx` is still refused before anything is created.
- [ ] `start-server.sh` contains no `info/exclude` and no `EXCLUDE_FILE`.
- [ ] `visual-companion.md` no longer says the script adds `.fx/` to the local exclude file.
- [ ] `tests/companion/ignore-guarantees.sh` passes and leaves no server running.

## Steps

- [ ] **1. Write the failing test**

Create `tests/companion/ignore-guarantees.sh`:

```bash
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
```

- [ ] **2. Run it: verify RED**

Run: `bash tests/companion/ignore-guarantees.sh`
Expected: FAIL on `git repository: exclude file unchanged`, because today the script appends `.fx/` to the exclude file before `.fx/.gitignore` exists. Every other check should pass; any other failure is a finding to report before changing the script.

- [ ] **3. Implement the minimum that passes**

In `start-server.sh`, delete the block that locates the local exclude file and appends `.fx/` to it, with its refusals and comment. Keep, in this order: the symbolic-link refusal, the `mkdir` of the state directory, writing `.fx/.gitignore`, and the final `session_files_not_ignored` refusal. Update the comments that describe the removed step. In `visual-companion.md`, remove the sentence saying the script adds `.fx/` to the local exclude file, and say instead that `.fx/.gitignore` keeps the session files ignored. `fx-tdd` drives it from the test.

- [ ] **4. Run it: verify GREEN**

Run: `bash tests/companion/ignore-guarantees.sh`
Expected: `companion ignore guarantees: all passed`, and `pgrep -af server.cjs` shows no server started by the test.

- [ ] **5. Check what is gone**

Run: `grep -c 'info/exclude\|EXCLUDE_FILE' skills/fx-brainstorm/scripts/start-server.sh; grep -c 'exclude file' skills/fx-brainstorm/visual-companion.md`
Expected: `0` and `0`.

- [ ] **6. Run the gates**

Run: `bash -n skills/fx-brainstorm/scripts/start-server.sh && python3 scripts/check-prose skills/fx-brainstorm/visual-companion.md && scripts/check-all`
Expected: all pass, `ALL GREEN`.

- [ ] **7. Commit**

```
git add skills/fx-brainstorm/scripts/start-server.sh skills/fx-brainstorm/visual-companion.md tests/companion/ignore-guarantees.sh
git commit -m "fix(companion): stop writing to the local exclude file now that .fx/.gitignore covers it"
```

No attribution trailers. Then continue to the next task: never stop and wait.
