# 07: Figure cards and the `fx-flow-2` player

**Status:** ready-for-agent
**Blocked by:** 05, 06
**Phase:** Core

**What to build:** every inline figure (level diagram, lifeline sequence, store flow) is one card: title, a one-line caption from the figure's `summary`, the figure in a sideways-scrolling region at 1:1, and a control bar inside the card, sticky at its bottom, holding Play (one button that reads Pause while the figure plays), Back, Next, Reset, the narration, the count and the deep link. Title, caption and link render without JavaScript. Each figure starts playing the first time its box enters the middle band of the window, steps every 1.6 s, pauses when the card leaves the screen, and resumes on return unless the reader paused or reset it or it reached its last step; under reduced motion nothing plays on its own. At each step the player scrolls the figure sideways so the active arrow is in view. The deep link reads "Open in archify" when archify rendered the deep diagram and "Open full diagram" when it fell back to SVG, so the page is now written after the deep diagrams; under `--only`, a figure this build did not render takes its label and first page from the deep pages already on disk.

**Design:** Cards; Kit files; Lifeline sequences; Error handling

**Files:**
- Modify: `src/references/visual/fx-flow-2.ts` (card mounting, the bar, narration, autoplay and pause, sideways scroll), built to `references/visual/fx-flow-2.js`
- Modify: `references/visual/visual-assets.md` (the new sha256 of `fx-flow-2.js`)
- Modify: `src/lib/sf-page.ts` (card markup; the deep link by renderer; the "Deep diagrams:" comma lists removed)
- Modify: `src/lib/sf-build.ts` (render and write `index.html` after the deep diagrams, passing `result.diagrams` to `renderPage`; for figures not rebuilt under `--only`, the renderer and first page name read from `diagrams/` on disk)
- Modify: `src/lib/sf-diagrams.ts` (`svgPage` writes the fx generated marker line after `<!doctype html>`, as `renderPage` does)
- Modify: `references/system-flow/site-template.html` (card, `.fig`, `.ctl`, button and narration CSS)
- Modify: `src/tests/gates/visual-kit.test.ts` (checksum), `src/tests/gates/site-template.test.ts` (card and bar rules)
- Test: `src/scripts/system-flow-page.test.ts`, `src/scripts/system-flow-archify.test.ts`, `src/scripts/system-flow-only.test.ts`
- Modify: `src/docs/plans/2026-10-29-system-flow-site/proof/page-check.ts` (the player checks), `src/docs/plans/2026-10-29-system-flow-site/proof/fixture-site.ts` (adds a 6-participant sequence `wide` in an area fragment, and a level diagram tall enough to exceed a 600 px window), built to their `.js` files

**Interfaces:**
- Consumes: `FigureSpec` with `lanes`, `rows`, steps with `caption` and `where` (task 05); the DOM contract of task 06; `BuildResult.diagrams: { name; renderer: 'archify' | 'svg'; reason }[]`.
- Produces, `renderPage` input gains `deep: { name: string; renderer: 'archify' | 'svg' }[]`. A figure this build rendered takes its entry from `result.diagrams`. A figure it did not render (`--only`) takes it from `<site>/diagrams/` on disk: the first page is `<name>.html` when it exists, else `<name>-p1.html`; a page holding the fx generated marker is `svg`, any other page is `archify`; with no page on disk the link is `Open full diagram` to `diagrams/<name>.html`.
- Produces, the card (exact; the proof script reads these names):

```html
<figure class="card" id="fig-<key>">
  <h3>…</h3><p class="cap">…</p>
  <div class="fig" role="region" tabindex="0" aria-label="<title>, scrolls sideways"><noscript>This figure needs JavaScript. The link below opens the full diagram.</noscript></div>
  <div class="ctl" data-fx-flow="<key>"><a class="deep" href="diagrams/<first page name>.html">Open in archify|Open full diagram</a></div>
</figure>
```

  Title: a level diagram's `title`; `Sequence: <title>`; `Store flow: <trigger>`.
