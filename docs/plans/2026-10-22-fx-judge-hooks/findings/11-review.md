### Spec Compliance (✅ / ❌ with file:line; ⚠️ cannot verify)

- ✅ `write` exit codes and messages match the brief: refusal of `--api-key` and `--api-key=` at src/lib/judge-cli.ts:656, usage exit 2 at :664, empty-env exit 1 at :670, `judge: invalid: <reason>` at :675, wrote and remote lines at :682-684.
- ✅ The key comes only from stdin (:667) or a named env var (:669), and is never printed.
- ✅ The file is 0600, and the explicit `chmodSync` at :681 also tightens an existing file.
- ❌ Brief Interfaces says any argument starting `--api-key=` is refused. The refusal at :656 checks only arguments the loop visits, so a flag value is skipped. See Minor 2.
- ✅ Docs vs rulings:
  - Stamp on Claude Code and Codex only, never on opencode, with the reason: INSTALL.md:338-342.
  - opencode 2.x runs code rules only, no judge: INSTALL.md:342-344 and README.md:180-181.
  - Codex on Windows reading commands the PowerShell way, stated as "assumed": INSTALL.md:344-345.
  - Stamp shells (bash, sh, zsh, PowerShell, not `cmd.exe`) scoped to Claude Code and Codex: INSTALL.md:338-339.
  - Redaction is best-effort and a local judge is recommended: INSTALL.md:322, README.md:174-175 and commands/fx-setup.md:253.
  - Nothing in the docs contradicts `health-check-failed` as a health reason. The docs never mention it, and the brief does not ask them to.
- ✅ Per-OS config, log and journal paths in INSTALL.md:315-318 match src/lib/fx-paths.ts:14-19.
- ✅ `hooks/fx-turn.js` on Claude Code (README diagram, Layout) matches hooks/hooks.json (UserPromptSubmit, PostToolUse, PostToolUseFailure, Stop, SubagentStop).
- ✅ commands/fx-setup.md:
  - `## 7. Judge (per machine, optional)` sits before "What setup deliberately does not create".
  - "No judge" is the first and default option, with Nimble and Kev recommended.
  - `d1:3b` is listed last among the local options with its caveats.
  - It says never to run an install and never to paste a key into the chat.
  - `<FX>` is resolved the way section 6 resolves it.
  - The Report names the judge result.
  - It names no lane.
  - The `hooks` row is present.
- ✅ No em or en dashes in any touched source or doc file (grep count 0).
- ⚠️ `skills/fx-setup/SKILL.md` matches the command text in the diff, but I cannot run `scripts/check-generated`, so "generated, not hand-edited" is unconfirmed by me. The report says it passed.
- ⚠️ The RED lines and test_scope output are the implementer's claims. The cited RED (usage output at test line 79, then the missing `## 7` heading) is the right failure for the missing feature.
- ⚠️ README.md:164-168 says the Stop check "blocks once when a turn edited code and no check passed afterwards". I did not check this against src/lib/stop-check.ts.

### Strengths
- The CLI tests exercise the real process, including a stdin line followed by extra lines, the unset-env case, both refusal spellings, the idempotent rewrite, and `write` followed by `check` against the fake server.
- The key-never-printed assertion (judge-cli.test.ts:786) is a real check.
- The docs state the opencode and Codex limits precisely and hedge the one unsourced Windows fact.

### Issues

#### Critical
None.

#### Important
None.

#### Minor
1. src/lib/judge-cli.ts:683-684, `write --base-url mock --model m` crashes after writing the file.
   - What is wrong: `parseJudgeConfig` accepts the literal `mock` (judge-input.ts:62). `isLoopbackUrl('mock')` is false because `new URL('mock')` throws (judge-input.ts:25-28). The remote branch then calls `new URL('mock')` unguarded.
   - Why it matters: the file is written and `judge: wrote` is printed, then a TypeError escapes `main().then` as an unhandled rejection. The exit code is 1 with a stack trace, and the user is told the data is leaving the machine.
   - Fix: skip the remote line for `mock` (or reject `mock` in `write`), and guard the host lookup.
