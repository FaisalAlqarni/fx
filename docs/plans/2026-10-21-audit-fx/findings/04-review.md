### Spec Compliance

- ✅ Spec compliant. Every acceptance criterion has its hunk in skills/fx-plan/SKILL.md: reader section, §4 right-sizing (one seam, fold docs/ADR/rename/config, merge same-file tasks), §7 without the task count, template with Design/Stack/Tests, conditional Interfaces and Idempotency, no fenced test code, the new seven Steps, the two old test-code paragraphs replaced by one rule plus the trimmed-snippet exception, and the No-placeholders list. File-by-file: SKILL.md, tests/gates/plan-template.test.js, scripts/check-all (line added after brief-size), ADR 0043 all present.
- ⚠️ Cannot verify from diff: report says RED/GREEN and test-scope exit 0. I did not re-run them. The report's RED is a runtime AssertionError on `template fields`, which is a valid RED.
- Rulings: none of the brief's rulings concern this task. Checked each; no violation.
- Unrequested additions, judged:
  - Red flag "Every Tests entry names an input and an exact expected value" (SKILL.md:426): in scope and harmless. It enforces the brief's own Risks mitigation ("exact-expected-value rule ... keeps them precise") and mirrors the new placeholder entry. Keep.
  - "10+ tasks" to "more than 10 tasks" in the phasing flag (SKILL.md:430): harmless. It is not the §7 red-team trigger, so the brief's "no task count" criterion does not reach it. The wording shifts the boundary from 10 to 11 tasks; the report states the reason. Keep, or revert to "10+" if you want zero unrequested delta; no behaviour depends on it.

### Strengths

- Gate test is checked against the real file with slices that fail loudly if a heading moves (indexOf of the section headings), and covers the old-rule removals, placeholder list, conditional flags, and kept error-contract and `type: :request` flags.
- Both required red flags (error contract, spec type) were kept as the brief's Risks demanded (SKILL.md:434-437).
- The template's example Tests entries show input plus exact error key, which models the rule it states.
- ADR 0043 is complete (Context, Decision, Risks, Supersedes), ties `Design`/`Stack` to ADR 0042, and has no dashes.
- SKILL.md has no em or en dashes (grep for both characters returned no hits).
- Checked the Design/Stack line format against task 03's reader: compile-brief reads `entries(task, 'Design')` and `entries(task, 'Stack')` (compile-brief:70,79), and its test uses the same `Heading > N; Heading` and `stack/Heading` shapes the template shows.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

- skills/fx-plan/COVERAGE.md:20, :24, :37, :40 · rows "questionable taste: restored", "doesn't know good test design: restored", Interfaces K and "Idempotency required" now contradict or describe the old unconditional form of rules SKILL.md changed. The file is a provenance ledger, so it may be allowed to lag, but a reader will take it as current. Update the notes to "S, superseded by ADR 0043".
- tests/gates/plan-template.test.js:17-26 · the gate does not pin three acceptance criteria: the new Steps wording (invoke fx-tdd ... commit by path), §4 "one seam", and the reader line "no context for this codebase". A revert of those would pass the gate. Add three `includes` asserts.
- skills/fx-plan/SKILL.md:248 vs :290 · plan.md header has `**Stack:** key technologies.` while the task template now has a `**Stack:** stack/Heading` line with a different meaning and format. Same field name, two meanings in one lane. Rename the header field or add a one-line note in the template that it is not the header Stack.

## Ledger lines

Task 04: minor (deferred): skills/fx-plan/COVERAGE.md rows for audience, test design, Interfaces and Idempotency still describe the superseded rules.
Task 04: minor (deferred): plan-template gate does not pin the new Steps, "one seam" right-sizing, or the "no context" reader line.
Task 04: minor (deferred): fx-plan header `**Stack:**` and task-level `**Stack:**` share a name with different formats.

### Assessment

**Task quality:** Approved
**Reasoning:** Every criterion is met in the diff, RED was valid and the gate is wired into check-all. The two unrequested edits are small and consistent with the brief's Risks section; only stale COVERAGE.md notes and thin gate coverage remain.
