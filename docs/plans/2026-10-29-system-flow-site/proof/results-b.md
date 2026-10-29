# Proof run (b): the four Advantage repos, results

Run folder `<RUN>` = `/tmp/claude-1000/sf2-build/proof-b2-2026-10-29-1` (record in `proof/run-b.md`). Host clone `advantage-backend` at `07155673f`, with `advantage-guide`, `android` and `advantage-store` as extra roots. Browser: Playwright Chromium 130.0.6723.31 under `<PW>` = `/tmp/claude-1000/-development-advantage-backend/41c30690-f980-4e40-a682-fd0bcbf989cf/scratchpad/e2e/pw`, run with `NODE_PATH=<PW>/node_modules PLAYWRIGHT_BROWSERS_PATH=<PW>/browsers HOME=<PW>/home`. Result files are under `<RUN>/results/` unless named otherwise.

## Summary

Every pass line of the design's Proof table passes against the owner's page and site (a). Every browser check on `index.html` passes at 1440 and 390, light and dark, and the map walk opens all 57 levels and shows the right evidence for all 726 nodes and 815 arrows in all four states. One visual line fails: 42 node labels on 28 of the 53 archify architecture pages are shortened with "...". Tokens came in 32% over the estimate; wall clock 3% over. The rules writer summarised 25 ADR decisions from clipped text; the cause and the fix are below (commit `b5b542d`). Seven code findings that need the owner are listed at the end.

## Build and evidence

| Check | Result |
|---|---|
| `system-flow --root <RUN>/advantage-backend check` (after `b5b542d`, so the new decision check ran on all 183 rules) | exit 0: `{"ok":true,"fragments":21,"items":2528,"warnings":[]}` (`check.out`) |
| Build | Not rerun. The site is the lane's final build (`/tmp/claude-1000/sfplan/build5.json`, 03:57 UTC, the same time as `index.html`): `ok: true`, `problems: []`, 98 archify pages and 9 SVG fallbacks. A rebuild would only redo the 98 archify pages |
| Prose (build stdout) | 19 chapters, 151 to 200 floorWords, average 178.6; lead 2 to 4 sentences; 4 to 7 bullets; glossary 39; lifelines 19 |
| Depth | 4 levels (1, 13, 31, 12 diagrams), 57 diagrams, 550 main nodes, 176 context nodes, 815 arrows, 19 sequences (181 messages), 11 store flows, 72 store rows, 2,886 evidence entries over 490 files |
| Coverage | 5 of 5 engines, 6 of 6 flows, 6 of 6 stores, 55 of 55 jobs, 10 of 10 integrations |
| Rules | 183 rules from 65 ADRs; 0040 left out (superseded by 0057) |
| Real repos unchanged | `git -C <repo> status --porcelain` equals `<RUN>/status-before-<name>.txt` for all four (`status-after-*.txt`) |
| Credential copy | `find <RUN>/home/.claude -name .credentials.json` lists nothing |

## Comparison with the owner's page and site (a)

`node proof/compare.js /tmp/claude-1000/sf2-build/proof-site/owner-2.json proof/measure-a.json proof/measure-b.json` (exit 0, `compare.md`). Measure JSON: `proof/measure-b.json`, from `page-check.js --measure fx` (exit 0).

| Measure | Pass line | Owner | Site A | Pass A | Site B | Pass B |
|---|---|---|---|---|---|---|
| Reading prose per chapter (words) | average at least 120 | 121.9 | 183.8 | yes | 186.8 | yes |
| Chapters with a lead and 4 to 8 bullets | every chapter | 0 of 19 | 9 of 9 | yes | 19 of 19 | yes |
| Glossary size | 15 to 40 | - | 24 | yes | 39 | yes |
| Sequences drawn inline as lifelines | every sequence | 0 of 13 | 5 of 5 | yes | 19 of 19 | yes |
| Side menu | sticky, 230 to 250 px, three groups, current marked, top bar opens and closes | 230 px, - groups, sticky true, current true, bar - | 240 px, 3 groups, sticky true, current true, bar true | yes | 240 px, 3 groups, sticky true, current true, bar true | yes |
| Filter | term, chapter and part narrow; clearing restores | - | 6 of 6 | yes | 6 of 6 | yes |
| Cards | bar inside its card and in view with it | 1 of 2 | 3 of 3 | yes | 3 of 3 | yes |
| Autoplay | step 1 within 3 s at both widths; pauses when away | 3 of 4 | 5 of 5 | yes | 5 of 5 | yes |
| Labels (smallest figure text, px) | 12 or more | 12.5 | 12 | yes | 12 | yes |
| Page width | no sideways scroll at 390 | fits | fits | yes | fits | yes |
| Console errors | 0 | 0 | 0 | yes | 0 | yes |
| Player checks | every bar check passes | 6 of 7 | 10 of 10 | yes | 10 of 10 | yes |

