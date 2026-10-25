Adversarial review (code mode), `67584d9..b874cd4`, read at HEAD of `/development/fx/.worktrees/docs-adr-visual`.

I read the diff, the TypeScript sources and the generated `lib/` files. The generated JS bodies for `doc-index` were elided by the tooling, so I reviewed the `.ts` sources. I did not run any tests. Nothing below re-opens a settled ruling (S1 to S8). No primed-review findings were given to me, so none are marked as covered.

**Important**

1. **Partly superseded ADRs drop out of every lookup.**
   - `src/lib/doc-evidence.ts:51` marks an ADR `superseded` whenever its status line matches `/superseded by/i`.
   - `queryIndex` (`src/lib/doc-index.ts:~76`) returns only `status === 'current'` claims, and `stalePassOne` skips `superseded` ones.
   - "Partly superseded by NNNN: decisions 2 and 4" also matches. That is the wording `skills/fx-adr/SKILL.md` allows when a repo's index uses its own words (the design cites Shamel and Advantage ADRs).
   - Result: the still-live decisions of such an ADR vanish from all seven readers and from the stale check. That is silent loss of the very decisions the lookup exists to surface.
   - Lens: integrity.

2. **A docs-index failure now breaks every brief, with no reason shown.**
   - `src/skills/fx-implement/scripts/compile-brief.ts:135-136` runs `docs-index query` with stderr discarded (`stdio: [..., 'ignore']`) and calls `die()` on any non-zero exit.
   - Before this branch, no docs problem could stop a task from compiling. Now a corrupt cache, an unreadable `docs/` directory or a git hiccup halts the build with only `docs-index query failed (exit N)`.
   - The "no docs" case is meant to behave as before (ADR 0063 decision 5), so this failure should degrade to `None.` plus a warning.
   - Lens: integrity, human-debuggability.

3. **`.scratch/` migration leaves dangling references and moves non-issue files.**
   - Pointer rewriting (`src/lib/scratch-migrate.ts:58-60`) covers only root `CLAUDE.md`, `AGENTS.md`, `repo.md` and tracked `docs/**/*.md` outside plans, adr and issues.
   - `.claude/CLAUDE.md`, per-engine `CONTEXT.md`, `CONTEXT-MAP.md` and `.fx.json` are not touched.
   - Issue files that cite `.scratch/<slug>/...` are moved but not rewritten, because their destination is `docs/issues/`, which is excluded from the candidates.
   - The dry run never lists any of this.
   - Whole top-level entries move, including drafts and non-Markdown files. ADR 0060 decision 3 says drafts belong in `.fx/`, and `commands/fx-setup.md` only checks that some Markdown exists.
   - `IGNORE_LINES` (line 20) is an exact match, so a CRLF `.gitignore` or `.scratch/*` keeps the ignore rule without any message.
   - Lens: integrity.

4. **The visual-kit gate cannot fail when a table row disappears.**
   - `src/tests/gates/visual-kit.test.ts:21-26` silently drops any row that does not have exactly 7 cells and a 64-hex hash.
   - Nothing asserts that the five vendored libraries, the tokens file or the map file each have a row. Nothing asserts that every file in `references/vendor/` has a row.
   - Deleting or mangling a row passes the gate, and it also removes that file from the `known` set of loadable assets.
   - The checksums are also written by the same commit that adds the files, so they prove consistency, not that the bytes are upstream's. That provenance rests on the ledger only.
   - Lens: verification theater.

5. **The docs-branch query misses renamed files.**
   - `skills/fx-docs/SKILL.md:65` and `skills/fx-implement/references/final-review.md:10` build the changed-path list with `git diff <merge-base>...HEAD --name-only`.
   - With default rename detection that lists only the new path. Claims that cite the old path are never queried, and branch mode does not run `docs-index stale`, which would have flagged them as deleted.
   - Using `--no-renames` would list both paths.
   - Lens: integrity.

6. **Existing docs have no way into the system, so `fx-docs` can become a repo-wide rewrite.**
   - Lookups, the index and the offered docs step (`final-review.md` step 1) all skip a repo whose docs have no `Evidence:` lines. Advantage-backend's existing docs are in that state.
   - The only way in is `skills/fx-docs/full-run.md`, which `SKILL.md` section 6 triggers whenever no doc has an evidence line.
   - So a plain "update the docs" request there starts a full run: new docs "to fit the repo", plus a verified marker in every doc.
   - There is no scoped adoption path (annotate the docs touched by this change only).
   - Lens: simplicity, scope.

**Minor**

7. **A failed map layout leaves a permanent spinner.** `src/references/visual/fx-map-1.ts:125` calls `layout(cur).then(...)` with no `.catch`. If ELK rejects or a vendored global is missing, the page shows "Laying out the map." forever. The gate tests only `validateMapData` and `levelPath`. Mount and layout are covered only by the on-request browser check, which is not in `check-all`.

8. **README lane count is off by one.** `README.md:88` says "Eleven of the thirteen". There are now 22 skills, 8 of them user-invoked, so 14 lanes, and the old "Ten of the twelve" should become "Twelve of the fourteen".

9. **`stalePassOne` calls an existence check "reachable".**
   - `src/lib/doc-index.ts:110` uses `git cat-file -e <sha>^{commit}`, which tests that the object exists, not that HEAD can reach it.
   - After a squash or rebase merge, a branch-HEAD marker still resolves until git garbage collection. The diff against HEAD then spans unrelated history, so the check is conservative but noisy.
   - After garbage collection, every claim reports `unverified`.

10. **Index staleness is judged by mtime only.** `src/lib/doc-index.ts:68` compares file mtimes to the cache's mtime. A doc restored with preserved timestamps (`cp -p`, rsync) older than the cache is not noticed.
    - `writeIndex` also leaves an old cache file in place when no claims remain, so every later call rebuilds from scratch.

**Limits of this review:** I did not read the vendored bundles or run the tests. I also did not read most of `fx-architecture` and `fx-audit` `HTML-REPORT.md` or the `page-template.html` diff in detail.

Files cited: `/development/fx/.worktrees/docs-adr-visual/src/lib/doc-evidence.ts`, `/development/fx/.worktrees/docs-adr-visual/src/lib/doc-index.ts`, `/development/fx/.worktrees/docs-adr-visual/src/lib/scratch-migrate.ts`, `/development/fx/.worktrees/docs-adr-visual/src/skills/fx-implement/scripts/compile-brief.ts`, `/development/fx/.worktrees/docs-adr-visual/src/tests/gates/visual-kit.test.ts`, `/development/fx/.worktrees/docs-adr-visual/src/references/visual/fx-map-1.ts`, `/development/fx/.worktrees/docs-adr-visual/skills/fx-docs/SKILL.md`, `/development/fx/.worktrees/docs-adr-visual/skills/fx-implement/references/final-review.md`, `/development/fx/.worktrees/docs-adr-visual/README.md`.

1. Discuss all: walk every finding one by one.
2. Discuss some: you pick which findings to dig into.
3. Continue: proceed as the reviewer sees fit (I'll resolve/fold in the rest).

Which?