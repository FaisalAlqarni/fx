# Task 05 review findings

**Spec compliance: PASS** (10/10 criteria met)
**Task quality: PASS**
One Low finding, fixed by the controller as plan bookkeeping.

Combined scoped re-review of fix round 1 and full task verdict: the original
review never ran, because the controller found the defect by measurement before
dispatching one.

## Verification the reviewer performed

Every criterion exercised directly, not through the test file alone, and every
exit code read straight from `$?` with no pipe in between.

- **Fail-open proven by injection, not by reading.** Empty command, text with no
  `***` header, and a truncated patch all exit 0 with empty stderr. Then it
  monkeypatched module resolution from outside the repository to make
  `laneCheck` throw: exit 0, empty stderr. That proves the guard around the
  *call*, not merely around the parser.
- **Fail-closed proven the same way.** A forced `inspect` throw exits 2 with
  `git guard failed to evaluate...`. `git branch -D x` exits 2 with the reason on
  stderr. `git status` exits 0, silent. Malformed stdin exits 0.
- **Multi-file patches check every path.** A patch naming `README.md` (clean)
  then `lib/widget.js` (refused) exits 2 and the reason names `lib/widget.js`
  only. A rename parses both the `Update File` and the `Move to` path, and the
  refusal names the `Move to` target.
- `hooks.json` registers `PreToolUse` with matcher `*` beside the two context
  events.
- `git diff 8aed061..d100493 -- lib/git-guard.js` is empty.
- The full task diff matches what both reports claim, with no stray edits.
  `scripts/check-all` -> `ALL GREEN`. No attribution trailer anywhere in the
  range.

## Finding

**Low.** Acceptance criterion 10 pointed at "task 10" for the subagent
assertion, which is now "Setup reports what did not land". The conformance work
was split by the red-team pass into task 11 (runner and free rows) and task 12
(behavioural rows), and this pointer was never updated.

Fixed, and the scan was widened: **seven stale `task 10` cross-references
existed across tasks 04, 05, 06, 07, 08, 09 and 13**, all pointing at the old
conformance task. All seven now point at task 12. An implementer following one
would have landed on the wrong task entirely.
