# Final review: accessibility lens (branch mode, 95ff86e..edc4970)

14 findings, recorded by the controller. Contrast of all token pairs passes in both themes.

1. Critical. references/system-flow/site-template.html:224-225: under 900 px, choosing a menu, part or term link closes the list and a setTimeout moves focus back to the Chapters summary after the link moved it to the target; screen reader and zoomed keyboard users cannot reach a chapter from the menu (WCAG 2.4.3, 2.4.1). Fix: on link choice close the menu without moving focus, and move focus to the target heading.
2. Important. site-template.html:151: the open phone menu panel leaves the page under it focusable; Tab escapes under the panel (2.4.11, 2.4.3). Fix: make main inert while the panel is open, close on Tab past the end or trap focus.
3. Important. site-template.html:143 and :113: sticky top bar and the figure .ctl bar can cover focused items; no scroll-padding (2.4.11). Fix: scroll-padding-top for the phone bar, and scroll-padding-bottom or scroll-margin on card captions for .ctl.
4. Important. src/references/visual/fx-flow-2.ts:162, :272, :279, :287: one polite live region per figure, announced at mount and every 1.6 s during autoplay (4.1.3, 2.2.2). Fix: do not announce at mount; announce only on user-driven steps; autoplay updates without a live region.
5. Important. site-template.html:44 with :172: #filter-count is display:none while empty, so the first count is often missed (4.1.3). Fix: keep the live region in the tree, visually hidden when empty.
6. Important. src/references/visual/fx-map-2.ts:222-223: Enter or Space on a map node or edge only selects; evidence and Open next level need a click (2.1.1). Fix: handle onSelectionChange or a key handler to open the panel and expose Open next level by keyboard.
7. Important. fx-map-2.ts:154 and src/lib/sf-diagrams.ts:311: infinite animations (React Flow animated edges, deep page step highlight) with no pause and, for the map, no reduced-motion rule (2.2.2, 2.3.3). Fix: reduced-motion CSS for react-flow animated edges, and a pause control or a finite animation.
8. Important. fx-flow-2.ts:231, :122, :152 and site-template.html:239: Arabic in narration, SVG labels and filter results lacks lang="ar" dir="rtl" (3.1.2, 1.3.2). Fix: wrap Arabic runs as the page HTML does (wrapArabic equivalent in the scripts).
9. Important. site-template.html:167 and sf-diagrams.ts:352: aria-label "Change theme" overrides visible "Theme: dark" (2.5.3, 4.1.2). Fix: drop the aria-label so the visible text is the name.
10. Minor. fx-flow-2.ts:223, :228: unreached steps at opacity 0.25 and 0.35, about 1.7:1 (1.4.3). Fix: raise to a level meeting 3:1 for graphics and 4.5:1 for text, or use a lighter colour that passes.
11. Minor. fx-flow-2.ts:131 with sf-page.ts:262: the leaving call differs only by colour and stroke; legend shows colour only (1.4.1). Fix: add a dash pattern or marker and show it in the legend.
12. Minor. sf-page.ts:139, :32, fx-flow-2.ts:89: tabindex regions even without overflow; title spoken three times; SVG name only the title (2.4.3, 1.1.1). Fix: tabindex only when scrollWidth exceeds clientWidth; aria-labelledby the h3; give the SVG a description of the steps.
13. Minor. sf-page.ts:248, :87, :92, :188: menu group headings h2 before h1; h4 after h2 (1.3.1). Fix: menu groups as non-heading labels or h2 after h1; use h3.
14. Minor. site-template.html:35 with :76: menu focus ring clipped by overflow; no skip link (2.4.7, 2.4.1). Fix: inline padding in #menu; a skip link to main.
Outside the diff: sf-theme.ts:250 checks only accent on panel at 3:1; add muted on panel and the focus ring colour to the contrast check.
