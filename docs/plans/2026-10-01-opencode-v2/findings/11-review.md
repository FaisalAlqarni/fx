## Task 11 review: Phase B, Codex (83eed58..8e928f1)

### Spec Compliance

- ✅ Spec compliant. Every Codex non-PASS row (02, 07, 12, 13, 14, 15, 17, 18) has a Resolved entry (baseline.md diff), each "fixed" with a commit and 2+ live passes. `expected-gaps` lost `codex 13` and `codex 14`; rows 13/14 now describe themselves `live` on codex.
- ⚠️ Cannot verify from diff: no ruling in state.md names task 11 for the max_depth config beyond line 157/163 (runner fix, addressing bug). The INSTALL.md consequence of `max_depth` (below) is for task 15.
- Ledger rulings checked: line 157 (runner subagent 429 fallback, shared change, free rows stay green): met by f8210d8 with unit + stub-session tests. Line 163 (addressing bug) is excluded by the controller; row 14 uses `$fx:fx-handoff` as a workaround only.

### Strengths

- `childProviderError` (openrouter.js) reads only `collab_tool_call` / `CollabAgentToolCall` agent states with status `errored`, then applies the same HTTP-shaped regex as the top-level detector. The unit test (openrouter.test.js, +29 lines) proves it ignores 429 text in a spawn prompt, a model message, command output, a rollout message, a rollout function output, and a non-errored state. `500 in my script` is not matched.
- live.sh `child_err` exits 75 only when the row would otherwise FAIL or GAP; a row that passes stays a pass. The stub test covers FAIL->GAP, PASS kept, and model-message text unchanged. run.sh:113 re-runs on 75 for every harness except claude-code.
- Hook change (fx-codex.js): the shell regex `(^|[\n;&|])\s*apply_patch\b` only fires for a statement starting with apply_patch; gate test covers both the refusal (status 2 plus marker) and the echo-mention pass-through. Refactor into `checkPatchPaths` keeps the apply_patch tool path identical. Read-only agents still refuse `apply_patch <<` as Bash because `apply_patch` is not in ALLOWED_BINARIES (plant-roles.js:503), so the new hook branch does not open a read-only hole.

### Focus checks

- Row 12 (2b9419a): assertions unchanged, every assertion line is identical to the claude-code/opencode cases (control wrote, lens/da absent, lens dispatched twice). Only the task-A wording changed, with a stated reason. Spot check of kept logs (scratchpad `logs/12-c`, `12-d`): lens and da got `is read-only and must not write (blocked: Bash).. Command: apply_patch <<PATCH` 18 times, the control wrote control.txt. Same guarantee holds. See Minor 1.
- Row 17 (2b9419a): assertions unchanged (marker file plus the reason string from a tool call); only the "write it with" sentence differs. Same guarantee as other harnesses.
- Row 13 (5f12321): shares the claude-code branch verbatim (`claude-code|codex`), same prompt, same loop over all five hidden lanes, same `skill_attempts` assertion. Codex has no skill tool, so an attempt is a shell command naming `skills/<n>/SKILL.md` (events.js), counted whether or not the read succeeds, which matches claude-code's "attempted or blocked". Logs `13-a`, `13-b`: visible lanes (fx:fx-architecture etc.) are listed, `fx-audit` appears 0 times, the model read fx-architecture 6 to 8 times. Equivalent to 78ff5b3.
- Row 14 (5f12321, 1ec2f14): same branch as claude-code: `lane_loaded fx-handoff` plus `^# Handoff:` in the top-level answer. Only the address differs. Logs `14-c`, `14-d`: a `<skill><name>fx:fx-handoff</name>` injection, and the `# Handoff:` block in the answer. Equivalent to 78ff5b3.
- max_depth = 2 (a3ed03c): the value matches OpenCode's `experimental.subagent_depth: 2` (child plus grandchild), and references/harnesses/codex.md:34-41 says V1 default is 1, the key is ignored under V2, and a plugin cannot set it. So it is the correct knob, but it is test-config, not product: unlike OpenCode, where the installer writes the depth, fx on Codex cannot ship it. A V1-model user with default config cannot nest; V2-catalog models are unaffected. See Minor 2.
- "PASS x2" backing: logs exist, but not at `/tmp/fxlogs-opencode-v2` (that dir holds only the baseline-era 02:51 to 03:27 logs, overwritten by name) and the report names no path. They are kept in this session's scratchpad `logs/<row>-<letter>/`. Spot check: 02-b/d/e qwen, 07-b qwen, 12-c/d qwen, 13-a/b, 14-c/d qwen, 15-b/c deepseek, 17-b/d/e qwen with lane-check text, 17-ds deepseek, 18-d/e qwen, 18-b deepseek. Counts match the report. Model labels in logs match the claimed models. See Minor 3.

