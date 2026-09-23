### Finding verdicts (ADDRESSED | NOT ADDRESSED with file:line)

- ADDRESSED: Critical 1, missing "unsure, run check-all" fallback. scripts/test-scope:49-51 now returns `['scripts/check-all']` instead of `[]` for any path matching none of the named rules. Confirmed by running `scripts/test-scope --dry-run tests/conformance/lib/live.sh`, which prints `scripts/check-all` then the release-version gate. `node scripts/test-scope.test.js` passes, including the new assertion for this path.

- ADDRESSED: Critical 2, `.codex-plugin/` and marketplace paths misrouted. scripts/test-scope:43-45 now routes any path under `.codex-plugin/` or any file named `marketplace.json` to `node tests/gates/codex-manifest.test.js`, the gate that actually reads `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, and `.agents/plugins/marketplace.json`. `.claude-plugin/` on its own still routes to `scripts/check-manifest` (scripts/test-scope:46-48), unchanged and correct. Confirmed by running `scripts/test-scope --dry-run .codex-plugin/plugin.json` and `scripts/test-scope --dry-run .agents/plugins/marketplace.json`, both print `node tests/gates/codex-manifest.test.js` then release-version. Both new test assertions pass.

### Controller-named check

NOT ADDRESSED (predates this fix round): scripts/test-scope:28-31 (the `.js`-with-sibling-`.test.js` rule) matches `lib/preamble.js` and `lib/plan-state.js` before execution ever reaches the hooks/plugins/preamble/plan-state rule at scripts/test-scope:36. Since both files have an existing sibling test file, the sibling rule returns early with only `node lib/preamble.test.js` (or `node lib/plan-state.test.js`), so the three-command list the task's Interfaces section names for these two paths (`node lib/preamble.test.js`, `node tests/gates/codex-hook-output.test.js`, `node tests/gates/opencode-plugin.test.js`) never runs for them. Confirmed live: `scripts/test-scope --dry-run lib/preamble.js` and `scripts/test-scope --dry-run lib/plan-state.js` each print only their own sibling test plus the release-version gate.

This is a real gap against the task's stated interface (both `codex-hook-output.test.js` and `opencode-plugin.test.js` are skipped for changes to `lib/preamble.js`, even though the task singles out "the preamble test is the one that exercises `hooks/fx-context.js`" as the reason these three commands travel together). It predates this fix round: the diff's only hunk touches the manifest-routing branch (originally at test-scope line 33-36 in the base, now lines 39-51); the sibling-test rule (now lines 28-31) and the hooks/plugins/preamble/plan-state rule (now line 36) appear as unchanged context lines in the diff, identical in the base commit 10e90fd. Fix round 1 did not touch this logic and the report's fix-round section does not claim to.

### New breakage in the fix diff

None found. The two Critical fixes are additive and narrowly scoped: the manifest-routing branch is the only code path changed, and the existing seven original test-scope.test.js assertions (sibling rule, `.test.sh`, skills/md gate sweep, hooks rule, nonexistent-path skip) still pass unmodified per the full `node scripts/test-scope.test.js` run.

One adjacent, pre-existing inaccuracy surfaced while checking the fix: `.claude-plugin/marketplace.json` (a real file in this repo) now routes to `node tests/gates/codex-manifest.test.js` via the basename `marketplace.json` match at scripts/test-scope:43, but that gate reads only `.agents/plugins/marketplace.json`, not `.claude-plugin/marketplace.json`. Before the fix, the same file routed to `scripts/check-manifest`, which also never reads it. So this file's coverage was wrong before the fix and is still wrong after it: the fix does not regress it, it just swaps which incorrect command runs. Listed under out-of-scope observations below since neither Critical item named this file specifically.

### Out-of-scope observations

- `.claude-plugin/marketplace.json` still runs a command that never opens it (see above). No gate in this repo currently validates that file's contents at all, so this is a coverage gap wider than test-scope, not something a rule change alone can fix. Worth a follow-up task if `.claude-plugin/marketplace.json` is ever treated as a file that needs its own gate.
- The two Minor findings from the original review (concurrency result recorded as prose rather than a machine-checkable artifact, and no comment flagging the `shell: true` string-build for a future rule that interpolates a path) remain open and are not part of this fix round's scope; the report explicitly defers them.

### Verdict

Fix round addresses both Critical findings from 12-review.md with passing tests and confirmed dry-run output. The controller-named check is a real, separate gap in the task's Interfaces section that predates this fix round and was not introduced or worsened by it. No new breakage found in the diff itself.
