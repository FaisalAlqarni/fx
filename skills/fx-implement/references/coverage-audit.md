Dispatch **one** read-only agent against `design.md`, every task file, and the
ledger, with one question: **is there any behaviour the design commits to that
no task's acceptance criteria carry?**

Every other check in this lane verifies work against its task file. Nothing
verifies the task files against the design, except the coverage walk in
`fx-plan` §6.1, which runs before the red team and never again. So a
requirement that changed after planning, or a story split across two places
where the plan picked up one, passes every gate in the build.

Tell it to look for these shapes, which is where the misses actually were:

- **A story that must land in two places** (a file *and* a screen, a model rule
  *and* its surfacing) where one half has an owner.
- **A criterion satisfied by requesting a URL directly**, which never asserts
  anyone can reach the page.
- **Criteria that are all refusals.** The guards get stated and the story does
  not.
- **The reverse direction:** what the tasks assume that no story states. That is
  where undocumented load-bearing rules live, and they are invisible to a review
  that reads the task file.

Tell it to write its full findings to a findings file.

Reply with at most five lines:

- **Gaps:** count
- **Findings:** path
- **Tasks affected:** task numbers
- **Verdict:** one line
- **Next:** one line

Run it before the final review, not after: a finding here is a task to add or a
criterion to amend, and both are cheaper than a finding in the merge review.
Ledger everything it returns, including what it clears.
