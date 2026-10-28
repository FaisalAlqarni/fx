### Spec Compliance

- ✅ Spec compliant. Every Tests-field case has a CLI process test with the exact stderr strings (src/scripts/system-flow-check.test.ts merge, order, scalar twice, undeclared, missing title, duplicate node, --fragment; src/scripts/system-flow-build.test.ts merged model and stamp placement). Schema `section.required` is `["id"]`. `fieldOrigin` is exported from sf-model.ts with the specified signature (src/lib/sf-model.ts:136). `originOf(section)` is the chapters.json declaration (sf-model.ts:~156, `origin.set(merged, at)`).
- ⚠️ Cannot verify from diff: report says `scripts/test-scope` passed; I did not re-run it. The report's RED evidence (`AssertionError: a section with no question`, then `required property title missing`) is a runtime RED caused by the missing behavior; accepted.
- ⚠️ Ruling check: the brief's rulings that bind this task are the scratch root, the "do not run check-all" instruction and the owner rule "never type bash -c". The report admits one `bash -c 'true'` slip inside a scratch-env call. No code effect; the controller should record it as an owner-rule violation.

### Strengths

- Merge combines by moving references: `[...cur, ...v]` holds the same bullet objects (src/lib/sf-model.ts, mergeSections), so `stampVerified` lands in the writing fragment. The build test proves it (links.json bullet stamped, chapters.json gains no b2) and asserts by id list, not a substring.
- Both merge errors carry the pointer of the offending fragment and name the other file, with the exact text from the brief.
- `mergeFragments` strips `sections` before `mergeInto`, so other kinds keep the duplicate-id rule; the "duplicate node kept" test covers it.
- The old "no question" test and two corrections tests were updated to the new model rather than weakened.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

1. src/lib/sf-model.ts (mergeSections, non-chapters loop, `cur === undefined` branch) · an area fragment can set `title`, `question` or `role` when chapters.json omitted them, and the `title missing` rule then passes. The design says chapters.json declares `id`, `title`, `question`, `role`. Harmless today, but task 03's `fieldOrigin(section,'title')` will then point at an area fragment. Decide whether only `lead`, `bullets`, `notOwned` and figure references may come from an area fragment.
2. src/lib/sf-model.ts (mergeSections) · a section id repeated inside one non-chapters fragment merges silently and a scalar clash then reads "section s1 lead is also set in <the same file>". Message is true but unhelpful. Low odds.
3. src/lib/sf-corrections.ts:30 · `mergeFragments(fragments).problems` is dropped for the HEAD model. HEAD fragments that declare a section outside chapters.json (the pre-task layout) now lose those sections and their bullets from the HEAD model, so corrections are silently not compared for them on the first commit after this change. Only matters for a repo already holding such a set; confirm with the migrate path in task 04.
4. src/scripts/system-flow-check.test.ts:~606 · `stderrOf` is an alias of `f.run`, and `const { sections: _sections, ...rest }` in mergeFragments leaves an unused binding. Tidy.

## Ledger lines

Task 02: minor (deferred): an area fragment may set title, question or role when chapters.json omits them; restrict to lead, bullets, notOwned and figure references.
Task 02: minor (deferred): a section id repeated inside one non-chapters fragment gives a scalar clash naming the same file.
Task 02: minor (deferred): sf-corrections drops merge problems for the HEAD model, so sections declared outside chapters.json at HEAD vanish from the corrections comparison.
Task 02: minor (deferred): stderrOf alias in check test and unused `_sections` binding in mergeFragments.

### Assessment

**Task quality:** Approved
**Reasoning:** The merge is correct, stamps reach the writing fragment, and the exact error texts and ordering match the brief with process-level tests. Only minor tidy and edge-case items remain.
