# fx ledger: plan: docs/plans/2026-09-23-lean-build/plan.md

Worktree: /development/fx/.worktrees/lean-build on lean-build (from main 649da01).
Baseline: setup OK; scripts/check-all ALL GREEN, 41 gates (2026-09-23).
Design read: docs/plans/2026-09-23-lean-build/design.md (amended after red-team).

## Pre-flight conflict scan

Pairs sharing a file or interface:

| Tasks | Shared | Produces / consumes | Found |
|---|---|---|---|
| 02, 03 | tests/conformance/lib/live.sh | 02 extracts the credential copy into scratch-home.sh; 03 adds FX_LIVE_TIMEOUT/MAX_TURNS | Different hunks; 03 blocked by 02. OK |
| 01, 02, 03, 08, 10, 11, 12 | scripts/check-all | each appends one run line | Serial by edges. OK |
| 05, 08, 11 | skills/fx-implement/SKILL.md | 05 Plan complete line; 08 reading rules and coverage-audit reply; 11 Parallel tasks | Different sections, serial by edges. OK |
| 01, 03, 08 | template opening lines | 01 and 03 classify transcripts by "You are implementing task", "You are reviewing", "You are re-reviewing"; 08 edits those templates | Ruling A |
| 01 | branch reviewer opening | reviewer-prompt.md:16 opens "You are a senior code reviewer", not "You are reviewing" | Ruling B |
| 03, 08 | implementer final reply | 03 implementer-heads takes the last SHA of the implementer's final message; 08 reply field Commits <base7>..<head7> | Last SHA is the head. OK |
| 03, 11 | ledger line form | 03 parses `Task NN: parallel with MM, branch <b>`; 11 writes `..., branch <b>, base <sha>, worktree <path>` | Prefix-compatible; parse by prefix. OK |
| 06, 12 | lib/preamble.test.js | 06 edits it; 12 maps hooks/ paths to it | Consistent. OK |
| 12, 13 | .fx.json isolated_test_execution | 12 records the concurrency check only; 13 sets the key on ship | Consistent after red-team #12. OK |
| 04, 07, 09, 13 | owner-run | fx-implement does not dispatch them | Stop and hand the owner the commands. OK |

Per-task self-consistency:

| Task | Found |
|---|---|
| 01 | Test fixtures match the definitions (5 calls, grep not counted, fixRounds 2). OK after Ruling B |
| 02 | Lane-coverage assertion needs all 12 model-facing prompts plus a none__ prompt; files list has them. OK |
| 03 | Self-test good/bad expectations checked by hand against traps. OK |
| 05 | Test uses repo() with a state string; supported by plan-state.test.js repo(). OK |
| 06 | Test uses INTRO, HARNESSES, render; INTRO exists at lib/preamble.test.js:73. Existing hook assertion updated per criteria. OK |
| 08 | Gate anchors: 'Lens briefs' in fx-review SKILL.md, 'one coverage audit' at fx-implement SKILL.md:590. OK |
| 10 | fx-setup/SKILL.md is generated from commands/fx-setup.md. OK after red-team #13 |
| 11 | Gate forbids "branch -D" and "rm -rf" text in the section. OK |
| 12 | GATES list built from tests/gates at run time. OK |

