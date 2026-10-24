Lens: silent-failure, 4 findings

1. [Important] `/development/fx/.worktrees/judge-across-fx/src/lib/edit-rules.ts:155-158`: `checkEdit` catches every throw from `decide` and returns ALLOW with one stderr line (`[fx] edit rules off: <message>`). It writes no decision-log line and has no `judge-error` source, unlike `lane-hint.ts:28` and `dispatch-sizing.ts:32`. The catch is as wide as the whole function, so a typo or `TypeError` in the glob, config or patch code looks the same as a judge outage.
   - A human loses the trace. The hooks emit it with exit 0, and I believe Claude Code does not show stderr on exit 0. Nothing then lands in the decision log, so a broken rule check cannot be counted or alerted on.
   - Only the message is kept, so the stack is gone.
   - The throw can also come before the built-in checks run, which means `no-secrets` and `no-conflict-markers` are skipped for that edit with no record.

2. [Important] `/development/fx/.worktrees/judge-across-fx/src/lib/edit-rules.ts:233-241`: a throw in one `ask` discards every other pair's result. The throw can come from `editRuleState`, `readText` or `askJudgeWithBreaker`. In the concurrent branch it rejects `Promise.all`. In the sequential branch it aborts the loop. Either way control reaches the line 155 catch, which allows the edit.
   - Earlier pairs have already written decision-log lines (line 224) such as `source: judge, action: refuse, answer: breach` for a measured refusing rule. The edit is then allowed.
   - The log says refuse and the edit went through. The only other trace is the stderr line from finding 1.
   - This is the one place a measured refusal is lost without a `judge-error` line.

3. [Important] `/development/fx/.worktrees/judge-across-fx/src/lib/edit-rules.ts:203-204`: `if (handle.kind !== 'ready') return ALLOW;` treats `none` and `invalid` the same. `JudgeHandle` has an `invalid` kind (`types.ts:257`, set in `judge.ts:28,34,37`) for a `judge.json` that is unreadable, not JSON, or fails validation.
   - The ruling is that an unusable file logs `judge-config`, as in `lane-hint.ts:61` and `dispatch-sizing.ts:63`. Here it logs nothing.
   - A repository with judged rules and a broken `judge.json` gets no refusals and no advice, and nothing says why.
   - `none` is correct as silent.

4. [Important] `/development/fx/.worktrees/judge-across-fx/src/hooks/fx-pretooluse.ts:112-120,254-261` and `/development/fx/.worktrees/judge-across-fx/src/hooks/fx-codex.ts:130-138,331-341` (the Bash `apply_patch` path at 318-322): a failure to load `edit-rules` is kept in `editRulesError` and then allowed with a stderr line only.
   - The same `off` handler is registered for `uncaughtException` and `unhandledRejection` and also allows with a stderr line only.
   - The built-in refusals live in `edit-rules`, so when the module fails to load, all three fail-closed checks (`no-dashes`, `no-secrets`, `no-conflict-markers`) are off for the whole session. Nothing goes to the decision log, and the stderr line appears on every edit.
   - This follows the documented "fail open, except their own refusals", so it is not a bug in itself. The gap is a missing `judge-error` line and no sign that the secrets check is off.
   - The Codex Bash path at 322-324 has the same hole. Its `rulesOff` runs `shellGuard` afterwards, which is correct, but it logs nothing either.

Not findings:
- `readText` and the `.fx.json` parse catches are commented as deliberate.
- Judge-down, unchecked and deadline paths do write decision-log lines (`edit-rules.ts:218,229`).
- `askJudgeWithBreaker` failures are logged as `judge-down`.

I did not run the tests. I also did not confirm how Claude Code handles stderr on a PreToolUse exit 0.
