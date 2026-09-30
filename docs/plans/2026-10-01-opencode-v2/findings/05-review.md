### Spec Compliance

- ❌ Issues found: one acceptance-line breach, see Important 1 (policy blocks a command the guard allows). All other criteria met.
- ⚠️ Cannot verify from diff: (a) evaluate of a `shell` action whose `source` is not a tool call (a user-typed shell command, if v2 has one) is denied by the lookup miss (plugins/fx-opencode-v2.js:130-135); confirm v2 never evaluates `shell` without a tool source. (b) `edit` is the only action the lane check reads (plugins/fx-opencode-v2.js:148); confirm `write` and `patch` tools evaluate as `edit` (task 01 probe). (c) Layer 1 taken per probe Q3 (report says proven); not re-probed.

Ruling check: ledger line 66 (`echo "git reset --hard" | sh` passes the guard) is honoured: the case is dropped from the test with a comment naming task 09 (tests/gates/opencode-v2-plugin.test.js, guard loop comment). Acceptable, the task said to name it, not delete quietly.

### Strengths

- Guard reads the recorded command, never `ev.resources` (plugins/fx-opencode-v2.js:128-130). Fail closed on all three paths: load error (`guardError` thrown inside try, :127), lookup miss (:130-135), inspect throw (catch :141-144). The shell branch returns early and has no async work, so no rejection possible.
- Lane check resolves against `ctx.location.directory` (:151); relative-resource case is tested with `process.chdir` elsewhere. Crash case left alone and tested (resource 42).
- Policy file: tight pattern families, no `?`, no bare glued `*`; test copies v2 Wildcard.match and checks sample and allowed in both directions. Ran both tests: both OK. The stderr line `[fx] evaluate failed ... (42)` is the expected lane-crash case output.
- Only `effect` and `message` set on the event (ADR-0023).

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)

1. lib/opencode-v2-policies.js:26-27 (`forms('git commit', '--no-verify')`, same for push) · `git commit -m "docs: explain --no-verify flag"` is allowed by `inspect` but matched and blocked by `git commit * --no-verify *`. I ran it: guard-allow, POLICY-BLOCK. A policy cannot be overridden and says only "Blocked by configuration policy", so a commit message that mentions the flag is blocked with no way out. The task risk and acceptance line require that a pattern match no command the guard allows; the test only checks hand-picked `allowed` lists, which never include a quoted mention. Fix: drop the mid-command form (`git commit * --no-verify *`) or accept losing it (the plugin guard covers it with the full text, and this policy layer is the second layer), and add `git commit -m "explain --no-verify"` to that family's `allowed` so the test pins it. Same check needed for every `* <flag> *` form (`--force`, `-f`, `--hard`, `-D`, `-d`): a quoted message holding `--hard` or `--force` with a space after is blocked only where the guard also refuses, but `--no-verify` is the one I confirmed diverging; run the same probe over each family with a quoted-message variant.

#### Minor (Nice to Have)

1. plugins/fx-opencode-v2.js:114-121, :122-124 · `commands` Map entry is deleted only in `execute.after`; if a call is denied or aborted and `after` never fires, the id leaks for the process life. Small strings, bounded by session; clear on `after` only is fine until proven otherwise, but a `tool.execute.error`-style cleanup or a size cap would close it. Cannot confirm from diff whether v2 fires `after` on denial.
2. tests/gates/opencode-v2-plugin.test.js (withGuard) · copies `plugins lib agents codex commands skills references` by hand; any new top-level dir the plugin reaches makes this test fail for an unrelated reason. Copy the repo root filtered instead, or note it.
3. lib/opencode-v2-policies.js:36-43 · `sample` is derived by `*` -> `x`, so the `x` tokens (`git push x main`) are not realistic commands; fine for the matcher, but `git push x main` hits the guard's base-branch rule by repo state, not by remote name, so the test is coupled to `git init -b main`. Low risk.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** Guard wiring, fail-closed paths and lane check are correct and tested; one unoverridable policy family blocks a command the guard allows (commit message mentioning `--no-verify`), which the both-direction test does not catch.

## Ledger lines

Task 05: minor (deferred): commands Map entry freed only in execute.after; a denied or aborted call may leak its id.
Task 05: minor (deferred): withGuard copies a hand-listed set of top-level dirs; a new dir breaks it for an unrelated reason.
Task 05: minor (deferred): policy samples use `x` placeholders and depend on `git init -b main` for base-branch refusals.
