# Proof run (b): four Advantage roots, results

Run folder: `/tmp/claude-1000/sf-build/proof-b-20261028-1`, with scratch clones of `advantage-backend` (the host), `advantage-guide`, `android` and `advantage-store`. The controller ran the four `claude -p` steps of `run-b.md` on 2026-10-28; this file holds the measured numbers, the checks and the defects the run found.

## Cost

| | Estimate (calibrated constants) | Measured | Error |
|---|---|---|---|
| Tokens | 56,824,000 | 49,415,523 over 381 requests, deduplicated by request id, from the scratch transcript | 13.0% under |
| Wall clock | 53.7 min | 52.7 min (3,159 s) | 2.0% under |

Both land inside the 50% bar. The estimate is the one in force on the run day: it predates defect 6 (area agents now split an unfit figure before returning, work its constants do not count) and the refit from runs (a) and (b) together that the final review asked for, so these errors measure the old constants, not the current ones.

The wall clock is the sum of the four steps, from the controller's UTC stamps:

| Step | From | To | Seconds |
|---|---|---|---|
| Plan | 13:16:31 | 13:19:58 | 207 |
| Build | 13:20:10 | 13:42:21 | 1,331 |
| Splits | 13:42:35 | 13:49:37 | 422 |
| Interview and finish | 13:49:47 | 14:09:46 | 1,199 |

`scripts/build-cost` on the transcript splits the tokens into 25,209,303 for the controller (130 calls) and 24,206,220 for the 12 subagents. The lane's own report counted only subagent tokens (2.3M) and left the controller out; the lane now measures both with `build-cost` (defect 7 below).

Subagent dispatches: 12 Agent calls, one per area, and 6 SendMessage calls that sent figures back for splits.

## Depth against the hand-built bar

| | Run (b) | Hand-built system-flow |
|---|---|---|
| Diagrams | 68 | 23 |
| Levels | 4 (1, 12, 40, 15 per level) | 4 |
| Nodes (primary plus context) | 875 (634 plus 241) | 301 |
| Edges | 974 | 344 |
| Sequences | 16 | 13 |
| Messages | 126 | 132 |
| Store flows | 9 | 8 |
| Chapters | 12 | 19 |
| Evidence entries | 2,739 | 1,785 |
| Files cited | 462 | 219 |

Evidence by root: `advantage-backend` 2,548 (19 of them owner answers), `android` 117, `advantage-store` 40, `advantage-guide` 34. Every root appears in verified evidence.

Items by kind (2,584): 875 nodes, 974 edges, 28 groups, 99 participants, 126 messages, 68 store-flow steps, 35 catalogue entries, 96 inventory entries, 178 rules, and 105 store rows (56 sql, 26 cache, 11 memory, 10 client, 2 files).

Planned against built, per area (from `depth.areas`):

| Area | Levels | Diagrams | Sequences | Store flows |
|---|---|---|---|---|
| platform | 3 of 2 | 6 of 4 | 1 of 1 | 0 of 0 |
| core-platform | 3 of 3 | 11 of 9 | 3 of 3 | 2 of 2 |
| core-console | 1 of 1 | 1 of 1 | 0 of 0 | 0 of 0 |
| engagement-data | 3 of 3 | 9 of 7 | 2 of 2 | 2 of 2 |
| engagement-runtime | 3 of 3 | 9 of 9 | 3 of 3 | 2 of 2 |
| engagement-console | 2 of 2 | 4 of 3 | 1 of 1 | 0 of 0 |
| shortlink | 3 of 3 | 9 of 5 | 2 of 2 | 1 of 1 |
| measurement | 3 of 3 | 9 of 6 | 2 of 2 | 1 of 1 |
| survey | 2 of 2 | 4 of 3 | 1 of 1 | 0 of 0 |
| android-sdk | 2 of 2 | 3 of 3 | 1 of 1 | 1 of 1 |
| advantage-store | 1 of 1 | 1 of 1 | 0 of 0 | 0 of 0 |
| advantage-guide | 1 of 1 | 1 of 1 | 0 of 0 | 0 of 0 |

The extra diagrams come from three sources: four areas built one more than planned in their first pass, the splits of decisions 1a and 2b, and two engagement-data splits (`l2-sync`, `l2-inbox`) after their grid hints drew self-loops as `NaN` paths. The lane's report does not attribute each extra diagram to one of them.

No area fell short. The planning pass split the two areas over 400 files: Core (710) into `core-platform` and `core-console`, Engagement (719) into `engagement-data`, `engagement-runtime` and `engagement-console`.

## Layout

The first build stopped on 23 figures wider than 860 px, none over 1 crossing. The controller added grid hints, and 22 then fit. Two decisions went to the owner, who took:

