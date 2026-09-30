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
