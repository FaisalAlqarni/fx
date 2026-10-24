### Spec Compliance

- ✅ Spec compliant. File-by-file against the brief's Files list: templates.md (Review Focus, Not this task), fx-plan SKILL.md (framing, scratch-build ban, checks 5 and 6, red flag, unattended rule), fx-devils-advocate.md and its regenerated .toml (same hunks), compile-brief.ts and built compile-brief, both tests plus built .js, final-review.md, both reviewer templates, review-inputs.md, plan-template and review-content tests. Every listed file has its hunk.
- ⚠️ Cannot verify from diff: the unattended-rule wording in the red-team tags and the final-review.md "verbatim" instruction have no test; checked by reading only (SKILL.md section 8, agents/fx-devils-advocate.md unattended paragraph, final-review.md line 8).

### Strengths

- compile-brief emits `## Review focus` directly after Global constraints, `None.` fallback, in both .ts and built .js; the order test and the body-only test (no heading, no `## Tasks` leak) check real output of the binary.
- The reviewer-template lines say "when the brief has one", as the S2-amended ruling requires.
- The Codex role matches the agent file hunk for hunk; check-generated passes.
- withFile moved earlier in the test rather than duplicated.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
- skills/fx-plan/SKILL.md section 8 and agents/fx-devils-advocate.md unattended paragraph: acceptance criterion 2 ("edits the plan only for [blocks], logs each [advisory] in state.md") is covered by no gate assertion, so the wording can drift unnoticed. Add a `includes('[advisory]')` check in plan-template.test.ts.

### Test run (directive)

Ran `scripts/test-scope` on the 16 changed paths, whole output read (173 lines). Everything passed through dispatch-route.test.js, including compile-brief, plan-template, review-content, skill-size, check-generated. One FAIL: `brainstorm-confidence.test.js`, assertion "step 6 adds the builder check" (tests/gates/brainstorm-confidence.test.js:40). Not attributable to task 13: task 13's range 4bc7e34..d983c6d does not touch that test or skills/fx-brainstorm, and the worktree now holds uncommitted task 14 edits to exactly skills/fx-brainstorm/SKILL.md and brainstorm-confidence.test.ts/.js (task 14's builder-check work, mid-run). Task 13 is not the cause.

### Assessment

**Task quality:** Approved
**Reasoning:** The brief section, templates, reviewer wiring and red-team tags match the spec and are tested through the real binary; the only failing gate belongs to task 14's uncommitted work.

## Ledger lines

Task 13: minor (deferred): no gate asserts the [blocks]/[advisory] unattended-revision wording in fx-plan SKILL.md or the devils-advocate agent
