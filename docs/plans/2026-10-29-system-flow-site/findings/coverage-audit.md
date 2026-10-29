# Coverage audit: design commitments with no task criterion

Read: design.md, tasks 01 to 13, state.md rulings (C1 to C15 and later). Code checked read-only on branch system-flow at bf822a7. Design lines quoted as `design.md:N`.

Result: 6 gaps (2 medium, 4 low), 7 undocumented load-bearing rules, the rest cleared.

## Gaps

### G1 (medium). Half-owned story: lifeline styling is computed and tested, never shown and tested in the browser
Tasks 05, 07.
- design.md:38 "sequences drawn as lifelines with numbered arrows, dashed replies and the call that leaves the system marked"
- design.md:249 "Reply (`reply: true`): dashed. Leaving call ... `--warn` stroke 2.4 px ... Active step: accent, 2.8 px, label bold"
- design.md:236 "colour and shape by `look` (store with a cap line, client tinted info, external dashed muted, security violet)"
Owner of the data half: task 05 asserts `reply`/`leaves` flags on layout rows and `stroke-dasharray` on the SVG fallback page. Owner of the drawing half (the player on the inline card): none. Task 07's browser list (rest, next, reset, playPause, interval, endStops, back, restart, autoplay, pause, labels, sideways) never asserts a dashed reply arrow, a warn-coloured leaving call, the active arrow style or a look-dependent node shape.
Code found: `src/references/visual/fx-flow-2.ts:130-131` draws reply dashes and the `--warn` 2.4 stroke; `:147` look shapes. Behaviour exists. `proof/page-check.ts:633` only counts `svg line[stroke-dasharray]` (lifelines), so a regression in arrow styling passes every check. state.md:81 and :83 record this and resolve it as "checked in the browser by page-check from task 06 on"; page-check does not do that.
Fix: one task 07 browser check on the fixture: a `reply` path has dasharray, the leaving call has stroke `--warn`, the active arrow has width 2.8, a store node has a cap.

### G2 (medium). The 860 rule has a layout half and no page half
Tasks 06, 07.
- design.md:180 "Card content width is 870 px, so every box figure (at most 860 px) fits at 1:1."
- design.md:251 "With up to 8 participants ... the figure is at most 860 px, inside the 870 px card at 1:1."
Task 05 asserts the report line `scrolls at 860: no` (`system-flow-layout.test.ts:207`). Task 06 asserts the menu column width and a `240px` gate, not `main` at 900 or the card's content box. Nothing measures, at 1440, that a short sequence or a box figure of 860 px has `.fig` `scrollWidth <= clientWidth`. `page-check.ts:974-1004` measures sideways scroll only at 390. If padding drifts, every figure scrolls at 1440 and every check still passes.
Fix: one 1440 check in task 07: for each figure with width <= 860 `.fig` does not overflow.

### G3 (low). Story 2's "each in a sentence or two" has no owner
Tasks 03, 08, 10.
- design.md:31 "a walkthrough of the level-0 parts, each in a sentence or two, next to the map ... so that I can name every part"
- design.md:18 "(the level-0 walkthrough and the map explorer)"
- design.md:201 lists only "The level-0 card; the React Flow map explorer; the component catalogue tables" for chapter 02. No walkthrough element, and the floor allows 4 to 8 bullets, fewer than many level-0 maps have nodes.
No criterion checks that every level-0 node is described in text. `rg 'walkthrough|every part'` over `skills/fx-system-flow/` and `sf-prose.ts` finds nothing. Naming of every part is served by the card, the catalogue and the filter, so the story is mostly met; the prose half is not.
Fix: decide whether the story means the bullets (then say so and drop "each") or the catalogue's summary column (then assert it in task 08).

### G4 (low). Code renders, nothing pins it: stores overview conventions note and "Shown in"
Tasks 08, 09.
- design.md:203 "a stores overview (one row per store kind with its row count and the chapters that show it, then `meta.conventions` as the key notation note)"
Task 08 asserts `table.stores` rows and counts only. Code exists (`sf-page.ts:104` emits `p.note` per convention; `sf-markdown.ts:109` does the same) but no `system-flow-*.test.ts` mentions `conventions`. "Shown in" links are listed as deferred in state.md:130. Task 09 pins the `Shown in` header, not its cells.
Fix: add a convention string to the fixture and assert it in the page and in `start-code.md`; assert one Shown in link target.

