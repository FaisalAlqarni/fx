# Task 05, silent-failure lens (task mode), 2026-09-23

Controller verified at da91b73: lib/plan-state.js:48 reads state.md under a fail-open catch; :54 sets hasState to stateText !== null; :69-70 name only the plans without a ledger whenever any exist.

1. Critical per lens. A state.md that exists but cannot be read (EISDIR, EACCES, bad encoding) now counts as no ledger, so the plan lands in the fresh bucket, and every plan with a readable ledger drops out of the notice: one unreadable ledger can hide the resume notice for unrelated plans in progress. Fix: hasState is whether state.md exists (fs.existsSync or a stat), independent of whether it could be read.
2. Important. The same plan's line says "no state.md, so the build has not started", telling a session to start fresh on a plan with progress. Fixed by the same change.
3. Minor. The EISDIR test only checks the plan is named; it should assert the "ledger exists" wording and that a sibling plan with a readable ledger is still handled as before.
