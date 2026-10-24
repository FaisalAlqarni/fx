### Spec Compliance

- ✅ Spec compliant. File by file: review-package (guard after the two rev-parse lines, before the empty-range check, exact stderr text, exit 3; header dash and line-49 warning fixed), review-package.test.ts and built .js (three cases per the Tests field), check-all (run line added), re-review-prompt.md (all three [TASK_FILE] uses now [BRIEF_FILE]; task number from the `## Task` heading; placeholder text as specified), fix-loop.md (recompile paragraph with the link, brief path in the resume fallback and rounds 4 to 5), check-paths (orphan entry deleted), return-contract and fix-loop-shape tests with built .js.
- ⚠️ Cannot verify from diff: the diff view elides some context lines, so I read the touched files directly. Checks run: grep for TASK_FILE or "task path/file" in re-review-prompt.md and fix-loop.md found none left; `re-review-prompt.md` is now linked from fix-loop.md:76; dash grep on the prompt, fix-loop and the new test returned 0. I did not re-run the suites (the report shows RED then GREEN, with the runtime RED `0 !== 3` caused by the missing guard).

### Strengths

- Guard placement is correct: it runs before the empty-range check, so a detached or wrong-branch HEAD never reaches package writing (review-package lines 28 to 33). The test asserts stderr equals the exact message and that `.fx/s/review` is absent, so "no package written" is checked, not assumed.
- Test uses a real scratch git repo with the `-c user.name=fx -c user.email=fx@example.invalid` identity and leaves it in os.tmpdir(), as the Risks field asks. The ancestor case checks the printed path exists.
- The ledger-lines instruction in the re-reviewer now names the brief's `## Task` heading, so the filename-derived task number cannot go stale.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
None.

### Assessment

**Task quality:** Approved
**Reasoning:** The guard, prompt and fix-loop changes match the brief and the Interfaces text exactly, and the tests exercise real behavior (process exit code, stderr, file absence). No caller or variant is left on the old task-file contract.

## Ledger lines
