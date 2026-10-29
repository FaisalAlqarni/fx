# System flow site: proof results

Parts (a) and (b) are added by tasks 12 and 13. This file holds the two parts task 11 owns and part (a).

Scratch root `/tmp/claude-1000/sf2-build/proof-site/`. Every command below ran with `TMPDIR=/tmp/claude-1000/sf2-build/tmp HOME=/tmp/claude-1000/sf2-build/home npm_config_cache=/tmp/claude-1000/sf2-build/npm scripts/scratch-env` in front, and `NODE_PATH=<PW>/node_modules PLAYWRIGHT_BROWSERS_PATH=<PW>/browsers` for the browser runs. Chromium is the Playwright build under `<PW>/browsers`.

## Two counts of prose

The two counts are different measures and carry different names:

- **floorWords**: lead plus bullets plus not-owned words, as the model holds them. `check` enforces the floor of 100 on it (task 03).
- **readingWords**: the question, the lead and the bullets as rendered on the page, over the reading chapters only. `page-check.js --measure` reports it as `proseWords` and `proseWordsAvg`. The file reference printed after a bullet (`code.at`) and the eyebrow number are left out, since neither is prose.

The pass line "average at least 120" is on readingWords.

## Baseline: the owner's page

Page: `/mnt/c/Users/Faisal/Desktop/system-flow/system-flow/index.html` (read in place, never written). Selectors for the `owner` profile are named, one comment each, in `proof/page-check.ts` (`PROFILES.owner`).

Command (exit 0):

```
node docs/plans/2026-10-29-system-flow-site/proof/page-check.js --measure owner --out-dir <SCRATCH>/proof-site/shots-owner \
  /mnt/c/Users/Faisal/Desktop/system-flow/system-flow/index.html <SCRATCH>/proof-site/owner.json
measured owner: 19 chapters, 121.9 words on average
```

JSON: `<SCRATCH>/proof-site/owner.json`. Screenshots at 1440 and 390, light and dark: `<SCRATCH>/proof-site/shots-owner/owner-<width>-<theme>.png`.

**How the owner's number is counted.** The owner's page has no leads, so its readingWords is question plus bullets. A generated site's number is question, lead and bullets. The owner's number is therefore not like for like with a generated site's: it has no lead to add. 6 of the 19 chapters have no question line either.

| Measure | Owner's page |
|---|---|
| Chapters (`section[id]` except the interactive map `#explore`) | 19 |
| Reading prose per chapter, average | 121.9 words (research figure 122, difference -0.1) |
| Reading prose per chapter, sorted | 39, 54, 66, 69, 97, 101, 116, 117, 120, 120, 120, 123, 137, 141, 143, 144, 172, 189, 248 |
| Chapters with a lead and 4 to 8 bullets | 0 (no leads; 16 of 19 chapters have 4 to 8 bullets) |
| Glossary | none (`null`) |
| Sequences drawn as lifelines | 0 of 13. The check looks for an svg `line` with a `stroke-dasharray` attribute (how fx-flow-2 draws a lifeline). The 13 sequence figures are numbered box flows and the page has no lifeline drawing |
| Side menu | `nav` sticky at the top, 230 px wide; current chapter marked after scrolling to chapters 1, 10 and 19; no groups (`null`); no top bar (`null`) |
| Filter | none (`null`) |
| Cards: bar inside its card | yes, all 44 figures, at both widths |
| Cards: bar stays in view with the tall card (figure 16 at 1440 x 600) | no. The bar sits at the foot of the card: the card runs 60..2203 and the bar 2037..2088 at the first scroll position |
| Autoplay at 1440 | 44 of 44 figures reach step 1 within 3 s of the figure box centre reaching the window middle, in light and dark. A box taller than the window shows its middle part there; figures 1, 2, 3, 12, 16 and 33 (boxes 1582 px and taller) are such boxes, and an earlier run that put the box top at the middle missed them because of the measure, not the page |
| Autoplay at 390 | 44 of 44, light and dark |
| Pauses when scrolled away | yes, read on figure 9 only (the figure with the fewest steps of at least 3) |
| Resumes on return | no, read on figure 9 only (it stays at 1 / 6 after the return) |
| Reduced motion | nothing plays on figure 9 within 3 s of its middle at 1440 and 390 (read on that figure only) |
| Smallest figure text | 12.5 px |
| Page-level horizontal scroll at 390 | none |
| Console errors | 0 in all 8 states |
| Player: rest, next, reset, reset while playing, play and pause, restart | pass at 1440 and 390, light and dark |
| Player: Back | a Back from step 1 shows 6 / 6 (wraps), the check expects 0 / 6 |
| Player: interval, stops at the end, empty figure | `null` (no stated interval; no stated end rule; no site data to build an empty figure from) |

## Fixture site check (the task 06 fixture site)

Command (exit 0, prints `OK`):

```
node docs/plans/2026-10-29-system-flow-site/proof/fixture-site.js
node docs/plans/2026-10-29-system-flow-site/proof/page-check.js --measure fx --out-dir <SCRATCH>/proof-site/shots <fixture>/docs/system-flow/index.html <SCRATCH>/proof-site/fx-fixture.json
```

