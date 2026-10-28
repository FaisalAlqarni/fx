# Final review: security lens (branch mode, HEAD 85ab7b7)

6 findings, recorded by the controller.

1. Important. src/lib/sf-diagrams.ts:333 and :358, sf-build.ts:254: the archify folder comes from .fx.json system_flow.diagrams.archify (any path) and build runs `node <dir>/bin/archify.mjs`; a cloned repo can commit .fx.json plus a fake archify and get code run on a docs build when no archify sits in the config dirs. Repo files must never be executed (sf-theme.ts:3-4 stance).
2. Important. src/lib/fx-json.ts:101 accepts any string for output.site and output.markdown; sf-detect.ts:32 lets mkdocs docs_dir ../.. flow into output.site. Writes follow symlinks with no realpath containment: sf-build.ts:87-97, :223 (layout-report.json, isOurs always true), :340 (SVG pages), :344, :337 (rmSync of name-matched files), sf-model.ts:250. A committed symlink such as model/layout-report.json -> ~/.ssh/authorized_keys gets overwritten.
3. Important. src/lib/sf-markdown.ts:166: a non-host rule adr.root goes raw into rules-in-force.md; schema allows any string (system-model.schema.json:307) and sf-rules.ts:117 skips unknown roots silently: stored HTML in published Markdown.
4. Important. src/lib/sf-evidence.ts:130-134: folder entries and missing-root entries return before lines is checked; sf-markdown.ts:36 writes lines inside a backtick span unescaped: a backtick in lines injects raw HTML into generated docs.
5. Minor. src/lib/sf-markdown.ts:15 prose escapes HTML but not Markdown links: [x](javascript:...) becomes a live link in MkDocs.
6. Minor. src/lib/sf-evidence.ts:72-75, :84: non-git roots check the joined path without resolving symlinks; leaks existence, line counts and string presence for files outside the root.

Checked clean: page HTML and inline JSON escaping, git argument paths, archify argv (no shell), theme CSS values, Mermaid ids.
