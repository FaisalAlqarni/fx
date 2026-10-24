### Spec Compliance

- ✅ Spec compliant against the brief's Files, Interfaces and Tests fields. Rulings C13, F2 and F10 hold (checked below).
- ⚠️ Cannot verify from diff: (1) `scripts/check-all` ALL GREEN, not run by the implementer or by me; the controller re-runs it after task 08 commits. (2) Section 8 sends the owner to "the README lists them" (src: commands/fx-setup.md section 8, first paragraph); no README line listing the refusing rules is in this diff, so task 13 must write one or the reference dangles. (3) `scripts/check-all` hunk shows only this task's two lines in the diff; I did not inspect the working tree for task 08's uncommitted lines.

Checks run (read, not executed; no commands run):
- Catalogue vs MEASURED_RULES (src/lib/judge-features.ts:51-54): `dotnet-no-blocking-async` is `**/*.cs` + "No .Result or .Wait() on a Task inside async code."; `web-img-alt` is `**/*.{html,erb,jsx,tsx,vue}` + "Every img element has an alt attribute.". src/lib/rule-catalogue.ts:531 and :542 carry the identical id, glob and text. (The "dotenv-no-blocking-async" id in the dispatch is a slip for `dotnet-no-blocking-async`; no `dotenv` id exists in src or sets.)
- A test pins it: src/lib/rule-catalogue.test.ts:498-502 does `deepStrictEqual(entry, { id, glob, rule })` for every MEASURED_RULES entry. No `scope` key on either entry, so `refusesRule` (judge-features.ts:83, requires `scope === undefined`) still matches.
- Set tie: rule-catalogue.test.ts:487-495 asserts catalogue ids equal set ids, and every set item's `rule` and `scope` equal the catalogue's. REFUSING_RULES subset check at :498.
- Ruling C13: no "ADR 0048" in commands/fx-setup.md or skills/fx-setup/SKILL.md hunks; text says "the README lists them".
- Ruling F10 / refuse-or-advise: the status follows `refusesRule` and the two measured ids, not anything in the picker; section 8 states "only for a rule fx measured on its own labelled items ... every other picked rule only advises" and the gate requires `only advises`.
- Text at the brief's order: built-ins by id, no judge needed; picked rules need a judge (section 7); refuse only if measured; run `rules <stacks>`; empty means skip; question tool, several choices, at most 4 per question, id + sentence labels, "None" first; append after rules with a different id; the "Never write a rule ..." sentence; `edit_rules: false`. Report line present. The generated skills/fx-setup/SKILL.md hunk is byte-identical to the command hunk.
- CLI: `rules` prints `JSON.stringify(catalogueFor(rest), null, 2)` plus newline, exit 0; usage line matches the brief exactly; the stale `rules` argument path is before the `write` and fallthrough usage.
- catalogueFor (src/lib/rule-catalogue.ts:546-550): `new Set` dedups stacks in first-seen order, `Object.hasOwn` guards `__proto__`/`constructor` (tested at rule-catalogue.test.ts:509).
- TDD: RED reported for all three suites with causes matching the missing behavior (missing module; usage/`rules` assertions; section 8 text absent). Valid.

### Strengths

- Catalogue is verbatim from the brief and pinned three ways: parser round trip (test :476-479), measured-set tie (:487-495), MEASURED_RULES equality (:499-502). A reworded sentence fails the build.
- `Object.hasOwn` plus a prototype-name test closes the `__proto__` hole a plain `RULE_CATALOGUE[s]` lookup would have had.
- Section 8 adds "Keep every other key of the file", which covers the brief's merge-not-replace risk.
- Gate test also checks section order (after 7, before "What setup deliberately does not create") on both command and skill.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

1. commands/fx-setup.md section 8, option labels ("Label each option with the rule's id and its sentence") and skills/fx-setup/SKILL.md same lines · the picker does not mark each offered rule as refusing or advising; the owner gets one general sentence and a pointer to a README that does not exist yet. The brief asks only for id and sentence, so this is not a spec miss, but the owner picking `dotnet-no-blocking-async` vs `dotnet-no-empty-catch` cannot see which can refuse. Fix if wanted: add " (refuses)" for ids in `REFUSING_RULES` and " (advises)" otherwise, which needs the CLI to print the flag or the text to list the two ids; both are a design change, so leave to the controller.
2. src/tests/gates/fx-setup-rules.test.ts:6-17 · the gate does not assert `the README lists them` nor the absence of `ADR 0048`, so ruling C13 is held by the text alone and a later edit could reintroduce the dangling reference without a failure. Add one `includes` and one `!includes`.
3. src/tests/gates/judge-cli.test.ts (added `run('nonsense')` before `run('bogus')`) · same assertion as the existing `bogus` case, so it adds no coverage; harmless, brief-mandated.

### Assessment

**Task quality:** Approved
**Reasoning:** Catalogue, CLI and lane text match the brief and the rulings; the two measured rules carry the exact id, text and glob and a test pins them. Only polish items remain; check-all is unconfirmed and belongs to the controller.

## Ledger lines

Task 09: minor (deferred): picker options do not mark each rule as refusing or advising; owner sees one general sentence and a README pointer.
Task 09: minor (deferred): fx-setup-rules gate does not pin "the README lists them" or the absence of "ADR 0048" (ruling C13).
Task 09: minor (deferred): judge-cli test `nonsense` case duplicates the existing `bogus` case.
