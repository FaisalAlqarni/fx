Lens: silent-failure, 5 findings

I read the plugin source at `/development/fx/.worktrees/fx-judge-hooks/src/plugins/fx-opencode-v1.ts` and the diff. I did not read the test files.

1. [Important] `fx-opencode-v1.ts:386-389` and `348-351` (`chat.message` and `sessionOf`): the prompt boundary drops silently, and the session-id shape is unmeasured. The header (line 37) says `input.sessionID` is taken from the published type and was not checked against 1.18.25.
   - **What is swallowed:** if the real field differs, or `parseCall` failed to load, `sessionOf` returns `undefined` and `journalKey` returns null. The hook writes nothing and logs nothing. A failed `appendEvent` is also ignored. It writes a stderr line, but the return value is dropped.
   - **What a human loses:** the stamp needs a prompt event after the refusal. Without that event every `# fx-ok` stamp is ignored, and every ask stays an ask. The tool result still tells the agent "if the user agrees, add the stamp", so the user agrees, the agent complies, and it is refused again. Nothing explains why.
   - **Blast radius:** the failure direction is safe (stricter). The cause is invisible, and the health line also depends on `sessionOf`, so it silently never shows either.
   - **Fix:** write one stderr line per plugin instance when `chat.message` yields a null key or `appendEvent` returns false. Do the same when the transform gets a non-empty input with no readable session id.

2. [Important] `fx-opencode-v1.ts:340-345`: `.then(..., () => null)` turns a rejected `judgeHealth` into "healthy".
   - **What is swallowed:** a rejected probe produces no line, no stderr and no log.
   - **What a human loses:** this is the same situation the `health-check-failed` ruling exists for. The ruling's own reasoning is that a failing check must show a line. A dead or broken judge looks identical to a healthy one, and the user keeps believing the shell guard has a judge.
   - **Fix:** on rejection, produce the visible `is unavailable (health-check-failed)` line, or at least write a stderr line.

3. [Minor] `fx-opencode-v1.ts:304-306` and `311-313`: a hard deny that arrives with a guard crash leaves no decision-log line.
   - **What happens:** the refusal itself is correct and visible. When `classifyShell` throws, or `guardShell` crashes while `hardDeny` is set, the code throws and skips `shellGuardOff`, so the crash is never logged.
   - **What a human loses:** the crash is invisible until a non-hard command hits the same fault. The decision log has no record of the denied command either, because `guardShell` died before it could log.
   - **Fix:** write the `guard-error` log line before the hard-deny throw, and also in the `classifyShell` catch.

4. [Minor] `fx-opencode-v1.ts` load blocks for `judgeHealth`, `journal` and `machinePaths` (diff lines 209-222): the catches are empty. They are commented as deliberate, but the comments name the effect and leave no trace.
   - **What is lost:** a broken `judge-health.js` alone silently removes the dead-judge warning. `journal.js` and `fx-paths.js` also break `shell-guard.js`, so that failure does surface through the "shell guard off" text.
   - **Fix:** one stderr line from each catch.

5. [Minor] `fx-opencode-v1.ts:415`: `if (typeof command !== 'string') return;` skips the shell guard with no trace, hard rules included.
   - **How it gets there:** `inspect` stringifies its input and allows anything without the word "git".
   - **What is lost:** the Codex finding 2 (the non-string command skip) applies here, but less severely. The git guard still runs, and opencode's tool schema probably blocks the shape upstream.
   - **Fix:** a stderr line or a refusal on this branch.

**Not findings:**
- Fail-open reachability: the only fail-open paths (the `guardShell` catch and `shellGuardOff`) are reachable only after the git guard allows and after `classifyShell` has run. A `hardDeny` is thrown on both the crash path and the success path. I found no fail-open path ahead of the git guard.
- `shellGuardOff` writes a decision-log line with builtins only and records the stderr warning if even that fails. This fixes Codex finding 3's log gap. `messageOf` sits outside its `try`, but a throw there refuses the call, so it fails closed.
- The one-time "shell guard off" system text covers load failure only. A runtime crash goes to stderr and the log. That matches the design, since opencode has no `systemMessage`.
- The `chat.message` hook skipping a null key is documented in the header as a deliberate limit. Finding 1 asks only for a trace.
