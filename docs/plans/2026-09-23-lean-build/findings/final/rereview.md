# Final fix wave re-review, c92ec3e..2561492

Scope: every Critical and Important in findings/final/{broad,spec,security,silent-failure,adversarial}.md plus the standards hard violations, against the fix diff only. Standards hard violation 1 is closed by the owner's ruling and is not reopened. G4 and G7 are covered by Ruling T.

Run at 2561492, all green in this worktree: skip-exit.test.sh, row-safety.test.sh, jail-probe.test.sh, score.test.js, build-cost.test.js, test-scope.test.js, return-contract.test.js. `scripts/test-scope --dry-run lib/git-guard.js docs/x.md` and a deleted path both print `scripts/check-all` then release-version. build-cost on /tmp/fx-keep-c/combined-a-1 and combined-b-1 exits 0.

### Finding verdicts

Silent-failure lens

1. Critical, SKIP counted as PASS: ADDRESSED. run-test.sh and run-reps.sh exit 77 on every SKIP path; run-all.sh counts 77 as SKIP and exits 1 on any skip. skip-exit.test.sh proves both no-CLI and no-credential paths and the tally line. No other script reads run-all.sh's exit or tally (grep outside docs/plans).
2. Important, falsePositive tracks caught: ADDRESSED. score.js counts only non-matching Critical or Important items. Re-scored all 55 kept findings files (fx-bench-keep2 and fx-bench-keep-c2-1 to 3) with the old and new scorer: `caught` is identical in every row; falsePositive now drops on reviews whose only Critical or Important finding is the catch.
3. Important, deleted path runs nothing: ADDRESSED (same fix as adversarial 5).
4. Important, tee -a ledger write invisible: ADDRESSED. LEDGER_APPEND_RE matches `>>`, `tee -a` and `tee --append` on a state.md target, with a state.md.bak decoy in the test. The suggested "warn on missed completions" was not added; bashEditDiff stays as the second path, which is enough.

Security lens

1. Important, host cp follows a planted symlink: ADDRESSED. rows/01-review-bench.sh copies the prompt and findings only through `live_regular`, and the pre-score check uses it too. The jail runs with `--die-with-parent`, so no session process outlives live_run to race the check.
2. Important, unvalidated plugin tree in run-reps.sh: ADDRESSED. Relative, non-directory, `/`, top-level, the real home or a parent of it, and a tree with no .claude-plugin/plugin.json all exit 2 before HOME is replaced; skip-exit.test.sh covers each.

Spec pass

1. Important, control false-positive gate never evaluated: ADDRESSED for the scorer. With the fixed score.js the gate can now be read from kept data: baseline control (fx-bench-keep2) falsePositive 3 of 3, combined2 control 3 of 3, so the control draws no more false positives than at baseline. measurements.md does not yet say this; see Out-of-scope.
6. Important, SKIP exits 0: ADDRESSED (same fix as silent-failure 1).

Adversarial pass

1. High, case name in the commit subject: ADDRESSED. Head commit is `task $TASK_NUM`; row-safety.test.sh pins it.
2. High, answer keys readable from the session: NOT ADDRESSED for the bench row, tests/review-bench/rows/01-review-bench.sh:109. The fixture row is fixed (jail_hide covers tests/fixture-build, docs/plans, .fx, .worktrees, tests/review-bench and .git, as asked). The bench row hides only tests/fixture-build/hidden, tests/review-bench/good, tests/review-bench/cases and .git. Still readable inside the bench jail, with FX exported by jail.sh: docs/plans/2026-09-23-lean-build/tasks/03b-review-bench.md:37-44 (every case, its planted defect and its match words), docs/plans/2026-09-23-lean-build/runs/bench-*.json, measurements.md, tests/review-bench/README.md and score.test.js. The finding asked to hide the same set in the bench row. Every host-side read in that row (build-case.js, fill-template.js, score.js) runs outside the jail and TASK_FILE lives under tests/fixture-build/repo, so hiding tests/review-bench, docs/plans, .fx and .worktrees there costs nothing. row-safety.test.sh:24 pins the narrow list, so the gate would not catch this. Severity now Important: no kept bench prompt or findings shows a reviewer reading $FX, but no transcript was checked either.
3. High, lens reply heredoc: ADDRESSED. SKILL.md Lens dispatch saves the reply with the Write tool; return-contract.test.js forbids a `<<'EOF'` in that paragraph. No other heredoc for lens replies remains in skills/ or agents/.
4. Important, git-fixture tests run bare: ADDRESSED. The four paths route to scripts/check-all, which builds the fixture; tests cover all four.
5. Important, deleted path skipped: ADDRESSED. Any missing path routes to scripts/check-all. The fixer's deviation (no string classification) gives a superset of gates; accepted.

Broad reviewer

