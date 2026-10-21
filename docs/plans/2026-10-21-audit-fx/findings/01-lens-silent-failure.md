Lens: silent-failure, 3 findings

1. [Important] scripts/build-cost:274-276: `readRecords(...)` returns `null` for an unreadable subagent file, and `sub && sub.find(...)` then skips it with `continue`. The line at 271 also swallows every `readdirSync` error under the comment "no subagents". A `.jsonl` that cannot be read, or a subagent directory that cannot be listed (for example a permission error or a changed layout), drops those tokens and dispatches. The script still prints a normal-looking `Task NN: cost ... N dispatches, fx-tdd k/i` and exits 0. A human sees a smaller number and no sign that it is an undercount.
   - The ledger records a normal cost line, not a "cost unavailable" line, so the loss never reaches the one place Ruling B points at.
   - The 271 swallow is documented, but the comment is correct only for a missing directory (ENOENT). It also hides every other error.
   - A related success-shaped case is that `Math.max(...[])` gives `-Infinity`, so a transcript with no timestamps prints `NaN min`.
   - A malformed subagent file calls `fail` and exits 2. That is loud, but it contradicts the "always exits 0" comment at 251 and the contract.

2. [Important] hooks/fx-context.js:21-30: a stale `.fx/transcript-path` is never cleared, and the "no transcript recorded" reason hides which failure occurred.
   - The hook overwrites the file only when the write succeeds. If a later session skips the write (git timeout, `git` missing, `.fx` not ignored, or a write error), the previous session's path stays on disk.
   - `build-cost` then reads that old transcript and reports its cost as this session's cost. Nothing marks it as wrong.
   - The "cost unavailable" safeguard in Ruling B does not fire in this case.
   - Where the file is absent, `scripts/build-cost:258` prints one reason, "no transcript recorded", for four different causes: not ignored, git timed out, write failed, hook never ran. The owner cannot tell which.
   - The catch at line 30 has a comment saying why and matches the task file's "any write failure is ignored", so the swallow itself is documented and acceptable. The gap is that its loss is not reported distinctly, and the stale case is not reported at all.

3. [Minor] hooks/fx-context.js:21-30: the `git check-ignore` result is read only through `status`. On a timeout or spawn error `spawnSync` sets `error` and `status` is null, which takes the same quiet `return` as "tree not ignored". This is covered by the Ruling B documentation but adds to the diagnosis gap in finding 2.

I flagged nothing else. The catch at hooks/fx-context.js:30 and the JSON.parse catch before it are deliberate and commented. The readRecords null return at scripts/build-cost:258-262 for the controller transcript is reported as "transcript not found". No retry_on or discard_on is introduced. The SKILL.md "park after two re-dispatches" rule appends a parked line and tells the owner, so it is not silent.
