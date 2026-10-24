# Condition-Based Waiting

## Which one

Two fixes exist for a test that guesses at timing with a fixed delay. Pick by where the test stands.

- **The test drives the system from outside and cannot inject the timing collaborator** (a browser or system test, a CLI, an external process): wait on a condition, with a timeout and a description of what you wait for.
- **The code under test is yours, at a unit or request seam:** do not poll. Inject the collaborator (executor, scheduler, clock, job class) and assert the work was scheduled, as the testing reference says.

The rest of this page covers the first case.

**Core principle:** wait for the actual condition you care about, not a guess about how long it takes. A fixed delay passes on a fast machine and fails under load or in CI.

## Pattern

```
wait_for(description, timeout = 5s):
    start = now()
    loop:
        result = condition()          # read fresh state on every pass
        if result: return result
        if now() - start > timeout:
            fail("timed out waiting for " + description + " after " + timeout)
        sleep(10ms)
```

Use it in place of `sleep(50); assert result_exists()`: call `wait_for("result to exist", condition)`, then assert.

| Waiting for | Condition |
|-------------|-----------|
| An event | the event list contains one of that type |
| A state | the object's state equals the expected one |
| A count | the collection holds at least N items |
| A file | the path exists |
| A compound state | all parts hold at once |

## Common mistakes

- **Polling too fast** (a 1ms interval) burns CPU. Poll about every 10ms.
- **No timeout** loops forever when the condition never comes true. Always set one and name what was awaited in the failure message.
- **Stale data**: caching state before the loop means the condition never changes. Read it inside the loop.

## When a fixed delay is correct

Only when the test checks timing itself (a debounce, a throttle, a tick interval). First wait on the triggering condition, then wait the known interval, and comment why that interval: for example, two ticks of a 100ms timer means 200ms.
