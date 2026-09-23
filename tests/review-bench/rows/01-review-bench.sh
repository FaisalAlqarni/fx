#!/usr/bin/env bash
# 01: the review bench. Hands fx's own task reviewer a diff that already
# carries one planted defect (or none, for the control) and scores whether the
# review flags it, without ever running a build. One case, one rep, per
# invocation: tests/review-bench/run.sh sets FX_REVIEW_BENCH_CASE and loops
# this row through the conformance runner once per case per rep.
#
# The reviewer sees only what fx's own task-reviewer-prompt.md gives a real
# task review: the task file, the plan's Global Constraints, the ledger, a
# one-line report and the diff. Never add a hint about the planted defect
# anywhere in this row.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "1|review bench|live"; exit 0; }
[ "$HARNESS" = claude-code ] || { echo "$HARNESS: not run: the review bench scores Claude Code's task reviewer" >&2; exit 77; }
for v in FX_REVIEW_BENCH_CASE FX_REVIEW_BENCH_OUT; do
  [ -n "${!v:-}" ] || { echo "$HARNESS: $v is not set: run tests/review-bench/run.sh" >&2; exit 1; }
done
CASE="$FX_REVIEW_BENCH_CASE"
CASE_DIR="$FX/tests/review-bench/cases/$CASE"
[ -d "$CASE_DIR" ] || { echo "$HARNESS: no such case: $CASE" >&2; exit 1; }
REP="${FX_REVIEW_BENCH_REP:-1}"
OUT="$FX_REVIEW_BENCH_OUT/$CASE-$REP.json"
[ ! -e "$OUT" ] || { echo "$HARNESS: result file exists: $OUT" >&2; exit 1; }

. "$FX/tests/conformance/lib/live.sh"

TASK_NUM="$(cat "$CASE_DIR/task")"
TASK_FILE="$(ls "$FX/tests/fixture-build/repo/docs/plans/2026-01-01-notes/tasks/$TASK_NUM"-*.md 2>/dev/null | head -1)"
[ -n "$TASK_FILE" ] || fail "no fixture task file for task $TASK_NUM"
MATCH="$(cat "$CASE_DIR/match")"

PLAN="$FX/tests/fixture-build/repo/docs/plans/2026-01-01-notes/plan.md"
GLOBAL_CONSTRAINTS="$(P="$PLAN" node -e '
  const t = require("fs").readFileSync(process.env.P, "utf8");
  const m = t.match(/^## Global Constraints\n([\s\S]*?)\n## /m);
  if (!m) process.exit(1);
  process.stdout.write(m[1].trim());
')" || fail "could not read Global Constraints from $PLAN"

# 2. base and head: the seed repo, then the case's implementation on top.
live_workdir
cp -a "$FX/tests/fixture-build/repo/." "$WORK/" || fail "could not copy the seed repo"
git -C "$WORK" add -A && git -C "$WORK" commit -q -m "seed: notes plan" || fail "could not commit the seed"
BASE="$(git -C "$WORK" rev-parse HEAD)"

cp -a "$CASE_DIR/files/." "$WORK/" || fail "could not copy the case's files"
git -C "$WORK" add -A && git -C "$WORK" commit -q -m "case: $CASE" || fail "could not commit the case"
HEAD_SHA="$(git -C "$WORK" rev-parse HEAD)"

# 3. the review package, an empty ledger, and a one-line report: exactly what
# a real task review reads, nothing that hints at the planted defect.
DIFF_FILE="$WORK/.review-bench-diff.md"
( cd "$WORK" && "$FX/skills/fx-implement/scripts/review-package" review-bench "$BASE" "$HEAD_SHA" "$DIFF_FILE" >/dev/null ) \
  || fail "review-package failed"

LEDGER_FILE="$WORK/.review-bench-ledger.md"
printf '# fx ledger: plan: docs/plans/2026-01-01-notes/plan.md\n\nNo entries yet.\n' > "$LEDGER_FILE" \
  || fail "could not write $LEDGER_FILE"

REPORT_FILE="$WORK/.review-bench-report.md"
printf 'Task %s: done (%s).\n' "$TASK_NUM" "$HEAD_SHA" > "$REPORT_FILE" || fail "could not write $REPORT_FILE"

FINDINGS_FILE="$WORK/.review-bench-findings.md"

# 4. fill the live template's fenced prompt from the working tree, so a later
# change to it (task 08's, for instance) is what this bench measures.
PROMPT="$(TASK_FILE="$TASK_FILE" GLOBAL_CONSTRAINTS="$GLOBAL_CONSTRAINTS" LEDGER_FILE="$LEDGER_FILE" \
  REPORT_FILE="$REPORT_FILE" BASE_SHA="$BASE" HEAD_SHA="$HEAD_SHA" DIFF_FILE="$DIFF_FILE" FINDINGS_FILE="$FINDINGS_FILE" \
  node "$FX/tests/review-bench/fill-template.js" "$FX/skills/fx-implement/task-reviewer-prompt.md")" \
  || fail "could not fill the reviewer template"

# 5. one headless reviewer session, at the tier fx dispatches reviewers on.
FX_LIVE_MODEL=sonnet live_run "$PROMPT"

[ -f "$FINDINGS_FILE" ] || fail "the reviewer never wrote $FINDINGS_FILE"

# 6. score it.
SCORE="$(node "$FX/tests/review-bench/score.js" "$FINDINGS_FILE" "$MATCH")" || fail "score.js exited $? on $FINDINGS_FILE"
mkdir -p "$FX_REVIEW_BENCH_OUT" || fail "cannot create $FX_REVIEW_BENCH_OUT"
printf '%s\n' "$SCORE" > "$OUT" || fail "could not write $OUT"
echo "$HARNESS: $CASE rep $REP: $SCORE" >&2
exit 0
