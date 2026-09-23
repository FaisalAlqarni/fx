#!/usr/bin/env bash
# 01: the seeded fixture build. One real headless fx-implement build of the
# notes plan in tests/fixture-build/repo, scored three ways: the hidden tests
# on the finished branch (caughtAtEnd), the same tests at each original
# implementer's head (byReview), and scripts/build-cost on the transcript.
#
# Run it through tests/fixture-build/run.sh, which sets FX_FIXTURE_OUT,
# FX_FIXTURE_LABEL and FX_FIXTURE_RUN and runs this through the conformance
# runner, so HOME and CLAUDE_CONFIG_DIR are already scratch. It spends quota
# and takes up to 3 hours.
#
# Everything that runs model-written code, or git in the model's repo (hooks,
# config), runs inside the jail. The session's jail also hides the hidden
# tests and fx's own plans and reports, so the build cannot read what scores it.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "1|fixture build|live"; exit 0; }
[ "$HARNESS" = claude-code ] || { echo "$HARNESS: not run: the fixture build scores Claude Code transcripts" >&2; exit 77; }
for v in FX_FIXTURE_OUT FX_FIXTURE_LABEL FX_FIXTURE_RUN; do
  [ -n "${!v:-}" ] || { echo "$HARNESS: $v is not set: run tests/fixture-build/run.sh" >&2; exit 1; }
done
OUT="$FX_FIXTURE_OUT/$FX_FIXTURE_LABEL-$FX_FIXTURE_RUN.json"
[ ! -e "$OUT" ] || { echo "$HARNESS: result file exists: $OUT" >&2; exit 1; }
HIDDEN="$FX/tests/fixture-build/hidden"
PLAN=docs/plans/2026-01-01-notes

. "$FX/tests/conformance/lib/live.sh"
SCORE_JAIL=("${JAIL[@]}")
jailed() { "${SCORE_JAIL[@]}" "$@"; }
jgit() { jailed git -c core.hooksPath=/dev/null "$@"; }

# 2. The seed repository, committed on main. hidden/ is never copied.
live_workdir
cp -a "$FX/tests/fixture-build/repo/." "$WORK/" || fail "could not copy the seed repo"
PARALLEL=false
if [ "${FX_FIXTURE_PARALLEL:-}" = 1 ]; then
  PARALLEL=true
  F="$WORK/.fx.json" node -e '
    const fs = require("fs"), f = process.env.F, c = JSON.parse(fs.readFileSync(f, "utf8"));
    c.isolated_test_execution = true;
    fs.writeFileSync(f, JSON.stringify(c, null, 2) + "\n");' || fail "could not set isolated_test_execution"
fi
git -C "$WORK" add -A && git -C "$WORK" commit -q -m "seed: notes plan" || fail "could not commit the seed"
SEED="$(git -C "$WORK" rev-parse HEAD)"

# 3. The build. The session's jail is the scoring jail plus tmpfs over every
# path under $FX that holds the hidden tests or talks about them.
unset 'JAIL[${#JAIL[@]}-1]'
for d in tests/fixture-build docs/plans .fx .worktrees; do
  [ -d "$FX/$d" ] && JAIL+=(--tmpfs "$FX/$d")
done
JAIL+=(--)
FX_LIVE_TIMEOUT=10800 FX_LIVE_MAX_TURNS=2000 live_run 'The plan in docs/plans/2026-01-01-notes/ is approved and ready. Build it. This is an unattended headless run: nobody will answer questions, so take the recommended option at every choice. Never end your turn while a subagent is outstanding: dispatch subagents as foreground calls (several in one message run at the same time). Finish with the branch reviewed and not merged.'
JAIL=("${SCORE_JAIL[@]}")

# 4. The build: the first linked worktree, or $WORK itself. Listed to a file,
# not straight into awk: awk's own `exit` once it has its answer would close
# the pipe out from under jgit before jgit finishes writing, and the SIGPIPE
# that follows must never be misread as the worktree lookup itself failing.
WTLIST="$(mktemp "$LIVE_SCRATCH/worktrees.XXXXXX")" || fail "mktemp failed"
jgit -C "$WORK" worktree list --porcelain >"$WTLIST" || fail "build: could not list worktrees in $WORK"
BUILD="$(awk '/^worktree /{ if (++n == 2) { sub(/^worktree /, ""); print; exit } }' "$WTLIST")"
rm -f "$WTLIST"
ON_MAIN=false
[ -n "$BUILD" ] || { BUILD="$WORK"; ON_MAIN=true; }
HEAD_SHA="$(jgit -C "$BUILD" rev-parse HEAD)" || fail "build: cannot read HEAD in $BUILD"
[ "$HEAD_SHA" != "$SEED" ] || fail "build: no commits on top of the seed in $BUILD"

