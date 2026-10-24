| Thought | Reality |
|---|---|
| "Close enough on spec compliance" | The reviewer found spec gaps = not done. Fix, or hit the cap and adjudicate. Those are the only exits. |
| "I'll fix it myself, dispatching is overhead" | Controller fixes pollute your context and skip review. Resume the implementer. |
| "One more round will converge" | Past the cap, rounds don't converge: the failure is structural. Adjudicate and route. |
| "The reviewer will just find something new anyway" | Scoped re-reviews verify fixes; they cannot wander. New findings on untouched code go to the ledger, not the loop. |
| "This finding is obviously wrong, I'll drop it" | You adjudicate only at the cap, and every ruling is a ledger entry. Silent discards are forbidden. |
| "The fix was small, skip the re-review" | A small fix gets a controller re-review, not none: fix-loop.md's four conditions, a re-review file with both sections, and the ledger line. |
| "Reviews slow the loop down" | The loop without reviews is unverified churn. Reviews are its brakes and steering. |
| "Ledger bookkeeping is overhead" | The ledger is what survives compaction. Controllers without one have re-dispatched entire completed sequences. |
| "The implementer spawned its own reviewer: free extra assurance" | A duplicate seat on the same diff. The task review is the gate. A worker-spawned reviewer is a defect to flag, not rigor. |
| "I'll just ask whether this is right" | Rule it, ledger it, continue. |
| "A progress summary would be helpful" | They asked you to execute. The ledger is the record; write there, not here. |
| "I remember finishing that task" | Trust the ledger, not your memory. |
| "This task is blocked, I'll stop" | Skip it, ledger it, take the next unblocked one. |
| "I'll run these in parallel to save time" | Implementers never run in parallel: the test environment is shared. |
| "I'll run the full suite now to be safe" | `test_all` runs once, at the exit gate. A failure there is classified against the merge base, which is what a baseline would have told you. |
