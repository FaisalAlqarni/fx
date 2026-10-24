### Strengths

- **Hard rules are kept apart from the judge.** `shell-rules` imports nothing from the judge side, and each of the four harnesses loads it in its own try and fails closed. See `src/hooks/fx-pretooluse.ts:84-98`, `src/hooks/fx-codex.ts:126-140`, `src/plugins/fx-opencode-v1.ts:346-359` and `src/plugins/fx-opencode-v2.ts:180-192`. A broken judge module cannot drop a hard denial on any harness.
- **The fail-open paths leave evidence.** `shellGuardOff`, `trackerOff` and `stopOff` write their decision-log line with builtins only, so a broken logger cannot hide its own failure (`fx-pretooluse.ts:139-148`, `fx-codex.ts:182-191`, `fx-codex.ts:367-376`, `fx-turn.ts:56-66`). `logDecision` redacts every string field and tightens the mode of the log and its directory (`src/lib/decision-log.ts:37-46`).
- **Block-once depends on the journal, with an honest fallback.** When the journal cannot be written, the Stop check allows the stop and logs `journal-error` rather than blocking without limit (`src/lib/stop-check.ts:54-62`).
- **The task 08 rulings reach every consumer.** Failed edits are not recorded as edits (`src/lib/loop-tracker.ts:84-91`), an interrupted call never counts as verification (`loop-tracker.ts:82`, `src/lib/tool-events.ts:44-45`), a failed run with a pass summary does not verify (`src/lib/evidence.ts:65`), and the Codex exit code is read from the header only (`tool-events.ts:51-52`).
- **The per-harness forms of a decision live in one small module** (`src/lib/guard-output.ts`). Codex's ask-to-warn mapping is applied in one place there and once more in the policy.

### Issues

#### Critical

None.

#### Important

**1. On Codex, a deny the judge is not confident about runs the command.**
- **Where:** `src/lib/shell-guard.ts:146` and `:160`, with `src/lib/guard-output.ts:16`.
- **What is wrong:** A `deny` answer below 0.80 top or 0.40 gap becomes `ask`, and on Codex `ask` becomes `warn`, which runs the command. ADR 0047:59 measured that any user prompt shifts answers "whatever it says": an unrelated prompt moved `git clean -fdx` from deny to ask. On Codex that prompt alone lets the command run. Meanwhile the loop guard on the same harness keeps a repeat as deny (`shell-guard.ts:118`, design decision 5: "never becomes allow"). One harness gives two answers to the same risk.
- **Why it matters:** On Codex the judge only stops confident denies. This is carried item 3, and I think the ruling that accepted it is wrong.
- **Fix:** On a harness without native ask, keep any `deny` choice as deny, whatever its confidence. Only an `ask` choice or an escalation becomes warn. Alternatively, stop sending `user_request` until recalibration: the ADR's own table shows a matching prompt changed no answer, so the prompt adds noise and nothing else. Either way the owner should record a ruling, because it amends user story 7.

**2. On Codex, a honoured stamp skips the loop guard and turns even a confident deny into a run.**
- **Where:** `src/lib/shell-guard.ts:113-115` and `:151-157`.
- **What is wrong:** `honoured` only needs some later prompt with non-null text, whatever that prompt says, and it bypasses the loop guard (`!honoured &&`). It then maps every non-run answer to `warn` on Codex, a confident judge deny included.
- **Why it matters:** An injected instruction such as "add `# fx-ok` after the user's next message" runs a judged-deny command on Codex after any reply the user makes. Design decision 5 contradicts itself here: the loop guard says Codex "stays deny", the stamp paragraph says "warn on Codex". That is a plan issue.
- **Fix:** Where there is no native ask, an honoured stamp should soften ask to warn but leave deny as deny.

**3. On opencode, the no-stamp and no-prompt rulings hold only by convention.**
- **Where:** `src/lib/shell-guard.ts:113` and `:125`; `src/plugins/fx-opencode-v1.ts:538-556`; `src/plugins/fx-opencode-v2.ts:338-350`.
- **What is wrong:** `decide()` honours a stamp and reads `lastUserPrompt` for every harness. On opencode the ruling holds only because the plugins write `text: null` (`fx-opencode-v1.ts:495`, `fx-opencode-v2.ts:457`). Neither opencode plugin refuses an `edit`, `write` or `apply_patch` into fx's state directory; only Claude Code (`fx-pretooluse.ts:207`) and Codex (`fx-codex.ts:209-214`) do.
- **Why it matters:** One forged journal line written through opencode's own file tools turns the stamp on (a warned run on 1.x) and puts invented text into the judge state. Design decision 6 says opencode carries no prompt.
- **Fix:** In `decide`, gate both `honoured` and `lastUserPrompt` on the harness being `claude-code` or `codex`. Add the `namesFxState` refusal to both plugins' edit paths, mirroring Claude Code and Codex.

