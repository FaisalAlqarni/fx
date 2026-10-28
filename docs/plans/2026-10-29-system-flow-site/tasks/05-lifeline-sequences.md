# 05: Lifeline sequences end to end: layout, the `fx-flow-2` drawing, and the SVG fallback

**Status:** ready-for-agent
**Blocked by:** 01, 03
**Phase:** Core

**What to build:** every sequence is laid out as a lifeline grid at build time, with no ELK: participants across the top, a lifeline under each, one numbered arrow per message in order, replies dashed, the call that leaves the system marked. Box figures (levels and store flows) gain a second line per node and carry `look`. The layout report gives a sequence its own line. The SVG fallback deep page draws a sequence from the same lifeline geometry, one page per 8 messages as today. `sequenceInput` (folded ELK arrows) is deleted. The player becomes `fx-flow-2.js`: it validates and draws both figure shapes (box and lifeline, look colours and shapes, the active arrow in the accent colour at 2.8 px with its label bold), and keeps today's controls and mounting; `fx-flow-1` is removed. Task 07 adds the card and the new control bar to `fx-flow-2` in place, since no released page loads it yet.

**Design:** Lifeline sequences; Cards; What it replaces

**Files:**
- Modify: `src/lib/sf-model.ts` (`FigureSpec`, `LayoutLine`)
- Modify: `src/lib/sf-layout.ts` (`lifelines`, node `sub` and `look`, `reportLine`, `layoutAll`)
- Modify: `src/lib/sf-diagrams.ts` (`svgPage` draws a sequence from `lanes` and `rows`; its step list prints each caption without the `Step <k>: ` prefix, then `where`)
- Modify: `src/lib/sf-build.ts` (`layoutChecked` skips the 860 rule for a sequence; `ASSETS` names `fx-flow-2.js`)
- Create: `src/references/visual/fx-flow-2.ts` (built to `references/visual/fx-flow-2.js`), from `fx-flow-1.ts`
- Delete: `src/references/visual/fx-flow-1.ts`, `references/visual/fx-flow-1.js` (`git rm -q --`)
- Modify: `scripts/build` (the browser-format case names `fx-flow-2.ts`)
- Modify: `tsconfig.json` (`exclude` names `src/references/visual/fx-flow-2.ts`), `tsconfig.browser.json` (`include` names it), in place of `fx-flow-1.ts`
- Modify: `src/lib/sf-page.ts` (the figure script is `assets/fx-flow-2.js`)
- Modify: `references/visual/visual-assets.md` (the `fx-flow-2.js` row with its sha256, version column the plugin version in `.claude-plugin/plugin.json`; no `fx-flow-1.js` row)
- Modify: `src/tests/gates/visual-kit.test.ts` (file list, checksum, `validateFigure` cases)
- Test: `src/scripts/system-flow-layout.test.ts`, `src/scripts/system-flow-diagrams.test.ts`, `src/scripts/system-flow-page.test.ts`, `src/scripts/system-flow-prose.test.ts` (`lifelines`)

