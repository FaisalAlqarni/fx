Lens: security, 3 findings

I found no way around the hard rules on 2.x in the cases you listed, and no fail-open path reachable before the git guard allows. Two of the three findings are Minor. I did not read the generated JS or the new gate test. I did not read the second half of the diff (lines 858 on), which I assume is the generated plugin and tests. I read the TypeScript source directly.

1. [Minor] `src/plugins/fx-opencode-v2.ts:278` (with `:267-273`): the hard rules run only on the command string recorded in `execute.before`. The git guard also re-checks every `ev.resources` piece "after any other plugin's rewrite" (`:269-273`), but `shellGuard` never sees those pieces. If another plugin rewrites the shell call between `execute.before` and `evaluate`, the rewritten text gets the git guard and skips the hard rules. This needs a second plugin that rewrites commands and is not shown in this diff, so it is a defence-in-depth gap rather than an exploit. Fix: run `classifyShell` over each piece the git guard loop inspects, and refuse if any piece hard-denies.

2. [Minor] `src/plugins/fx-opencode-v2.ts:131-134` (with `src/lib/shell-rules.ts:541`): on Windows the guard reads the command the bash way and the PowerShell way. It does not read the top level as cmd.exe. `shell-rules.ts:457` only reads cmd for a nested `cmd /c`. The harness reference says the Windows shell is unmeasured. If the 2.x `shell` tool runs cmd.exe, a cmd-only spelling of a hard rule (for example `rd /s /q` or `del /s /q` forms that the PowerShell reading does not match) could pass. I did not verify the cmd and PowerShell spellings against the rule list, so this is unconfirmed. Fix: either source which shell runs on Windows, or add the cmd reading to the "either reading refuses" check on win32. Record the unsourced shell as a known limit either way.

3. [Minor] `src/plugins/fx-opencode-v2.ts:141-146` (with `src/lib/shell-guard.ts:112-125`): when `guardShellCodeOnly` throws and the command is a hard deny, the refusal still happens, because `hardDeny` was computed first. But `shellGuardOff` is skipped (`hardDeny === null` guard), and `guardShellCodeOnly` never reached its own `log`. A refused call therefore leaves no decision-log line. This is the same shape as the 06 finding SF 3, now in 2.x code. Fix: write the decision-log line from the plugin when `hardDeny` is set and the module call failed.

Checked, not findings:
- **Non-string command:** `execute.before` records only a string (`:332`). `evaluate` finds no entry and denies at `:263-266` before `shellGuard`. A non-string command fails closed here, unlike the 1.x plugin.
- **Missing or non-string session id:** `callKey` returns no key (`:158`), which also denies. The `sessionId: null` path in `shellGuard` only affects logging.
- **Order:** `shellGuard` runs only when `allowed` is set after the git guard passed. Every git-guard failure sets `deny` and leaves `allowed` undefined.
- **Result mapping:** `refuse` only ever sets `deny`. Nothing in the diff downgrades an effect to `allow` or `ask`.
- **Hard rules load:** a failed hard-rules load (`:128`) or a throw in `classifyShell` (`:137`) refuses the call. A hard deny is not conditional on `guardShellCodeOnly` or the logger loading.
- **Synchronous path:** nothing awaits, so the hang concern from task 05 (finding 5) does not apply.
- **`guardShellCodeOnly`:** it runs `classifyShell` first and returns deny on a hard rule before the read-only or repo-command shortcuts. It cannot allow anything a hard rule refuses. A stamp is ignored.
- **Logging:** the logged text goes through `normalizeCommand`, which redacts.

Files:
- /development/fx/.worktrees/fx-judge-hooks/src/plugins/fx-opencode-v2.ts
- /development/fx/.worktrees/fx-judge-hooks/src/lib/shell-guard.ts
- /development/fx/.worktrees/fx-judge-hooks/src/lib/shell-rules.ts

I did not run anything.
