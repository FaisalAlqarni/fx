# Task 02 review: lane-triggering suite covers every model-facing lane

Base 4bd8448, head 1c63776, commit 1c63776 (single commit).

## Spec Compliance

Change 1, every model-facing lane has a prompt:
- Checked skills/*/SKILL.md frontmatter directly. Exactly 12 model-facing lanes exist (disable-model-invocation: true absent): fx-architecture, fx-authoring, fx-brainstorm, fx-debug, fx-design, fx-humanize, fx-implement, fx-plan, fx-review, fx-tdd, prototype, research. All 12 have a prompt file under tests/lane-triggering/prompts/. ✅
- fx-authoring/SKILL.md frontmatter (lines 1 to 9) carries no disable-model-invocation key; the flag is mentioned only in the body at line 294 as documentation of the convention. The coverage check correctly reads frontmatter only. ✅ tests/lane-triggering/verdict.test.js:26-31

Change 2, none__ prompts:
- Three prompts created: none__git-question.txt, none__explain-code.txt, none__shell-oneliner.txt. Grepped all eight new prompt files for "fx-": no match in any file, so no prompt names a lane. ✅

Change 3, first-fx-lane rule:
- tests/lane-triggering/verdict.js:20-39 walks stream-json lines in order, keeps only the first Skill tool_use whose stripped name is a directory under skills/, and reports PASS, "FAIL no lane invoked", "FAIL first lane was X", or for expected "none", "FAIL a lane was invoked: X". Ran `node tests/lane-triggering/verdict.test.js` myself: GREEN, all seven behavioural assertions plus the coverage assertion pass. ✅
- run-test.sh:124-129 and run-reps.sh:87-93 both decide PASS/FAIL through verdict.js, not the old "lane appears anywhere" grep. ✅
- `bash -n` on run-test.sh, run-reps.sh, run-all.sh, scratch-home.sh, live.sh: all clean, ran myself. ✅

Change 4, scratch home:
- tests/conformance/lib/scratch-home.sh:14-20 is the one function, scratch_home_claude <dir>, matching the spec's contract (0 copied, 1 no credential, 2 copy failed).
- live.sh:80 sources it; the claude-code case at live.sh:95-101 delegates to it and maps return codes back onto the same gap/fail calls with the same messages the old inline code used. Behaviour unchanged. ✅
- run-test.sh:59-80 and run-reps.sh:40-61 both source scratch-home.sh, capture FX_REAL_HOME before reassigning HOME, mktemp a scratch dir, verify it is under ${TMPDIR:-/tmp} before ever touching it, register a cleanup trap that re-checks the same pattern before rm -rf, then export HOME and CLAUDE_CONFIG_DIR into it and call scratch_home_claude. A missing credential prints "[SKIP] no credential" and exits 0, matching the existing "[SKIP] the claude CLI is not on PATH" convention. ✅
- `grep -n 'HOME' tests/lane-triggering/*.sh`: every hit is FX_REAL_HOME capture (a read) or an export into $SCRATCH_HOME; no write to the real home. Ran myself. ✅
- Every rm targets $SCRATCH_HOME, gated behind a case match against "${TMPDIR:-/tmp}"/*, checked once right after mktemp and again inside the cleanup trap. An empty or corrupted variable cannot match the pattern, so it cannot reach rm -rf. ✅ tests/lane-triggering/run-test.sh:62-72, run-reps.sh:43-53
- Real home is only ever read: scratch_home_claude:16 reads $real_home/.claude/.credentials.json and never writes back to it. ✅
- fx-plan.sh and fx-implement.sh fixtures use only relative paths (mkdir -p docs/plans/..., cat > docs/plans/.../design.md) and are invoked via `( cd "$WORK" && bash .../fixtures/$LANE.sh )` in both run-test.sh:96 and run-reps.sh:74, so they can only write inside the scratch cwd. ✅

Acceptance criteria: all eight boxes verified true by direct inspection or by running verdict.test.js and bash -n myself, as above.

⚠️ Cannot verify from diff:
- Whether the eight prompt files actually fire (or fail to fire) the intended lane against the real claude CLI. Out of scope per the task; owned by task 04.
- Whether the stashed `task02-wip-check` entry's content is identical to what was ultimately committed. The implementer's self-review claims this was checked by hand; a reviewer cannot verify it without popping the stash, which this review must not do.

## Strengths

- verdict.test.js is byte-identical to the test the task specified in Steps step 1; the implementer did not weaken or reinterpret it.
- The TDD evidence is a real RED (spawnSync failing on a missing verdict.js, not a typo) followed by a real GREEN, with an honest intermediate note that the coverage assertion failed again until every prompt file existed, which is exactly what step 3 predicts.
- The double TMPDIR-prefix check before every rm -rf directly answers the repo's own prior incident (a real ~/.claude lost to a cleanup that trusted its variable) named in the task text.
- live.sh's credential-copy behaviour is preserved exactly: same gap/fail calls, same messages, just routed through the shared function.
- Commit stages exactly the file list the task specified, by path, with no attribution trailer and no dashes anywhere in the new files.

## Issues

### Critical (Must Fix)

None found.

### Important (Should Fix)

- **Git stash used against explicit instruction; entry still live on the shared stack.** Ledger line (docs/plans/2026-09-23-lean-build/state.md:52): "Task 02: the implementer used git stash despite the dispatch; entry `task02-wip-check` on lean-build remains on the shared stack (content applied, drop blocked by a hook). Left in place; reported to the owner. Later dispatches repeat 'never stash'." Confirmed still present: `git stash list` shows `stash@{0}: On lean-build: task02-wip-check`. This is a real process violation on a stash stack this repo's own conventions call shared and dangerous (other sessions may push or pop it concurrently), and it is not yet cleaned up, only reported. It does not affect the committed diff's correctness, but it is a live risk left in the worktree.

### Minor (Nice to Have)

- **Duplicated scratch-home setup block.** tests/lane-triggering/run-test.sh:59-80 and tests/lane-triggering/run-reps.sh:40-61 repeat the same roughly twenty lines (mktemp, TMPDIR-prefix check, cleanup trap, HOME/CLAUDE_CONFIG_DIR export, scratch_home_claude call and case) almost verbatim. The task scoped the shared extraction narrowly to "one function, scratch_home_claude", so this is not a spec violation, and the implementer's self-review gives a real reason for not folding it into scratch-home.sh (live.sh already has HOME/CLAUDE_CONFIG_DIR set up by run.sh; the other two scripts do not). A second small helper covering just the mktemp and trap plumbing would still remove the duplication if this pattern grows a third caller.
- **scripts/check-all:39 whitespace.** `run verdict.test.js        node tests/lane-triggering/verdict.test.js` does not column-align with its neighbours the way most other `run` lines do. Cosmetic only, no functional effect.

## Assessment

**Task quality:** Approved
**Reasoning:** All four required changes are implemented correctly and verified independently (frontmatter scan, prompt content grep, verdict.test.js run, bash -n, stash list, commit inspection); the one Important finding is a process violation already surfaced to the owner rather than a defect in the shipped diff.
