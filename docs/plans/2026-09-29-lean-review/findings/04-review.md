### Spec Compliance

- ✅ Spec compliant. All 9 acceptance criteria map to hunks. Ran from a `git archive aed5128` scratch copy: `node lib/plan-state.test.js` 33 passed 0 failed, `node lib/preamble.test.js` OK, `scripts/check-prose` on SKILL.md + ADR-0031 OK, `return-contract` ok.
- ⚠️ Cannot verify from diff: the `Ruling:` lines in state.md naming task 04 (none bind it; line 33 is a coordination note, "ruling tests filter `- Ruling:` lines", which the test at lib/plan-state.test.js:160 satisfies). Worktree ledger has no `## Standing rulings` section yet; controller should add one, else ledger rulings at lines 5-8 and 45 are not carried by this mechanism.

### Strengths

- lib/plan-state.js:66-83: one small pure function, every read wrapped by `readText`, section regex stops at next `## ` or EOF, dedupe via Set gives rulings.md-first order. No new file or dependency.
- Tests cover each criterion: log-line leak (plan-state.test.js:147), repo-level ruling (:156), dedupe (:157), cap 10 and 200-char line (:164-166), no-heading case (:171).
- Preamble fixture (preamble.test.js:95) uses 10 x 200-char rulings per plan; budget holds without the 6/120 fallback.
- SKILL.md bullet edit keeps the rest of the "Rulings I made" bullet; ADR section covers every item the task listed.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
- lib/preamble.test.js:95: worst-case fixture never asserts the rulings render. All 3 plans use identical r0..r9 so they dedupe to 10, and nothing checks `text.includes('Ruling: r0')`. If `standingRulings` regressed to empty, the budget test would still pass vacuously. Add one include assertion per harness.
- lib/plan-state.js:79-80: dedupe runs before the 160-char cut, so two distinct long rulings sharing their first 159 characters render as two identical lines. Edge case, cosmetic.
- lib/plan-state.js:95: `describePlans` returns null when no unfinished plans exist, so a `docs/plans/rulings.md` ruling is not injected in a session with no unfinished plan. Matches the stated interface, but ADR-0031 prose says "at every session start" without that qualifier.

### Assessment

**Task quality:** Approved
**Reasoning:** Implementation matches the spec, is minimal and never throws; tests and gates pass on a clean extract of the head commit. Only test-strength and wording nits remain.

## Ledger lines

Task 04: minor (deferred): preamble worst-case fixture does not assert rulings render, budget test passes vacuously if rulings vanish.
Task 04: minor (deferred): dedupe before the 160-char cut can show two identical truncated lines.
Task 04: minor (deferred): rulings.md rulings not injected when no unfinished plan exists; ADR-0031 "every session start" is unqualified.
