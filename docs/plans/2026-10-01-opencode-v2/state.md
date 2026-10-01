# fx ledger: plan: docs/plans/2026-10-01-opencode-v2/plan.md

## Standing rulings

(docs/plans/rulings.md does not exist in this repo.)

## Log

Worktree: /development/fx/.worktrees/opencode-v2 on opencode-v2 (from main 2c0e8d2). setup ran clean.
Ruling: no baseline test_all before task 01; check-all runs once in task 15. Why: the pipeline rules merged in lean-review (ADR-0030). Cost if wrong: a pre-existing failure looks introduced, caught by task 15's merge-base classification.
Ruling: per-task lenses follow the tripwire rule on main (ADR-0029), not the installed plugin 0.2.1's broad table. Why: owner decision, now merged. Cost if wrong: a broad-trigger defect waits for the final review with every lens.
Ruling: implementers and reviewers on sonnet; lenses on their pinned tiers; most capable only with a Capable because: line.
Ruling: every dispatch starts with caveman full and ponytail full and uses repowise first. Why: owner standing rule.
Ruling: the OpenRouter key reaches subagents only as a path to a mode-600 file outside the repo (/tmp/claude-1000/-development/54399d8a-e6c5-4c6a-8e74-50861f05bc7c/scratchpad/.openrouter-key), read inline as OPENROUTER_API_KEY="$(cat <path>)" in the command that needs it; never printed, never copied into the repo. Why: subagent shells do not inherit the controller's environment. Cost if wrong: a leak, caught by the sk-or- scans in tasks 01, 08, 10 and 15.
Ruling: tasks 01 and 02 run at the same time: 01 writes only probe-findings.md and scratch files, 02 edits code and docs; disjoint paths, each stages by path. Cost if wrong: a git index lock collision, retried by the implementer.

## Pre-flight conflict scan

| Tasks | Shared file | Found |
|---|---|---|
| 02, 06 | scripts/fx-opencode-install, tests/install/run.sh, tests/gates/opencode-plugin.test.js, live.sh, rows 09 and 14 | 02 renames the source path; 06 adds --major and the v2 branch; 06 blocked by 04 blocked by 02: serial. OK |
| 02, 03 | lib/agent-dialects.js | 02 edits a comment naming plugins/fx.js; 03 adds toOpencodeV2Agent; 03 dispatched after 02 lands. OK |
| 03, 04, 05, 06, 07, 08 | scripts/check-all | each adds one run line after a named predecessor. OK |
| 04, 05 | plugins/fx-opencode-v2.js, tests/gates/opencode-v2-plugin.test.js | 05 extends 04's file and test; 05 blocked by 04. OK |
| 06, 07, 08 | tests/conformance/lib/live.sh | 06 adds --major 1 to the v1 install call; 07 adds the opencode-v2 cases; 08 the provider switch; chained. OK |
| 07, 08 | run.sh, jail.sh, README | 07 harness acceptance and binds; 08 fallback re-run and env allowlist; 08 blocked by 07. OK |
| 02, 09, 15 | INSTALL.md, README.md, SURFACE.md | 02 path rename only; 09 v2 section and ADRs; 15 the verified table; chained. OK |
| 10 to 15 | baseline.md | 10 creates; 11 to 14 append Resolved per harness; 15 adds Final; serial. OK |

