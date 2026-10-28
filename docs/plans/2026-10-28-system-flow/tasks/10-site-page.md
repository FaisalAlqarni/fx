# 10: The site page

**Status:** ready-for-agent
**Blocked by:** 05, 07, 08, 09
**Phase:** Core

**What to build:** `build` writes `<site>/index.html`, the single page a new engineer opens. It is filled from fx's page template and loads only files under `<site>/assets/`, which `build` fills by the copy rule. In order: a header with the system story, how to read the page, the roots and the model date; the legend; chapter 00 with the `fx-map-2` map over all levels; one chapter per section (number, title, the question as the lede, fact bullets, owned figures played by `fx-flow-1`, deep diagram links, store flow tables, store tables, catalogue tables, and one collapsed "Files and locations (n)" evidence box); then the fixed chapters Components, Rules in force, Coverage, Open questions and Corrections. Every string from a repository is HTML-escaped and Arabic runs are wrapped as `<span lang="ar" dir="rtl">`.

**Design:** Renderers; Output location; Global Constraints; Error handling

**Files:**
- Create: `src/lib/sf-page.ts`
- Modify: `src/lib/sf-build.ts` (copy assets, write `index.html`, fill `BuildResult.pageBytes`)
- Create: `src/scripts/system-flow-page.test.ts` (built to `scripts/system-flow-page.test.js`)
- Modify: `scripts/check-all` (one line)

**Interfaces:**
- Consumes: `FigureSpec` (declared in `src/lib/sf-model.ts` by task 04), `layoutAll` (task 05); `Theme`, `themeCss` (task 07); the slots `NAV` and `DIAGRAMS`, `fx-map-2.js`, `fx-flow-1.js` and the map data shape (task 08); `Coverage`, `sectionItems` (task 09); the deep diagram names `arch-<id>`, `seq-<id>`, `flow-<id>` (design Renderers; the files arrive in task 11, and a link to a missing file is written anyway, since `build` writes both in the same run from task 11 on).
- Produces, `src/lib/sf-page.ts`: `renderPage(input: { model: Model; figures: FigureSpec[]; coverage: Coverage; theme: Theme; roots: Map<string, Root>; template: string }): string`, `escapeHtml(s: string): string`, `wrapArabic(escaped: string): string` and `inlineJson(value: unknown): string` (`JSON.stringify` with every `<` written `\u003c`).
- Produces: the page's DOM contract the visual check and the lane rely on: `<html lang="en" dir="ltr">`; a chapter is `<section id="ch-<NN>-<section id>">`; an inline figure is `<figure data-fx-flow="<key>">`; the evidence box is `<details class="evidence"><summary>Files and locations (<n>)</summary>`.

**Seam:** the `system-flow` CLI run as a process, asserting on the written `index.html` and `assets/`.

**Tests:** fixture model: meta title "Fixture", two sections `s1` (owns diagram `engine`, sequence `turn`, flow `first`) and `s2` (also lists `engine`), one catalogue entry of kind `queue`, one rule, two inventory entries (one covered), no questions, one correction.
- Loads: every `src` and `href` in `index.html` that is not `#...` starts `assets/` and names a file that exists in `docs/system-flow/assets/`; the set equals the seven table files plus `fx-flow-1.js`, `fx-map-2.js` and `theme.css` minus `fx-map-1.js`; no `http://` or `https://` appears except the three XML namespaces.
- Licences: `assets/LICENSE-react`, `LICENSE-reactflow` and `LICENSE-elkjs` exist beside the bundles.
- Copy rule: an existing `assets/fx-tokens-1.css` with other bytes is left as it is (copy only when absent); `theme.css` is rewritten.
- Order: the page holds, in this order, the header, `class="legend"`, `id="ch-00-explore"`, `id="ch-01-s1"`, `id="ch-02-s2"`, `id="components"`, `id="rules-in-force"`, `id="coverage"`, `id="corrections"`; `id="open-questions"` is absent because there are no questions.
- Lede: chapter `s1`'s first paragraph is the question text.
- Ownership: `<figure data-fx-flow="level-engine">` appears once, inside `ch-01-s1`; `ch-02-s2` holds the link text `Drawn in chapter 01` with `href="#ch-01-s1"`.
- Evidence box: `ch-01-s1` has exactly one `<details class="evidence">`, its summary `Files and locations (<n>)` where `<n>` equals the number of evidence rows rendered in it (count the rows in the test), grouped under headings `Facts`, `Diagram: <title>`, `Sequence: <title>`, `Store flow: <trigger>`.
- Components: one table, for kind `queue`; with an empty catalogue the `components` chapter is absent.
- Escape: a node label `<script>alert(1)</script>` appears in the page body as `&lt;script&gt;alert(1)&lt;/script&gt;`, and inside the inline JSON of `map-data` and `diagrams` as `\u003cscript>alert(1)\u003c/script>` (the six characters backslash, `u`, `0`, `0`, `3`, `c`); the page contains no `<script>alert` and no `</script` other than the page's own closing tags; `JSON.parse` of each inline block gives back the label `<script>alert(1)</script>`.
- Arabic: a bullet text `Reply: مرحبا` renders `Reply: <span lang="ar" dir="rtl">مرحبا</span>`.
- Map data: the `map-data` JSON parses and `fxMap.validateMapData` from the built `fx-map-2.js` (loaded in `vm`) returns `[]` on it.
- Figure data: the `diagrams` JSON parses, holds one entry per figure key, and `fxFlow.validateFigure` returns `[]` for each.
- Unconfirmed: an `unconfirmed` node's evidence row is marked `unconfirmed`.
- `BuildResult.pageBytes` equals the size of `index.html`.

**Idempotency:** `index.html` is generated and rewritten whole; assets are copied only when absent.

**Testing:** CLI process tests; the built kit files loaded in `vm` for the data checks.

## Acceptance criteria
- [ ] The page opens offline: it loads nothing outside `assets/`.
- [ ] Every chapter opens with its question.
- [ ] No repository string reaches the page unescaped.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/scripts/system-flow-page.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node scripts/system-flow-page.test.js`
Expected: no `index.html`.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: `system-flow-page.test.js: OK`.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/lib/sf-page.ts src/lib/sf-build.ts`, then every `scripts/system-flow-*.test.js` under the same prefix

- [ ] **7. Commit by path**

```
git add src/lib/sf-page.ts lib/sf-page.js src/lib/sf-build.ts lib/sf-build.js src/scripts/system-flow-page.test.ts scripts/system-flow-page.test.js scripts/check-all
git commit -m "feat(system-flow): build the offline site page with map, chapters, figures and evidence"
```

No attribution trailers. Then continue to the next task: never stop and wait.
