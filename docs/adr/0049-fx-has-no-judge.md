# fx has no judge

Status: accepted, 2026-10-24. Supersedes 0047 and 0048.

The decisions it keeps are recorded in ADR 0050, 0051 and 0052.

## Context

ADR 0047 added an optional judge, a small model (TypeSafe Jev, over `/v1/systemone`) that answered typed questions for the shell guard and the Stop check. ADR 0048 let it act in more places, each behind a measured bar: a lane hint on each prompt, subagent sizing, judged repository edit rules and review helpers for the lenses. Two benchmarks then measured what the judge adds over the plain-code hooks:

- `docs/plans/2026-10-22-fx-judge-hooks/benchmark.md`, "Re-run after task 14": with no judge the shell guard refuses 100% (78 of 78) of the catastrophic set and refuses, asks or warns on 0 of 79 ordinary commands. With the owner's local judge the catastrophic number is the same 100%, and on the ordinary commands it adds 11 asks (warnings on Codex) and 1 refusal on each harness.
- `docs/plans/2026-10-24-judge-across-fx/benchmark.md`: the lane-triggering bench passes 51 of 51 before and after the lane hint. The review bench catches 16 of 24 planted defects before and 18 of 24 after, with 1 false positive each, which the benchmark itself calls inside the noise. Neither bench exercised the judged edit rules (the bench repositories have no `.fx.json` `rules`); every refused bad edit in the offline corpus (11 of 11) came from the built-in code rules, which need no judge.

The judge added no measured gain in lane choice, review or the shell guard. Its one measured gain, 18 of 52 general dispatches moved from sonnet to haiku, also lowered 2 of 5 security dispatches. It cost code, configuration, a network path, a per-machine setup step and latency.

After the removal the guard was measured again: the section "Re-run after the judge removal" of `docs/plans/2026-10-24-judge-across-fx/benchmark.md` compares the guard decisions of this code with the checkout from before the judge over 398 calls on Claude Code and Codex, with 0 differences, 78 of 78 catastrophic commands refused and 0 of 79 ordinary ones.

## Decision

**fx has no judge.** Every judge module, its tests, its calibration tooling, the `judge-cli` commands, the `/fx-setup` judge and rule-picker steps, the lane hint, subagent sizing, judged repository edit rules and the `judge-review` helpers are removed. fx no longer reads `judge.json` and makes no network call from any hook.

What stays, unchanged in what it decides:

- The git guard, fail closed.
- The shell guard: hard rules that nothing overrides, a read-only allowlist, and the repository's own `.fx.json` commands, which run silently and are logged with source `repo-command`. Any other command is allowed and logged in the decision log with source `grey`. The `# fx-ok` stamp and the loop guard are gone; both acted only on refusals the judge made.
- The session journal, the Stop check (one block per turn on unverified edits, with no lift) and the loop-tracker nudges.
- The three built-in edit rules, `no-dashes`, `no-secrets` and `no-conflict-markers`, and the `.fx.json` `hooks.edit_rules` switch. `hooks.stop_check` and `hooks.loop_nudge` stay too.
- The `.fx.json` change notice, which now fires when `hooks` change: at session start and Stop on Claude Code and Codex, at the next user message on opencode 1.x, and not on opencode 2.x.
- The decision log, for hard-rule refusals, grey allows, nudges, Stop blocks, edit-rule refusals and errors. A failure that allows an edit is logged with source `error`.
- Model routing (ADR 0031, `route()`), without sizing.
- The refusal of any shell command that names fx's state or config directories, and of any file edit inside them, fail closed on every harness. The shell guard is hygiene, not a boundary. The decision log stays local, mode 0600 on POSIX, rotated at 5 MB.

## Consequences

- A grey shell command runs and leaves one decision-log line. Nothing asks the user about it.
- A `rules` entry in `.fx.json` is ignored silently, and so are the `shell_judge`, `lane_hint` and `dispatch_sizing` switches.
- An existing `judge.json` is left on disk and never read. The shell guard still refuses a command that names fx's config directory.
- The `.fx.json` notice no longer fires for a change to `rules`.
- fx is version 0.5.0.
- Bringing a judge back means a new ADR and a benchmark that shows a gain over these numbers.
