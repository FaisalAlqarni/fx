# fx ledger: plan: docs/plans/2026-09-29-lean-review/plan.md

Worktree: /development/fx/.worktrees/lean-review on lean-review (from main 68ba929). setup ran clean.

Ruling: no baseline test_all before task 01. Why: owner standing rule (full suite once at end) and this plan's own design (§4); check-all runs once in task 11. Cost if wrong: a pre-existing gate failure looks introduced at task 11, caught by task 11's run against main if needed.
Ruling: per-task lenses follow this plan's tripwire rule (security, database, silent-failure on narrow triggers), not the installed plugin's broad table. Why: owner ruling this session (design §1). Cost if wrong: a broad-trigger defect found later, caught by the final branch review with every lens.
Ruling: implementers and reviewers run on the standard tier (sonnet); lenses on their pinned tiers. Most capable only with a stated reason.
Ruling: every dispatch starts by invoking caveman full and ponytail full and using repowise before reading files. Why: owner standing rule (memory: subagent-modes, subagent-speed).

## Pre-flight conflict scan

Pairs sharing a file:
| Tasks | Shared file | Produces / consumes | Found |
|---|---|---|---|
| 01, 02, 03, 04 | skills/fx-implement/SKILL.md | 01 rewrites Lens dispatch; 02 §2, report, fix loop, exit gate, reading rule, rationalizations; 03 model selection, fix loop rounds 4-5, final review; 04 ledger section, completion report | distinct sections; chained 01>02>03>04, serial. OK |
| 01, 03, 08 | skills/fx-review/SKILL.md | 01 table + task blurb; 03 branch-mode reason line; 08 lens brief mode | distinct sections; 08 blocked by 03. OK |
| 02, 03 | skills/fx-implement/fix-loop.md | 02 controller re-review rule; 03 rounds 4-5 reason note | distinct paragraphs; 03 blocked by 02. OK |
| 02, 03 | skills/fx-implement/implementer-prompt.md | 02 Tests field; 03 model placeholder | distinct lines. OK |
| 03, 07 | task-reviewer-prompt.md, fx-review/reviewer-prompt.md | 03 model placeholder; 07 content | 07 blocked by 03. OK |
| 04, 05 | lib/preamble.test.js | 04 worst fixture rulings; 05 companions block + alone budget | 05 blocked by 04. OK |
| 03, 04 | docs/adr/0031 | 03 creates with placeholder section; 04 fills it | 04 blocked by 03. OK |
| 08, 09 | tests/gates/lens-content.test.js | 08 creates; 09 extends | 09 blocked by 08. OK |
| 01,02,03,06,07,08 | scripts/check-all | each adds one run line after a named predecessor, with fallback anchor | OK |
| 07, 09 | ADR-0034 cites 07 items | 09 blocked by 07. OK |
| 10, 11 | none | 11 does not wait on 10 | OK |

Per task self-consistency:
| Task | Tests vs code | Files vs later touches | Found |
|---|---|---|---|
| 01 | test pins header, rows, blurb, span | SKILL.md later edited by 02-04 outside span | OK |
| 02 | test collapses whitespace; anchors match inserted text | implementer-prompt Tests field keeps "Tests" (return-contract) | OK |
| 03 | route() cases match rules; hook JSON; fail-open copy test; probe after GREEN | templates keep return-contract markers | OK |
| 04 | ruling tests filter "- Ruling:" lines; budget via preamble.test | ADR-0031 exists from 03 | OK |
| 05 | companions tests; alone budget uses companions "" | none | OK |
| 06 | regex needs raw newlines (not collapsed): test reads raw | none | OK |
| 07 | collapsed read | codex toml regenerated | OK |
| 08 | collapsed read; fx-review mode line | codex toml regenerated | OK |
| 09 | collapsed read; section slices by headings | check-reference-leaves: web-polish must not name web.md | OK |
| 10 | live rows may be pending | INSTALL.md only | OK |
| 11 | check-all once | README only | OK |

Scan clean: no rulings needed beyond the above.
