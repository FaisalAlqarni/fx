# Task 06 re-review, fix round 1

Scope: the fix diff af9e3b6..2ada692 (one commit, 2ada692), judged against 06-review.md and 06-lens-security.md. Line numbers are in the tree at 2ada692.

What I ran, from that tree: `node lib/hook-input.test.js` printed `ok`. `node tests/gates/hook-output-golden.test.js` printed `ok (40 cases)`. I also ran a scratch copy of hooks/ and lib/ with `module.exports = {};` as lib/json.js, with scratch HOME and CODEX_HOME, and sent a `git push --force origin main` Bash payload. fx-pretooluse.js and fx-codex.js both exited 2 with `[fx] hook input parser failed to load (parseJson is not a function). Denying every call until the plugin is repaired.` Stdin `null` to hooks/fx-pretooluse.js exited 2 with the recorded crash line. I did not run `scripts/check-all`.

### Finding verdicts

- Review Important 1 and security lens 1 (Important), the same defect: an empty lib/json.js or lib/hook-input.js switched off the git guard in Claude PreToolUse. ADDRESSED. src/hooks/fx-pretooluse.ts:52-53 throw inside the load `try` when `parseClaudeHookInput` or `parseJson` is not a function, and that `catch` denies. src/hooks/fx-codex.ts:117-118 add the same check to its load `try`. Under the controller ruling these cases are pinned in src/lib/hook-input.test.ts, not in the golden gate. Lines 70-71 add the `module.exports = {};` stubs for hook-input.js and json.js. Lines 85-89 run fx-pretooluse.js and fx-codex.js on each stub and assert exit 2, the exact refusal text and an empty stdout. That covers all four cases: Claude and Codex, with lib/json.js empty and with lib/hook-input.js empty. The test passes, and my force-push run above agrees.
- Review Important 2 and spec item "malformed input" (security lens 2, Minor): stdin `null` turned from refused to allowed in Claude PreToolUse. ADDRESSED. src/hooks/fx-pretooluse.ts:92 denies on `parsed === null` with the hand-written hook's exact line. The new golden case tests/gates/fixtures/hook-golden/pretooluse-null.meta.json pins exit 2 and that stderr, and the report says it was recorded from 772df2d's hand-written hooks. The gate passes with 40 cases.
- Spec item "hook decision type" (review Minor 3): ADDRESSED. src/lib/types.ts:97 adds `export type HookDecision = GuardVerdict`, and both PreToolUse hooks use it for the verdict (src/hooks/fx-pretooluse.ts:104, src/hooks/fx-codex.ts:209).
- Review Minor 1 and security lens 3: fx-context loaded lib/hook-input and lib/json outside any `try`. ADDRESSED. src/hooks/fx-context.ts:27-40 load both inside a `try` with the typeof checks. Lines 72-76 require lib/preamble inside the render `try`, as the controller accepted. A broken library now produces the UNREAD warning, and src/lib/hook-input.test.ts:93-94 asserts that for all four stubs.
- Review Minor 2: Codex refuses SessionStart when the parser fails to load, untested and against its own comment. ADDRESSED. src/hooks/fx-codex.ts:104-107 now state the cost, and src/lib/hook-input.test.ts runs a SessionStart payload through fx-codex.js for every stub, asserting exit 2.
- Review Minor 6: golden gate spawnSync had no timeout. ADDRESSED. src/tests/gates/hook-output-golden.test.ts:90 passes `timeout: 10000`. No fixture records `"exit": null`, so a timed-out hook always fails its case.
- Review Minor 4 (ClaudeContextOutput and CodexHookOutput interchangeable) and Minor 5 (non-string `cwd` lane-check case): NOT ADDRESSED, and neither was in this round's scope. Both already have deferred ledger lines from 06-review.md, so I add none.

### New breakage

Critical: none. Important: none.

- Minor. src/tests/gates/hook-output-golden.test.ts, the `stub` meta field. The four empty-export cases moved to the parser test, so no committed case sets `stub`. The option has no user, and `--record` now writes a `stub: undefined` key that JSON.stringify drops. It is harmless, but it is unused surface. Fix: drop it, or keep it with a note that it is for future cases.
- Minor. src/lib/hook-input.test.ts, the `run` helper's spawnSync calls. They have no `timeout`, which is the same gap this round closed in the golden gate. A hook that hangs on stdin hangs check-all. Fix: pass `timeout: 10000`.
- Minor. src/hooks/fx-context.ts:64. When the parser fails to load, `input` is null, so a SubagentStart event reports `hookEventName: 'SessionStart'`. If Claude Code drops context whose event name does not match, the warning never reaches the subagent. This is still better than before the fix, when the hook crashed with no output. Fix: none needed unless the harness checks the name. A SubagentStart payload in the parser test would show it.

## Ledger lines
Task 06: fix round 1/5 (5 addressed, 0 open: none; commits af9e3b6..2ada692)
Task 06: minor (deferred): golden gate meta field `stub` has no committed case using it.
Task 06: minor (deferred): src/lib/hook-input.test.ts spawns hooks without a timeout, so a hanging hook hangs check-all.
Task 06: minor (deferred): fx-context with a broken parser reports hookEventName SessionStart on a SubagentStart event, so the warning may not reach the subagent.