- **1a:** split `platform-l2-routing` one level down (its best grid was 632 by 940 px with 1.5 crossings).
- **2b:** split the six worst hinted figures (`shortlink-l1`, `shortlink-l2-clicks`, `core-platform-l1`, `measurement-l1`, `measurement-l2-sdk-api`, `engagement-runtime-l1`).

That cost about 7 minutes. The final layout report: 93 figures, every one at most 860 px wide with at most 1 crossing; 14 still use grid hints, leaving 114 arrows unlabelled, and 30 arrows in 19 figures are not drawn. Every missing label and arrow is in its figure's step captions.

## Coverage

`coverage.json` against `ls engines` in the host clone: the five Rails engines (`core`, `engagement`, `measurement`, `shortlink`, `survey`) each have an `engine` entry with chapter `overview`; `engines/advantage` is a stray tracked file, not an engine. The inventory adds the host app and the three other roots, for 9 engine entries.

| Kind | Covered |
|---|---|
| Engines | 9 of 9 |
| Flows | 12 of 12 |
| Stores | 6 of 6 |
| Integrations | 14 of 14 |
| Jobs | 40 of 55 |

## Diagrams by renderer

| Build | archify | static or animated SVG | Cause |
|---|---|---|---|
| Lane run | 0 of 97 | 97 | each root's origin is a local path (`/development/...`), which archify rejects as `repository-evidence/url-invalid` |
| Rebuild after the fixes (this branch) | 91 of 107 pages | 16 | archify geometry rules: `layout/boundary-encloses-non-member`, `composition/desktop-readability`, `sequence/note-overlap`, `clean-flow/edge-through-node` |

## Pass conditions

| Condition | Result | Evidence |
|---|---|---|
| `.fx.json` roots | pass | `system_flow.roots` holds `advantage-guide`, `android` and `advantage-store`, each `../<id>`; `meta.roots` lists the same ids after `advantage-backend` |
| `system-flow check` | exit 0 | `{"ok":true,"fragments":18,"items":2584,"warnings":[]}` |
| `system-flow stale` | nothing stale | `{"roots":{"advantage-backend":[],"advantage-guide":[],"android":[],"advantage-store":[]}}` |
| Coverage lists every engine | pass | see Coverage |
| Estimate within 50% | pass | tokens 13.0%, wall clock 2.0% |
| Real repos unchanged | pass | the controller compared `git status --porcelain` of all four real repos with the step-1 snapshots in the run folder: no change |
| Visual check, 1440 and 390, light and dark | failed in the lane run; after the fixes, 390 overflow only measured | the lane's headless Chrome check failed 180 views at 390 px. The controller's Playwright run on that build counted 179 views at 390 px. Measured on 2026-10-28, after the fixes and a rebuild (91 archify pages, 16 SVG): Playwright at a 390 by 844 viewport, light and dark, checked one thing, page width, and found 0 of 216 views (108 pages) wider than the viewport. Not measured then: 1440, clipped content, and the kit's interactions. Controller visual check after the fix wave (2026-10-28, Playwright 1.48.2 Chromium, rebuilt site with archify 91 and SVG 16): 108 pages, 432 views (light and dark at 1440 and 390): 0 console errors, 0 outside requests, 0 pages scrolling sideways, 0 clipped elements; the map opens all 68 levels at 1440 and 390 with every node in view at 1440. Archify sequence pages pass at 390, which answers Open Question 1. |

## Defects the run found, and their fixes

| # | Defect | Commit |
|---|---|---|
| 1 | `planning.md` never said `meta.json` needs `"schemaVersion": 1` | `076c8ac` |
| 2 | `build` crashed in coverage when an unconfirmed item had no `evidence` key | `0267540` |
| 3 | a hinted grid layout drew a self-loop as a `NaN` path | `29c627a` |
| 4 | a local-path origin failed every archify render and wrote machine paths into `meta.roots[].remote` | `4b26727` |
| 5 | at 390 px, long paths and ids in list text widened `index.html` (449 px) and the sequence and flow pages (619 px) | `825f9bb` |
| 6 | area agents returned 23 figures over 860 px; `check --fragment` now lays out the fragment's figures and the area brief has the agent split an unfit one before returning | `87df8bd` |
| 7 | the lane's cost left out the controller's tokens | `94b4ba8` |

The run's model in the scratch clone still carries the local-path remotes the lane wrote; the CLI now ignores them, and `detect` no longer prints one for the next run.

## Cleanup

The credential copy `proof-b-20261028-1/home/.claude/.credentials.json` was deleted with `find -delete` at the end of the results step.
