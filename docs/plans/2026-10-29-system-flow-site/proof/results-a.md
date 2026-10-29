# Proof run (a): Shamel.Backend, results

Run folder `<RUN>` = `/tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1` (commands in `proof/run-a.md`). Scratch repo HEAD `4cd0689`. Browser: Playwright Chromium 130.0.6723.31 under `<PW>` = `/tmp/claude-1000/-development-advantage-backend/41c30690-f980-4e40-a682-fd0bcbf989cf/scratchpad/e2e/pw`, run with `NODE_PATH=<PW>/node_modules PLAYWRIGHT_BROWSERS_PATH=<PW>/browsers HOME=<PW>/home`.

## Summary

Every pass line of the design's Proof table passes against the owner's page. The visual check fails on two lines: archify node subtitles render at 6 px and are cut off, and 2 of 41 glossary links per width stop out of view. Tokens came in 18% over the estimate and minutes 50% over; the estimate is recalibrated below. The 964 px figure is allowed by the design.

## Build and evidence

| Check | Result |
|---|---|
| `system-flow --root <RUN>/Shamel.Backend check` | exit 0: `{"ok":true,"fragments":11,"items":677,"warnings":[]}` |
| `system-flow ... build` (with the run's HOME, so archify is found) | exit 0, `problems: []`, 22 archify pages and 4 SVG fallbacks (the same 4 the lane named, same reasons) |
| `build` stdout `prose` | 9 chapters, 149 to 199 floorWords, average 177.3; lead 3 or 4 sentences; 4 to 7 bullets; glossary 24; lifelines 5 |
| Depth | 4 levels (1, 4, 10, 2 diagrams), 17 diagrams, 151 main nodes, 48 context nodes, 234 arrows, 5 sequences (45 messages), 2 store flows, 12 store rows, 701 evidence entries over 99 files; every area met its plan |
| Coverage | 5 of 5 engines, 7 of 7 flows, 6 of 6 stores, 6 of 6 integrations, 0 jobs |
| Source unchanged | `find /mnt/c/Users/Faisal/Downloads/Shamel.Backend -newer <RUN>.stamp` lists 0 files; the owner's page folder lists 0 newer than `proof-site/stamp` |
| Credential copy | `find <RUN>/home/.claude/.credentials.json`: No such file or directory |

Incident, recorded: the first `build` of this step ran under `scripts/scratch-env`, whose fresh HOME has no archify, so it rewrote the 22 archify pages as static SVG (`<RUN>/results/build.out`). A second `build` with `HOME=<RUN>/home` (where the run's archify copy lives) put them back: 22 archify, the same 4 fallbacks, exit 0 (`<RUN>/results/build2.out`). No fragment was touched; every browser check below ran on the rebuilt site.

## Comparison with the owner's page

`node proof/compare.js /tmp/claude-1000/sf2-build/proof-site/owner-2.json <RUN>/measure-a.json` (exit 0). Measure JSON: `proof/measure-a.json`.

| Measure | Pass line | Owner | Site A | Pass A |
|---|---|---|---|---|
| Reading prose per chapter (words) | average at least 120 | 121.9 | 183.8 | yes |
| Chapters with a lead and 4 to 8 bullets | every chapter | 0 of 19 | 9 of 9 | yes |
| Glossary size | 15 to 40 | - | 24 | yes |
| Sequences drawn inline as lifelines | every sequence | 0 of 13 | 5 of 5 | yes |
| Side menu | sticky, 230 to 250 px, three groups, current marked, top bar opens and closes | 230 px, - groups, sticky true, current true, bar - | 240 px, 3 groups, sticky true, current true, bar true | yes |
| Filter | term, chapter and part narrow; clearing restores | - | 6 of 6 | yes |
| Cards | bar inside its card and in view with it | 1 of 2 | 3 of 3 | yes |
| Autoplay | step 1 within 3 s at both widths; pauses when away | 3 of 4 | 5 of 5 | yes |
| Labels (smallest figure text, px) | 12 or more | 12.5 | 12 | yes |
| Page width | no sideways scroll at 390 | fits | fits | yes |
| Console errors | 0 | 0 | 0 | yes |
| Player checks | every bar check passes | 6 of 7 | 10 of 10 | yes |

Reading words per chapter (site A): 148, 159, 213, 165, 202, 211, 203, 174, 179.

## Browser check of `index.html`

`page-check.js --measure fx` at 1440 and 390, light and dark, reduced motion on and off (exit 0). Every line passes:

| Control or behaviour | Result |
|---|---|
| Play | reads Pause while playing, reaches 2 / 5, Pause reads Play and holds 2 / 5 for 2 s; 4 states |
| Back | 0 / 5 after Next then Back; 4 states |
| Next | 1 / 5 after one Next; 4 states |
| Reset | 0 / 5 and Play after 4 Next, still 0 / 5 2 s later; Reset while playing also stops at 0 / 5 |
| Interval | 1 / 5 at once, 2 / 5 at 2.0 s |
| Stops at the last step | 5 / 5 and Play 7.5 s after Play, still 5 / 5 2 s later; Play from the end restarts at 1 / 5 |
| Empty figure | 0 / 0, buttons disabled, 0 console errors |
| Autoplay in the middle band | 24 of 24 figures reach step 1 within 3 s at 1440 and 390, light and dark; pauses when scrolled away; resumes on return; no resume after the end |
| Reduced motion | 0 / 5 3 s after the middle, both widths |
| Side menu | sticky at 1440, 240 px, 3 groups; scroll highlight marks chapters 1, 5 and 9 |
| Phone menu (390) | closed at load, bar at top after scrolling, opens, a link closes it and focus returns to the summary; resize and no-script pass |
| Filter | term, chapter and part narrow, no match reads "Nothing matches", clearing restores 13 of 13 links, term link lands in view |
| Cards | bar inside its card in all 8 states; bar in view with the 2747 px card at 1440 x 600; figure 0 scrolls sideways inside its card at 390 |
| Inline lifelines | 5 of 5 sequence cards draw dashed lifelines (9, 4, 6, 3 and 7) |
| Glossary links | 41 term links to 19 terms, 0 broken; clicked one by one, 39 of 41 land in view at 1440 and 39 of 41 at 390 (**failed**, below) |
| Theme button, evidence | Theme toggles dark and back; "Open all evidence boxes" opens 9 of 9 |
| Text, width, console | smallest figure text 12 px, no page scroll at 390, 0 console errors |

Screenshots: `<RUN>/shots/fx-<1440|390>-<light|dark>.png`.

`page-check.js` without `--measure` (task 14's arrowStyle, fitAt1440 and panelEscape) does not run on a real site: it clicks the fixture's `#ch-05-s1` and times out (exit 1, `<RUN>/results/check-a.out`). Those three checks were not run on site (a).

## Visual check (`references/visual/visual-check.md`)

Run on `index.html` (above) and all 26 deep diagram pages at 1440 and 390, light and dark: 104 states, script `<RUN>/results/vcheck.js`, JSON `<RUN>/shots-deep/vcheck.json`, screenshots `<RUN>/shots-deep/<page>-<width>-<theme>.png`.

| Line | Result |
|---|---|
| Console errors | 0 in 104 states |
| Outside requests | 0 in 104 states |
| No page scroll at 390 | holds in 104 states |
| Both themes render | yes: every page changes background between light and dark |
| Theme button | the 22 archify pages have one; the 4 SVG fallback pages have none (they follow the saved or system theme) |
| Text fits, no label cut off | **failed** on the archify pages. On `arch-level0` at its default 100% view, every node subtitle renders at 6 px at 1440 and 2.8 px at 390 and runs past the box edge, cut with an ellipsis. All 14 archify architecture pages show text at 2.3 to 6 px, the archify store flow page at 5 px, the sequence pages at 6.5 to 10.8 px. archify's own browser check passed all 22, so no fallback was taken |
| Glossary links | **failed**: `#term-shaheen` from the page top stops about 1300 px short of its row (smooth scroll over a 57,000 px page), and one link per width (`#term-answer-watcher`, `#term-poll-after-ms`) leaves the row above the window. Cause not diagnosed |
| Map levels, evidence per node and edge, right to left, theme after reload | not run |

## The 964 px figure

The 964 px figure is `seq-mobile-api-seq-prompt`, the main request as a lifeline sequence with 9 participants and 13 messages. The build's layout report gives `width 964, participants 9, scrolls: true`. The design allows it:

> "With 9 to 12 participants the figure is 964 to 1276 px and scrolls sideways inside the card at 1440 as well; the check caps a sequence at 12 participants." (design.md, The 860 rule)

> "A figure wider than the card | Not a failure: it scrolls inside the card at 1:1. A box figure over 860 px still fails layout as today." (design.md, failure table)

In the browser at 1440 it is the only figure wider than its card: `.fig` scrollWidth 988, clientWidth 898, page width 1440. Not a bug; no fix. The build's 860 limit applies to box figures only (`src/lib/sf-build.ts:162`).

## Cost and time

Tokens, deduplicated by request id over the controller transcript and the four area agents (`scripts/build-cost` gives the same controller figure):

| Source | Requests | Tokens |
|---|---|---|
| Controller | 78 | 11,291,484 |
| Area agents (4) | 71 | 5,453,295 |
| Total | 149 | 16,744,779 |

The lane reported 15.4M (controller 9.96M plus agents 5.45M). It measured at 01:04 UTC, before its final build, its second visual check and its report, which account for the other 1.33M.

| Measure | Estimate | Lane's report | Measured | Against estimate |
|---|---|---|---|---|
| Tokens | 14.2M | 15.4M | 16.74M | +18% |
| Minutes | 27.6 (23 plus 4.6 archify) | 28 | 41.4 | +50% |

Minutes are from the start and end stamps of the three `claude -p` steps: 2 min 17 s, 12 min 26 s, 26 min 43 s. The sum of `duration_ms` over the step results is 13.2 min. That figure counts only the last segment of each step, after the final background notification, so it is not used. The lane's 28 min is the elapsed time at 01:04 UTC. It leaves out the last 14 minutes, most of them the lane's second 9-minute visual check run. Subagent dispatches: 4 area agents, plus 2 messages that sent two chapters back to their agents for trimming.

## Calibration

`src/lib/sf-estimate.ts` `ESTIMATE`, measured on 2026-10-29: tokensPerFile 21,000 (was 37,000), tokensPerFigure 145,000 (93,000), controllerTokensPerArea 2,500,000 (2,100,000), minutesPerFile 0.09 (0.2), minutesPerFigure 0.315 (0.7), controllerMinutes 32.7 (9.4); archifyMinutesPerPage and parallel unchanged. Per-file and per-figure tokens solve this run's and run (b)'s area-agent totals. The controller's per-area tokens sit between the two runs: 2.82M here, 2.10M on run (b). The minute constants fit both runs' wall clock.

| Run | Estimate | Measured | Difference |
|---|---|---|---|
| (a) 2026-10-29, its plan.json, tokens | 15,435,000 | 16,744,779 | -7.8% |
| (a) minutes, archify included | 41.4 | 41.4 | 0% |
| (b) 2026-10-28, tokens | 54,122,000 | 49,415,523 | +9.5% |
| (b) minutes, archify apart | 52.6 | 52.7 | -0.2% |

`node scripts/system-flow-estimate.test.js`: RED with the new expected values against the old constants, then GREEN (`system-flow-estimate.test.js: OK`). `scripts/check-all`: EXIT 0, ALL GREEN (`/tmp/claude-1000/sf2-build/check-all-task12.log`).

## The lane's other findings, for the record

- Three areas skipped the fx-humanize pass on their first return. The two chapters sent back for trimming got it then. The `mobile-api` chapters never did; the controller read them by hand and changed nothing.
- The 4 SVG fallback pages (`arch-mobile-api-l2-channels`, `arch-shaheen-l2-fake`, `arch-twk-framework-l1`, `flow-twk-framework-flow-config-load`) have no theme button. Confirmed: under the system light and dark settings they render both themes. The lane did not confirm light through the saved theme.
- 8 arrows are not drawn. Confirmed in the build's layout report: 1 in `mobile-api-l1`, 2 in `mobile-api-l2-channels`, 2 in `shaheen-l2-streaming`, 3 in `shaheen-l2-fake`.

## Failed lines for the owner

1. Visual check, text fits: the archify architecture pages render node subtitles at 2.3 to 6 px, cut off at the box edge, at their default view.
2. Visual check, glossary links: 2 of 41 links per width do not bring their row into view.
3. Not run on site (a): page-check's default-mode checks (arrowStyle, fitAt1440, panelEscape), the map level walk, evidence per node and edge, right to left, theme after reload.
