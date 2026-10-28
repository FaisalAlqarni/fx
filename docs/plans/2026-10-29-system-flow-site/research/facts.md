# Facts behind the second-iteration design

Gathered 2026-10-28 for `../design.md`. Code lines are at `95ff86e` on branch `system-flow`.

## Gap analysis (owner's page against fx output)

Source: `/tmp/claude-1000/fx-system-flow-results/compare/divergence.md` and its screenshots.

| Measure | Owner's page (19 chapters) | fx Shamel.Backend (9) | fx Advantage (12) |
|---|---|---|---|
| Fact bullets | 101 bullets, 2,214 words | 0 | 0 |
| Question plus bullets per chapter | 122 words on average (39 to 253) | 11 | about 11 |
| Figure intro shown before play | 784 words | 0 (495 words of `summary` in the model, not shown) | 0 (1,604 in the model) |
| Node second lines | 590 words | 0 | 0 |
| Step narration | 22.7 words per step | 21.1 per step | about the same |

Causes the analysis names, each confirmed in the code:

- No brief asks for bullets. `skills/fx-system-flow/planning.md` writes `chapters.json` with `id`, `title`, `question`, `covers` only; `area-brief.md` owns only `<area>.json`; `fragment-guide.md` names `bullets` as a field and nothing more.
- Diagram `summary` is required and written, but `FigureSpec` has no field for it and `src/references/visual/fx-flow-1.ts` prints the fixed string "Press Play or Next to step through." `src/lib/sf-diagrams.ts` line 118 uses `summary` only as the archify subtitle.
- `src/lib/sf-page.ts` fills `references/visual/page-template.html`, which has no grid, no nav CSS and no figure card. The nav is a static `<ol>` inside `main` with one comma list of every deep diagram.
- `fx-flow-1.ts` appends the control bar after the SVG with no card or separator, sizes the SVG to its layout width, and starts play from an IntersectionObserver at threshold 0.6 on the whole figure, so a figure taller than about 1,500 px never starts (5 of 27 Shamel figures, 16 of 92 Advantage figures) and play never pauses.
- `src/lib/sf-layout.ts` `sequenceInput` folds all messages between a pair into one arrow and lays participants out with ELK as boxes, so a sequence reads as another architecture diagram (438 x 896, 283 x 1300, 277 x 694 px).
- The legend is built from `new Set(node.kind)`: 19 raw kinds, nearly all drawn alike.

## The owner's original page

`/mnt/c/Users/Faisal/Desktop/system-flow/system-flow/model/page-template.html` (700 lines) and `build-page.mjs` (740 lines), read only.

- Shell: `.wrap` grid, 230 px nav column, 48 px gap, `main` up to 900 px, 1240 px total. Nav `position:sticky; top:0; max-height:100vh; overflow:auto`. Chapter numbers from a CSS counter. Active chapter `.cur` from an IntersectionObserver with `rootMargin: -40% 0px -55% 0px`. At 900 px and below the grid collapses and the nav becomes static wrapping chips (no sticky bar, no collapse).
- Slots: `%%NAV%% %%SIDE%% %%SECTIONS%% %%MODEL%% %%DIAGRAMS%% %%DATE%% %%NSEC%% %%NDIAG%%`. Shamel text is hard-coded in the header paragraph, the six legend labels ("Shamel service", "Data or files", "Phone or browser", "Outside Shamel", "Security or identity check", "Request in flight"), the paths note and the footer.
- Colour variables: `--paper --panel --ink --muted --rule --green --green-t --saffron --tok --magenta --blue --blue-t --code`. fx's tokens are `--paper --panel --ink --muted --rule --code --accent --accent-tint --warn --alert --violet --info --info-tint`.
- Figure: card (`background:var(--panel); border; border-radius:16px; padding:14px`), `.svgbox{overflow-x:auto}`, SVG `width:100%; min-width:640px`, `.ctl` bar with a top border and a filled Play button, `.cap-n` counter pushed to the end, `.cap-text{min-height:3.4em}`.
- Node classes by kind: `k-store` (cap line), `k-ext` (dashed), `k-sec` (violet), `k-client` (blue fill); a second text line per node (role when 26 characters or less, else kind).
- Fonts: Avenir Next text, Iowan Old Style headings, SF Mono code; dotted paper background.

