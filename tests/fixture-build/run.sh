#!/usr/bin/env bash
# Runs the seeded fixture build <runs> times and writes one result per run to
# docs/plans/2026-09-23-lean-build/runs/<label>-<n>.json. Each run is a real
# headless build: it spends quota and takes up to 3 hours.
#
#   tests/fixture-build/run.sh <runs> <label>
#   FX_FIXTURE_PARALLEL=1 tests/fixture-build/run.sh <runs> <label>
#   FX_FIXTURE_KEEP=<dir> tests/fixture-build/run.sh <runs> <label>
#
# Every run goes through the conformance runner, which points HOME and
# CLAUDE_CONFIG_DIR into a scratch directory. Nothing here calls claude.
set -uo pipefail
cd "$(dirname "$0")/../.."
FX="$PWD"

usage() { echo "usage: tests/fixture-build/run.sh <runs> <label>: runs a positive integer, label matching ^[a-z0-9-]+\$" >&2; exit 2; }
[ "$#" -eq 2 ] || usage
RUNS="$1" LABEL="$2"
[[ "$RUNS" =~ ^[1-9][0-9]*$ ]] || usage
[[ "$LABEL" =~ ^[a-z0-9-]+$ ]] || usage

OUT="$FX/docs/plans/2026-09-23-lean-build/runs"
for i in $(seq 1 "$RUNS"); do
  [ ! -e "$OUT/$LABEL-$i.json" ] || { echo "refusing to overwrite an existing result file: $OUT/$LABEL-$i.json" >&2; exit 2; }
done

for i in $(seq 1 "$RUNS"); do
  FX_CONFORMANCE_ROWS="$FX/tests/fixture-build/rows" FX_FIXTURE_OUT="$OUT" FX_FIXTURE_LABEL="$LABEL" \
    FX_FIXTURE_RUN="$i" FX_FIXTURE_PARALLEL="${FX_FIXTURE_PARALLEL:-}" FX_FIXTURE_KEEP="${FX_FIXTURE_KEEP:-}" \
    bash tests/conformance/run.sh claude-code \
    || { echo "run $i: the fixture row failed; stopping" >&2; exit 1; }
  # A GAP (quota) passes the runner but writes no result.
  [ -f "$OUT/$LABEL-$i.json" ] || { echo "run $i: no result file, the row did not run (see its reason above); stopping" >&2; exit 1; }
  F="$OUT/$LABEL-$i.json" node -e '
    const r = JSON.parse(require("fs").readFileSync(process.env.F, "utf8"));
    const end = Object.values(r.caughtAtEnd).filter(Boolean).length;
    const review = Object.values(r.byReview);
    const count = (v) => review.filter((x) => x === v).length;
    const tokens = r.cost.controller.tokens + Object.values(r.cost.subagents).reduce((s, a) => s + a.tokens, 0);
    console.log(`run ${r.run}: end ${end}/6, review caught ${count("caught")} missed ${count("missed")}, ` +
      `merge defects ${r.mergeDefects}, parallel ${r.parallel ? 1 : 0}, controller calls ${r.cost.controller.calls}, ` +
      `tokens ${tokens}, wall ${Math.round(r.cost.wallClockMs / 60000)}m`);'
done
