**If the task files look complete enough to just execute, read this.** They
usually are, and that is the trap. A good task file names the files, the seam
and the acceptance criteria, so an agent opening one has everything it needs to
start typing and nothing visibly missing to go looking for. What is absent
from a task file is exactly what this skill supplies:

- **A worktree**, so the main checkout is never written to.
- **A ledger** that survives compaction. Without it a long build restarts work
  it already finished, and the only record of a ruling is a chat message that
  is gone.
- **A fresh subagent per task**, so task 09 is not implemented by an agent
  carrying eight tasks of accumulated assumptions.
- **A review after each task**, while the diff is small enough to review.
- **Lens dispatch** on what the diff actually touches, which no task file knows
  in advance because it is written before the diff exists.

None of that is in the plan, and none of it can be. Detail in a task file is a
reason to trust the task, never a reason to skip the lane.