1. Important, test-scope git-guard routing: ADDRESSED (adversarial 4).
2. Important, build-cost classify: ADDRESSED. Checked all 28 meta files in combined-b-1 by hand against the new counts: implementer 9 (six tasks, two fix rounds, the fix wave), reviewer 7 (six task reviews, the broad review), re-review 3, lens 4 (the four fx:fx-lens-* agents), coverage 1, other 4 (devils-advocate, correctness, spec, standards). Each matches its description.
Minor 1, parallel scaffolding (required in this wave): ADDRESSED in the row, run.sh and README. Seed tasks keep their `Parallel with:` lines by the fixer's choice; left as deferred.

Standards

2. Hard, fix-loop.md over 100 lines with no contents: ADDRESSED. `## Contents` names its five bold-labelled parts; return-contract.test.js enforces it past 100 lines.
1. Hard, SKILL.md length: closed by owner decision; SKILL.md changed only in the lens paragraph (850 lines).

### New breakage in the fix diff

1. Important. tests/conformance/jail-probe.test.sh:81, the probe "a hidden .git reads as nothing", uses `[ ! -s "$PWD/.git" ]`. In a checkout where .git is a directory (the main repo at /development/fx after merge, any fresh clone), jail_hide mounts an empty tmpfs there, and an empty tmpfs directory has size 40, so `-s` is true and the probe fails. Reproduced in a throwaway clone of 2561492 under mktemp: `FAIL jail_hide: a hidden .git reads as nothing`, exit 1, which turns scripts/check-all red on main. It only passes in this worktree because here .git is a file. The hiding itself works in both shapes (the directory reads empty); only the probe is wrong. Fix: for a directory, test `[ -z "$(ls -A "$PWD/.git")" ]`; for a file, keep `! -s`.
2. Minor. skills/fx-review/SKILL.md:189 still says "see fx-implement §3's Lens dispatch for the exact command"; that paragraph now has no command, only a Write tool instruction.
3. Minor. skills/fx-implement/SKILL.md:532 says "your Write tool"; skills are shared with Codex, which has no tool by that name. skills/fx-brainstorm/visual-companion.md:115 already uses "your file-creation tool".
4. Minor. tests/review-bench/score.js:47 ITEM_RE accepts indented items, so a catching finding with a nested "  - Fix: ..." sub-bullet splits into a second, non-matching finding and reads as a false positive, and `important` over-counts. None of the 55 kept findings files has a nested item under Critical or Important today.
5. Minor. tests/gates/return-contract.test.js:40 slices to `indexOf('The reviewer gets three paths')`; if that anchor moves, indexOf returns -1 and the slice runs to the file's end, so the check silently widens (same class as adversarial 8).
6. Minor. scripts/test-scope:37 puts scripts/check-all first but keeps every narrower command after it for the other paths, so a mixed change runs the gates twice.

### Out-of-scope observations

- $FX/.git hidden in both live rows: hooks/, lib/preamble.js, lib/plan-state.js and plugins/fx.js run no git; they only load lib/git-guard, which inspects command text. Low risk, still unconfirmed until the next live run.
- `parallel` and `mergeDefects` dropped from the fixture result JSON: nothing outside docs/plans reads either field (grep over *.js and *.sh). The old run files in docs/plans/2026-09-23-lean-build/runs keep them as history.
- build-cost still reads subagent .jsonl and .meta.json through symlinks with no lstat, and a planted FIFO would block the host-side row. Output is numbers only, so nothing leaks. Same class as security Minor 5 and 6, already deferred.
- measurements.md should record the re-scored control numbers above (3 of 3 on both sides with the fixed scorer), so the spec's control ship condition has a recorded result.
- Adversarial 6 (Math.max spread) stays open as a deferred Minor, as the fixer said.

### Verdict

Not clean. 15 of 16 Critical and Important items are addressed and verified. One stays open: adversarial 2 for the bench row (Important residual). The fix diff adds one Important: jail-probe.test.sh fails wherever .git is a directory, so check-all goes red on main after merge. Both fixes are one line each: widen the bench row's jail_hide list, and make the .git probe handle a directory.

## Ledger lines

Task final: minor (deferred): fx-review/SKILL.md:189 points at an "exact command" in fx-implement's Lens dispatch that is now a Write tool instruction.
Task final: minor (deferred): fx-implement/SKILL.md:532 says "your Write tool", which Codex does not have; say "your file-creation tool".
Task final: minor (deferred): score.js counts an indented sub-bullet as its own finding, so a catch with a nested fix line reads as a false positive.
Task final: minor (deferred): return-contract.test.js:40 widens to the whole file if the "The reviewer gets three paths" anchor is missing.
Task final: minor (deferred): test-scope runs every narrower command after scripts/check-all on a mixed change, so gates run twice.
