# Task 03 re-review, fix rounds 1 and 2 (11fed10..6ae266d)

Read from the review package diff, the amended task file, Ruling I and the task 03 ledger entries, and the implementer report (fix rounds 1 and 2). Reproductions ran in a mktemp dir under /tmp, removed afterwards; no fx-trap temp dirs were left behind. The live row and run.sh with a positive count were not run. The unit tests were not re-run: the report shows RED and GREEN output for both, and my reproductions cover the traps changes independently.

### Finding verdicts

- Review I1, byReview read the post-fix head: ADDRESSED. tests/fixture-build/hidden/implementer-heads.js:77 `firstReply` takes the last assistant text before the first later user record that is neither a tool result nor a skill expansion; :66-70 narrows a skill expansion to an isMeta record whose text starts "Base directory for this skill:", so the isMeta coordinator message ends the first reply. Covered by implementer-heads.test.js:45 (plain fix-round message) and :61 (real transcript shape, isMeta on both). The controller's run on transcript 6db8ac72 printed {"01":"4bd8448","02":"1c63776"}, the original heads in the ledger.
- Review I2, cli-wiring scored task 05's case bug as task 06's: ADDRESSED. traps.test.js:112-115 judges wiring in a temp copy with lib/search.js replaced by the SENTINEL stub, and no query depends on case. Reproduced: a correct build with a case-sensitive lib/search.js scored `"search-case":false` and `"cli-wiring":true`. The self-test's `bad` expectation now reads cli-wiring true (traps.self-test.js), matching the amended trap table.
- Review I3, the cli-wiring regex rejected a correct CLI: ADDRESSED. The source regex is gone. Reproduced: a CLI that loads search and export through `require(path.join(__dirname, 'lib', ...))` scored cli-wiring true; a CLI with its own inline search that never requires lib/search.js scored `{"cli-wiring":false}`. Self-test cases at traps.self-test.js:104 and :106.
- Review I4, readme-example failed a README that sets NOTES_DIR and wrote into the build tree: ADDRESSED. traps.test.js:81-94 runs the block with `sh -e` in a temp copy, a temp NOTES_DIR the block may override, and passes on the block's own stdout containing the text its add line saved (`addedText`, :58). Reproduced: a README opening with `export NOTES_DIR=./my-notes` scored readme-example true, and a `find` listing of the scored tree before and after the run was identical (no my-notes/ left behind).
- Lens 1, the merge-defect count had no failure check: ADDRESSED. rows/01-fixture-build.sh:117 `|| fail "mergeDefects: could not count task $t's green-then-red traps at $b"`.
- Lens 2, the worktree-list pipeline status was unchecked: ADDRESSED. rows/01-fixture-build.sh:59-62 lists to a mktemp file under $LIVE_SCRATCH, checks jgit's own status (:60), then runs awk on the file. The host shell does the redirect, so the jail does not need to write the file. An empty BUILD still means built on main, which is now only reached after a successful listing.
- Lens 3, the head lookup and the AT_HEAD merge were unchecked: ADDRESSED. rows/01-fixture-build.sh:100 and :105. Every scorer step in the row now fails naming itself: caughtAtEnd, implementer-heads, head lookup, `at` (checkout, traps exit, removal), AT_HEAD merge, merge-defect scoring and count, build-cost, and the result write.
- Lens 4, traps.test.js could not tell a scorer bug from a build failure: ADDRESSED. `fresh()` is now outside the build's catch and exits 1 naming the trap (traps.test.js:151); a trap name with no function fails the run (:134); `mkdtempSync` was already uncaught. Exceptions inside a trap still score false, now with `traps.test.js: <trap>: <message>` on stderr. The row's `traps()` does not redirect stderr, so that line reaches the run log. The split is sound for what it claims: inside a trap, `execSync` failures and the build's own throws cannot be told apart in general, and the stderr line makes a scorer bug auditable instead of silent. One residual, non-blocking: the `fs.cpSync` of the repo and the SENTINEL write in readme-example and cli-wiring are pure scorer setup yet sit inside the catch, so a copy failure reads as a missed trap with only a stderr line. They could move outside the catch the way `fresh()` did.

### New breakage in the fix diff

None Critical or Important. Minor notes:

- readme-example is now tied to a `cli.js add <name> <text>` line (traps.test.js:58-61). A correct README that writes `node cli add ...` without the extension, or quotes a name with a space (`add "my note" text`, where the bare-word fallback captures `note"`), scores false. The task prose names cli.js and the seed's names have no spaces, so this is unlikely on the fixture.
- firstReply treats any other user record after the dispatch as the end of the first reply. A hook-injected or interrupt user record in the middle of the first turn that is neither a tool result nor a skill expansion would pick an earlier, pre-commit SHA or none. The implementer flags this; the real transcript gave the right answer, and task 04's smoke run is the next check.

### Out-of-scope observations

- The task file's step 1 self-test code and the sentences near its lines 258 and 266 still say the buggy build scores cli-wiring false because its CLI search inherits the case bug. Ruling I amended the trap table but not these lines, so the committed self-test (correctly) no longer matches the task's step 1 code verbatim. The controller owns the task file.
- The ledger scan at rows/01-fixture-build.sh:119-121 still reads with `cat ... 2>/dev/null`, so a present but unreadable ledger reads as no parallel tasks (the controller's own lens note). Lens Minor 5, the unchecked SEED rev-parse at :43, remains deferred.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage. Review I1 to I4 and lens 1 to 4 are addressed; the notes above are Minor or out of scope.
