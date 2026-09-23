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
