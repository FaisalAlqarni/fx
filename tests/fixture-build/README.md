# Fixture build

A repeatable, scored fx build. A tiny seed repository under `repo/`, with an
approved six task fx plan that carries six planted traps, one per task's
prose. A real headless `fx-implement` build of that plan runs inside the
conformance jail, then gets scored three ways: caught at the end (the hidden
tests on the finished branch), by review (the same hidden tests run at each
task's original implementer commit), and by cost and time (`scripts/build-cost`
on the transcript).

## The one command

```sh
tests/fixture-build/run.sh <runs> <label>
```

Example: `tests/fixture-build/run.sh 3 baseline`. Set `FX_FIXTURE_PARALLEL=1`
to build with `isolated_test_execution` turned on, which lets `fx-implement`
run tasks 04 and 05 in parallel. Set `FX_FIXTURE_KEEP=<dir>` to keep each
run's controller and subagent transcripts under
`<dir>/<label>-<n>/` before the scratch home they ran in is removed.

This spends quota: it runs a real headless Claude Code session per run. A run
takes up to 3 hours. Results land in
`docs/plans/2026-09-23-lean-build/runs/<label>-<n>.json`, one file per run;
`run.sh` refuses to overwrite an existing result file.

## What it never touches

The build runs inside the conformance jail with `HOME` and
`CLAUDE_CONFIG_DIR` pointed at a scratch directory. It never reads or writes
the real `~/.claude`. `hidden/` (the scoring tests) is never copied into the
build; the build cannot see what scores it.

## Layout

- `repo/`: the seed repository and its fx plan, copied into a scratch worktree
  for every run.
- `hidden/`: the scoring tests. `traps.test.js` scores a finished build;
  `implementer-heads.js` finds each task's original implementer commit from
  the controller transcript. Both have a unit test, run by `scripts/check-all`.
- `rows/01-fixture-build.sh`: the conformance row that runs one build and
  writes its scored result.
- `run.sh`: runs the row `<runs>` times through the conformance runner.
