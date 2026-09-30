### Finding verdicts

- **[Important 1] Recorded-command map keyed by call id alone; two sessions sharing a provider id let one read the other's command**: ADDRESSED. plugins/fx-opencode-v2.js:47-50 `callKey(sessionID, messageID, id)` joins all three with `\0` and returns undefined if any part is missing or not a non-empty string. Record (:224-227), lookup (:170-171) and forget (:232) all use it. Field names checked against v2 source: execute.before/after events carry `sessionID`, `messageID`, `id` (packages/core/src/tool.ts:103-110, :122-129; packages/plugin/src/promise/tool.ts:39-54); the evaluate event carries top-level `sessionID` and `source` (packages/core/src/permission.ts:179-186), and the shell source is `{ type: "tool", messageID: context.messageID, id: context.id }` (packages/core/src/tool/plugin/shell.ts:117-121), so both sides key on the same Tool.Context values. Test check: in a scratch worktree at 44ab55b with plugins/fx-opencode-v2.js from 34a3c72, "session s1 sees its own command, not s2's" fails (after switching off the earlier failing null-source assertion). Residual, unchanged and latent as the finding said: CodeMode children share one messageID and id inside one session, so the key still collides there; the shell tool stays `codemode: false` (shell.ts:192).
- **[Important 2] Guard checks the command as recorded in execute.before, not the command spawned after a later hook or `create.before` rewrite**: ADDRESSED. plugins/fx-opencode-v2.js:178-182 runs `inspect` on every `ev.resources` piece after the full-text check and denies on the first refusal. `resources` are parsed from `invocation.command` inside `prepare` (shell.ts:127, :135-139), after every rewrite, so the checked text is the text that runs. Test check: at 34a3c72's plugin, "a resource the guard refuses is denied even when the recorded text was clean" fails (after switching off the null-source and two-session assertions). Ceiling, not a regression: the piece check sees only what the parser emits as command nodes; `cd`-family commands are dropped from resources (packages/core/src/shell/parse.ts:189-192) and a zero-command parse never reaches evaluate (lens finding 4, already ledgered). Heredoc resources use `redirected_statement` text (parse.ts:195), which should include the body; not probed, since the v2 checkout has no node_modules.
- **[Minor 3] Null `ev.source` gave `command = null` and `inspect(null)` allowed**: ADDRESSED (Minor, not open). plugins/fx-opencode-v2.js:170 gives no key for a falsy source, so :172-175 denies. Test "a null source is denied" fails at 34a3c72's plugin (first failure in the run).

### New breakage in the fix diff

None Critical or Important.

- Minor: tests/gates/opencode-v2-plugin.test.js:163-164, the "an evaluation with no sessionID is a miss and is denied" assertion passes on 34a3c72's plugin too, because `call_1` was already deleted by its execute.after. It does not prove the missing-sessionID path. Use an id recorded under session `s` and not yet forgotten.
- Minor: tests/gates/opencode-v2-plugin.test.js:178, the `nosrc` assertion now sits after the two new blocks, 17 lines from the `nosrc` evaluation it checks.

### Out-of-scope observations

None.

Checks run: `node tests/gates/opencode-v2-plugin.test.js` at 44ab55b: OK (stderr carries the known "[fx] evaluate failed: (ev.resources || []).find is not a function" line from the lane-check-crash case, also present at 34a3c72 and named in the report). With the plugin swapped to 34a3c72: null-source, two-session and resources-rewrite cases each fail, one at a time. Scratch worktree removed.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ledger lines

Task 05: fix round 2/5 (2 addressed, 0 open: none; commits 34a3c72..44ab55b)
Task 05: minor (deferred): the no-sessionID test passes on the old plugin too (call_1 already forgotten); re-point it at a live recorded id
Task 05: minor (deferred): nosrc assertion separated from its evaluation by the new two-session and rewrite blocks
