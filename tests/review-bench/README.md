# Review bench

A direct measure of whether fx's own task reviewer catches a known defect.
Three smoke builds of the fixture build showed implementers never got a
fixture trap wrong, so the fixture build cannot show a review loss (ledger
Rulings K and L, `docs/plans/2026-09-23-lean-build/state.md`). The bench skips
the build: it hands fx's task reviewer a diff that already carries one planted
defect (or none, for the control) and scores whether the review flags it.

## The one command

```sh
tests/review-bench/run.sh <reps> <label>
```

Example: `tests/review-bench/run.sh 3 baseline`. This spends quota: every rep
of every case is a real headless Claude Code session reviewing one diff.
Results land in `docs/plans/2026-09-23-lean-build/runs/bench-<label>.json`;
`run.sh` refuses to overwrite an existing result file.

## What it never touches

Every session runs inside the conformance jail with `HOME` and
`CLAUDE_CONFIG_DIR` pointed at a scratch directory. It never reads or writes
the real `~/.claude`.

## Layout

- `cases/<case>/`: one planted-defect diff each. `task` names the fixture task
  number the defect belongs to; `files/` holds the case's implementation of
  the fixture's five modules (the good reference from
  `tests/fixture-build/hidden/traps.self-test.js`, with exactly one file
  swapped for its defect variant, so every trap `tests/fixture-build/hidden/traps.test.js`
  computes stays meaningful); `match` is the extended regex, case-insensitive,
  that a finding naming the defect contains. `control`'s `files/` is the good
  reference untouched and its `match` is the literal string `NONE`.
- `score.js`: scores one reviewer findings file against a case's `match`.
- `fill-template.js`: extracts and fills the `prompt: |` body of
  `skills/fx-implement/task-reviewer-prompt.md`, read fresh from the working
  tree on every run, so a later change to that template is what gets measured.
- `rows/01-review-bench.sh`: the conformance row. One case, one rep, per
  invocation: builds the case's diff on top of the fixture seed repo, packages
  it with `skills/fx-implement/scripts/review-package`, runs one headless
  reviewer session, and scores the findings file it writes.
- `run.sh`: runs the row once per case per rep through the conformance runner,
  and aggregates the per-case counts into one result file.

## What the reviewer sees

Exactly what a real task review reads: the fixture task file, the plan's
Global Constraints, an empty ledger, a one-line "done" report, and the diff.
Never add a hint about the planted defect anywhere in a case, the row, or the
report.