- Produces, the bar the player inserts before `a.deep`: `button.play` (text `Play` at rest or when stopped, `Pause` while playing; no `aria-pressed`, since the changing text already names the action), `button.back` (`aria-label="Back"`), `button.next` (`aria-label="Next"`), `button.reset` (text `Reset`), `span.narr[aria-live="polite"]`, `span.count` (`<k> / <total>`). At rest the count is `0 / <total>` and the narration `Press Play, or step with Next.`; at step k the narration is the step's `caption` followed by `<code>` holding `where`, built from text nodes.
- Behaviour (exact): Next from rest goes to step 1; Back from step 1 returns to rest; Reset from any step returns to rest and stops playback; Play at rest or mid-way plays from the next step; Play at the last step restarts at step 1; Pause stops at the current step; while playing, Play shows the next step at once and then advances one step every 1.6 s (fixed); reaching the last step stops playback and clears the playing state, so the button reads `Play` and a later return to the screen does not start it again; a figure with no steps shows `0 / 0` with Play, Next and Reset disabled.
- Autoplay: an `IntersectionObserver` on `.fig` with `rootMargin: -40% 0px -40% 0px`, threshold 0, starts play the first time; a second observer on the card pauses when no part is visible and resumes on return only when that observer paused it (never after Pause, Reset or the last step). Under `prefers-reduced-motion: reduce` neither observer starts play and the token does not move; step scrolling is instant.

**Not this task:** the filter and term links in captions (task 08).

**Seam:** the `system-flow` CLI run as a process for markup; `page-check.js` on the fixture site for behaviour.