Reading words per chapter (site B): 145, 163, 191, 167, 213, 193, 171, 159, 212, 207, 212, 192, 196, 183, 190, and four more in the same range (`measure-b.json`).

## Browser check of `index.html`

`page-check.js --measure fx` and `page-check.js --site` (both exit 0; `measure.out`, `site.json`) at 1440 and 390, light and dark, reduced motion on and off:

| Area | Result |
|---|---|
| Player: Play and Pause, Back, Next, Reset, Reset while playing, interval, stops at the end, restart, empty figure | 10 of 10 pass in all 4 states (rest 0 / 5 and Play; Next 1 / 5; Back 0 / 5; Reset 0 / 5 and still 0 / 5 2 s later) |
| Autoplay | 86 of 86 figures reach step 1 within 3 s in each of the 4 states; pauses out of view, resumes on return, no resume at the end; reduced motion holds 0 / 5 |
| Side menu | sticky at 1440, 240 px, 3 groups, current chapter marked at chapters 1, 10 and 19 |
| Phone menu (390) | closed at load, bar at the top after scrolling, opens, a link closes it with focus on the summary; Escape closes the open panel with focus on the summary (`panelEscape`); resize and no-script pass |
| Filter | term ("jwt_token cookie"), chapter and part narrow, no match reads "Nothing matches", clearing restores, a term link lands in view |
| Glossary links | 47 term links to 26 terms, 0 broken; clicked one by one, 47 of 47 land in view at 1440 and 47 of 47 at 390 (`termLinks`) |
| Cards | bar inside its card in all 8 states; bar in view with the 2,251 px card at 1440 x 600; figure 0 scrolls sideways inside its card at 390 |
| Figure width | 84 figures at most 860 px in their 898 px card (`fitAt1440`); the other 2 are 9-participant sequences at 964 px, allowed by design.md "The 860 rule" |
| Lifelines and arrows | 19 of 19 sequence cards draw dashed lifelines (5 to 8 each); 22 reply arrows dashed; 6 calls leaving Advantage in `var(--warn)` at 2.4; 72 cap lines in 56 level cards (`arrowStyle`) |
| Theme and evidence | Theme toggles dark and back; "Open all evidence boxes" opens 19 of 19 |
| Text, width, console | smallest figure text 12 px, no page scroll at 390, 0 console errors |

Screenshots: `<RUN>/shots/fx-<1440|390>-<light|dark>.png`.

## Map walk

Script `mapwalk.js`, JSON `<RUN>/shots-map/mapwalk.json`, screenshots `<RUN>/shots-map/map-level0-<state>.png`. For each state it opens every level from the root through each node's "Open next level" button and returns by the breadcrumb. On each level it clicks every node and every arrow (with "Show all arrows" on) and compares the evidence panel with the map data: title, the evidence count (or "No evidence recorded."), and "Open next level" present exactly when the node has a child level.

| State | Levels opened | Nodes checked | Arrows checked | Problems | Console errors |
|---|---|---|---|---|---|
| 1440 light | 57 of 57, 4 opens deep | 726 | 815 of 815 | 0 | 0 |
| 1440 dark | 57 of 57 | 726 | 815 of 815 | 0 | 0 |
| 390 light | 57 of 57 | 726 | 815 of 815 | 0 | 0 |
| 390 dark | 57 of 57 | 726 | 815 of 815 | 0 | 0 |

"Show context nodes" at the root hides 5 of 17 nodes and brings them back. No level failed to lay out. The map has no page scroll at 390 (canvas 358 px wide).

The first walk reported 54 to 128 arrows "not drawn" per state, a different set each time. React Flow mounts arrows only after it has measured the nodes, and the script looked 15 ms after "Show all arrows". The walk now waits up to 3 s for the arrows; every arrow is drawn (`mapwalk.out` first run, `mapwalk2.out` second).

Seen on the screenshots, not measured: at the root's fitted zoom, node labels are about 4 to 5 px at 1440. At 390 the fitted view cuts off the leftmost nodes ("ore billing", "rowser users"). The map's zoom buttons reach both.

