# Task 03b, silent-failure lens (task mode), 2026-09-23

Controller verified: no FX_FIXTURE_KEEP, FX_CONFORMANCE_LOGS or findings copy in tests/review-bench/run.sh or rows/01-review-bench.sh; fill-template.js:45 has a fixed KEYS list; rows/01-review-bench.sh:44 and :48 run rev-parse unchecked.

1. Important. The reviewer's findings file is deleted with $WORK when the row exits and nothing copies it out, so a "caught: false" cannot be audited (the task's Risks section requires keeping every miss's findings file). Fix: copy the findings file (and the filled prompt) to a kept directory before exit, as the fixture row's FX_FIXTURE_KEEP does.
2. Important. The filled prompt is not checked for leftover placeholders; a template change that adds a placeholder (task 08 edits this template) would send literal [NEW_KEY] text to the reviewer silently. Fix: fail the row when the filled prompt still contains a [A-Z_]+ placeholder token from the template's placeholder list.
3. Minor. rows/01-review-bench.sh:44 and :48: rev-parse unchecked.