**Tests:**
- Cards: every key in the inline figure JSON has exactly one `figure.card#fig-<key>` holding `h3`, `p.cap` (the model `summary`), `div.fig[role=region][tabindex="0"]` with a `noscript`, and `div.ctl[data-fx-flow="<key>"]` holding one `a.deep`.
- Link label: `build --prefer cheap` gives `Open full diagram` with `href="diagrams/seq-turn.html"`; a build with the fake archify of `system-flow-archify.test.ts` gives `Open in archify`; a sequence of 9 messages links `diagrams/seq-turn-p1.html`.
- No comma lists: `index.html` holds no `Deep diagrams:`.
- Gate, `site-template`: the `.card` rule holds no `overflow`, `overflow-x` or `overflow-y` declaration (one would make the card the bar's scroll container, so the bar would stop sticking to the window); the `.ctl` rule holds `position:sticky` and `bottom:0`; `.fig` holds `overflow-x:auto`; `button.play` `min-inline-size` at least 84px; every bar button `min-block-size` at least 36px; no `max-width:100%` or `width:100%` on the figure's `svg`.
- Gate, `visual-kit`: `fx-flow-2.js` sha256 matches `visual-assets.md`.
- `--only` keeps the label (`system-flow-only.test.ts`): after a full `build --prefer cheap`, `build --prefer cheap --only b1` (a bullet no figure holds) rewrites `index.html` and `fig-seq-turn`'s `a.deep` still reads `Open full diagram` with `href="diagrams/seq-turn.html"`; after a full build with the fake archify of `system-flow-archify.test.ts` on `turn` at 9 messages, `build --only b1` without `--archify` gives `Open in archify` with `href="diagrams/seq-turn-p1.html"`.
- Browser, `page-check.js`, reduced motion on, 1440 x 900, on `fig-seq-turn` (5 steps):
  - `rest`: count `0 / 5`, narration `Press Play, or step with Next.`, button.play text `Play`.
  - `next`: one Next gives count `1 / 5` and a narration starting `Step 1: `.
  - `reset`: four Next (count `4 / 5`), then Reset: count `0 / 5`, narration `Press Play, or step with Next.`, button.play text `Play`, and after 2 s the count is still `0 / 5`.
  - `resetWhilePlaying`: Play, wait until count `2 / 5`, Reset: count `0 / 5` and still `0 / 5` 2 s later.
  - `playPause`: Play: button.play text `Pause` within 200 ms and no `aria-pressed` attribute; wait until count `2 / 5`; press it: text `Play`, still no `aria-pressed`, and the count read 2 s later equals the count read at the press.
  - `interval`: Play at rest: count `1 / 5` within 200 ms, still `1 / 5` at 1.0 s, `2 / 5` at 2.0 s.
  - `endStops`: Play at rest; 7.5 s later the count is `5 / 5` and button.play reads `Play`; 2 s after that it is still `5 / 5`.
  - `back`: Next, Back: count `0 / 5`.
  - `restart`: five Next (count `5 / 5`), Play: count `1 / 5` within 2 s.
- Browser, reduced motion off, at 1440 x 900 and 390 x 844: `autoplay` (scroll each card's `.fig` top to the window's middle: count leaves `0` within 3 s); `pause` (scroll until no part of the card is visible, wait 1 s, read the count, wait 2 s: unchanged); `resume` (scroll back: the count rises within 3 s); `noResumeAtEnd` (on `fig-seq-turn`, let autoplay reach `5 / 5`, scroll until no part of the card is visible, wait 1 s, scroll `.fig` back to the middle, wait 3 s: still `5 / 5` and button.play reads `Play`); `reducedMotion` (with reduced motion on, scrolling a card into the middle leaves `0 / <n>` after 3 s).
- Browser: `barInView` (window 1440 x 600, the tall level figure: at three scroll positions where the card intersects the window, the `.ctl` box lies inside the window); `barInCard` (every `.ctl` box lies inside its card's box); `sideways` (390: `fig-seq-wide` `.fig` has `scrollWidth > clientWidth`; after Next to the last step its `scrollLeft > 0`; `document.documentElement.scrollWidth <= 390`); `labels` (no `svg text` with computed font size under 12 px at either width); `console` (0 errors).
- Empty figure: a level diagram whose nodes are all context nodes renders `0 / 0` with Play disabled and no console error.

**Risks:** an SVG deep page written before this task has no generated marker and reads as archify's under `--only`; a full build rewrites it with the marker.

**Testing:** CLI process tests, gate tests, Chromium on the fixture site.

## Acceptance criteria
- [ ] Every figure sits in a card whose bar stays on screen while the card is, by the browser check.
- [ ] Reset returns to rest and stops; Play reads Pause while playing and stops where it is when pressed.
- [ ] Figures play when reached, step every 1.6 s, pause when left, and stay stopped once they reach the last step, at both widths.
- [ ] `page-check.js` passes; `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names**

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `... node scripts/system-flow-page.test.js` and `... node scripts/system-flow-only.test.js`, then the fixture site and `page-check.js` as in task 06.
Expected: no `figure.card`; the player checks fail.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: `OK` from both; `page-check.js` exit 0.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`

- [ ] **7. Commit this task's paths on `system-flow`**

```
git add -- src/references/visual/fx-flow-2.ts references/visual/fx-flow-2.js references/visual/visual-assets.md src/lib/sf-page.ts lib/sf-page.js src/lib/sf-build.ts lib/sf-build.js src/lib/sf-diagrams.ts lib/sf-diagrams.js references/system-flow/site-template.html src/tests/gates/visual-kit.test.ts tests/gates/visual-kit.test.js src/tests/gates/site-template.test.ts tests/gates/site-template.test.js src/scripts/system-flow-page.test.ts scripts/system-flow-page.test.js src/scripts/system-flow-archify.test.ts scripts/system-flow-archify.test.js src/scripts/system-flow-only.test.ts scripts/system-flow-only.test.js src/docs/plans/2026-10-29-system-flow-site/proof/page-check.ts docs/plans/2026-10-29-system-flow-site/proof/page-check.js src/docs/plans/2026-10-29-system-flow-site/proof/fixture-site.ts docs/plans/2026-10-29-system-flow-site/proof/fixture-site.js
git commit -m "feat(system-flow): figure cards and the fx-flow-2 player"
```

Never push, merge or open a PR.
