Lens: silent-failure, 4 findings

Line numbers are at HEAD. Both files are new in this diff. I read the function bodies from the diff because the HEAD reads came back with them elided.

1. [Important] `/development/fx/.worktrees/judge-across-fx/src/lib/lane-hint.ts:28-30`: `decideLaneHint` catches every throw from `decide` and writes one stderr line, then returns null. Nothing goes to the decision log and nothing counts toward the features breaker. This breaks the design rule that every failure is visible in the log and counts toward the breaker.
   - The catch covers more than judge failures. It also hides `readRepoConfig`, `laneHintState`, a `logDecision` write error, and the deliberate `throw` at line 69 ("kind has no lane question"), which is a question-table bug.
   - A deterministic bug here fires on every prompt. The only trace is a stderr line the hook runner may drop. The decision-log analysis that decides the lane-hint gate will show no failures, only a feature that never fired.
   - A `logDecision` failure at line 81 loses the hint after the judge already answered, with the same single stderr line.

2. [Important] `/development/fx/.worktrees/judge-across-fx/src/lib/lane-hint.ts:32-33`: when the handle is not `ready`, `decide` returns null with no log entry. The `down()` helper at line 51 is only reached after a judge call. A missing credential, a bad config or a judge that was never set up leaves no trace. This is a failure the log cannot show, and the breaker never sees it.

3. [Important] `/development/fx/.worktrees/judge-across-fx/src/lib/judge-call.ts:38-42`: the breaker only counts `timeout` and `network` results (the `down` check at line 17). A judge that keeps answering with some other failure reason (anything not `timeout` or `network`) never trips it, and neither does one that keeps returning unparseable output. Each prompt then pays a full judge call and logs `judge-down`. The log has the failures, but the breaker never opens. This matches the old shell-guard rule, which the brief says must not change. The gap is that "must count toward the feature's own breaker" is not met for non-network failures. Say whether that is intended.

4. [Important] `/development/fx/.worktrees/judge-across-fx/src/lib/judge-call.ts:38,42` with `/development/fx/.worktrees/judge-across-fx/src/lib/lane-hint.ts:56,71`: when the session id is null, `key` is null. `askJudgeWithBreaker` then has no journal, so there is no breaker and no failure record. Lane hint passes `key` straight through and never falls back to `createRunBreaker`. Each hook run is a fresh process, so a down judge costs a full timeout on every prompt. The failures are logged as `judge-down`, but the breaker is silently inactive.
   - Separately, `readJournal` (line 38) and `appendEvent` (line 42) have no error path here. If `appendEvent` can throw, the judge result is lost after a successful call. Under finding 1 that turns into a stderr-only line. I did not check `journal.ts`.

I found no deliberate, commented swallow in these two files.

I did not check `journal.ts`, `decision-log.ts` or the shell guard's call sites. I also did not confirm the judge's failure-reason list.
