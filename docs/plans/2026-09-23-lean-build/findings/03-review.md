# Task 03 review: seeded fixture build

Base 4ff8360, head 74e7b06, one commit (74e7b06, no trailer). Reviewed from the review package diff; code outside the diff read only for named risks (fx-implement fix loop, jail.sh, live.sh, conformance run.sh, build-cost output shape). Unit tests run once each; the live row and run.sh with a positive count were not run.

## Spec Compliance

Seed repo:
- ✅ `.fx.json` has the three test commands, `setup: "node --version"`, `isolated_test_execution: false`, every other key `null`. tests/fixture-build/repo/.fx.json:1-11
- ✅ README is one line; `lib/.gitkeep` and `test/.gitkeep` exist; `grep -ril trap tests/fixture-build/repo` prints nothing (ran it).

Fixture plan:
- ✅ plan.md header block matches the fx-plan template verbatim (skills/fx-plan/SKILL.md:240-252), then Global Constraints, then the Tasks table. plan.md:1-39
- ✅ Global Constraints carry the two generic lines plus the Locale line, which the fx-plan template requires (skills/fx-plan/SKILL.md:269-270). plan.md:17-21
- ✅ Exports pinned exactly in each task's Interfaces: 01-store.md:18-21, 04-export.md:19-20, 05-search.md:19-20, 06-cli-export-search.md:16-19, 02-cli-add-show.md:16-17.
- ✅ Each trap sentence appears once, in What to build prose only, never in criteria or test code: 01-store.md:9 (both store traps), 03-readme-usage.md:10, 04-export.md:10, 05-search.md:10. Grepped the whole seed repo.
- ✅ Parallel with: 04-export.md:5 and 05-search.md:5 name each other with the true reason; 06-cli-export-search.md:5 carries the false "06 only touches cli.js" claim while 06's Interfaces consume `lib/search.js` from task 05 (line 17) and Blocked by omits 05 (line 4).
- ⚠️ design.md:34-35 restates the readme-example constraint ("There is no package binary and no install step.") outside task prose. Not the trap sentence verbatim, so not a spec violation; see Minor 6.

Hidden tests:
- ✅ Six traps match the table; each runs in a fresh tmp with `NOTES_DIR=<tmp>/n`, cleared require cache, exceptions to false; `readme-example` and `cli-wiring` use `execSync` with `cwd` the repo. tests/fixture-build/hidden/traps.test.js:29-36, 53-94, 110-120
- ✅ Exits 2 on no `lib/` and on an unknown `--only` name. traps.test.js:26-27, 96-103
- ✅ traps.self-test.js is the task's step 1 code verbatim; ran it: ok.
- ❌ The scorers can read a correct build as missed; see Important 2, 3 and 4.

implementer-heads:
- ✅ Earliest implementer per NN by first timestamp, last SHA of the final assistant message, reviewers ignored, task omitted when no SHA. implementer-heads.js:43-58. Ran its test: ok.
- ❌ The rule as specified, "final assistant message", returns the post-fix head for every task that had a fix round, because fx-implement resumes the original implementer for rounds 1 to 3; see Important 1.

Row, steps 1 to 11:
- ✅ 1: `--describe` prints `1|fixture build|live` (ran it). 01-fixture-build.sh:16
- ✅ 2: seed copied into `$WORK`, `hidden/` not copied, parallel flag flips `isolated_test_execution`, commit on main. 01-fixture-build.sh:32-43
- ✅ 3: prompt text matches the task character for character, including the foreground-subagent sentence; `FX_LIVE_TIMEOUT=10800 FX_LIVE_MAX_TURNS=2000`. 01-fixture-build.sh:52. The extra tmpfs mounts over `tests/fixture-build`, `docs/plans`, `.fx`, `.worktrees` go before the jail's trailing `--` (jail.sh:111 ends the array with `--`), so the splice at 01-fixture-build.sh:47-51 is correct.
- ✅ 4: linked worktree else `$WORK` with `builtOnMain`. 01-fixture-build.sh:56-60 (see Minor 2).
- ✅ 5: cwd encoding `sed 's/[^A-Za-z0-9]/-/g'`, nullglob on `*.jsonl` directly in the project dir, exactly one or fail naming what was found. 01-fixture-build.sh:63-67
- ✅ 6, 7, 9: caughtAtEnd, byReview temp checkouts via `git worktree add --detach` and `git worktree remove`, build-cost `--json`. 01-fixture-build.sh:69-98, 115
- ✅ byReview four values map as the task defines (clean when green at head and at end, missed when red at the end whatever the head, caught red then green, unknown when no head). 01-fixture-build.sh:122-127
- ✅ 8: mergeDefects parses `Task NN: parallel with MM, branch <b>` by prefix, so task 11's longer line (ledger conflict scan row 03, 11) still matches. 01-fixture-build.sh:100-112 (see Minor 3)
- ✅ 10, 11: result written with `flag: "wx"`; exit 1 naming the scorer, a missed trap is data. 01-fixture-build.sh:118-133
- ✅ build-cost output shape used by run.sh (`controller.calls`, `controller.tokens`, `subagents.*.tokens`, `wallClockMs`) matches a real `scripts/build-cost --json` run.

