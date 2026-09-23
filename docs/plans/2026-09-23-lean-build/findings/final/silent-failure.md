# Final review, silent-failure lens (branch mode), 2026-09-23

1. Critical. tests/lane-triggering/run-all.sh:21 counts any zero exit as PASS, and run-test.sh:37,71 exits 0 on SKIP (no CLI, no credential): the suite can print "N passed, 0 failed" with no lane exercised (ledger Ruling J). Fix: a distinct SKIP exit code, counted separately and never as a pass.
2. Important. tests/review-bench/score.js:49 falsePositive counts every Critical and Important bullet, including the one that correctly caught the defect, so on real cases it tracks caught (bench-baseline.json: empty-throws caught 3/3, falsePositive 3/3); untested outside control. Fix: count bullets that do not match the case's regex.
3. Important. scripts/test-scope:30 returns no commands for a deleted path before any rule, including the check-all fallback (same as adversarial 5).
4. Important. scripts/build-cost:129-130 recognizes a Bash ledger write only by ">>" or bashEditDiff; if a harness omits bashEditDiff, a tee -a write is invisible and tasksCompleted and fixRounds undercount silently. Fix: also match state.md writes by command shape (tee -a, cat >>) and warn when the ledger text shows completions the parser missed.
5. Minor. scripts/build-cost:280 drops a subagent file with zero records without flagging it.
Not flagged: lib/plan-state.js:313 and lib/preamble.js best-effort paths (documented fail-open).
