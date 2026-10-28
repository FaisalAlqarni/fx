# Results

## Smoke

archify render count: 5 of 5 deep diagrams rendered by archify and kept (both architecture diagrams, both pages of the sequence, the store flow).

Task 18, second rerun after task 18c (worktree HEAD 1e26404). The CLI run as a process on a scratch copy of Shamel.Backend, with the real archify 3.2.0 copied (`cp -rL`) into a scratch `CLAUDE_CONFIG_DIR`. No lane was invoked. The source repository was only read. Run folder: `/tmp/claude-1000/sf-build/smoke-20261028-5` (a fresh folder; `-1` to `-4` hold the earlier attempts). Commands were run as `scripts/scratch-env node scripts/system-flow --root <run>/Shamel.Backend <subcommand>` with `CLAUDE_CONFIG_DIR=<run>/claude-config`. No source was changed.

Outcome: every command exits 0, `check` passes, every diagram is an archify page whose receipt reads `pass`, and the flagless rebuild matches. The visual check was not run (no browser).

### Fragments

The smoke fragments are those from the first rerun: the controller's diagram is `level0` with nodes `l0-<x>`, the area fragment is `api` with nodes `api-<x>`, and the flow step actors are `l0-twk`. They were copied unchanged from `proof/smoke-fragments/` and committed in the scratch copy.

### prepare-scratch

First call:

```
cfded1c91b75025e7e2589a1f99c4aed0db73f15
```

Second call with the same target:

```
prepare-scratch: target exists: <run>/Shamel.Backend
exit 1
```

`git log --oneline` after the second call: one line, `cfded1c scratch copy`. The fragments were committed afterwards as a second commit (`proof` identity).

### detect

`archify` `{dir: <run>/claude-config/skills/archify, version: "3.2.0", via: "CLAUDE_CONFIG_DIR"}`; `theme` `{source: "docs/assets/docs.css", kind: "docs-css"}`; `docsConfig` `{kind: "mkdocs", path: "mkdocs.yml", docsDir: "docs"}`; `output` `{site: "docs/system-flow", markdown: "docs/system"}` (no hand-written `.md` in `docs/system/`, so no `docs/system-generated`). All as required.

### check

```
{"ok":true,"fragments":4,"items":59,"warnings":[]}
exit 0
```

No symbol in the C# files failed the last-segment rule.

### build --archify

`build --archify <run>/claude-config/skills/archify`: exit 0, `ok: true`, `problems: []`, `collisions: []`, `pageBytes` 41264.

| Diagram | renderer | reason |
|---|---|---|
| `arch-level0` | archify | archify architecture, 7 components, shortened: l0-mobile-app sublabel, l0-mobile-api sublabel, l0-legacy sublabel, l0-twk sublabel, l0-connector sublabel |
| `arch-api` | archify | archify architecture, 7 components, shortened: api-channels sublabel, api-watcher sublabel |
| `seq-api-prompt-answer` | archify | archify sequence, 12 messages in 2 pages, shortened: controller label |
| `seq-api-prompt-answer-p2` | archify | archify sequence, 12 messages in 2 pages, shortened: controller label |
| `flow-api-header-cache` | archify | archify sequence, 3 messages in 1 pages |

Receipts (`diagrams/<name>.receipt.json`): all five `ok: true`, `status: pass`, stages validate, deliver, check and browser-check all `pass`. No fallback, so no failure to quote. `diagrams/` holds only the five pages, their receipts, delivery and browser-check files and `src/`; no stray page.

`fx-theme:begin` blocks (and `fx-theme:end`): exactly 1 in each of the five archify pages (`arch-level0`, `arch-api`, `seq-api-prompt-answer`, `seq-api-prompt-answer-p2`, `flow-api-header-cache`).

Outside references: the only `http(s)://` attribute value in `index.html` and the five diagram pages is archify's credit link `href="https://github.com/tt-a1i/archify"` (5 occurrences, one per archify page); it is a hyperlink, not a load, and the build now keeps the pages.

Note on shortening: the build shortened 5 sublabels on `arch-level0`, 2 on `arch-api` and 1 sequence participant label to fit archify's measure. The model text is unchanged; only the archify spec carries the shorter text.

### No write outside the scratch copy

- archify copy: stamp file touched before the build; `find <archify copy> -type f -newer <stamp>` printed 0 files; `sha256sum` of every file before the build, after it, and after the flagless build is identical (`cmp` silent).
- `git -C <scratch copy> status --porcelain`: only `docs/` paths (`docs/system-flow/...`, `docs/system/`) plus the three fragments modified by `verified` stamps. Lines outside `docs/`: 0. No `.fx.json` written.

### Flagless rebuild

`build` with the same `CLAUDE_CONFIG_DIR` and no flags: exit 0, `problems: []`. `diagrams` deep-equals the first build's (`True`, compared with `python3 -I`): same five renderers and reasons.

### Layout

`docs/system-flow/model/layout-report.json`, every figure at `crossings <= 1` and `width <= 860`, no node hits, nothing dropped:

```
level-level0          width 689 height 928 crossings 0 nodeHits 0 notDrawn 0
level-api             width 610 height 694 crossings 0 nodeHits 0 notDrawn 0
seq-api-prompt-answer width 656 height 896 crossings 0 nodeHits 0 notDrawn 0
flow-api-header-cache width 438 height 290 crossings 0 nodeHits 0 notDrawn 0
```

Model depth: 2 levels, 13 primary and 1 context node, 12 edges, 1 sequence (12 messages), 2 store rows, 1 store flow, 4 chapters, 59 evidence entries, 17 files cited.

### Visual check

Visual check: not run: no browser. This session has no browser tool. The controller runs it before task 20 starts, per `references/visual/visual-check.md`, at 1440 and 390, light and dark, on each page under `<run>/Shamel.Backend/docs/system-flow/`, archify outputs included:

- `index.html`
- `diagrams/arch-level0.html` (archify)
- `diagrams/arch-api.html` (archify)
- `diagrams/seq-api-prompt-answer.html` (archify)
- `diagrams/seq-api-prompt-answer-p2.html` (archify)
- `diagrams/flow-api-header-cache.html` (archify)

archify's own browser check ran inside each `finalize` call and passed (stage `browser-check` `pass` in all five receipts); that is not the 1440 and 390 light and dark check above, and it does not replace it.

### Findings for task 20

1. `check` does not enforce the level-0 id rule (`level0`, `l0-<area id>`); a model with the old ids passes.
2. The build shortens sublabels and labels in the archify spec only; the page and Markdown keep the long text. This is by design, and it means an archify page can show shorter text than the index page for the same node.

## (a) Shamel.Backend

The measured numbers, the checks and the calibration are in `proof/results-a.md`.

## (b) Advantage, four roots

The measured numbers, the checks and the seven defects the run found are in `proof/results-b.md`; the controller commands are in `proof/run-b.md`. Tokens 49,415,523 against an estimate of 56,824,000 (13.0% under) and wall clock 52.7 min against 53.7 min (2.0% under), both inside the 50% bar.
