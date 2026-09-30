### Spec Compliance

- ❌ Issues found: 1 acceptance criterion not met on a clean destination (Important 1 below). All other criteria verified from the diff.
- ⚠️ Cannot verify from diff: (a) that 2.0.18 parses the generated v2 agent files (no 2.x binary in this task; task 07 rows should confirm). (b) 1.18.25 `opencode debug config` result (exit 0, 0 InvalidError, report step 7) is the implementer's claim; I did not rebuild the binary. (c) Ledger: no `Ruling:` line names task 06 (grepped state.md).

### Strengths

- Never writes `permissions`; the node bridge strips `sample`/`allowed` with one destructure (scripts/fx-opencode-install diff l.129), reusing `GUARD_POLICIES`, `toOpencodeV2Agent` and the existing refusal helpers. No second converter.
- Header line stays byte-identical (`GENERATED + MAJOR_2_MARKER`), so `refuse_if_foreign_generated` and `points_into_fx` apply unchanged to v2 files.
- Stale 1.x command removal is gated on the generated header and skips links (`remove_stale_commands`).
- Policies merged only when an equal entry is absent; user's higher depth kept; `new == data` guard makes reruns write nothing.
- Every v1 caller passes `--major 1`: `git grep` at 34a3c72 over tests, scripts, hooks, lib, plugins shows no installer call without it (remaining hits are comments, grep-on-source checks and INSTALL.md/README prose, task 09).
- Detection errors name `--major`; the failing-stub test also asserts nothing was created.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)

1. scripts/fx-opencode-install `merge_opencode_json` (major==1 branch, diff l.309-315) and tests/install/run.sh:754-759 · `--major 1` after `--major 2` does not restore the v1 output on a clean destination. Ran v1, v2, v1 into a fresh dir: result is `{"experimental":{"subagent_depth":2},"subagent_depth":2}`; fresh v1 is `{"subagent_depth":2}`. Acceptance 4 says "restores the v1 output exactly". The test passes only because seed `E` already carries the user's `experimental.subagent_depth: 3`, which hides the leftover. The report admits the leftover (Concerns 1) but it is an unmet criterion, not a deferrable note. The v2 branch already uses the "value equals fx's own 2" heuristic for top-level depth (l.318); apply the mirror on v1: remove `experimental.subagent_depth` when it equals 2, and drop `experimental` when that leaves it empty (v1 currently leaves `"experimental": {}` after removing the last policy too). Add a clean-seed v1/v2/v1 case to the test. If the owner prefers to keep a user's own `experimental.subagent_depth: 2`, that is a ruling for the controller, but then the acceptance wording must change.

#### Minor (Nice to Have)

1. scripts/fx-opencode-install diff l.304-307 · the new "experimental is not an object" and "policies is not a list" refusals run inside `merge_opencode_json`, step 4, after links, agents and skills are written. Task: "refusals fire before the first write". Invalid-JSON had the same placement before; move the parse/validation into the checks phase.
2. scripts/fx-opencode-install diff l.411 · `load_opencode_commands(dest_abs)` still runs on 2.x although its output is used only for names; its "path does not exist" exit can fail a v2 install for no v2 reason.
3. tests/conformance/lib/live.sh:~123 · the new major check has only `bash -n` coverage; no test exercises the mismatch failure message.
4. tests/install/run.sh:772 · detection tests cover a failing stub only; the missing-binary path (`OSError`, installer l.251) is untested.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** The installer is clean and reuses existing helpers, but acceptance 4 (v1 after v2 restores v1 output exactly) fails on a clean destination and the test's seed hides it.

## Ledger lines

Task 06: minor (deferred): experimental/policies shape refusals fire in merge_opencode_json after writes begin, not in the checks phase
Task 06: minor (deferred): load_opencode_commands still runs on 2.x and can fail a v2 install needlessly
Task 06: minor (deferred): live.sh major-mismatch check has no test beyond bash -n
Task 06: minor (deferred): installer missing-binary detection path is untested
