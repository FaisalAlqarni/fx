**Batch same-shape work.** When several tasks are each a small independent
edit of the same kind (the same one-line fix, constant change, or field
addition repeated across files) do **not** dispatch one subagent per task.
Compose ONE brief listing every file and its change, send the batch to a single
subagent, review its diff as one unit. Reserve one-dispatch-per-task for work
that needs its own judgment, its own tests, or its own review surface.
