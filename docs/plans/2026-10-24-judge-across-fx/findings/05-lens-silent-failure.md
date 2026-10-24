Lens: silent-failure, 4 findings

All line numbers are at HEAD in `/development/fx/.worktrees/judge-across-fx/src/plugins/fx-opencode-v1.ts`. I read the code, not the diff. I did not run the tests.

Three of the four properties hold on the opencode path:
- **judge-error:** `decideLaneHint` catches its own throws, writes the decision-log line, and returns null (`src/lib/lane-hint.ts:24-36`). The opencode call at line 526 inherits that.
- **judge-config:** the `invalid` handle logs `judge-config` and makes no call (`src/lib/lane-hint.ts:56`). The opencode call at line 526 inherits that too.
- **no judge.json:** nothing is logged, as ruled.

One property breaks, and two more gaps sit around the call.

1. [Important] `fx-opencode-v1.ts:499-503` and `525`: the `no-session` ruling does not hold on opencode.
   - The handler returns at line 503 when `journalKey` is null. The lane-hint block at 522-531 is never reached.
   - Even past that point, line 525 requires `session !== undefined`, so `decideLaneHint` is not called without a session id.
   - `decideLaneHint` is the only place that writes `no-session`, so opencode writes no decision-log line in that case.
   - A person reading the decision log cannot tell "opencode sent no session id" from "the hint was never attempted". Claude Code and Codex both log `no-session` (`src/hooks/fx-codex.ts:365-368` calls `decideLaneHint` with `session_id ?? null`).
   - The only trace on opencode is the `warnOnce` at line 502, which is stderr only and prints once per process.

2. [Important] `fx-opencode-v1.ts:499`: the lane hint depends on the journal loading, but nothing in it needs the journal.
   - `if (!journal) return;` skips the whole handler when `journal.js` failed to load. The load site at lines 184-188 is `catch { /* no turn boundary */ }`, with no variable kept and no warning.
   - The hint, the Stop reminder and the turn boundary all vanish with no stderr line and no decision-log line.
   - `decideLaneHint` resolves its own `journalKey` through `src/lib/lane-hint.ts:10`, so the early return costs the hint for nothing. A broken journal module is invisible and looks the same as the hint being off.

3. [Important] `fx-opencode-v1.ts:523-530`: failures outside `decideLaneHint` leave no decision-log line.
   - If `parsePromptText`, `isPrimaryAgent`, `queue.enqueue` or the load check at line 523 throws, the catch at 529 only calls `warnOnce`.
   - That is one stderr line per distinct message per process. A bug that fires on every prompt shows once and never reaches the log the gate is judged from. The comment at `src/lib/lane-hint.ts:30` says exactly this should not happen.
   - Codex gets the `judge-error` equivalent because everything runs inside `decideLaneHint`. Here only the inner call is covered.
   - The `shellGuardOff` twin shows the same repo already writes a builtins-only decision-log line when a module fails to load. The lane hint has no equivalent.

4. [Minor] `fx-opencode-v1.ts:524-525`: a prompt that cannot be read is dropped without a trace.
   - `parseOpencodeV1PromptText` returns `undefined` for any `output` with no text parts or a non-array `parts` (`src/lib/opencode-input.ts:81-86`).
   - The condition at line 525 then silently skips the hint. If opencode changes the `chat.message` output shape, the hint stops on every turn and nothing records it.
   - This mirrors the `parseCall` ok-false returns elsewhere, but those are not log-silent in the same way.

Deliberate and not flagged:
- Skipping child sessions (the `isPrimaryAgent` check at line 525).
- The stderr-only `warnOnce` for load failures of optional modules, which the header comments document as advice-only.
