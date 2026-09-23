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

Set `FX_BENCH_KEEP=<dir>` to keep every rep's filled prompt and reviewer
findings file under `<dir>/<case>-<rep>/` (`prompt.md`, `findings.md`) before
the scratch home they ran in is removed, so a miss can be audited by reading
what the reviewer actually saw and wrote. A copy failure fails that rep's row,
naming the destination.

## What it never touches

Every session runs inside the conformance jail with `HOME` and
`CLAUDE_CONFIG_DIR` pointed at a scratch directory. It never reads or writes
the real `~/.claude`.

## Layout

- `good/`: the shared good reference tree, one copy of the fixture's five
  modules (`lib/store.js`, `lib/export.js`, `lib/search.js`, `cli.js`,
  `README.md`), taken verbatim from `tests/fixture-build/hidden/traps.self-test.js`'s
  `good` object and written once, not per case.
- `cases/<case>/`: one planted-defect diff each. `task` names the fixture task
  number the defect belongs to; `files/` holds only that task's own file(s)
  (a single module, for every case in this bench), at the case's defect
  variant (`control`'s is the good version, unmodified); `match` is the
  extended regex, case-insensitive, that a finding naming the defect
  contains, or the literal string `NONE` for `control`.
- `build-case.js`: given a case directory and `good/`, copies every fixture
  module the case's own file(s) don't cover into a destination tree and
  removes the rest, so the row's base commit is the good app minus exactly
  the task's own file(s), and its head commit (the case's `files/` layered on
  top) touches only that file: a real per-task review's diff shape (review
  finding I2). `build-case.test.js` proves this for every case, and that
  `traps.test.js` still scores the intended trap false and every other trap
  true at head.
- `score.js`: scores one reviewer findings file against a case's `match`.
- `fill-template.js`: extracts and fills the `prompt: |` body of
  `skills/fx-implement/task-reviewer-prompt.md`, read fresh from the working
  tree on every run, so a later change to that template is what gets
  measured. Fails, naming the token, if any `[A-Z_]+` placeholder the
  template itself names is still present after filling (a template change
  that adds a placeholder this row never learned to fill).
- `rows/01-review-bench.sh`: the conformance row. One case, one rep, per
  invocation: builds the case's diff (`build-case.js` plus the case's own
  `files/`), packages it with `skills/fx-implement/scripts/review-package`,
  runs one headless reviewer session, and scores the findings file it writes.
- `run.sh`: runs the row once per case per rep through the conformance runner,
  and aggregates the per-case counts into one result file.

## What the reviewer sees

Exactly what a real task review reads: the fixture task file, the plan's
Global Constraints plus the fixture design's "Storage and search rules"
(both verbatim: the exact rules most of the bench's defects violate live in
the design's body, not the plan), an empty ledger, a one-line "done" report,
and a diff that touches only the task's own file(s). Never add a hint about
the planted defect anywhere in a case, the row, or the report.