## Visual check of the deep pages (`references/visual/visual-check.md`)

All 107 deep pages at 1440 and 390, light and dark: 428 states. Script `/tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/results/vcheck.js` (run (a)'s), JSON and screenshots `<RUN>/shots-deep/`. Node text measured with `/tmp/claude-1000/sf2-build/fix/nodetext.js` over the 53 archify architecture pages (`nodetext-1440.out`, `nodetext-390.out`).

| Line | Result |
|---|---|
| Console errors | 0 in 428 states |
| Outside requests | 0 in 428 states |
| No page scroll at 390 | holds in 428 states |
| Both themes render | yes: every page changes background between light and dark |
| Theme button | all 107 pages have one; `deepTheme` toggles, stores and keeps the theme on 7 of 7 SVG pages it checks |
| Node text size | archify architecture pages at 1440: scale 1.34 to 1.35, node text 12.1 to 14.8 px. At 390: scale 0.33, node text 3 to 3.7 px (archify fits the canvas to the phone, as on site (a)). Smallest text of any kind at 1440: architecture 10.8 px (arrow labels), sequences 7.6 px, store flows 7.7 px |
| Text fits, no label cut off | **failed**: 42 of 703 node texts on 28 of 53 archify architecture pages end in "..." at 1440 (46 texts on 29 pages at 390). Examples on `arch-core-billing-l1`: `PaymentReconcilia...`, `Core::Myfatoorah...`, `Core::Subscriptio...`. fx shortens a label archify would reject as wider than its box; site (a) had 3 such labels |

## The lane's own report, checked

| Lane said | Checked |
|---|---|
| 98 archify pages, 9 SVG fallbacks | `build5.json`: 98 archify, 9 SVG: `arch-core-billing-l2-payment`, `arch-core-billing-l2-reconcile`, `arch-engagement-data-l2-hosted`, `arch-platform-l1` (static), and `flow-engagement-runtime-flow-claim-pass` and `-p2`, `flow-engagement-runtime-flow-delivery-status` and `-p2`, `flow-shortlink-flow-redirect` (animated), each after an archify failure with its receipt named |
| Two figures wider than 860 px are 9+ participant sequences | `seq-engagement-studio-seq-author-run` and `seq-measurement-seq-attribution`, 964 px, 9 participants each |
| 24 undrawn arrows in 15 figures, 3 on level 0 | layout report: 24 in 15 figures, `level-level0` 3. The interactive map draws all 815 |
| 26 questions, all answered with the recommendation; 8 changed the site | `questions.json` 26, `corrections.json` 8 |

## Cost and time

Tokens deduplicated by request id (the `scripts/build-cost` rule: input, cache read, cache creation and output, first usage per request), over `<RUN>/transcript.jsonl` and the 14 subagent transcripts (`tokens.py`, `tokens.out`):

| Source | Requests | Tokens |
|---|---|---|
| Controller | 163 | 44,158,295 |
| Area agents (13) | 330 | 29,804,697 |
| Rules agent (1) | 24 | 1,905,005 |
| Total | 517 | 75,867,997 |

Largest area agents: `engagement-runtime` 5.91M, `shortlink` 4.26M, `core-platform` 3.75M.

| Measure | Estimate (plan) | Lane's report | Measured | Against estimate |
|---|---|---|---|---|
| Tokens | 57.3M | 69.9M | 75.87M | +32% |
| Minutes | 85 (69 plus 16 archify) | - | 87.7 | +3% |

Minutes from the stamps: plan 3 min 18 s (02:29:56 to 02:33:14), build 43 min 34 s (02:33:26 to 03:17:00), interview and finish 40 min 49 s (03:17:10 to 03:57:59). The token overrun sits in the controller: 44.2M, or 3.4M per area against the estimate's 2.5M. Subagent dispatches: 14 (13 areas and the rules writer), plus 12 messages back to running agents: 1 build fix round and 11 chapter trims to the 200-word cap.

## Rules in force: the truncated ADRs

What happened: the controller handed `rules.json` to a subagent "so the ADR text doesn't fill this context" (the lane says the controller writes it). The brief told it to "read each ADR's decision yourself". The agent read the 66 ADRs in bulk shell dumps instead: `awk ... substr($0,1,240)` per decision line, `cut -c1-215`, and its first full dump overflowed the tool output cap into a file it then re-read through `cut -c1-300`. 25 decisions were summarised from their first 200 to 420 characters. The agent said so on return, and the controller compared the 25 with the full text and fixed 4 (0012-2 lost the 15-minute Retry-After cap, 0015-3 the test-send exception, 0015-5 the original-links fallback and `links_unshortened`, 0016-9 the system-domain rule). Evidence: `rules-agent-calls.txt`, `rules-correction.txt`.

Cause: nothing required a whole read, and nothing checked a rule against its ADR beyond the ADR's status. The clipping was the reader's own, forced by reading many long ADRs through one capped output.

Fix (`b5b542d`), the smaller of the two options:

- The lane (`skills/fx-system-flow/SKILL.md`) now requires one whole file read per ADR, never `head`, `cut`, `awk` or one listing of many ADRs; a subagent that writes the rules gets that rule in its brief and returns `ADRs read whole: <n> of <n>`, which the controller checks against the ADRs in force.
- `check` (`src/lib/sf-rules.ts`) fails a rule whose `decision` is a number with no numbered item under the ADR's Decision heading, and a rule that cites a phrase where the ADR numbers its decisions.

Why this one: a CLI that extracts the decision lists would print the same 183 long decisions through the same capped output. The agent would clip them again unless it read them one ADR at a time, which is the rule this fix adds anyway. The extractor would be a new command and parser on top. The check needs the same parsing in about 25 lines, and it runs on every `check`. Limit: the check proves a rule cites a real decision. It cannot prove the sentence matches it; the whole-read rule covers that. Numbers continued in a later section (fx's own "Still in force") are not seen (`shortcut:` comment in the code).

Tests: fx-tdd RED `AssertionError [ERR_ASSERTION]: 3 / 0 !== 1` (decision 3, a nested item, was accepted), then GREEN `system-flow-coverage.test.js: ok`; lane gate RED `skills/fx-system-flow/SKILL.md: holds Read each ADR whole with the Read tool, ...`, GREEN `docs-lanes: OK`. `check-all` then refused "the Read tool" in a skill body (check-tool-names), so the sentence now reads "one file read per ADR" (commit `faf4569`). On run (b)'s real `rules.json` the new check passes all 183 rules (`check.out`).

## Questions for the owner (advantage-backend)

The lane recommended "ask the owner" for these, so the site shows only what the code does. Each was checked in the clone at `07155673f`.

1. **gRPC service.** `Core::CoreServiceServer` (`engines/core/app/grpc/core/core_service_server.rb:7`) has no caller in the Ruby code outside specs. Is the gRPC service still served, and does any client use it?
2. **MaxMind updates.** `Shortlink::MaxmindUpdateJob` (`engines/shortlink/app/jobs/shortlink/maxmind_update_job.rb`) is not in the cron hash in `engines/shortlink/lib/shortlink/engine.rb`, and nothing else in the repo schedules it. What runs it: by hand, or something outside the repo?
3. **Measurement postbacks.** `PostbackService#enqueue_for_attribution` (`engines/measurement/app/services/measurement/services/postback_service.rb:12`) has no caller outside specs, so production creates no postbacks. Is the trigger missing, or off on purpose?
4. **Postback retries.** `Postback.retryable` (`engines/measurement/app/models/measurement/postback.rb:15`) has no consumer, so a postback marked retrying is never sent again. Recorded as a gap; is a retry job planned?
5. **Unscheduled billing jobs.** `SendRenewalRemindersJob`, `CardExpiryWarningJob` and `RecalculateEffectiveLimitsJob` have no cron entry in `engines/core/lib/core/engine.rb` and no caller anywhere. Is that intended?
6. **Payment amount check.** `amount_and_currency_match?` (`engines/core/app/services/core/payment_service.rb:508`) returns true, with only a log warning, when the gateway response has no amount or currency, so the payment proceeds unverified. Is that an accepted risk?
7. **Trial expiry.** `ExpireTrialsJob` (`engines/core/app/jobs/core/expire_trials_job.rb`) only logs recently ended trials and changes no state. Is log-only the intended behaviour?

## Failed lines for the owner

1. Visual check, text fits: 42 node labels on 28 of 53 archify architecture pages are shortened with "..." (site (a): 3).
2. Cost: tokens 32% over the estimate (75.87M against 57.3M), nearly all in the controller.

Not failures, noted: the map's fitted root view is unreadable without zoom at 1440 and cuts the leftmost nodes at 390; sequence and store-flow deep pages carry text down to 7.6 px at 1440.
