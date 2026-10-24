## The status block

Print it on the owner's request, and after each task completes or parks. It is
exactly four lines, in the same message that dispatches the next task, which
stays the last tool call of that message. It never replaces the dispatch.

```
Done: <n> of <total> (<NN, NN>)
Running: Task <NN>, <dispatch | review | fix round <R> | final review>
Left: <NN, NN> or none
Needs you: <NN: what unblocks it; ...> or none
```

(Write the lines without the code fence.) This four-line block is the only
progress summary. The ledger stays the record.

## Parking

A stop condition parks the task. It does not stop the build.

1. Do not run the step that hit the condition. An irreversible, security
   sensitive or outward step stays unrun until the owner answers.
2. Append `Task <NN>: parked: needs you: <stop condition>: <what unblocks it>` to
   the ledger (without backticks).
3. Take the next task the parked one does not block. A task that depends on the
   parked one is parked too, with the same reason.
4. Print the status block. The parked task appears under `Needs you`.

A declined item that a ruling parks is a smaller case: write
`Task <NN>: needs you: declined: <item text>`. The task still completes, and the
item shows under `Needs you`.

The completion report lists every needs-you item.
