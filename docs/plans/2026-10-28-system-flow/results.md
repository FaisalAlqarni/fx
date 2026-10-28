# Results

## Smoke

Task 18, rerun after tasks 18a and 18b (worktree HEAD acb9eb4). The CLI run as a process on a scratch copy of Shamel.Backend, with the real archify 3.2.0 copied (`cp -rL`) into a scratch `CLAUDE_CONFIG_DIR`. No lane was invoked. The source repository was only read. Run folder: `/tmp/claude-1000/sf-build/smoke-20261028-4` (a fresh folder; `-1` and `-2` hold the first attempt, `-3` a check-only pass before the fragment rename below). Commands were run as `scripts/scratch-env node scripts/system-flow --root <run>/Shamel.Backend <subcommand>` with `CLAUDE_CONFIG_DIR=<run>/claude-config`.

Outcome: every command exits 0 and `check` passes. archify now renders every diagram, and its own checks pass for 4 of the 5 diagram groups, but the CLI keeps none of the archify pages: 0 of 5 deep diagrams are archify in the final build. The three first-run defects are gone. Two new causes remain (below). No source was changed.

### Fragments under the current rules

The 18b rule says the controller's diagram is `level0` and its nodes are `l0-<area id>`. `check` passed on the old fragments (diagram `system`, nodes `shamel-*`; run `-3`: `{"ok":true,"fragments":4,"items":59,"warnings":[]}`), so the rule is not enforced by `check`. The fragments were still renamed to follow the guide: diagram `system` to `level0`, nodes `shamel-<x>` to `l0-<x>`, the parent, `root` and section references to match, and the flow step actor `shamel-twk` to `l0-twk`. The other new rules (a flow step actor is a node id, an edge stays inside its diagram) already held.

### prepare-scratch

First call:

```
c879c0f5ae3a573b1d1deed15448984906f5526a
```

Second call with the same target:

```
prepare-scratch: target exists: <run>/Shamel.Backend
exit 1
```

`git log --oneline` after the second call: one line, `c879c0f scratch copy`. The fragments were committed afterwards as a second commit (`proof` identity).

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
| `arch-level0` | svg | static SVG, archify page loads outside the site: https://github.com/tt-a1i/archify |
| `arch-api` | svg | static SVG, archify page loads outside the site: https://github.com/tt-a1i/archify |
| `seq-api-prompt-answer` | svg | animated SVG, archify failed: docs/system-flow/diagrams/seq-api-prompt-answer-p3.receipt.json |
| `seq-api-prompt-answer-p2` | svg | animated SVG, archify failed: docs/system-flow/diagrams/seq-api-prompt-answer-p3.receipt.json |
| `flow-api-header-cache` | svg | animated SVG, archify failed: docs/system-flow/diagrams/flow-api-header-cache.receipt.json |

archify output count: 0 of 5 kept (archify itself passed all four stages for both architecture diagrams and for two of the three retry pages of the sequence; see below).

`fx-theme:begin` blocks: 0 in every page under `diagrams/`, because every final page is the CLI's SVG fallback. The condition "each archify output holds one block" cannot be tested while no archify output is kept.

Receipts quoted:

- `arch-level0.receipt.json` and `arch-api.receipt.json`: `ok: true`, `status: pass`, stages validate, deliver, check and browser-check all `pass`. No failure. The CLI discarded the page because of its own scan (`outsideRefs`, `src/lib/sf-build.ts:307`). The URL it reports is archify's credit link in `assets/template.html:5395`: `<a class="diagram-guide-credit" href="https://github.com/tt-a1i/archify" target="_blank" rel="noopener noreferrer">`. It is a hyperlink, not a loaded resource, and it is in every archify page.
- `flow-api-header-cache.receipt.json`: `status: fail`, stage validate `not-run`, stage deliver `fail` with `exitCode: 0`, the inner receipt `ok: true`, `errors: 0`, `warnings: 1`. The warning that fails the delivery: `[composition/viewport-height] ... This 510x480 canvas (ratio 1.06) declares no intrinsic-height fit and is below the 1.55 wide ratio ... the page reaches 1393px before cards against 900px, a certain visual-check failure. Either compact vertical spacing so meta.viewBox height is at most 329 at this width, or spread content sideways so the width is at least 744 at this height`.
- `seq-api-prompt-answer-p3.receipt.json` (the 5 messages per page retry gives pages of 5, 5 and 2): the same `composition/viewport-height` warning, same numbers (510x480, page 1393px), delivery `fail`. Pages 1 and 2 of that retry passed (`seq-api-prompt-answer.receipt.json`, `-p2` all four stages `pass`), but one failing page sends the whole sequence to SVG.
- The first attempt's failure for the sequence (8 and 4 messages per page) was overwritten by the retry's receipts, which share names. Its cause is not recorded here; the final state is the receipts above.

Stray file: `diagrams/seq-api-prompt-answer-p3.html` is a leftover archify page (it contains the credit link and the font credit links `https://github.com/JetBrains/JetBrainsMono`, `https://openfontlicense.org`) and no longer matches the SVG fallback pages beside it.

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

Visual check: not run: no browser. This session has no browser tool. The controller runs it before task 20 starts, per `references/visual/visual-check.md`, at 1440 and 390, light and dark, on each page under `<run>/Shamel.Backend/docs/system-flow/`:

- `index.html`
- `diagrams/arch-level0.html`
- `diagrams/arch-api.html`
- `diagrams/seq-api-prompt-answer.html`
- `diagrams/seq-api-prompt-answer-p2.html`
- `diagrams/flow-api-header-cache.html`

All are SVG fallback pages, so no archify output reaches the check. The stray `diagrams/seq-api-prompt-answer-p3.html` is an archify page; the controller may open it to see what archify drew for 2 messages. One static check was possible: a scan of `index.html` and the five fallback pages for `http(s)://` finds only the SVG namespace.

### Findings for task 20

1. The outside-the-site scan flags archify's credit hyperlink. `outsideRefs` returns `https://github.com/tt-a1i/archify`, an `<a href>` in every archify page (`assets/template.html:5395`). A link is not a network request. With the scan as it stands, no architecture diagram can ever be kept. The scan should look at loaded resources only (`src`, stylesheet `href`, `@import`, CSS url references), not `<a href>` or text.
2. archify's `composition/viewport-height` fails small sequence pages. A page with 2 messages, or a 3-step store flow, gets a 510x480 `viewBox`. archify fails delivery with exit code 0 (`status: fail`). The spec carries `meta.viewBox`; archify's own advice is to omit it for architecture, or make the canvas at most 329 high or at least 744 wide. The CLI's fixed 5 per page retry makes the problem likelier: it produced a 2-message last page. A sequence of 12 messages ends on a page of 4 (8 and 4) or 2 (5, 5 and 2).
3. A failing page sends the whole sequence to SVG, though the other pages passed all four stages. Not a defect on its own, but with finding 2 it means any sequence whose last page is short falls back.
4. Stale page: the failed retry leaves `seq-api-prompt-answer-p3.html` in `diagrams/` after the SVG fallback is written. The next reader sees a page that is in no diagram line.
5. Receipt names are reused by the retry, so the first attempt's failure cannot be read afterwards.
6. `check` does not enforce the 18b level-0 id rule (`level0`, `l0-<area id>`); a model with the old ids passes.
