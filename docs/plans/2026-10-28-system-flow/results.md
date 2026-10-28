# Results

## Smoke

Task 18. The CLI (tasks 01 to 17) run as a process on a scratch copy of Shamel.Backend, with the real archify 3.2.0 copied into a scratch `CLAUDE_CONFIG_DIR`. No lane was invoked. Source repository read only. Scratch run folder: `/tmp/claude-1000/sf-build/smoke-20261028-1` (run 1). A second folder, `smoke-20261028-2`, repeats the run with a fake `origin` remote to separate one failure cause from another (see Findings).

Outcome: all commands exit 0 and `check` passes, but archify rendered none of the five deep diagrams. Every diagram fell back to SVG. Three CLI defects cause this. They are findings for task 20; no source was changed here.

Commands below are shortened; each was run as `scripts/scratch-env node scripts/system-flow --root <scratch>/Shamel.Backend <subcommand>` with `CLAUDE_CONFIG_DIR=<run folder>/claude-config`, `TMPDIR` in the scratchpad.

### prepare-scratch

First run: `scripts/scratch-env proof/prepare-scratch /mnt/c/Users/Faisal/Downloads/Shamel.Backend <run>/Shamel.Backend`

```
22025856b2a6be0a12e65bbebedbf856f97643c8
exit 0
```

Second run with the same target:

```
prepare-scratch: target exists: <run>/Shamel.Backend
exit 1
```

`git log --oneline` after the second run: one line, `2202585 scratch copy`; `git status --porcelain` empty (copy unchanged). The fragments were committed afterwards as a second commit (`proof` identity), as step 3 asks.

TDD note: `prepare-scratch` is a bash script whose tests are these recorded runs, as the task says.

### detect

`CLAUDE_CONFIG_DIR=<run>/claude-config`, archify copy under `skills/archify`. The first copy was a dangling symlink (`/home/faisal/.claude/skills/archify` points to `../../.agents/skills/archify`, and `cp -r` copies the link); `detect` then printed `"archify": null`. The copy was redone from the link's target (`/home/faisal/.agents/skills/archify`, read only) with `cp -r`. After that:

| Field | Value | Pass |
|---|---|---|
| `archify.via` | `CLAUDE_CONFIG_DIR` | yes |
| `archify.version` | `3.2.0` | yes |
| `theme.source` | `docs/assets/docs.css` (`kind` `docs-css`) | yes |
| `docsConfig.path` | `mkdocs.yml` (`docsDir` `docs`) | yes |
| `output.site` | `docs/system-flow` | yes |
| `output.markdown` | `docs/system` (no hand-written `.md` there, so no `docs/system-generated`) | yes |

mkdocs edits proposed: nav `- System flow: system-flow/index.html`, `- System docs: system/index.md`; excludeDocs `system-flow/README.md`, `system-flow/model/`, `system-flow/diagrams/src/`.

### check

Fragments: `proof/smoke-fragments/{meta,level0,api,chapters}.json`, copied to `docs/system-flow/model/fragments/` and committed. First attempt failed with `step api-header-cache#1 names a missing actor ...` (a flow step `actor` must be a node id, not a class name); the actors were changed to the node `shamel-twk`. Then:

```
{"ok":true,"fragments":4,"items":59,"warnings":[]}
exit 0
```

`warnings` is empty. No symbol in the C# files failed the last-segment rule (no generic or `partial` finding).

### build --archify

`build --archify <run>/claude-config/skills/archify`: exit 0, `problems: []`, `collisions: []`, `pageBytes` 41616.

| Diagram | renderer | reason |
|---|---|---|
| `arch-system` | svg | static SVG, archify failed: docs/system-flow/diagrams/arch-system.receipt.json |
| `arch-api` | svg | static SVG, archify failed: docs/system-flow/diagrams/arch-api.receipt.json |
| `seq-api-prompt-answer` | svg | animated SVG, archify failed: docs/system-flow/diagrams/seq-api-prompt-answer-p3.receipt.json |
| `seq-api-prompt-answer-p2` | svg | animated SVG, archify failed: docs/system-flow/diagrams/seq-api-prompt-answer-p3.receipt.json |
| `flow-api-header-cache` | svg | animated SVG, archify failed: docs/system-flow/diagrams/flow-api-header-cache.receipt.json |

`fx-theme:begin` blocks: 0 in every output, since all five pages are the CLI's SVG fallback, not archify output. That condition (one block per archify output) is therefore not testable in this run.

Receipt failures (quoted from the receipts; paths shortened to `<S>`):

1. All five diagrams, run 1 after the first build and every diagram but one in run 2, `stages.deliver.receipt.diagnostics[0]`:
   `delivery/concurrent-attempt: Could not start delivery for "<S>/docs/system-flow/diagrams/arch-system.html": Another delivery attempt owns "<S>/docs/system-flow/diagrams/arch-system.html" through lock "<S>/docs/system-flow/diagrams/.archify-delivery-lock.json".`
