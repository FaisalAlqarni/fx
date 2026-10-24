# Task 14, fix round 3: controller re-review

**Range:** 8584306..5384d62. 19 production lines. The one removed test line is the closing line of the kept-cases list, extended with new cases; no assertion was edited or deleted, so a controller re-review applies.

### Finding verdicts

- **I-A: ADDRESSED.** `maskForJudge` now returns the command unchanged when RUNS_CODE (a dollar-parenthesis or a backtick) matches anywhere in the raw text (shell-rules.ts:524, 557). That covers an unquoted heredoc body and a substitution nested in a braced expansion, the two paths the parser never records in `c.subs`. Both have kept cases in shell-guard.test.ts.
- **I-B: ADDRESSED.** GIT_RUNS (shell-rules.ts:530) matches every prefix of `--edit` from `--e`, and any short-flag cluster containing `e`. Kept cases cover `--edi` and `--e`.
- **Minor 1: ADDRESSED.** `maskable` refuses a git argument containing a dollar sign (shell-rules.ts:541). Kept case: `git commit $FLAGS -m ...`.
- **Minor 3: ADDRESSED in part.** New kept cases isolate the pipe into a writer and a redirection on git. `--edit` is isolated by the I-B cases.

### New breakage

None found. Every new refusal only stops masking, so the judge sees more text, never less. Friction: a commit message holding a literal dollar sign or a backtick is no longer masked, so the judge may still question it. The `&>` WRITES minor stays deferred.

### Tests evidence

`scripts/check-all` with scratch HOME and TMPDIR: ALL GREEN, after the 0.3.1 version bump (release-version failed before it, as the standing ruling expects).
