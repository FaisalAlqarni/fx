Lens: silent-failure, 5 findings

1. [Critical] `/development/fx/.worktrees/opencode-v2/tests/conformance/lib/live.sh:23-25` (set at `:454-455`): `child_err` is called from every `fail()` and `gap()`. A subagent 429 anywhere in the log therefore turns any row failure into exit 75. `run.sh:113-125` then re-runs the row on the fallback model and reports whatever that run does.
   - Nothing ties the 429 to the assertion that failed. In row 12, one of five subagents can 429 while the lens agent really wrote `lens.txt`. That is a real product failure. It exits 75, and a second roll on a different model passes and prints `PASS ... attempt=2 (fallback)`.
   - The same applies to a guard that really did not fire in row 07, a lane check that really did not run in row 17, and any non-deterministic product bug.
   - Only the `.attempt1.log` keeps the evidence, and no verdict mentions it.
   - What a human loses: a real product failure becomes a fallback pass, with nothing in the summary line saying the first attempt failed for a reason other than the 429.
   - It also fires for failures that have nothing to do with the child, such as the model-mismatch `fail` at `live.sh:462`.

2. [Important] `/development/fx/.worktrees/opencode-v2/tests/conformance/run.sh:138` (with `live.sh:454-455`): a row that passes while a subagent 429'd stays a plain PASS, with no signal. The test at `live-openrouter.test.sh` asserts this on purpose.
   - Rows that assert absence are vacuous when the subagent that should have broken the rule died on the 429. Examples: `lens.txt` missing in row 12, and no write in row 18.
   - The control agent only proves that some other agent could write.
   - What a human loses: a "read-only agent cannot edit" PASS that never exercised the enforcement, with `CHILD_PROVIDER_ERROR` computed and then discarded on the pass path.

3. [Important] `/development/fx/.worktrees/opencode-v2/tests/conformance/lib/live.sh:455`: `CHILD_PROVIDER_ERROR="$(node "$OR_JS" child "$LOG")" || CHILD_PROVIDER_ERROR=""` treats every nonzero exit as "no error".
   - A missing or unreadable `$LOG`, a node crash, or a missing `$OR_JS` all look the same as a clean session. `openrouter.js` `child` has no try/catch, unlike `leaks`, which exits 3 on failure.
   - `lines()` in `openrouter.js` also drops unparseable lines silently, so a truncated rollout (a grandchild's error lives only in its parent's rollout) yields no match.
   - What a human loses: the detector going blind reads as "no provider error". The row then fails outright with no fallback, which is exactly the original bug, now with no diagnostic.
   - There is no check that any rollout was actually appended before reading.

4. [Important] `/development/fx/.worktrees/opencode-v2/hooks/fx-codex.js:124` and `:186`: the shell lane check is gated on `SHELL_APPLY_PATCH`, which only matches `apply_patch` at the start of a statement. These forms get no check and no message:
   - `bash -c "apply_patch ..."`, `sh -c`, a subshell opening on `apply_patch`, command substitution, `{ apply_patch`, `env`/`time`/`xargs apply_patch`.
   - A source file written through any of them skips the lane check.
   - The regex's own comment calls this a deliberate choice, but only for the case where a command "merely mentions" a header.
   - What a human loses: the check reports nothing, so a lane-check bypass looks the same as a clean pass.

5. [Important] `/development/fx/.worktrees/opencode-v2/hooks/fx-codex.js:71-79` and `:102-110`: `extractPatchPaths` needs `^\*\*\* (Update|Add|Delete) File:` at column 0, and `checkPatchPaths` allows silently on zero paths.
   - On the new shell path, `apply_patch` was positively detected, but an indented heredoc body, `apply_patch < patch.txt` or a patch argument built by a variable yields zero paths.
   - The edit then goes through unchecked and unlogged.
   - The commented fail-open at `:118` covers an unparseable patch. It does not cover a command known to be an `apply_patch` call that produced no paths.
   - The `try/catch` around `extractPatchPaths` is also dead code, because that function never throws.
   - What a human loses: no trace that a patch was applied and not lane-checked.

The `laneCheck` try/catch at `hooks/fx-codex.js:119-125` and the fallback to a no-op `laneCheck` at `:89-94` are commented advice-only swallows. I did not count them.

<!-- controller: two shell fragments in finding 4 reworded in words so the prose gate balances parentheses; meaning unchanged -->
