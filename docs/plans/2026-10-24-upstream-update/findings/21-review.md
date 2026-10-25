### Spec Compliance

- ✅ Spec compliant. Ten files at the paths the brief lists; each .md has `## Scenario`, `## Pressure`, `## It's working if` (checked: `grep -c "^## "` prints 3 for all five) and ends with the run command in the brief's form; each .txt states the directory is empty and carries its whole subject (ruling for task 21 held).
- ⚠️ Cannot verify from diff: the Phase 4 gate (`scripts/check-all` ALL GREEN) rests on the report; not re-run. No fixture was run live, as the brief allows.

### Strengths

- Pressure kept, wording moved to riyals and Rails (Faraday timeout, payment spec, session middleware), no dashes (grep for U+2014/U+2013 over tests/compliance: none).
- Debug criteria carry all seven signs from the brief in order; tdd criteria carry the six signs. `grep -n compliance scripts/check-all` prints nothing.
- Prompts end with "act, do not ask", which keeps a headless 30-turn run from stalling on a question.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
- tests/compliance/*/*.md:1 · each file has an H1 title line above the three `##` headings; the brief says "exactly three headings". The grep gate passes, but a stricter reader counts four.
- tests/compliance/fx-tdd/01-stubbed-and-restored.md:17 · the seventh criterion (decline to reuse the pre-written method) asks the model to override an explicit user instruction and is not among the six mattpocock signs; it may score a reasonable "do what the user asked, then also drive TDD" run as a fail. Same for fx-tdd/02-skip-tests.md:15. Reword as an observable sign or mark it as scenario-specific.
- tests/compliance/fx-debug/0[1-3]-*.md · the three debug .md share an identical first-action criterion and the 'tagged debug logs removed' sign is unobservable when the model, headless with no files, adds no logs; note "n/a if none added".

### Assessment

**Task quality:** Approved
**Reasoning:** The five fixtures meet the brief's structure, wording and gate constraints; remaining points are scoring-clarity polish.

## Ledger lines

Task 21: minor (deferred): each criteria .md has an H1 above the three required `##` headings
Task 21: minor (deferred): extra scenario-specific seventh tdd criterion overrides the user's explicit instruction and is not a mattpocock sign
Task 21: minor (deferred): 'tagged logs removed' criterion is unobservable when no logs were added; add an n/a clause
