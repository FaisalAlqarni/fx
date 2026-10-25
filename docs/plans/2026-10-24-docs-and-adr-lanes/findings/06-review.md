### Spec Compliance

- ✅ Spec compliant. Brief section, lane, beside files, docs step, Docs line, ledger line, lookup reference, six pointers, gates, ADRs 0062/0063 and index rows are all in the diff. Sizes: fx-docs 4,943, fx-debug 19,335, fx-brainstorm 18,771, fx-retro 2,854 bytes, all under 20,000.
- ⚠️ Cannot verify from diff: the `scripts/check-all` ALL GREEN claim (I did not re-run the suite, per the template); the controller's phase gate run is the evidence. The ruling to "correct SURFACE.md's reference count": I found no count line in SURFACE.md or README.md at 3f88c5a, so nothing to fix (implementer's claim holds).
- Ruling checks: 20-claim cap lives once in `docs-index query --limit` (compile-brief.ts:1063 passes `--limit 20`, `cut` only trims text, no second claim cap); skip rule uses "no Evidence-bearing Markdown outside docs/plans/" (docs-lookup.md:3, final-review.md:5, test "no .fx/ is created" compile-brief.test.ts:997-999); unattended ledger text `Docs: not run: offered, owner away` (final-review.md:15); S7 holds (offer, never invoke without yes); the ADR Evidence-format seam is excluded as instructed.

### Strengths

- compile-brief reuses `docs-index` through a subprocess and fails loudly on a bad exit or missing `claims` list (compile-brief.ts:1064,1068) rather than printing `None.` over a broken index.
- Tests cover every Tests-field case with exact strings: section order, `None.`, no `.fx/`, 20 + `+5 more`, 200-char cut with `...`, `Test:` lines counted (compile-brief.test.ts:989-1008); brief-size adds the 20 x 200 case under the existing cap.
- Lane text follows the nine content items in order; code-wins and "never install a tool" rules are stated once; docs-lookup.md is a leaf and defines the `Docs claim wrong:` line once.
- ADRs 0062/0063 follow the 0059-0061 shape, numbered decisions, backticked Evidence lines whose symbols exist at HEAD (`stalePassOne`, `loadIndex`, `writeIndex` in src/lib/doc-index.ts). No em or en dashes in the added lines (checked).
- Valid runtime RED reported for compile-brief, user-invoked and brief-size, each failing on the missing section or lane.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
- skills/fx-docs/SKILL.md:69 (section 4 step 1) · branch mode queries `docs-index ... query <changed paths>` with no `--limit`, and `query` defaults to 20 claims (scripts/docs-index limit = 20, `slice(0, limit)`). A branch with many changed files yields more than 20 claims, the rest are cut, and step 2 ("update the docs those claims live in, verify every claim in them") never visits those docs. The lane silently under-covers, the failure the docs step exists to prevent. docs-lookup.md:12 tells a lane to narrow and re-query on `more > 0`, but the branch-mode step neither says that nor passes a large `--limit` (not a new cap, just reading the full set). Fix: add `--limit 1000` (or "repeat until `more` is 0") to that command.

#### Minor (Nice to Have)
- src/skills/fx-implement/scripts/compile-brief.ts:1063 · the docs-index subprocess runs with `stdio` stderr `ignore`, so the `die("docs-index query failed (exit N)")` message loses the real cause (for example a malformed index). Pipe stderr and append it.
- skills/fx-implement/references/final-review.md:1-17 · the docs step now owns the file's first `##` heading, so the unchanged branch-pass text below it sits under "Docs step: offer before the branch pass". Add a heading such as `## Branch pass` before "Package the whole branch".
- No test for the `die` paths in compile-brief docsOut (non-zero exit, no `claims` list). The fail-loud behaviour is unproven.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** Everything in the spec is present and tested, but branch mode inherits the 20-claim default and silently skips docs beyond it, which undercuts the lane's core promise; one-line fix.

## Ledger lines

Task 06: minor (deferred): compile-brief docsOut discards docs-index stderr, so a failure message loses its cause
Task 06: minor (deferred): final-review.md branch-pass text now sits under the Docs step heading, add a branch-pass heading
Task 06: minor (deferred): no test covers compile-brief docsOut die paths (bad exit, missing claims list)
