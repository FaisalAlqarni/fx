### Spec Compliance

- ❌ Issues found: two stale statements still contradict the new rule (skills/fx-review/SKILL.md:24, skills/fx-implement/SKILL.md:565); one is in a listed file and breaks "fx-implement's Final review matches that rule" and "fx-review branch mode states the limited rule". All other criteria hold on the diff.
- ⚠️ Cannot verify from diff: test_scope and check-generated results (report claims green; not re-run per instructions). Codex tomls reported unchanged because they carry no model line; consistent with the report, not checked.

Per-criterion: route() cases match the brief (lib/dispatch-route.js:20-25, tests dispatch-route.test.js +4 asserts, old "left alone" assert replaced) ✅. Both agents pin `model: sonnet` (agents/*.md) ✅. fx-critique command and skill both edited identically ✅. ADR 0044 present, ADR 0029 status names 0044 ✅. check-all lists the gate ✅. Limited rule, cap of four, fold-in order, cross-task seams, no-ledger full pass all in skills/fx-review/SKILL.md:~109-123 ✅. No dashes added (grepped added diff lines).

Controller question (a), other top-tier `fx:` dispatches: searched skills/, commands/, agents/, references/, lib/, hooks/, codex/ for opus, "most capable", top tier, "Capable because". No other dispatch of an `fx:` agent sets a model. Remaining hits are `general-purpose` or reviewer-prompt dispatches (fix-loop.md:52, fx-implement SKILL.md:746, reviewer/implementer prompt templates), which already carry the line. The implementer's claim holds. Search did find stale prose it missed (Important 1, 2).

Controller question (b), gate only checks the phrase per file: does not meet the criterion's intent. The brief's own step-5 test is file-level, so the implementer matched the plan, but two of the four assertions pass vacuously: skills/fx-review/SKILL.md and skills/fx-implement/SKILL.md already contained `Capable because:` (fx-implement SKILL.md:258 and :350, fx-review SKILL.md:211) before this task, so deleting the new auth-change / standalone lines would not fail the gate. Plan-mandated, see Important 3.

Controller question (c), rewrite of "The branch pass now carries every lens": in scope. The sentence directly contradicts the new rule and the acceptance criterion says the Final review section must match. The replacement "so its wave is usually small" is an unmeasured claim but harmless.

### Strengths

- route() change is a one-token deletion; the existing `CHEAP` and reason regex already give the required behavior, no new code path (lib/dispatch-route.js:20).
- Header comment in dispatch-route.js updated and cites ADR 0044.
- ADR 0044 states its own gate limit under Risks, honestly.
- RED/GREEN evidence in the report is runtime RED for both tests, caused by missing behavior.
- fx-implement final-review text and fx-review lane text agree on trigger wording, cap and order.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)

1. skills/fx-review/SKILL.md:24 · "branch: ... All axes plus every triggered lens, most capable model." contradicts the limited rule added at :109-123 for the with-ledger case · the Two-modes summary is the first thing a reader or agent loads · reword to "with a ledger, the limited pass in §2; with no ledger, every triggered lens".
2. skills/fx-implement/SKILL.md:565 · "waits for the branch pass, where every lens runs on its broad trigger" is untouched and contradicts the new Final review text at :762-769 · same file, same concept, the implementer rewrote one such sentence and missed this one · reword to "waits for the branch pass, which runs it only under the §2 limited-pass rule". Also references/harnesses/claude-code.md:38-39 still says "any `fx:` agent is left alone", now false for an `fx:` agent given a non-cheap model with no reason; update it (outside the listed files, but it documents the behavior this task changed).
3. tests/gates/branch-pass.test.js:104-106 · (plan-mandated) the `Capable because:` check is a whole-file substring test, vacuous for fx-review and fx-implement, which already had the phrase · a call site can lose its line and the gate stays green, the exact failure the task's Risks says the gate prevents · assert on the specific lines instead, e.g. fx-implement contains `final branch review, auth change`, fx-review contains `standalone branch review`, fx-plan contains `plan red-team`, fx-critique contains `critique of a design or plan`.

#### Minor (Nice to Have)

1. skills/fx-implement/SKILL.md:755-758 · the auth-change line applies to security and devil's advocate, but the with-ledger branch pass otherwise dispatches devil's advocate with no `model`, so it runs on sonnet unannounced; fine by design, but the text does not say so · add half a sentence.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** Code and tests for route() are correct and minimal, but two lane sentences (and one reference) still state the old every-lens rule, and the four-call-site gate is vacuous for two of its four files.

## Ledger lines

Task 06: minor (deferred): fx-implement auth-change line does not say devil's advocate otherwise runs on sonnet in a with-ledger branch pass.
