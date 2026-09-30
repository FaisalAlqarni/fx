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
Task 01: dispatched (BASE 6dc3889, implementer a051b21f8e7b431c0, sonnet). Waiting on it: implementers run serially in one worktree.
Task 01: implemented 6dc3889..2995454 (DONE). Lenses: no tripwire matched (skill prose, a gate test, check-all). Reviewer dispatched (abbf679e5b72ad142).
Ruling: dispatch task 02 while task 01's review runs; any task 01 fix round waits until task 02's implementer returns, so two writers never share the worktree. Why: frontier otherwise idle. Cost if wrong: a 01 fix lands on top of 02's SKILL.md edits, caught by task 02's and 01's gate tests both re-run in the fix round.
Task 02: dispatched (BASE 2995454).
Task 01: minor (deferred): fx-review/SKILL.md:82 "Lenses: by the trigger table below" does not say which column applies per mode.
Task 01: minor (deferred): fx-review/SKILL.md:292 red flag "Firing all four lenses" is stale (five lenses, new per-task rule).
Task 01: ⚠️ resolved by controller: return-contract, no-runtime-addressing and check-prose pass on 2995454 (detached checkout).
Task 01: complete (commits 6dc3889..2995454, review clean, 2 minor deferred)
Task 02: implemented 2995454..8db5e3f (DONE_WITH_CONCERNS: observations only). Lenses: no tripwire matched (skill prose, gate test).
Task 02: minor (deferred): skills/fx-implement/COVERAGE.md:102 maps "Baseline before work" to a rule this plan removed.
Task 02: minor (deferred): SKILL.md greenfield paragraph still says "the baseline is 0 tests"; wording predates the dropped baseline run.
Task 03: dispatched (BASE 8db5e3f), while task 02's review runs (same ruling as task 02).
Task 02: minor (deferred): COVERAGE.md:102 maps W118:W121 to the deleted baseline rule; re-map or drop.
Task 02: minor (deferred): SKILL.md greenfield paragraph still says "the baseline is 0 tests"; drop the vestigial phrase.
Task 02: minor (deferred): fix-loop-shape.test.js gate slice is a fixed 1800 chars; use the next heading as the end bound.
Task 02: ⚠️ resolved by controller: fix-loop-shape, return-contract, tripwire-table, no-runtime-addressing, check-prose pass on 8db5e3f (detached checkout).
Task 02: complete (commits 2995454..8db5e3f, review clean, minors deferred)
Task 03: implemented 8db5e3f..bb25aff (DONE). Live probe: one=claude-sonnet-5-5, two=claude-sonnet-5-5, three=claude-opus-5-5; permissionDecision omitted (ADR-0031).
Task 03: lenses: silent-failure tripwire (fail-open catch in hooks/fx-pretooluse.js, lib/dispatch-route.js) and security tripwire (hook rewriting tool calls, permission path). Reviewer + both lenses dispatched.
Task 04: dispatched (BASE bb25aff), while task 03's review runs.
Task 03: minor (deferred): silent-failure lens: an opus-to-sonnet rewrite is not surfaced to the dispatcher (hooks/fx-pretooluse.js, lib/dispatch-route.js).
Task 03: minor (deferred): fx-review/reviewer-prompt.md model placeholder leaves the "final whole-branch review" sentence outside the closing bracket.
Task 03: minor (deferred): route() checks only model === 'opus'; an explicit fable or full model id bypasses the reason-line rule, unstated in ADR-0031.
Task 03: minor (deferred): claude-code.md routing paragraph says Agent only (hook also routes Task) and has an awkward line break.
Task 03: minor (deferred): security lens: hook returns the full tool input as updatedInput, which could overwrite another hook's Agent rewrite if Claude Code keeps the last one (unverified). Lens cited dispatch-route.js:170, a 25-line file: citation wrong, finding stands as Minor.
Task 03: ⚠️ resolved by controller: probe ids are in commit bb25aff's message (one=claude-sonnet-5-5, two=claude-sonnet-5-5, three=claude-opus-5-5); citations for silent-failure findings 1 and 2 checked at bb25aff (fx-pretooluse.js:43-45, :88-91).
Task 03: fix round 1/5 dispatched: 2 Important from silent-failure lens (findings/03-lens-silent-failure.md): the fail-open catches drop the error with no trace. Resumes implementer ade139f536603c66a. Lens findings: dispatched re-review required.
Task 04: implemented bb25aff..aed5128 (DONE). Lenses: silent-failure tripwire (catch-and-return-empty on file reads in lib/plan-state.js). Reviewer + lens dispatched alongside task 03's fix round (read-only).
Task 03: fix round 1 committed 809d811 (FIX_BASE aed5128, task 04's commit sits between). Scoped re-review dispatched. Task 05: dispatched (BASE 809d811).
Task 03: fix round 1/5 (2 addressed, 0 open: none; commits aed5128..809d811)
Task 03: minor (deferred): catch blocks use e.message, a non-Error throw would hit uncaughtException and deny (fx-pretooluse.js)
Task 04: minor (deferred): preamble worst-case fixture does not assert rulings render, budget test passes vacuously if rulings vanish.
Task 04: minor (deferred): dedupe before the 160-char cut can show two identical truncated lines.
Task 04: minor (deferred): rulings.md rulings not injected when no unfinished plan exists; ADR-0031 "every session start" is unqualified.
Task 03: complete (commits 8db5e3f..809d811 with task 04's aed5128 between, 1 fix round, minors deferred)
Task 04: ⚠️ resolved by controller: this build's own ledger predates the Standing rulings section; its rulings are plan-only and live in the log, so nothing needs carrying. Ruling: no action. Why: the section is for owner rulings that span plans. Cost if wrong: none for this build.
Task 04: silent-failure lens 4 Important, 1 Minor (findings/04-lens-silent-failure.md); citations checked at aed5128 (plan-state.js:65-67, 76, 83, 86, 108). Fix round 1/5 queued: runs when task 05's implementer returns (one writer at a time).
Task 04: minor (deferred): silent-failure lens: rulings travel only when an unfinished plan exists; undocumented in ADR-0031.
Task 05: implemented 809d811..943f8c5 (DONE). Lenses: silent-failure tripwire (.fx.json read catch falls back to default). Reviewer + lens dispatched. Task 04: fix round 1/5 dispatched (resumes a3ff7d2ba51f7b20c, FIX_BASE 943f8c5).
Task 05: minor (deferred): SURFACE.md does not document the new `companions` .fx.json key.
Task 05: silent-failure lens 1 Important, 1 Minor (findings/05-lens-silent-failure.md). Fix round 1/5 queued after task 04's fix round returns (one writer at a time).
Task 05: minor (deferred): silent-failure lens: companions false/null/0 yields the default line; only "" turns it off.
Task 04: fix round 1 committed 943f8c5..9575f4c. Scoped re-review dispatched.
Task 04: minor (deferred): a ruling over 160 characters is cut with an ellipsis and can lose its Why.
Task 05: fix round 1/5 dispatched (resumes a0e8d08294d0972df, FIX_BASE 9575f4c).
Task 05: fix round 1 committed 9575f4c..fa9a02a (implementer reports no RED seen for the new tests: code and tests written together). Scoped re-review dispatched.
Task 06: dispatched (BASE fa9a02a).
Task 04: fix round 1/5 (4 addressed, 0 open: none; commits 943f8c5..9575f4c)
Task 04: minor (deferred): a ruling over 160 characters is cut with an ellipsis and can lose its Why: or qualifier
Task 04: minor (deferred): a Standing rulings section that yields zero rulings is not reported in the block
Task 04: complete (commits bb25aff..aed5128, fix 943f8c5..9575f4c, 1 fix round, minors deferred)
Task 05: fix round 1/5 (1 addressed, 0 open: none; commits 9575f4c..fa9a02a)
Task 05: minor (deferred): fix warning embeds up to 80 chars of err.message, which can quote .fx.json content or contain a newline
Task 05: minor (deferred): ENOTDIR on cwd shows the warning sentence, arguably correct
Task 05: complete (commits 809d811..943f8c5, fix 9575f4c..fa9a02a, 1 fix round, minors deferred)
Task 06: implemented fa9a02a..269bcc2 (DONE). Lenses: no tripwire matched (skill prose, gate test). Reviewer dispatched.
Task 07: dispatched (BASE 269bcc2).
Task 06: minor (deferred): SKILL.md §3 subsection does not state spike path is exempt; scope lives only in ADR-0033 and the checklists.
Task 06: minor (deferred): ADR-0033 uses Context/Decision/Consequences sub-headings where task asked for plain prose; matches ADR-0032.
Task 06: minor (deferred): gate test does not pin the red-flag row's position after the "It's bounded" row.
Task 06: ⚠️ resolved by controller: check-all runs once in task 11 by plan; not a gap.
Task 06: complete (commits fa9a02a..269bcc2, review clean, minors deferred)
Task 07: implemented 269bcc2..7634883 (DONE). Lenses: no tripwire matched (prompt and agent prose, generated toml, gate test). Reviewer dispatched.
Task 08: dispatched (BASE after ledger commit).
Task 07: minor (deferred): Tests-paragraph sentence in task-reviewer-prompt.md is one 131-char line, not wrapped like neighbours.
Task 07: complete (commits 269bcc2..7634883, review clean, 1 minor deferred)
Task 08: implemented 8d0f745..867cae2 (DONE). Lenses: no tripwire matched (lens prose; no auth code, route, or credential). Reviewer dispatched.
Task 09: dispatched (BASE 867cae2).
Task 08: minor (deferred): fx-review SKILL.md:186 mode-line sentence is unwrapped on the quoted brief line.
Task 08: ⚠️ resolved by controller: lens-content, check-generated, agent-model, tripwire-table, return-contract pass on 867cae2 (detached checkout).
Task 08: complete (commits 8d0f745..867cae2, review clean, 1 minor deferred)
Task 09: implemented 867cae2..a6ecb0d (DONE). Lenses: no tripwire matched (reference, lens and skill prose, ADRs, gate test). Reviewer dispatched.
Task 10: dispatched (BASE a6ecb0d). Local model server at 127.0.0.1:8899 unreachable (curl 000, timeout) at dispatch: live rows expected pending.
Task 09: minor (deferred): two inserted prose lines in fx-design SKILL.md and one in ADR-0012 are unwrapped single long lines.
Task 09: minor (deferred): web-polish.md is 55 lines against the design's "about 35".
Task 09: minor (deferred): ADR-0034 says "this task" and cites commit hashes that go stale.
Task 09: ⚠️ resolved by controller: lens-content, check-paths, check-reference-leaves, check-generated pass on a6ecb0d (detached checkout); web-polish values were checked against the cloned sources during planning (emil SKILL.md lines 44-47, 72, 135, 201, 548; better-ui SKILL.md 20, 28, 52, 64; icons.md 87-96).
Task 09: complete (commits 867cae2..a6ecb0d, review clean, minors deferred)
Waiting on task 10's implementer before dispatching task 11: 11 runs check-all over the whole tree, and 10's INSTALL.md edit must be committed first so the gate sees a settled tree.
Task 10: implemented a6ecb0d..ebd9491 (DONE_WITH_CONCERNS). Install test passes; free rows: 1.18.25 6/6, 2.0.18 5/6 (row 09: `opencode debug skill` removed in 2.x); live rows pending (server 000). Lenses: none (INSTALL.md). Reviewer dispatched.
Ruling: the OpenCode 2.0.18 row 09 failure is recorded, not fixed in this plan. Why: it is a conformance-test incompatibility with a newer CLI, outside this plan's scope; the owner decides whether fx supports 2.x. Cost if wrong: fx claims nothing about 2.x yet, INSTALL.md records the failure; caught by the completion report's Needs you.
Ruling: task 11's check-all runs with the 1.18.25 binary first on PATH (/tmp/tmp.zOgjMCBXsM), the version fx is measured against, so the known 2.x row 09 failure does not mask other failures. Why: check-all's opencode free rows call the binary. Cost if wrong: a 2.x-only failure beyond row 09 hides, caught by task 10's recorded 2.0.18 run (5/6, only row 09 failing).
Task 11: dispatched (BASE ebd9491).
Task 10: minor (deferred): INSTALL.md:398 attributes task 21's live run to 1.18.25 by inference from state.md:1180 and drops its log path.
Task 10: minor (deferred): INSTALL.md paragraph under the verified table still says the opencode final-tree run "waits for free memory", beside rows now saying last live run 18 pass.
Task 10: minor (deferred): Nightly checks section does not note the opencode @latest job is expected red on row 09 with 2.0.18.
Task 10: minor (deferred): free-row counts for both versions cite no log path, so they cannot be re-audited.
Task 10: ⚠️ resolved by controller: install test and opencode free rows re-run inside task 11's check-all (1.18.25); the 2.0.18 row 09 error string is quoted in the report.
Task 10: complete (commits a6ecb0d..ebd9491, review clean, minors deferred)
Task 11: implemented ebd9491..9a313f6 (DONE_WITH_CONCERNS). check-all (opencode 1.18.25 on PATH) stopped at check-prose on AGENTS.md dashes; a scratch run then stopped at check-prose-explicit-path.sh ("walk read a nested worktree").
Exit gate: check-prose (AGENTS.md:57 and 14 more dash lines): pre-existing. Fails identically on main 68ba929 (detached /tmp checkout); AGENTS.md is repowise-generated, committed on main in e4b5260.
Exit gate: check-prose-explicit-path.sh: pre-existing. Fails on main 68ba929 and on 9a313f6, both in /tmp checkouts outside .worktrees.
Ruling: the remaining check-all gates run on 9a313f6 from a /tmp checkout with those two lines removed (background run blvg1n6jh). Why: check-all stops at the first failure, and both failures predate this branch. Cost if wrong: a later gate masked; caught by that run itself.
Coverage audit: 6 gaps (findings/coverage-audit.md), no Critical. G1 lens mode scoping for silent-failure and database, G2 fix-loop condition 3 wording, G3 ADR-0031 "every session start" overclaim: go to the final review's fix wave. G5 (task 10 accepts pending) and G6 (build-measurement owner): Needs you.
Ruling: permissionDecision omitted (task 03 live probe showed updatedInput applied without it). Why: the probe evidence in bb25aff. Cost if wrong: routing silently off, caught by a rerun of the task 03 probe.
Ruling: routing limited to general-purpose, claude, Plan; forks and typed agents keep their pins. Why: red-team findings 3 and 4. Cost if wrong: an unpinned third-party agent inherits the session model; recorded in ADR-0031.
Ruling: standing rulings capped at 10, not the design's 15. Why: preamble budget headroom; the cap now prints "and N more". Cost if wrong: an 11th ruling shows only as a count, caught by the "and N more" line.
Exit gate: release-version.test.js: introduced. Shipped files differ from main but .claude-plugin/plugin.json is still 0.2.3; passes on main 68ba929. Joins the final fix wave (version bump). Gates before it (39 sections) passed on 9a313f6 with opencode 1.18.25; gates after it not yet run.
Final review: dispatched in parallel: broad reviewer (opus, final branch review), spec, standards, security lens, silent-failure lens (both mode: branch), fx-devils-advocate code mode (opus, red team). a11y, database, pipeline lenses: no authored content triggers them.
Final review: broad 0/3/3 (with fixes), spec 0 C / 2 I, standards 2 I, security 2 I + 1 M, silent-failure 6 I + 1 M, devil's advocate 7. Devil's advocate 1 answered: the recorded run .fx/lean-review/check-all-rest-9a313f6.out shows all six new gates OK.
Ruling: one fix wave, items F1 to F23 in findings/final-fix-wave.md. Why: the skill's one-fixer rule. Cost if wrong: a large diff for one re-review, caught by that re-review plus the check-all tail.
Ruling: final silent-failure findings 1, 2, 3, 5, 7 parked: pre-existing code this branch did not change. Why: out of this plan's scope. Cost if wrong: those silent paths persist, surfaced in the completion report.
Ruling: final spec (a) 1 pushed back: docs/plans/rulings.md is per target repo, created on the first every-plan ruling. Cost if wrong: none; the fx-implement text creates it on append.
Final fix wave: dispatched (BASE ee13f92).
Final fix wave: committed fc85ce2..a2c0f56 (5 commits; F22 already satisfied; F23 also bumped .agents/plugins/marketplace.json). Scoped re-review and check-all tail dispatched.
Exit gate on a2c0f56 (detached /tmp checkout, opencode 1.18.25 on PATH): scripts/check-all minus check-prose and check-prose-explicit-path: 56 sections, ALL GREEN, EXIT=0 (.fx/lean-review/check-all-rest-a2c0f56.out). release-version passes (0.2.4).
Exit gate: check-prose on a2c0f56 fails only on AGENTS.md (15 lines): pre-existing, same as main 68ba929. check-prose-explicit-path fails identically on main and a2c0f56 ("walk read a nested worktree"): pre-existing.
Task final: fix round 1/1 (22 addressed, 1 open: F17 ADR-0035 keeps the "every session start" overclaim; commits fc85ce2..a2c0f56)
Task final: minor (deferred): COVERAGE.md summary counts not recounted after W118:W121 moved from K to S
Task final: minor (deferred): preamble.test.js:286 dead .fx.json write and preamble.js:61 unwrapped comment line
Final: parked (F17 residual: ADR-0035 title and line 11 say rulings load "at every session start"; the code adds them only while an unfinished plan exists, and Claude Code re-reads on compaction while OpenCode reads at startup) Ruling: real, doc-only, nothing builds on the wording; no second fix wave by rule, so it goes to the owner as a one-line ADR edit. Cost if wrong: a reader expects rulings with no unfinished plan, caught by the completion report.
Plan complete: tasks 01 to 11 complete, 1 parked, final review fixed