**Interfaces:**
- Consumes: `Look`, `Message.short`, `Message.reply` (task 01); `goodSet()`'s sequence `turn` and `system-flow-prose.test.ts` (task 03).
- Produces, `src/lib/sf-model.ts` (exact shape; tasks 07 and the fallback read it):
  - Box node gains `sub: string` (`role` when 26 characters or less, else `kind`) and `look: Look`. Store flow actors take `look: 'service'`, stores `look: 'store'`.
  - `FigureSpec` gains, for `kind: 'sequence'` only, `lanes: { id: string; x: number; w: number; lines: string[]; title: string; look: Look }[]` (x is the lane centre; `lines` at most 2, cut with an ellipsis; `title` the full label) and `rows: { id: string; n: number; y: number; from: string; to: string; x1: number; x2: number; self: boolean; mode: 'sync' | 'async'; reply: boolean; leaves: boolean; text: string; label: { x: number; y: number; w: number; h: number } }[]`, with `id` `<sequence id>#<n>` and `text` the `short` (else the label cut at 26 characters by today's `ruleShort`). A sequence spec has `nodes: []`, `edges: []`, `groups: []`.
  - Every step becomes `{ edges: string[]; nodes: string[]; caption: string; where: string | null }`: `caption` has no evidence; `where` is the first file evidence as `path:lines` (else `path`), or null. A sequence step `k` is `{ edges: ['<seq>#<k>'], nodes: [from, to], caption: 'Step <k>: <from label> to <to label>: <message label>.' }`, where any trailing `.`, `!` or `?` is stripped from the message label before the closing period is added, so the caption ends in exactly one period.
  - `LayoutLine` gains `participants?: number; messages?: number; scrolls?: boolean` (sequence lines only).
- Produces: `reportLine` for a sequence: `seq-<id> <w>x<h> lifelines participants=<n> messages=<m> scrolls at 860: yes|no`.
- Geometry (decided here where the design is silent): column width `c = clamp(floor(832 / n), 104, 180)`; width `n x c + 28`; lane `k` (from 0) centre `14 + c x k + c / 2`; box `c - 12` wide, 44 tall at y 14; rows from y 72, 40 per message, 56 per self-call (loop 28 px right of the lifeline); height = last row end + 24; label 12 px above the arrow from the calling lifeline, shifted inward so `14 <= label.x` and `label.x + label.w <= width - 14`. `leaves` is true when the target's look is `external` and `reply` is false.

- Produces, `fx-flow-2.js`: `globalThis.fxFlow = { validateFigure(spec): string[]; mount(...) }` with today's `mount` signature; `validateFigure` accepts a box spec or a lifeline spec and returns `step <i> names missing row <id>` for a step edge that is not a row id, `step <i> names missing edge <id>` for a box spec as today.

**Not this task:** the card, the new control bar, Reset and Play/Pause semantics, autoplay (task 07); the 12-participant cap (task 03).

**Seam:** the `system-flow` CLI run as a process (`build`, then read `model/layout-report.json`, the inline figure JSON in `index.html`, and `diagrams/seq-*.html`).

**Tests:**
- Width table: sequences of 4, 6, 8, 9 and 12 participants give `c` 180, 138, 104, 104, 104 and width 748, 856, 860, 964, 1276; the report line ends `scrolls at 860: no` for 4, 6 and 8 and `yes` for 9 and 12; a 9-participant sequence does not fail the build.
- Rows: messages `a>b`, `b>b`, `b>a` give rows `y` 72, 112, 168, the second with `self: true`, and figure height 232.
- Styles: a message with `reply: true` has `reply: true` and `leaves: false`; a call to a participant with look `external` has `leaves: true`; `mode: 'async'` is carried.
- Labels: a message with `short: "POST /prompts"` has `text` `POST /prompts`; one with only a 60-character label has a `text` of at most 26 characters; on a 4-lane sequence, a call from the last lane to itself has `label.x + label.w <= 734`.
- Steps: the fixture's `turn` step 1 caption is `Step 1: <from label> to <to label>: <label>.` and `where` is the message's first evidence `path:lines` (`app/x.rb:1-4`).
- Trailing punctuation: message 1 of `turn` relabelled `Sends the prompt?` gives a step 1 caption ending `: Sends the prompt.` (one period, no `?`).
- No ELK for sequences: a sequence whose participants all have the same id prefix still lays out (no ELK error path reached); `layout-report.json` has no `crossings` value above 0 for a sequence.
- Box nodes: node `link` with a 14-character `role` has `sub` equal to the role; a node with a 40-character role has `sub` equal to its `kind`; `look` is carried.
- Fallback: `build --prefer cheap` on a sequence of 9 messages writes `diagrams/seq-turn-p1.html` and `-p2.html`; page 1 holds one `<line` per lane lifeline and 8 numbered arrows, page 2 holds 1; a reply arrow carries `stroke-dasharray`.
- Fallback step list: `build --prefer cheap` on `goodSet()` writes `diagrams/seq-turn.html` whose first step `li` holds `app/x.rb:` (the step's `where`) and does not hold `Step 1:`.
- Gate, `visual-kit`: `fx-flow-2.js` loaded in `vm` with no DOM: `validateFigure` returns `[]` for the fixture's `seq-turn` spec and `['step 1 names missing row turn#9']` when step 1 names `turn#9`; `visual-assets.md` lists `fx-flow-2.js` with the file's sha256 and no `fx-flow-1.js`; `references/visual/fx-flow-1.js` does not exist.
- Page: every `src` in `index.html` under `assets/` exists; `assets/fx-flow-2.js` is copied; no `fx-flow-1` string appears.
- `prose.lifelines` in `build` stdout equals the number of model sequences (1 on `goodSet()`).

**Testing:** CLI process tests.

## Acceptance criteria
- [ ] Every sequence figure is a lifeline grid with the widths of the design's table, drawn by `fx-flow-2.js`.
- [ ] The SVG fallback page draws the same lifelines.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names**

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `... node scripts/system-flow-layout.test.js`, `... node scripts/system-flow-diagrams.test.js`, `... node tests/gates/visual-kit.test.js`
Expected: sequence figures have no `lanes`.

- [ ] **4. Implement the minimum that passes; delete `sequenceInput`**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: `OK` from all three.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`

- [ ] **7. Commit this task's paths on `system-flow`**

The two `fx-flow-1` deletions are already staged by `git rm -q --`.

```
git add -- src/lib/sf-model.ts lib/sf-model.js src/lib/sf-layout.ts lib/sf-layout.js src/lib/sf-diagrams.ts lib/sf-diagrams.js src/lib/sf-build.ts lib/sf-build.js src/lib/sf-page.ts lib/sf-page.js src/references/visual/fx-flow-2.ts references/visual/fx-flow-2.js scripts/build tsconfig.json tsconfig.browser.json references/visual/visual-assets.md src/tests/gates/visual-kit.test.ts tests/gates/visual-kit.test.js src/scripts/system-flow-layout.test.ts scripts/system-flow-layout.test.js src/scripts/system-flow-diagrams.test.ts scripts/system-flow-diagrams.test.js src/scripts/system-flow-page.test.ts scripts/system-flow-page.test.js src/scripts/system-flow-prose.test.ts scripts/system-flow-prose.test.js
git commit -m "feat(system-flow): lifeline sequences drawn by fx-flow-2"
```

Never push, merge or open a PR.
