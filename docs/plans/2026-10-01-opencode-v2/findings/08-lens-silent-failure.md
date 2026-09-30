Lens: silent-failure, 5 findings

1. [Critical] /development/fx/.worktrees/opencode-v2/tests/conformance/lib/live.sh:344-348 (with `NO_FIRST_TOKEN` at /development/fx/.worktrees/opencode-v2/tests/conformance/lib/openrouter.js:76): every timeout with empty stdout is classed as a provider error.
   - At line 346 the runner appends `NO_FIRST_TOKEN` to the stderr text itself. The regex always contains `NO_FIRST_TOKEN`, so the match is unconditional. No CLI evidence is consulted.
   - A product hang with no output takes this path: a plugin that won't load, an opencode `--standalone` stall, a blocked stdin. The row exits 75.
   - `run.sh` then re-runs it on the fallback model. If that run passes, the hang ends as `PASS ... attempt=2 (fallback)`. On Claude Code, which has no fallback, the same hang becomes a GAP, which does not fail the run.
   - What a human loses: the fx defect is reported as a provider flake. The only trace is one stderr line, plus the `attempt1.log` file if `FX_CONFORMANCE_LOGS` was set.
   - Nothing separates "model never answered" from "harness never started". For example, the CLI's own stderr is not checked for a connection or HTTP error.

2. [Important] /development/fx/.worktrees/opencode-v2/tests/conformance/lib/openrouter.js:77-81 (caller at /development/fx/.worktrees/opencode-v2/tests/conformance/lib/live.sh:344-348): the provider-error regex is broad, and it runs over the whole of stderr and every top-level error event.
   - The bare words `Unauthorized` and `Too Many Requests` match anywhere.
   - `(status|http|error|code)` followed by up to 20 non-digits and then `401`, `429` or `5xx` also matches. Any CLI stderr line or error event from a plugin, hook or fx code that prints "error ... 500" or "Unauthorized" counts.
   - The `rc == 1` gate does not help. A real product failure that exits 1 and prints such text is reclassified as a provider error. That leads to a fallback re-run, where a different model may pass it, or to a GAP on Claude Code.
   - Only the stderr and error-event constraint is enforced. Nothing ties the match to an upstream HTTP response.

3. [Important] /development/fx/.worktrees/opencode-v2/tests/conformance/run.sh:98-108 (log copy at lines 99-102): a fallback pass is reported as PASS, and the first attempt's failure is easy to lose.
   - `pass=$((pass+1))` at line 119 does not separate fallback passes from primary passes. The summary line reads `N pass`. Only the per-row suffix says `attempt=2 (fallback)`. A reader or script that looks at counts or exit code sees green with no sign of how many rows needed the fallback.
   - The first attempt's log is preserved only when `FX_CONFORMANCE_LOGS` is set and the log file exists. Without it, the only record is the stderr reason line. If the first attempt was a misclassified real failure (findings 1 and 2), nothing on disk shows it.
   - A row that calls `live_run` more than once writes `<row>-<harness>.log` each time. The second call overwrites the first call's log before `attempt1.log` is taken.

4. [Minor] /development/fx/.worktrees/opencode-v2/tests/conformance/lib/live.sh:258 and :412-415: model attribution can silently degrade to the requested model.
   - At line 258 the row file is pre-filled with `<model> (config)`. The session model then overwrites it only if `openrouter.js model` finds one.
   - For OpenCode the model comes from `opencode export`. That call discards stderr (`2>/dev/null`). A failed export is written into the log as `export failed: ...`, and `sessionModel` ignores it. The row still PASSes labeled `(config)`, and the "a session that reports another model fails the row" check never runs.
   - This is partly documented in the README. Still, the model-mismatch guarantee is silently absent for OpenCode when the export fails.

5. [Minor] /development/fx/.worktrees/opencode-v2/tests/conformance/lib/live.sh:276: Claude Code ignores `FX_LIVE_MODEL` under OpenRouter with no message.
   - The `--model` flag is dropped whenever `OPENROUTER` is set. A caller who pinned a model (the review bench does) gets Haiku.
   - The row does record `model=anthropic/claude-haiku-4.5`, so the failure is visible only if someone compares it to what they asked for.

I did not flag the `(config)` label when the log names no model, or the documented no-fallback GAP for Claude Code. Both are deliberate and commented.
