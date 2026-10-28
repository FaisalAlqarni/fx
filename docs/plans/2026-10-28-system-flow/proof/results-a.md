# Proof run (a): Shamel.Backend results

Run folder: `/tmp/claude-1000/sf-build/proof-a-20261028-1` (scratch copy `Shamel.Backend`, HEAD `bd0fac1`, no remote). The controller ran the three `claude -p` steps of `run-a.md` on 2026-10-28; this file holds the measured numbers and the results-step checks.

## Cost

| | Estimate (first guesses) | Measured | Ratio |
|---|---|---|---|
| Tokens | 1,158,000 | 12,813,063 over 120 requests, deduplicated by request id, from the scratch transcript under `proof-a-20261028-1/home/.claude/projects` | 11.07 |
| Wall clock | 43 min | 20.3 min (1,217 s): 12:06:12Z to 12:08:09Z (117 s), 12:08:24Z to 12:21:09Z (765 s), 12:21:21Z to 12:26:56Z (335 s) | 0.47 |

The `duration_ms` of the three results add up to 545.7 s (120.2 + 84.3 + 341.2). Step 2 returned after 84 s, but its background subagents ran until 12:21:09Z, so the wall clock above is the cost a reader waits for.

Subagent dispatches: 6 `general-purpose` Agent calls in the session transcript; 3 subagent transcripts were recorded.

### Calibration

The plan had 3 areas, 83 files to read and 24 figures (14 diagrams, 6 sequences, 4 store flows planned). One run cannot separate per-file cost from per-figure cost, so every constant was scaled by the measured ratio:

| Constant | Before | After |
|---|---|---|
| tokensPerFile | 6,000 | 66,000 |
| tokensPerFigure | 15,000 | 166,000 |
| controllerTokens | 300,000 | 3,320,000 |
| minutesPerFile | 0.4 | 0.2 |
| minutesPerFigure | 1.5 | 0.7 |
| controllerMinutes | 20 | 9.4 |
| parallel | 4 | 4 |

`system-flow estimate` on the run's `model/plan.json` now prints 12,782,000 tokens (0.2% under the measured value) and 20.5 minutes (1.2% over), both within the 10% bar. `calibrated` is `true` and `note` reads `constants measured on 2026-10-28`. `scripts/system-flow-estimate.test.js` asserts both.

## Depth against the hand-built bar

