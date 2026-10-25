# fx ledger: plan: docs/plans/2026-10-24-upstream-update/plan.md

## Standing rulings

No docs/plans/rulings.md exists in fx; the plan's own standing rulings follow.

- Ruling: S1, compaction. After any compaction the controller re-invokes fx:fx-implement with the Skill tool before its next dispatch. Before tasks 21, 22 and 23 it reads the installed fx-implement SKILL.md's "Final review", "Exit gate: the Iron Law" and "Completion report" sections explicitly. Why: plan.md, red-team finding 8. Cost if wrong: a compacted controller skips the fix-loop cap or the exit gate, caught by the final review.
- Ruling: S2, the brief tool. After task 01 is committed, briefs are compiled with `node <SCRATCH>/fx-brief-tool/skills/fx-implement/scripts/compile-brief` from a detached worktree pinned at task 01's commit, never from the build worktree. Why: plan.md, red-team finding 9. Cost if wrong: a brief compiled by half-built code, caught by compile-brief's own exit code.
- Ruling: S3, phase gates. The scripts/check-all runs in tasks 08, 11, 17, 21 and 23 are plan-mandated; ledgered as `Task <NN>: ran test_all (plan-mandated phase gate)`. Why: plan.md, red-team finding 10. Cost if wrong: none beyond run time.
- Ruling: S4, the size line. The SKILL.md size constraint holds through the PENDING list in src/tests/gates/skill-size.test.ts. Why: plan.md, red-team finding 11.
- Ruling: <SCRATCH> is /tmp/claude-1000/-development-advantage-backend/41c30690-f980-4e40-a682-fd0bcbf989cf/scratchpad for this build session. Why: plan.md says the controller fills it once. Cost if wrong: a resumed session in another scratchpad must re-rule it, caught by the first command failing on a missing path.
- Ruling: owner rules. HOME and TMPDIR in <SCRATCH>/fx-tests; tests through scripts/scratch-env; no rm, trap or bash -c typed; python3 -I only; nothing written or deleted under /home/faisal; no push, merge, PR or commit to main; no attribution trailers; no em or en dashes. A stop condition parks the task and the build continues with tasks it does not block; a build status (done, running, left, needs you) after each task. Why: owner, this session.

## Log

