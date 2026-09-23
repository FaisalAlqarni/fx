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

# [GLOBAL_CONSTRAINTS] carries plan.md's Global Constraints plus the fixture
# design's "Storage and search rules" (review finding I3, ledger Ruling P):
# the exact rules six of the nine planted defects violate live in the
# design's body, not the plan, since Ruling K moved them there so the
# coverage audit and branch review (and now this bench) read them.
PLAN="$FX/tests/fixture-build/repo/docs/plans/2026-01-01-notes/plan.md"
DESIGN="$FX/tests/fixture-build/repo/docs/plans/2026-01-01-notes/design.md"
GLOBAL_CONSTRAINTS="$(P="$PLAN" D="$DESIGN" node -e '
  const fs = require("fs");
  const plan = fs.readFileSync(process.env.P, "utf8");
  const design = fs.readFileSync(process.env.D, "utf8");
  const gc = plan.match(/^## Global Constraints\n([\s\S]*?)\n## /m);
  const rules = design.match(/^## Storage and search rules\n([\s\S]*?)\n## /m);
  if (!gc || !rules) process.exit(1);
  process.stdout.write(gc[1].trim() + "\n\nStorage and search rules (design.md):\n" + rules[1].trim());
')" || fail "could not read Global Constraints from $PLAN and $DESIGN"

# 2. base and head. Base carries the seed plus the good reference of every
# fixture module except this case's own task file(s); head replaces just
# that file with the case's version, so the diff a reviewer reads touches
# only the task's own file(s) (review finding I2).
live_workdir
cp -a "$FX/tests/fixture-build/repo/." "$WORK/" || fail "could not copy the seed repo"
OWNED="$(node "$FX/tests/review-bench/build-case.js" "$CASE_DIR" "$FX/tests/review-bench/good" "$WORK")" \
  || fail "build-case.js failed for $CASE"
git -C "$WORK" add -A && git -C "$WORK" commit -q -m "base: everything but ${OWNED//$'\n'/, }" || fail "could not commit the base"
BASE="$(git -C "$WORK" rev-parse HEAD)" || fail "could not read the base commit"

cp -a "$CASE_DIR/files/." "$WORK/" || fail "could not copy the case's own files"
# A neutral subject: review-package prints the log into the diff, so a case
# name here would tell the reviewer what to look for (final review,
# adversarial 1).
git -C "$WORK" add -A && git -C "$WORK" commit -q -m "task $TASK_NUM" || fail "could not commit the case"
HEAD_SHA="$(git -C "$WORK" rev-parse HEAD)" || fail "could not read the head commit"

# 3. the review package, an empty ledger, and a one-line report: exactly what
# a real task review reads, nothing that hints at the planted defect.
DIFF_FILE="$WORK/.review-bench-diff.md"
( cd "$WORK" && "$FX/skills/fx-implement/scripts/review-package" review-bench "$BASE" "$HEAD_SHA" "$DIFF_FILE" >/dev/null ) \
  || fail "review-package failed"

LEDGER_FILE="$WORK/.review-bench-ledger.md"
printf '# fx ledger: plan: docs/plans/2026-01-01-notes/plan.md\n\nNo entries yet.\n' > "$LEDGER_FILE" \
  || fail "could not write $LEDGER_FILE"

# [REPORT_FILE] states the truth: the case's own task file (added alongside
# its implementation at head, review Ruling S) is run for real, and its real
# `node --test` summary line goes in the report, whichever way it comes out.
# The planted defects are not what these given tests check, so every case
# passes except readme-binary, a documented pre-existing gap (task 03's own
# test needs a "## Usage" heading the fixture's reference README never has);
# a fabricated pass line would hint that nothing is wrong, which is itself a
# hint by omission. Neither outcome names the planted defect.
TEST_PATH="$(printf '%s\n' "$OWNED" | grep '^test/' | head -1)"
[ -n "$TEST_PATH" ] || fail "no test file recorded as owned for case $CASE"
TEST_OUTPUT="$(cd "$WORK" && node --test "$TEST_PATH" 2>&1)"
TEST_SUMMARY="$(printf '%s\n' "$TEST_OUTPUT" | grep -E '^# (pass|fail) ' | tr '\n' ' ')"
[ -n "$TEST_SUMMARY" ] || fail "could not read a test summary line from node --test $TEST_PATH"

REPORT_FILE="$WORK/.review-bench-report.md"
printf 'Task %s: done (%s). `node --test %s` run: %s\n' "$TASK_NUM" "$HEAD_SHA" "$TEST_PATH" "$TEST_SUMMARY" \
  > "$REPORT_FILE" || fail "could not write $REPORT_FILE"

FINDINGS_FILE="$WORK/.review-bench-findings.md"

# 4. fill the live template's fenced prompt from the working tree, so a later
# change to it (task 08's, for instance) is what this bench measures.
PROMPT="$(TASK_FILE="$TASK_FILE" GLOBAL_CONSTRAINTS="$GLOBAL_CONSTRAINTS" LEDGER_FILE="$LEDGER_FILE" \
  REPORT_FILE="$REPORT_FILE" BASE_SHA="$BASE" HEAD_SHA="$HEAD_SHA" DIFF_FILE="$DIFF_FILE" FINDINGS_FILE="$FINDINGS_FILE" \
  node "$FX/tests/review-bench/fill-template.js" "$FX/skills/fx-implement/task-reviewer-prompt.md")" \
  || fail "could not fill the reviewer template"
PROMPT_FILE="$WORK/.review-bench-prompt.md"
printf '%s' "$PROMPT" > "$PROMPT_FILE" || fail "could not write $PROMPT_FILE"

# 5. one headless reviewer session, at the tier fx dispatches reviewers on.
# The session cannot read the answer keys: the fixture's hidden tests, the
# good reference, the cases and their match regexes, fx's own history, the
# task file and run history under docs/plans, or this bench's own README.
jail_hide tests/fixture-build/hidden tests/review-bench/good tests/review-bench/cases docs/plans tests/review-bench/README.md .git
FX_LIVE_MODEL=sonnet live_run "$PROMPT"

# FX_BENCH_KEEP, if set, keeps this case's rep's findings file and filled
# prompt before $WORK is removed, so a miss can be audited (task Risks: "keep
# every miss's findings file"), same pattern as the fixture row's
# FX_FIXTURE_KEEP. Copied before the findings-file check below, so even a run
# where the reviewer never wrote one still leaves the prompt to audit.
if [ -n "${FX_BENCH_KEEP:-}" ]; then
  KEEP_DIR="$FX_BENCH_KEEP/$CASE-$REP"
  mkdir -p "$KEEP_DIR" || fail "keep: cannot create $KEEP_DIR"
  # Both files sit in $WORK, which the session can write: copied only as
  # regular files, never through a symlink it planted.
  live_regular "$PROMPT_FILE" || fail "keep: $PROMPT_FILE is not a regular file"
  cp "$PROMPT_FILE" "$KEEP_DIR/prompt.md" || fail "keep: could not copy the filled prompt to $KEEP_DIR"
  if live_regular "$FINDINGS_FILE"; then
    cp "$FINDINGS_FILE" "$KEEP_DIR/findings.md" || fail "keep: could not copy the findings file to $KEEP_DIR"
  fi
fi

live_regular "$FINDINGS_FILE" || fail "the reviewer never wrote $FINDINGS_FILE as a regular file"

# 6. score it.
SCORE="$(node "$FX/tests/review-bench/score.js" "$FINDINGS_FILE" "$MATCH")" || fail "score.js exited $? on $FINDINGS_FILE"
mkdir -p "$FX_REVIEW_BENCH_OUT" || fail "cannot create $FX_REVIEW_BENCH_OUT"
printf '%s\n' "$SCORE" > "$OUT" || fail "could not write $OUT"
echo "$HARNESS: $CASE rep $REP: $SCORE" >&2
exit 0
