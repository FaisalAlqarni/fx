# 08: Start here and Reference chapters, term links, the filter

**Status:** ready-for-agent
**Blocked by:** 03, 07
**Phase:** Core

**What to build:** the page's content as the design lays it out. Chapter 01 (`what`) adds a "Not owned here" list with evidence. Chapter 02 (`parts`) holds the level-0 card, the React Flow map explorer (today's chapter 00, unchanged in behaviour) and the component catalogue tables (today's Components chapter). Chapter 03 (`request`) holds the main request's lifeline card. Chapter 04 (`code`) holds a stores overview and the code map table grouped by root. Reference becomes Glossary, Rules in force, Coverage (with today's Open questions as a "Not known yet" list) and Corrections. Terms in leads, bullets, not-owned items and captions link to the glossary on first use per chapter. The menu filter narrows chapters, parts and terms as the reader types.

**Design:** The page: chapter content; The site template; What it replaces

**Files:**
- Modify: `src/lib/sf-page.ts` (Start here content, Reference chapters, term links, the site index)
- Modify: `references/system-flow/site-template.html` (filter input, `aria-live` count, filter script, glossary and code map table CSS, `a.term`)
- Create: `src/scripts/system-flow-site.test.ts` (built to `scripts/system-flow-site.test.js`)
- Modify: `src/scripts/system-flow-page.test.ts` (its `fxMap.validateMapData` assertion on the page's `map-data` block moves to `system-flow-site.test.ts`; nothing else leaves it)
- Modify: `scripts/check-all` (one line)
- Modify: `src/tests/gates/site-template.test.ts` (filter input and live region)
- Modify: `src/docs/plans/2026-10-29-system-flow-site/proof/page-check.ts` (the filter checks), built to `docs/plans/2026-10-29-system-flow-site/proof/page-check.js`

**Interfaces:**
- Consumes: the DOM contract of tasks 06 and 07; `Model.glossary`, `Model.codeMap`, `Section.notOwned` (task 01); `coverage` (`sf-coverage.ts`).
- Produces, the DOM contract:
  - `ch-01-...` holds `<h3>Not owned here</h3><ul class="not-owned">` with each item's text and `code.at`.
  - `ch-02-...` holds `figure.card#fig-level-<root>`, then `<div id="map">` (today's explorer markup and `MAP_DATA`), then the catalogue tables.
  - `ch-04-...` holds `<table class="stores">` (columns Store kind, Rows, Shown in) with one row per non-empty store kind, then `meta.conventions` as `p.note`, then per root `<h3>` with the root id and `<table class="code-map">` (columns Folder, What it owns, Start reading at), the last cell the first file evidence as `path:lines symbol`.
  - Glossary: `<section id="glossary">`, intro `The words this site uses, in the meaning the code gives them. <n> terms.`, then one `<tr id="term-<id>">` per term: term, `<span class="tag">tag</span>`, meaning, evidence line; rows sorted by term, case-insensitive.
  - Term link: `<a class="term" href="#term-<id>" title="<meaning>">`; first occurrence per chapter of each term or alias, whole word, case-insensitive, longest first, on escaped text, never inside a tag or `code`.
  - Site index: `<script type="application/json" id="site-index">` with `{ "chapters": [{ "n", "id", "title", "question", "lead" }], "parts": [{ "label", "chapter" }], "terms": [{ "id", "term", "aliases" }] }`; a part's chapter is the chapter that draws its diagram, else the `parts` chapter.
  - Filter: `input#filter[type=search][aria-label="Filter chapters, parts, terms"]` as the first child of `nav#menu` (so the phone panel holds the filter and the list), `p#filter-count[aria-live=polite]` (`<n> matches` or `Nothing matches`); matching parts show as `li.part` under their chapter, terms as `li.term` with a `G` marker linking `#term-<id>`.

**Not this task:** Markdown (task 09).

**Seam:** the `system-flow` CLI run as a process; `page-check.js` for the filter.

**Tests:** on `goodSet()` (glossary term `link`, alias `links`; term `short link`).
- Order: the page holds `ch-01-start-what`, `ch-02-start-parts`, `ch-03-start-request`, `ch-04-start-code`, `ch-05-s1`, `glossary`, `rules-in-force`, `coverage`, `corrections` in that order; no `ch-00-explore`, no `id="components"`, no `id="open-questions"`.
- Chapter 01: `ul.not-owned` holds 2 items, each with a `code.at`.
- Chapter 02: holds `fig-level-system`, `div#map` and the catalogue table; the map-data JSON passes `fxMap.validateMapData` (the assertion moved here from `system-flow-page.test.ts`, which no longer holds it).
- Chapter 03: holds `fig-seq-turn`.
- Chapter 04: `table.stores` has one row per non-empty store kind with its row count; `table.code-map` under root `backend` has the fixture's entry `app/`, its owns sentence, and `app/x.rb:1-4 Link`.
- Glossary: intro ends `15 terms.`; 15 `tr[id^=term-]`; `term-link` row holds the tag `model`.
- Term links: in `ch-05-s1` the first `link` in the lead is `<a class="term" href="#term-link" title="<meaning>">`, the second is plain text; `short link` in a bullet links to `term-short-link` and its `link` part is not linked separately; a term inside `code.at` is not linked; a term in a card caption is linked.
- Escape: a term `<script>` in the glossary renders `&lt;script&gt;` in its row and in every link title; the site index JSON holds `<script>`.
- Coverage: with one open question in `questions.json`, `#coverage` holds `<h3>Not known yet</h3>` and the question text; with none, no such heading.
- Site index: parses; `chapters` has 5 entries with `n` `01` to `05`; `parts` holds `{ "label": "Database", "chapter": "ch-02-start-parts" }`; `terms` holds 15.
- Browser, `page-check.js` at 1440 and 390: `filterTerm` (type `link`: the menu keeps `ch-05-s1`, shows `li.term` for `link`, and `#filter-count` reads a number followed by `matches`); `filterPart` (type `database`: `li.part` `Database` under the parts chapter); `filterNone` (type `zzzz`: `Nothing matches`); `filterClear` (Escape restores every chapter link and removes every `li.part` and `li.term`); `termLink` (clicking the first `a.term` in `ch-05-s1` scrolls `#term-link` into view).

**Testing:** CLI process tests and Chromium on the fixture site.

## Acceptance criteria
- [ ] A reader reaches each glossary row by following a term link from a chapter.
- [ ] The four Start here chapters carry the content the design's table gives them.
- [ ] Typing a known term in the filter narrows the menu to its chapter, part and term.
- [ ] `page-check.js` passes; `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/scripts/system-flow-site.test.ts` and `page-check.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `... node scripts/system-flow-site.test.js`
Expected: `ch-00-explore` still present; no `#glossary`.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same, plus `... node scripts/system-flow-page.test.js`, then the fixture site and `page-check.js` as in task 06. Expected: `system-flow-site.test.js: OK`, `system-flow-page.test.js: OK`; `page-check.js` exit 0.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`

- [ ] **7. Commit this task's paths on `system-flow`**

```
git add -- src/lib/sf-page.ts lib/sf-page.js references/system-flow/site-template.html src/scripts/system-flow-site.test.ts scripts/system-flow-site.test.js src/scripts/system-flow-page.test.ts scripts/system-flow-page.test.js scripts/check-all src/tests/gates/site-template.test.ts tests/gates/site-template.test.js src/docs/plans/2026-10-29-system-flow-site/proof/page-check.ts docs/plans/2026-10-29-system-flow-site/proof/page-check.js
git commit -m "feat(system-flow): Start here and Reference chapters, term links, the filter"
```

Never push, merge or open a PR.
