# fx integration facts for the system-flow design

Read 2026-10-28 at `ce1fb19`. Each fact below changes a decision in `design.md`.

## Build and runtime

- `scripts/build` compiles each `src/**/*.ts` file on its own with esbuild and bundles nothing. A new extensionless CLI goes in the build script's case list beside `docs-index`, and `scripts/test-scope` keeps the same list.
- `package.json` has no runtime dependencies, only `@types/node`, `esbuild` and `typescript`. A JSON Schema library would be the first runtime dependency, so the CLI validates with its own code.
- elkjs 0.9.3 is vendored at `references/vendor/elkjs-0.9.3.bundled.js` with its licence. system-flow's `build-page.mjs` loaded the same file in Node, so the CLI can load it from the plugin by path at run time.
- Browser kit scripts are TypeScript under `src/references/visual/` built as IIFE (`fx-map-1.ts`). The map has no context nodes, no groups and no sync or async mode, so it needs a new version under the renaming rule (`fx-map-2.js`).

## docs-index

- `src/lib/doc-evidence.ts` reads evidence items as `` `path:start-end` `symbol` `` or `owner, YYYY-MM-DD`. One range per item: system-flow's `"63,67-245"` must be written as two items.
- `src/lib/doc-index.ts` skips `docs/plans`, `docs/issues` and `docs/html` and indexes every other `docs/**/*.md`. Generated Markdown under any other docs folder is indexed and reaches the seven readers of ADR 0063.
- `checkPath` (unchanged, shifted, changed, deleted between a verified commit and HEAD) is private to `doc-index.ts` and runs `git` in one root. It is the logic the model's stale check needs per root.
- A path item names a file in the docs root's own repo. A path in another repo would read as `deleted` and be flagged on every run.
- An ADR leaves the lookups when its status opens with Superseded, Deprecated or Ignored (`statusText`). fx-adr writes `Superseded by NNNN (replaced: ...; the rest carried forward)` and restates live decisions in the new ADR, so "current ADRs" is exactly the Rules in force source.

## Lanes and commands

- User-invoked lanes are listed in `src/lib/user-invoked-lanes.ts` (eight today) and pinned by `tests/gates/user-invoked.test.js`. `fx-audit` is the precedent for a hand-written user-invoked `SKILL.md`: not generated from `commands/`, invoked as `/fx:fx-audit`.
- ADR 0055: a lane cannot invoke a user-invoked command; it can only name it to the owner.
- ADR 0053: `skills/*/SKILL.md` must stay under 20,000 bytes; splits move whole sections into files beside the skill, one level deep. `fx-audit/SKILL.md` is 18,167 bytes.
- `.fx.json` is parsed strictly by `src/lib/fx-json.ts` (unknown values are reported as problems), so a new `system_flow` key needs parser support and a test.

## archify 3.2

- `sources` is allowed on primary elements only (architecture components, sequence participants, and so on), one to three ranges each, `{path, line, end_line, label}`; messages and connections carry none.
- `meta.repository` holds one URL and one 40-hex revision, and `finalize --repo-root <root>` checks sources against committed bytes at that revision. One diagram therefore cites one repository.
- `visual-check` captures 1600x1000, 1920x1080 and 2048x1320 only. Nothing in archify checks 390 px, which matches system-flow's screenshot 7 (sequence cut off at 390).
- Label limits: 48 characters for source labels, 35 and 80 for common fields, notes 140.

## Target repos

- `/mnt/c/Users/Faisal/Downloads/Shamel.Backend` is not a git repository. Its scratch copy has to be initialised with one commit, or the stale check and archify sources have no revision.
- Shamel.Backend has `docs/adr/` (ADR-001 to ADR-010 and more), `mkdocs.yml` (`docs_dir: docs`, Material teal palette, Inter and JetBrains Mono, `extra_css`), and `docs/assets/docs.css`.
- system-flow's model cites `Shamel.Backend` in 141 evidence entries.
- Tracked files: advantage-backend 13,038, advantage-guide 183, sdks/android 154, advantage-store 55.
