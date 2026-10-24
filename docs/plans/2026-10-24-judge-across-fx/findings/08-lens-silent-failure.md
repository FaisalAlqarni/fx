Lens: silent-failure, 3 findings

Both plugins keep the logging that `checkEdit` does itself. The judge outcome is logged inside `checkEdit` (`src/lib/edit-rules.ts:203-209, 255-262`) before the promise resolves, and nothing rejects it. The detached promise in `src/plugins/fx-opencode-v2.ts:458-460` therefore cannot drop a logged result. That path is also test-only, because `V2_AWAITS_BEFORE` is `true` at `src/plugins/fx-opencode-v2.ts:235`. The holes are around `checkEdit`.

1. [Important] `src/plugins/fx-opencode-v2.ts:440-442` and `src/plugins/fx-opencode-v1.ts:637-640`: if `edit-rules` fails to load, or v2 finds `checkBuiltins` or `checkEdit` missing, every edit is allowed with only one stderr line per process (`warnOnce`). There is no decision-log line. The ruling says a failure writes a `judge-error` line. The shell path covers this case with a builtins-only writer (`shellGuardOff`, `src/plugins/fx-opencode-v2.ts:185` and `src/plugins/fx-opencode-v1.ts:220`), but the edit path has none. What a human loses: after a load failure (a bad build or a missing file), all edit rules, built-in refusals included, are off for the whole session. Anyone reading the decision log later sees no sign of it, only an absence of lines. That is the same as "no `judge.json`, nothing to log".

2. [Important] `src/plugins/fx-opencode-v2.ts:460`: the `.catch` on the detached promise only calls `warnOnce("[fx] edit rules off: ...")`. It writes no `judge-error` line. `logEditRuleError` (`src/lib/edit-rules.ts:189`) is exported for exactly this case ("hooks, whose own code around checkEdit can fail"), and no plugin imports it. Two further problems:
   - The message is wrong. The rules did run, and the failure was in applying the result (for example a null `d`).
   - If the process exits before the detached judge call settles, nothing is logged.

   The path only runs when `awaitsBefore()` is false (test-only today), and `advise` is already guarded. That limits the exposure now, but it becomes a silent gap if `V2_AWAITS_BEFORE` is ever flipped.

3. [Minor] `src/plugins/fx-opencode-v2.ts:445-450`: `checkBuiltins(input)` and then `checkEdit(input)` each run `builtinStep`. A crash in `readRepoConfig` or `changedFiles` is therefore logged twice, as two `judge-error` lines for one edit. That inflates the error count in the log. It is also why `advise` at `src/plugins/fx-opencode-v1.ts:644` and the v2 equivalent drop advice without a signal when `sessionId` is null or the queue is absent. This is harmless only because `checkEdit` has already logged the decision.

I found no other swallow in the diff's opencode wiring. The v2 `advise` guard (`src/plugins/fx-opencode-v2.ts:447-449`) is a deliberate, reported swallow. In v1, a throw from `queue.enqueue` (line 644) rejects the hook and so refuses the edit. That is loud, not silent, though it is the wrong outcome for advice.

Not checked: I read only the plugin files at HEAD and `edit-rules.ts`. The diff file, the codex and claude-code hooks, and `logDecision` itself were not read, so whether the log write can fail silently is unverified. The bodies of `setup` in v2 and `fx` in v1 showed as elided in the read, so I relied on grep context around the call sites.