Per task self-consistency: 01 to 15 each name their files, interfaces and tests; 04's stub defaults and 05's gate cases depend on 01's findings (verdict lines), which each task reads first. OK.
Task 01: dispatched (BASE bac179b, a78458f6754343e73, sonnet). Task 02: dispatched (BASE bac179b, a2995e95b505334b0, sonnet). Waiting on both: every other task blocks on 01 or 02.
Task 02: implemented bac179b..d1c04d2 (DONE). conformance opencode --free row 09 fails on base and head alike (2.0.18, pre-existing). Lenses: no tripwire matched (rename). Reviewer dispatched.
Task 02: minor (deferred): README.md:180 tree still says `opencode: fx.js` for the source file; should be fx-opencode-v1.js.
Task 02: minor (deferred): README.md and INSTALL.md ASCII tables/diagrams lose column alignment with the longer plugin name.
Task 02: ⚠️ resolved by controller: conformance opencode --free on bac179b (detached): 5 pass, 1 fail (row 09), same as head: pre-existing.
Task 02: complete (commits bac179b..d1c04d2, review clean, 2 minor deferred)
Task 01: implemented d1c04d2..7d3db5b (DONE_WITH_CONCERNS). Verdicts: 1-10 proven (incl. layer 1 call-id lookup, layer 3 clean throw, preamble reaches subagents, policies block), 11 disproven.
Ruling: probe 11 accepted as a stated limit: an agent the user defines in config is applied after fx's transforms, so fx's skill-deny rules do not reach it; it lists fx-audit, and the evaluate backstop rejects the call. Why: ADR-0026, the user's own definition wins. Cost if wrong: a user-defined agent sees the hidden lanes listed; task 09 states it in INSTALL.md, caught by task 13's row 13.
Task 01: reviewer dispatched. Task 03: dispatched (BASE 7d3db5b).
Task 01: minor (deferred): Q3 "parallel calls: before precedes evaluate" claim has no cited evidence; cite or soften.
Task 01: minor (deferred): Q3 "resources split only on pipes and ;" generalises from one pipe and one heredoc sample; reword as observed.
Task 01: minor (deferred): Q11 gap not tested with a global permissions skill-deny rule (Q7 suggests it would hide for config agents); state untested.
Task 01: minor (deferred): Q8 verdict claims TUI reach; TUI not probed.
Task 01: ⚠️ resolved by controller: no file under /tmp or the real OpenCode data and config dirs contains the key (grep -F), apart from the key file itself.
Task 01: complete (commits d1c04d2..7d3db5b, review clean, minors deferred)
Task 03: implemented 7d3db5b..1d64fca (DONE_WITH_CONCERNS: nightly opencode-v2 entries red until task 07, covered by the finding 16 ruling). Lenses: security tripwire (read-only agent permission rules in toOpencodeV2Agent). Reviewer + security lens dispatched.
Task 04: dispatched (BASE 1d64fca).
Task 03: minor (deferred): v2 converter allows unverified `list` action for Glob (lib/agent-dialects.js:86).
Task 03: minor (deferred): opencode-v2.md tool vocabulary omits write and patch and lacks cites for glob, grep, edit.
Task 03: minor (deferred): agent gate never exercises the edit/shell allow branches of toOpencodeV2Agent.
Task 03: minor (deferred): uneven comment wrap at lib/agent-dialects.js:79-80.
Task 03: ⚠️ resolved by controller: nightly v2 entries red until task 07, ruled on as finding 16 (the branch merges only after task 15). Waiting on the security lens before completing.
Task 04: implemented 1d64fca..d85e060 (DONE_WITH_CONCERNS: execute prompt shape per probe Q8; hiding proven via debug agents permissions since skill.list is unfiltered; Q11 limit as ruled). Lenses: silent-failure (guarded requires, preamble fallback) and security (evaluate deny, permission rules on every agent). Reviewer + both lenses dispatched.
Ruling: task 05 dispatched while task 04's review runs; any 04 fix round waits for 05 to return (same file). Cost if wrong: a 04 fix lands on 05's edits, caught by both tasks' gates in the fix round.
Task 05: dispatched (BASE d85e060).
Task 03: security lens 1 Important, 1 Minor (findings/03-lens-security.md). Important: session-level permissions (merged after agent rules) can widen fx's read-only agents when a host sets them.
Ruling: the fix belongs in the plugin, not the converter: the permission evaluate hook denies any non-read action evaluated for an fx read-only agent (ev.agent in READ_ONLY_AGENTS), so no later-merged rule can widen it. It joins task 04's fix round (same file as task 05), dispatched when task 05 returns. Task 03 completes with the finding moved there. Why: the converter cannot see session rules; the hook runs on every evaluation. Cost if wrong: read-only agents widenable by a host, caught by the task 04 fix round's gate case.
Task 03: minor (deferred): v2 converter drops v2's default `read *.env` ask rules (parity with v1).
Task 03: complete (commits 7d3db5b..1d64fca, review clean; lens Important moved to task 04's fix round)
Task 04: minor (deferred): load-failure fallback and a throwing session.prompt in execute have no test case
Task 04: minor (deferred): evaluate backstop denies a hidden lane even when an agent's own rule allowed it; task 05 to keep precedence consistent with ADR-0026
Task 04: minor (deferred): hook failures only reach stderr via console.error, which a TUI may not show
Task 04: ⚠️ resolved by controller: skill.list is unfiltered (probe Q7), so hiding is proven through debug agents permissions, as the report did; the acceptance line was written before the probe. Ruling: accept the report's evidence.
Task 04: silent-failure lens 6 Important, 1 Minor (findings/04-lens-silent-failure.md). Waiting on the security lens, then fix round 1 (with task 03's session-permission Important) runs once task 05 returns.
Task 05: implemented d85e060..605dd15 (DONE_WITH_CONCERNS). Layer 1 shipped (call-id lookup in evaluate). Lenses: security (the guard) and silent-failure (fail-closed and fail-open catches). Reviewer + both lenses dispatched.
Ruling: `echo "git reset --hard" | sh` passes lib/git-guard.js on every runtime: pre-existing, not introduced by this build (the guard is shared and unchanged). Recorded for the completion report as a follow-up; task 09 states it among what the v2 guard does not catch. Cost if wrong: none added by this build.
Task 06: dispatched (BASE 605dd15), in parallel with task 04's fix round later (disjoint files: installer and tests vs the v2 plugin).
Task 04: security lens 2 Minor (findings/04-lens-security.md): no Critical or Important. Its "contradiction" note (the evaluate hook denies a hidden lane even when the user allowed it) joins the fix round as wording: the hook's evaluate effect is final (permission.ts:173-188), so the backstop narrows; the test's claim is corrected to match and ADR-0026's limit is stated in task 09.
Task 04: minor (deferred): hiding a lane stops the skill tool, not a direct read of SKILL.md; steering, not a security boundary.
Task 04: fix round 1/5 dispatched: silent-failure 1 to 6 (Important) plus task 03's session-permission Important, resuming a2a74e26723613999, FIX_BASE 605dd15.
Task 05: minor (deferred): commands Map entry freed only in execute.after; a denied or aborted call may leak its id.
Task 05: minor (deferred): withGuard copies a hand-listed set of top-level dirs; a new dir breaks it for an unrelated reason.
Task 05: minor (deferred): policy samples use `x` placeholders and depend on `git init -b main` for base-branch refusals.
Task 05: review spec ❌ 1 Important (a policy pattern blocks a commit whose message merely mentions --no-verify, which the guard allows; policies cannot be overridden). Fix round queued, batched with the two lens results (lib/opencode-v2-policies.js and its test: disjoint from task 04's fix round and task 06).
Task 05: silent-failure lens 1 Critical, 1 Important, 2 Minor (findings/05-lens-silent-failure.md); citations checked at 605dd15. Critical: a failed evaluate-hook registration leaves every shell command unguarded with no signal. Task 05 fix round queued after task 04's fix round returns (same plugin file).
Task 04: fix round 1 committed 605dd15..35e801a. Scoped re-review dispatched.
Task 05: fix round 1/5 dispatched (resumes a316027550184bc4e, FIX_BASE 35e801a): review Important (policy over-block) + silent-failure Critical 1 and Important 2. Security lens on 05 still running; its findings join a later round if any.
Task 04: fix round 1/5 (8 addressed, 0 open: none; commits 605dd15..35e801a)
Task 04: minor (deferred): read-only evaluate check fails open if plant-roles fails to load or realpath(references) throws (plugins/fx-opencode-v2.js:54-57, 154-163)
Task 04: minor (deferred): a failed context-hook registration reaches the session only through denial messages (plugins/fx-opencode-v2.js:78)
Task 04: complete (commits 1d64fca..d85e060, fix 605dd15..35e801a, 1 fix round, minors deferred)
Task 05: fix round 1 committed 35e801a..d149944 (also dropped mid-command tag -d and --delete forms for the same quoted-flag over-block). Registration-failure cases not seen RED alone: the re-review checks them against 35e801a. Scoped re-review dispatched on opus (Capable because: security-critical guard).
Task 05: fix round 1/5 (3 addressed, 0 open: none; commits 35e801a..d149944)
Task 05: minor (deferred): push policies `git push * --force *`, `* main *`, `* -d *` still block a guard-allowed `git push -o "<text holding the token>"`
Task 05: minor (deferred): evaluate hook body in plugins/fx-opencode-v2.js:147-201 not reindented after the try wrap
Task 05: RED verified by the re-review on 35e801a: array-command, evaluate-registration, both-fail and before-registration cases each fail on the old plugin. Waiting on task 05's security lens before completing.
Task 06: implemented d149944..34a3c72 (DONE_WITH_CONCERNS: top-level subagent_depth removed on v2 only when it equals fx's own 2; experimental.subagent_depth left behind on a v1 run after v2, indistinguishable from the user's). 1.18.25 debug config exits 0 after --major 2 then --major 1. Lenses: security (the installer writes the guard's policy layer into the user's opencode.json). Reviewer + lens dispatched.
Task 07: dispatched (BASE 34a3c72).
Task 05: security lens 2 Important, 4 Minor (findings/05-lens-security.md). Fix round 2/5 dispatched (resumes a316027550184bc4e, FIX_BASE 34a3c72): 1 (key the recorded command by session and call id, not call id alone; deny if either part is missing), 2 (also run inspect on each parsed piece in ev.resources, which is post-rewrite, and deny if either refuses), plus Minor 3 (a null source denies).
Task 05: minor (deferred): shell calls OpenCode parses to zero commands never reach evaluate (v2 behaviour, unprobed).
Task 05: minor (deferred): test wildcard copy lacks v2's win32 case and slash handling; push-option free text over-blocks.
Task 06: minor (deferred): experimental/policies shape refusals fire in merge_opencode_json after writes begin, not in the checks phase
Task 06: minor (deferred): load_opencode_commands still runs on 2.x and can fail a v2 install needlessly
Task 06: minor (deferred): live.sh major-mismatch check has no test beyond bash -n
Task 06: minor (deferred): installer missing-binary detection path is untested
Task 06: review spec ❌ 1 Important (v1 then v2 then v1 leaves experimental.subagent_depth 2 and an empty experimental object); security lens 2 Important, 3 Minor (findings/06-lens-security.md). Fix round 1/5 dispatched (resumes a1972953a548d7818, FIX_BASE 34a3c72).
Task 05: fix round 2 committed 34a3c72..44ab55b (key session+message+call id; inspect on resources; null source denies). Two new cases not seen RED alone: the re-review checks them against 34a3c72. Re-review dispatched on opus (Capable because: security-critical guard).
Task 05: fix round 2/5 (2 addressed, 0 open: none; commits 34a3c72..44ab55b)
Task 05: minor (deferred): the no-sessionID test passes on the old plugin too (call_1 already forgotten); re-point it at a live recorded id
Task 05: minor (deferred): nosrc assertion separated from its evaluation by the new two-session and rewrite blocks
Task 05: complete (commits d85e060..605dd15, fixes 35e801a..d149944 and 34a3c72..44ab55b, 2 fix rounds, minors deferred)
Task 06: fix round 1 committed d12d931 (FIX_BASE 44ab55b; task 05's 44ab55b sits between). Ruling: installs made before the ownership record count as the user's (nothing to remove). Why: fx is pre-production, no such installs outside this branch's tests. Cost if wrong: one stale depth or policy left on a dev machine. Scoped re-review dispatched.
Task 06: fix round 1/5 (5 addressed, 0 open: none; commits 44ab55b..d12d931)
Task 06: minor (deferred): ownership record rewritten on every run even when unchanged
Task 06: minor (deferred): pre-round-1 installs have no record, so their depth and policies are treated as the user's
Task 06: complete (commits d149944..34a3c72, fix 44ab55b..d12d931, 1 fix round, minors deferred)
Task 07: implemented 5096d82..5790b9b (DONE_WITH_CONCERNS). v2 free rows 5 pass, 1 fail (row 14) on the committed tree; v1 free rows unchanged (row 09 fails on this 2.x machine, pre-existing). Deviations: plugin route links the plugin into plugins/ (2.0.18 refuses a bare .js path), rows 15 and 18 dispatch from `build` on v2 (unverified live), added lib/opencode-v2.sh and edited events.test.js; events.js v2 parser had no RED.
Task 04: reopened by a real-binary finding from task 07: `await ctx.command.list()` inside setup (plugins/fx-opencode-v2.js:125 at 5790b9b) never resolves on 2.0.18, so commands never register and every hook after it, including the git guard's evaluate and execute.before hooks, never registers. The stub gate could not see it. Checked: the line is there.
Task 04: fix round 2/5 dispatched (resumes a2a74e26723613999): register the guard hooks before any await on the runtime; never await a runtime list during setup without a bound; gate case with a command.list that never resolves; prove on the real binary with row 14 and a guard check. Task 07 reviewer dispatched in parallel (read-only).
Task 04: fix round 2 committed 5790b9b..717b35b: guard hooks register first; setup never lists commands. v2 free rows 6 pass, 0 fail. Real 2.0.18 live run: git push --force origin main refused by fx's guard reason. Re-review dispatched.
Task 04: minor (deferred): a user's same-named command vs fx's depends on transform order (Map keyed by name; last add wins); unprobed.
Task 04: fix round 2/5 (1 addressed, 0 open; commits 5790b9b..717b35b)
Task 04: minor (deferred): no gate for a never-resolving permission.hook/tool.hook registration; later hooks would stall sequentially
Task 04: minor (deferred): fx commands always added; precedence versus a user's same-named file command unprobed
Task 04: complete again (fix round 2 5790b9b..717b35b addressed)
Task 07: minor (deferred): live.sh plugin-route setup duplicates oc2_setup's plugin branch in lib/opencode-v2.sh.
Task 07: minor (deferred): events.js v2 parser fixture is synthetic with no watched RED; check it against task 10's first real log.
Task 07: minor (deferred): live.sh v2 plugin route ignores FX_OPENCODE_PLUGIN_ENTRY that the v1 route honours.
Task 07: minor (deferred): design section 4 and probe Q1 still say `file://` plugin entry; 2.0.18 needs a plugins/ link.
Task 07: minor (deferred): check-all runs only the installer route; re-run rows 13 and 14 with FX_OPENCODE_ROUTE=plugin after task 04 fix round 2.
Task 07: ⚠️ resolved by controller: rows 13 and 14 on opencode-v2 pass on both routes after 717b35b (plugin route 2/2, installer route 2/2, free). `build` as the dispatch agent in rows 15 and 18 and row 15's depth on the plugin route are live-only: Ruling: task 10's live run confirms them; a FAIL there goes to task 13. Cost if wrong: rows 15 and 18 need a v2-specific dispatch agent, caught by task 10.
Task 07: complete (commits 5096d82..5790b9b, review clean, minors deferred)
Task 08: dispatched (BASE 717b35b).
Task 08: implemented 717b35b..1a4b0f5 (DONE_WITH_CONCERNS). Row 01 passes live on codex (429 on free Qwen, passed on DeepSeek), opencode, opencode-v2, claude-code (Haiku). Fixed task 07's opencode-v2 live run (2.0.18 rejects --dir). Added tests/conformance/live-openrouter.test.sh. Controller leak check: key absent from tree, branch history, /tmp and CLI data dirs. Lenses: security (credential handling) and silent-failure (provider-error fallback). Reviewer + both lenses dispatched.
Task 09: dispatched (BASE 1a4b0f5).
Task 08: silent-failure lens 1 Critical, 2 Important, 2 Minor (findings/08-lens-silent-failure.md). Critical: a no-output timeout is always classed a provider error, so a product hang could pass on the fallback or become a GAP. Fix round waits for the review and security lens.
Task 08: minor (deferred): run.sh:758 dead `[ -z "$suffix" ]` guard.
Task 08: minor (deferred): Claude Code 75 gets no re-run and FX_LIVE_MODEL is silently ignored for it under the switch; document or fail loudly.
Task 08: minor (deferred): jail-probe "without the switch" case does not unset FX_LIVE_PROVIDER.
Task 08: minor (deferred): rc 124 with empty stdout becomes 75 then GAP; no test for the 124, 401 or result-is_error paths through live.sh.
Task 08: minor (deferred): live.sh else-block not re-indented around the credential case.
Task 08: minor (deferred): sessionModel takes the first matching line; a forged stdout line could win for Codex turn_context.
Task 08: review 1 Important (isProviderError over-matches, same root as the lens's finding 2). Waiting on the security lens, then one fix round.
Task 09: implemented 1a4b0f5..d878184 (DONE_WITH_CONCERNS: check-prose fails only on AGENTS.md, pre-existing on main). Lenses: none (docs). Reviewer dispatched.
Task 08: security lens 1 Important, 3 Minor (findings/08-lens-security.md). Important: the key rides bwrap's argv via --setenv, visible in any process listing during a run.
Task 08: fix round 1/5 dispatched (resumes a794ad81dac8ec9c0, FIX_BASE d878184): security 1 to 4, silent-failure 1 to 3, review Important.
Task 09: minor (deferred): INSTALL.md v2 section never names the installed link plugins/fx.js; manual route gives no link name.
Task 09: minor (deferred): zero-command and session-permission limits are source-read, not probed; word them so.
Task 09: minor (deferred): What is verified opencode 2.0.18 row stale (5 pass 1 fail vs 6 pass 0 fail after task 07); task 15.
Task 09: minor (deferred): README.md:237 hiding mechanism sentence is 1.x only; add the 2.x mechanism.
Task 09: review spec ❌ 2 Important (ADR-0037 misdescribes layer 3 and the external_directory rule). ⚠️ resolved by controller: the /credits precondition is a step of task 10 (a process step, not code); ADR-0038's timeout rule is what task 08's fix round implements now. Fix round 1/5 dispatched (resumes aad2cab786a23d34f).
Task 09: fix round 1/5: controller re-review (0 production lines, 19 doc lines): 2 addressed, 0 open
Task 09: complete (commits 1a4b0f5..d878184, fix d878184..6933924, 1 fix round, controller re-review)
Task 08: fix round 1 committed 56dbe40..f0c5948. Row 01 live: claude-code (Haiku), opencode-v2 (qwen), codex (1 pass, 1 on fallback). Controller leak check: key absent from tree, history, /tmp. Two new cases not RED on the old code (503-timeout GAP already a GAP; fail-closed scan covered only by the unit case). Re-review dispatched on opus (Capable because: security-critical credential handling).
Task 08: fix round 1/5 (8 addressed, 0 open: none; commits 56dbe40..f0c5948)
Task 08: minor (deferred): live.sh KEYDIR via mktemp -d honours TMPDIR; under a kept path such as /var/tmp the key file is readable by install and export calls in the jail.
Task 08: minor (deferred): provider-error regex accepts JSON "code": 5xx on any CLI stderr line; prefer status and statusCode only.
Task 08: minor (deferred): run.sh passes OPENROUTER_API_KEY in the environment to free rows, which run opencode unjailed.
Task 08: complete (commits 717b35b..1a4b0f5, fix 56dbe40..f0c5948, 1 fix round, minors deferred)
Task 10: dispatched (BASE after ledger commit).
Task 10: interim: codex live run in progress (tracked by the implementer), logs /tmp/fxlogs-opencode-v2; opencode, opencode-v2, claude-code follow. Waiting on it: every later task blocks on the baseline.
Task 10: implemented dba6528..703a0e2 (DONE_WITH_CONCERNS). Baseline: codex 10 pass (1 fallback), 5 fail (02, 07, 12, 15, 17), 3 gap (13, 14, 18); opencode 1.18.25 18 pass (2 fallback); opencode-v2 2.0.18 10 pass, 7 fail (02, 04, 06, 07, 08, 15, 17), 1 gap (18); claude-code rows 01, 02, 06, 07, 08, 16: 6 pass. Logs /tmp/fxlogs-opencode-v2. Reviewer dispatched.
Task 10: minor (deferred): `(config)` model label on v2 rows 04, 15, 17 not explained in the baseline header.
Task 10: minor (deferred): codex 13/14 GAP reason cites stale "task 22 part B" text.
Task 10: minor (deferred): baseline records exact total_credits balance, spec needs yes/no.
Task 10: review spec ❌ (2 Important): codex 07, 15, 18 were stopped by 429s inside subagent spawns, which baseline.md's excerpts omit; v2 rows 15 (FAIL) and 18 (GAP) are inconclusive and not marked. Fix round 1/5 dispatched (resumes a3f5b2be0f6d9da10): baseline.md annotations only.
Ruling: the runner does not classify a provider error raised inside a subagent spawn (the 429 shows in the child, not the CLI's top-level error stream), so such rows FAIL instead of falling back. That is a runner bug: task 11 fixes it in tests/conformance (shared by every harness, so it is the one shared change task 11 is allowed, and it must keep every harness's free rows green), before re-running Codex's rows. Cost if wrong: rate-limit noise read as product failures, caught by the 2-of-2 pass rule in tasks 11 to 14.
Task 10: fix round 1/5: controller re-review (0 production lines, 18 doc lines): 2 addressed, 0 open
Task 10: complete (commits dba6528..703a0e2, fix 703a0e2..5869cc5, controller re-review)
Ruling: v2 rows that end in "Session interrupted: shutdown" after the model calls the question tool are a headless-runner cause (opencode run has no answerer), routed to task 13 with the build-dispatch question. Cost if wrong: a real v2 plugin failure hides behind it, caught by task 13's 2-of-2 rule.
Task 11: dispatched (BASE after ledger commit).
Task 11: implemented 83eed58..8e928f1 (DONE_WITH_CONCERNS). Codex live: 02, 07, 12, 13, 14, 17, 18 pass 2 of 2 on qwen; 15 passes 2 of 2 on deepseek (qwen nests one level only, max_depth = 2 set); codex 13 and 14 removed from expected-gaps. Runner: subagent and grandchild 429s now fall back.
Ruling: the Codex addressing bug (Codex 0.155.1 expands `$fx:fx-<name>` for a plugin skill, not `$fx-<name>`; the codex ADDRESSING entry in lib/preamble.js, lib/preamble.test.js:43, README.md:221,273, INSTALL.md:90,457 say the bare form) is fixed in task 11's fix round: it is the Codex harness's own entry. Cost if wrong: Codex models invoke a lane by a name that does not resolve, caught by rows 05 and 14 on codex.
Ruling: the release-version bump is task 15's (one bump for the whole branch, after every shipped file has changed). Cost if wrong: none; the gate catches it.
Task 11: lenses: silent-failure (runner provider-error classification in tests/conformance). Reviewer + lens dispatched.
Ruling: task 12 (Phase B: OpenCode v1) needs no implementer: baseline.md shows 18 PASS, 0 FAIL, 0 GAP on 1.18.25 (2 on the fallback model, recorded). Its acceptance ("every v1 non-PASS has a Resolved entry") holds vacuously; the 2-of-2 rule applies to fixed rows only. Task 15 re-runs v1 because task 11 changed the shared runner (a file the harness loads). Cost if wrong: a v1 regression from task 11's runner change, caught by task 15's re-run.
Task 12: complete (no failures to fix)
Task 13: waits for task 11's fix round (both edit lib/preamble.js; one OpenRouter key's rate limit).
Task 11: silent-failure lens 1 Critical, 4 Important (findings/11-lens-silent-failure.md). Critical: any row failure in a log holding a child 429 falls back, so a real product failure can pass on the fallback. Fix round waits for the review.
Task 11: minor (deferred): row 12 codex task A now probes the shell apply_patch path on chat models; note in row comment that the function-tool path is covered only by free gate tests.
Task 11: minor (deferred): rows 15 and 18 on Codex depend on a runner-only `[agents] max_depth = 2` that fx cannot ship; task 15 states it in INSTALL.md.
Task 11: minor (deferred): live logs for the task 11 PASS runs sit in a session scratchpad; the report names no path and /tmp/fxlogs-opencode-v2 holds only baseline logs.
Task 11: minor (deferred): row 17 on codex fails on the deepseek fallback; ruling is non-standard, record as a known limit.
Task 11: minor (deferred): SHELL_APPLY_PATCH does not match a patch run through `bash -c`; lane check fails open there.
Ruling: a live run that saw a provider error anywhere (top level, child, grandchild) is inconclusive whatever its assertions said; it is re-run (on the fallback model where one exists), and only a clean run (no provider error anywhere) counts toward a verdict or the 2-of-2 rule. A detector that cannot read the log makes the run inconclusive too. Why: silent-failure Critical 1 and Important 2, 3. Cost if wrong: more re-runs, more tokens; caught by nothing, accepted.
Ruling: Codex `max_depth = 2` is test config; fx cannot ship user config, so on default Codex config a V1 model cannot nest; task 15 states it in INSTALL.md.
Task 11: fix round 1/5 dispatched (resumes ade3732ff7bd14613): lens 1 to 5, the Codex addressing bug, and re-running every task-11 row whose 2-of-2 included a run with a provider error.
Task 11: fix round 1 committed 8e928f1..f08d9de: inconclusive rule (any provider error anywhere), hook lane check on wrapped apply_patch, `$fx:fx-` addressing on the Codex entry and its docs, clean 2-of-2 re-runs for every Codex row (logs in the session scratchpad logs/<row>-r1|r2|r3).
Ruling: on Codex rows 12 and 17, a DeepSeek fallback FAIL caused by the model calling the `apply_patch` function Codex does not provide (after a primary 429) is a model-capability limit of the fallback, not an fx result: the row is re-run on the primary model when the rate limit clears, and only a clean primary run decides. Task 15 applies this when reading its re-run. Cost if wrong: a real fx failure on those two rows would surface only on qwen, which is where it passes 2 of 2 today.
Task 11: scoped re-review dispatched.
Ruling: task 13 dispatched (BASE f08d9de) while task 11's re-review runs (read-only, no key use). If task 11 needs a second fix round touching the shared runner, it waits for task 13 to return. Cost if wrong: a runner conflict, caught by both tasks' conformance unit tests.
Task 11: fix round 1/5 (6 addressed, 0 open: none; commits 8e928f1..f08d9de)
Task 11: minor (deferred): SHELL_APPLY_PATCH matches `env grep apply_patch` (harmless false positive, advice-only)
Task 11: minor (deferred): rows 12 and 17 end FAIL on the deepseek fallback when the primary 429s (inconclusive=1 shown in the verdict)
Task 11: complete (commits 83eed58..8e928f1, fix 8e928f1..f08d9de, 1 fix round; Codex rows 02, 07, 12, 13, 14, 15, 17, 18 each 2 clean live passes)
Task 13: implemented f08d9de..6a6f8b2 (DONE_WITH_CONCERNS). v2 rows 02, 04, 06, 07, 08, 15, 17, 18 each 2 clean live passes (15, 17, 18 on deepseek: the free daily quota ran out). Causes: denial messages lacked the `[fx] ` prefix; events.js could not read a 2.0.18 session export; the `question` tool stalled headless runs (now denied in the OpenRouter scratch config). Changes for review: the plugin grants built-in `general` the subagent permission (mirrors v1's task grant, ADR-0026); rows 06 to 08 use `git -C . branch -D` on v2 because the policy layer answers plain `git branch -D` without fx's reason. Lenses: security (a permission grant). Reviewer + lens dispatched.
Ruling: task 14 (Phase B: Claude Code) needs no implementer: baseline.md shows rows 01, 02, 06, 07, 08, 16 all PASS on anthropic/claude-haiku-4.5 through OpenRouter, no fallback, no gap. Acceptance holds vacuously. Task 15 re-runs those six rows because tasks 11 and 13 changed the shared runner and lib/preamble.js (files Claude Code loads). Cost if wrong: a regression from those changes, caught by task 15's re-run.
Task 14: complete (no failures to fix)
Task 13: minor (deferred): question deny is OpenRouter-only; llamacpp v2 headless runs are unprotected and baseline Resolved does not say so.
Task 13: minor (deferred): events.js text() gained `message` for all harnesses and the 2.0.18 export state shape is unrecorded in probe-findings Q10 and the v2 reference.
Task 13: minor (deferred): INSTALL.md guard layer 2 must state that plain-spelling refusals show only the generic policy text and that rows 06 to 08 use `git -C .` on v2.
Task 13: minor (deferred): row 06 2-of-2 mixes qwen and deepseek runs (recorded).
Task 13: review 1 Important: the general subagent grant overwrites the user's own subagent rules, against ADR-0026 (v1 has the guard). Fix round waits for the security lens.
Task 13: security lens 1 Important (same root as the review's: a user's narrow subagent rule on general does not stop fx's * allow), 2 Minor. Fix round 1/5 dispatched (resumes a91e99aad11b442d7).
Task 13: fix round 1 committed 6a6f8b2..9ffccff: grant only with no user subagent or * rule (read from opencode.json in the global, project and .opencode dirs; unreadable or jsonc means no grant); lens subagent case; llamacpp question deny; INSTALL note. Rows 15 and 18 pass live on deepseek. Re-review dispatched on opus (Capable because: security-critical permission grant).
Task 13: fix round 1/5 (2 addressed, 2 open: grant guard misses .jsonc, ancestor dirs, OPENCODE_CONFIG/_CONTENT, 1.x permission/tools keys and agent markdown; narrow user subagent rule in those sources still gets fx's * allow; commits 6a6f8b2..9ffccff)
Task 13: minor (deferred): readFileSync on a FIFO named opencode.json hangs plugin setup; stat isFile first and treat a non-file as answered.
Task 13: minor (deferred): ponytail comment cuts the config-source corner on a permission grant; remove it once every source is covered.
Ruling: drop fx's `subagent` grant on `general` for OpenCode v2. Why: honouring ADR-0026 needs every config source 2.0.18 merges (.jsonc, ancestors, OPENCODE_CONFIG and _CONTENT, 1.x keys, agent markdown); re-implementing that merge in the plugin is fragile, and the owner's standing rule is to drop a capability rather than risk breakage. On v2 the user enables nested dispatch with one rule of their own; INSTALL.md says how. The conformance runner's v2 scratch config adds that rule (as the user's answer) so rows 15 and 18 keep testing nesting. Cost if wrong: v2 users must add one line for nested dispatch that v1 grants by default; stated in INSTALL.md and the v2 harness reference.
Task 13: fix round 2/5 dispatched (resumes a91e99aad11b442d7).
Task 13: fix round 2 committed 9ffccff..b06a3ef: grant and config-reading removed; v2 scratch config carries the user rule agents.general.permissions subagent * allow (both provider paths); docs and ADR-0036 updated; rows 15 and 18 pass live on deepseek. Re-review dispatched.
Task 13: fix round 2/5 (2 addressed, 0 open; commits 9ffccff..b06a3ef)
Task 13: complete (commits f08d9de..6a6f8b2, fixes 6a6f8b2..9ffccff and 9ffccff..b06a3ef, 2 fix rounds; v2 rows 02, 04, 06, 07, 08, 15, 17, 18 each 2 clean live passes, 15 and 18 re-run with the user rule)
Task 15: dispatched (BASE after ledger commit).
Task 15: interim: live re-runs in progress (codex, opencode 1.18.25, opencode-v2, claude-code), tracked by the implementer. Waiting on it: the coverage audit and final review follow.
Task 15: implemented debb566..b09e442 (DONE_WITH_CONCERNS). Final: claude-code 6/6; opencode 1.18.25 18/18 (12 on fallback); opencode-v2 2.0.18 18/18 (12 on fallback); codex 16/18, rows 12 and 17 FAIL on the deepseek fallback after the free primary 429'd the whole run. check-all: AGENTS.md check-prose and check-prose-explicit-path pre-existing (identical on 2c0e8d2); two unbalanced-parenthesis findings files were the controller's (reworded, gate OK); conformance-free-opencode-v2 needs 2.x first on PATH (passes with it); everything else ALL GREEN. Version 0.2.5.
Ruling: Codex rows 12 and 17 re-run by the controller on `qwen/qwen3.8-27b` (the paid listing of the same primary model, no free-tier rate limit), per the earlier ruling to decide them on the primary: run 1 PASS both, run 2 PASS both, model=qwen/qwen3.8-27b, no inconclusive attempts, no key in the logs (scratchpad logs15c). Codex final: 18/18. Cost if wrong: the paid listing differs from the free one, caught by nothing; same model id family and weights per OpenRouter's listing.
