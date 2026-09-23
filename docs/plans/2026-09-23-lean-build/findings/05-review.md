# Task 05 review: a finished plan is not listed

Base b7d1091, head da91b73.

### Spec Compliance (✅ | ❌ with file:line; ⚠️ cannot verify)

- ✅ Plan complete line prefix, exact case, line-start match: `lib/plan-state.js:49` `/^Plan complete:/m` with no `i` flag; verified by the case test at `lib/plan-state.test.js:112` (mid sentence and lower case still named).
- ✅ All-finished plan set returns null: `lib/plan-state.test.js:108` asserts `out === null`; `describePlans` falls through the existing `!plans.length` check at `lib/plan-state.js:65`.
- ✅ Unreadable state.md stays listed and does not throw: `lib/plan-state.js:47-49` reads inside try/catch, `stateText` stays null so the skip test is never true; test at `lib/plan-state.test.js:116-121` builds a directory named `state.md` and asserts no throw and still named. Ran `node lib/plan-state.test.js` here: 22 passed, 0 failed.
- ✅ fx-implement SKILL.md instructs the exact line form: `skills/fx-implement/SKILL.md:692-701`, new section "Write the plan-complete line", code block matches the task's form verbatim (`Plan complete: tasks <first> to <last> complete, <K> parked, final review <clean|fixed>`). Placement matches the task instruction: after `## Exit gate: the Iron Law` (line 642) and before `## Completion report` (line 702).
- ✅ Backfill lines exact: `docs/plans/2026-09-01-fx/state.md:381` and `docs/plans/2026-09-11-fx-audit/state.md:387` (per diff hunks) match the task's given text character for character.
- ✅ 2026-09-12-fx-audit-followups already had its line: not present in the diff's changed-file list; report states grep found the existing line at line 786 and it was left untouched, consistent with the task's "confirm with grep and leave it" instruction.
- ✅ Render in this worktree names none of the three old plans: ran `node -e "process.stdout.write(require('./lib/preamble').render({harness:'claude-code'}))" | grep -n '2026-09-0\|2026-09-1'` here, no output (zero matches), reproducing the report's claim independently.

TDD evidence: the diff's four new test blocks at `lib/plan-state.test.js:98-121` match the task's Step 1 verbatim. The report's quoted RED run shows exactly 2 of the 4 new checks failing (the finished-plan and all-finished cases), which is the expected RED shape since the pre-fix `scan()` only checked existence, not content. Re-ran `node lib/plan-state.test.js` on the head commit here and got 22 passed, 0 failed, matching the report's GREEN claim.

### Strengths

- The fix replaces two separate file-system calls (`fs.existsSync` then, later, an implicit read) with a single `fs.readFileSync` under try/catch, removing a small TOCTOU window rather than adding one.
- Diff is minimal and touches only what the task named: no new abstraction, no new dependency.
- The four new tests exercise the interesting edges named in the acceptance criteria (prefix-exact match, all-finished silence, unreadable state.md) rather than only the happy path.

### Issues (Critical / Important / Minor)

**Minor**: `lib/plan-state.js:48,54`: `hasState` used to mean "a `state.md` path exists" (`fs.existsSync`); it now means "a `state.md` was successfully read as text." For the unreadable case (e.g. a directory at `state.md`), `hasState` flips from `true` to `false`. Two visible effects, both edge-case only and untested:
  1. The rendered bullet for that plan now reads "no `state.md`, so the build has not started" (`lib/plan-state.js:75`), which is wrong when a `state.md` path exists but can't be read as text.
  2. `fresh = plans.filter((p) => !p.hasState)` (`lib/plan-state.js:69`) now buckets an unreadable-state plan with never-started plans for the top-3 selection, changing which plans get named when more than 3 plans are unfinished and one has an unreadable ledger.
  Neither effect is covered by a test, and neither violates an acceptance criterion (the plan does stay listed, and nothing throws). The implementer's own report flags this same point under "Concerns." Fix, if picked up, is cheap: keep `hasState` derived from existence (`fs.existsSync` or a second null check distinguishing ENOENT from other errors) independent of readability.

No Critical or Important findings.

### Assessment (Approved | Needs fixes)

Approved.
