### Spec Compliance

- ✅ Spec compliant. Every Tests-field item has a matching assertion in `src/scripts/system-flow-site.test.ts` or `page-check.ts`; the DOM contract names for chapters 01 to 04, glossary, term link, site index and filter are all present in `src/lib/sf-page.ts` and `site-template.html`.
- ⚠️ Cannot verify from diff: `sf-markdown.ts` (task 09) mirroring the code map and glossary shape; the report says it was matched, task 09 review owns the check. The Chromium run (page-check 1440 and 390) is the implementer's report; I did not re-run it.

Implementer deviations, judged:
- "1 match" for one result (`site-template.html` filter script, `n === 1 ? " match"`): accepted as correct English, logged as Minor because the contract text is `<n> matches`.
- `class="glossary"` on the glossary table (`sf-page.ts:202`): accepted, additive, used by the `table.glossary` CSS, no contract selector is broken.
- First Escape on a non-empty filter keeps the phone panel open (`site-template.html:264`): accepted. The design says Escape restores the full menu and Escape closes the panel; the two-press behaviour satisfies both and an empty-box Escape still reaches the bar.
- No `parts` section loses the map and catalogue tables (`sf-page.ts:159`): Minor, see below.

Review Focus (substring terms "Link" and "Short link"): holds. `sf-page.ts:1027-1034` sorts forms longest first into one alternation, so the regex consumes "short link" whole at its leftmost position. If "short link" was already seen, `linkTerms` returns the match unlinked (`:1046`), so `link` still does not link inside it. The test (`system-flow-site.test.ts:1503-1505`) puts "short link" where `link` is unused in the chapter, so a shortest-first linker would fail it; it also asserts no link inside `code.at`. Checked: entity safety via the `[&#]` lookbehind (`&lt;script&gt;`, `&#39;`), and the `code`/`a` nesting counter at `:1040-1041`, which cannot go negative on this output.

### Strengths

- One linker, applied through a per-chapter `seen` set to lead, bullets, not-owned items and captions only; evidence cells, table cells and the glossary rows themselves stay unlinked, so no self-links.
- The escape path is sound: the term is escaped before the regex is built, titles use `escapeHtml(meaning)`, the index goes through `inlineJson`, and the filter script builds every node with `textContent` and `ul.sub` removal on each keystroke. The `<script>` test checks the row, every title, the raw block and the parsed JSON (ruling C14).
- Ruling C3 and C5 followed: earlier-test edits are limited to order marks, the Components and open-questions blocks, and the Reference hrefs, all listed in the report; `goodSet()` untouched.
- The map explorer degrades safely: `fx-map-2.js:255` returns when `#map-root` is missing, so a parts-less model does not throw.
- Valid runtime RED recorded for the site test, gate test and browser check.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

- `site-template.html` filter script (count line) · writes `1 match` where the DOM contract says `<n> matches`; a later check that matches `^\d+ matches$` (as `page-check.ts:959` does) fails at exactly one result. Fix: keep the plural form always, or make every reader accept both.
- `src/scripts/system-flow-site.test.ts:1475-1478` · the stores table test checks columns and the Kind and Rows cells only; the "Shown in" links (`sf-page.ts:1079-1080`, matching on `storeRefs` or a store flow step's `store`) are never asserted, so a broken match would pass.
- `src/lib/sf-page.ts:159,1210` · a model with no `parts` section renders no `#map` or catalogue tables, and `partsId` is `''`, so a part entry in the site index gets chapter `""` and filters to `href="#"` with no chapter row. Only reachable under `build --only` (the prose floor blocks it otherwise). Fix: drop parts whose chapter is empty, or render the map in a fallback chapter.

### Assessment

**Task quality:** Approved
**Reasoning:** The term linker, glossary, chapters 01 to 04, site index and filter match the DOM contract and the Tests field, with escaping and the substring-term rule verified in code and test. Only contract-text drift and thin coverage of the "Shown in" cell remain.

## Ledger lines

Task 08: minor (deferred): filter count writes "1 match" where the contract says "<n> matches"; readers of the count must accept both.
Task 08: minor (deferred): the stores table "Shown in" links are not asserted by system-flow-site.test.ts.
Task 08: minor (deferred): a model with no parts section drops the map and catalogue and leaves site-index parts pointing at chapter "" (build --only only).