| | Run (a) | Hand-built system-flow |
|---|---|---|
| Diagrams | 17 | 23 |
| Levels | 4 (1, 3, 11, 2 per level) | 4 |
| Nodes (primary plus context) | 196 (145 plus 51) | 301 |
| Edges | 213 | 344 |
| Sequences | 6 | 13 |
| Messages | 44 | 132 |
| Store flows | 5 | 8 |
| Store rows | 12 | 130 |
| Chapters | 9 | 19 |
| Evidence entries | 628 (the build's depth block counts 607 on figures and chapters) | 1,785 (141 in Shamel.Backend) |
| Files cited | 85 | 219 |

The hand-built site covers the whole workspace (Shamel.Backend, Shaheen and the mobile apps); run (a) covers Shamel.Backend alone, so the bar is not a like-for-like target.

Planned against built, per area (from the lane's report and `depth.areas`):

| Area | Levels | Diagrams | Sequences | Store flows | Cause of a difference |
|---|---|---|---|---|---|
| mobile-api | 2 of 2 | 4 of 4 | 3 of 3 | 0 of 0 | |
| core | 3 of 3 | 6 of 5 | 2 of 2 | 1 of 1 | the connectors figure was too wide and split in two |
| twk-framework | 2 of 2 | 6 of 5 | 1 of 1 | 4 of 3 | a page for library parts the host never runs; a flow for the daily header-caching refresh |

No area fell short. The `failures-and-errors` chapter has no figure of its own, only nodes in other figures.

## Evidence comparison

`python3 -I proof/compare-evidence.py <system-flow model/system-model.json> <run model> proof/reasons-a.json`:

- `systemFlowItems` 105, `matched` 24, `share` 0.23, `added` 433.
- 81 missed, each with a reason in `proof/reasons-a.json`:
  - 69 cite only files that no longer exist at the copy's revision (for example `src/Core/Application/Sessions/RedisInflightTurns.cs` and `src/APIs/MobileAPI/Controllers/v4/SessionsController.cs`; the code now lives under `Conversations/` and `Shaheen/`). The hand-built model describes older code.
  - 11 cite `Pipeline.Files/pipeline_MobileAPI_release_le.yml` with files that are gone; the planning pass did not pick the release pipeline.
  - 1 (`node:be-limit`) cites `src/APIs/MobileAPI/DependencyInjection.cs`, which the run cites at other line ranges.

There is no pass number; the owner reads the comparison.

## Pass conditions

| Condition | Result | Evidence |
|---|---|---|
| `detect` | pass | `theme.source` `docs/assets/docs.css`, `docsConfig.path` `mkdocs.yml`, `output.site` `docs/system-flow`, `archify` 3.2.0 via `CLAUDE_CONFIG_DIR` |
| `system-flow check` | exit 0 | `{"ok":true,"fragments":10,"items":584,"warnings":[]}` |
| `system-flow stale` | nothing stale | `{"roots":{"shamel-backend":[]}}` |
| `mkdocs build --strict` with the nav entries | exit 0, after the generated files were committed in the scratch copy | mkdocs 1.6.1 with mkdocs-material and the copy's two git plugins in `proof-a-20261028-1/venv`. Before that commit, strict mode failed only on the git plugins' warnings for uncommitted files (`has no git logs`, `has not been committed yet`). The `System flow: system-flow/index.html` nav entry gave no warning. |
| Original Shamel.Backend unchanged | pass | `find /mnt/c/Users/Faisal/Downloads/Shamel.Backend -newer proof-a-20261028-1.stamp` lists 0 files |
| Rules in force | 14 rules for 14 decisions | `docs/adr` has ADR-001 to ADR-014, none superseded; the model holds 14 rules |
| Visual check, 1440 and 390, light and dark | not run here: no browser in this session | the controller runs it with Playwright on the rebuilt site |

## Diagrams by renderer

| Build | archify | static SVG | Cause |
|---|---|---|---|
| Lane run | 8 of 28 | 20 | archify's geometry checks rejected the generated specs |
| Rebuild after the fixes (this branch) | 28 of 28 (32 pages with the `-p2` pages) | 0 | |

What the lane's 20 receipts named, and the generator change for each:

- Boundary frame 1 to 14 px outside the canvas (11 architecture specs): archify draws a frame 30 px around its members and widens it for its title, so the spec now shifts every component right and down to keep each frame 16 px inside, and leaves `viewBox` to archify, which covers the right and bottom.
- Connection label overlapping a component or route, or off the canvas (6 architecture specs): the spec now carries the figure's short label (26 characters at most), the label the layout made room for, in place of the model's full sentence.
- Note running into the next message (3 sequences): message rows now open by 11 px for each line archify will wrap the note to.
- No room for the legend (4 sequences): the height now reserves content bottom plus 12 plus 86 px.
- Message label off the canvas (4 sequences): each label is cut to the room between its lifelines and the canvas edge, and listed as shortened.
- Self-message rejected (2 sequences): each joins the note of the message before it, as archify suggests.
- Browser-check evidence conflict on a rebuild (1 in the lane, every archify diagram on a second build): the build rewrites each page with its theme block, so archify refused to replace the old evidence; the build now clears it before each run.

Shortened text in the rebuilt specs: 7 message labels across 4 sequences, and node sublabels as before. The index page, the static pages and the Markdown keep the full text.

## What the run found in Shamel.Backend

The lane reported three facts about the code that the comments and the docs do not state. That is the value of the run beyond the diagrams:

1. Request logging is not wired in. TWK.Framework's database logging and its exception middleware are never called by the host, so the service never writes `dbo.ApiLogs` or the request-log tables; the `KMFeed` settings services are registered but unused.
2. Retries are wider than the comments say. The Shaheen retry setup (`src/Core/Application/DependencyInjection.cs` lines 98 to 104) never sets `ShouldHandle`, so the library default retries 408, 429 and every 5xx, not only 502, 503 and 504.
3. Timeouts do not map to `ShaheenTimedOut`. A per-attempt timeout is reported as `ShaheenUnavailable`.

## Cleanup

The credential copy `proof-a-20261028-1/home/.claude/.credentials.json` was deleted with `find -delete` at the end of the results step.