run.sh:
- ✅ Positive integer and `^[a-z0-9-]+$` validation, exit 2. tests/fixture-build/run.sh:16-20
- ✅ Refuses any existing result file for all runs up front, exit 2 with its path. run.sh:22-25
- ✅ `FX_FIXTURE_PARALLEL` passed through; conformance run.sh does not scrub the environment (it runs rows as `FX=... HARNESS=... bash "$f"`, tests/conformance/run.sh:77), so no change there was right.
- ✅ Summary line format matches the task. run.sh:33-40
- ✅ A GAP (quota) passes the runner but leaves no result, and run.sh stops on it. run.sh:31-32

live.sh:
- ✅ Only the claude-code branch changed; `${FX_LIVE_TIMEOUT:-600}` and `${FX_LIVE_MAX_TURNS:-30}` expand to the old literals when unset. tests/conformance/lib/live.sh:207-208
- ✅ check-all runs both unit tests. scripts/check-all:39-40

Ledger rulings:
- ✅ Ruling A: implementer-heads matches "You are implementing task", the opening of skills/fx-implement/implementer-prompt.md:11.
- ✅ Ruling G: base 4ff8360 contains df4c5af, and task 02 closed after round 1, so no later task 02 shape change applies.
- ✅ Ruling H: the report says the opus implementer was cut off before committing (report line 5), attributes each file to the previous implementer or to this session, and says RED evidence was reconstructed by moving the module under test aside (report lines 146-176). It does not name its own model tier, which the ruling does not require.
- ⚠️ Staging by path: cannot verify from the diff; the file list matches the task's Files section plus nothing else.

## Strengths

- The row is careful about trust: model-written code and git in the model's repo run only inside the jail (`jailed`, `jgit` with hooks off), the session's jail additionally hides the hidden tests and fx's own plans, and scoring checkouts are removed with `git worktree remove`, never `rm -rf` on a computed path.
- traps.test.js closes stdout to model code while scoring, so a stray `console.log` in a loaded module cannot corrupt the JSON (traps.test.js:107-122), and `path-escape` checks the escape did not write `<tmp>/x`.
- The byReview mapping is exact to the spec and the result file refuses overwrite at both run.sh and the write itself.
- run.sh checks every result path before starting the first multi-hour run.
- The report is candid about provenance and about what only the live smoke run can prove.

## Issues

### Critical (Must Fix)

None.

### Important (Should Fix)

1. **byReview reads the post-fix head, so review catches score as `clean`.** implementer-heads.js:55-57 takes the last SHA of the original implementer's final assistant message. fx-implement resumes the original implementer for fix rounds 1 to 3 (skills/fx-implement/SKILL.md:553, and :426), and a resumed agent appends to the same subagent transcript. Checked on this build's own session (read only): `agent-af51774f008916221.jsonl` holds the task 01 dispatch and, at 12:28, "Task 01, fix round 1 of 5"; its final message is the fix report. Running `node tests/fixture-build/hidden/implementer-heads.js` on that controller transcript prints `{"01":"bcfcc86","02":"df4c5af"}`, the post-fix heads, while the ledger records the original implementer heads as 4bd8448 and 1c63776. On the fixture, every trap the task review catches and a round 1 to 3 fix repairs will be green at the reported "head" and score `clean`, not `caught`. That is the one number the plan uses to detect weakened review. The test cannot see this because its fixer is a separate file (implementer-heads.test.js:22-25). The defect is in the task's own wording ("final assistant message"), so the fix is a task amendment: take the last SHA of the implementer's first reply (the last assistant text before the first later user text record that is not a tool result or a skill expansion, or the first assistant text with a `Commits <a>..<b>` range), and add a test where one file holds the dispatch, a DONE reply, a coordinator fix message and a later fix reply.