2. Run 1, `seq-api-prompt-answer-p3.receipt.json`, `stages.validate`:
   `repository-evidence/url-invalid: /meta/repository/url must be a credential-free HTTP(S) or Git SSH repository address without query, fragment, or dot segments.`
   The spec had `"repository": {"url": "shamel-backend", ...}`; the scratch copy has no remote, so the CLI wrote the root id as the url.
3. Run 2 (fake `origin` added, url error gone), `arch-system.receipt.json`, 5 x `validate`:
   `architecture/component-sublabel-overflow: Sublabel "Sends prompts and reads answers over HTTP, SSE or SignalR." needs ~209px at the 6px legible minimum, but component "shamel-mobile-app" provides 180px`
   and `seq-api-prompt-answer-p3.receipt.json`, 2 x `validate`:
   `sequence/participant-label-overflow: Label "AnswerChannelPump" (~116px) is wider than component "pump" (105px)`.

The CLI's fixed retry produced `seq-api-prompt-answer-p3` (a 5-per-page rerun of the 12-message sequence: 5, 5, 2 messages), which also failed, so the fallback names the p3 receipt for both sequence pages. The p3 page itself is not written (no `seq-api-prompt-answer-p3.html`), which is correct.

### No write outside the scratch copy

- archify copy: stamp file touched before the build; `find <archify copy> -type f -newer <stamp>` printed 0 files; `sha256sum` of every file before the build and after both builds is identical (`cmp` reported no difference).
- `git -C <scratch copy> status --porcelain` after the first build: only `docs/` paths (`docs/system-flow/...`, `docs/system/`). Three fragments show as modified (`api.json`, `chapters.json`, `level0.json`): the build wrote `verified` stamps into them. No `.fx.json` was written. Lines outside `docs/`: 0.

### Flagless rebuild

`build` with the same `CLAUDE_CONFIG_DIR` and no flags: exit 0. `diagrams` deep-equals the first build's (`True`, compared with `python3 -I`): same five renderers and reasons.

### Layout

`docs/system-flow/model/layout-report.json`, every figure at `crossings <= 1` and `width <= 860`:

```
level-system          width 689 height 928 crossings 0 nodeHits 0 nodes 7 arrows 6 notDrawn 0 unlabelled 0
level-api             width 610 height 694 crossings 0 nodeHits 0 nodes 7 arrows 6 notDrawn 0 unlabelled 0
seq-api-prompt-answer width 656 height 896 crossings 0 nodeHits 0 nodes 8 arrows 8 notDrawn 0 unlabelled 0
flow-api-header-cache width 438 height 290 crossings 0 nodeHits 0 nodes 3 arrows 2 notDrawn 0 unlabelled 0
```

Model depth reported by the build: 2 levels, 13 primary and 1 context node, 12 edges, 1 sequence (12 messages), 2 store rows, 1 store flow, 4 chapters, 59 evidence entries, 17 files cited.

### Visual check

Visual check: not run: no browser. This session has no browser tool. The controller runs it before task 20 starts, per `references/visual/visual-check.md`, at 1440 and 390, light and dark, on each of these pages under `<run>/Shamel.Backend/docs/system-flow/`:

- `index.html`
- `diagrams/arch-system.html`
- `diagrams/arch-api.html`
- `diagrams/seq-api-prompt-answer.html`
- `diagrams/seq-api-prompt-answer-p2.html`
- `diagrams/flow-api-header-cache.html`

All five diagram pages are SVG fallback pages, so there is no archify output to check. One static check was possible: a search for `http(s)://` in `index.html` and the diagram pages finds only the SVG namespace `http://www.w3.org/2000/svg`, no outside URL.

### Findings for task 20

1. Concurrent finalize calls collide on archify's delivery lock. `runArchify` (`src/lib/sf-diagrams.ts`, limit 4) starts up to four `finalize` processes at once, all writing into the same `diagrams/` folder. archify keeps one `.archify-delivery-lock.json` there, so all but one get `delivery/concurrent-attempt`. The CLI then falls back to SVG although the specs may be fine. Likely fix: run one finalize at a time per output folder (limit 1), or give each its own staging folder.
2. A root without a remote gets `meta.repository.url` set to the root id. archify rejects it (`repository-evidence/url-invalid`). With `link_mode: "local-only"` the url still must be a valid address. A fix is to omit `repository`, or to write a fixed valid placeholder, when `remote` is null.
3. Long `role` text and long labels fail archify's layout validation. Ruling 15 dropped the 35 and 80 character label limits, but archify's `validate` stage rejects a sublabel that needs more than 180 px (about 50 characters at the 6 px minimum) and a participant label wider than 105 px (about 15 characters). Either the CLI shortens or splits these strings, or `fragment-guide.md` must give the limits. The labels and roles in this model are written the natural way, so a real repository will hit this too.
4. The three defects cannot be worked around without editing `src/`, and this task changes no source. After fixes for 1, 2 and 3, the build, the theme-block check and the archify visual check have to be run again.
5. A `cp -r` of `/home/faisal/.claude/skills/archify` copies a dangling symlink. The instructions for step 2 should copy the link target, `cp -rL`.
6. A flow step `actor` must be a node id (`check` error `names a missing actor`). `fragment-guide.md` says only `actor`; it should say it names a node.