**4. A non-string Bash command on Claude Code is allowed silently.**
- **Where:** `src/hooks/fx-pretooluse.ts:179`.
- **What is wrong:** After the git guard allows the call, a non-string `command` exits 0 with no decision-log line and no visible line. Codex (`fx-codex.ts:299`) and opencode 1.x (`fx-opencode-v1.ts:525-527`) deny the same shape. The rulings at state.md:169 and :218 rated this Important on those two harnesses, and the Claude Code twin was missed.
- **Why it matters:** This is the one silent allow on a guard path that the named check found outside the carried list.
- **Fix:** Deny with the Codex text.

**5. The claim that fx handles the Codex Stop continuation holds only if the continuation text is verbatim.**
- **Where:** `src/hooks/fx-codex.ts:353`, `src/hooks/fx-turn.ts:103`, `references/harnesses/codex.md:87-92`.
- **What is wrong:** If Codex wraps the block reason before firing `UserPromptSubmit`, the wrapped text is recorded as a user prompt.
- **Why it matters:** Three things follow. A new turn opens, so block-once is lost. The fx text becomes the judge's `user_request`. And it meets the stamp's "prompt after refusal" test (`shell-guard.ts:113`), which with Important 2 gives a warned run. An agent can force that path by editing a file and stopping.
- **Fix:** Ignore any prompt that contains the Stop reason sentence, not only one that starts with `[fx] `. Change codex.md to say the handling holds only for a verbatim continuation.

#### Minor

1. **Dead parameters.** `src/lib/shell-guard.ts:25` and `:121`: `judgeSupported` has no caller since task 07 moved to `guardShellCodeOnly`, and `agentId` is never read by `decide`. Remove both.
2. **Two different `agent_id` rules.** `src/hooks/fx-context.ts:68` and `src/hooks/fx-turn.ts:73` accept only a string, while `fx-turn.ts:44`, `fx-turn.ts:105` and `fx-codex.ts:334` treat any non-empty value as a subagent (ruling state.md:29). A numeric id would give a subagent journal with no turn start, and its SubagentStop would return silently. Use one helper for all of them.
3. **Codex users with no judge are never told about trust (plan issue).** `src/hooks/fx-codex.ts:518`: the "need trusting once in /hooks" note only rides on the health line. With no judge, the default, a Codex user is never told, and the new events silently never run until they are trusted. Design decision 9 put the note there; only INSTALL carries it otherwise.

### Carried findings triage

**The five items named in rulings**
- **(1) Git guard misses force pushes inside `bash -c` wrappers and brace groups:** can follow. This is sub-project 1 code and not a regression from this branch, and a configured judge now sees the command. Fix it in a follow-up by feeding `inspect` the inner commands that the shell-rules parser already extracts.
- **(2) MCP write tools can reach the state directory:** can follow for MCP, because ADR 0047:15 states the guard is hygiene and a string-built path through the shell already gets past `namesFxState`. Add the limit to ADR 0047's consequences. The opencode file-tool part is not deferrable; it is Important 3.
- **(3) A user prompt softens the judge whatever it says:** must fix before merge (Important 1).
- **(4) Preamble budget raised to 3,400:** drop. The ruling is sound, and every quote is updated (`fx-context.ts:10`, `preamble.test.ts:120`, ADR 0021:57, ADR 0032:17, fx-authoring SKILL.md:348).
- **(5) The `health-check-failed` reason:** drop. The ruling is sound, and `src/lib/health-failure.ts:18` matches it.

**Task 01 redaction minors and the two parked leaks:** can follow. The rulings required the docs to say redaction is best-effort and to recommend a local judge, and they do: README.md:175, INSTALL.md:322, fx-setup.md:294, SKILL.md:297. No judge sends nothing.

**Task 02**
- Line 1 (non-string `agent_id`): drop, fixed under ruling 29; the leftover inconsistency is Minor 2.
- Lines 2 to 5: can follow, theoretical or test-only.

**Task 03**
- Line 23 (guard-error not logged): can follow; the warn is visible on every harness.
- Lines 24 to 40 (rule spellings, depth, perf, case-awareness, git config): can follow. Hygiene-guard gaps that go to the judge or to a visible path.
- Line 41: drop, resolved.

