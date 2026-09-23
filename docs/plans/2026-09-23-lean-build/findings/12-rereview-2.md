### Finding verdicts

ADDRESSED: controller-named check (12-rereview-1.md). The finding required that
lib/preamble.js and lib/plan-state.js also run node lib/preamble.test.js, node
tests/gates/codex-hook-output.test.js and node tests/gates/opencode-plugin.test.js.

Before this fix, scripts/test-scope's commandsFor used an if/else-if chain with
early returns, so the .js-with-sibling rule (rule 2) matched both files first
and returned only their own sibling test, and the hooks/plugins rule (rule 5)
never ran for them.

The fix (scripts/test-scope, commandsFor, lines 29 to 60) replaces the early
returns with an accumulator: every matching rule pushes its commands instead
of returning immediately, and dedupeKeepLast (unchanged) collapses any
resulting duplicate to its last occurrence.

Confirmed live with scripts/test-scope --dry-run:
- lib/preamble.js now prints node lib/preamble.test.js, node
  tests/gates/codex-hook-output.test.js, node tests/gates/opencode-plugin.test.js,
  then the release-version gate.
- lib/plan-state.js now prints node lib/plan-state.test.js, then the same
  three hooks commands, then the release-version gate.

Both required commands run for both files. node scripts/test-scope.test.js
passes (test-scope: ok, exit 0), including the three plan-state.js assertions
and the new lib/preamble.js assertion.

### New breakage in the fix diff

None found. Hand-traced commandsFor for every rule pair to check the switch
from first-match to accumulate did not introduce unwanted overlap beyond the
one the finding named:
- .test.js vs .js-with-sibling: only overlaps on a nonexistent double-suffix
  sibling, not a real path.
- skills/agents/commands/md vs hooks/plugins/preamble/plan-state: disjoint
  path prefixes, no real file matches both today.
- .codex-plugin/marketplace.json vs .claude-plugin/: kept as if/else-if
  (unchanged from fix round 1), still mutually exclusive.

Re-ran dry-run for every previously tested path class (hooks/fx-context.js,
skills/fx-plan/SKILL.md, .codex-plugin/plugin.json, .claude-plugin/plugin.json,
tests/conformance/lib/live.sh, no/such/file.js) and all match their prior
expected output exactly, so no path class lost a command and rule order
(matching the Interfaces section's bullet order) is preserved.

The two test-scope.test.js assertions that changed value rather than being
purely added (dry('lib/plan-state.js') and the deduplicated two-path case) are
a necessary consequence, not new breakage: the task's own instruction makes
its Interfaces section the authority over its example test where they
disagree, and the Interfaces section lists lib/plan-state.js under rule 5
explicitly, so the old two-element expectation for the same function call
could not remain true once rule 5 also applies.

### Out-of-scope observations

- .claude-plugin/marketplace.json still routes to node
  tests/gates/codex-manifest.test.js via the basename check, not to a gate
  that reads that specific file. This was already flagged as a pre-existing,
  out-of-scope coverage gap in 12-rereview-1.md and this diff does not touch
  that branch, so it is unchanged, not a regression.
- No real file in this repo currently matches both the .test.sh rule and the
  skills/agents/commands/md rule at once, so the accumulate model's effect on
  that combination is untested by the current suite. Worth a dry-run
  assertion if such a path is ever added, but not a defect today.

### Verdict

Fix round addresses the controller-named check from 12-rereview-1.md: both
lib/preamble.js and lib/plan-state.js now run all three hooks/plugins commands
in addition to their own sibling test, confirmed by dry-run output and by
node scripts/test-scope.test.js passing. No new breakage found in the diff.
The two out-of-scope items are pre-existing and unaffected by this round.