### G5 (low). Phone panel behaviour beyond open and close
Tasks 06, 07.
- design.md:186 "with JavaScript, choosing a link or pressing Escape closes it and returns focus ... scrolls on its own, and is at most the window height"
- design.md:253 "The bar wraps to two rows (buttons, count and link; then the narration at full width) and stays under the scroller."
Task 06 `phoneBar` asserts link choice closes and focus returns; Escape on the panel is not asserted (`page-check.ts:272,754` press Escape only in `#filter`). The panel's max height and its own scroll, and the two-row bar at 390, have no assertion; `barInCard` only checks containment.

### G6 (low). Header and menu content named by the design, asserted only in part
Task 06.
- design.md:190 "H1 `meta.title`, `meta.intro`, the how-to-read paragraph, roots, model date and chapter count ..."
- design.md:182 "numbered `01` onward by a CSS counter ... Reference items ... are unnumbered"
- design.md:176 the how-to-read paragraph says figures play when scrolled to, terms link, "Files and locations" holds evidence, "Open in archify" opens the diagram.
Task 06 asserts h1, intro and the button, not roots, date, count or the how-to-read text (the reviewer's header-order note at state.md:104 shows content exists). Menu numbers: `system-flow-page.test.ts:288` checks `ol`/`ul`; the counter is CSS (`site-template.html:35-45`) and nothing checks that menu number N equals chapter head N.

## Reverse direction: rules the tasks rely on that no design story states
1. Autoplay stops at the last step and does not resume on return (task 07 `endStops`, `noResumeAtEnd`). design.md:230-232 says only "Play at the end restarts" and "resumes on return if the reader had not paused it". Also "or reset it" in task 07's resume rule is an addition.
2. Step interval 1.6 s (task 07 `interval`). The design never states it (it says only that the player replaces fx-flow-1; `fx-flow-2.ts:61` `STEP_MS = 1600`).
3. The page is written after the deep diagrams, and `--only` reads deep pages from disk (task 07). design.md:169 orders "page ... Markdown; deep diagrams", and design.md:228 needs the deep result for the link label. The two lines conflict; the task resolves it silently.
4. `migrate` runs "only on a clean working tree and undone with `git restore -- <site>/model/fragments`" (task 10 gate). design.md:106 says only that the rerun path offers the choice.
5. A chapter with the 120 to 200 words warning "goes back to its writer once" (task 10). design.md:121 makes it a warning and design.md:296 handles only errors.
6. Test-side contracts later tasks consume: `lang="en" dir="ltr"` and `data-group` on `section.chapter` (ruling C10); the measured set is `data-group` start and how (task 11); floorWords versus readingWords (C7); the filter count may read "1 match" (state.md:129). The first two are load-bearing for the proof table and appear nowhere in the design.
7. Autoplay test position: task 07 scrolls the figure top to the window middle; the ruling at state.md:150 centres the box for the measure. design.md:232 says "whatever the figure's height"; task 07 still only proves the top-at-middle case.

## Cleared
- Stories 1, 3, 5, 14, 15, 16, 17, 18, 19: carried by 03 (floor rules at each bound), 04, 08, 09, 06 sha gate for page-template.html, 10.
- Reachability: every `a.deep` href is checked to resolve (`system-flow-page.test.ts:173-178`); the menu lists glossary, rules, coverage, corrections (`:296`); `index.md` links `start-here/index.md` and `glossary.md` (task 09 test, `sf-markdown.ts:194`); term links reach glossary rows (08 `termLink`); the phone filter sits inside the Chapters panel (`page-check.ts:252`).
- Story and guard pairs: filter, autoplay with pause, Reset and Play/Pause all have both a positive and a refusal case.
- Glossary rows: tag, meaning and evidence cell exist in code (`sf-page.ts:203`); task 08 asserts the tag, Markdown asserts evidence.
- Narration chip is built with `textContent` (`fx-flow-2.ts:219`), so the text-node rule holds; only the format is unasserted.
- Pointer to the holding fragment for a prose problem (design.md:133): `sf-prose.ts` uses `originOf`; area-fragment cases are tested (`system-flow-prose.test.ts:148-160`).
- Lane items: 3 to 8 glossary candidates (`area-brief.md:117`, `SKILL.md:165`), main request is the sequence crossing the most parts (`planning.md:60`), `short` cap (`fragment-guide.md:94`). Only the gate wording is thin, not the lane text.
- Theme: `sf-page.ts:284` links `theme.css`.
- Proof table lines map to tasks 11, 12, 13.