Setup: worktree /development/fx/.worktrees/upstream-update on branch upstream-update from main dd99986; plan directory copied in uncommitted; scripts/setup exit 0 (npm warned that esbuild's postinstall script was not approved; watch scripts/build in task 01).
Pre-flight: scan dispatched (read-only agent writing .fx/2026-10-24-upstream-update/preflight.md); task 01 brief compiled (exit 0); waiting on the scan before dispatching task 01.
Pre-flight: table written to .fx/2026-10-24-upstream-update/preflight.md (85 pair rows, 12 conflicts; 23 task rows, 11 tasks flagged). Rulings follow, one per finding.
Ruling: S2 amended. After task 13 is complete, re-pin the brief tool to task 13's commit (`git -C <SCRATCH>/fx-brief-tool checkout --detach <task 13 commit>`), so briefs for tasks 14 to 23 carry `## Review focus`; task 13's reviewer-template lines say "when the brief has one". Why: pair 01/13. Cost if wrong: reviewers 14 to 23 look for an absent section, caught by their own reports.
Ruling: tasks 03, 04 and 05 run in number order (a serial build); no new edge. Why: pairs 03/04 and 03/05 touch different regions or one literal key each. Cost if wrong: a textual conflict, caught by git at commit.
Ruling: task 02's link rule skips URLs (any `scheme://` or `mailto:`) and pure `#anchor` links, and checks only relative file targets. Task 02's first RED may come from the check-paths half. Why: 11 URL and 5 anchor links exist in skills/ today. Cost if wrong: false gate failures, caught by task 02's own gate run.
Ruling: task 03 adds two assertions to its moved-assertion table: return-contract.test.ts `rules.includes("Fixed` field")` now reads references/reading-rules.md, and ledger-lines.test.ts `s3.includes("pass \`unavailable\` when it prints no line")` now reads references/cost.md. Never weaken an assertion; retarget it. Why: pre-flight task 03 (a). Cost if wrong: red gates, caught by test_scope.
Ruling: task 04's size target is "under 17,000 bytes" (its Acceptance); the "about 16,500" figure is an estimate. Its Hard limits line names the rule (20,000 bytes, Claude Code's cut on re-attach) and does not cite a test path. Why: pre-flight 04. Cost if wrong: none.
Ruling: task 08 does not edit skills/fx-humanize/COVERAGE.md (task 11 rewrites it). Task 11's rewrite lists the fx additions accurately and keeps task 10's "Renamed to GLOSSARY.md" line. Why: pairs 08/11, 10/11. Cost if wrong: wasted work, caught by task 11's review.
Ruling: task 09 puts its render assertions in src/lib/preamble.test.ts and stages that file and its built lib/preamble.test.js. Why: pre-flight 09 (a). Cost if wrong: unstaged tests, caught by the review package.
Ruling: task 10's grep test drops README.md and INSTALL.md from the must-still-name-the-old-file list (task 10 removes their only mention). The text rewrite matches whole file names only (CONTEXT.md and CONTEXT-MAP.md as words, not inside longer names). The fx-setup migration step runs glossary-migrate from the same vetted FX root that commands/fx-setup.md already establishes and checks (tests/gates/fx-setup-root-check), never from a new or repo-supplied path. Why: pre-flight 10 (a), (b), (c). Cost if wrong: running code from an unvetted path, caught by fx-setup-root-check.
Ruling: task 11 links both examples.md and replies.md from SKILL.md, adds hooks/fx-context.js to its Files if it edits it, takes the 3.1.0 text from tag v3.1.0 (225a6f3), and its final old-marker grep adds `--exclude-dir=.fx` and excludes docs/plans/. Why: pre-flight 11. Cost if wrong: an orphan file or a self-matching grep, caught by check-paths and the grep itself.
Ruling: a declined item the controller rules "parked" writes `Task <NN>: needs you: declined: <item text>`; the task still completes, and the item shows under "needs you" in the build status. A whole task that hits a stop condition writes `Task <NN>: parked: needs you: <reason>`. Task 17 documents both shapes; task 12 uses the first. Why: pairs 12/17. Cost if wrong: two shapes drift, caught by ledger-lines tests.
Ruling: task 17 edits the rationalization row in references/rationalizations.md (where task 03 moved the table), and rewrites the "I'll run these in parallel" row to point at parallel.md's exception for isolated_test_execution. Why: pre-flight 17 (a), (b). Cost if wrong: two contradicting rules, caught by task 17's review.
Ruling: task 19's retro command reaches build-cost as fx-implement does, through the plugin root the command already resolves, never a repo-supplied path; retro proposes lesson candidates first and writes lessons, retro.md and fbrain proposals only for the candidates the owner picks. Why: pre-flight 19. Cost if wrong: writes the owner did not choose, caught by task 19's review.
Ruling: task 21's pressure prompts each carry their whole subject (the run happens in an empty jailed scratch directory) and the fixture states that. Why: pre-flight 21. Cost if wrong: fixtures that cannot trigger, caught only when run live (on request).
Ruling: task 22 runs its ADR shape check (line 1 title, status line, three headings) as a step, with a grep per ADR. Task 23 documents the `.fx.json` glossary_rename key and adds references/wayfinder.md to SURFACE.md's references list. Why: pre-flight 22, pairs 09/23, 20/23. Cost if wrong: an undocumented key, caught by the final review.
Task 01: dispatched dd99986 2026-10-24T22:53:05Z
Controller: implementer dispatch text saved as .fx/2026-10-24-upstream-update/implementer-dispatch-template.md (placeholders [NN], [NN-slug], [title]); model sonnet unless a Capable because line.
Waiting: frontier empty until task 01 completes (02, 06, 07 and 09 are blocked by 01; serial implementers).
Ruling applied: S2 brief tool pinned at bbd241b in <SCRATCH>/fx-brief-tool. Plan directory committed.
Task 02: dispatched 18b20c9 2026-10-24T22:55:30Z
Task 01: confirmed ⚠️ resolved: release-version.test.js OK on the branch (controller ran it), and brief 02 compiled by the pinned tool from the real design.md holds "Phase 1: Size gate" (exit 0).
Task 01: minor (deferred): section() does not skip fenced code, so a `# ` line inside a fence ends the excerpt early
Task 01: cost unavailable (no transcript recorded)
Task 01: complete (commits dd99986..bbd241b, review clean)
Ruling: the controller commits state.md and findings only between tasks, when no implementer is running, so a task's review range holds only that task's commits. Why: ledger commit fe4df17 landed inside task 02's range (base 18b20c9). Cost if wrong: one ledger commit in task 02's review diff, which the reviewer may flag as scope; the controller rules it ledger-only.
Task 02: report contract breached (reply named no commit range); range read from git: d7083ab.
Ruling: task 02's review range is fe4df17..d7083ab, not the dispatch base 18b20c9, because fe4df17 is the controller's ledger-only commit. Why: the range then holds only task 02's commit. Cost if wrong: none; 18b20c9..fe4df17 changed only state.md and findings/01-review.md.
Task 03: dispatched d7083ab 2026-10-24T22:59:21Z (Capable because: pure-move split of the controller skill, HIGH risk of a dropped rule)
Task 02: confirmed ⚠️ resolved: scripts/check-paths at d7083ab prints its OK line (line 78: "OK: {checked} reference citations, all anchored and resolvable"); the implementer's test_scope run was ALL GREEN.
Task 02: minor (deferred): check-all run line for skill-size.test.js is not column-aligned with neighbouring lines
Task 02: minor (deferred): no recorded RED for the size half of the test; the RED came from the check-paths fixtures
Task 02: minor (deferred): a stale PENDING_ORPHANS entry (file already linked) is not flagged, unlike PENDING sizes
Task 02: cost unavailable (no transcript recorded)
Task 02: complete (commits fe4df17..d7083ab, review clean)
Controller: owner-rule breach: the controller typed `bash -c true` (a no-op inside a check command) while verifying task 02. No effect; disclosed to the owner; not repeated.
Ruling: task 03's rulings run follows the move table (lines 72 to 105 to references/rulings.md), not the contradicting "stays inline" note. Why: keeping 72 to 79 inline measures 18,326 bytes, over the 17,900 cap; the inline Ruling template still carries "caught by <the checkpoint that would catch it, if one would>", and SKILL.md points at rulings.md before any ruling. Cost if wrong: a compacted controller reads the checkpoint guidance one pointer away, caught by the task 03 review and the final review.
Task 04: dispatched 1ebcf07 2026-10-24T23:05:09Z
Ruling: owner, 2026-10-25 (asleep, weekly token quota at 88%, renews Wednesday 15:00): approved the docs/ADR/visual design; after this build, write its plan, red-team it, and start implementing when fit. Budget mode for the rest of this build: standard tier for implementers and reviewers (most capable only for HIGH-risk tasks); batch small same-shape tasks into one implementer and one review where the plan allows; lenses only on a reported tripwire; minimal chat. If quota runs out, the ledger is the resume point. Why: owner instruction. Cost if wrong: thinner reviews on low-risk tasks, caught by the final branch review.
Task 03: minor (deferred): fix-loop-shape negative checks for the old rationalization row and baseline-0 wording no longer also scan SKILL.md
Task 03: minor (deferred): moved text keeps positional words (setup.md below x2, waiting.md above, lens-dispatch.md fix loop below) whose referents are now in another file
Task 03: minor (deferred): SKILL.md Setup numbering starts at ### 4. The ledger after subsections 1 to 3 moved
Task 03: confirmed ⚠️ resolved: COVERAGE row-by-row audit is owned by task 08 (COVERAGE files match fx); gate runs are covered by the implementer's test_scope exit 0 and the task 08 phase gate.
Task 03: cost unavailable (no transcript recorded)
Task 03: complete (commits d7083ab..35f5b22, review clean)
Task 05: dispatched 3229906 2026-10-24T23:09:05Z
Task 04: minor (deferred): moved files discovery.md and preamble.md open with a mid-level heading and no title line.
Task 04: confirmed ⚠️ resolved: the live lane-triggering run is on request only (design Testing Decisions); not run, budget mode.
Task 04: cost unavailable (no transcript recorded)
Task 04: complete (commits 1ebcf07..14d7490, review clean)
Ruling: tasks 06 and 07 batched into one implementer and one review (budget mode). Why: owner budget instruction; both are small and touch different files. Cost if wrong: a larger review unit, caught by the reviewer.
Task 06: dispatched ea37a4a 2026-10-24T23:11:24Z
Task 07: dispatched ea37a4a 2026-10-24T23:11:24Z
Task 05: minor (deferred): fx-review section 7 dropped the sentence "The code shows you heard it." from the forbidden-phrase rule.
Ruling: task 08 restores the sentence "The code shows you heard it." after "State the fix." in skills/fx-review/SKILL.md section 7 (task 05 dropped it; base 3229906 line 297). Why: the design allows no dropped rule text, and a fix round now would put a second writer beside the 06/07 batch. Cost if wrong: one sentence missing until task 08, caught by the task 08 review.
Task 05: confirmed ⚠️ resolved: check-prose and the four gates are rerun by the task 08 phase gate (check-all).
Task 05: cost unavailable (no transcript recorded)
Task 05: complete (commits 3229906..41527a4, 1 deferred to task 08 by ruling)
Ruling: any later task that adds to references/vocab/good-tests.md (8,998 bytes against its 9,000-byte gate) moves an equal or larger whole section out first, as a pure move behind a pointer. Why: tasks 06/07 batch report. Cost if wrong: a red leaf-size gate, caught by test_scope.
Task 08: dispatched 97563a1 2026-10-24T23:14:39Z
Task 06: minor (deferred): server.cts:402 uses string replace for the helper injection, the same class as the fixed bug; use a replacer function.
Task 07: minor (deferred): good-tests.md sits at 8998 of 9000 bytes; the next edit must move a whole section out first.
Task 07: minor (deferred): good-tests.md trim dropped "describe what, not how" and the receive(:process) example that illustrated the internal-collaborator rule.
Tasks 06, 07: confirmed ⚠️ resolved: gate results are rerun by the task 08 phase gate (check-all).
Task 06: cost unavailable (no transcript recorded)
Task 06: complete (commits ea37a4a..1e46bf7, review clean)
Task 07: cost unavailable (no transcript recorded)
Task 07: complete (commits 1e46bf7..e0c81ed, review clean)
Task 08: ran test_all (plan-mandated phase gate): ALL GREEN per report.
Task 09: dispatched 22e6d73 2026-10-24T23:19:02Z
Task 08: minor (deferred): fx-brainstorm COVERAGE "(unnumbered)" row has no stable claim id.
Task 08: minor (deferred): fx-review COVERAGE "Real Examples" row has no stable claim id.
Task 08: ran test_all (plan-mandated phase gate)
Task 08: open Important: COVERAGE Summary count tables (brainstorm, plan, tdd, debug) not recounted after verdict changes (findings/08-review.md).
Ruling: task 08's fix round 1 resumes its implementer after task 09 commits, not now. Why: one writer at a time in the worktree; task 09 is mid-run. Cost if wrong: a short delay on task 08.
Task 08: confirmed ⚠️ resolved: check-all ALL GREEN is the implementer's run; the fix round reruns test_scope.
Task 08: fix round 1 dispatched (resumed implementer) 2026-10-24T23:22:24Z
Task 09: minor (deferred): no render-level test for the declined .fx.json path through render
Task 09: minor (deferred): no test for malformed .fx.json with CONTEXT.md still giving the notice
Task 09: cost unavailable (no transcript recorded)
Task 09: complete (commits 22e6d73..8436042, review clean)
Task 08: fix round 1: controller re-review (7 doc lines in 4 COVERAGE files, within the 20-line limit): brainstorm Dropped row now names the dropped file and map format; plan, tdd, debug totals moved by the verdict changes. Accepted; the implementer's count method (apply verdict moves to existing totals) is ruled acceptable since the tables span several sources.
Task 08: cost unavailable (no transcript recorded)
Task 08: complete (commits 97563a1..dfa3510, review clean after fix round 1)
Task 10: dispatched 93db6ab 2026-10-24T23:23:46Z
Task 11: dispatched 1c1bc1f 2026-10-24T23:26:41Z
Task 10: minor (deferred): glossary-migrate mishandles absolute and reference-style map links (crash, or a rewritten dead link)
Task 10: minor (deferred): glossary-migrate rewrites CONTEXT.md mentions of files it does not move, leaving dead references
Task 10: minor (deferred): conflict wording differs between stderr and stdout, and fx-setup does not say how to handle a conflict list
Task 10: minor (deferred): domain-modeling.md tells lanes to show the migration dry run without naming the command or the vetted root
Task 10: minor (deferred): user-invoked drift-check RED before regeneration not captured
Task 10: open Important 1: commands/fx-setup.md runs glossary-migrate from an FX root whose check has not run (the check is in the Codex-only block of section 6); ruling violated.
Task 10: open Important 2: applyMigration is not atomic and cannot resume; a failed git mv leaves a half-migrated repo and a rerun cannot find the remaining files.
Ruling: task 10 fix round 1 (after task 11 commits, one writer at a time): (1) run the same FX root check before the migration step on every runtime, or move the step after the check, so it never runs from an unchecked root; (2) make apply all-or-nothing: plan and validate every move first (every source tracked and present, no target exists, links relative and inside the repo), and on any failure leave the repo unchanged with a one-line error, no stack trace; a rerun on a partly migrated repo either completes or reports exactly what remains. Add a scratch-repo test for the failure path. Minors stay deferred. Why: the owner's repos are the blast radius. Cost if wrong: a half-migrated glossary, caught by the fix round's re-review.
Task 10: confirmed ⚠️ resolved: the user-invoked.test.js RED was not captured; the GREEN gate is accepted since the main RED (MODULE_NOT_FOUND) is valid and the generated skill is checked by user-invoked.test.js in test_scope.
Task 10: fix round 1 dispatched (resumed implementer) 2026-10-24T23:31:53Z
Task 11: ran test_all (plan-mandated phase gate): ALL GREEN per report.
Task 11: minor (deferred): SKILL.md lists 25 pattern headings; §26 is reachable only through the step 1 replies.md pointer, so name it in one line after §25.
Task 11: confirmed ⚠️ resolved: controller re-ran the old-marker grep (35 patterns|P=35, excluding .fx, node_modules, .worktrees, plans): 0 hits; fx-humanize SKILL.md is 19,247 bytes. check-all is the implementer's phase-gate run.
Task 11: cost unavailable (no transcript recorded)
Task 11: complete (commits 1c1bc1f..a1a6a3f, review clean)
Task 12: dispatched 3897f14 2026-10-24T23:34:08Z
Task 10: fix round 1/5 (2 addressed, 0 open: none; commits a1a6a3f..6d5ce1e)
Task 10: minor (deferred): glossary-migrate prints "refused, repo unchanged" even when a git mv or write fails after earlier moves ran
Task 10: cost unavailable (no transcript recorded)
Task 10: complete (commits 93db6ab..6d5ce1e, review clean after fix round 1)
Task 13: dispatched 4bc7e34 2026-10-24T23:36:44Z
Task 12: minor (deferred): fix-loop.md does not say a `fix` ruling on a branch-pass declined line enters a fix round
Task 12: minor (deferred): final-review.md does not state that the controller renames the branch reviewer's `Task <NN>: declined:` lines to `Final review: declined:` lines
Task 12: declined: test strength of includes string assertions: they pin wording, not reviewer behaviour, which is the stated seam for this task
Task 12: declined: whether the ruled declined lines reach the final brief in practice: needs a real run, outside this diff
Ruling: task 12 declined 1 (includes-assertion strength) is accepted: text gates are the seam the design names for prompt wording (Testing Decisions); behaviour is measured only by the live bench on request. Cost if wrong: a wording-only check misses a behaviour change, caught by the final review.
Ruling: task 12 declined 2 (declined lines reaching the final brief in a real run) is accepted: the final review of this build is that real run; the final reviewer is told to check its brief carries the ruled declined lines. Cost if wrong: none beyond that check.
Task 12: confirmed ⚠️ resolved: controller read task-reviewer-prompt.md: the vision rule is at line 164 and the declined rule at 170, inside Part 1, with the findings heading at 281.
Task 12: cost unavailable (no transcript recorded)
Task 12: complete (commits 3897f14..afbafac, review clean)
Ruling applied: S2 brief tool re-pinned at d983c6d (task 13's commit) before task 13's review completes; plan.md has no Review focus section, so briefs carry none either way. Cost if wrong: a compile-brief bug in 13 reaches later briefs, caught by compile-brief's exit code and task 13's review.
Task 14: dispatched f471e8b 2026-10-24T23:38:52Z
Task 13: minor (deferred): no gate asserts the [blocks]/[advisory] unattended-revision wording in fx-plan SKILL.md or the devils-advocate agent
Task 13: confirmed ⚠️ resolved: the [blocks]/[advisory] unattended wording and the final-review verbatim line are prose with no test seam; the final review reads them. The reviewer's test_scope re-run (173 lines) had one FAIL, brainstorm-confidence.test.js, caused by task 14's uncommitted in-progress edits, outside task 13's range.
Task 13: cost unavailable (no transcript recorded)
Task 13: complete (commits 4bc7e34..d983c6d, review clean)
Task 14: report contract breached (no head hash in reply); range read from git.
Task 15: dispatched 53e2064 2026-10-24T23:40:42Z
Task 14: minor (deferred): SKILL.md:40 and :64 new lines are unwrapped long lines.
Task 14: minor (deferred): test does not assert the `(my call: <reason>)` marker or the owner-questions-in-review-message sentence.
Ruling: task 22 writes a sixth ADR, "the bounded path writes a short design.md", which amends ADR 0045; 0045 gets only an "Amended by <NNNN>" status-line note, per the owner's ADR rule (never edit an ADR beyond its status line). Why: task 14 review ⚠️; research compare-1 says the change needs an ADR amending 0045. Cost if wrong: an undocumented amendment, caught by task 22's review.
Task 14: confirmed ⚠️ resolved by the ruling above (owned by task 22).
Task 14: cost unavailable (no transcript recorded)
Task 14: complete (commits f471e8b..ea5513c, review clean)
Ruling: task 15's fx-tdd budget is the task file's 19,800 bytes; the controller's context figure (18,750) was copied from the pre-flight's pre-change size and was wrong. fx-tdd at 19,368 is under the task limit and the 20,000 gate. Cost if wrong: thin headroom for later fx-tdd edits, caught by the size gate.
Task 16: dispatched 69a339c 2026-10-24T23:43:00Z
Task 15: minor (deferred): fx-tdd "add the system test once it works: never drive RED..." chains the rule after a colon; split into two sentences.
Task 15: minor (deferred): fx-debug Phase 6 prevention question lives only as a checklist item, not in the Phase 6 prose.
Task 15: confirmed ⚠️ resolved: gate re-runs are covered by the task 17 phase gate (check-all).
Task 15: cost unavailable (no transcript recorded)
Task 15: complete (commits 53e2064..06a694c, review clean)
Task 17: dispatched cb878e0 2026-10-24T23:51:08Z
Task 16: confirmed ⚠️ resolved: the reviewer read the touched files directly where the diff elided context.
Task 16: cost unavailable (no transcript recorded)
Task 16: complete (commits 69a339c..3b50f35, review clean)
Task 17: ran test_all (plan-mandated phase gate): ALL GREEN per report.
Ruling: tasks 18 and 20 batched into one implementer and one review (budget mode). Why: independent files, both small. Cost if wrong: a larger review unit.
Task 18: dispatched cb99f8d 2026-10-24T23:55:33Z
Task 20: dispatched cb99f8d 2026-10-24T23:55:33Z
Task 17: minor (deferred): README.md:54 still describes a four-option menu with discard; update to three options.
Task 17: minor (deferred): ledger-lines test does not assert the declined needs-you shape in status.md.
Task 17: minor (deferred): SKILL.md carries two adjacent "read status.md, every time" pointers, as the brief mandated.
Task 17: confirmed ⚠️ resolved: check-all ALL GREEN is the implementer's plan-mandated phase gate run; the exit gate reruns it fresh.
Task 17: cost unavailable (no transcript recorded)
Task 17: complete (commits cb878e0..4b26445, review clean)
Tasks 18, 20: the implementer reported the upstream clones missing; the controller checked: they exist at <SCRATCH>/upstream/{superpowers 2ce8aa1, mattpocock-skills 5beb35b, humanizer 8c307f3}. No effect on 18 and 20 (fx-owned shapes). Later briefs name the exact clone paths.
Task 18: concern: opencode-plugin.test.ts edited outside the listed files (it asserted exactly five user-invoked lanes); left to the review.
Task 19: dispatched 82c927f 2026-10-25T00:01:26Z
Task 18: minor (deferred): conformance row 14 comments at lines 8 and 37 still say "five commands", now seven
Task 18: minor (deferred): finishing.md option 2 still says "following the repo's template" beside the new /fx:fx-pr pointer
Task 18: minor (deferred): fx-pr Evidence ending does not name a literal "Not run" label, so drafts may vary
Ruling: the task 22/23 batch adds an explicit "Not run:" line to the Evidence section of commands/fx-pr.md (then regenerates the skill), because the owner decided Evidence always ends with what did not run (design, Phase 4). Why: task 18 review Minor; an owner decision outranks the Minor rating. Cost if wrong: drafts that omit what was not run, caught by the task 23 review.
Task 18: cost unavailable (no transcript recorded)
Task 18: complete (commits cb99f8d..109d462, review clean; Not run line owned by task 23 by ruling)
Task 20: cost unavailable (no transcript recorded)
Task 20: complete (commits 109d462..6cb165b, review clean)
Task 19: concern: conformance row 09 (skill count) was failing at HEAD after task 18 added two commands, outside task 18's test_scope; task 19 set it to 20 and fixed row 13's comment. The task 21 phase gate (check-all) is the check. Cost if wrong: a red row, caught there.