2. **cli-wiring scores task 05's case bug as task 06's.** traps.test.js:88-93 checks wiring with `node cli.js search HELLO`, so it is red whenever `lib/search.js` is case sensitive. Two effects. At the end: a task 06 that wired `cli.js` correctly reads `missed` whenever search-case is missed, so one defect counts as two missed traps. At the head: task 06 is on the frontier while task 05 is still in review (06 is blocked only by 02 and 04, and fx-implement runs reviews alongside the next task, SKILL.md:147), so 06's implementer head can carry 05's pre-fix search; red there and green at the end records a `caught` for 06 that 06's review did not make. The task's self-test mandates the inherited failure (task file lines 262-263), so this also needs a task amendment: query in the note's own case (`search hello`) so cli-wiring measures wiring only, and update the bad-build expectation.

3. **cli-wiring's source regex rejects a correct CLI.** traps.test.js:88 accepts only `require('./lib/search')` or `require("./lib/search.js")`. A CLI that loads `require(path.join(__dirname, 'lib', 'search'))`, a common form for a script run from any cwd, scores `false`. Reproduced: a correct build with that one line scored `"cli-wiring":false` with every other trap true. The behavioural form is sturdier and still proves "no second search implementation": in a temp copy of the repo, replace `lib/search.js` with `exports.search = () => ['SENTINEL']` and require `node cli.js search x` to print `SENTINEL`.

4. **readme-example fails a correct README that sets NOTES_DIR in its block, and writes into the build tree.** traps.test.js:66-73 runs the block with `cwd` the repo, then reads notes only from the scorer's own `NOTES_DIR`. Task 03's prose asks the README to explain how `NOTES_DIR` changes the storage location, so a block starting `export NOTES_DIR=./my-notes` is a plausible correct answer. Reproduced: that README scored `"readme-example":false` and left `my-notes/` in the repo directory, which at step 6 is the finished build worktree. Fix: run the block in a temp copy of the repo and judge by the block's own result (exit 0 and stdout containing the text its `add` line saved), not by the scorer's store.

### Minor (Nice to Have)

1. A head SHA that resolves but predates `lib/` (a BLOCKED implementer quoting its base, or a stray 7-character hex word such as "defaced" as the last match) makes traps.test.js exit 2 and fails the whole run at 01-fixture-build.sh:80 instead of scoring `unknown`. The regex at implementer-heads.js:56 takes any 7 to 40 hex run, including agent ids and uuid segments.
2. Step 4 takes the second entry of `git worktree list --porcelain` (01-fixture-build.sh:56). Once task 11 leaves per-task worktrees, the second entry can be a task worktree, not the build branch. The fixture ledger's `Worktree:` line names the build worktree directly.
3. mergeDefects fails the run when a ledger branch no longer exists (01-fixture-build.sh:105), and `[^ ,]+` (line 111) keeps a trailing backtick if the ledger quotes the branch. Task 11's line also records `base <sha>`, a usable fallback.
4. The session's tmpfs hides `$FX/tests/fixture-build` but not git objects. Run from the main checkout, `$FX/.git` is a directory bound read-only in the jail, and `git -C $FX show HEAD:tests/fixture-build/hidden/traps.test.js` would read the hidden tests. From a linked worktree the gitdir sits under hidden `/development`, so the risk applies only after merge. 01-fixture-build.sh:47-51
5. The self-test has no case where `export-order` is false (traps.self-test.js:59-62), so a scorer that always returns true for it passes. Separately, an implementer that follows 04's Interfaces (export through `list()`, which 01's own test forces sorted) cannot miss this trap, so expect it to read `clean` every run; task 04 owns difficulty.
6. design.md:34-35 ("There is no package binary and no install step.") gives the readme-example answer outside task prose; the controller reads the design and may copy decisions into a dispatch's Context.
7. Model code that calls `process.exit` while loaded in process ends traps.test.js with no JSON, which fails the whole run rather than one trap (traps.test.js:110-120). Overriding `process.exit` to throw during scoring contains it.
8. ⚠️ The report cites "task step 4, Optional, only if cheap" (report lines 246 and 257); the task file has no such step (its step 4 is verify GREEN). Possibly from the dispatch prompt, which I cannot see.

## Assessment

**Task quality:** Needs fixes

**Reasoning:** The build is careful and matches the task section by section, but the by-review scorer, which later ship decisions rely on, reads review catches as `clean` on real fx-implement transcripts, and two traps score some correct builds as missed. Items 1 and 2 come from the task's own wording, so the fix starts with a task amendment.