| Field | Value |
|---|---|
| chapters | 5 (the four Start here chapters and `s1`) |
| proseWordsAvg | 124.4 (125, 124, 125, 124, 124) |
| chaptersWithLeadAndBullets | 5 |
| glossary | 15 |
| lifelines / sequences | 2 / 2 |
| menu | 240 px, 3 groups, sticky, current marked, phone bar, resize, no-script: all pass |
| filter | term, chapter, part, none, clear, term link: all pass at 1440 and 390 |
| cards | bar in card, bar in view, sideways at 390: pass |
| autoplay | within 3 s (4 of 4 figures, both widths and themes), pauses, resumes, no resume at the end, reduced motion: pass (the last four read on figure 1) |
| labelsMinPx / pageScrollAt390 / consoleErrors | 12 / false / 0 |
| player | rest, next, back, reset, resetWhilePlaying, playPause, interval, endStops, restart, emptyFigure: all `pass: true` |

Both tables side by side (`compare.js <owner.json> <fixture.json>`; the fixture is a test site, not a proof site):

| Measure | Pass line | Owner | Site A | Pass A |
|---|---|---|---|---|
| Reading prose per chapter (words) | average at least 120 | 121.9 | 124.4 | yes |
| Chapters with a lead and 4 to 8 bullets | every chapter | 0 of 19 | 5 of 5 | yes |
| Glossary size | 15 to 40 | - | 15 | yes |
| Sequences drawn inline as lifelines | every sequence | 0 of 13 | 2 of 2 | yes |
| Side menu | sticky, 230 to 250 px, three groups, current marked, top bar opens and closes | 230 px, - groups, sticky true, current true, bar - | 240 px, 3 groups, sticky true, current true, bar true | yes |
| Filter | term, chapter and part narrow; clearing restores | - | 6 of 6 | yes |
| Cards | bar inside its card and in view with it | 1 of 2 | 3 of 3 | yes |
| Autoplay | step 1 within 3 s at both widths; pauses when away | 3 of 4 | 5 of 5 | yes |
| Labels (smallest figure text, px) | 12 or more | 12.5 | 12 | yes |
| Page width | no sideways scroll at 390 | fits | fits | yes |
| Console errors | 0 | 0 | 0 | yes |
| Player checks | every bar check passes | 6 of 7 | 10 of 10 | yes |

## Migration

Source: the first iteration's scratch copy `/tmp/claude-1000/sf-build/proof-a-20261028-1/Shamel.Backend` (its source, its version-1 fragments, one new commit). Fresh copy for this run, a git repo with one commit:

```
docs/plans/2026-10-28-system-flow/proof/prepare-scratch /tmp/claude-1000/sf-build/proof-a-20261028-1/Shamel.Backend <SCRATCH>/proof-site/migrate-20261029-1/Shamel.Backend
874bc46b3234d5083f1551c117054dd722073bbf
```

Before (`scripts/system-flow --root <copy> check`, exit 1): 10 lines `<fragment>: schemaVersion 1: run system-flow migrate`, one per fragment (chapters, core, corrections, inventory, level0, meta, mobile-api, questions, rules, twk-framework).

Migrate (`scripts/system-flow --root <copy> migrate`, exit 0): `rewritten` lists the 10 fragments; `owed` lists 62 problems.

After (`check`, exit 1, as it must be: the prose is still owed):

| Property | Result |
|---|---|
| Lines containing `run system-flow migrate` | 0 |
| `check` error lines vs `owed` | both 62 lines; equal as sets (0 only in one, 0 only in the other) |

Diff of the fragments against the commit (`git diff`, then each file compared as parsed JSON):

| File | `look` added | `schemaVersion` | `meta.name` | Other keys changed or removed |
|---|---|---|---|---|
| meta.json | - | 1 -> 2 | added ("Shamel Backend system flow", copied from `meta.title`) | 0 |
| core.json | 83 | absent | - | 0 |
| level0.json | 7 | absent | - | 0 |
| mobile-api.json | 70 | absent | - | 0 |
| twk-framework.json | 68 | absent | - | 0 |
| chapters.json, corrections.json, inventory.json, questions.json | 0 | absent | - | 0 |
| rules.json | 0 | absent | - | 0 (byte for byte unchanged) |

228 `look` keys in all, no label, fact or evidence value changed, none removed. Two whitespace changes are not keys: four files gained a final newline (chapters, corrections, inventory, questions), and `meta.json` `roots` went from one line to the pretty-printed form. `git diff --ignore-all-space --stat` on the four newline files prints nothing.

## Nothing written under /mnt

`find /mnt/c/Users/Faisal/Desktop/system-flow -newer <SCRATCH>/proof-site/stamp | wc -l` printed `0` after the owner run.

## (a) Shamel.Backend

The full results are in `proof/results-a.md`: build and evidence checks, the comparison table, the browser and visual checks, cost against the estimate and the recalibration. Every Proof table pass line passes. Failed: the visual check's text-fits line (archify node subtitles at 2.3 to 6 px, cut off) and its glossary-link line (2 of 41 links per width stop out of view). Not run on site (a): page-check's default-mode checks, the map level walk, right to left.
