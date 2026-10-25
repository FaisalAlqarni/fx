Lens: security, 4 findings

1. [Important] `/development/fx/.worktrees/docs-adr-visual/references/visual/visual-assets.md:68-69` and `references/visual/page-template.html:102`: the map-data escaping rule is a no-op as written.
   - Both files say to write every `<` in the inline JSON "as `<`". The replacement is identical to the original, so the likely intended `\u003c` form never reaches the writer. I read the lines raw and may be seeing a rendering artifact, so confirm the bytes.
   - The inline data is `<script type="application/json" id="map-data">`. Node labels, roles, symbols and evidence come from the analysed repo. A value containing `</script><script>...` closes the data block and runs script on the generated page.
   - Nothing else in the diff guards against this. `fx-map-1.ts:7403` calls `JSON.parse` on `textContent` after the browser has already parsed the HTML. No test in `src/tests/gates/visual-kit.test.ts` covers it.
   - An attacker who controls repo text, such as a symbol name or doc line, gets script execution when a teammate opens the committed page. Under `file://` that script can read other local files.

2. [Important] `skills/fx-docs/*.md`, `skills/fx-architecture/HTML-REPORT.md`, `references/visual/page-template.html:85-94`: no instruction to HTML-escape repo-derived text.
   - The CHAPTERS slot (facts, `<code>` evidence paths, titles, the LEGEND slot) is raw HTML that the model writes from repo content. A grep for escape, untrusted, inject, innerHTML and `&amp;` across those files found nothing.
   - Hostile text in a doc, a code comment or a filename reaches the page as markup.
   - The map panel itself is safe, because `fx-map-1.ts` uses `createElement` and `textContent`. The risk is the static chapters.

3. [Important] `commands/fx-setup.md:119-120` and `skills/fx-setup/SKILL.md` (same block): the plugin-root check only tests the plugin root against the current directory, not the repository root.
   - It refuses only when `path.relative(cwd, fx)` is not outside `cwd`. If fx-setup runs from a subdirectory of the repo, a plugin root planted elsewhere in the same repo gives a relative path starting with `..` and passes. That root can supply a `plugin.json` naming `fx` and a `PREAMBLE.md`.
   - The script then executes `lib/<script>.js` or `lib/plant-roles` from that root. That is repo-controlled code run before the user reviews anything.
   - It needs `SKILL_DIR` to point into the repo, which a runtime would not normally report. The step also assumes `cwd` is the repo root and never checks it.
   - I did not review `src/tests/gates/fx-setup-root-check.test.ts` for this case.

4. [Minor] `src/lib/scratch-migrate.ts:127-140` (the `.gitignore` step) with `commands/fx-setup.md:142-143`: previously ignored content becomes committable.
   - `.scratch` is usually git-ignored. The migration moves untracked entries into `docs/issues/` and removes the ignore line. It then tells the user to run `git add -- docs/issues`.
   - Private notes, pasted logs or tokens that were deliberately kept out of git end up in a committed folder.
   - The dry run lists the moves and the `.gitignore` line, which mitigates this. It never warns that the content was ignored on purpose.

No findings in these areas:
- `src/lib/scratch-migrate.ts`: symlink checks, `execFileSync` with argument arrays, and `q()` quoting of rollback lines.
- `src/lib/doc-index.ts` and `src/lib/doc-evidence.ts`: no shell, SHA validated as 40 hex characters, `--` before pathspecs, symlinks not followed, cache stays under git-ignored `.fx/`.
- `scripts/docs-index`: arguments are strictly parsed.

Not checked:
- The SHA-256 values in `visual-assets.md` against the vendored library files. I did not run any hashing.
- The vendored bundles themselves.
- The Read tool showed some function bodies elided (`caveman: body elided`) in `src/lib/doc-index.ts`, `src/lib/doc-evidence.ts` and `references/visual/fx-map-1.js`. I took those bodies from the diff, so the files at HEAD may differ from what I read there.