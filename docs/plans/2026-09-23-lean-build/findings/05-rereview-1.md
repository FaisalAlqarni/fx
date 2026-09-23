# Task 05, re-review round 1 (silent-failure findings), 2026-09-23

Fix base 940b6f8, head 0abf558. Diff: lib/plan-state.js (6 lines changed),
lib/plan-state.test.js (11 lines added). Ran node lib/plan-state.test.js:
24 passed, 0 failed. Ran node lib/preamble.test.js: OK.

### Finding verdicts (ADDRESSED | NOT ADDRESSED with file:line)

1. ADDRESSED. lib/plan-state.js:47-48 now computes `hasState` from
   `fs.existsSync(statePath)`, independent of whether `fs.readFileSync`
   succeeds. `stateText` (line 49-50) keeps its fail-open try/catch but is
   used only for the `Plan complete:` test, never for `hasState`. An
   unreadable state.md (EISDIR case) now sets `hasState = true`, so it lands
   in the same bucket as a readable ledger and no longer falls into the
   "fresh" bucket alone.

2. ADDRESSED. Same root cause and same fix as item 1. With `hasState` now
   `true` for the unreadable-but-existing state.md, the plan is described
   with "a `state.md` ledger exists, so a build is underway" (line 72 of
   plan-state.js), not "no `state.md`, so the build has not started".

3. ADDRESSED. lib/plan-state.test.js:105-115 (the "odd" block) adds
   `check(/odd[^\n]*ledger exists/.test(out || ''), ...)`, asserting the
   wording, alongside the existing "still named" check. A new block at
   lib/plan-state.test.js:117-124 adds a sibling test: one plan
   ("inprogress") with a readable in-progress state.md next to one
   ("unreadable") whose state.md is a directory, and asserts the sibling is
   still named. Both directions the finding asked for are covered.

### New breakage in the fix diff

None found. The diff is two shape changes: `hasState` switched from a
readFileSync-success flag to an existsSync flag, and `stateText` narrowed to
feed only the `Plan complete:` regex. `describePlans`'s signature, its
`fresh`/`named` bucketing logic, and its rendered line format are untouched.
`fs.existsSync` is called once per plan and does not throw on a directory
path, so it does not introduce a new throw path. Full plan-state.test.js
(24 cases) and preamble.test.js both pass against the head commit.

One thing that is not breakage but worth naming: `scan()` now calls both
`fs.existsSync(statePath)` and `fs.readFileSync(statePath, ...)` per plan,
one syscall more than before. Immaterial at the `MAX_PLANS = 20` scale this
function is bounded to.

### Out-of-scope observations

None. The fix touches only lib/plan-state.js and lib/plan-state.test.js, per
the coordinator's instruction to leave skills/ files alone in this round
(task 08's review is running there).

### Verdict

Fix round addresses all three findings. No new breakage. Tests green.