## The approved mockup

`/tmp/claude-1000/fx-system-flow-results/mockups/index.html` and four PNGs.

- Side menu: system name and a subtitle, a filter box ("Filter chapters, parts, terms"), groups "Start here", "How it works", "Reference"; matching chapters keep their number, glossary hits show `G` and the matching terms.
- Chapter head: an eyebrow `06 · HOW DOES AN APP SEND A PROMPT?`, the H2 title, a lead paragraph with glossary terms underlined as links, then bullets with the first evidence `path:line` in small mono under each.
- Sequence card: title, one-line caption ("Step 4 is the only call that leaves the service."), participants as boxes across the top with dashed lifelines, numbered arrows, replies dashed, the external participant tinted, the active step thick in the accent colour; a bar inside the card with Play, back, next, a one-sentence narration, `4 / 7`, and "Open in archify" at the right.
- Glossary: term, tag chip (`model`, `external`), meaning; "The words this site uses, in the meaning the code gives them. 23 terms."
- Phone shot (390): sticky top bar with the name and "Chapters". The mockup still shows the page overflowing at 390 and the sequence shrunk until its labels are about 7 px; the design fixes both (horizontal scroll inside the card at 1:1).

## Sequence sizes in the existing models

Measured from each `system-model.json`:

| Model | Sequences | Participants per sequence | Messages per sequence | Longest participant label | Message label length p50 / p90 / max |
|---|---|---|---|---|---|
| fx Shamel.Backend | 6 | 4 to 7 | 5 to 8 | 23 chars | 38 / 71 / 100 |
| fx Advantage, four roots | 16 | 5 to 7 | 7 to 8 | 30 chars | 41 / 63 / 88 |
| Owner's Shamel v2 | 13 | 3 to 9 | 6 to 16 | 32 chars | 59 / 100 / 200 |

So message labels are sentences, not arrow labels: the arrow needs a short form and the full label belongs in the narration.

## Current schema and code facts the design leans on

- `references/system-flow/system-model.schema.json`: `schemaVersion` integer; `meta` has `title`, `date`, `purpose`, `roots`, `conventions`; `section` requires `id`, `title`, `question` and already allows evidenced `bullets`; `sequence` and `storeFlow` have no `summary`; `message` has no `short`; `node` and `participant` `kind` is free text. The subset validator supports type, required, properties, additionalProperties false, items, enum, pattern, maxLength and local `$ref` (no minItems, no minLength), so counts and word floors belong in `check` rules, not in the schema.
- `src/lib/sf-model.ts`: `SCHEMA_VERSION = 1`; `loadFragments` rejects a fragment whose `schemaVersion` is newer than the CLI; `mergeFragments` concatenates arrays and reports a second definition of any `section:` id as a duplicate; `collect` lists every evidenced item (adding a kind there gives it handles, verification, stale and query for free).
- `src/lib/sf-build.ts` `checkModel`: with `--fragment`, problems in other files become warnings and only the fragment's items are verified; `checkRules` (in `src/lib/sf-rules.ts`) holds the caps and the dash ban.
- `src/lib/sf-diagrams.ts` `svgPage` draws the SVG fallback deep page from the inline `FigureSpec`, so a change to the sequence figure shape reaches the fallback page too.
- `references/visual/page-template.html` gained `NAV` and `DIAGRAMS` slots plus figure and table CSS on this branch (14 lines against master `6e2d88b`); `src/tests/gates/visual-kit.test.ts` lines 98 and 127 to 131 assert those additions. fx-docs, fx-audit and fx-architecture also use this template (ADR 0061 decision 1).
- `references/visual/visual-assets.md`: copy rule "only when no file of that name is already there", and the renaming rule "any byte change to an fx kit file bumps the number in its name". A site regenerated over an existing `assets/fx-flow-1.js` would keep the old player, so a changed player must be `fx-flow-2.js`.
- `references/visual/visual-check.md` already says "no horizontal page scroll at 390 px (a wide figure scrolls inside its own box)".
- `skills/fx-system-flow/SKILL.md` is 10,492 bytes (limit 20,000).