Ruling A: task 08 keeps the opening line of every template it edits ("You are implementing task [NN]", "You are reviewing one task's implementation", "You are re-reviewing", "You are a senior code reviewer"). Why: build-cost (01) and implementer-heads (03) classify subagent transcripts by those lines, and step measurements compare runs before and after 08. Cost if wrong: step 3's per-type numbers silently misfile, caught by task 08's review (this ruling is passed to its reviewer).
Ruling B: task 01's reviewer class also matches "You are a senior code reviewer" (reviewer-prompt.md:16, the branch reviewer). Why: otherwise branch reviews file as other. Task file amended. Cost if wrong: branch-review cost missing from the reviewer bucket, caught by task 01's review.
Ruling C: MVP tasks run serially (01, then 02, then 03). 01 and 02 have no edge between them, but .fx.json has no isolated_test_execution and the serial rule stands until task 11 exists. Cost if wrong: some minutes of wall-clock only.
Task 01: dispatched (implementer sonnet, BASE 81d6d93, agent af51774f008916221). Blocked on it: 02 serial per Ruling C.
Ruling D: the plugin version bump lands with task 01 (0.2.2 to 0.2.3, three manifests) instead of at the phase merge. Why: release-version.test.js fails check-all on the branch's first shipped-file change, and the plan says bump when it asks; later tasks on this branch compare against main and need no further bump. Cost if wrong: none beyond an earlier bump, caught by check-all at the exit gate.
Task 01: implementer DONE (4bd8448). Review dispatched: task reviewer (sonnet) + fx-lens-silent-failure (diff adds try/catch and || fallbacks on parse paths). Findings: findings/01-review.md.
Task 02: dispatched (implementer sonnet, BASE 4bd8448) while task 01 is in review. Ruling E: if task 01 needs a fix round, its fixer waits until task 02's implementer returns, so one writer is in the worktree at a time. Cost if wrong: a fixer and an implementer committing in one checkout, caught by the review packages' commit lists.
Task 01: silent-failure lens returned 2 Critical, 3 Important (findings/01-lens-silent-failure.md); cited lines verified at 29, 55, 58, 203-206, 214. Fix round waits for the task reviewer and for task 02's implementer (Ruling E).
Task 01: task review spec ✅, quality Approved, 0 C, 0 I, 4 M (findings/01-review.md). ⚠️ resolved by controller: commit 4bd8448 has no trailer and stages six paths by name (three are Ruling D's version bump); controllerActiveMs untested, deferred below.
Task 01: minor (deferred): controllerActiveMs has no assertion in build-cost.test.js.
Task 01: minor (deferred): median and p90 methods are not pinned by the task; confirm before comparing ctxMedian across runs.
Task 01: minor (deferred): ctxGrowthPerTask uses first and last completed in ledger order, not lowest and highest NN; add a one-line comment.
Task 01: fix round 1/5 queued (waits for task 02 implementer, Ruling E). Open, from the silent-failure lens: (1) key-less assistant record dropped silently; (2) unreadable subagents dir treated as none; (3) call usage frozen from a first record without usage; (4) malformed JSONL line crashes instead of exit 2; (5) unreadable subagent file skipped silently. The reviewer's JSON.parse minor is lens item 4. Intended remedy: each of 1, 2, 4, 5 exits 2 naming the file (and line where known); ENOENT on the subagents dir and an empty subagent file stay legitimate; 3 takes usage from the first record of the call that carries it.
Task 02: implementer DONE (1c63776). It reported check-all red from two causes outside the task; both were one cause, controller-owned: findings/01-review.md carried em dashes and an unbalanced parenthesis, which failed check-prose and the whole-repo walk inside check-prose-explicit-path.sh. Controller fixed the findings file prose; check-all ALL GREEN after.
Task 02: the implementer used git stash despite the dispatch; entry `task02-wip-check` on lean-build remains on the shared stack (content applied, drop blocked by a hook). Left in place; reported to the owner. Later dispatches repeat "never stash".
Task 01: fix round 1/5 dispatched (resumed original implementer, FIX_BASE 9480f52 is branch HEAD before the fix; the re-review package covers only the fix commits; findings by path). Task 02: review dispatched: task reviewer (sonnet) + fx-lens-security (credential copy and rm cleanup of a scratch home).
Task 02: security lens 1 Important, 3 Minor (findings/02-lens-security.md), citations verified. Minor 4 (OAuth refresh rotation) predates the plan (live.sh copies the credential the same way); owner informed, not in the loop.
Task 02: task review spec ✅, quality Approved, 0 C, 1 I, 2 M (findings/02-review.md).
Ruling F: task 02 review Important (git stash used against the dispatch; entry task02-wip-check still on the shared stack) does not enter the fix loop. Why: the violation is a past process event, not code; the entry is this branch's own, its content is applied and committed in 1c63776, and a repository hook blocks git stash drop. Cost if wrong: one stale stash entry on the shared stack, caught by the owner, who is told in the completion report.
Task 02: minor (deferred): the scratch-home setup block is duplicated between run-test.sh and run-reps.sh.
Task 02: minor (deferred): scripts/check-all whitespace alignment of the new run line.
Task 02: minor (deferred): log directories keep the default umask; set umask 077 as live.sh does (security lens 2).
Task 02: minor (deferred): scratch_home_claude trusts its directory argument; refuse a path under the real home (security lens 3).
Task 02: fix round 1/5 queued (waits for task 01's fixer, Ruling E). Open: security lens 1, run-test.sh and run-reps.sh run the session with no jail and export FX_REAL_HOME; the comment claims isolation the scripts do not give.
Task 01: fix round 1/5 implementer DONE (bcfcc86, 5 new tests, check-all green per report). Scoped re-review dispatched on 9480f52..bcfcc86. Task 02: fix round 1/5 dispatched (resumed original implementer, FIX_BASE bcfcc86); only writer in the worktree now.
Task 01: fix round 1/5 (5 addressed, 0 open; commits 9480f52..bcfcc86). Re-review findings/01-rereview-1.md.
Task 01: minor (deferred): the chmod 0o000 unreadable-file tests pass vacuously when run as root (re-review out-of-scope note).
Task 01: complete (commits 81d6d93..bcfcc86, review clean). Files: scripts/build-cost, scripts/build-cost.test.js, scripts/check-all, three manifests (Ruling D). Guarantee: node scripts/build-cost.test.js 11 cases; real transcript 61606dd5 reports 709 controller calls.
Blocked: task 03 needs task 02 (fix round 1 in flight); nothing else on the frontier.
Task 02: fix round 1/5 implementer DONE (df4c5af: claude call through tests/conformance/lib/jail.sh, FX_REAL_HOME no longer exported, new tests/lane-triggering/jail-isolation.test.sh RED then GREEN, check-all green per report). Scoped re-review dispatched on bcfcc86..df4c5af.
Ruling G: task 03 is dispatched while task 02's re-review runs. Why: task 03 consumes only tests/conformance/lib/scratch-home.sh and live.sh as landed in 1c63776 and df4c5af, and the re-review is read-only; if task 02 needs round 2, its fixer waits for task 03's implementer (same rule as Ruling E). Cost if wrong: task 03 builds on a task 02 shape a later round changes, caught by task 03's review reading the ledger.
Task 03: model most capable (opus). Reason: the largest task, and every later ship decision depends on the fixture measuring what it claims (fixture plan authoring, hidden trap tests, a jail-integrated live row).
