Task 01: minor (deferred): controllerActiveMs has no assertion in build-cost.test.js.
Task 01: minor (deferred): median and p90 methods are not pinned by the task; confirm before comparing ctxMedian across runs.
Task 01: minor (deferred): ctxGrowthPerTask uses first and last completed in ledger order, not lowest and highest NN; add a one-line comment.
Task 02: minor (deferred): the scratch-home setup block is duplicated between run-test.sh and run-reps.sh.
Task 02: minor (deferred): scripts/check-all whitespace alignment of the new run line.
Task 02: minor (deferred): log directories keep the default umask; set umask 077 as live.sh does (security lens 2).
Task 02: minor (deferred): scratch_home_claude trusts its directory argument; refuse a path under the real home (security lens 3).
Task 01: minor (deferred): the chmod 0o000 unreadable-file tests pass vacuously when run as root (re-review out-of-scope note).
Task 02: minor (deferred): jail-isolation.test.sh's dynamic "FX_REAL_HOME did not reach the claude process" check is vacuous, because the stand-in claude never prints its environment; the static grep beside it carries the proof.
Task 03: minor (deferred): a head SHA that predates lib/ or a stray hex word fails the whole run instead of scoring unknown (review M1).
Task 03: minor (deferred, owner task 11): step 4 takes the second worktree entry; once task 11 leaves task worktrees this can pick a task worktree; the fixture ledger's Worktree line names the build worktree (review M2). Task 11's review must check it.
Task 03: minor (deferred, owner task 11): mergeDefects fails the run when a ledger branch is gone, and the branch regex can keep a trailing backtick (review M3).
Task 03: minor (deferred): once merged to main, a jailed session could read hidden tests through $FX/.git; owner-run steps run from the build worktree, where the gitdir is hidden (review M4).
Task 03: minor (deferred, owner task 04): export-order likely reads clean every run and the self-test has no export-order false case; design.md states the readme answer outside task prose (review M5, M6). Task 04's sensitivity check owns trap difficulty.
Task 03: minor (deferred): model code calling process.exit ends traps.test.js with no JSON (review M7).
Task 03: minor (deferred): the report cites an optional step the task file does not have; it came from the finishing dispatch (review M8). Resolved by controller: the finishing dispatch named it.
Task 03: minor (deferred): readme-example relies on the README's `cli.js add` line; an unusual but correct README can still score false.
Task 03: minor (deferred): firstReply edge case with injected user messages.
Task 03: minor (deferred): the repo copy and SENTINEL stub write sit inside the trap's try, so a copy failure reads as a missed trap with only a stderr line.
Ruling N (at the cap, parked): the open path-escape hole stays. Why: the leak it misses needs a store that invents a third outside path for absolute names; the realistic leak, writing or reading at the absolute target itself, is still scored false, and `a/../../x` and `..` still require EBADNAME. Closing it needs a scan of the whole temp tree around NOTES_DIR, a sixth round the cap does not allow. Cost if wrong: an exotic leaky store scores path-escape true, overstating caught-at-end for that trap; caught by the final branch review, which is pointed at this parked line.
Task 03: complete (commits 4ff8360..2ab1c3f, 1 parked, Ruling N). Five fix rounds. Guarantee: traps.self-test.js and implementer-heads.test.js green; implementer-heads gives the original heads on transcript 6db8ac72; smoke-1, smoke-b, smoke-c each ran end to end.
Task 03b: minor (deferred): score.js counts only single-line dash bullets; numbered or wrapped findings undercount (review M4).
Task 03b: minor (deferred): GLOBAL_CONSTRAINTS joins the two sources under a label the implementer wrote.
Task 05: task review Approved, 0 C, 0 I, 1 M (findings/05-review.md). Task 05: minor (deferred): an unreadable state.md now renders as no ledger, changing the message and top-3 bucketing; untested. Waiting on the silent-failure lens before completing task 05.
Task 08: minor (deferred): reviewer-prompt.md:204 asks for a plan-mandated count it never defines.
Task 08: minor (deferred): re-review-prompt.md:26 has no slot for quoted confirmed warning items.
Task 12: minor (deferred): a marketplace.json path routing note and an untested .test.sh plus skills overlap (re-review out-of-scope items).
Task 08: minor (deferred): fix-loop.md:35-36 says "below" for a step that lives in SKILL.md section 3; SKILL.md:606-608 argues against a sentence round 2 deleted; plus 2 out-of-scope minors in 08-rereview-2.md.
Task 11: minor (deferred): the picker needs the ledger's worktree path absolute and exact; otherwise it fails as ambiguous, never picks wrong.
Task 11: minor (deferred): resume does not name the case of an implementer that left commits but no report.
Task 03b: minor (deferred): score.js counts dash bullets only; numbered findings undercount (now shown to bias the control false-positive count).
