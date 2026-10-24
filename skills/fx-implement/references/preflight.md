Before dispatching task 01, scan the whole task set, **writing down what
you checked as you check it**. Look for:

- tasks that contradict each other or the plan's Global Constraints;
- anything a task explicitly mandates that the review rubric treats as a
  defect (a test that asserts nothing, verbatim duplication of a logic block).

**The scan's output is a table, not a verdict.**

- One row for **every pair** of tasks sharing a file or interface: the two
  tasks, what one Produces against what the other Consumes, what you found.
- One row for **every task**: whether its own text agrees with itself: tests
  specified against code specified, files created against files later touched.

**"The scan is clean" without those rows is not a scan you ran.**

Write the table to the ledger. Rule on everything it surfaces *before*
execution begins, record each ruling beside its row, then dispatch task 01.
If the scan really is clean, proceed without comment. The review loop remains
the net for conflicts that only emerge from implementation.
