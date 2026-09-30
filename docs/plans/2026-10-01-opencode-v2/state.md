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