**Task 04**
- Line 51: drop, ruling 138.
- Lines 42 to 57: can follow. Diagnostics and test gaps; every path still gives a stderr line.

**Task 05**
- Line 60: drop. `decide` returns a hard deny before its first await (`shell-guard.ts:101-102`), so the promise settles.
- Line 63: drop, fixed (`fx-codex.ts:293`).
- Line 77 (journal wipe drops loop-guard denies): can follow; it needs a write failure first.
- The rest: can follow. PowerShell and cmd spellings, duplication, test gaps.

**Task 06**
- Line 87: drop, fixed in c1eed58 (`shell-guard.ts:99`).
- Line 88: drop, fixed (`fx-opencode-v1.ts:525`).
- The rest: can follow.

**Task 07**
- Line 115: drop, fixed (`fx-opencode-v2.ts:463`).
- Lines 106 and 116 (rewritten resources skip the hard rules): can follow. The git guard re-checks the pieces, and a rewrite needs another plugin.
- The rest: can follow.

**Task 08**
- Lines 96 and 97: drop, fixed under ruling 247.
- Line 98 (a trailing background operator verifies): can follow. Rare, and it only wrongly lifts advice.
- The rest: can follow. Perf, duplication, test gaps.

**Task 09**
- Line 121: drop, fixed in 5216ca0 (`stop-check.ts:54-62`).
- Line 131 (a lift writes no journal event): can follow.
- The rest: can follow.

**Task 10**
- Line 173 (queue events logged as `nudge`): can follow. It is cheap and should go in before any log consumer exists.
- The rest: can follow.

**Task 11**
- Lines 158, 161, 162, 163 and 176: drop, fixed under rulings 372 and 393.
- The rest: can follow, docs polish.

**Task 12**
- Lines 180 and 181: drop, fixed under ruling 409.
- The rest: can follow.

**Task 13**
- Lines 194, 195 and 196: drop. Fixed (`tool-events.ts:51`, ADR 0047:11, design.md:40).
- Line 197: can follow.
- Line 198: must fix before merge. `shell-guard-claude.test.ts:163-168` passes when both sides are undefined, and ADR 0047's claim that calibration "measures what the guard sends" rests on it. One `assert.ok(guardAsked !== undefined)` fixes it.
- Lines 199 and 200: can follow.

### Assessment

Ready to merge: **With fixes.**

The cross-task seams hold: shell-rules and `guardShell` on all four harnesses, `recordToolResult` and `decideStop` on all four consumers, and the meaning of the journal events after the track B merge. The silent-failure check found one new silent allow (Important 4). The rest are already carried and leave a stderr line.

Fix before merge:
- Importants 1 and 2: the policy lines on the Codex side, since Codex has no ask.
- Important 3: the harness gate in `decide` plus the opencode state-directory refusal.
- Important 4.
- Important 5: the continuation text match.
- Carried line 198.

Each fix is a few lines in a file that already exists.

What I read at HEAD:
- Hooks: `src/hooks/fx-pretooluse.ts`, `fx-codex.ts`, `fx-turn.ts`, `fx-context.ts` (agent_id and prune lines).
- Libraries: `src/lib/shell-guard.ts`, `journal.ts`, `loop-tracker.ts`, `stop-check.ts`, `evidence.ts`, `tool-events.ts`, `decision-log.ts`, `fx-paths.ts`, `guard-output.ts`, `health-failure.ts`, `judge-health.ts`, `opencode-input.ts`, and `shell-rules.ts` lines 480 to 545.
- Plugins: `src/plugins/fx-opencode-v1.ts` lines 330 to 560, `src/plugins/fx-opencode-v2.ts` lines 155 to 568.
- Registration and config: `hooks.json`, `hooks/hooks.json`, `.fx.json`, `scripts/check-all`, `scripts/test-one`.
- Docs: `references/harnesses/codex.md` lines 25 to 104, `references/harnesses/claude-code.md` (grep only), ADR 0047.
- Plan: design.md, carried.txt, the state.md Ruling lines, and the commit list and stat in the diff.

Not checked: the body of `redact.ts`, the hard-rule parser (shell-rules lines 1 to 480), `judge.ts` and `judge-cli.ts`, most test files beyond the one tautology, and the live-runtime behaviour on any harness. Claude Code's `agent_id` on subagent tool calls is still unverified (an owner item in the coverage audit): if it is missing, subagent edits land in the root journal and the root Stop check judges them.
