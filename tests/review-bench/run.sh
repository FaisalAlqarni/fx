#!/usr/bin/env bash
# Runs the review bench: every case under tests/review-bench/cases/, <reps>
# times each, through the conformance runner, and writes one aggregate result
# to docs/plans/2026-09-23-lean-build/runs/bench-<label>.json.
#
#   tests/review-bench/run.sh <reps> <label>
#   FX_BENCH_KEEP=<dir> tests/review-bench/run.sh <reps> <label>
#
# Every rep of every case is a real headless reviewer session: it spends
# quota. Nothing here calls claude directly; tests/review-bench/rows/01-review-bench.sh
# does, through tests/conformance/run.sh, which points HOME and
# CLAUDE_CONFIG_DIR into a scratch directory. FX_BENCH_KEEP, if set, keeps
# every rep's filled prompt and reviewer findings file under
# <dir>/<case>-<rep>/, so a miss can be audited.
set -uo pipefail
cd "$(dirname "$0")/../.."
FX="$PWD"

usage() { echo "usage: tests/review-bench/run.sh <reps> <label>: reps a positive integer, label matching ^[a-z0-9-]+\$" >&2; exit 2; }
[ "$#" -eq 2 ] || usage
REPS="$1" LABEL="$2"
[[ "$REPS" =~ ^[1-9][0-9]*$ ]] || usage
[[ "$LABEL" =~ ^[a-z0-9-]+$ ]] || usage

OUT_FILE="$FX/docs/plans/2026-09-23-lean-build/runs/bench-$LABEL.json"
[ ! -e "$OUT_FILE" ] || { echo "refusing to overwrite an existing result file: $OUT_FILE" >&2; exit 2; }

shopt -s nullglob
CASE_DIRS=("$FX/tests/review-bench/cases"/*/)
shopt -u nullglob
[ "${#CASE_DIRS[@]}" -gt 0 ] || { echo "no cases found under tests/review-bench/cases" >&2; exit 2; }

RESULTS="$(mktemp -d)" || { echo "mktemp -d failed" >&2; exit 2; }
trap 'rm -rf -- "$RESULTS"' EXIT

NAMES=""
for casedir in "${CASE_DIRS[@]}"; do
  case_name="$(basename "$casedir")"
  NAMES="$NAMES$case_name"$'\n'
  for rep in $(seq 1 "$REPS"); do
    FX_CONFORMANCE_ROWS="$FX/tests/review-bench/rows" FX_REVIEW_BENCH_OUT="$RESULTS" \
      FX_REVIEW_BENCH_CASE="$case_name" FX_REVIEW_BENCH_REP="$rep" FX_BENCH_KEEP="${FX_BENCH_KEEP:-}" \
      bash tests/conformance/run.sh claude-code \
      || { echo "$case_name rep $rep: the review-bench row failed; stopping" >&2; exit 1; }
    # A GAP (quota) passes the runner but writes no result.
    [ -f "$RESULTS/$case_name-$rep.json" ] \
      || { echo "$case_name rep $rep: no result file, the row did not run (see its reason above); stopping" >&2; exit 1; }
  done
done

mkdir -p "$(dirname "$OUT_FILE")" || { echo "cannot create $(dirname "$OUT_FILE")" >&2; exit 2; }
DIR="$RESULTS" NAMES="$NAMES" OUT="$OUT_FILE" LABEL="$LABEL" REPS="$REPS" \
FXC="$(git -C "$FX" rev-parse --short=7 HEAD)" node -e '
  const fs = require("fs"), path = require("path");
  const env = process.env;
  const dir = env.DIR, names = env.NAMES.trim().split("\n").filter(Boolean), reps = Number(env.REPS);
  const cases = {};
  for (const name of names) {
    let caught = 0, falsePositive = 0;
    for (let r = 1; r <= reps; r++) {
      const s = JSON.parse(fs.readFileSync(path.join(dir, `${name}-${r}.json`), "utf8"));
      if (s.caught) caught++;
      if (s.falsePositive) falsePositive++;
    }
    cases[name] = { caught, of: reps, falsePositive };
    console.log(`${name}: caught ${caught}/${reps}, false positive ${falsePositive}/${reps}`);
  }
  const result = { label: env.LABEL, fxCommit: env.FXC, reps, cases };
  fs.writeFileSync(env.OUT, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
' || { echo "could not write $OUT_FILE" >&2; exit 1; }
echo "wrote $OUT_FILE" >&2