### Issues

#### Critical (Must Fix)
none

#### Important (Should Fix)
none

#### Minor (Nice to Have)

1. tests/conformance/rows/12-read-only-agent-cannot-edit.sh:34 · on chat-completions models the codex "editing tool" probe (task A) now goes through a shell `apply_patch <<`, the same hook branch as task B. The live row no longer exercises the real `apply_patch` function-tool refusal for lens agents on these models. The free gate tests (codex-manifest.test.js:244+, plant-roles.test.js:143,583) cover that path, and the reason for the change is valid. Say so in the row comment so a reader does not assume the function tool was live-tested.
2. tests/conformance/lib/openrouter.js:44-50 · rows 15 and 18 pass on Codex only because the runner sets `[agents] max_depth = 2`, which fx cannot ship. A V1-model user on default config gets depth 1, so a lens or controller cannot nest. Task 15 must state this in INSTALL.md (user-level key, V1 only, ignored under V2) and the baseline Resolved text should say "needs user config" in its cell, not only in the commit reason.
3. report and baseline.md · the live-evidence logs are not at a path the report names, and the only named kept-log directory (`/tmp/fxlogs-opencode-v2`) holds the baseline logs, not the task 11 runs. Logs live in a session scratchpad that will not survive. Copy the passing logs or name their path in the report.
4. baseline.md row 17 · the ruling "deepseek fails: runtime limit of that model, not fx" is not one of the three rulings the task allows (fixed, unclosable, model capability). Row 17 is fixed (qwen x3) and passes; but it fails on the fallback, so if qwen 429s the row fails on deepseek instead of falling back cleanly. State it as a known limit in INSTALL.md or the baseline notes.
5. hooks/fx-codex.js:~124 · `SHELL_APPLY_PATCH` misses `bash -c "apply_patch ..."` or a patch run via a subshell, which fails open (advice only, consistent with the hook's stated fail-open). Not exploitable as a guard bypass (the guard is separate); note for the preamble owner.

### Assessment

**Task quality:** Approved
**Reasoning:** Fixes are narrow, each has a RED test (hook, events, openrouter unit, stub session) and the rewrites of rows 12/17 keep every assertion; rows 13 and 14 match the claude-code versions line for line. The subagent-429 fallback reads only the CLI's own errored agent states and the regex is the same HTTP-shaped one. Remaining points are evidence housekeeping and an install-doc note for task 15.

## Ledger lines

Task 11: minor (deferred): row 12 codex task A now probes the shell apply_patch path on chat models; note in row comment that the function-tool path is covered only by free gate tests.
Task 11: minor (deferred): rows 15 and 18 on Codex depend on a runner-only `[agents] max_depth = 2` that fx cannot ship; task 15 states it in INSTALL.md.
Task 11: minor (deferred): live logs for the task 11 PASS runs sit in a session scratchpad; the report names no path and /tmp/fxlogs-opencode-v2 holds only baseline logs.
Task 11: minor (deferred): row 17 on codex fails on the deepseek fallback; ruling is non-standard, record as a known limit.
Task 11: minor (deferred): SHELL_APPLY_PATCH does not match a patch run through `bash -c`; lane check fails open there.
