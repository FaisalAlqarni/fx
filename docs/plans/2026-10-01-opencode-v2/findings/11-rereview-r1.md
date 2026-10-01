### Finding verdicts

- **[Critical] child_err in fail/gap turns any row failure into exit 75 (live.sh:23-25)**: ADDRESSED. `child_err` removed; `fail`/`gap` plain (live.sh:~22-23). live_run now exits 75 once, after rollouts append, for any child or grandchild provider error, pass or fail, so run.sh re-runs it and the verdict line carries `inconclusive=N` (run.sh:~108-137, summary count). The first attempt is no longer silently replaced.
- **[Important] PASS with a child 429 stays a plain PASS**: ADDRESSED. Same live.sh block: any provider error is 75, so a pass no longer stands unmarked; run.sh suffix `inconclusive=1|2`. Test added in live-openrouter.test.sh (PASS with a child 429 is inconclusive).
- **[Important] `|| CHILD_PROVIDER_ERROR=""` treats detector failure as clean (live.sh:455)**: ADDRESSED. Exit 1 is clean, 0 is error, anything else is 75 with "could not read" (live.sh case on cerr_rc). openrouter.js `childCheck` throws on a cut JSON line or a Codex log with no session_meta; `child` exits 3 on throw or missing file.
- **[Important] shell lane check gated on start-of-statement apply_patch (fx-codex.js:124,186)**: ADDRESSED. SHELL_APPLY_PATCH now matches bash/sh/zsh/dash -c, an opening subshell, `{`, backtick, command substitution, env/time/xargs/exec/command/nohup/sudo (fx-codex.js ~:131). RED test in codex-manifest.test.js.
- **[Important] zero-path apply_patch allowed silently; dead try/catch (fx-codex.js:71-79,102-110)**: ADDRESSED. Path regexes take `^\s*`; `checkPatchPaths(..., fromShell)` writes one stderr line when a detected shell apply_patch yields no paths and allows (advice-only, no new stdout key); dead try/catch removed.
- **[Controller-routed] Codex addressing is `$fx:fx-<name>`**: ADDRESSED. lib/preamble.js codex entry only: `lane: $fx:${name}`, resolution text `$fx:fx-tdd`. claude-code, opencode, opencode-v2 entries unchanged (diff of preamble.js is 2 lines, both in the codex block). Docs (README, INSTALL, SURFACE, ADR 0020), preamble.test.js, both codex gates, rows 03/05 and no-runtime-addressing updated. Live evidence: row 14 injection with `$fx:fx-handoff`.

### Checks run
- Addressing diff: only the codex block changed in lib/preamble.js. Other harness entries untouched.
- Clean re-runs, spot-checked 02-r1, 14-r2, 12-r2, 18-r2, 07-r1, 13-r2 under scratchpad/logs: no `errored` agent state, no provider error text; the only "rate_limits" hits are token_count fields. 14-r2 out.txt: `PASS 14 ... model=qwen/qwen3.8-27b:free`, `codex: 1 pass, 0 fail, 0 gap`.
- Key scan: no real key in any changed file. One `sk-or-v1-lea...` string, a fake fixture in live-openrouter.test.sh (diff line 676), is test data for the leak scan. No key printed.
- Live rows not re-run, per instruction.

### New breakage in the fix diff
Minor: fx-codex.js SHELL_APPLY_PATCH `env|time|...[^\n;&|]*?\s*apply_patch` also matches `env grep apply_patch`, a harmless false positive (advice-only lane check or one stderr line).
Minor: rows 12 and 17 fail on the deepseek fallback (no apply_patch function), so a primary 429 there ends FAIL on the fallback with inconclusive=1 shown. Disclosed in the report; correct per the new rule, not a defect.

### Out-of-scope observations
None.

### Verdict
**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ledger lines
Task 11: fix round 1/5 (6 addressed, 0 open: none; commits 8e928f1..f08d9de)
Task 11: minor (deferred): SHELL_APPLY_PATCH matches `env grep apply_patch` (harmless false positive, advice-only)
Task 11: minor (deferred): rows 12 and 17 end FAIL on the deepseek fallback when the primary 429s (inconclusive=1 shown in the verdict)