# 5. The controller transcript: the only *.jsonl directly in the project dir.
enc="$(printf %s "$WORK" | sed 's/[^A-Za-z0-9]/-/g')"
shopt -s nullglob
CTL=("$CLAUDE_CONFIG_DIR/projects/$enc"/*.jsonl)
shopt -u nullglob
[ "${#CTL[@]}" -eq 1 ] || fail "transcript: expected one *.jsonl in $CLAUDE_CONFIG_DIR/projects/$enc, found ${#CTL[@]}: ${CTL[*]:-none}"

traps() { timeout 600 "${SCORE_JAIL[@]}" node "$HIDDEN/traps.test.js" "$@"; }
# at <rev> <traps>: the named traps' JSON at <rev>, in a temp checkout outside
# $WORK that git worktree remove takes away again. Empty output: <rev> not
# found. It runs in a command substitution, so a caller checks its status.
at() {
  local co out rc
  jgit -C "$WORK" rev-parse -q --verify "$1^{commit}" >/dev/null || return 0
  co="$(mktemp -d "$LIVE_SCRATCH/head.XXXXXX")" || fail "mktemp failed"
  jgit -C "$WORK" worktree add -q --detach "$co" "$1" || fail "could not check out $1"
  out="$(traps "$co" --only "$2")"; rc=$?
  jgit -C "$WORK" worktree remove --force "$co" || fail "could not remove the checkout at $co"
  [ "$rc" -eq 0 ] || fail "traps.test.js exited $rc at $1"
  printf '%s' "$out"
}
declare -A TASK_TRAPS=([01]=path-escape,missing-note-error [03]=readme-example [04]=export-order
                       [05]=search-case [06]=cli-wiring)

# 6. caughtAtEnd.
END="$(traps "$BUILD")" || fail "caughtAtEnd: traps.test.js failed on $BUILD"

# 7. byReview: each task's traps at its original implementer's head.
HEADS="$(node "$HIDDEN/implementer-heads.js" "${CTL[0]}")" || fail "byReview: implementer-heads.js failed on ${CTL[0]}"
AT_HEAD='{}'
for t in "${!TASK_TRAPS[@]}"; do
  sha="$(H="$HEADS" T="$t" node -e 'process.stdout.write(JSON.parse(process.env.H)[process.env.T] || "")')" \
    || fail "byReview: could not read task $t's head from implementer-heads.js output"
  [ -n "$sha" ] || continue
  r="$(at "$sha" "${TASK_TRAPS[$t]}")" || fail "byReview: scoring task $t at $sha failed"
  [ -n "$r" ] || { echo "$HARNESS: byReview: task $t head $sha is not in the repo; scored unknown" >&2; continue; }
  AT_HEAD="$(A="$AT_HEAD" R="$r" node -e 'process.stdout.write(JSON.stringify({ ...JSON.parse(process.env.A), ...JSON.parse(process.env.R) }))')" \
    || fail "byReview: could not merge task $t's score into byReview"
done

# 8. mergeDefects: a task's traps green on its own parallel branch, red at the end.
MERGE=0
while read -r t b; do
  [ -n "${TASK_TRAPS[$t]:-}" ] || continue
  r="$(at "$b" "${TASK_TRAPS[$t]}")" || fail "mergeDefects: scoring task $t at $b failed"
  [ -n "$r" ] || fail "mergeDefects: task $t branch $b is not in the repo"
  n="$(R="$r" E="$END" node -e '
    const r = JSON.parse(process.env.R), e = JSON.parse(process.env.E);
    process.stdout.write(String(Object.keys(r).filter((k) => r[k] && !e[k]).length));')" \
    || fail "mergeDefects: could not count task $t's green-then-red traps at $b"
  MERGE=$((MERGE + n))
done < <(cat "$BUILD/$PLAN/state.md" "$WORK/$PLAN/state.md" 2>/dev/null \
  | grep -oE 'Task [0-9]+: parallel with [0-9]+, branch [^ ,]+' | sort -u \
  | sed -E 's/^Task ([0-9]+): parallel with [0-9]+, branch (.*)$/\1 \2/')

# 9. cost.
COST="$("$FX/scripts/build-cost" "${CTL[0]}" --json)" || fail "cost: scripts/build-cost failed on ${CTL[0]}"

# 10. The result, outside the jail.
mkdir -p "$FX_FIXTURE_OUT" || fail "cannot create $FX_FIXTURE_OUT"
OUT="$OUT" LABEL="$FX_FIXTURE_LABEL" RUN="$FX_FIXTURE_RUN" FXC="$(git -C "$FX" rev-parse --short=7 HEAD)" \
PAR="$PARALLEL" MAIN="$ON_MAIN" E="$END" A="$AT_HEAD" M="$MERGE" C="$COST" node -e '
  const env = process.env, end = JSON.parse(env.E), atHead = JSON.parse(env.A);
  const byReview = {};
  for (const t of Object.keys(end)) {
    if (!(t in atHead)) byReview[t] = "unknown";
    else if (atHead[t]) byReview[t] = end[t] ? "clean" : "missed";
    else byReview[t] = end[t] ? "caught" : "missed";
  }
  const result = { label: env.LABEL, run: Number(env.RUN), fxCommit: env.FXC, parallel: env.PAR === "true",
    builtOnMain: env.MAIN === "true", caughtAtEnd: end, byReview, mergeDefects: Number(env.M), cost: JSON.parse(env.C) };
  require("fs").writeFileSync(env.OUT, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
' || fail "could not write $OUT"
echo "$HARNESS: wrote $OUT" >&2
exit 0
