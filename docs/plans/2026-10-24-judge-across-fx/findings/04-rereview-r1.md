# Task 04, fix round 1: controller re-review

**Range:** ffd11da..5e2d79b. 12 production lines in src/plugins/fx-opencode-v2.ts. The one removed test line changes an existing case's input (the rejected error becomes a TypeError so the new class-name assertion has something to name); no existing assertion was edited or deleted, so a controller re-review applies.

### Finding verdicts

- **Lens 1 (in part): ADDRESSED.** At plugin construction, when judge.json exists and either awaitsBefore() is false or guardShell did not load, the plugin prints one stderr line starting `[fx] judge off on opencode 2.x:` and writes one decision-log line with source `judge-off` and the reason. It runs once per construction, outside the per-call hooks. With no judge.json nothing is written. Tests cover the missing export, the no-judge case and the not-awaited case, each asserting exactly one line over two calls.
- **Lens 2 (in part): ADDRESSED.** shellGuardOff now writes the entry through writeGuardLine with an `error` field holding the exception's class name (or the value's type); `text` stays empty. The test asserts `error` is `TypeError` and `text` is empty.

### New breakage

None found. writeGuardLine keeps the old entry fields and adds `error`; the catch that keeps stderr as the trace is unchanged (lens 3, ruled not a gap).

### Tests evidence

The implementer's RED on the missing failure class and GREEN for the 2.x shell-guard test are in the report. Its test-scope run stopped on task 05's uncommitted test files; the controller re-runs check-all after task 05 commits.
