Lens: silent-failure, 5 findings

1. [Important] `/development/fx/.worktrees/opencode-v2/tests/conformance/lib/openrouter.js:114-141` (called from `/development/fx/.worktrees/opencode-v2/tests/conformance/lib/live.sh:455-463`): the subagent provider-error detector can only see Codex.
   - `childProviderError` matches `collab_tool_call` items only. For opencode, opencode-v2 and claude-code, `childCheck` returns null and the run reads as clean (exit 1, "none"). The "no rollout" and "unparseable line" blind checks do not cover these harnesses either.
   - A subagent that died on a 429 therefore leaves the row an ordinary PASS or FAIL. This lets the absence rows pass without the rule ever being exercised: a read-only agent cannot edit (12), it cannot delegate a write (18), the guard in a subagent (07), and the evasion row (08).
   - The 11-lens Critical was fixed for Codex only. The state.md ruling says "a provider error anywhere is inconclusive", but the code enforces that for one harness.
   - A human loses the vacuous-pass signal on three of four harnesses. Nothing in the verdict line says the detector did not run.

2. [Important] `/development/fx/.worktrees/opencode-v2/tests/conformance/lib/live.sh:427-428` and `:444-445` (checked at `:469`): a failed child-session export is recorded but not acted on.
   - `opencode session export` and `opencode export` discard stderr and ignore the exit code. The node line writes `export failed: <id>: ...` into `$LOG` on a parse failure.
   - `:469` turns that line into a `fail` only when the top-level model came back empty. If the parent export succeeded, a missing child export passes silently.
   - The child is where the read-only agent's write attempt lives. An absence assertion then passes on a log with no child evidence.
   - The `find ... 2>/dev/null` transcript and rollout appends at `:412` and `:416` have the same shape: nothing appended is not an error.
   - A human loses whether the child session was ever seen.

3. [Important] `/development/fx/.worktrees/opencode-v2/plugins/fx-opencode-v2.js:93-102`: the read-only check runs inside `attempt()`, which swallows a throw and returns `undefined`. Execution then falls through to the shell and edit branches, so this one security check fails open. The shell git guard just below it is explicitly fail-closed.
   - The only throwing statement is `fs.realpathSync(refs)` at `:97`, in the `external_directory` branch. It fires when `references/` is missing, so the trigger is narrow.
   - Effect: a read-only fx agent's `external_directory` request is no longer re-denied, and the session's own rules decide, which is the case this hook exists to stop (`:56-58`).
   - The failure goes to `console.error` and the `failures` array. That reaches the model only through the next preamble render. No denial message carries it, because nothing was denied.
   - A human loses the fact that the read-only boundary is off for this session.

4. [Minor] `/development/fx/.worktrees/opencode-v2/tests/conformance/lib/live.sh:465-466`: `sm="$(node "$OR_JS" model ...)"` ignores a node crash. For claude-code and codex an empty `sm` skips the model check, and the row stays labelled `model=<name> (config)`. The label is the only signal that the model was never verified. The `fail` at `:469` covers opencode and opencode-v2 only.

5. [Minor] `/development/fx/.worktrees/opencode-v2/hooks/fx-codex.js:244`: `catch { /* the session must start regardless */ }` around `plantRoles()` is a commented, deliberate swallow, so it is not a defect. It leaves no stderr line, though. When planting fails (read-only `CODEX_HOME`, for example) the user gets no reason why the fx review agents cannot be dispatched later. One stderr line would be enough.

Checked, not findings:
- The fail-open lane checks at `plugins/fx-opencode-v2.js:125-148` and `hooks/fx-codex.js:89-94,110-125` are documented as advice. The plugin records the failure, and the zero-path shell `apply_patch` case now writes a stderr line at `:107-109`.
- The `describePlans` swallow at `lib/preamble.js:125` is commented best-effort.
- The `.fx.json` read failure at `lib/preamble.js:80-87` surfaces in the preamble text.
- `scripts/fx-opencode-install` exits on every failure path. The ownership record is written before `opencode.json` through `os.replace`, and both writes raise on error. No silent swallow found.
- The earlier 11-lens findings (the Critical fallback-on-any-failure, the `child` exit-3 handling, the `SHELL_APPLY_PATCH` forms) are fixed at HEAD and not re-reported.