2. src/lib/judge-cli.ts:654-663, the refusal is positional, not "any argument".
   - What is wrong: values consumed by `args[++i]` are never tested, so `--model --api-key=SECRET` is written into the file as the model name and exits 0. An unknown flag before `--api-key k` returns the usage line (:662) instead of the refusal line. The tests never cover the refusal-in-value-position or unknown-flag-first cases.
   - Fix: scan all of `args` for the refusal before the loop.
3. src/tests/gates/judge-cli.test.ts:765-769, the existing-file chmod branch is untested.
   - What is wrong: the mode is asserted only on a fresh file, and the repeat write ignores `r.code`. Deleting the `chmodSync` at judge-cli.ts:681 keeps the suite green. That line is the only thing protecting a key written over an older, looser file.
   - Fix: pre-create the file at 0644, write, and assert 0600.
4. src/tests/gates/fx-setup-judge.test.ts:718-737, the content gate misses acceptance points.
   - What is wrong: the `hooks` row test is `^\| \`hooks\` \|` anywhere in the file, not within the `.fx.json` table. Nothing asserts "No judge" is the first and default option, that `check` is run before `write`, or that the section says not to run an install. No gate covers the README or INSTALL claims from the rulings, so a regression on the stamp or opencode statements would pass.
   - Fix: assert the default-option sentence and the never-install sentence, and add a small README and INSTALL needle check.
5. commands/fx-setup.md:225-229, two wording slips and one gap.
   - The judge "answers allow, ask or deny", but its options are `run`, `ask` and `deny`.
   - A configured but invalid config (`check` prints `judge: invalid ...` or `unavailable`) gets no instruction. Only `judge: none` is handled.
   - Neither README nor INSTALL says the judge also receives Stop final messages for the Stop check, although both say a remote judge gets them.
6. commands/fx-setup.md:276-285, the remote path is incomplete.
   - What is wrong: `<FX>` is left as a placeholder in commands the user runs themselves, so the agent must substitute the resolved path. No base URL is given for OpenRouter. `--insecure-http` is not mentioned, although the section says private-network addresses count as remote, so a LAN `http` judge is rejected with no hint.
   - Fix: say the agent substitutes the resolved FX path, and state the insecure-http opt-in.
7. README.md:176-182, the stamp is not scoped as the design scopes it.
   - What is wrong: the paragraph does not say the stamp never overrides a hard denial or the git guard, and never skips the judge. The "why" for opencode is only in INSTALL.md:340-342.
   - Fix: add one sentence.
8. INSTALL.md:347-349, "Codex does not run a changed hook until you re-trust it" is stated as fact, but the brief only gives "new events were added" as the reason to re-trust. Soften it to match the source, or cite one.

### Assessment
**Task quality: Approved**

Reasoning: every Interface behaviour in the brief is implemented and tested through the real process, and the docs state each binding ruling correctly with no contradiction. No integrity defect threatens a key or a guard. The `mock` crash and the positional refusal are edge cases outside the documented flows. The remaining issues are test breadth and doc polish, so they go to the ledger.

## Ledger lines
Task 11: minor (deferred): `write --base-url mock` writes the file and then throws an unhandled TypeError at the remote-line `new URL` (judge-cli.ts:684).
Task 11: minor (deferred): key-on-command-line refusal is positional; `--model --api-key=X` is stored and an unknown flag first gives usage, not the refusal (judge-cli.ts:654-663).
Task 11: minor (deferred): no test for tightening an existing looser judge.json, so the `chmodSync` line is unguarded (judge-cli.test.ts:765).
Task 11: minor (deferred): fx-setup-judge gate does not check the default option, the never-install rule, or README and INSTALL ruling statements; the `hooks` row match is not table-scoped.
Task 11: minor (deferred): fx-setup section says the judge answers "allow, ask or deny" (options are run, ask, deny) and handles only `judge: none`, not an invalid or unavailable existing config.
Task 11: minor (deferred): remote steps leave `<FX>` unresolved for the user, give no OpenRouter base URL, and omit the `--insecure-http` opt-in.
Task 11: minor (deferred): README stamp paragraph omits that the stamp never touches a hard denial, the git guard or the judge, and gives no reason for the opencode limit.
Task 11: minor (deferred): INSTALL states the Codex re-trust mechanism as fact without a source.

I could not run any test or `scripts/check-generated`, so the report's green results and the generated-copy check are unverified by me.
