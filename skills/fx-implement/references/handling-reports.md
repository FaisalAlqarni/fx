**DONE_WITH_CONCERNS**: the work is complete but the implementer flagged
doubts. Read them before proceeding. Concerns about **correctness or scope**:
address them before review. Observations ("this file is getting large"): note
them and proceed.

**A report whose `Tests:` line names `test_all`**, where `.fx.json` has a
`test_scope`, broke the one-full-run rule. Re-running would cost more than it
saves, so the work stands; ledger `Task <NN>: ran test_all (rule)` and repeat
the rule in that implementer's next dispatch or resume.

**NEEDS_CONTEXT**: provide the missing context and re-dispatch.

**NEEDS_CONTEXT and BLOCKED re-dispatch at most twice per task.** Each
re-dispatch appends its own `dispatched` line, so the count is the number of
those lines. A third
return means the task or its brief is wrong, and more attempts only spend
tokens. Append the parked line, tell the owner, and take the next unblocked
task:

```
`Task <NN>: parked: needs you: <one-line reason>`
```

(Write the line without the backticks.)

**BLOCKED**: assess the blocker:
1. Context problem → more context, re-dispatch, same model.
2. Needs more reasoning → re-dispatch on a more capable model.
3. Task too large → break it into smaller pieces.
4. **The plan itself is wrong** → rule on it, ledger it, re-dispatch with the ruling carried.
5. Genuinely unblockable → **skip it, ledger why, take the next unblocked task.** Never stop the queue for one task.

**Never ignore an escalation, and never force the same model to retry without
changing something.** If the implementer says it is stuck, something has to
change.

**If the implementer asks questions** (before starting or mid-task) answer
clearly and completely, provide extra context if needed, and do not rush it
into implementation.
